/* TWO WAYS A MODIFIED PHONE DODGED A FIGHT -- v2.3.4454
 * (server/src/movement.js _entryGraceGive; linger.js; docs/specs/pvp-fights.md
 * "The zone-entry half second").
 *
 * The 2026-11-03 state-machine sweep (V1 S3-15, V3 S1-4).  Against the real
 * GameRoom, through the real move handler:
 *
 *   1. an honest single entry into a combat zone keeps its half second of no
 *      damage, exactly as before;
 *   2. THE HOP: a phone hopping between two REAL places (the Wheel and town)
 *      is hurt on the second entry -- a monster's hit and a player's swing land;
 *   3. an entry 10 s after the last grace has it again;
 *   4. no grace while the player is in a fight with another player;
 *   5. the kill switch `entrygrace: false` gives it on every entry again;
 *   6. "I'M DEAD" (already closed by v2.3.4373 `serverdead`, pinned here): a
 *      phone saying `dead: true` mid-fight and closing leaves its body, which
 *      can be killed and drops the bag as today; a player who really died
 *      leaves at once, as today; `serverdead: false` is the old trust.
 */
import { GameRoom } from '../src/index.js';
import { ENTRY_GRACE_GAP_MS } from '../src/movement.js';
import { PVP_HEAL } from '../src/data.js';
import { flagNameOk } from '../src/liveops.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

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
const settle = () => new Promise((r) => setTimeout(r, 5));

const room = new GameRoom(mockState(), mockEnv);
const WS = {};
async function join(pid, z, x, y) {
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid, protocolVersion: 2, ws: [1, 5], data: { x, y, z } }));
  return ws;
}
for (const pid of ['bp_fd_v', 'bp_fd_a', 'bp_fd_k', 'bp_fd_l']) await join(pid, 'town', 1000, 1000);
clearInterval(room.tickInterval); room.tickInterval = null;
room.stateHistory = {};
const V = room.playerState.bp_fd_v;     /* the modified phone */
const A = room.playerState.bp_fd_a;     /* a player who swings at it */
check('setup: the players joined', !!V && !!A && !!room.playerState.bp_fd_k && !!room.playerState.bp_fd_l);

/* A Wheel monster off the safe ground, as dungeon-live.test borrows one */
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const M = wheel.find((q) => q.home === 'ember');
for (const q of wheel) q._wanderPausedUntil = T + 1e9;
check('setup: a Wheel monster to borrow', !!M);
const HX = M.x + 60, HY = M.y;          /* where V hops from, beside it */

/* A move as the phone sends it.  `ba` changes on every move so the test can
   see whether the move was ACCEPTED (an accepted move writes ps.ba). */
let baSeq = 0;
async function move(pid, z, x, y, extra) {
  const ps = room.playerState[pid];
  const ba = (++baSeq % 6) * 0.5 + 0.1;
  T += 120;
  await room.webSocketMessage(WS[pid], JSON.stringify(Object.assign({ type: 'move', x: x === undefined ? ps.x : x, y: y === undefined ? ps.y : y,
    d: 'down', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba, ex: null }, extra || {})));
  return ps.ba === ba;
}
const graced = () => V._zoneEntryGraceUntil > T;
const calm = () => { M._bwUntil = 0; M._bwTarget = null; M._attackingUntil = 0; M.atkCd = 0; M.targetId = null; };
const cast = () => { calm(); return room._telegraphHitPlayer(WHEEL_ZONE, M, 'bp_fd_v', { kind: 'slam', radius: 100, dmgMult: 1 }); };
if (!room._pvpConsent) room._pvpConsent = new Map();
let swingN = 0;
function swing() {
  room._pvpConsent.set(room._pvpPairKey('bp_fd_a', 'bp_fd_v'), T + 3600000);
  A.z = V.z; A.x = V.x - 30; A.y = V.y; A.dead = A.dying = false;
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  const hp0 = V.hp;
  room._resolvePvPAttack(room.sessions.get(WS.bp_fd_a), { kind: 'melee', x: A.x, y: A.y, angle: 0, range: 80, arc: 2.6, sw: ++swingN, dmgBase: 10, target: 'bp_fd_v' });
  const hit = room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload && e.payload.target === 'bp_fd_v');
  A.x = M.x + 3000; A.y = M.y + 3000;
  return hit && V.hp < hp0;
}
const heal = () => { V.hp = V.maxHp = 100000; V.dead = V.dying = false; };
const freshClock = () => { T += Math.max(ENTRY_GRACE_GAP_MS, PVP_HEAL.WINDOW_MS) + 1000; };
/* out to town, then into the Wheel beside the monster.
   v2.3.4565: a move out of the Wheel off its safe ground is refused now
   (zonejudge.js; 2a0 below), so the way out here is the worker's own placing
   in today's town -- as a respawn puts you there -- and what this suite
   judges, the way back IN, is still a real move (the 120 ms the way out's
   message took kept, so a hop is as long as before: 2e counts by it) */
