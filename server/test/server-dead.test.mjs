/* "DEAD" IS THE SERVER'S WORD, NEVER THE PHONE'S -- v2.3.4373
 * (server/src/movement.js _serverDeadOff, docs/specs/server-dead.md).
 *
 * The owner (2026-11-10): "The server stops believing a phone that says
 * 'I'm dead', behind a kill switch."  Every move carried the phone's `dead`
 * straight into ps.dead, and the target gates ask ps.dead.  Against the real
 * GameRoom, through the real move handler:
 *
 *   1. a phone saying `dead: true` while the worker has it alive stays alive:
 *      on the monsters' list (a Wheel monster chases it), hit by a monster's
 *      cast, hit by a player's swing;
 *   2. TRAPS §233's corpse: a dying player whose move still says alive is not
 *      put back on the monsters' list;
 *   3. TRAPS §150's corpse gates still hold (a corpse picks up nothing, its
 *      swing lands nothing);
 *   4. an honest phone's death and respawn are unchanged, on protocol v2 and
 *      v1;
 *   5. the kill switch `serverdead: false` brings back the move's write
 *      (each of 1-2 again, the old way).
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
for (const [pid, pv] of [['bp_sd_v', 2], ['bp_sd_a', 2], ['bp_sd_o', 1]]) {
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid, protocolVersion: pv, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
}
clearInterval(room.tickInterval); room.tickInterval = null;
room.stateHistory = {};
const V = room.playerState.bp_sd_v;     /* the one who says "dead" */
const A = room.playerState.bp_sd_a;     /* a player who swings at them */
const O = room.playerState.bp_sd_o;     /* an honest protocol-v1 phone */
check('setup: three players joined (two on v2, one on v1)', !!V && !!A && !!O);

/* A Wheel monster off the safe ground, as spar.test §4 borrows one */
const wheel = room._ensureZoneMonsters('wheel');
const M = wheel.find((q) => q.home === 'ember');
for (const q of wheel) q._wanderPausedUntil = T + 1e9;
check('setup: a Wheel monster to borrow', !!M);
for (const ps of [V, A, O]) { ps.z = 'wheel'; ps.x = M.x + 3000; ps.y = M.y + 3000; ps._zoneEntryGraceUntil = 0; }

/* A move, as the phone sends it, standing where the worker has it.  `ba`
   changes on every move so the test can see the move was ACCEPTED (an
   accepted move writes ps.ba; a refused one writes nothing). */
let baSeq = 0;
async function move(pid, dead) {
  const ps = room.playerState[pid];
  const ba = (++baSeq % 6) * 0.5 + 0.1;
  T += 120;
  await room.webSocketMessage(WS[pid], JSON.stringify({ type: 'move', x: ps.x, y: ps.y, d: 'down', f: 'south', z: ps.z, vx: 0, vy: 0,
    dodging: false, blocking: false, ba, dead, ex: null }));
  return ps.ba === ba;
}
const calm = () => { M._bwUntil = 0; M._bwTarget = null; M._attackingUntil = 0; M.atkCd = 0; M.targetId = null; M._aggroOverrideTarget = null; M._aggroOverrideUntil = 0; };
/* Is V on the monsters' list?  V alone 100 px from the monster, the others far */
function chased() {
  const keep = [A.x, A.y, O.x, O.y];
  A.x = O.x = M.x + 3000; A.y = O.y = M.y + 3000;
  V.x = M.x + 100; V.y = M.y;
  calm(); room._tickMonsters();
  const got = M.targetId === 'bp_sd_v';
  [A.x, A.y, O.x, O.y] = keep;
  V.x = M.x + 3000; V.y = M.y + 3000;
  calm();
  return got;
}
const cast = () => room._telegraphHitPlayer('wheel', M, 'bp_sd_v', { kind: 'slam', radius: 100, dmgMult: 1 });
/* A's swing at V, a consented pair beside each other */
if (!room._pvpConsent) room._pvpConsent = new Map();
let swingN = 0;
function swing() {
  room._pvpConsent.set(room._pvpPairKey('bp_sd_a', 'bp_sd_v'), T + 3600000);
  A.x = V.x - 30; A.y = V.y; A.dead = A.dying = false;
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  T += 2000;
  room._resolvePvPAttack(room.sessions.get(WS.bp_sd_a), { kind: 'melee', x: A.x, y: A.y, angle: 0, range: 80, arc: 2.6, sw: ++swingN, dmgBase: 10, target: 'bp_sd_v' });
  const hit = room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload && e.payload.target === 'bp_sd_v');
  A.x = M.x + 3000; A.y = M.y + 3000;
  return hit;
}
const heal = () => { V.hp = V.maxHp = 100000; };

/* ── 1. a phone that says "dead" while the worker has it alive ── */
room._liveFlags = {};
heal();
{
  const ok = await move('bp_sd_v', true);
  check('1a. the move saying `dead: true` is accepted (it wrote the shield facing)', ok);
  check('1b. ...and the worker still has the player alive', V.dead === false && !V.dying, { dead: V.dead, dying: V.dying });
  check('1c. a Wheel monster 100 px off still chases them (on the monsters\' list)', chased(), M.targetId);
  const hp0 = V.hp, got = cast();
  check('1d. a monster\'s cast still hits them', got > 0 && V.hp < hp0, { got, hp0, hp: V.hp });
  check('1e. a player\'s swing still lands on them', swing(), room.eventBuffer.map((e) => e.type));
  check('1f. none of it was a death (the deep pool)', !V.dying && V.hp > 0);
}

