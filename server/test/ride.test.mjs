/* The skateboard -- v2.3.3776 (server/src/ride.js; spec docs/specs/skateboard.md).
 *
 * The owner, 2026-10-28: "I want to be able to ride around on this just in the
 * safe Brotown area.  You can tap it to ride ... When outside of town it makes
 * you get off."  OWNER-LIST item 26: "faster than sprinting, off when you
 * fight, swim or get hit".
 *
 *   1. CAPS: state_sync advertises caps.ride; `ride: false` un-advertises it;
 *      `ride_state` is privileged.
 *   2. GETTING ON: on the safe ground in the Wheel, answered `ride_state`
 *      {on: true}; refused off it, outside the Wheel, dead, with the switch
 *      off, and a toggle too soon after the last.
 *   3. THE BOUND: a step at riding pace is refused on foot and taken on the
 *      board -- by RIDE.MULT and no more; the walking bound again after.
 *   4. WHAT ENDS IT: a move past the safe ground's edge (ride_state 'edge'),
 *      a zone change, death, a hit that lands, a swing, the shield, a duel,
 *      and the kill switch mid-ride.
 *   5. THE OTHERS: `brd: 1` on the tick's player while riding, absent on foot
 *      and after the kill switch.
 *   6. THE CLIENT'S RULES (src/game/ride.js): the mirror, and the speed.
 *   7. (v2.3.5440, card SK) THE PUSH START AND THE ROLL-OFF (src/game/ride.js
 *      rideFeel): the owner, "letting go of skateboard button makes it roll
 *      for a while down to a slow stop.  Also let the skateboard take a push
 *      or two before reaching max speed when starting from a stop".  Top
 *      within two pushes; let go, a roll from top to a stop in the chosen
 *      time, slowest at the end; stopped at once on a step-off, a hold, a
 *      wall; held again mid-roll, on from its speed with no new start; the
 *      pose's pushes are the model's; `?ridecoast=0` gives the old start and
 *      stop.  Client rules only: the worker is unchanged (a slower start and a
 *      roll are inside the bound §3 holds).
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { RIDE, RIDE_ENDS_ON } from '../src/ride.js';
import { SPRINT } from '../src/sprint.js';
import * as C from '../../src/game/ride.js';
import * as D from '../../src/game/moveDiet.js';   /* v2.3.5440: §7j, the moves a rolling board sends */
import { findIn } from '../../tools/guards/lib/filesOf.mjs';   /* §7j: the batcher's line, found by system (tests-by-system) */
/* v2.3.4923: off retired-lands.test's FIXTURES list: "outside the Wheel" and
   "a zone change" are the farm now, never a retired old land. */

const ticksRun = async (room, n, ms) => {
  const from = room.tickSeq || 0, t0 = realNow();
  await new Promise((r) => setTimeout(r, ms));
  while ((room.tickSeq || 0) - from < n && realNow() - t0 < ms + 5000) await new Promise((r) => setTimeout(r, 5));
};

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const realNow = Date.now;
let T = realNow();
Date.now = () => T;
const wait = (ms) => { T += ms; };

const room = new GameRoom(mockState, mockEnv);
const W = room._wheelT();
const [CX, CY] = W.WHEEL_CENTRE;
const SAFE_R = W.WHEEL_SAFE_R;

const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'r1', name: 'Rider', protocolVersion: 2, data: { x: CX, y: CY, z: 'wheel' } }));
const ps = room.playerState.r1;
const send = async (o) => room.webSocketMessage(ws, JSON.stringify(o));
const move = async (x, y, extra) => send(Object.assign({ type: 'move', x, y, z: ps.z || 'wheel' }, extra || {}));
const ride = async (on) => { wait(RIDE.TOGGLE_MS + 1); await send({ type: 'ride', payload: { on: on ? 1 : 0 } }); };
const lastRide = () => { const m = ws.sent.filter((q) => q.type === 'ride_state'); return m.length ? m[m.length - 1].payload : null; };
const rideMsgs = () => ws.sent.filter((q) => q.type === 'ride_state').length;

/* a fresh start in the town, on foot, an empty move budget (sprint.test's way) */
async function fresh(x, y) {
  ps.z = 'wheel';
  ps.x = x == null ? CX : x; ps.y = y == null ? CY : y;
  ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.blocking = false; ps.dodging = false; ps.ex = null; ps.po = null; ps._race = null;
  ps._ride = false; ps._ridePid = undefined; ps._rideAt = 0;
  ps.stamina = 100; ps.maxStamina = 100;
  ps._sprintAt = 0; ps._sprintLastPaid = false; ps._sprintPrevPaid = false;
  ps._godUntil = 0; ps._zoneEntryGraceUntil = 0;
  room._liveFlags = {};
  ps.lastMoveAt = T;
  ps._mvBudget = 0; ps._mvBudgetAt = T; ps._mvFollow = undefined; ps._mp = undefined;
}
async function step(dx, gapMs, extra) {
  wait(gapMs);
  const want = ps.x + dx;
  await move(ps.x + dx, ps.y, extra);
  return Math.abs(ps.x - want) < 1e-6;
}

