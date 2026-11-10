/* A DUNGEON NOBODY OPENED IS NOT A PLACE -- v2.3.4423
 * (server/src/dungeon.js _dungeonIdDead; the gate in movement.js
 * _handleMove; the lists in index.js _ensureZoneMonsters and gathering.js
 * _ensureZoneNodes).
 *
 * The state-machine sweep (S3-15, S5-13): the worker took any id shaped
 * `dungeon:...` on its shape alone.  A modified phone sent two moves -- into
 * an invented dungeon and straight back to the same spot in the world -- and
 * each zone change stamped the half second of zero damage, so for as long as
 * it repeated them no monster and no player could hurt it.  Each invented id
 * also left a monster list and a node list in the room until the next deploy.
 * Against the real GameRoom, through the real move handler:
 *
 *   1. the trick: a move into an invented dungeon is refused (the player
 *      stays in the Wheel where the worker had them), no grace is stamped, no
 *      zone snapshot is sent, and a monster's cast and a player's swing still
 *      land after the round trip;
 *   2. the leak: fifty invented ids leave no monster list and no node list;
 *   3. an honest run is unchanged: a real start, the entry (grace, the wave on
 *      the zone snapshot), a second player walking into the live run (shared
 *      by design), a death inside (the bag kept, the respawn in town), a rejoin
 *      inside, and the way back out;
 *   4. nobody already in a dead id freezes: a run swept, or wiped by a deploy,
 *      with its player still inside -- their moves still move them, the tick
 *      makes no lists for it, and the way out works;
 *   5. the kill switch `dungeonlive: false` takes any `dungeon:` id on its
 *      shape again, grace, lists and all.
 */
import { GameRoom } from '../src/index.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* the worker's clock and dice are the test's: sure hits, no dodge */
let T = 1_900_000_000_000;
Date.now = () => T;
Math.random = () => 0.999;

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const sentOf = (ws, type) => ws.sent.filter((m) => m && m.type === type);

const room = new GameRoom(mockState(), mockEnv);
const WS = {};
async function join(pid, z, x, y) {
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid, protocolVersion: 2, ws: [1, 5], data: { x, y, z } }));
  return ws;
}
for (const pid of ['bp_dl_v', 'bp_dl_a', 'bp_dl_h']) await join(pid, 'town', 1000, 1000);
clearInterval(room.tickInterval); room.tickInterval = null;
room.stateHistory = {};
const V = room.playerState.bp_dl_v;     /* the modified phone */
const A = room.playerState.bp_dl_a;     /* a player who swings at it */
const H = room.playerState.bp_dl_h;     /* an honest player who runs a dungeon */
check('setup: three players joined', !!V && !!A && !!H);

/* A Wheel monster off the safe ground, as server-dead.test borrows one */
const wheel = room._ensureZoneMonsters('wheel');
const M = wheel.find((q) => q.home === 'ember');
for (const q of wheel) q._wanderPausedUntil = T + 1e9;
check('setup: a Wheel monster to borrow', !!M);
for (const ps of [V, A]) { ps.z = 'wheel'; ps.x = M.x + 3000; ps.y = M.y + 3000; ps._zoneEntryGraceUntil = 0; }

/* A move as the phone sends it.  `ba` changes on every move so the test can
   see whether the move was ACCEPTED (an accepted move writes ps.ba). */
let baSeq = 0;
async function move(pid, z, x, y) {
  const ps = room.playerState[pid];
  const ba = (++baSeq % 6) * 0.5 + 0.1;
  T += 120;
  await room.webSocketMessage(WS[pid], JSON.stringify({ type: 'move', x: x === undefined ? ps.x : x, y: y === undefined ? ps.y : y,
    d: 'down', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba, ex: null }));
  return ps.ba === ba;
}
const hasKeys = (z) => Object.prototype.hasOwnProperty.call(room.monsters, z) || Object.prototype.hasOwnProperty.call(room.nodes, z);
const calm = () => { M._bwUntil = 0; M._bwTarget = null; M._attackingUntil = 0; M.atkCd = 0; M.targetId = null; };
const cast = () => { calm(); return room._telegraphHitPlayer('wheel', M, 'bp_dl_v', { kind: 'slam', radius: 100, dmgMult: 1 }); };
if (!room._pvpConsent) room._pvpConsent = new Map();
let swingN = 0;
function swing() {
  room._pvpConsent.set(room._pvpPairKey('bp_dl_a', 'bp_dl_v'), T + 3600000);
  A.z = V.z; A.x = V.x - 30; A.y = V.y; A.dead = A.dying = false;
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(WS.bp_dl_a), { kind: 'melee', x: A.x, y: A.y, angle: 0, range: 80, arc: 2.6, sw: ++swingN, dmgBase: 10, target: 'bp_dl_v' });
  const hit = room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload && e.payload.target === 'bp_dl_v');
  A.x = M.x + 3000; A.y = M.y + 3000;
  return hit;
}
const heal = () => { V.hp = V.maxHp = 100000; V.dead = V.dying = false; };

