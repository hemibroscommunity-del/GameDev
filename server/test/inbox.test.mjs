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
 *   8. (v2.3.1176) Drain remainder path: a join drains what fits (gold)
 *      but writes the rejected weapon BACK to inbox:<id> and reports it
 *      in inbox_delivered.queued; a later join with stash room delivers
 *      it and deletes the key.
 *   9. (v2.3.1176) _opPruneMaybe: deletes >48h and junk-valued oplog
 *      keys, keeps fresh ones, and rate-limits to one sweep per hour.
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
  // v2.3.1149: pre-settle today's daily login reward -- this suite
  // asserts EXACT join-time coins / inbox_delivered arithmetic, and the
  // cadence reward (+25g via its own inbox_delivered) would skew it.
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
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

// ── 8. v2.3.1176: drain remainder path (inbox.js _drainInbox) ──
// Section 4 covers the ONLINE credit parking at a full stash; this
// covers the JOIN-TIME drain partition: deliverable entries apply, the
// rejected weapon must be written back to storage (not dropped with the
// delete branch) and surface as inbox_delivered.queued.
const wsD = fakeWs('dave');
await join(wsD, 'bp_inbox_dave');
const psD = room.playerState['bp_inbox_dave'];
psD.weaponStash = [];
for (let i = 0; i < room.WEAPON_STASH_CAP; i++) psD.weaponStash.push(wpn('dave' + i));
const daveCoins0 = psD.coins || 0;
room._saveRpg('bp_inbox_dave', psD);
await new Promise((r) => setTimeout(r, 10)); // fire-and-forget save settles
room.sessions.delete(wsD);
delete room.playerState['bp_inbox_dave'];
// Mail him gold (always deliverable) plus a weapon (stash is full).
await room._inboxAppend('bp_inbox_dave', { opId: 'test:dr:g', source: 'test', kind: 'gold', payload: { amount: 33 } });
await room._inboxAppend('bp_inbox_dave', { opId: 'test:dr:w', source: 'test', kind: 'weapon', payload: { weapon: wpn('mailed') } });
const wsD2 = fakeWs('dave2');
await join(wsD2, 'bp_inbox_dave');
const psD2 = room.playerState['bp_inbox_dave'];
check('partial drain applies the gold', psD2.coins === daveCoins0 + 33, { coins: psD2.coins, expected: daveCoins0 + 33 });
check('partial drain leaves the full stash untouched', psD2.weaponStash.length === room.WEAPON_STASH_CAP, psD2.weaponStash.length);
const daveBox = state._store.get('inbox:bp_inbox_dave');
check('rejected weapon written back to the inbox key', Array.isArray(daveBox) && daveBox.length === 1 && daveBox[0].kind === 'weapon' && daveBox[0].payload.weapon.name === 'Sword mailed', daveBox);
const inbD2 = msgsOfType(wsD2, 'inbox_delivered');
check('inbox_delivered reports queued === 1', inbD2.length === 1 && inbD2[0].payload.queued === 1 && inbD2[0].payload.entries.length === 1 && inbD2[0].payload.entries[0].kind === 'gold', inbD2);
// Free a slot and rejoin: the queued weapon must now deliver and the
// key must be deleted (drain's delete branch, not the write-back).
psD2.weaponStash.pop();
room._saveRpg('bp_inbox_dave', psD2);
await new Promise((r) => setTimeout(r, 10));
room.sessions.delete(wsD2);
delete room.playerState['bp_inbox_dave'];
const wsD3 = fakeWs('dave3');
await join(wsD3, 'bp_inbox_dave');
const psD3 = room.playerState['bp_inbox_dave'];
check('queued weapon delivers once a slot frees', psD3.weaponStash.length === room.WEAPON_STASH_CAP && psD3.weaponStash.some((w) => w.name === 'Sword mailed'), psD3.weaponStash.map((w) => w.name));
check('fully drained inbox key deleted', !state._store.has('inbox:bp_inbox_dave'));
const inbD3 = msgsOfType(wsD3, 'inbox_delivered');
check('second drain reports queued === 0', inbD3.length === 1 && inbD3[0].payload.queued === 0 && inbD3[0].payload.entries[0].kind === 'weapon', inbD3);

// ── 9. v2.3.1176: _opPruneMaybe (48h expiry + junk cleanup + hourly rate limit) ──
// Both failure directions are silent (best-effort catch), so assert
// each explicitly: expired and junk-valued keys go, fresh keys stay,
// and a second sweep inside the hour is a no-op.
await room.state.storage.put('oplog:old', Date.now() - 49 * 3600000);
await room.state.storage.put('oplog:fresh', Date.now());
await room.state.storage.put('oplog:junk', 'not-a-timestamp');
await room._opStamp('test:prune:live');
room._lastOpPrune = 0; // reset the once-per-hour anchor (joins above already swept)
await room._opPruneMaybe();
check('prune deletes 49h-old oplog entry', !state._store.has('oplog:old'));
check('prune deletes junk-valued oplog entry', !state._store.has('oplog:junk'));
check('prune keeps fresh oplog entry', state._store.has('oplog:fresh'));
check('stamped opId survives the prune and is still seen', (await room._opSeen('test:prune:live')) === true);
// Rate limit: re-seed an expired key and sweep again immediately -- it
// must SURVIVE because the hourly anchor was just set.
await room.state.storage.put('oplog:old', Date.now() - 49 * 3600000);
await room._opPruneMaybe();
check('second sweep inside the hour is rate-limited (expired key survives)', state._store.has('oplog:old'));
await room.state.storage.delete('oplog:old'); // don't leak into later checks

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