// ── 1. CAPS ───────────────────────────────────────────────────────────────
{
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('1. caps: state_sync advertises caps.ride', !!(sync && sync.caps && sync.caps.ride === true), sync && sync.caps && sync.caps.ride);
  const ws2 = fakeWs('q');
  room._liveFlags = { ride: false };
  room.sessions.set(ws2, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'r2', name: 'Walker', protocolVersion: 2, data: { x: CX + 50, y: CY, z: 'wheel' } }));
  const sync2 = ws2.sent.find((m) => m.type === 'state_sync');
  check('1. caps: `ride: false` in liveflags un-advertises it', !!(sync2 && sync2.caps && sync2.caps.ride === false), sync2 && sync2.caps && sync2.caps.ride);
  room._liveFlags = {};
  check('1. ride_state is privileged (a client cannot forge it to another)', PRIVILEGED_EVENTS.has('ride_state'));
  check('1. a rider faster than a sprint (the owner\'s list: "faster than sprinting")', RIDE.MULT > SPRINT.MULT, RIDE.MULT);
}

// ── 2. GETTING ON ─────────────────────────────────────────────────────────
{
  await fresh();
  await ride(true);
  check('2. on the safe ground in the Wheel: on the board, and told so', ps._ride === true && lastRide() && lastRide().on === true, lastRide());
  await ride(false);
  check('2. ...and a tap again gets off', ps._ride === false && lastRide() && lastRide().on === false && lastRide().why === 'asked', lastRide());

  await fresh(CX + SAFE_R + 200, CY);
  await ride(true);
  check('2. off the safe ground: refused (`where`)', ps._ride === false && lastRide().on === false && lastRide().why === 'where', lastRide());

  await fresh();
  ps.z = 'farm_home';
  await ride(true);
  check('2. outside the Wheel: refused (`where`)', ps._ride === false && lastRide().why === 'where', lastRide());

  await fresh();
  ps.dead = true;
  await ride(true);
  check('2. dead: refused', ps._ride === false && lastRide().on === false, lastRide());

  await fresh();
  room._liveFlags = { ride: false };
  await ride(true);
  check('2. the switch off: refused (`off`)', ps._ride === false && lastRide().why === 'off', lastRide());
  room._liveFlags = {};

  await fresh();
  ps.ex = 'chop';
  await ride(true);
  check('2. mid-harvest: refused (`busy`)', ps._ride === false && lastRide().why === 'busy', lastRide());

  await fresh();
  await ride(true);
  await send({ type: 'ride', payload: { on: 0 } });   /* no wait */
  check('2. a toggle too soon after the last changes nothing (`soon`)', ps._ride === true && lastRide().why === 'soon', lastRide());
}

// ── 3. THE BOUND ──────────────────────────────────────────────────────────
/* 200 ms from an empty budget: walking 500 px/s -> 100 px; riding x2 -> 200 */
{
  await fresh();
  check('3. on foot, a 190 px step in 200 ms is not taken whole', (await step(190, 200)) === false, { x: ps.x });
  await fresh();
  await ride(true);
  ps.lastMoveAt = T; ps._mvBudget = 0; ps._mvBudgetAt = T;
  check('3. on the board the same step is taken', (await step(190, 200)) === true, { x: ps.x, ride: ps._ride });
  ps._mvBudget = 0; ps._mvBudgetAt = T;
  check('3. ...but by RIDE.MULT and no more (a 215 px step is not)', (await step(215, 200)) === false, { x: ps.x });
  check('3. the owner\'s "about twice as fast as run speed"', RIDE.MULT === 2);
  await ride(false);
  ps._mvBudget = 0; ps._mvBudgetAt = T;
  check('3. off the board the walking bound is back', (await step(190, 200)) === false, { x: ps.x });
  /* no sprint on the board: a marked move is not a sprint step, and the
     bound is the board's alone, never the board's times the sprint's */
  await fresh();
  await ride(true);
  ps.lastMoveAt = T; ps._mvBudget = 0; ps._mvBudgetAt = T;
  check('3. on the board a sprint-marked move is no sprint (no stacking: 215 px still refused)', (await step(215, 200, { sp: 1 })) === false && !ps._sprintAt, { x: ps.x, spr: ps._sprintAt });
  check('3. every bound reads the ride through _moveSpeedK (the glide and the join\'s judge too)', room._moveSpeedK(ps).moveMult === RIDE.MULT);
  await ride(false);
  check('3. ...and 1 off the board', room._moveSpeedK(ps).moveMult === 1);
}

