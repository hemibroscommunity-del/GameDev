/* Inbox + escrow primitives test (v2.3.1117, PR2 of the heavy-systems
 * plan).  Stateful storage mock; checks:
 *   1. Online credit applies to live playerState immediately, stamps the
 *      oplog, and sends inbox_delivered.
 *   2. Duplicate opId is a no-op ('dup', no double credit).
 *   3. Offline credit lands in inbox:<id>; the next join drains it into
 *      the player BEFORE state_sync, then clears the key.
 *   4. Weapon deliveries respect WEAPON_STASH_CAP: the overflow stays
 *      queued (partial drain) instead of being silently truncated away
 *      by _saveRpg.
 *   5. Escrow debit/take: insufficient funds fail cleanly; success
 *      mutates live state; duplicate opId converges ({ok, dup}).
 *   6. Offline escrow take mutates the stored blob directly.
 *   7. Inbox soft cap: gold/item entries merge losslessly at 200.
 */
import { GameRoom } from '../src/index.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function join(ws, id, z = 'town') {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 100, y: 100, z } }));
}

// ── 1 + 2. online credit + idempotency ──
const wsA = fakeWs('alice');
await join(wsA, 'bp_inbox_alice');
const coins0 = room.playerState['bp_inbox_alice'].coins || 0;
const r1 = await room._creditPlayer('bp_inbox_alice', { opId: 'test:gold:1', source: 'test', kind: 'gold', payload: { amount: 75 }, note: 'sale' });
check('online gold credit delivered', r1 === 'delivered' && room.playerState['bp_inbox_alice'].coins === coins0 + 75, { r1, coins: room.playerState['bp_inbox_alice'].coins });
check('oplog stamped', state._store.has('oplog:test:gold:1'));
const inb1 = msgsOfType(wsA, 'inbox_delivered');
check('inbox_delivered notification sent', inb1.length === 1 && inb1[0].payload.entries[0].kind === 'gold', inb1);
const r2 = await room._creditPlayer('bp_inbox_alice', { opId: 'test:gold:1', source: 'test', kind: 'gold', payload: { amount: 75 } });
check('duplicate opId is a no-op', r2 === 'dup' && room.playerState['bp_inbox_alice'].coins === coins0 + 75);

// item credit
await room._creditPlayer('bp_inbox_alice', { opId: 'test:item:1', source: 'test', kind: 'item', payload: { invKey: 'wood', count: 5 } });
check('online item credit applied', room.playerState['bp_inbox_alice'].inventory.wood === 5, room.playerState['bp_inbox_alice'].inventory);

// ── 3. offline credit -> inbox -> drained at join ──
const rOff = await room._creditPlayer('bp_inbox_bob', { opId: 'test:off:1', source: 'market', kind: 'gold', payload: { amount: 120 }, note: 'order sold' });
check('offline credit parked in inbox', rOff === 'inboxed' && state._store.get('inbox:bp_inbox_bob')?.length === 1, state._store.get('inbox:bp_inbox_bob'));
const wsB = fakeWs('bob');
await join(wsB, 'bp_inbox_bob');
check('join drains inbox into coins', room.playerState['bp_inbox_bob'].coins === 120, room.playerState['bp_inbox_bob'].coins);
check('drained inbox key deleted', !state._store.has('inbox:bp_inbox_bob'));
const inbB = msgsOfType(wsB, 'inbox_delivered');
check('drain sends inbox_delivered on the joining socket', inbB.length === 1 && inbB[0].payload.entries.length === 1, inbB);
const syncB = msgsOfType(wsB, 'state_sync');
check('state_sync arrives after the drain (order)', wsB.sent.indexOf(inbB[0]) < wsB.sent.indexOf(syncB[0]));

// ── 4. weapon partial drain at stash cap ──
const wpn = (n) => ({ name: 'Sword ' + n, tierMult: 1.0, dmg: 5 });
const psB = room.playerState['bp_inbox_bob'];
psB.weaponStash = [];
for (let i = 0; i < room.WEAPON_STASH_CAP - 1; i++) psB.weaponStash.push(wpn('held' + i));
await room._creditPlayer('bp_inbox_bob', { opId: 'test:w:1', source: 'test', kind: 'weapon', payload: { weapon: wpn('fits') } });
const rW2 = await room._creditPlayer('bp_inbox_bob', { opId: 'test:w:2', source: 'test', kind: 'weapon', payload: { weapon: wpn('overflow') } });
check('weapon fits until cap, then parks', psB.weaponStash.length === room.WEAPON_STASH_CAP && rW2 === 'inboxed', { len: psB.weaponStash.length, rW2 });
check('overflow weapon queued, not destroyed', state._store.get('inbox:bp_inbox_bob')?.length === 1);

// ── 5. escrow debit/take (online) ──
const dFail = await room._escrowDebitGold('bp_inbox_bob', 999999, 'test:d:1');
check('debit fails on insufficient gold', dFail.ok === false && dFail.reason === 'insufficient_gold' && !state._store.has('oplog:test:d:1'), dFail);
const dOk = await room._escrowDebitGold('bp_inbox_bob', 100, 'test:d:2');
check('debit succeeds and mutates live coins', dOk.ok === true && psB.coins === 20, { dOk, coins: psB.coins });
const dDup = await room._escrowDebitGold('bp_inbox_bob', 100, 'test:d:2');
check('duplicate debit converges without re-debiting', dDup.ok === true && dDup.dup === true && psB.coins === 20);
psB.inventory = { wood: 3 };
const tFail = await room._escrowTakeItem('bp_inbox_bob', 'wood', 5, 'test:t:1');
const tOk = await room._escrowTakeItem('bp_inbox_bob', 'wood', 3, 'test:t:2');
check('take-item validates count then empties the slot', tFail.ok === false && tOk.ok === true && psB.inventory.wood === undefined, { tFail, tOk, inv: psB.inventory });

// ── 6. offline escrow against the stored blob ──
await room.webSocketMessage(wsB, JSON.stringify({ type: 'move', x: 100, y: 100 })); // ensure a save exists
room._saveRpg('bp_inbox_bob', psB);
await new Promise((r) => setTimeout(r, 10)); // fire-and-forget save settles
room.sessions.delete(wsB);
delete room.playerState['bp_inbox_bob'];
const dOffFail = await room._escrowDebitGold('bp_inbox_bob', 999, 'test:d:3');
const dOff = await room._escrowDebitGold('bp_inbox_bob', 20, 'test:d:4');
const storedAfter = state._store.get('rpg:bp_inbox_bob');
check('offline debit validates and mutates the stored blob', dOffFail.ok === false && dOff.ok === true && storedAfter.coins === 0, { dOffFail, dOff, coins: storedAfter?.coins });

// ── 7. inbox soft cap merges gold/items losslessly ──
for (let i = 0; i < 200; i++) {
  await room._inboxAppend('bp_inbox_carol', { opId: 'test:c:' + i, kind: 'gold', payload: { amount: 1 }, source: 'test' });
}
await room._inboxAppend('bp_inbox_carol', { opId: 'test:c:extra', kind: 'gold', payload: { amount: 50 }, source: 'test' });
const carolBox = state._store.get('inbox:bp_inbox_carol');
const carolGold = carolBox.reduce((s, e) => s + (e.kind === 'gold' ? e.payload.amount : 0), 0);
check('at cap, gold merges instead of growing', carolBox.length === 200 && carolGold === 250, { len: carolBox.length, gold: carolGold });

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