async function hop() { T += 120; V.z = 'town'; V.x = 1000; V.y = 1000; const back = await move('bp_fd_v', WHEEL_ZONE, HX, HY); return back && V.z === WHEEL_ZONE; }

room._liveFlags = {};
heal();

/* ── 1. an honest single entry keeps its half second ── */
{
  check('1a. (guard) V starts in town', V.z === 'town');
  const ok = await move('bp_fd_v', WHEEL_ZONE, HX, HY);
  check('1b. the move into the Wheel is taken', ok && V.z === WHEEL_ZONE, { z: V.z });
  check('1c. ...with its half second of no damage, as before', graced(), { grace: V._zoneEntryGraceUntil - T });
  const hp0 = V.hp, got = cast();
  check('1d. ...a monster\'s cast inside it does nothing', !(got > 0) && V.hp === hp0, { got, hp: V.hp, hp0 });
}

/* ── 2. the hop: out and straight back in is hurt ── */
{
  T += 600;                                      /* the first grace is over */
  heal();
  /* v2.3.4565: the hop's way out, beside the monster, is refused before any
     grace is asked (zonejudge.js) */
  check('2a0. the hop\'s own way out, off the safe ground, is refused now (zonejudge)', !(await move('bp_fd_v', 'town', 1000, 1000)) && V.z === WHEEL_ZONE);
  check('2a. the hop out to town and back is taken (nobody is held)', await hop());
  check('2b. ...no second half second is given', !graced(), { grace: V._zoneEntryGraceUntil - T });
  const hp0 = V.hp, got = cast();
  check('2c. ...a monster\'s cast lands on the second entry', got > 0 && V.hp < hp0, { got, hp: V.hp, hp0 });
  heal();
  await hop();
  check('2d. ...and a player\'s swing lands after the next hop', swing(), room.eventBuffer.map((e) => e.type));
  /* a hundred hops (24 s of them): the grace once in 10 s at most, where
     before it was every one */
  const t0 = T;
  let shielded = 0;
  for (let i = 0; i < 100; i++) { await hop(); if (graced()) shielded++; }
  /* a grace is half a second: it can cover the hop it was given on and the
     next (240 ms on), never more */
  const most = 2 * Math.ceil((T - t0) / ENTRY_GRACE_GAP_MS);
  check('2e. a hundred hops in a row: shielded only once in 10 s (was all 100)', shielded <= most, { shielded, most, s: (T - t0) / 1000 });
}

/* ── 3. an entry 10 s after the last grace has it again ── */
{
  /* the gap counts from the last grace GIVEN, which was 1b's */
  freshClock();
  heal();
  await hop();
  check('3a. an honest entry 10 s on has its half second again', graced(), { grace: V._zoneEntryGraceUntil - T });
  T += 600;
  await hop();
  check('3b. ...and the hop right after it has none', !graced());
}

/* ── 4. no grace mid-fight ── */
{
  freshClock();
  heal();
  check('4a. (guard) a swing starts a fight between players', swing() && room._lingerFightRecent('bp_fd_v', T));
  await hop();
  check('4b. an entry while in a fight with a player has no half second', !graced(), { grace: V._zoneEntryGraceUntil - T });
  check('4c. ...the other player\'s swing lands at once', swing());
  /* the fight over (10 s), the grace is back */
  freshClock();
  await hop();
  check('4d. once the fight is over, an entry has it again', graced());
}

/* ── 5. the kill switch: `entrygrace: false` is every entry graced again ── */
{
  room._liveFlags = { entrygrace: false };
  check('5a. `entrygrace: false` reads off, and nothing set reads on', room._entryGraceOff() === true
    && (() => { room._liveFlags = {}; const on = room._entryGraceOff(); room._liveFlags = { entrygrace: false }; return on === false; })());
  check('5a2. ...a lower-case name POST /flags takes', flagNameOk('entrygrace') && 'entrygrace' === 'entrygrace'.toLowerCase());
  freshClock();
  await hop();
  T += 600;
  await hop();
  check('5b. with it thrown, the hop has its half second again (the old way)', graced());
  heal();
  swing();
  await hop();
  check('5c. ...and so does an entry mid-fight', graced());
  room._liveFlags = {};
  T += 600;
  await hop();
  check('5d. the switch put back: the hop has none', !graced());
}

