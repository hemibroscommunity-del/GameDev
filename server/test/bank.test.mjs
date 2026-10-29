/* THE BANK'S VAULT -- v2.3.3785 (docs/specs/bank-vault.md, server/src/bank.js).
 *
 * The owner: "Oh yeah make it so you can actually deposit and retrieve items
 * and gold from the bank".
 *
 *   1. At the Bank's door, on either Wheel: items and gold go in and come
 *      out, the bag, the purse and the vault each right, answered bank_state
 *      and echoed in player_state.
 *   2. ONE write: each move is one rpg put and one bank put, issued with no
 *      await between them; a refusal writes nothing.
 *   3. An opId spent moves nothing a second time (a resend after a drop).
 *   4. Every refusal, each answered and nothing changed or written: away from
 *      the door, out of the Wheel, more than you have (both ways, items and
 *      gold), a key you do not hold, '__proto__' and its kin, a tool, a full
 *      vault (48 kinds), no opId, a bad count, past the pace.
 *   5. A death drops the bag as Remains and never the vault; the vault
 *      outlives a reconnect and a worker restart (it is read back from
 *      storage), and an id spent before a restart stays spent.
 *   6. `bank: false`: every move answered 'off', caps.bank false at the next
 *      join, and opening still shows what is in it.
 *   7. The wire: the three messages are routed, never relayed; bank_state is
 *      privileged; a restarted character's vault goes with it.
 *   8. A record from a NEWER worker is shown as unavailable and never
 *      rewritten. */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { BANK, normalizeVault, vaultRecord } from '../src/bank.js';
import { PACE } from '../src/flood.js';
import * as LONG from '../src/wheelspawns.js';
import * as SHORT from '../src/wheelspawns1.js';

