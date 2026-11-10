/* ═══ v2.3.4455: A SECOND LOGIN MID-FIGHT TAKES OVER THE BODY WHERE IT STANDS ═══
 * (server/src/bodytake.js; the owner: "So yes do the take over body message")
 *
 * Against the real GameRoom, a fake clock, a fight in No man's land:
 *   1. a phone that can be placed (`tb: 1`) relaunches from town mid-fight:
 *      it is let in (state_sync, caps.bodyTake), the SAME body kept where it
 *      stands -- place, health, fight clock, bag, gold -- nothing written over
 *      the record, and `body_place` names the spot; the old phone is
 *      superseded;
 *   2. until it stands at the body its moves move nothing (a town move does
 *      not carry the body out), and the winner's hits land;
 *   3. its first move beside the body is its answer: the body is its own
 *      again, and the winner's hits still land;
 *   4. no answer in time, or a landing far from the body: the linger
 *      (v2.3.4432) -- the phone gets `linger_wait` and 4010;
 *   5. the body killed while it waits drops the bag, nothing duplicated;
 *   6. a phone that cannot be placed, outside a fight, a duel, an arena
 *      match: as before;
 *   7. the device lock's and the key's refusals first, unchanged;
 *   8. the kill switches `bodytake` and `takeoverlinger`; body_place is the
 *      worker's alone (PRIVILEGED_EVENTS);
 *   9. a body already lingering (the app closed first, or the socket the
 *      phone gave up on mid-takeover): a phone that can be placed takes it
 *      back where it stands; a dying one, or a phone that cannot, waits.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { LINGER } from '../src/linger.js';
import { BODY_TAKE } from '../src/bodytake.js';
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
const NML_X = WHEEL_CENTRE[0] + 9000, NML_Y = WHEEL_CENTRE[1];
const DEV = { id: 'btphone1', env: 'e1' };
async function join(id, data, extra) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    device: DEV, data: Object.assign({ x: NML_X, y: NML_Y, z: WHEEL_ZONE }, data || {}) }, extra || {})));
  await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}
const TOWN = { x: 50, y: 50, z: 'town' };
const PLACED = { tb: 1 };
function place(id, x, y) {
  const ps = room.playerState[id];
  ps.z = WHEEL_ZONE; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false;
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp;
  return ps;
}
const exchange = (a, b) => room._notePvpExchange(a, b, T);
const rec = (id) => state._store.get('rpg:' + id);
const rpgPuts = (id) => state._puts.filter((k) => k === 'rpg:' + id).length;
const swing = (fromWs, target, sw) => {
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(fromWs), { kind: 'melee', range: 200, arc: 3, angle: 0, target, sw });
  return room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload.target === target);
};
const move = (ws, x, y, z) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, d: 'down', f: 'down', z, vx: 0, vy: 0 }));
const BAG = { raw_trout: 3, oak_log: 5, copper_ore: 2 };
const total = (inv) => Object.values(inv || {}).reduce((n, v) => n + (Number(v) || 0), 0);
async function arm(id) {
  const ps = room.playerState[id];
  ps.inventory = { ...BAG };
  ps.coins = 777;
  await room._saveRpg(id, ps);
  return ps;
}
/* a loser in a fight with A, beside A, a bag and gold on record */
async function loser(id) {
  const ws1 = await join(id);
  const ps = place(id, NML_X + 40, NML_Y);
  await arm(id);
  exchange('bp_bt_a', id);
  return { ws1, ps };
}
let swN = 10;

const wsA = await join('bp_bt_a');
const wsW = await join('bp_bt_w');
place('bp_bt_a', NML_X, NML_Y);
place('bp_bt_w', NML_X + 3000, NML_Y);

