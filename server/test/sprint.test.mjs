/* Sprint — v2.3.3006 (server/src/sprint.js; spec docs/specs/sprint.md).
 *
 * Owner, 2026-10-03: "a sprint button by the left joystick that drains down
 * stamina but makes you run about 33% faster until it drains out".
 *
 *   1. CAPS: state_sync advertises caps.sprint; `sprint: false` in liveflags
 *      un-advertises it.
 *   2. THE BOUND: a move at sprinting pace is refused at the walking bound and
 *      accepted as a sprint step (`sp: 1`) -- by SPRINT.MULT, no more.
 *   3. THE BILL: a second of sprint steps costs DRAIN_PER_S, at a phone's
 *      pace or a slow one's; standing still, or the run after a stop (the
 *      client's rest packet in between), costs nothing; one step bills at
 *      most STEP_MAX_MS.
 *   4. EMPTY: at zero the next marked move is an ordinary one; GRACE_MS of
 *      wide bound after the last paid step, then the walking bound.
 *   5. WHO MAY: a new sprint needs MIN_START; one under way runs to zero; not
 *      while blocking, with a broken guard, or dead.
 *   6. THE REGEN is held off while sprinting, the hub top-off too, and comes
 *      back after REGEN_PAUSE_MS.
 *   7. THE KILL SWITCH: `sprint: false` stops every sprint step.
 *   8. THE WIRE: only `sp === 1` counts; nothing new is emitted.
 *   9. THE CLIENT'S RULES (src/game/sprint.js, no imports, so node runs it):
 *      who may start one, the speed, the predicted drain, what ends one, and
 *      the regen it holds off -- the half of the feature the browser runs.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { SPRINT } from '../src/sprint.js';
import * as C from '../../src/game/sprint.js';

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

/* the worker's clock, moved by hand */
const realNow = Date.now;
let T = realNow();
Date.now = () => T;
const wait = (ms) => { T += ms; };

const room = new GameRoom(mockState, mockEnv);
const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'p1', name: 'Runner', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'meadow' } }));
const ps = room.playerState.p1;
const move = async (x, y, extra) => room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x, y, z: ps.z || 'meadow' }, extra || {})));

/* A fresh start: in a combat zone (no hub top-off), stamina `st`, standing at
   (1000, 1000) with a first move behind it so the bound is live. */
async function fresh(st, zone) {
  ps.z = zone || 'meadow';
  ps.x = 1000; ps.y = 1000;
  ps.maxStamina = 100; ps.stamina = st == null ? 100 : st;
  ps.blocking = false; ps._guardBrokenUntil = 0; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps._sprintAt = 0; ps._sprintOwed = 0; ps._sprintStep = false; ps._sprintLastPaid = false; ps._sprintPrevPaid = false;
  room._liveFlags = {};
  ps.lastMoveAt = T;
}
/* `n` moves `step` px east, `gapMs` apart; returns how many were accepted */
async function run(n, step, gapMs, extra) {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    wait(gapMs);
    const x0 = ps.x;
    await move(ps.x + step, ps.y, extra);
    if (ps.x !== x0) ok++;
  }
  return ok;
}

// ── 1. CAPS ───────────────────────────────────────────────────────────────
{
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('caps: state_sync advertises caps.sprint', !!(sync && sync.caps && sync.caps.sprint === true), sync && sync.caps && sync.caps.sprint);
  const ws2 = fakeWs('q');
  room._liveFlags = { sprint: false };
  room.sessions.set(ws2, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'p2', name: 'Walker', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'meadow' } }));
  const sync2 = ws2.sent.find((m) => m.type === 'state_sync');
  check('caps: `sprint: false` in liveflags un-advertises it', !!(sync2 && sync2.caps && sync2.caps.sprint === false), sync2 && sync2.caps && sync2.caps.sprint);
  room._liveFlags = {};
}