// ── 4. WHAT ENDS IT ───────────────────────────────────────────────────────
{
  /* the edge: ride out past the safe ground's circle */
  await fresh(CX + SAFE_R - 40, CY);
  await ride(true);
  ps.lastMoveAt = T; ps._mvBudget = 0; ps._mvBudgetAt = T;
  const n0 = rideMsgs();
  await step(100, 200);
  check('4. a move past the safe ground\'s edge: off the board, told `edge`', ps._ride === false && rideMsgs() === n0 + 1 && lastRide().why === 'edge', { ride: ps._ride, last: lastRide(), x: ps.x });

  /* lane D's probe (a): the move that leaves town is judged at the WALK --
     a rider with a full board budget sends one move 50,000 px out */
  await fresh(CX + SAFE_R - 40, CY);
  await ride(true);
  ps._mvBudget = 500 * RIDE.MULT * 3 + 80; ps._mvBudgetAt = T; ps.lastMoveAt = T;   /* a full board's budget */
  const x0 = ps.x;
  wait(50);
  await move(ps.x + 50000, ps.y);
  const went = ps.x - x0;
  check(`4. (D a) a rider's one move out of town goes at most the walk's burst (${Math.round(went)} px <= ${500 * 3 + 80 + 25})`, ps._ride === false && went <= 500 * 3 + 80 + 25, { went, ride: ps._ride, last: lastRide() });

  /* lane D's probe (b): a follow begun on the board goes on at the walk
     once the ride ends (a hit, here) */
  await fresh();
  ps.hp = 500; ps.maxHp = 500;
  await ride(true);
  ps._mvBudget = 0; ps._mvBudgetAt = T; ps.lastMoveAt = T;
  wait(50);
  await move(ps.x + 2500, ps.y);   /* far, inside the safe ground: followed */
  const followed = !!ps._mvFollow;
  room._applyDamage(ps, 10, false, {});
  const fx0 = ps.x;
  for (let i = 0; i < 10; i++) { wait(100); room._tickMoveFollow(T); }
  const fwent = ps.x - fx0;
  check(`4. (D b) a follow made on the board goes on at the walk after the ride ends (${Math.round(fwent)} px in 1 s <= 500)`, followed && ps._ride === false && fwent <= 500 + 1, { followed, fwent, ride: ps._ride });

  /* a zone change */
  await fresh();
  await ride(true);
  wait(200);
  await move(1000, 1000, { z: 'farm_home' });
  check('4. a zone change: off the board', ps._ride === false && lastRide().on === false, { last: lastRide(), z: ps.z });

  /* death */
  await fresh();
  await ride(true);
  room._handlePlayerDeath(ps, 'r1', 'test');
  check('4. death: off the board, told `dead`', ps._ride === false && lastRide().why === 'dead', lastRide());

  /* a hit that lands */
  await fresh();
  ps.hp = 500; ps.maxHp = 500;
  await ride(true);
  room._applyDamage(ps, 10, false, {});
  check('4. a hit that lands: off the board, told `hit`', ps._ride === false && lastRide().why === 'hit', lastRide());

  /* a swing */
  await fresh();
  await ride(true);
  await send({ type: 'player_attack', payload: {} });
  check('4. a swing: off the board, told `fight`', ps._ride === false && lastRide().why === 'fight', lastRide());
  check('4. every fighting message is on the list', ['player_attack', 'ability', 'element_burst', 'extraction_start', 'pose'].every((t) => RIDE_ENDS_ON.has(t)));

  /* the shield up on a move */
  await fresh();
  await ride(true);
  ps.lastMoveAt = T; ps._mvBudget = 0; ps._mvBudgetAt = T;
  await step(20, 200, { blocking: true });
  check('4. the shield up: off the board', ps._ride === false && lastRide().why === 'fight', lastRide());

  /* a duel made */
  await fresh();
  await ride(true);
  room._makeDuel({ id: 'd1', a: 'r1', b: 'someone', wager: 0, startedAt: T });
  check('4. a duel: off the board, told `duel`', ps._ride === false && lastRide().why === 'duel', lastRide());

  /* the kill switch mid-ride */
  await fresh();
  await ride(true);
  room._liveFlags = { ride: false };
  check('4. the kill switch: no board on the wire at once', room._rideWire(ps) === false);
  ps.lastMoveAt = T; ps._mvBudget = 0; ps._mvBudgetAt = T;
  const took = await step(190, 200);
  check('4. ...and the next move is judged on foot and ends the ride (`off`)', took === false && ps._ride === false && lastRide().why === 'off', { took, last: lastRide() });
  room._liveFlags = {};
}

