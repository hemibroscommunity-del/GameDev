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
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { RIDE, RIDE_ENDS_ON } from '../src/ride.js';
import { SPRINT } from '../src/sprint.js';
import * as C from '../../src/game/ride.js';

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
  ps.z = 'meadow';
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
  await move(1000, 1000, { z: 'meadow' });
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

Date.now = realNow;
try { room._stopTick && room._stopTick(); } catch (e) { /* the room goes */ }
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