// ── 2. THE BOUND ──────────────────────────────────────────────────────────
/* 200 ms apart: the walking bound is 500 px/s x 0.2 s + 80 = 180 px; at
   SPRINT.MULT it is 500 x 1.33 x 0.2 + 80 = 213 px */
{
  await fresh(100);
  const walkOk = await run(1, 200, 200);
  check('bound: a 200 px step in 200 ms is refused at the walking bound', walkOk === 0, { x: ps.x });
  await fresh(100);
  const sprintOk = await run(1, 200, 200, { sp: 1 });
  check('bound: ...and accepted as a sprint step', sprintOk === 1, { x: ps.x });
  await fresh(100);
  const tooFar = await run(1, 230, 200, { sp: 1 });
  check('bound: a sprint widens it by SPRINT.MULT and no more (230 px refused)', tooFar === 0, { x: ps.x });
  check('bound: SPRINT.MULT is the owner\'s "about 33% faster"', SPRINT.MULT === 1.33);
}

// ── 3. THE BILL ───────────────────────────────────────────────────────────
{
  await fresh(100);
  await run(11, 40, 100, { sp: 1 });          /* 10 billed gaps of 100 ms after the first */
  const spent = 100 - ps.stamina;
  check(`bill: a second of sprinting costs DRAIN_PER_S (${spent} of ${SPRINT.DRAIN_PER_S})`, Math.abs(spent - SPRINT.DRAIN_PER_S) <= 1, { spent });
  await fresh(100);
  for (let i = 0; i < 10; i++) { wait(100); await move(ps.x, ps.y, { sp: 1 }); }
  check('bill: standing still with the flag on costs nothing', ps.stamina === 100, { st: ps.stamina });
  await fresh(100);
  await run(3, 40, 100, { sp: 1 });
  wait(60); await move(ps.x + 2, ps.y);       /* the client's rest packet as he stops: unmarked */
  const afterRun = ps.stamina;
  wait(5000);
  await run(1, 40, 100, { sp: 1 });
  check('bill: the first step after a stop bills nothing (he stood through the gap)', ps.stamina === afterRun, { before: afterRun, after: ps.stamina });
  /* a phone drawing a few frames a second sends its moves ~450 ms apart:
     every one of those gaps was run through, and is billed (the old rule
     called any gap over 400 ms a pause and billed nothing -- mp-sprint's
     test machine sprinted for free) */
  await fresh(100);
  await run(6, 150, 450, { sp: 1 });
  const slowSpent = 100 - ps.stamina;
  const slowWant = 5 * 0.45 * SPRINT.DRAIN_PER_S;
  check(`bill: a slow phone's moves (450 ms apart) are billed in full (${slowSpent} of ${slowWant.toFixed(1)})`, Math.abs(slowSpent - slowWant) <= 1, { slowSpent });
  await fresh(100);
  await run(2, 40, 100, { sp: 1 });
  const beforeStall = ps.stamina;
  wait(4000);
  ps.lastMoveAt = T - 200;   /* the bound is not what this asks about */
  await move(ps.x + 40, ps.y, { sp: 1 });
  const stall = beforeStall - ps.stamina;
  check(`bill: one step bills at most STEP_MAX_MS (${SPRINT.STEP_MAX_MS} ms, ${stall} stamina for a 4 s gap)`, stall >= 10 && stall <= Math.ceil(SPRINT.DRAIN_PER_S * SPRINT.STEP_MAX_MS / 1000), { stall });
  await fresh(100);
  await run(20, 40, 100);
  check('bill: an unmarked walk costs nothing', ps.stamina === 100, { st: ps.stamina });
}

