/* ═══ v2.3.4432: A SECOND LOGIN MID-FIGHT IS A LEAVE: THE BODY STAYS ═══
 *
 * A second login while the old socket is still open (a second tab, a quick
 * relaunch) is a takeover (join.js).  It skipped the close, so the linger
 * (linger.js) never ran and the join built the body afresh where the new
 * phone said -- a fresh page says town: the loser of a No man's land fight
 * relaunched and walked off with the bag (state-machine sweep V3, S2-1).
 * Now a takeover whose old session passes the linger's own test gets the
 * real close, and the join is judged as a return to the body.  Against the
 * real GameRoom:
 *   1. the loser relaunches (from town) mid-fight: refused (`linger_wait`,
 *      4010), the body where it stood, its health, its fight clock, its bag
 *      and gold in memory and on record; the old phone is told "superseded";
 *      the winner's hits land on it;
 *   2. it is killed while it waits: the bag falls as a lingering body's does,
 *      nothing duplicated or lost, saved once;
 *   3. a real blip (the old socket still open, the phone beside the body):
 *      it resumes, as before, with its health, bag and gold;
 *   4. outside a fight a takeover is as before (new state where the phone
 *      says, no linger);
 *   5. a duel and an arena match across a takeover: as before (the linger's
 *      test leaves a duel alone);
 *   6. the device lock's and the key's refusals come first, unchanged: the
 *      live session and its body untouched;
 *   7. the kill switch `takeoverlinger: false`: the takeover as before.
 */
import { GameRoom } from '../src/index.js';
import { LINGER } from '../src/linger.js';
import { flagNameOk } from '../src/liveops.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_950_000_000_000;
const realNow = Date.now;
Date.now = () => T;
const realRandom = Math.random;
Math.random = () => 0.5;

/* real storage keeps a COPY of what was put (takeover-save.test) */
function makeState() {
  const store = new Map();
  const puts = [];
  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return {
    _store: store,
    _puts: puts,
    storage: {
      get: async (k) => copy(store.get(k)),
      put: async (k, v) => { puts.push(k); store.set(k, copy(v)); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

const state = makeState();
const room = new GameRoom(state, mockEnv);
const NML_X = WHEEL_CENTRE[0] + 9000, NML_Y = WHEEL_CENTRE[1];   /* No man's land */
const DEV = { id: 'tlphone1', env: 'e1' };
async function join(id, data, extra) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    device: DEV, data: Object.assign({ x: NML_X, y: NML_Y, z: WHEEL_ZONE }, data || {}) }, extra || {})));
  await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}
const TOWN = { x: 50, y: 50, z: 'town' };   /* where a fresh page says it is */
function place(id, x, y) {
  const ps = room.playerState[id];
  ps.z = WHEEL_ZONE; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false;
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp;
  return ps;
}
const exchange = (a, b) => room._notePvpExchange(a, b, T);
const rec = (id) => state._store.get('rpg:' + id);
const sockOf = (id) => { for (const [w, s] of room.sessions) if (s.id === id) return w; return null; };
const swing = (fromWs, target, sw) => {
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(fromWs), { kind: 'melee', range: 200, arc: 3, angle: 0, target, sw });
  return room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload.target === target);
};
const BAG = { raw_trout: 3, oak_log: 5, copper_ore: 2 };
const total = (inv) => Object.values(inv || {}).reduce((n, v) => n + (Number(v) || 0), 0);
/* a loser with a bag and gold, on record and in memory alike */
async function arm(id) {
  const ps = room.playerState[id];
  ps.inventory = { ...BAG };
  ps.coins = 777;
  await room._saveRpg(id, ps);
  return ps;
}

const wsA = await join('bp_tl_a');           /* the winner */
const wsW = await join('bp_tl_w');           /* a witness far off (keeps the room from emptying) */
place('bp_tl_a', NML_X, NML_Y);
place('bp_tl_w', NML_X + 3000, NML_Y);

