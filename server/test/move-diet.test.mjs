/* ═══ v2.3.3204: A STEADY WALK ON THE SAFE GROUND IS SENT HALF AS OFTEN ═══
 *
 * The phone (src/game/moveDiet.js, wsClient.js moveDietOn) keeps back a move
 * that is on the line its last move drew, until 66 ms after it -- the
 * worker's own steady hold (steadymovers.js), done where the move is made.
 * Checked:
 *
 *   1. the phone's rule on its own, and that its numbers ARE the worker's;
 *   2. a room: a phone's frames and its 33 ms batch run on one clock with the
 *      room's ticks, a walker in Brotown beside a watcher -- the walker's
 *      phone sends a straight walk about every 66 ms instead of 33; a turn,
 *      a stop, a start, new gear go out on the next batch and on to the
 *      watcher the very next tick; the worker never holds a spaced move a
 *      tick more; the watcher DRAWS the walker where every move would;
 *   3. caps.movediet, and `movediet: false` taking it away.
 */
import { GameRoom } from '../src/index.js';
import { STEADY } from '../src/steadymovers.js';
import { MOVE_DIET, steadyMove, onSafeGround, dietMayWait } from '../../src/game/moveDiet.js';
import { WHEEL_SAFE_R } from '../src/wheelspawns.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;
const CENTRE = [21504, 21504];