// ── 4. EMPTY ──────────────────────────────────────────────────────────────
{
  await fresh(6);
  await run(10, 40, 100, { sp: 1 });
  check('empty: the bill stops at zero, never below', ps.stamina === 0, { st: ps.stamina });
  const lastPaid = ps._sprintAt;
  /* inside the grace: a sprinting-pace move with the flag still on is let through */
  T = lastPaid + 200; ps.lastMoveAt = lastPaid;
  const x0 = ps.x;
  await move(ps.x + 195, ps.y, { sp: 1 });
  check('empty: for GRACE_MS after the last paid step the bound stays wide (no snap-back as the client catches up)', ps.x === x0 + 195, { x: ps.x, x0 });
  T = lastPaid + SPRINT.GRACE_MS + 400; ps.lastMoveAt = T - 200;
  const x1 = ps.x;
  await move(ps.x + 195, ps.y, { sp: 1 });
  check('empty: after it, at zero, a marked move is judged at the walking bound', ps.x === x1, { x: ps.x, x1 });
}

// ── 5. WHO MAY ────────────────────────────────────────────────────────────
{
  await fresh(SPRINT.MIN_START - 1);
  const low = await run(1, 200, 200, { sp: 1 });
  check(`who: a new sprint needs MIN_START (${SPRINT.MIN_START}) stamina`, low === 0 && ps.stamina === SPRINT.MIN_START - 1, { st: ps.stamina });
  await fresh(SPRINT.MIN_START);
  await run(2, 40, 100, { sp: 1 });
  ps.stamina = 2;
  const going = await run(1, 200, 200, { sp: 1 });
  check('who: ...but a sprint under way runs on to zero', going === 1, { st: ps.stamina });
  await fresh(100);
  ps.blocking = true;
  const blk = await run(1, 200, 200, { sp: 1, blocking: true });
  check('who: not while blocking', blk === 0 && ps.stamina === 100, { st: ps.stamina });
  await fresh(100);
  ps._guardBrokenUntil = T + 5000;
  const brk = await run(1, 200, 200, { sp: 1 });
  check('who: not with a broken guard', brk === 0, { x: ps.x });
  await fresh(100);
  ps.dying = true;
  check('who: not dying', room._sprintAllowed(ps, T) === false);
  ps.dying = false;
}

// ── 6. THE REGEN ──────────────────────────────────────────────────────────
{
  await fresh(50);
  await run(3, 40, 100, { sp: 1 });
  const st0 = ps.stamina;
  room._tickPlayerRegen();
  check('regen: held off while sprinting', ps.stamina === st0, { before: st0, after: ps.stamina });
  wait(SPRINT.REGEN_PAUSE_MS + 50);
  room._tickPlayerRegen();
  check('regen: back after REGEN_PAUSE_MS', ps.stamina > st0, { before: st0, after: ps.stamina });
  await fresh(50, 'town');
  await run(3, 40, 100, { sp: 1 });
  const st1 = ps.stamina;
  room._tickPlayerRegen();
  check('regen: the hub top-off is held off too (sprinting in town still drains)', ps.stamina === st1, { before: st1, after: ps.stamina });
}

// ── 7. THE KILL SWITCH ────────────────────────────────────────────────────
{
  await fresh(100);
  room._liveFlags = { sprint: false };
  const off = await run(1, 200, 200, { sp: 1 });
  await run(10, 40, 100, { sp: 1 });
  check('kill switch: `sprint: false` stops every sprint step -- walking bound, nothing billed', off === 0 && ps.stamina === 100, { st: ps.stamina });
  room._liveFlags = {};
}

// ── 8. THE WIRE ───────────────────────────────────────────────────────────
{
  for (const sp of [true, '1', 2, 'yes', 1.0001]) {
    await fresh(100);
    const n = await run(1, 200, 200, { sp });
    if (n !== 0) check(`wire: sp ${JSON.stringify(sp)} is not a sprint`, false, { sp });
  }
  check('wire: only `sp === 1` is a sprint (true, "1", 2 are not)', true);
  const before = room.eventBuffer.length;
  await fresh(100);
  await run(5, 40, 100, { sp: 1 });
  const kinds = new Set(room.eventBuffer.slice(before).map((e) => e.type));
  check('wire: a sprint emits no new event type (no sprint message either way)', ![...kinds].some((k) => /sprint/i.test(k)) && ![...PRIVILEGED_EVENTS].some((k) => /sprint/i.test(k)), [...kinds]);
}