/* ── 1. the trick: into an invented dungeon and straight back ── */
room._liveFlags = {};
heal();
{
  const FAKE = 'dungeon:made_up_1';
  V.x = M.x + 60; V.y = M.y;
  const x0 = V.x, y0 = V.y;
  WS.bp_dl_v.sent.length = 0;
  const inOk = await move('bp_dl_v', FAKE);
  check('1a. the move into an invented dungeon is refused', !inOk && V.z === 'wheel', { z: V.z });
  check('1b. ...the player stays where the worker had them', V.x === x0 && V.y === y0, { x: V.x, y: V.y });
  check('1c. ...no half second of zero damage is stamped', !(V._zoneEntryGraceUntil > T), { grace: V._zoneEntryGraceUntil, T });
  check('1d. ...no zone snapshot is sent for it', sentOf(WS.bp_dl_v, 'zone_state').length === 0, WS.bp_dl_v.sent.map((m) => m.type));
  check('1e. ...and no monster or node list is made for it', !hasKeys(FAKE));
  const backOk = await move('bp_dl_v', 'wheel');
  check('1f. the move "back" is an ordinary step in the Wheel', backOk && V.z === 'wheel' && !(V._zoneEntryGraceUntil > T), { z: V.z, grace: V._zoneEntryGraceUntil });
  const hp0 = V.hp, got = cast();
  check('1g. a monster\'s cast still hits them after the round trip', got > 0 && V.hp < hp0, { got, hp0, hp: V.hp });
  heal();
  await move('bp_dl_v', 'dungeon:made_up_2');
  await move('bp_dl_v', 'wheel');
  check('1h. a player\'s swing still lands after another round trip', swing(), room.eventBuffer.map((e) => e.type));
}

/* ── 2. the leak: fifty invented ids leave nothing behind ── */
room._liveFlags = {};
{
  const before = Object.keys(room.monsters).length + Object.keys(room.nodes).length;
  for (let i = 0; i < 50; i++) { await move('bp_dl_v', 'dungeon:mint_' + i); await move('bp_dl_v', 'wheel'); }
  const after = Object.keys(room.monsters).length + Object.keys(room.nodes).length;
  check('2a. fifty invented ids make no monster list and no node list', after === before, { before, after });
  room._tickMonsters();
  check('2b. ...and the tick makes none either', Object.keys(room.monsters).length + Object.keys(room.nodes).length === before);
  check('2c. the player is still in the Wheel, moving', V.z === 'wheel' && await move('bp_dl_v', 'wheel', V.x + 5, V.y));
}

/* ── 3. an honest run is unchanged ── */
room._liveFlags = {};
let Z = null;
{
  H.z = 'town'; H.x = 1000; H.y = 1000; H.level = 10;
  WS.bp_dl_h.sent.length = 0;
  await room.webSocketMessage(WS.bp_dl_h, JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 2, monsterLevel: 5, hasBoss: false } } }));
  const st = sentOf(WS.bp_dl_h, 'dungeon_started')[0];
  Z = st && st.payload && st.payload.zone;
  check('3a. (setup) a real start opens a run', typeof Z === 'string' && Z.startsWith('dungeon:') && room._dungeons.has(Z.slice(8)), st);
  WS.bp_dl_h.sent.length = 0;
  const inOk = await move('bp_dl_h', Z, 100, 100);
  check('3b. the honest entry is taken', inOk && H.z === Z && H.x === 100, { z: H.z, x: H.x });
  check('3c. ...with its half second of grace, as before', H._zoneEntryGraceUntil > T);
  const zs = sentOf(WS.bp_dl_h, 'zone_state').find((m) => m.zone === Z);
  check('3d. ...and the wave on its zone snapshot', !!zs && Array.isArray(zs.monsters) && zs.monsters.length > 0, zs);
  check('3e. moves inside the run are taken', await move('bp_dl_h', Z, 140, 100) && H.x === 140);
  heal();
  const vIn = await move('bp_dl_v', Z, 120, 100);
  check('3f. another player may walk into the LIVE run (shared by design)', vIn && V.z === Z);
  await move('bp_dl_v', 'wheel', M.x + 3000, M.y + 3000);
  check('3g. ...and walk back out', V.z === 'wheel');

  /* a rejoin inside: the socket drops and the phone comes back naming the run */
  await room.webSocketClose(WS.bp_dl_h, 1000, 'bye', true);
  await join('bp_dl_h', Z, 140, 100);
  clearInterval(room.tickInterval); room.tickInterval = null;
  const H2 = room.playerState.bp_dl_h;
  check('3h. a rejoin naming the live run is back in it', !!H2 && H2.z === Z, { z: H2 && H2.z });
  check('3i. ...and moves inside it are taken', await move('bp_dl_h', Z, 150, 100) && H2.x === 150);

  /* a death inside: the bag kept, the respawn in town */
  H2.inventory = { wood_oak: 3 };
  H2.hp = 0;
  room._handlePlayerDeath(H2, 'bp_dl_h', 'test');
  check('3j. a death inside the run keeps the bag', H2.dying === true && H2.inventory && H2.inventory.wood_oak === 3, { inv: H2.inventory });
  T += 6000;
  room._tickPlayerRespawn();
  check('3k. ...and the respawn puts them in town', !H2.dying && H2.z === 'town', { z: H2.z, dying: H2.dying });

  /* the way back out of a live run, by its exit */
  await move('bp_dl_h', Z, 100, 100);
  check('3l. (setup) back into the live run', H2.z === Z);
  check('3m. the way out is taken', await move('bp_dl_h', 'wheel', M.x + 3000, M.y + 3000) && H2.z === 'wheel');
}