// ── 1. the loser relaunches from town mid-fight ──
{
  const id = 'bp_tl_b';
  const ws1 = await join(id);
  const B = place(id, NML_X + 40, NML_Y);
  await arm(id);
  exchange('bp_tl_a', id);
  check('(guard) A may hit B', room._nmlAllowed('bp_tl_a', id));
  check('1. (guard) A\'s first swing lands', swing(wsA, id, 1));
  const hp1 = B.hp;
  T += 1000;
  const ws2 = await join(id, TOWN);
  const wait = ws2.sent.find((m) => m.type === 'linger_wait');
  check('1. the relaunch from town is refused: linger_wait, close 4010', !!wait && !!ws2.closed && ws2.closed.code === LINGER.CLOSE_CODE,
    { types: ws2.sent.map((m) => m.type), closed: ws2.closed });
  check('1. ...it waits out the body\'s time', !!wait && wait.payload.ms === LINGER.MS + LINGER.WAIT_SLACK_MS, wait && wait.payload);
  check('1. ...and no state reached it', !ws2.sent.some((m) => m.type === 'state_sync'));
  check('1. the old phone is told what it always was ("superseded by reconnect")', !!ws1.closed && ws1.closed.reason === 'superseded by reconnect', ws1.closed);
  check('1. ...and neither socket is in the room', !room.sessions.has(ws1) && !room.sessions.has(ws2));
  const P = room.playerState[id];
  check('1. the body is the SAME state, lingering', P === B && B.lingering === true);
  check('1. ...where it stood, in the Wheel, with its health', B.z === WHEEL_ZONE && B.x === NML_X + 40 && B.y === NML_Y && B.hp === hp1,
    { z: B.z, x: B.x, y: B.y, hp: B.hp, hp1 });
  check('1. ...its fight clock running', room._lingerFightRecent(id, T));
  check('1. ...its bag and gold in memory', total(B.inventory) === total(BAG) && B.coins === 777, { inv: B.inventory, coins: B.coins });
  check('1. ...and on record (nothing duplicated, nothing lost)', total(rec(id).inventory) === total(BAG) && rec(id).coins === 777, rec(id));
  check('1. the winner\'s next hit lands on it', swing(wsA, id, 2) && B.hp < hp1, { hp: B.hp, hp1 });
}

// ── 2. ...it is killed while it waits: the bag falls ──
{
  const id = 'bp_tl_b';
  const B = room.playerState[id];
  B.hp = 1;
  const putsBefore = state._puts.filter((k) => k === 'rpg:' + id).length;
  swing(wsA, id, 3);
  check('2. the waiting body is killed', B.dying === true, { hp: B.hp, dying: B.dying });
  const pile = (room.loot[WHEEL_ZONE] || []).find((l) => l && String(l.lootId || '').startsWith('dd-' + id));
  const onGround = pile ? (pile.deathItems || []).reduce((n, it) => n + (it.qty || 0), 0) : 0;
  check('2. the bag is on the ground, all of it (No man\'s land takes the whole bag)', onGround === total(BAG), { onGround, pile: pile && pile.deathItems });
  check('2. ...and out of the bag, in memory and on record', total(B.inventory) === 0 && total(rec(id).inventory) === 0, { mem: B.inventory, rec: rec(id).inventory });
  check('2. ...the gold neither duplicated nor lost', B.coins === rec(id).coins, { mem: B.coins, rec: rec(id).coins });
  T += 5001;
  room._tickPlayerRespawn();
  room._lingerSweep(T);
  await settle();
  check('2. once it has come back the body goes', !(id in room.playerState));
  const after = state._puts.filter((k) => k === 'rpg:' + id).length - putsBefore;
  check('2. the body\'s own save at its end happened (the death\'s, the respawn\'s, the end\'s)', after >= 1 && rec(id).hp > 0, { after, hp: rec(id).hp });
  const ws3 = await join(id, TOWN);
  check('2. the next join goes on, in town, with the empty bag', !ws3.sent.find((m) => m.type === 'linger_wait') && room.playerState[id].z === 'town'
    && total(room.playerState[id].inventory) === 0, { z: room.playerState[id] && room.playerState[id].z });
  await room.webSocketClose(ws3);
}