// ── 1-3. placed where the body stands ──
{
  const id = 'bp_bt_b';
  const { ws1, ps: B } = await loser(id);
  check('(guard) A may hit B, and does', room._nmlAllowed('bp_bt_a', id) && swing(wsA, id, swN++));
  const hp1 = B.hp;
  B.d = 'left';
  B.po = 'sit';   /* a pose held when the takeover comes */
  const putsBefore = rpgPuts(id);
  T += 1000;
  const ws2 = await join(id, TOWN, PLACED);
  const types = ws2.sent.map((m) => m.type);
  const sync = ws2.sent.find((m) => m.type === 'state_sync');
  const bp = ws2.sent.find((m) => m.type === 'body_place');
  check('1. the relaunch is let in (state_sync), no wait', !!sync && !types.includes('linger_wait') && room.sessions.has(ws2) && !ws2.closed, types.slice(0, 8));
  check('1. ...told the worker can (caps.bodyTake), and that a place follows (bodyPlace)', !!sync && sync.caps && sync.caps.bodyTake === 1 && sync.bodyPlace === 1);
  check('1. body_place names the body\'s spot, zone and facing', !!bp && bp.payload.z === WHEEL_ZONE && bp.payload.x === NML_X + 40 && bp.payload.y === NML_Y && bp.payload.d === 'left', bp && bp.payload);
  check('1. ...after state_sync and its own player_state', types.indexOf('body_place') > types.indexOf('state_sync') && types.indexOf('body_place') > types.indexOf('player_state'), types);
  check('1. the old phone is superseded, as any takeover', !!ws1.closed && ws1.closed.reason === 'superseded by reconnect' && !room.sessions.has(ws1));
  check('1. the SAME body, not lingering', room.playerState[id] === B && !B.lingering && !B.disconnected && (!room._lingerBodies || !room._lingerBodies.has(id)));
  check('1. ...where it stood, in the Wheel, with its health', B.z === WHEEL_ZONE && B.x === NML_X + 40 && B.y === NML_Y && B.hp === hp1, { z: B.z, x: B.x, hp: B.hp, hp1 });
  check('1. ...its fight clock running', room._lingerFightRecent(id, T));
  check('1. ...standing up (no pose crosses a join)', !B.po);
  check('1. ...its bag and gold in memory and on record (nothing doubled or lost)', total(B.inventory) === total(BAG) && B.coins === 777
    && total(rec(id).inventory) === total(BAG) && rec(id).coins === 777, { mem: B.inventory, rec: rec(id) });
  check('1. ...and nothing written over the record by the takeover', rpgPuts(id) === putsBefore, { puts: rpgPuts(id) - putsBefore });
  const snap = room.getAllPlayerData();
  check('1. peers see the body where it stands (not where the phone said)', !!snap[id] && snap[id].z === WHEEL_ZONE && snap[id].x === NML_X + 40, snap[id] && { z: snap[id].z, x: snap[id].x });

  /* 2. waiting for the phone */
  await move(ws2, 60, 60, 'town');
  check('2. a move from today\'s town moves nothing: the body stays in the Wheel', B.z === WHEEL_ZONE && B.x === NML_X + 40 && B._bodyWait > 0, { z: B.z, x: B.x });
  check('2. the winner\'s hit lands while it waits', swing(wsA, id, swN++) && B.hp < hp1);

  /* 3. the phone stands at the body */
  const hp2 = B.hp;
  T += 2000;
  await move(ws2, NML_X + 50, NML_Y + 10, WHEEL_ZONE);
  check('3. its first move beside the body is its answer: the body is its own', !B._bodyWait && B.z === WHEEL_ZONE && Math.abs(B.x - (NML_X + 50)) < 1, { wait: B._bodyWait, x: B.x });
  check('3. ...with the health it had', B.hp === hp2);
  check('3. ...and the winner\'s hits still land', swing(wsA, id, swN++) && B.hp < hp2);
  check('3. ...and the bag and gold as they were', total(B.inventory) === total(BAG) && B.coins === 777);
  await room.webSocketClose(ws2);
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 4. no answer in time, or a landing elsewhere: the linger ──
{
  const id = 'bp_bt_c';
  const { ps: C } = await loser(id);
  T += 1000;
  const ws2 = await join(id, TOWN, PLACED);
  check('4. (guard) kept, waiting', room.playerState[id] === C && C._bodyWait > 0);
  T += BODY_TAKE.WAIT_MS - 1;
  room._bodyTakeSweep(T);
  await settle();
  check('4. a moment before the time is up it still waits', room.sessions.has(ws2) && C._bodyWait > 0);
  exchange('bp_bt_a', id);   /* still fighting: the winner kept hitting */
  T += 1;
  room._bodyTakeSweep(T);
  await settle();
  const w = ws2.sent.find((m) => m.type === 'linger_wait');
  check('4. no answer in time: the body lingers, the phone gets linger_wait and 4010', C.lingering === true && !!w && !!ws2.closed && ws2.closed.code === LINGER.CLOSE_CODE && !room.sessions.has(ws2),
    { lingering: C.lingering, w: !!w, closed: ws2.closed });
  check('4. ...the same body, where it stood, the bag in it', room.playerState[id] === C && C.x === NML_X + 40 && total(C.inventory) === total(BAG));
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
  check('4. ...and when the linger is over it goes, its bag on record', !(id in room.playerState) && total(rec(id).inventory) === total(BAG) && rec(id).coins === 777, rec(id));

  const id2 = 'bp_bt_c2';
  const { ps: C2 } = await loser(id2);
  T += 1000;
  const ws3 = await join(id2, TOWN, PLACED);
  await move(ws3, NML_X + 40 + LINGER.RESUME_PX + 200, NML_Y, WHEEL_ZONE);
  await settle();
  check('4. a phone that lands in the Wheel far from the body: the linger at once, the body unmoved', C2.lingering === true && C2.x === NML_X + 40
    && !!ws3.sent.find((m) => m.type === 'linger_wait'), { lingering: C2.lingering, x: C2.x });
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 5. killed while it waits ──
{
  const id = 'bp_bt_d';
  const { ps: D } = await loser(id);
  T += 1000;
  const ws2 = await join(id, TOWN, PLACED);
  D.hp = 1;
  swing(wsA, id, swN++);
  check('5. the waiting body is killed', D.dying === true);
  const pile = (room.loot[WHEEL_ZONE] || []).find((l) => l && String(l.lootId || '').startsWith('dd-' + id));
  const onGround = pile ? (pile.deathItems || []).reduce((n, it) => n + (it.qty || 0), 0) : 0;
  check('5. the whole bag is on the ground and out of the bag, in memory and on record', onGround === total(BAG) && total(D.inventory) === 0 && total(rec(id).inventory) === 0,
    { onGround, mem: D.inventory, rec: rec(id).inventory });
  check('5. ...the gold the same in memory and on record', D.coins === rec(id).coins);
  await room.webSocketClose(ws2);
  T += 5001;
  room._tickPlayerRespawn();
  room._lingerSweep(T + LINGER.MS + 1);
  room._bodyTakeSweep(T + BODY_TAKE.WAIT_MS);
  await settle();
}

// ── 6. as before: no `tb`, no fight, a duel, an arena match ──
{
  const id = 'bp_bt_e';
  await loser(id);
  T += 1000;
  const ws2 = await join(id, TOWN);
  check('6. a phone that cannot be placed: v2.3.4432\'s wait, no body_place', !!ws2.sent.find((m) => m.type === 'linger_wait') && !ws2.sent.find((m) => m.type === 'body_place'));
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();

  const id2 = 'bp_bt_f';
  const ws1 = await join(id2);
  const F = place(id2, NML_X + 2500, NML_Y);
  const ws3 = await join(id2, TOWN, PLACED);
  const N = room.playerState[id2];
  check('6. outside a fight: the takeover as before (a new state in town, no body_place)', room.sessions.has(ws3) && N !== F && N.z === 'town'
    && !(ws3.sent.find((m) => m.type === 'state_sync') || {}).bodyPlace
    && !ws3.sent.find((m) => m.type === 'body_place') && !N._bodyWait && !!ws1.closed);
  await room.webSocketClose(ws3);

  for (const [label, tag] of [['a duel', null], ['an arena match', 'arena-bt']]) {
    const idd = tag ? 'bp_bt_ar' : 'bp_bt_du';
    await join(idd);
    place(idd, NML_X + 40, NML_Y);
    exchange('bp_bt_a', idd);
    if (!room._duels) room._duels = new Map();
    const duel = { id: 'bt-' + idd, status: 'active', a: idd, b: 'bp_bt_a', away: Object.create(null), ...(tag ? { arenaMatch: tag } : {}) };
    room._duels.set(duel.id, duel);
    const wsd = await join(idd, TOWN, PLACED);
    check('6. ' + label + ': as before (no body_place, no wait), and it runs on', room.sessions.has(wsd) && !wsd.sent.find((m) => m.type === 'body_place')
      && !wsd.sent.find((m) => m.type === 'linger_wait') && room._duels.get(duel.id) === duel && duel.status === 'active');
    room._duels.delete(duel.id);
    await room.webSocketClose(wsd);
  }
}

// ── 7. the device lock and the key first ──
{
  const id = 'bp_bt_g';
  const { ws1, ps: G } = await loser(id);
  const wsDev = await join(id, TOWN, { tb: 1, device: { id: 'otherphone', env: 'e9' } });
  const r1 = wsDev.sent.find((m) => m.type === 'join_rejected');
  check('7. another device mid-fight: \'device\', the live body untouched', !!r1 && r1.reason === 'device' && room.sessions.has(ws1) && !ws1.closed && room.playerState[id] === G && !G._bodyWait);
  const wsKey = await join(id, TOWN, { tb: 1, phrase: 'wrong-key-1' });
  const r2 = wsKey.sent.find((m) => m.type === 'join_rejected');
  check('7. a wrong key mid-fight: \'auth\', the live body untouched', !!r2 && r2.reason === 'auth' && room.sessions.has(ws1) && !ws1.closed && !G._bodyWait);
  await room.webSocketClose(ws1);
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 9. a body already lingering (the old socket closed first) ──
{
  const id = 'bp_bt_j';
  const { ws1, ps: J } = await loser(id);
  T += 1000;
  await room.webSocketClose(ws1);
  check('9. (guard) the app closed mid-fight: the body lingers', J.lingering === true);
  T += 3000;
  const ws2 = await join(id, TOWN, PLACED);
  const bp = ws2.sent.find((m) => m.type === 'body_place');
  check('9. a relaunch that can be placed takes the lingering body back where it stands (no wait)', room.sessions.has(ws2) && !ws2.sent.find((m) => m.type === 'linger_wait')
    && room.playerState[id] === J && !J.lingering && J._bodyWait > 0 && !!bp && bp.payload.x === NML_X + 40, { types: ws2.sent.map((m) => m.type).slice(0, 6) });
  check('9. ...nothing lingers any more, its bag and gold as they were', (!room._lingerBodies || !room._lingerBodies.has(id)) && total(J.inventory) === total(BAG) && J.coins === 777);
  /* the socket the phone gives up on in the middle of the takeover: the
     body lingers, and the phone's next join takes it back (mp-bodytake) */
  await room.webSocketClose(ws2);
  check('9. the kept session closed while it waits: the body lingers again', J.lingering === true);
  const ws3 = await join(id, TOWN, PLACED);
  check('9. ...and the phone\'s next join takes it back again', room.sessions.has(ws3) && room.playerState[id] === J && !J.lingering && !!ws3.sent.find((m) => m.type === 'body_place'));
  await move(ws3, NML_X + 45, NML_Y, WHEEL_ZONE);
  check('9. ...and stands at it', !J._bodyWait);
  /* a dying lingering body: waits for the respawn, as before */
  await room.webSocketClose(ws3);
  J.hp = 1;
  exchange('bp_bt_a', id);
  swing(wsA, id, swN++);
  check('9. (guard) the lingering body is killed', J.dying === true && J.lingering === true);
  const ws4 = await join(id, TOWN, PLACED);
  check('9. a dying lingering body: the wait, as before (no body_place)', !!ws4.sent.find((m) => m.type === 'linger_wait') && !ws4.sent.find((m) => m.type === 'body_place'));
  T += 5001;
  room._tickPlayerRespawn();
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
  /* a phone that cannot be placed still waits for a lingering body */
  const id2 = 'bp_bt_k';
  const { ws1: wk } = await loser(id2);
  T += 1000;
  await room.webSocketClose(wk);
  const ws5 = await join(id2, TOWN);
  check('9. a lingering body and a phone that cannot be placed: the wait, as before', !!ws5.sent.find((m) => m.type === 'linger_wait'));
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
}

// ── 8. the switches ──
{
  check('8. `bodytake` is a name POST /flags takes', flagNameOk('bodytake'));
  check('8. body_place is the worker\'s alone (PRIVILEGED_EVENTS)', PRIVILEGED_EVENTS.has('body_place'));
  room._liveFlags = { bodytake: false };
  const id = 'bp_bt_h';
  await loser(id);
  T += 1000;
  const ws2 = await join(id, TOWN, PLACED);
  check('8. `bodytake: false`: v2.3.4432 for every phone (the wait), no body_place', !!ws2.sent.find((m) => m.type === 'linger_wait') && !ws2.sent.find((m) => m.type === 'body_place'));
  /* ...and its body now lingers: a placed phone's next join waits too */
  const ws2b = await join(id, TOWN, PLACED);
  check('8. ...a lingering body too', !!ws2b.sent.find((m) => m.type === 'linger_wait') && !ws2b.sent.find((m) => m.type === 'body_place'));
  room._lingerSweep(T + LINGER.MS + 1);
  await settle();
  const wsP = await join('bp_bt_probe', TOWN);
  const syncOff = wsP.sent.find((m) => m.type === 'state_sync');
  check('8. ...and caps.bodyTake un-advertised', !!syncOff && syncOff.caps && syncOff.caps.bodyTake === undefined);
  await room.webSocketClose(wsP);
  room._liveFlags = { takeoverlinger: false };
  const id2 = 'bp_bt_i';
  const { ps: I } = await loser(id2);
  T += 1000;
  const ws3 = await join(id2, TOWN, PLACED);
  const N = room.playerState[id2];
  check('8. `takeoverlinger: false`: the takeover from before either (in town, no wait, no body_place)', room.sessions.has(ws3) && N !== I && N.z === 'town'
    && !ws3.sent.find((m) => m.type === 'body_place') && !ws3.sent.find((m) => m.type === 'linger_wait'));
  room._liveFlags = {};
}

Date.now = realNow;
Math.random = realRandom;
if (room.tickInterval) clearInterval(room.tickInterval);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