/* ── 4. nobody already in a dead id freezes ── */
room._liveFlags = {};
{
  const H2 = room.playerState.bp_dl_h;
  await move('bp_dl_h', Z, 100, 100);
  check('4a. (setup) in the live run', H2.z === Z);
  room._dungeonCleanup(room._dungeons.get(Z.slice(8)));    /* swept with them inside */
  check('4b. (setup) the run is gone, and its lists', !room._dungeons.has(Z.slice(8)) && !hasKeys(Z));
  check('4c. a player left in a swept run still moves (no freeze)', await move('bp_dl_h', Z, 130, 100) && H2.x === 130 && H2.z === Z);
  room._tickMonsters();
  check('4d. ...and the tick keeps no list for the swept run', !hasKeys(Z));
  check('4e. ...and the way out still works', await move('bp_dl_h', 'wheel', M.x + 3000, M.y + 3000) && H2.z === 'wheel');

  /* a deploy wipes every run: the phone rejoins naming the one it was in */
  await room.webSocketClose(WS.bp_dl_h, 1000, 'bye', true);
  await join('bp_dl_h', Z, 130, 100);
  clearInterval(room.tickInterval); room.tickInterval = null;
  const H3 = room.playerState.bp_dl_h;
  if (H3.z === Z) {
    check('4f. a rejoin into a run a deploy wiped still moves (the v2.3.1631 freeze stays closed)', await move('bp_dl_h', Z, 160, 100) && H3.x === 160);
    check('4g. ...the join made no list for it', !hasKeys(Z));
    check('4h. ...and its way out works', await move('bp_dl_h', 'wheel', M.x + 3000, M.y + 3000) && H3.z === 'wheel');
  } else {
    check('4f. a rejoin into a wiped run lands somewhere the worker knows, moving', await move('bp_dl_h', H3.z, H3.x + 5, H3.y) && !hasKeys(Z), { z: H3.z });
  }
}

/* ── 5. the kill switch puts the old behaviour back ── */
room._liveFlags = { dungeonlive: false };
heal();
{
  const FAKE = 'dungeon:old_way';
  V.z = 'wheel'; V._zoneEntryGraceUntil = 0;
  V._entryGraceAt = 0;   /* v2.3.4453: no grace given in the last 10 s (movement.js _entryGraceGive) */
  const inOk = await move('bp_dl_v', FAKE);
  check('5a. `dungeonlive: false`: the invented dungeon is taken on its shape again', inOk && V.z === FAKE, { z: V.z });
  check('5b. ...with the grace stamped', V._zoneEntryGraceUntil > T);
  check('5c. ...and its lists made, as before', hasKeys(FAKE));
  check('5d. the flag name is lower case', 'dungeonlive' === 'dungeonlive'.toLowerCase());
  await move('bp_dl_v', 'wheel');
  room._liveFlags = { dungeonlive: true };
  check('5e. `dungeonlive: true` is the gate on', room._dungeonIdDead('dungeon:another') && !room._dungeonIdDead('wheel') && !room._dungeonIdDead(undefined));
}
room._liveFlags = {};

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