// ── 3. a real blip: the old socket open, the phone beside the body ──
{
  const id = 'bp_tl_c';
  const ws1 = await join(id);
  const C = place(id, NML_X + 40, NML_Y);
  await arm(id);
  exchange('bp_tl_a', id);
  swing(wsA, id, 4);
  const hp1 = C.hp;
  T += 1000;
  const ws2 = await join(id, { x: NML_X + 60, y: NML_Y + 20, z: WHEEL_ZONE });
  const N = room.playerState[id];
  check('3. a reconnect from beside the body resumes it at once', !ws2.sent.find((m) => m.type === 'linger_wait') && room.sessions.has(ws2) && !!N && !N.lingering,
    { types: ws2.sent.map((m) => m.type).slice(0, 4) });
  check('3. ...in the Wheel, beside where it stood', N.z === WHEEL_ZONE && Math.abs(N.x - (NML_X + 60)) < 1, { z: N.z, x: N.x });
  check('3. ...with its health, bag and gold', N.hp === hp1 && total(N.inventory) === total(BAG) && N.coins === 777, { hp: N.hp, hp1, inv: N.inventory, coins: N.coins });
  check('3. ...on record the same', rec(id).hp === hp1 && total(rec(id).inventory) === total(BAG) && rec(id).coins === 777, rec(id));
  check('3. ...its fight clock still running', room._lingerFightRecent(id, T));
  check('3. ...and the winner\'s hit lands', swing(wsA, id, 5) && N.hp < hp1);
  await room.webSocketClose(ws2);
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 4. outside a fight: as before ──
{
  const id = 'bp_tl_d';
  const ws1 = await join(id);
  const D = place(id, NML_X + 2000, NML_Y);
  await arm(id);
  const ws2 = await join(id, TOWN);
  const N = room.playerState[id];
  check('4. no fight: the takeover goes on, old phone superseded', room.sessions.has(ws2) && !!ws1.closed && ws1.closed.reason === 'superseded by reconnect'
    && !ws2.sent.find((m) => m.type === 'linger_wait'));
  check('4. ...a new state where the phone says (town), no linger', N !== D && N.z === 'town' && !N.lingering && (!room._lingerBodies || !room._lingerBodies.has(id)));
  check('4. ...the bag and gold the same', total(N.inventory) === total(BAG) && N.coins === 777);
  await room.webSocketClose(ws2);
}

// ── 5. a duel, an arena match: as before ──
for (const [label, tag] of [['a duel', null], ['an arena match', 'arena-m1']]) {
  const id = tag ? 'bp_tl_ar' : 'bp_tl_du';
  const ws1 = await join(id);
  place(id, NML_X + 40, NML_Y);
  exchange('bp_tl_a', id);
  if (!room._duels) room._duels = new Map();
  const duel = { id: 'tl-' + id, status: 'active', a: id, b: 'bp_tl_a', away: Object.create(null), ...(tag ? { arenaMatch: tag } : {}) };
  room._duels.set(duel.id, duel);
  const ws2 = await join(id, TOWN);
  check('5. ' + label + ' across a takeover: no linger, the join goes on as before',
    room.sessions.has(ws2) && !ws2.sent.find((m) => m.type === 'linger_wait') && !room.playerState[id].lingering && !!ws1.closed);
  check('5. ...and the ' + (tag ? 'match' : 'duel') + ' runs on', room._duels.get(duel.id) === duel && duel.status === 'active');
  room._duels.delete(duel.id);
  await room.webSocketClose(ws2);
}

// ── 6. the device lock and the key come first ──
{
  const id = 'bp_tl_e';
  const ws1 = await join(id);
  const E = place(id, NML_X + 40, NML_Y);
  exchange('bp_tl_a', id);
  const wsDev = await join(id, TOWN, { device: { id: 'otherphone', env: 'e9' } });
  const rDev = wsDev.sent.find((m) => m.type === 'join_rejected');
  check('6. another device mid-fight: refused \'device\', as before', !!rDev && rDev.reason === 'device', wsDev.sent.map((m) => m.type));
  check('6. ...the live session and its body untouched (no linger)', room.sessions.has(ws1) && !ws1.closed && room.playerState[id] === E && !E.lingering);
  const wsKey = await join(id, TOWN, { phrase: 'wrong-key-1' });
  const rKey = wsKey.sent.find((m) => m.type === 'join_rejected');
  check('6. a wrong key mid-fight: refused \'auth\', as before', !!rKey && rKey.reason === 'auth', wsKey.sent.map((m) => m.type));
  check('6. ...the live session and its body untouched', room.sessions.has(ws1) && !ws1.closed && room.playerState[id] === E && !E.lingering);
  await room.webSocketClose(ws1);
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 7. the kill switch ──
{
  check('7. `takeoverlinger` is a name POST /flags takes', flagNameOk('takeoverlinger'));
  room._liveFlags = { takeoverlinger: false };
  const id = 'bp_tl_f';
  const ws1 = await join(id);
  const F = place(id, NML_X + 40, NML_Y);
  await arm(id);
  exchange('bp_tl_a', id);
  const ws2 = await join(id, TOWN);
  const N = room.playerState[id];
  check('7. `takeoverlinger: false`: the takeover as before (in town, no wait)', room.sessions.has(ws2) && !ws2.sent.find((m) => m.type === 'linger_wait')
    && N !== F && N.z === 'town' && !N.lingering && !!ws1.closed);
  await room.webSocketClose(ws2);
  room._liveFlags = { takeoverlinger: true };
  const id2 = 'bp_tl_g';
  await join(id2);
  place(id2, NML_X + 40, NML_Y);
  exchange('bp_tl_a', id2);
  const ws4 = await join(id2, TOWN);
  check('7. `takeoverlinger: true` (or nothing set): the relaunch waits', !!ws4.sent.find((m) => m.type === 'linger_wait'));
  room._liveFlags = {};
}

Date.now = realNow;
Math.random = realRandom;
if (room.tickInterval) clearInterval(room.tickInterval);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