/* ── 1. the phone's rule ───────────────────────────────────────────────── */
{
  check('1a. its numbers are the worker\'s (MAX_MS, ERR_PX, V_REL, V_MIN), and a spaced move is never held again (GAP_MS > SPACED_MS)',
    MOVE_DIET.GAP_MS === STEADY.MAX_MS && MOVE_DIET.ERR_PX === STEADY.ERR_PX && MOVE_DIET.V_REL === STEADY.V_REL
    && MOVE_DIET.V_MIN === STEADY.V_MIN && MOVE_DIET.GAP_MS > STEADY.SPACED_MS,
    { MOVE_DIET, STEADY });
  /* the phone's own move (wsClient.js _pendingMove): 275 hundredths of a px
     a 60 Hz frame = 0.165 px a ms */
  const mv = (o) => Object.assign({ type: 'move', x: 21500, y: 21700, d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none',
    ex: null, z: 'wheel', vx: 275, vy: 0, dodging: false, blocking: false, ba: null, dead: false, sp: undefined }, o);
  const last = mv({});
  const at = (ms, o) => mv(Object.assign({ x: 21500 + 0.165 * ms }, o));
  check('1b. on the line it drew: may wait', steadyMove(last, at(33), 0, 33) === true && steadyMove(last, at(50), 0, 50) === true);
  check('1c. a turn, a stop, a start: never', steadyMove(last, at(33, { vx: 0, vy: 275 }), 0, 33) === false
    && steadyMove(last, at(33, { vx: 0, vy: 0 }), 0, 33) === false
    && steadyMove(mv({ vx: 0 }), mv({ vx: 275, x: 21500.5 }), 0, 33) === false);
  check('1d. any other field changed (facing, gear, harvest, shield, roll, sprint, zone, death): never',
    ['f', 'eqc', 'ex', 'blocking', 'dodging', 'sp', 'z', 'dead', 'd', 'ba'].every((k) => {
      const v = { f: 'south', eqc: 'iron', ex: 'mine', blocking: true, dodging: true, sp: 1, z: 'town', dead: true, d: 'up', ba: 1.5 }[k];
      return steadyMove(last, at(33, { [k]: v }), 0, 33) === false;
    }));
  check('1e. a field the move did not carry before: never', steadyMove(last, at(33, { pw: 'x' }), 0, 33) === false);
  check('1f. ERR_PX off the line: at the edge it may wait, past it never',
    steadyMove(last, at(33, { y: 21700 + MOVE_DIET.ERR_PX }), 0, 33) === true
    && steadyMove(last, at(33, { y: 21700 + MOVE_DIET.ERR_PX + 0.01 }), 0, 33) === false);
  check('1g. a shove along the line: never', steadyMove(last, at(33, { x: 21560 }), 0, 33) === false);
  check('1h. a thumb\'s wobble in the speed: may wait; a real change: never',
    steadyMove(last, at(33, { vx: 278, vy: 4 }), 0, 33) === true && steadyMove(last, at(33, { vx: 300 }), 0, 33) === false);
  check('1i. standing where you stood: may wait; moved: never',
    steadyMove(mv({ vx: 0 }), mv({ vx: 0, x: 21501 }), 0, 40) === true && steadyMove(mv({ vx: 0 }), mv({ vx: 0, x: 21503 }), 0, 40) === false);
  check('1j. nothing sent yet, a time running backwards, no numbers: never',
    steadyMove(null, at(33), 0, 33) === false && steadyMove(last, at(33), 40, 33) === false
    && steadyMove(last, at(33, { x: 'a' }), 0, 33) === false && steadyMove(last, at(33), undefined, 33) === false);
  check('1l. the batch\'s question: only when the phone says so, both moves in the Wheel and on its safe ground, and steady',
    dietMayWait(true, at(33, { y: 21792 }), 33, mv({ y: 21792 }), 0, CENTRE, WHEEL_SAFE_R) === true
    && dietMayWait(false, at(33, { y: 21792 }), 33, mv({ y: 21792 }), 0, CENTRE, WHEEL_SAFE_R) === false
    && dietMayWait(true, at(33, { y: 21792, z: 'town' }), 33, mv({ y: 21792, z: 'town' }), 0, CENTRE, WHEEL_SAFE_R) === false
    && dietMayWait(true, at(33, { x: 18985, y: 18985 }), 33, mv({ x: 18985 - 0.165 * 33, y: 18985 }), 0, CENTRE, WHEEL_SAFE_R) === false
    && dietMayWait(true, at(33, { y: 21792, vy: 275, vx: 0 }), 33, mv({ y: 21792 }), 0, CENTRE, WHEEL_SAFE_R) === false
    && dietMayWait(true, at(33, { y: 21792 }), 33, null, 0, CENTRE, WHEEL_SAFE_R) === false);
  check('1k. the safe ground: Brotown yes, its edge no, a land no',
    onSafeGround(21504, 21792, CENTRE, WHEEL_SAFE_R) === true && onSafeGround(21504 + WHEEL_SAFE_R, 21504, CENTRE, WHEEL_SAFE_R) === false
    && onSafeGround(18985, 18985, CENTRE, WHEEL_SAFE_R) === false && onSafeGround('x', 1, CENTRE, WHEEL_SAFE_R) === false
    && onSafeGround(21504, 21504, CENTRE, 0) === false);
}

/* ── the room ──────────────────────────────────────────────────────────── */
function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
async function makeRoom(flags) {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = flags || {};
  return { room, tickFn };
}
async function join(room, id) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return { ws, id };
}
const send = (room, p, m) => room.webSocketMessage(p.ws, JSON.stringify(m));
const ARRIVAL = { x: 21504, y: 21792 };
const SPEED = 165;                       /* px a second, a phone's walk */
const PER_FRAME = SPEED / 60 * 100;      /* hundredths of a px a 60 Hz frame */
const FRAME_MS = 1000 / 60;
const BATCH_MS = 33;                     /* wsClient.js INPUT_BATCH_WINDOW / MOVE_GAP_SEEN_MS */

/* A walk: legs {ms, dir: [dx, dy] unit or null, eqc?}.  The walker's phone
   runs on the room's clock: every frame writes the pending move (x to a
   tenth of a px, vx/vy whole hundredths, as BroTown.jsx does) and its time;
   every BATCH_MS the batch sends it if 33 ms have passed since the last one
   -- or, with `diet`, 66 when the pending move is steady by the phone's rule
   on the safe ground (wsClient.js flushInputBuffer + moveDietOn).  Records
   the moves the phone sent, what the watcher was sent about the walker, and
   where the walker really was, every ms. */