/* ── 5e. v2.3.4455's body taken over (bodytake.js) gets no grace: its phone's
   answering move is no change of zone, and a move elsewhere is dropped ── */
{
  room._liveFlags = {};
  freshClock();
  heal();
  await move('bp_fd_v', WHEEL_ZONE, HX, HY);
  V._zoneEntryGraceUntil = 0; V._entryGraceAt = 0;
  room._bodyTakeStart('bp_fd_v', T);
  check('5e. (guard) the body waits for its phone', !!V._bodyWait);
  await move('bp_fd_v', 'town', 1000, 1000);
  check('5f. ...a move into another place while it waits is dropped, with no grace', V.z === WHEEL_ZONE && !graced() && !!V._bodyWait);
  const ok = await move('bp_fd_v', WHEEL_ZONE, HX + 10, HY);
  check('5g. ...the answering move at the body is taken, and stamps no grace', ok && !V._bodyWait && !graced(), { wait: V._bodyWait, grace: V._zoneEntryGraceUntil - T });
}

/* ── 6. "I'm dead": the body stays (closed by v2.3.4373, pinned here) ── */
const NML_X = WHEEL_CENTRE[0] + 9000, NML_Y = WHEEL_CENTRE[1];   /* No man's land, a few rings out */
const K = room.playerState.bp_fd_k, L = room.playerState.bp_fd_l;
function putNml(ps, dx) {
  ps.z = WHEEL_ZONE; ps.x = NML_X + dx; ps.y = NML_Y; ps.dead = false; ps.dying = false;
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp = 200; ps.lastMoveAt = T;
}
async function kill(byPs, byId, target) {
  room.playerState[target].hp = 1;
  room._pvpHitLanes = new Map();
  room._resolvePvPAttack(room.sessions.get(WS[byId]), { kind: 'melee', range: 200, arc: 3, angle: 0, target, sw: ++swingN });
  await settle();
}
{
  freshClock();
  putNml(K, 0); putNml(L, 40);
  check('6a. (guard) K may hit L under No man\'s land\'s rule', room._nmlAllowed('bp_fd_k', 'bp_fd_l'));
  room._notePvpExchange('bp_fd_k', 'bp_fd_l', T);
  L.inventory = { fish_minnow: 5, ore_iron: 3 };
  /* the phone says it is dead, then closes */
  const ok = await move('bp_fd_l', WHEEL_ZONE, L.x, L.y, { dead: true });
  check('6b. the move saying `dead: true` is taken, and the worker keeps it alive', ok && L.dead === false && !L.dying, { dead: L.dead });
  await room.webSocketClose(WS.bp_fd_l);
  check('6c. ...its close leaves the body in the fight', !!room.playerState.bp_fd_l && room.playerState.bp_fd_l.lingering === true);
  await kill(K, 'bp_fd_k', 'bp_fd_l');
  check('6d. ...the body can be killed', L.dying === true, { hp: L.hp, dying: L.dying });
  const pile = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-bp_fd_l'));
  check('6e. ...and drops the bag to the killer, as today', !!pile && pile.recipients[0] === 'bp_fd_k'
    && pile.deathItems.some((i) => i.key === 'fish_minnow' && i.qty === 5), pile && { r: pile.recipients, items: pile.deathItems });
  T += 5001;
  room._tickPlayerRespawn();
  room._lingerSweep(T);
  await settle();
}
{
  /* a player who really died leaves at once, as today */
  freshClock();
  await join('bp_fd_l', 'town', 1000, 1000);
  const L2 = room.playerState.bp_fd_l;
  putNml(K, 0); putNml(L2, 40);
  room._notePvpExchange('bp_fd_k', 'bp_fd_l', T);
  await kill(K, 'bp_fd_k', 'bp_fd_l');
  check('6f. (guard) L really died', L2.dying === true);
  await room.webSocketClose(WS.bp_fd_l);
  check('6g. a player who really died leaves at once, as today (no body)', !room.playerState.bp_fd_l || !room.playerState.bp_fd_l.lingering);
}
{
  /* `serverdead: false` (v2.3.4373's switch): the phone's word again */
  freshClock();
  await join('bp_fd_l', 'town', 1000, 1000);
  const L3 = room.playerState.bp_fd_l;
  putNml(K, 0); putNml(L3, 40);
  room._notePvpExchange('bp_fd_k', 'bp_fd_l', T);
  room._liveFlags = { serverdead: false };
  await move('bp_fd_l', WHEEL_ZONE, L3.x, L3.y, { dead: true });
  check('6h. with `serverdead: false` the phone\'s `dead` is believed again (the old way)', L3.dead === true);
  await room.webSocketClose(WS.bp_fd_l);
  check('6i. ...and its close leaves no body, as before v2.3.4373', !room.playerState.bp_fd_l || !room.playerState.bp_fd_l.lingering);
  room._liveFlags = {};
}

console.log(`\nfight-dodges: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