function makeState() {
  const store = new Map();
  const puts = { rpg: 0, bank: 0 };
  /* the run of puts issued since the last await turn: two puts of one move
     must land in the same run */
  let run = [];
  let runs = [];
  let flushQueued = false;
  return {
    _store: store,
    _puts: () => ({ ...puts }),
    _runs: () => runs,
    _resetRuns: () => { runs = []; run = []; },
    storage: {
      get: async (k) => store.get(k),
      put: (k, v) => {
        if (typeof k === 'string' && k.startsWith('rpg:')) puts.rpg++;
        if (typeof k === 'string' && k.startsWith('bank:')) puts.bank++;
        store.set(k, JSON.parse(JSON.stringify(v)));
        run.push(String(k).split(':')[0]);
        if (!flushQueued) {
          flushQueued = true;
          queueMicrotask(() => { runs.push(run); run = []; flushQueued = false; });
        }
        return Promise.resolve();
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function makeRoom(flags, state) {
  state = state || makeState();
  const room = new GameRoom(state, mockEnv);
  if (flags) room._liveFlags = flags;
  return { room, state };
}
async function join(room, ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  return room.sessions.get(ws);
}
async function send(room, ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const stateOf = (ws) => { const m = ws.sent.filter((x) => x.type === 'bank_state'); return m.length ? m[m.length - 1].payload : null; };
const vaultItem = (st, key) => { const it = st && st.items.find((i) => i.key === key); return it ? it.n : 0; };

/* standing at the Bank's door of the Wheel this room plays: your middle a
   step below the foot of its steps */
function atBank(room, P, dx, dy) {
  const c = room._wheelT().WHEEL_CENTRE;
  P.z = 'wheel';
  P.x = c[0] + BANK.DOOR[0] + (dx || 0);
  P.y = c[1] + BANK.DOOR[1] + (dy === undefined ? 150 : dy);
  P.dead = false; P.dying = false;
}
let opSeq = 0;
const op = () => 'op-' + (++opSeq);

// ── 1 + 2. at the Bank, on either Wheel: both directions, one write each ──
for (const long of [LONG.WHEEL_LONG, SHORT.WHEEL_LONG]) {
  const { room, state } = await makeRoom();
  const ws = fakeWs();
  await join(room, ws, 'bp_bank_a');
  const P = room.playerState.bp_bank_a;
  room._wheelLong = long;
  check(`1 (${long}x): the room plays the Wheel asked for (guard)`, room._wheelT().WHEEL_LONG === long);
  atBank(room, P, 40);
  P.inventory = { wood_oak: 10, fish_minnow: 3 };
  P.coins = 500;

  await send(room, ws, 'bank_open', {});
  const s0 = stateOf(ws);
  check(`1 (${long}x): bank_open answers an empty vault: 0 gold, no items, 48 slots`,
    !!s0 && s0.ok === true && s0.on === true && s0.gold === 0 && s0.items.length === 0 && s0.slots === 48 && s0.slots === BANK.SLOTS, s0);

  let p0 = state._puts();
  state._resetRuns();
  await send(room, ws, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 4, opId: op() });
  let s = stateOf(ws);
  let p1 = state._puts();
  check(`1 (${long}x): 4 oak go in: 6 in the bag, 4 in the vault, answered ok`,
    P.inventory.wood_oak === 6 && vaultItem(s, 'wood_oak') === 4 && s.last && s.last.ok === true && s.last.dir === 'in', { inv: P.inventory, s });
  check(`2 (${long}x): ...ONE rpg put and ONE bank put`, p1.rpg - p0.rpg === 1 && p1.bank - p0.bank === 1, { p0, p1 });
  check(`2 (${long}x): ...issued in the same run, no await between them`,
    state._runs().some((r) => r.includes('rpg') && r.includes('bank')), state._runs());
  const echo = ws.sent.find((m) => m.type === 'player_state');
  check(`1 (${long}x): ...and the bag echoed in player_state`, !!echo && echo.payload.inventory && echo.payload.inventory.wood_oak === 6, echo && echo.payload.inventory);
  const stored = state._store.get('bank:bp_bank_a');
  check(`1 (${long}x): ...and stored: {_v, gold, items, ops}`,
    !!stored && stored._v === BANK.V && stored.gold === 0 && stored.items.length === 1 && stored.items[0].key === 'wood_oak' && stored.items[0].n === 4 && stored.ops.length === 1, stored);

  await send(room, ws, 'bank_deposit', { kind: 'item', id: 'fish_minnow', n: 3, opId: op() });
  s = stateOf(ws);
  check(`1 (${long}x): the whole stack goes in and its key leaves the bag`, !('fish_minnow' in P.inventory) && vaultItem(s, 'fish_minnow') === 3, { inv: P.inventory, s });

  await send(room, ws, 'bank_withdraw', { kind: 'item', id: 'wood_oak', n: 4, opId: op() });
  s = stateOf(ws);
  check(`1 (${long}x): 4 oak come out: 10 in the bag, none left in the vault (its slot freed)`,
    P.inventory.wood_oak === 10 && vaultItem(s, 'wood_oak') === 0 && !s.items.some((i) => i.key === 'wood_oak'), { inv: P.inventory, s });

  p0 = state._puts();
  await send(room, ws, 'bank_deposit', { kind: 'gold', n: 300, opId: op() });
  s = stateOf(ws);
  p1 = state._puts();
  check(`1 (${long}x): 300 gold go in: 200 on you, 300 in the vault`, P.coins === 200 && s.gold === 300, { coins: P.coins, s });
  check(`2 (${long}x): ...one rpg put and one bank put`, p1.rpg - p0.rpg === 1 && p1.bank - p0.bank === 1, { p0, p1 });
  await send(room, ws, 'bank_withdraw', { kind: 'gold', n: 120, opId: op() });
  s = stateOf(ws);
  check(`1 (${long}x): 120 gold come out: 320 on you, 180 in the vault`, P.coins === 320 && s.gold === 180, { coins: P.coins, s });
  const echo2 = ws.sent.find((m) => m.type === 'player_state');
  check(`1 (${long}x): ...the purse echoed`, !!echo2 && echo2.payload.coins === 320, echo2 && echo2.payload.coins);
}

const { room, state } = await makeRoom();
const ws = fakeWs();
await join(room, ws, 'bp_bank_b');
const P = room.playerState.bp_bank_b;

// ── 3. an opId spent moves nothing twice ──
{
  atBank(room, P);
  P.inventory = { wood_oak: 5 };
  P.coins = 100;
  const id = op();
  await send(room, ws, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 2, opId: id });
  const p0 = state._puts();
  await send(room, ws, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 2, opId: id });
  const s = stateOf(ws);
  const p1 = state._puts();
  check('3: the same opId again moves nothing: 3 in the bag, 2 in the vault', P.inventory.wood_oak === 3 && vaultItem(s, 'wood_oak') === 2, { inv: P.inventory, s });
  check('3: ...answered as the op it was (ok), and nothing written', s.last && s.last.ok === true && s.last.opId === id && p1.rpg === p0.rpg && p1.bank === p0.bank, { last: s.last, p0, p1 });
  const gid = op();
  await send(room, ws, 'bank_withdraw', { kind: 'gold', n: 0, opId: gid });
  check('3: a refused op does not spend its id: asked again with a good count, it moves', stateOf(ws).last.ok === false);
  await send(room, ws, 'bank_deposit', { kind: 'gold', n: 40, opId: gid });
  check('3: ...(40 gold in under the same id)', P.coins === 60 && stateOf(ws).gold === 40, { coins: P.coins, s: stateOf(ws) });
  /* the ops list stays bounded */
  for (let i = 0; i < 40; i++) {
    room._paceBuckets && room._paceBuckets.clear && room._paceBuckets.clear();
    await send(room, ws, 'bank_deposit', { kind: 'gold', n: 1, opId: op() });
  }
  const rec = state._store.get('bank:bp_bank_b');
  check('3: the spent ids kept are the last 32', !!rec && rec.ops.length === BANK.OPS && BANK.OPS === 32, rec && rec.ops.length);
}

// ── 4. every refusal: answered, nothing changed, nothing written ──
{
  const refuse = async (label, type, payload, want, setup) => {
    atBank(room, P);
    P.inventory = { wood_oak: 5, woodcutting_axe: 1 };
    P.coins = 50;
    if (setup) setup();
    if (room._paceBuckets && room._paceBuckets.clear && want !== 'busy') room._paceBuckets.clear();
    const inv0 = JSON.stringify(P.inventory), c0 = P.coins;
    const rec0 = JSON.stringify(state._store.get('bank:bp_bank_b'));
    const p0 = state._puts();
    await send(room, ws, type, payload);
    const s = stateOf(ws);
    const p1 = state._puts();
    check(`4: ${label} -> '${want}', nothing moved or written`,
      !!s && s.last && s.last.ok === false && s.last.err === want
        && JSON.stringify(P.inventory) === inv0 && P.coins === c0
        && JSON.stringify(state._store.get('bank:bp_bank_b')) === rec0
        && p1.rpg === p0.rpg && p1.bank === p0.bank,
      { last: s && s.last, inv: P.inventory, coins: P.coins, p0, p1 });
  };
  await refuse('away from the door (an arm\'s length past its reach)', 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 1, opId: op() }, 'not_here',
    () => { P.x += BANK.DOOR_R + 10; });
  await refuse('out of the Wheel (a farm)', 'bank_deposit', { kind: 'gold', n: 1, opId: op() }, 'not_here', () => { P.z = 'farm_home'; });
  await refuse('more oak than you carry', 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 6, opId: op() }, 'not_enough');
  await refuse('more gold than you carry', 'bank_deposit', { kind: 'gold', n: 51, opId: op() }, 'not_enough');
  await refuse('more gold than the vault holds', 'bank_withdraw', { kind: 'gold', n: 1e6, opId: op() }, 'not_enough');
  await refuse('more oak than the vault holds', 'bank_withdraw', { kind: 'item', id: 'wood_oak', n: 99, opId: op() }, 'not_enough');
  await refuse('a key you do not carry', 'bank_deposit', { kind: 'item', id: 'gold_bar', n: 1, opId: op() }, 'bad_key');
  await refuse('a key the vault does not hold', 'bank_withdraw', { kind: 'item', id: 'gold_bar', n: 1, opId: op() }, 'bad_key');
  for (const k of ['__proto__', 'constructor', 'prototype']) {
    await refuse(`'${k}' in`, 'bank_deposit', { kind: 'item', id: k, n: 1, opId: op() }, 'bad_key');
    await refuse(`'${k}' out`, 'bank_withdraw', { kind: 'item', id: k, n: 1, opId: op() }, 'bad_key');
  }
  check('4: ...and no prototype was touched', ({}).polluted === undefined && Object.getPrototypeOf(P.inventory) === Object.prototype);
  await refuse('a gathering tool', 'bank_deposit', { kind: 'item', id: 'woodcutting_axe', n: 1, opId: op() }, 'kept');
  await refuse('no opId', 'bank_deposit', { kind: 'gold', n: 1 }, 'bad');
  await refuse('a count of 0', 'bank_deposit', { kind: 'gold', n: 0, opId: op() }, 'bad');
  await refuse('a fractional count', 'bank_deposit', { kind: 'gold', n: 1.5, opId: op() }, 'bad');
  await refuse('a negative count', 'bank_withdraw', { kind: 'gold', n: -5, opId: op() }, 'bad');
  await refuse('an unknown kind', 'bank_deposit', { kind: 'pet', id: 'wood_oak', n: 1, opId: op() }, 'bad');
  /* a full vault: 48 kinds already in */
  {
    const v = room._bankMap().get('bp_bank_b');
    const keep = new Map(v.items);
    v.items.clear();
    for (let i = 0; i < BANK.SLOTS; i++) v.items.set('ore_test_' + i, 1);
    await refuse('a 49th kind into a vault of 48', 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 1, opId: op() }, 'vault_full');
    atBank(room, P); P.inventory = { ore_test_3: 2 };
    if (room._paceBuckets && room._paceBuckets.clear) room._paceBuckets.clear();
    await send(room, ws, 'bank_deposit', { kind: 'item', id: 'ore_test_3', n: 2, opId: op() });
    check('4: ...but more of a kind already in still fits', stateOf(ws).last.ok === true && v.items.get('ore_test_3') === 3, stateOf(ws).last);
    v.items.clear();
    for (const [k, n] of keep) v.items.set(k, n);
  }
  /* the pace */
  {
    atBank(room, P);
    P.inventory = { wood_oak: 200 };
    if (room._paceBuckets && room._paceBuckets.clear) room._paceBuckets.clear();
    let oks = 0, busy = 0;
    for (let i = 0; i < PACE.BANK.BURST + 3; i++) {
      await send(room, ws, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 1, opId: op() });
      const l = stateOf(ws).last;
      if (l.ok) oks++; else if (l.err === 'busy') busy++;
    }
    check(`4: past ${PACE.BANK.BURST} moves in a burst a move is refused 'busy'`, oks === PACE.BANK.BURST && busy === 3, { oks, busy });
    if (room._paceBuckets && room._paceBuckets.clear) room._paceBuckets.clear();
  }
}