/* ── 2. TRAPS §233: the corpse whose move still says alive ── */
room._liveFlags = {};
heal();
{
  V.inventory = { wood_oak: 3 };            /* so the death leaves a pile (§3) */
  V.hp = 0;
  room._handlePlayerDeath(V, 'bp_sd_v', 'test');
  check('2a. the worker\'s death: dying and dead', V.dying === true && V.dead === true);
  await move('bp_sd_v', false);
  check('2b. the death\'s own move saying `dead: false` changes nothing', V.dead === true && V.dying === true, { dead: V.dead });
  check('2c. ...so no monster puts the corpse back on its list', !chased(), M.targetId);

  /* ── 3. TRAPS §150: the corpse's own gates ── */
  const zone = 'wheel';
  const pile = (room.loot[zone] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-bp_sd_v'));
  check('3. (setup) the death left its pile', !!pile);
  if (pile) { V.x = pile.x; V.y = pile.y; }
  WS.bp_sd_v.sent.length = 0;
  if (pile) room._handleLootPickup(room.sessions.get(WS.bp_sd_v), { lootId: pile.lootId, zone });
  check('3a. a corpse on its own pile takes nothing, whatever its move said', sentOf(WS.bp_sd_v, 'loot_pickup_rejected').some((m) => m.payload && m.payload.reason === 'dead')
    && !(V.inventory && V.inventory.wood_oak), WS.bp_sd_v.sent.map((m) => m && m.type));
  /* the corpse swings at A: nothing lands */
  room._pvpConsent.set(room._pvpPairKey('bp_sd_a', 'bp_sd_v'), T + 3600000);
  A.x = V.x + 30; A.y = V.y;
  room._pvpHitLanes = new Map(); room.eventBuffer.length = 0; T += 2000;
  room._resolvePvPAttack(room.sessions.get(WS.bp_sd_v), { kind: 'melee', x: V.x, y: V.y, angle: 0, range: 80, arc: 2.6, sw: ++swingN, dmgBase: 10, target: 'bp_sd_a' });
  check('3b. a corpse\'s swing lands nothing', !room.eventBuffer.some((e) => e.type === 'pvp_hit'), room.eventBuffer.map((e) => e.type));
  A.x = M.x + 3000; A.y = M.y + 3000;

  /* the respawn: the worker's, five seconds on */
  T += 6000;
  room._tickPlayerRespawn();
  check('3c. the respawn clears both, in town, at full health', V.dead === false && V.dying === false && V.z === 'town' && V.hp === V.maxHp);
  /* the corpse's last move, late, still saying dead: alive all the same */
  await move('bp_sd_v', true);
  check('3d. a late `dead: true` after the respawn leaves them alive', V.dead === false);
}

/* ── 4. an honest phone's death and respawn, on v2 and on v1 ── */
for (const [pid, label] of [['bp_sd_a', 'v2'], ['bp_sd_o', 'v1']]) {
  const ps = room.playerState[pid];
  ps.z = 'wheel'; ps.x = M.x + 3000; ps.y = M.y - 3000;
  ps.dead = ps.dying = false; ps.maxHp = 100; ps.hp = 100;
  await move(pid, false);
  WS[pid].sent.length = 0;
  /* the worker's blow takes the last of it */
  room._applyDamage(ps, 100000, false, {});
  if (!ps.dying) room._tickPlayerRespawn();      /* the stuck-at-zero sweep, if the blow left it */
  check('4a. ' + label + ': a lethal blow is the worker\'s death', ps.dying === true && ps.dead === true && ps.hp === 0, { dying: ps.dying, dead: ps.dead, hp: ps.hp });
  check('4b. ' + label + ': the phone is told (player_died)', sentOf(WS[pid], 'player_died').length === 1, WS[pid].sent.map((m) => m && m.type));
  await move(pid, true);                         /* the honest phone's own "dead" */
  check('4c. ' + label + ': the phone\'s honest `dead: true` agrees', ps.dead === true && ps.dying === true);
  T += 6000;
  room._tickPlayerRespawn();
  check('4d. ' + label + ': the respawn stands them up in town, full', !ps.dead && !ps.dying && ps.z === 'town' && ps.hp === ps.maxHp);
  await move(pid, false);
  check('4e. ' + label + ': and the phone\'s `dead: false` after it agrees', !ps.dead && !ps.dying);
}

/* ── 5. the kill switch: `serverdead: false` brings back the move's write ── */
room._liveFlags = { serverdead: false };
V.z = 'wheel'; V.x = M.x + 3000; V.y = M.y + 3000; heal();
V.dead = V.dying = false;
{
  check('5a. `serverdead: false` reads off, and nothing set reads on',
    room._serverDeadOff() === true && (() => { const f = room._liveFlags; room._liveFlags = {}; const on = !room._serverDeadOff(); room._liveFlags = { serverdead: true }; const on2 = !room._serverDeadOff(); room._liveFlags = f; return on && on2; })());
  await move('bp_sd_v', true);
  check('5b. with it off the phone\'s `dead: true` is written again (today\'s behaviour)', V.dead === true && !V.dying);
  check('5c. ...and the monsters drop them, as before', !chased(), M.targetId);
  check('5d. ...and a player\'s swing finds nothing, as before', !swing());
  await move('bp_sd_v', false);
  check('5e. ...and `dead: false` writes it back', V.dead === false);
  V.hp = 0;
  room._handlePlayerDeath(V, 'bp_sd_v', 'test');
  await move('bp_sd_v', false);
  check('5f. ...and TRAPS §233\'s corpse is the phone\'s word again', V.dead === false && V.dying === true);
  T += 6000; room._tickPlayerRespawn();
}
room._liveFlags = {};

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