// ── 9. THE CLIENT'S RULES ─────────────────────────────────────────────────
{
  const FR = 16.667;
  const mk = (st, caps) => ({ rpg: { stamina: st == null ? 100 : st, maxStamina: 100 }, _serverCaps: caps === undefined ? { sprint: true } : caps, currentZone: 'wheel' });
  /* `n` frames of the given inputs from time t; returns the last event */
  const frames = (S, t, n, f) => { let ev = null; for (let i = 0; i < n; i++) { const e = C.updateSprint(S, t + i * FR, Object.assign({ dtMs: FR }, f)); if (e) ev = e; } return ev; };

  let S = mk(100, {});
  check('client: no sprint against a worker without caps.sprint (it would snap every one back)',
    C.startSprint(S, 0, 'tap') === false && S._sprint.why === 'unsupported' && !C.sprintArmed(S));
  S = mk(C.SPRINT_MIN_START - 0.5);
  check(`client: a tap under ${C.SPRINT_MIN_START} stamina is refused as 'tired'`, C.toggleSprint(S, 0) === false && S._sprint.why === 'tired' && S._sprint.refusedAt === 0);
  S = mk(100);
  check('client: a tap turns it on, a second tap off', C.toggleSprint(S, 0) === true && C.sprintArmed(S) && C.toggleSprint(S, 10) === false && !C.sprintArmed(S) && S._sprint.why === 'tap');

  S = mk(100);
  C.toggleSprint(S, 0);
  frames(S, 0, 1, { moving: false });
  check('client: armed but standing, the walk is unchanged (and no step is marked)', C.sprintMult(S) === 1 && C.sprintStepFlag(S) === 0 && C.sprintArmed(S));
  frames(S, FR, 1, { moving: true });
  check('client: moving, the walk is SPRINT_MULT and the move is marked', C.sprintMult(S) === C.SPRINT_MULT && C.sprintStepFlag(S) === 1);
  const st0 = S.rpg.stamina;
  frames(S, 2 * FR, 60, { moving: true });
  const spent = st0 - S.rpg.stamina;
  check(`client: the predicted drain is DRAIN_PER_S a second of running (${spent.toFixed(2)} in 60 frames)`, Math.abs(spent - C.SPRINT_DRAIN_PER_S) < 0.3, { spent });
  check('client: the regen is held off while running, and after REGEN_PAUSE_MS it is not',
    C.sprintHoldsRegen(S, 61 * FR + 500) && !C.sprintHoldsRegen(S, 61 * FR + C.REGEN_PAUSE_MS + 1));
  const slow = mk(100);
  C.toggleSprint(slow, 0);
  C.updateSprint(slow, 1000, { moving: true, dtMs: 5000 });
  check('client: a long frame drains at most 100 ms of it (a hitch is not a sprint)', slow.rpg.stamina >= 100 - C.SPRINT_DRAIN_PER_S * 0.1 - 1e-9, { st: slow.rpg.stamina });

  S = mk(100);
  C.toggleSprint(S, 0);
  frames(S, 0, 1, { moving: false });
  C.updateSprint(S, C.START_WAIT_MS - 100, { moving: false, dtMs: FR });
  check(`client: a tap waits START_WAIT_MS (${C.START_WAIT_MS}) for the thumb to get back to the stick`, C.sprintArmed(S));
  C.updateSprint(S, C.START_WAIT_MS + 100, { moving: false, dtMs: FR });
  check('client: ...then, never having run, it ends', !C.sprintArmed(S) && S._sprint.why === 'still');
  S = mk(100);
  C.toggleSprint(S, 0);
  frames(S, 0, 10, { moving: true });
  C.updateSprint(S, 10 * FR + C.IDLE_STOP_MS - 100, { moving: false, dtMs: FR });
  const held = C.sprintArmed(S);
  C.updateSprint(S, 10 * FR + C.IDLE_STOP_MS + 100, { moving: false, dtMs: FR });
  check(`client: once running, a pause under IDLE_STOP_MS (${C.IDLE_STOP_MS}) keeps it, a longer one ends it`, held && !C.sprintArmed(S) && S._sprint.why === 'still');

  for (const [k, why] of [['shield', 'shield'], ['attacking', 'attack'], ['swimming', 'swim'], ['dead', 'dead']]) {
    S = mk(100);
    C.toggleSprint(S, 0);
    frames(S, 0, 3, { moving: true });
    const ev = C.updateSprint(S, 100, { moving: true, dtMs: FR, [k]: true });
    if (!(ev === 'stop' && !C.sprintArmed(S) && S._sprint.why === why && C.sprintMult(S) === 1)) check(`client: ${k} ends a sprint`, false, S._sprint);
  }
  check('client: the shield, an attack, the water and death each end a sprint (and its speed)', true);
  S = mk(100);
  C.toggleSprint(S, 0);
  frames(S, 0, 3, { moving: true });
  S.currentZone = 'town';
  check('client: a zone change ends it', C.updateSprint(S, 100, { moving: true, dtMs: FR }) === 'stop' && S._sprint.why === 'zone');
  S = mk(100, {});
  S._sprint = { on: true, how: 'tap', at: 0, moving: true, ran: true, lastMoveAt: 0, ranAt: 0, zone: 'wheel', key: false, n: 1 };
  check('client: a worker that drops caps.sprint (the kill switch, a reconnect) ends it', C.updateSprint(S, 10, { moving: true, dtMs: FR }) === 'stop' && S._sprint.why === 'unsupported');

  S = mk(20);
  C.toggleSprint(S, 0);
  const evE = frames(S, 0, 200, { moving: true });
  check(`client: run dry and it ends ('empty'), the bar at 0 (${S.rpg.stamina})`, evE === 'stop' && S._sprint.why === 'empty' && S.rpg.stamina === 0 && C.sprintMult(S) === 1);
  check('client: ...and a new tap at 0 is refused', C.toggleSprint(S, 5000) === false && S._sprint.why === 'tired');

  S = mk(100);
  check('client: Shift held starts one (\'key\')', C.updateSprint(S, 0, { key: true, moving: true, dtMs: FR }) === 'start' && S._sprint.how === 'key');
  frames(S, FR, 1, { key: true, moving: false });
  C.updateSprint(S, 5000, { key: true, moving: false, dtMs: FR });
  check('client: ...standing still with Shift held keeps it armed', C.sprintArmed(S));
  check('client: ...let go of Shift and it stops', C.updateSprint(S, 5100, { key: false, moving: true, dtMs: FR }) === 'stop' && S._sprint.why === 'key');
  S = mk(2);
  C.updateSprint(S, 0, { key: true, moving: true, dtMs: FR });
  const n1 = S._sprint.refusedAt;
  C.updateSprint(S, 500, { key: true, moving: true, dtMs: FR });
  check('client: Shift held while tired is refused once per press, not every frame', !C.sprintArmed(S) && S._sprint.why === 'tired' && S._sprint.refusedAt === n1 && n1 === 0);
  S = mk(100);
  C.toggleSprint(S, 0);
  C.updateSprint(S, 10, { key: true, moving: true, dtMs: FR });
  C.updateSprint(S, 20, { key: false, moving: true, dtMs: FR });
  check('client: letting go of Shift never ends a sprint the button started', C.sprintArmed(S) && S._sprint.how === 'tap');
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILED` : '\nall sprint checks passed');
process.exit(failures ? 1 : 0);