// ── 5. a death drops the bag, never the vault; the vault outlives a reconnect ──
{
  const { room: r2, state: st2 } = await makeRoom();
  const w2 = fakeWs();
  await join(r2, w2, 'bp_bank_d');
  const D = r2.playerState.bp_bank_d;
  atBank(r2, D);
  D.inventory = { wood_oak: 6, fish_minnow: 4 };
  D.coins = 90;
  await send(r2, w2, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 5, opId: op() });
  await send(r2, w2, 'bank_deposit', { kind: 'gold', n: 60, opId: op() });
  D.z = 'meadow'; D.x = 2000; D.y = 2000; D.maxHp = 100; D.hp = 0;
  r2._handlePlayerDeath(D, 'bp_bank_d', 'test');
  const pile = (r2.loot.meadow || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-bp_bank_d'));
  check('5: a death drops the bag as Remains: the oak still carried and the fish',
    !!pile && pile.deathItems.some((i) => i.key === 'wood_oak' && i.qty === 1) && pile.deathItems.some((i) => i.key === 'fish_minnow' && i.qty === 4), pile && pile.deathItems);
  const v = r2._bankMap().get('bp_bank_d');
  check('5: ...and never the vault: 5 oak and 60 gold still in it, in memory and stored',
    v.items.get('wood_oak') === 5 && v.gold === 60 && st2._store.get('bank:bp_bank_d').gold === 60 && st2._store.get('bank:bp_bank_d').items[0].n === 5, { v: vaultRecord(v), stored: st2._store.get('bank:bp_bank_d') });
  /* leave, then come back in a fresh room over the same storage */
  await r2.webSocketClose(w2);
  check('5: leaving drops the vault\'s cache', !r2._bankMap().has('bp_bank_d'));
  const { room: r3 } = await makeRoom(null, st2);
  const w3 = fakeWs();
  await join(r3, w3, 'bp_bank_d');
  await send(r3, w3, 'bank_open', {});
  const s = stateOf(w3);
  check('5: back again, the vault is read from storage: 5 oak and 60 gold', !!s && s.gold === 60 && vaultItem(s, 'wood_oak') === 5, s);
}