// ── 5. THE OTHERS ─────────────────────────────────────────────────────────
/* the real tick, to a watcher beside the rider (sprint.test's way) */
{
  const wsO = fakeWs('o');
  room.sessions.set(wsO, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(wsO, JSON.stringify({ type: 'join', id: 'o1', name: 'Watcher', protocolVersion: 2, data: { x: CX + 60, y: CY, z: 'wheel' } }));
  const po = room.playerState.o1;
  po.z = 'wheel'; po.x = CX + 60; po.y = CY;
  const tickOnce = async () => {
    wsO.sent.length = 0;
    room.dirtyPlayers.add('r1');
    room.startTickLoop();
    await ticksRun(room, 2, room.TICK_RATE * 3);
    clearInterval(room.tickInterval); room.tickInterval = null;
    const ticks = wsO.sent.filter((m) => m.type === 'tick' && m.players && m.players.r1);
    return ticks.length ? ticks[ticks.length - 1].players.r1 : null;
  };
  await fresh();
  const onFoot = await tickOnce();
  check('5. on foot the tick carries no `brd`', !!onFoot && !('brd' in onFoot), onFoot);
  await ride(true);
  wait(50);
  await move(ps.x + 5, ps.y);
  const onBoard = await tickOnce();
  check('5. riding, the tick carries `brd: 1` for the others', !!onBoard && onBoard.brd === 1, { onBoard, types: wsO.sent.map((m) => m.type) });
  room._liveFlags = { ride: false };
  const off = await tickOnce();
  check('5. with the kill switch thrown, no `brd`', !!off && !('brd' in off), off);
  room._liveFlags = {};
  room.sessions.delete(wsO);
  delete room.playerState.o1;
}

// ── 6. THE CLIENT'S RULES ─────────────────────────────────────────────────
{
  check('6. the client\'s RIDE_MULT mirrors the worker\'s', C.RIDE_MULT === RIDE.MULT, { c: C.RIDE_MULT, s: RIDE.MULT });
  const S = { _serverCaps: { ride: true }, currentZone: 'wheel', player: { x: 0, y: 0 } };
  check('6. no caps.ride, no board', C.rideSupported({ _serverCaps: {} }) === false && C.rideSupported(S) === true);
  check('6. on foot the speed is the walk', C.rideMult(S) === 1);
  C.rideApply(S, { on: true, why: null });
  check('6. the worker says on: the speed is RIDE_MULT', C.isRiding(S) && C.rideMult(S) === RIDE.MULT);
  C.rideApply(S, { on: false, why: 'edge' });
  check('6. the worker says off at the edge: on foot, and a line to say why', !C.isRiding(S) && C.rideMult(S) === 1 && /BroTown/.test(C.rideOffLine('edge') || ''), C.rideOffLine('edge'));
  check('6. players never read "Wheel" in a line', RIDE.WHY.every((w) => !/wheel/i.test(C.rideOffLine(w) || '')));
  /* v2.3.3875: the owner: "the message 'off the board to fight' appeared when
     I pressed E near fish to just fish" -- the line names what you were doing */
  {
    const T = 1000000;
    const ex = (skill) => ({ _extraction: { skill, startedAt: T - 200 } });
    check('6b. off the board for a harvest names it: fish, chop, mine, cook',
      C.rideOffLine('fight', C.rideActVerb(ex('fishing'), T)) === 'Off the board to fish.'
      && C.rideOffLine('fight', C.rideActVerb(ex('woodcutting'), T)) === 'Off the board to chop.'
      && C.rideOffLine('fight', C.rideActVerb(ex('mining'), T)) === 'Off the board to mine.'
      && C.rideOffLine('fight', C.rideActVerb(ex('cooking'), T)) === 'Off the board to cook.',
      ['fishing', 'woodcutting', 'mining', 'cooking'].map((k) => C.rideOffLine('fight', C.rideActVerb(ex(k), T))));
    check('6b. ...a pose and a trap name theirs; a swing, or a harvest long over, is still "to fight"',
      C.rideOffLine('fight', C.rideActVerb({ _pose: { at: T - 100 } }, T)) === 'Off the board to strike a pose.'
      && C.rideOffLine('fight', C.rideActVerb({ _trap: { pending: { at: T - 100 } } }, T)) === 'Off the board to set a trap.'
      && C.rideOffLine('fight', C.rideActVerb({}, T)) === 'Off the board to fight.'
      && C.rideOffLine('fight', C.rideActVerb({ _extraction: { skill: 'fishing', startedAt: T - 60000 } }, T)) === 'Off the board to fight.'
      && C.rideOffLine('fight') === 'Off the board to fight.');
    const S6 = { _extraction: { skill: 'fishing', startedAt: T - 50 }, _ride: null };
    C.rideApply(S6, { on: true }, T - 1000);
    C.rideApply(S6, { on: false, why: 'fight' }, T);
    check('6b. ...and the worker\'s "fight" while a harvest is under way reads "Off the board to fish."', S6._ride && S6._ride.line === 'Off the board to fish.', S6._ride && S6._ride.line);
  }
  /* the stance: sideways in the stand pose, a push facing forward on setting
     off and every PUSH_EVERY_MS (game/ride.js rideLook) */
  const st = {};
  const L = C.RIDE_LOOK;
  const t0 = 1000000;
  const a0 = C.rideLook(st, 'east', true, t0);
  check('6. setting off going east: a push, the jog facing east', a0.pose === 'jog' && a0.facing === 'east' && a0.push === true, a0);
  const a1 = C.rideLook(st, 'east', true, t0 + L.PUSH_MS + 10);
  check('6. ...then the glide: the stand pose, sideways (facing south, to the camera)', a1.pose === 'stand' && a1.facing === 'south', a1);
  const a2 = C.rideLook(st, 'east', true, t0 + L.PUSH_EVERY_MS + 5);
  check('6. ...and a push again PUSH_EVERY_MS later', a2.pose === 'jog' && a2.facing === 'east', a2);
  check('6. going north the board runs up and down and he faces east across it', C.rideLook({}, 'north', false, t0).facing === 'east');
  check('6. on a diagonal he faces the diagonal across it, toward the camera', C.rideLook({}, 'southeast', false, t0).facing === 'southwest' && C.rideLook({}, 'northeast', false, t0).facing === 'southeast');
  check('6. standing still on the board: the sideways stand, no push', C.rideLook({}, 'west', false, t0).pose === 'stand');
}

// ── 7. THE PUSH START AND THE ROLL-OFF (v2.3.5440) ──────────────────────
{
  const F = C.RIDE_FEEL, L = C.RIDE_LOOK;
  C.setRideFeel(true);
  const board = () => { const S = { _serverCaps: { ride: true }, currentZone: 'wheel', player: { x: 0, y: 0 } }; C.rideApply(S, { on: true }, 1); return S; };
  /* a run of frames: `dx` held (0: let go), `ms` long, at `dt` ms a frame;
     each frame's [game ms, speed, pushing] */
  const run = (S, dx, ms, dt = 16.667, held = false) => {
    const out = [];
    for (let t = 0; t < ms - 1e-6; t += dt) {
      const o = C.rideFeel(S, dx, 0, dt, held);
      out.push({ t: t + dt, spd: S._ride.spd, k: o[0], dx: o[1], push: S._ride.push });
    }
    return out;
  };
  check('7. the numbers sit in one frozen table, each a share or a time', Object.isFrozen(F)
    && F.PUSH_ADD > 0 && F.PUSH_ADD <= 1 && F.PUSH_GAP_MS > L.PUSH_MS && F.COAST_MS > 0 && F.COAST_EASE >= 1, F);
  check('7. on foot the model is the walk: a share of 1 and the stick as it is', JSON.stringify(C.rideFeel({ player: {} }, 0.7, -0.2, 16.667, false)) === JSON.stringify([1, 0.7, -0.2]));

  /* a: from a stand, two pushes to top in about a second, at any frame rate */
  for (const dt of [16.667, 50]) {
    const S = board();
    check(`7a. getting on, the board stands (speed ${S._ride.spd}) (${dt} ms frames)`, S._ride.spd === 0 && C.rideSpeed(S) === 0);
    const r = run(S, 1, 1500, dt);
    const at = (ms) => r.find((q) => q.t >= ms - 1e-6);
    const top = r.find((q) => q.spd >= 1);
    const pushes = r.filter((q, i) => q.push >= 0 && q.push <= dt + 1e-6 && i < r.indexOf(top) + 1).length;
    check(`7a. held from a stand: below top early (${at(200).spd.toFixed(2)} at 0.2 s), the first push about 55% (${at(500).spd.toFixed(2)} at 0.5 s), top at ${top && top.t.toFixed(0)} ms, within two pushes (${pushes}) (${dt} ms frames)`,
      at(200).spd > 0.2 && at(200).spd < 0.55 && Math.abs(at(500).spd - F.PUSH_ADD) < 0.01 && !!top && top.t >= 700 && top.t <= 1200 && pushes === 2,
      { s200: at(200).spd, s500: at(500).spd, top: top && top.t, pushes });
    check(`7a. ...and the walk is RIDE_MULT x that speed: the board never outruns its top (${dt} ms frames)`,
      r.every((q) => q.k >= 0 && q.k <= 1) && r[r.length - 1].k === 1);
    /* b: let go at top: rolls on the way it went, slower and slower, to a stop */
    const c = run(S, 0, 3000, dt);
    const stop = c.find((q) => q.spd === 0);
    const cat = (ms) => c.find((q) => q.t >= ms - 1e-6).spd;
    const falls = c.every((q, i) => i === 0 || q.spd <= c[i - 1].spd);
    /* slowest at the end: the speed lost in the first quarter of the roll
       against the last (a straight line loses the same in each) */
    const q1 = 1 - cat(F.COAST_MS / 4), q4 = cat(F.COAST_MS * 3 / 4);
    check(`7b. let go at top: still rolling the way it went (${c[0].dx}), slower each frame, stopped at ${stop && stop.t.toFixed(0)} ms (about ${F.COAST_MS} ms) (${dt} ms frames)`,
      c[0].spd > 0.95 && c[0].dx === 1 && falls && !!stop && stop.t >= F.COAST_MS * 0.85 && stop.t <= F.COAST_MS * 1.05,
      { first: c[0], stop: stop && stop.t });
    check(`7b. ...slowest at the end, not a straight line: lost ${q1.toFixed(2)} in its first quarter, ${q4.toFixed(2)} left in its last (${dt} ms frames)`,
      q1 > 0.35 && q4 < 0.1, { q1, q4 });
    check(`7b. ...and stopped, it stays put: no way, no speed (${dt} ms frames)`,
      c[c.length - 1].k === 0 && c[c.length - 1].dx === 0 && C.rideSpeed(S) === 0);
  }
  /* c: the roll is the same at any frame rate (the steady step's ms, game/frameClock.js) */
  {
    const a = board(), b = board();
    run(a, 1, 1500, 16.667); run(b, 1, 1500, 50);
    const ra = run(a, 0, 1000, 16.667), rb = run(b, 0, 1000, 50);
    check(`7c. a second of rolling off reads the same at 60 and at 20 frames a second (${ra[ra.length - 1].spd.toFixed(4)}, ${rb[rb.length - 1].spd.toFixed(4)})`,
      Math.abs(ra[ra.length - 1].spd - rb[rb.length - 1].spd) < 0.005);
  }
  /* d: a resume with no new start */
  {
    const S = board();
    run(S, 1, 1500);
    run(S, 0, 500);
    const mid = S._ride.spd;
    const r = run(S, 1, 100);
    check(`7d. held again mid-roll (at ${mid.toFixed(2)}): on from the speed it had (${r[0].spd.toFixed(2)}), never back to a stand, with a push at once`,
      mid > 0.3 && r[0].spd >= mid && r.every((q) => q.spd >= mid) && r[0].push >= 0 && r[0].push <= 17, { mid, r0: r[0] });
    const r2 = run(S, 1, 1000);
    const both = r.concat(r2);
    check(`7d. ...and one push takes it back to top (${both.filter((q) => q.push >= 0 && q.push <= 17).length} push)`, r2[r2.length - 1].spd === 1 && both.filter((q) => q.push >= 0 && q.push <= 17).length === 1);
    /* the way it rolls is the stick's last */
    run(S, -0.6, 200);
    const c = C.rideFeel(S, 0, 0, 16.667, false);
    check(`7d. let go after turning: it rolls the stick's last way (${c[1]}, ${c[2]})`, c[1] === -0.6 && c[2] === 0);
  }
  /* e: stopped at once */
  {
    const S = board();
    run(S, 1, 1500);
    C.stepOff(S, 'edge', 2);
    check('7e. a step-off (the edge, a hit, a fight, a tap): speed 0 at once, nothing left to roll', S._ride.spd === 0 && S._ride.push === -1 && S._ride.wx === 0 && C.rideSpeed(S) === 0);
    C.rideApply(S, { on: true }, 3);
    run(S, 1, 1500);
    C.rideApply(S, { on: false, why: 'hit' }, 4);
    const o = C.rideFeel(S, 0, 0, 16.667, false);
    check('7e. ...the worker\'s ride_state off the same: on foot the next frame, the walk and no roll', S._ride.spd === 0 && o[0] === 1 && o[1] === 0);
    C.rideApply(S, { on: true }, 5);
    check('7e. ...and back on, it starts from a stand', S._ride.spd === 0 && S._ride.clk === 0);
    run(S, 1, 1500);
    const h = C.rideFeel(S, 0, 0, 16.667, true);
    check('7e. a hold (a veil, the race line, a stun, the loot freeze): stopped at once, no roll after', S._ride.spd === 0 && h[0] === 0 && C.rideFeel(S, 0, 0, 16.667, false)[0] === 0);
    /* at the safe ground's edge: rideCheck steps you off, and nothing rolls on */
    const E = board();
    E._ride.spd = 1; E._ride.wx = 1;
    E.player = { x: 1000, y: 0 };
    C.rideCheck(E, 6, { centre: [0, 0], safeR: 999 });
    check('7e. rolled past the safe ground\'s edge: off there (rideCheck), speed 0, no roll after it', !C.isRiding(E) && E._ride.spd === 0 && C.rideFeel(E, 0, 0, 16.667, false)[1] === 0);
  }
  /* e2: v2.3.5440 (the gatekeeper's sitting 10): a harvest begun mid-roll
     stops the board at once, and the stick's own (none) is the way: the
     roll's way in dx/dy cancelled the harvest the next frame (BroTown's
     |dx| > 0.2 "moved away"), and the worker's 'fight' then read "Off the
     board to fight." -- the owner's old wrong line */
  {
    const S = board();
    run(S, 1, 1500);
    run(S, 0, 200);
    const rolling = S._ride.spd;
    S._extraction = { skill: 'woodcutting', startedAt: 1000000, status: 'waiting' };
    const o = C.rideFeel(S, 0, 0, 16.667, false);
    check(`7e. a harvest begun mid-roll (at ${rolling.toFixed(2)}): the board stops at once and the way is the stick's (none), so nothing moves you off it`,
      rolling > 0.5 && S._ride.spd === 0 && o[0] === 0 && o[1] === 0 && o[2] === 0, o);
    C.rideApply(S, { on: false, why: 'fight' }, 1000100);
    check('7e. ...and the worker\'s "fight" then names it: "Off the board to chop."', S._ride.line === 'Off the board to chop.', S._ride.line);
  }
  /* f: a wall stops it at once; along one it slides */
  {
    const S = board();
    run(S, 1, 1500);
    const o = C.rideFeel(S, 0, 0, 16.667, false, 100, 100);
    C.rideStepped(S, 100, 100, 100 + o[1] * 5, 100);
    C.rideFeel(S, 0, 0, 16.667, false, 100, 100);   /* the wall kept it where it was */
    check('7f. rolling into a wall: the step went nowhere, stopped at once', S._ride.spd === 0);
    const S2 = board();
    run(S2, 0.7071, 1500); S2._ride.wy = 0.7071;
    C.rideStepped(S2, 0, 0, 5, 5);
    C.rideFeel(S2, 0, 0, 16.667, false, 0, 5);   /* the wall took the x, not the y */
    check(`7f. ...at 45 degrees along a wall it slides on (${S2._ride.spd.toFixed(2)})`, S2._ride.spd > 0.9);
    const S3 = board();
    run(S3, 1, 1500);
    C.rideStepped(S3, 0, 0, 5, 0);
    C.rideFeel(S3, 0, 0, 16.667, false, 5, 0);
    check(`7f. ...and a step that went where it meant: rolling on (${S3._ride.spd.toFixed(2)})`, S3._ride.spd > 0.95);
    /* v2.3.5440 (the gatekeeper's sitting 10): the stick HELD at a slant into
       a wall that takes the across part of every step -- the board slides
       along it as a walk does, at the board's speed times the slant's share
       (it crawled at 10.5 px a second at 60 degrees, against 150 with the
       switch thrown); straight into it, it stops */
    const slide = (deg) => {
      const W = board();
      const a = deg * Math.PI / 180, sx = Math.sin(a), sy = Math.cos(a);   /* deg from the wall's own line: x is into the wall */
      let y = 0, ms = 0;
      for (let i = 0; i < 180; i++) {
        const o = C.rideFeel(W, sx, sy, 16.667, false, 0, y);
        const st = o[0] * 5;   /* the board's top a frame: RIDE_MULT x the walk's 2.5 */
        C.rideStepped(W, 0, y, o[1] * st, y + o[2] * st);
        if (i >= 120) ms += o[2] * st * 60;   /* the last second: px along the wall */
        y += o[2] * st;   /* the wall keeps x where it was */
      }
      return { spd: W._ride.spd, along: Math.round(ms / 60) };
    };
    const s60 = slide(60), s80 = slide(80), s90 = slide(90);
    check(`7f. ...held 60 degrees into a wall it slides along at the board's speed (${s60.along} px a second, the instant board's 150), 80 degrees at ${s80.along}`,
      s60.spd > 0.99 && Math.abs(s60.along - 150) <= 2 && s80.spd > 0.99 && Math.abs(s80.along - 52) <= 2, { s60, s80 });
    check(`7f. ...and straight into it, it pushes and stops (${s90.spd.toFixed(2)}, ${s90.along} px a second)`, s90.along === 0, s90);
  }
  /* g: the pose's pushes are the model's (your own figure: rideLook handed the record) */
  {
    const S = board();
    const st = {};
    let t = 0;
    const poses = [];
    for (let i = 0; i < 90; i++) { C.rideFeel(S, 1, 0, 16.667, false); t += 16.667; poses.push(C.rideLook(st, 'east', true, t, S._ride).push ? 1 : 0); }
    const starts = poses.filter((p, i) => p && !poses[i - 1]).length;
    check(`7g. your pose from a stand: the jog's legs exactly while the model pushes (${starts} pushes in 1.5 s)`, starts === 2 && poses[0] === 1 && poses[30] === 0 && poses[40] === 1, poses.join(''));
    const glide = [];
    for (let i = 0; i < 150; i++) { C.rideFeel(S, 0, 0, 16.667, false); t += 16.667; if (S._ride.spd > 0) glide.push(C.rideLook(st, 'east', true, t, S._ride)); }
    check(`7g. ...and rolling off, the sideways glide all the way (${glide.length} frames, no push)`, glide.length > 60 && glide.every((g) => g.pose === 'stand' && g.facing === 'south' && !g.push));
    /* another rider (no record): a push setting off and the start's second PUSH_GAP_MS later */
    const ps2 = {};
    const p0 = C.rideLook(ps2, 'east', true, 1000);
    const p1 = C.rideLook(ps2, 'east', true, 1000 + F.PUSH_GAP_MS + 1);
    const p2 = C.rideLook(ps2, 'east', true, 1000 + F.PUSH_GAP_MS + L.PUSH_MS + 10);
    const p3 = C.rideLook(ps2, 'east', true, 1000 + F.PUSH_GAP_MS + L.PUSH_EVERY_MS + 1);
    check('7g. another rider: a push setting off, the second at PUSH_GAP_MS, then one every PUSH_EVERY_MS', p0.push && p1.push && !p2.push && p3.push, [p0, p1, p2, p3]);
  }
  /* h: the switch thrown: today's instant start and stop */
  {
    check('7h. `?ridecoast=0` (off, false) throws the switch; anything else leaves it on',
      !C.rideCoastOn('?ridecoast=0') && !C.rideCoastOn('?a=1&ridecoast=off') && !C.rideCoastOn('?ridecoast=false') && C.rideCoastOn('') && C.rideCoastOn('?ridecoast=1') && C.rideCoastOn('?ridecoasts=0'));
    C.setRideFeel(false);
    const S = board();
    const a = C.rideFeel(S, 1, 0, 16.667, false);
    const b = C.rideFeel(S, 0, 0, 16.667, false);
    const st = {};
    const look = C.rideLook(st, 'east', true, 1000, S._ride);
    const look2 = C.rideLook(st, 'east', true, 1000 + L.PUSH_MS + 10, S._ride);
    const look3 = C.rideLook(st, 'east', true, 1000 + F.PUSH_GAP_MS + 1, S._ride);
    check('7h. thrown: top on the first frame held, a stop the first frame let go, the stick as it is',
      a[0] === 1 && a[1] === 1 && b[0] === 1 && b[1] === 0 && C.rideSpeed(S) === 0, { a, b });
    check('7h. ...and the pose as before: a push setting off, then every PUSH_EVERY_MS (no start\'s second push)', look.push && !look2.push && !look3.push);
    C.setRideFeel(null);
  }
  /* j: v2.3.5440 (the gatekeeper's sitting 10): THE MOVES IT SENDS.  The
     roll-off changes the board's speed every frame, which the message diet
     read as a change to send at once: a start, 4 s held and a stop sent 80
     moves where the instant board sent 21.  A rolling board's speed change
     now rides the path (moveDiet.js pathRideMayWait).  The phone's stream at
     60 frames a second -- BroTown's move every 22 ms or more, wsClient's
     batch every 33 ms, the path's rule as flushInputBuffer has it (held to
     it below) -- counted by the real functions. */
  {
    const sim = ({ feel, rideRule, holdMs = 4000 }) => {
      C.setRideFeel(feel);
      const S = board();
      const Fm = 16.667;
      let t = 0, x = 0, lastB = -1e9, pending = null, pendingAt = 0, sent = null, sentAt = 0, lastSentAt = -1e9, n = 0, was = false, rest = false, nextFlush = 0, movingMs = 0, stopAt = 0;
      for (let i = 0; i < 2000; i++) {
        t += Fm;
        const o = C.rideFeel(S, t <= holdMs ? 1 : 0, 0, Fm, false);
        const v = 5 * o[0] * o[1];   /* px a 60 Hz frame: RIDE_MULT x the walk's 2.5 x the board's share */
        x += v;
        const moving = v !== 0;
        if (moving) movingMs += Fm;
        if (was && !moving) { rest = true; stopAt = t; }
        was = moving;
        if (t - lastB > 22 && (moving || rest)) { lastB = t; rest = false; pending = { x: Math.round(x * 10) / 10, y: 0, d: 'right', f: 'east', z: 'wheel', vx: Math.round(v * 100), vy: 0, pd: 1 }; pendingAt = t; }
        if (t >= nextFlush) {
          nextFlush = t + 33;
          if (pending) {
            let gap = 33;
            if (sent && (rideRule ? D.pathWaits(true, C.isRiding(S) && C.rideFeelOn(), pending, pendingAt, sent, sentAt)
              : D.pathMayWait(true, pending, pendingAt, sent, sentAt))) gap = D.MOVE_PATH.GAP_MS;
            else if (sent && D.pathTurned(sent, pending)) gap = 0;
            if (t - lastSentAt >= gap) { n++; sent = pending; sentAt = pendingAt; lastSentAt = t; pending = null; }
          }
        }
        if (stopAt && t > stopAt + 500 && !pending) break;
      }
      C.setRideFeel(null);
      return { moves: n, s: +(movingMs / 1000).toFixed(2), perS: +(n / (movingMs / 1000)).toFixed(2) };
    };
    const inst = sim({ feel: false, rideRule: false });
    const before = sim({ feel: true, rideRule: false });
    const now = sim({ feel: true, rideRule: true });
    console.log(`     moves for a start, 4 s held and a stop: the instant board ${inst.moves} (${inst.s} s moving), the roll-off ${before.moves} before the mend, ${now.moves} now (${now.s} s moving: it rolls on ~1.9 s)`);
    check(`7j. the instant board (today's): ${inst.moves} moves for a start, 4 s held and a stop`, inst.moves >= 19 && inst.moves <= 23, inst);
    check(`7j. the roll-off sends at a walk's rate: ${now.perS} moves a second of motion against the instant board's ${inst.perS} (${before.perS} before the mend)`,
      now.perS <= inst.perS + 0.3 && before.perS > inst.perS * 2, { inst, before, now });
    /* the line: only falls.  The 10 over the instant board's are the ~1.9 s
       more the board moves (the roll itself), at the walk's rate */
    check(`7j. ...${now.moves} moves in all, at most 32 (the line; ${before.moves} before the mend)`, now.moves <= 32, now);
    /* the sim's rule is the batcher's: flushInputBuffer asks pathWaits with
       the path on and "riding, the roll-off on" */
    const asks = findIn('wire', /if \(pathWaits\(movePathOn\(\), isRiding\(stateRef\.current\) && rideFeelOn\(\), _pendingMove, _pendingMoveAt, _moveSent, _moveSentMadeAt\)\)/);
    check(`7j. ...and the batcher asks the same: pathWaits(movePathOn(), isRiding(...) && rideFeelOn(), ...) (${asks.map((a) => a.file + ':' + a.line).join(', ')})`,
      asks.length === 1, asks);
    /* the rule itself: a heading change, a start, a stop or another field goes at once */
    /* 500 hundredths of a px a 60 Hz frame is 0.3 px a ms: the glide has it 30 px on after 100 ms */
    const m0 = { x: 0, y: 0, z: 'wheel', vx: 500, vy: 0, d: 'right', pd: 1 };
    const mv = (x, vx, vy, d) => ({ x, y: 0, z: 'wheel', vx, vy, d: d || 'right', pd: 1 });
    const ok = D.pathRideSteady(m0, mv(25, 300, 0), 0, 100);   /* rolling off: 5 px behind the glide, slower */
    const turned = D.pathRideSteady(m0, mv(25, 290, 60), 0, 100);
    const stopped = D.pathRideSteady(m0, mv(25, 0, 0), 0, 100);
    const field = D.pathRideSteady(m0, mv(25, 300, 0, 'up'), 0, 100);
    const far = D.pathRideSteady(m0, mv(30 - D.MOVE_PATH_RIDE.RIDE_ERR_PX - 4, 300, 0), 0, 100);
    check('7j. the rider\'s path: a speed change on the line waits; a turn, a stop, another field or a glide past RIDE_ERR_PX goes',
      ok && !turned && !stopped && !field && !far, { ok, turned, stopped, field, far });
  }
  /* i: moved out of BroTown's loop to make room (tools/guards/four-lines) */
  {
    const S = board();
    check('7i. rideCheck with no `fighting` asks rideFighting: the shield, an attack, a swing, a bash, a roll',
      ['_shieldUp', 'autoAttack', 'isSwinging', '_bashDash', '_dodgeRoll'].every((k) => C.rideFighting({ [k]: true })) && !C.rideFighting({}));
    S.player = { x: 0, y: 0 }; S.isSwinging = true;
    C.rideCheck(S, 7, { centre: [0, 0], safeR: 999 });
    check('7i. ...a swing on the board steps you off to fight, its line taken once', !C.isRiding(S) && S._ride.why === 'fight'
      && C.rideLineDue(S) === 'Off the board to fight.' && C.rideLineDue(S) === null);
    const S2 = board();
    S2.player = { x: 0, y: 0 }; S2.isSwinging = true;
    C.rideCheck(S2, 8, { centre: [0, 0], safeR: 999, fighting: false });
    check('7i. ...and a caller\'s own `fighting` still decides', C.isRiding(S2));
  }
}

Date.now = realNow;
try { room._stopTick && room._stopTick(); } catch (e) { /* the room goes */ }
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