async function walk(flags, legs, { diet = false, start = { x: ARRIVAL.x + 200, y: ARRIVAL.y } } = {}) {
  const { room, tickFn } = await makeRoom(flags);
  const A = await join(room, 'da');      /* the watcher */
  const B = await join(room, 'db');      /* the walker */
  const base = { d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none', ex: null, dodging: false, blocking: false, ba: null, dead: false };
  for (const [p, x, y] of [[A, ARRIVAL.x, ARRIVAL.y], [B, start.x, start.y]]) {
    await send(room, p, Object.assign({ type: 'move', x: 1000, y: 1000, z: 'town', vx: 0, vy: 0 }, base));
    await send(room, p, Object.assign({ type: 'move', x, y, z: 'wheel', vx: 0, vy: 0 }, base));
  }
  for (let i = 0; i < 5; i++) { NOW += room.TICK_RATE; tickFn(); }
  A.ws.sent.length = 0;
  const t0 = NOW;
  let x = start.x, y = start.y, vx = 0, vy = 0, eqc = 'none';
  let pending = null, pendingAt = 0, sent = null, sentMadeAt = 0, lastSentAt = -1e9;
  const phoneSent = [];      /* [t, move] */
  const arrivals = [];       /* t of each move the room took in */
  const got = [];            /* [t, entry] */
  const truth = [];
  let nextFrame = NOW + FRAME_MS, nextBatch = NOW + BATCH_MS, nextTick = NOW + room.TICK_RATE;
  for (const leg of legs) {
    const end = NOW + leg.ms;
    if (leg.eqc) eqc = leg.eqc;
    vx = leg.dir ? leg.dir[0] * PER_FRAME : 0;
    vy = leg.dir ? leg.dir[1] * PER_FRAME : 0;
    while (NOW < end) {
      NOW += 1;
      x += vx * 0.0006; y += vy * 0.0006;
      truth.push([NOW - t0, x, y]);
      if (NOW >= nextFrame) {
        nextFrame += FRAME_MS;
        pending = Object.assign({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: 'wheel', vx: Math.round(vx), vy: Math.round(vy) }, base, { eqc });
        pendingAt = NOW;
      }
      if (NOW >= nextBatch) {
        nextBatch += BATCH_MS;
        if (pending) {
          let gap = BATCH_MS;
          /* the phone's own question (wsClient.js flushInputBuffer) */
          if (NOW - lastSentAt >= gap && dietMayWait(diet, pending, pendingAt, sent, sentMadeAt, CENTRE, WHEEL_SAFE_R)) gap = MOVE_DIET.GAP_MS;
          if (NOW - lastSentAt >= gap) {
            await send(room, B, pending);
            phoneSent.push([NOW - t0, pending]);
            arrivals.push(NOW - t0);
            sent = pending; sentMadeAt = pendingAt; lastSentAt = NOW; pending = null;
          }
        }
      }
      if (NOW >= nextTick) {
        nextTick += room.TICK_RATE;
        tickFn();
        for (const s of A.ws.sent) {
          const m = JSON.parse(s);
          if (m.type === 'tick' && m.players && m.players.db) got.push([NOW - t0, m.players.db, (m.seq % room.PRESENCE_REFRESH_TICKS) === 0]);
        }
        A.ws.sent.length = 0;
      }
    }
  }
  return { room, phoneSent, arrivals, got, truth, end: [x, y] };
}

/* the phone's drawing of another player (src/game/visualSystems.js, the
   other-player block, as in steady-movers.test.mjs §3) */
function drawn(updates, truth) {
  let o = null, k = 0, acc = 0;
  const err = [];
  for (const [t, x, y] of truth) {
    while (k < updates.length && updates[k][0] <= t) {
      const e = updates[k][1];
      if (!o) o = { x: e.x, y: e.y, rx: e.x, ry: e.y, svx: e.vx / 100, svy: e.vy / 100 };
      o.x = e.x; o.y = e.y; o.vx = e.vx / 100; o.vy = e.vy / 100;
      k++;
    }
    if (!o) continue;
    acc += 1;
    if (acc >= FRAME_MS) {
      acc -= FRAME_MS;
      const vk = 0.15, nk = 0.03, ik = 0.15;
      o.svx += (o.vx - o.svx) * vk; o.svy += (o.vy - o.svy) * vk;
      if (o.vx === 0 && Math.abs(o.svx) < 0.01) o.svx = 0;
      if (o.vy === 0 && Math.abs(o.svy) < 0.01) o.svy = 0;
      const dx = o.x - o.rx, dy = o.y - o.ry, d = Math.hypot(dx, dy);
      if (d > 100) { o.rx = o.x; o.ry = o.y; }
      else if (Math.abs(o.svx) > 0.005 || Math.abs(o.svy) > 0.005) {
        o.rx += o.svx; o.ry += o.svy;
        if (d > 30) { o.rx += dx * nk; o.ry += dy * nk; }
      } else if (d > 0.5) { o.rx += dx * ik; o.ry += dy * ik; }
      else { o.rx = o.x; o.ry = o.y; }
    }
    err.push(Math.hypot(o.rx - x, o.ry - y));
  }
  err.sort((a, b) => a - b);
  return { mean: err.reduce((a, b) => a + b, 0) / Math.max(1, err.length), p95: err[Math.floor(err.length * 0.95)] || 0, max: err[err.length - 1] || 0 };
}

/* ── 2. in a room ──────────────────────────────────────────────────────── */
const E = [1, 0], N = [0, -1], S = [0, 1], W = [-1, 0], NE = [Math.SQRT1_2, -Math.SQRT1_2];
{
  const legs = [{ ms: 2000, dir: E }];
  const on = await walk({}, legs, { diet: true });
  const off = await walk({}, legs, { diet: false });
  const perS = (n) => Math.round(n / 2);
  check('2a. a straight walk in Brotown: the phone sends about every GAP_MS (' + perS(on.phoneSent.length) + ' a second; '
    + perS(off.phoneSent.length) + ' without)', on.phoneSent.length <= off.phoneSent.length * 0.6 && on.phoneSent.length >= 2000 / (MOVE_DIET.GAP_MS + BATCH_MS),
    { on: on.phoneSent.length, off: off.phoneSent.length });
  const gaps = on.phoneSent.slice(1).map((g, i) => g[0] - on.phoneSent[i][0]);
  check('2b. ...never more than GAP_MS + a batch apart', gaps.every((g) => g <= MOVE_DIET.GAP_MS + BATCH_MS), { max: Math.max(...gaps) });
  /* the worker passes each spaced move on at once: every one the phone sent
     reaches the watcher on the first tick after it arrived (none held) */
  const lateness = on.arrivals.slice(1).map((t) => { const g = on.got.find((h) => h[0] >= t); return g ? g[0] - t : Infinity; });
  check('2c. the worker never holds a spaced move a tick more (each on the first tick after it came)',
    lateness.every((l) => l <= on.room.TICK_RATE), { worst: Math.max(...lateness) });
  check('2d. the watcher gets about what it got before (the worker held the rest anyway)',
    Math.abs(on.got.length - off.got.length) <= Math.max(3, off.got.length * 0.2), { on: on.got.length, off: off.got.length });
}
{
  /* a turn, a stop, a start, new gear: each out on the next batch, and to
     the watcher the very next tick */
  const legs = [{ ms: 600, dir: E }, { ms: 600, dir: N }, { ms: 500, dir: null }, { ms: 600, dir: W }, { ms: 600, dir: W, eqc: 'iron' }, { ms: 300, dir: null }];
  const r = await walk({}, legs, { diet: true });
  const lim = FRAME_MS + BATCH_MS + r.room.TICK_RATE + 1;
  const delay = (t, pred) => { const g = r.got.find((h) => h[0] >= t && pred(h[1])); return g ? g[0] - t : Infinity; };
  check('2e. a turn reaches the watcher at once', delay(600, (e) => e.vy < 0) <= lim, { delay: delay(600, (e) => e.vy < 0) });
  check('2f. a stop reaches the watcher at once', delay(1200, (e) => e.vx === 0 && e.vy === 0) <= lim, { delay: delay(1200, (e) => e.vx === 0 && e.vy === 0) });
  check('2g. a start reaches the watcher at once', delay(1700, (e) => e.vx < 0) <= lim, { delay: delay(1700, (e) => e.vx < 0) });
  check('2h. new gear reaches the watcher at once', delay(2300, (e) => e.eqc === 'iron') <= lim, { delay: delay(2300, (e) => e.eqc === 'iron') });
  const last = r.got[r.got.length - 1][1];
  check('2i. the walk\'s last place is sent', Math.abs(last.x - r.end[0]) <= 1 && Math.abs(last.y - r.end[1]) <= 1, { last, end: r.end });
}
{
  /* off the safe ground (out in the Frost Ridge's first stretch) the phone
     sends every move */
  const legs = [{ ms: 1500, dir: E }];
  const land = { x: 18985, y: 18985 };
  const on = await walk({}, legs, { diet: true, start: land });
  const off = await walk({}, legs, { diet: false, start: land });
  check('2j. off the safe ground every move goes, as before', on.phoneSent.length === off.phoneSent.length, { on: on.phoneSent.length, off: off.phoneSent.length });
}
{
  /* what the watcher DRAWS: straight runs, turns, a zigzag, stops */
  const legs = [{ ms: 1200, dir: E }, { ms: 800, dir: S }, { ms: 400, dir: null }, { ms: 900, dir: W }];
  for (let i = 0; i < 8; i++) legs.push({ ms: 250, dir: i % 2 ? NE : E });
  legs.push({ ms: 700, dir: N }, { ms: 500, dir: null });
  const on = await walk({}, legs, { diet: true });
  const hold = await walk({}, legs, { diet: false });
  const every = await walk({ steadymovers: false }, legs, { diet: false });
  const dOn = drawn(on.got, on.truth), dHold = drawn(hold.got, hold.truth), dEvery = drawn(every.got, every.truth);
  const r1 = (v) => Math.round(v * 10) / 10;
  console.log(`      drawn vs real, every move sent and passed on: mean ${r1(dEvery.mean)} px, 95% ${r1(dEvery.p95)}; the worker's hold alone: mean ${r1(dHold.mean)}, 95% ${r1(dHold.p95)}; `
    + `the phone's diet + the hold: mean ${r1(dOn.mean)}, 95% ${r1(dOn.p95)}; moves sent ${every.phoneSent.length} -> ${on.phoneSent.length}`);
  check('2k. the watcher draws the walker as close to where they are as with every move (mean within 1 px, 95% within ERR_PX + 1)',
    dOn.mean <= dEvery.mean + 1 && dOn.p95 <= dEvery.p95 + MOVE_DIET.ERR_PX + 1, { on: dOn, every: dEvery });
  check('2l. ...exactly as the worker\'s hold alone draws it (within 0.5 px): the phone keeps back what the worker would have held',
    Math.abs(dOn.mean - dHold.mean) <= 0.5 && Math.abs(dOn.p95 - dHold.p95) <= 0.5, { on: dOn, hold: dHold });
  check('2m. ...from fewer moves', on.phoneSent.length < every.phoneSent.length * 0.75, { on: on.phoneSent.length, every: every.phoneSent.length });
}

/* ── 3. the switch ─────────────────────────────────────────────────────── */
{
  const capsOf = async (flags) => {
    const { room } = await makeRoom(flags);
    const p = await join(room, 'dc');
    const ss = p.ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
    return ss && ss.caps;
  };
  const c1 = await capsOf({});
  const c2 = await capsOf({ movediet: false });
  check('3a. caps.movediet is advertised', !!c1 && c1.movediet === true, c1 && c1.movediet);
  check('3b. `movediet: false` in the live flags takes it away', !!c2 && c2.movediet === false, c2 && c2.movediet);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all move-diet checks passed');