// ── 5b. a vault outlives a worker restart: a new room over the same storage,
//        memory gone (rule 11), and no leave ever ran ──
{
  const { room: r2, state: st2 } = await makeRoom();
  const w2 = fakeWs();
  await join(r2, w2, 'bp_bank_rr');
  const R = r2.playerState.bp_bank_rr;
  atBank(r2, R);
  R.inventory = { wood_oak: 9, fish_minnow: 2 }; R.coins = 300;
  await send(r2, w2, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 7, opId: 'rr-1' });
  await send(r2, w2, 'bank_deposit', { kind: 'gold', n: 250, opId: 'rr-2' });
  /* the restart: a fresh room, the same storage, nothing of r2's memory */
  const { room: r3 } = await makeRoom(null, st2);
  const w3 = fakeWs();
  await join(r3, w3, 'bp_bank_rr');
  await send(r3, w3, 'bank_open', {});
  const s = stateOf(w3);
  const R3 = r3.playerState.bp_bank_rr;
  check('5b: after a worker restart the vault is all there: 7 oak and 250 gold', !!s && s.gold === 250 && vaultItem(s, 'wood_oak') === 7, s);
  check('5b: ...and the bag and purse as they were left: 2 oak, 50 gold (nothing in two places)', !!R3 && R3.inventory.wood_oak === 2 && R3.coins === 50, R3 && { inv: R3.inventory, coins: R3.coins });
  atBank(r3, R3);
  await send(r3, w3, 'bank_deposit', { kind: 'gold', n: 250, opId: 'rr-2' });
  check('5b: ...and an id spent before the restart is still spent: resent, it moves nothing', stateOf(w3).last.ok === true && R3.coins === 50 && stateOf(w3).gold === 250, stateOf(w3));
}

// ── 6. the kill switch ──
{
  const { room: r4, state: st4 } = await makeRoom({ bank: false });
  const w4 = fakeWs();
  r4.sessions.set(w4, baseSession());
  await r4.webSocketMessage(w4, JSON.stringify({ type: 'join', id: 'bp_bank_off', name: 'T', phrase: 'p-off', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const sync = w4.sent.find((m) => m.type === 'state_sync');
  check('6: bank: false -> caps.bank false at the join', !!sync && sync.caps && sync.caps.bank === false, sync && sync.caps && sync.caps.bank);
  st4._store.set('bank:bp_bank_off', { _v: 1, gold: 7, items: [{ key: 'wood_oak', n: 2 }], ops: [] });
  const O = r4.playerState.bp_bank_off;
  atBank(r4, O);
  O.inventory = { wood_oak: 3 }; O.coins = 10;
  await send(r4, w4, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 1, opId: op() });
  let s = stateOf(w4);
  check('6: ...a deposit is answered \'off\' and moves nothing', s.last.err === 'off' && O.inventory.wood_oak === 3 && s.on === false, s);
  await send(r4, w4, 'bank_withdraw', { kind: 'gold', n: 1, opId: op() });
  s = stateOf(w4);
  check('6: ...a withdrawal too', s.last.err === 'off' && O.coins === 10, s);
  await send(r4, w4, 'bank_open', {});
  s = stateOf(w4);
  check('6: ...and opening still shows what is in it', s.gold === 7 && vaultItem(s, 'wood_oak') === 2, s);
  const { room: r5 } = await makeRoom();
  const w5 = fakeWs();
  r5.sessions.set(w5, baseSession());
  await r5.webSocketMessage(w5, JSON.stringify({ type: 'join', id: 'bp_bank_on', name: 'T', phrase: 'p-on', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const sync5 = w5.sent.find((m) => m.type === 'state_sync');
  check('6: caps.bank is true otherwise', !!sync5 && sync5.caps && sync5.caps.bank === true);
}

// ── 7. the wire ──
{
  check('7: bank_state is privileged (a phone cannot forge it)', PRIVILEGED_EVENTS.has ? PRIVILEGED_EVENTS.has('bank_state') : PRIVILEGED_EVENTS.includes('bank_state'));
  const { room: r6 } = await makeRoom();
  const a = fakeWs(), b = fakeWs();
  await join(r6, a, 'bp_bank_r1');
  await join(r6, b, 'bp_bank_r2');
  for (const t of ['bank_open', 'bank_deposit', 'bank_withdraw', 'bank_state']) {
    b.sent.length = 0;
    await send(r6, a, t, { kind: 'gold', n: 1, opId: op() });
    check(`7: ${t} from a phone reaches nobody else`, !b.sent.some((m) => m.type === t), b.sent.map((m) => m.type));
  }
  /* a restart deletes the vault with the character */
  const { room: r7, state: st7 } = await makeRoom();
  const w7 = fakeWs();
  await join(r7, w7, 'bp_bank_rs');
  st7._store.set('bank:bp_bank_rs', { _v: 1, gold: 5, items: [], ops: [] });
  await send(r7, w7, 'character_reset', { confirm: true });
  check('7: a restarted character\'s vault goes with it (character_reset)', !st7._store.has('bank:bp_bank_rs') && !r7._bankMap().has('bp_bank_rs'));
}

// ── 8. a record from a newer worker ──
{
  const v = normalizeVault({ _v: BANK.V + 1, gold: 9, items: [], ops: [] });
  check('8: a newer record is marked, not read', v.newer === true);
  const { room: r8, state: st8 } = await makeRoom();
  const w8 = fakeWs();
  await join(r8, w8, 'bp_bank_new');
  const rec = { _v: BANK.V + 1, gold: 9, items: [{ key: 'x', n: 1 }], ops: [], extra: 'kept' };
  st8._store.set('bank:bp_bank_new', rec);
  const N = r8.playerState.bp_bank_new;
  atBank(r8, N); N.coins = 50;
  await send(r8, w8, 'bank_deposit', { kind: 'gold', n: 5, opId: op() });
  const s = stateOf(w8);
  check('8: ...a move is refused \'newer\', the purse untouched and the record never rewritten',
    s.ok === false && s.last.err === 'newer' && N.coins === 50 && JSON.stringify(st8._store.get('bank:bp_bank_new')) === JSON.stringify(rec), s);
}

if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
