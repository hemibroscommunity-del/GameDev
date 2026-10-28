/* ═══ v2.3.3726: THE MESSAGE DIET -- A STEADY WALK IS A PATH, NOT A STREAM ═══
 *
 * The phone (src/game/moveDiet.js pathMayWait / pathTurned, wsClient.js
 * movePathOn) sends a steady walk in the Wheel every 200 ms with its speed,
 * marked `pd: 1`, and a change at once; the worker (movepath.js) moves its
 * copy along that speed between moves.  Checked, with the switch off (today)
 * and on, a phone's frames and its 33 ms batch run on one clock with the
 * room's ticks and a network between them (MS_ONE_WAY each way, with a
 * wobble):
 *
 *   1. the phone's rule on its own, and its numbers against the worker's;
 *   2. how many moves a walking phone sends, seen and alone;
 *   3. NO ADDED LAG: the worker's copy is as close to the phone, on a walk
 *      of straight runs, turns, a zigzag and stops, as it is today -- and in
 *      the 150 ms after each turn; it never jumps more than a few px a tick
 *      (what a chasing monster follows);
 *   4. the watcher DRAWS the walker as close as today;
 *   5. never faster, never further: a speed past the bound glides at the
 *      bound; a phone gone quiet is left HORIZON_MS on; a move is judged
 *      from the last move's place (the budget), never from the guess; a
 *      server-placed player stops gliding; a wall is reported at once;
 *   6. off by default; `movepath: true` advertises it; an old phone (no
 *      `pd`) is never glided; the switch taken away stops every glide.
 */
import { GameRoom } from '../src/index.js';
import { MOVE_PATH as SERVER_PATH } from '../src/movepath.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { STEADY } from '../src/steadymovers.js';
import { MOVE_PATH, MOVE_DIET, pathSteady, pathMayWait, pathTurned, dietMayWait } from '../../src/game/moveDiet.js';
import { WHEEL_SAFE_R } from '../src/wheelspawns.js';
const CENTRE = [21504, 21504];

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const r1 = (v) => Math.round(v * 10) / 10;

let NOW = 1_760_000_000_000;
Date.now = () => NOW;

/* ── 1. the phone's rule ───────────────────────────────────────────────── */
{
  check('1a. the phone\'s GAP_MS is the worker\'s, under its HORIZON_MS, and the glider\'s send is the steady hold\'s',
    MOVE_PATH.GAP_MS === SERVER_PATH.GAP_MS && SERVER_PATH.HORIZON_MS > SERVER_PATH.GAP_MS + 33 && SERVER_PATH.SEND_MS === STEADY.MAX_MS
    && MOVE_PATH.MAX_V === Math.floor(MOVE_BUDGET.SPEED_PX / 60 * 100), { MOVE_PATH, SERVER_PATH });
  const mv = (o) => Object.assign({ type: 'move', x: 21500, y: 21700, d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none',
    ex: null, z: 'wheel', vx: 275, vy: 0, dodging: false, blocking: false, ba: null, dead: false, sp: undefined, pd: 1 }, o);
  const last = mv({});
  const at = (ms, o) => mv(Object.assign({ x: 21500 + 0.165 * ms }, o));
  check('1b. on the line, as far along as the speed: may wait, to 200 ms', pathSteady(last, at(100), 0, 100) && pathSteady(last, at(199), 0, 199));
  check('1c. along the line by more than ERR_PX + ALONG_MS of the speed (a wall, a monster\'s body): never',
    !pathSteady(last, at(100, { x: 21500 + 0.165 * 100 - 3.6 }), 0, 100) && !pathSteady(last, mv({ x: 21500 }), 0, 100));
  check('1d. a turn, a stop, a start, a sprint, a roll, a field: never, and each counts as a change (goes at once)',
    [{ vx: 0, vy: 275 }, { vx: 0 }, { sp: 1 }, { dodging: true }, { eqc: 'iron' }].every((o) => !pathSteady(last, at(50, o), 0, 50) && pathTurned(last, at(50, o))));
  check('1e. a shove at the same speed: not steady, but not a change (keeps today\'s rate)',
    !pathSteady(last, at(50, { y: 21710 }), 0, 50) && !pathTurned(last, at(50, { y: 21710 })));
  check('1f. faster than the walk bound (a lunge): never waits', !pathSteady(mv({ vx: 900 }), mv({ vx: 900, x: 21500 + 0.54 * 50 }), 0, 50));
  check('1g. the batch\'s question: only when the phone says so, in the Wheel, both moves marked',
    pathMayWait(true, at(100), 100, last, 0) && !pathMayWait(false, at(100), 100, last, 0)
    && !pathMayWait(true, at(100, { pd: undefined }), 100, mv({ pd: undefined }), 0)
    && !pathMayWait(true, at(100, { z: 'town' }), 100, mv({ z: 'town' }), 0) && !pathMayWait(true, at(100), 100, null, 0));
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
const SPEED = 165;                       /* px a second, a phone's walk */
const PER_FRAME = SPEED / 60 * 100;      /* hundredths of a px a 60 Hz frame */
const FRAME_MS = 1000 / 60;
const BATCH_MS = 33;                     /* wsClient.js INPUT_BATCH_WINDOW */
const MS_ONE_WAY = 40;                   /* the network, each way */
const WOBBLE_MS = 15;                    /* ...give or take, per message (in order, as a WebSocket is) */
const START = { x: 21504 + 200, y: 21792 };   /* Brotown, by the arrival */

/* deterministic wobble */
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/* A walk: legs {ms, dir: [dx, dy] unit or null, wall?: true (the phone is
   held where it is with the stick still pushed)}.  `path` is the switch and
   the phone's say together; `seen` picks the 33 ms rate (a player near), else
   66.  Records the moves the phone sent, what the watcher got, where the
   phone really was and where the worker's copy was at every tick. */
async function walk(legs, { path = false, seen = true, flags = null, start = START, old = false } = {}) {
  seed = 7;
  const { room, tickFn } = await makeRoom(flags || (path ? { movepath: true } : {}));
  const A = await join(room, 'pa');      /* the watcher */
  const B = await join(room, 'pb');      /* the walker */
  const base = { d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none', ex: null, dodging: false, blocking: false, ba: null, dead: false };
  for (const [p, x, y] of [[A, start.x - 120, start.y], [B, start.x, start.y]]) {
    await send(room, p, Object.assign({ type: 'move', x: 1000, y: 1000, z: 'town', vx: 0, vy: 0 }, base));
    await send(room, p, Object.assign({ type: 'move', x, y, z: 'wheel', vx: 0, vy: 0 }, base));
  }
  for (let i = 0; i < 5; i++) { NOW += room.TICK_RATE; tickFn(); }
  A.ws.sent.length = 0;
  const t0 = NOW;
  const pd = path && !old ? 1 : undefined;
  let x = start.x, y = start.y, vx = 0, vy = 0;
  let pending = null, pendingAt = 0, sent = null, sentMadeAt = 0, lastSentAt = -1e9, lastArrive = 0;
  const wire = [];           /* [arriveAt, move] in flight */
  const phoneSent = [], got = [], truth = [], copy = [], turns = [];
  let nextFrame = NOW + FRAME_MS, nextBatch = NOW + BATCH_MS, nextTick = NOW + room.TICK_RATE;
  let prevDir = null;
  for (const leg of legs) {
    const end = NOW + leg.ms;
    const dirKey = leg.dir ? leg.dir.join(',') : 'stop';
    if (prevDir !== null && dirKey !== prevDir) turns.push(NOW - t0);
    prevDir = dirKey;
    vx = leg.dir ? leg.dir[0] * PER_FRAME : 0;
    vy = leg.dir ? leg.dir[1] * PER_FRAME : 0;
    while (NOW < end) {
      NOW += 1;
      if (!leg.wall) { x += vx * 0.0006; y += vy * 0.0006; }
      truth.push([NOW - t0, x, y]);
      if (NOW >= nextFrame) {
        nextFrame += FRAME_MS;
        pending = Object.assign({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: 'wheel', vx: Math.round(vx), vy: Math.round(vy) }, base, { pd });
        pendingAt = NOW;
      }
      if (NOW >= nextBatch) {
        nextBatch += BATCH_MS;
        if (pending) {
          /* the phone's own question (wsClient.js flushInputBuffer) */
          let gap = seen ? BATCH_MS : 66;
          if (pending.pd === 1 && sent && sent.pd === 1) {
            if (pathMayWait(path && !old, pending, pendingAt, sent, sentMadeAt)) gap = MOVE_PATH.GAP_MS;
            else if (pathTurned(sent, pending)) gap = 0;
          }
          /* today's diet on the safe ground (v2.3.3204) */
          else if (NOW - lastSentAt >= gap && dietMayWait(true, pending, pendingAt, sent, sentMadeAt, CENTRE, WHEEL_SAFE_R)) gap = MOVE_DIET.GAP_MS;
          if (NOW - lastSentAt >= gap) {
            /* in order, as a WebSocket delivers */
            const arrive = Math.max(lastArrive, NOW + MS_ONE_WAY + Math.round((rnd() - 0.5) * 2 * WOBBLE_MS));
            lastArrive = arrive;
            wire.push([arrive, pending]);
            phoneSent.push([NOW - t0, pending]);
            sent = pending; sentMadeAt = pendingAt; lastSentAt = NOW; pending = null;
          }
        }
      }
      while (wire.length && wire[0][0] <= NOW) { await send(room, B, wire.shift()[1]); }
      if (NOW >= nextTick) {
        nextTick += room.TICK_RATE;
        tickFn();
        const ps = room.playerState.pb;
        copy.push([NOW - t0, ps.x, ps.y]);
        for (const s of A.ws.sent) {
          const m = JSON.parse(s);
          /* the watcher hears it MS_ONE_WAY later */
          if (m.type === 'tick' && m.players && m.players.pb) got.push([NOW - t0 + MS_ONE_WAY, m.players.pb]);
        }
        A.ws.sent.length = 0;
      }
    }
  }
  return { room, phoneSent, got, truth, copy, turns, end: [x, y] };
}

/* the worker's copy against where the phone is NOW, at every tick; and the
   copy's steps from tick to tick (what a chasing monster follows) */
function copyErr(r, only) {
  const T = new Map(r.truth.map(([t, x, y]) => [t, [x, y]]));
  const err = [];
  for (const [t, x, y] of r.copy) {
    if (only && !only(t)) continue;
    const p = T.get(t); if (!p) continue;
    err.push(Math.hypot(x - p[0], y - p[1]));
  }
  err.sort((a, b) => a - b);
  return { mean: err.reduce((a, b) => a + b, 0) / Math.max(1, err.length), p95: err[Math.floor(err.length * 0.95)] || 0, max: err[err.length - 1] || 0, n: err.length };
}
/* the biggest step, and how many ticks jumped: a step more than JUMP_PX
   past what the walk itself covers in a tick */
const JUMP_PX = 4;
function copySteps(r, tickMs) {
  let worst = 0, jumps = 0;
  const walkStep = SPEED * tickMs / 1000;
  for (let i = 1; i < r.copy.length; i++) {
    const st = Math.hypot(r.copy[i][1] - r.copy[i - 1][1], r.copy[i][2] - r.copy[i - 1][2]);
    worst = Math.max(worst, st);
    if (st > walkStep + JUMP_PX) jumps++;
  }
  return { worst, jumps, ticks: r.copy.length };
}

/* the phone's drawing of another player (src/game/visualSystems.js, as in
   steady-movers.test.mjs §3 and move-diet.test.mjs) */
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

const E = [1, 0], N = [0, -1], S = [0, 1], W = [-1, 0], NE = [Math.SQRT1_2, -Math.SQRT1_2];
const ZIG = [{ ms: 1200, dir: E }, { ms: 800, dir: S }, { ms: 400, dir: null }, { ms: 900, dir: W }];
for (let i = 0; i < 8; i++) ZIG.push({ ms: 250, dir: i % 2 ? NE : E });
ZIG.push({ ms: 700, dir: N }, { ms: 500, dir: null });
for (let i = 0; i < 6; i++) ZIG.push({ ms: 180, dir: i % 2 ? W : E });   /* a hard back-and-forth: the dodger's zigzag */
ZIG.push({ ms: 400, dir: null });

/* ── 2. moves a second ─────────────────────────────────────────────────── */
const rates = {};
{
  const legs = [{ ms: 3000, dir: E }];
  /* out in a land (the Frost Ridge's first stretch, as move-diet.test.mjs)
     every move goes today; on the safe ground today's diet (v2.3.3204)
     already sends a steady walk at 15 */
  const LAND = { x: 18985, y: 18985 };
  for (const seen of [true, false]) {
    const off = await walk(legs, { path: false, seen, start: LAND });
    const on = await walk(legs, { path: true, seen, start: LAND });
    rates[seen ? 'seen' : 'alone'] = { off: r1(off.phoneSent.length / 3), on: r1(on.phoneSent.length / 3) };
  }
  {
    const off = await walk(legs, { path: false, seen: true });
    const on = await walk(legs, { path: true, seen: true });
    rates.town = { off: r1(off.phoneSent.length / 3), on: r1(on.phoneSent.length / 3) };
  }
  const zOff = await walk(ZIG, { path: false, seen: true });
  const zOn = await walk(ZIG, { path: true, seen: true });
  const zs = ZIG.reduce((a, l) => a + l.ms, 0) / 1000;
  rates.zigzag = { off: r1(zOff.phoneSent.length / zs), on: r1(zOn.phoneSent.length / zs) };
  console.log('      moves a walking phone sends a second -- straight in a land, seen: ' + rates.seen.off + ' -> ' + rates.seen.on
    + '; straight in a land, alone: ' + rates.alone.off + ' -> ' + rates.alone.on + '; straight in Brotown: ' + rates.town.off + ' -> ' + rates.town.on
    + '; the zigzag walk in Brotown, seen: ' + rates.zigzag.off + ' -> ' + rates.zigzag.on);
  check('2a. a straight walk: about 5 a second with the path, seen or alone, in a land or in Brotown (30, 15 and 15 today)',
    rates.seen.on <= 5.5 && rates.alone.on <= 5.5 && rates.town.on <= 5.5 && rates.seen.off >= 25 && rates.alone.off >= 13, rates);
  check('2b. the zigzag (turns every 180-250 ms) still sends fewer than half', rates.zigzag.on < rates.zigzag.off / 2, rates.zigzag);
  const on = await walk(legs, { path: true });
  const gaps = on.phoneSent.slice(1).map((g, i) => g[0] - on.phoneSent[i][0]);
  check('2c. ...never more than GAP_MS + a batch apart', gaps.every((g) => g <= MOVE_PATH.GAP_MS + BATCH_MS), { max: Math.max(...gaps) });
}

/* ── 3. no added lag: the worker's copy ────────────────────────────────── */
const zig = {};
let on0Tick = 22;
{
  for (const seen of [true, false]) {
    const off = await walk(ZIG, { path: false, seen });
    const on = await walk(ZIG, { path: true, seen });
    on0Tick = on.room.TICK_RATE;
    const near = (r) => (t) => r.turns.some((u) => t >= u && t <= u + 150);
    zig[seen ? 'seen' : 'alone'] = {
      off: copyErr(off), on: copyErr(on),
      offTurn: copyErr(off, near(off)), onTurn: copyErr(on, near(on)),
      offStep: copySteps(off, off.room.TICK_RATE), onStep: copySteps(on, on.room.TICK_RATE),
      offSent: off.phoneSent.length, onSent: on.phoneSent.length,
      offDraw: drawn(off.got, off.truth), onDraw: drawn(on.got, on.truth),
    };
  }
  for (const k of ['seen', 'alone']) {
    const z = zig[k];
    console.log(`      ${k}: the copy from the phone, today: mean ${r1(z.off.mean)} px, 95% ${r1(z.off.p95)}, worst ${r1(z.off.max)}; `
      + `with the path: mean ${r1(z.on.mean)}, 95% ${r1(z.on.p95)}, worst ${r1(z.on.max)}`);
    console.log(`      ${k}: in the 150 ms after a turn, today: mean ${r1(z.offTurn.mean)}, 95% ${r1(z.offTurn.p95)}; with the path: mean ${r1(z.onTurn.mean)}, 95% ${r1(z.onTurn.p95)}`);
    console.log(`      ${k}: the copy's biggest step in a tick, today ${r1(z.offStep.worst)} px, with the path ${r1(z.onStep.worst)} px; `
      + `ticks it jumped (${JUMP_PX}+ px past the walk's own step), today ${z.offStep.jumps} of ${z.offStep.ticks}, with the path ${z.onStep.jumps}; moves sent ${z.offSent} -> ${z.onSent}`);
    console.log(`      ${k}: the watcher draws the walker off by, today: mean ${r1(z.offDraw.mean)} px, 95% ${r1(z.offDraw.p95)}; with the path: mean ${r1(z.onDraw.mean)}, 95% ${r1(z.onDraw.p95)}`);
  }
  for (const k of ['seen', 'alone']) {
    const z = zig[k];
    check(`3a. ${k}: the copy is no further from the phone than today (mean and 95%, within 1 px)`,
      z.on.mean <= z.off.mean + 1 && z.on.p95 <= z.off.p95 + 1, { on: z.on, off: z.off });
    check(`3b. ${k}: ...nor in the 150 ms after a turn (within 2 px)`,
      z.onTurn.mean <= z.offTurn.mean + 2 && z.onTurn.p95 <= z.offTurn.p95 + 2, { on: z.onTurn, off: z.offTurn });
    /* the one jump left is a hard reversal's correction: the copy went on the
       old way for a batch and the network's one way, then is put right */
    const most = 2 * SPEED * (BATCH_MS + MS_ONE_WAY + WOBBLE_MS) / 1000 + SPEED * on0Tick / 1000;
    check(`3c. ${k}: the copy jumps on fewer ticks than today (a chasing monster follows a walk), and never past a reversal's correction`,
      z.onStep.jumps <= z.offStep.jumps && z.onStep.worst <= most, { on: z.onStep, off: z.offStep, most });
    check(`4a. ${k}: the watcher draws the walker as close as today (mean within 1 px, 95% within 2)`,
      z.onDraw.mean <= z.offDraw.mean + 1 && z.onDraw.p95 <= z.offDraw.p95 + 2, { on: z.onDraw, off: z.offDraw });
  }
  /* a turn, a stop, a start reach the watcher no later than today */
  const legs = [{ ms: 600, dir: E }, { ms: 600, dir: N }, { ms: 500, dir: null }, { ms: 600, dir: W }, { ms: 300, dir: null }];
  const off = await walk(legs, { path: false }), on = await walk(legs, { path: true });
  const delay = (r, t, pred) => { const g = r.got.find((h) => h[0] >= t && pred(h[1])); return g ? g[0] - t : Infinity; };
  const evs = [[600, (e) => e.vy < 0, 'turn'], [1200, (e) => e.vx === 0 && e.vy === 0, 'stop'], [1700, (e) => e.vx < 0, 'start']];
  const ds = evs.map(([t, p, n]) => ({ n, off: delay(off, t, p), on: delay(on, t, p) }));
  console.log('      a change reaching the watcher, ms (today -> with the path): ' + ds.map((d) => `${d.n} ${d.off} -> ${d.on}`).join(', '));
  check('4b. a turn, a stop and a start reach the watcher no later than today (within a tick)', ds.every((d) => d.on <= d.off + 23), ds);
  const last = on.got[on.got.length - 1][1];
  check('4c. the walk\'s last place is sent', Math.abs(last.x - on.end[0]) <= 1 && Math.abs(last.y - on.end[1]) <= 1, { last, end: on.end });
}

/* ── 5. never faster, never further ────────────────────────────────────── */
{
  /* a wall: the phone stands with the stick pushed; it reports at once and
     the copy runs on into it for at most a batch's worth */
  const r = await walk([{ ms: 600, dir: E }, { ms: 600, dir: E, wall: true }, { ms: 200, dir: null }], { path: true });
  const wallX = r.truth.find((p) => p[0] === 600)[1];
  const over = Math.max(...r.copy.filter((c) => c[0] > 600 && c[0] < 1200).map((c) => c[1] - wallX));
  console.log(`      a wall: the copy ran on past it by at most ${r1(over)} px`);
  check('5a. a wall: the copy runs on into it by at most a few px (the phone reports at once)', over <= 10, { over });
}
{
  const { room, tickFn } = await makeRoom({ movepath: true });
  const B = await join(room, 'pc');
  const base = { d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none', ex: null, dodging: false, blocking: false, ba: null, dead: false, pd: 1 };
  await send(room, B, Object.assign({ type: 'move', x: 1000, y: 1000, z: 'town', vx: 0, vy: 0 }, base));
  await send(room, B, Object.assign({ type: 'move', x: 21704, y: 21792, z: 'wheel', vx: 0, vy: 0 }, base));
  for (let i = 0; i < 5; i++) { NOW += room.TICK_RATE; tickFn(); }
  const ps = room.playerState.pc;
  /* a speed far past the bound: the copy glides at the bound, and stops
     HORIZON_MS on */
  NOW += 200;
  await send(room, B, Object.assign({ type: 'move', x: 21704, y: 21792, z: 'wheel', vx: 5000, vy: 0 }, base));
  const x0 = ps.x;
  for (let i = 0; i < 30; i++) { NOW += room.TICK_RATE; tickFn(); }
  const went = ps.x - x0;
  const most = MOVE_BUDGET.SPEED_PX * SERVER_PATH.HORIZON_MS / 1000;
  console.log(`      a speed of 30 px a frame claimed, then silence: the copy went ${r1(went)} px (the bound for ${SERVER_PATH.HORIZON_MS} ms: ${most})`);
  check('5b. a speed past the bound glides at the bound, and a phone gone quiet is left HORIZON_MS on', went <= most + 0.01 && went >= most - 1, { went, most });
  /* the next move is judged from the last MOVE's place, not the guess: a
     script cannot glide and then spend a whole budget on top */
  const g0 = ps._mp && ps._mp.x;
  ps._mvBudget = 0; ps._mvBudgetAt = NOW;
  NOW += 100;
  await send(room, B, Object.assign({ type: 'move', x: x0 + 400, y: 21792, z: 'wheel', vx: 0, vy: 0 }, base));
  const reach = MOVE_BUDGET.SPEED_PX * 0.1;
  check('5c. a move is judged from the last move\'s place (the glide is never spent on top of the budget)',
    g0 === x0 && ps.x <= x0 + reach + 0.01, { from: g0, x: ps.x, x0, reach });
  /* the worker puts them somewhere itself: the glide stops */
  NOW += 300;
  await send(room, B, Object.assign({ type: 'move', x: ps.x, y: 21792, z: 'wheel', vx: 0, vy: 0 }, base));
  NOW += 200;
  await send(room, B, Object.assign({ type: 'move', x: ps.x + 0.165 * 200 > 0 ? ps.x : ps.x, y: 21792, z: 'wheel', vx: 275, vy: 0 }, base));
  NOW += room.TICK_RATE; tickFn();
  ps.x = 21000; ps.y = 21000;   /* a lunge, a dash */
  for (let i = 0; i < 5; i++) { NOW += room.TICK_RATE; tickFn(); }
  check('5d. once the worker puts them somewhere itself, the glide stops', ps.x === 21000 && ps.y === 21000 && (!room._mpGliding || !room._mpGliding.has('pc')), { x: ps.x, y: ps.y });
  /* dead: no glide */
  await send(room, B, Object.assign({ type: 'move', x: 21000, y: 21000, z: 'wheel', vx: 275, vy: 0 }, base, { dead: true }));
  NOW += room.TICK_RATE; tickFn();
  check('5e. a dead player is never glided', ps.x === 21000, { x: ps.x });
}

/* ── 6. the switch ─────────────────────────────────────────────────────── */
{
  const capsOf = async (flags) => {
    const { room } = await makeRoom(flags);
    const p = await join(room, 'pz');
    const ss = p.ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
    return ss && ss.caps;
  };
  const c0 = await capsOf({}), c1 = await capsOf({ movepath: true }), c2 = await capsOf({ movepath: false });
  check('6a. OFF by default: caps.movepath is false with no flag', !!c0 && c0.movepath === false, c0 && c0.movepath);
  check('6b. `movepath: true` advertises it; `movepath: false` does not', c1.movepath === true && c2.movepath === false, { c1: c1.movepath, c2: c2.movepath });
  /* with the switch off a phone's `pd` changes nothing: the copy is where
     the moves put it, exactly as without the field */
  const legs = [{ ms: 800, dir: E }, { ms: 300, dir: N }];
  const plain = await walk(legs, { path: false });
  const offPd = await walk(legs, { path: false, flags: {} });
  const same = plain.copy.length === offPd.copy.length && plain.copy.every((c, i) => c[1] === offPd.copy[i][1] && c[2] === offPd.copy[i][2]);
  check('6c. switched off, the worker moves nobody between moves (the copy as today)', same && !(plain.room._mpGliding && plain.room._mpGliding.size));
  /* an old phone (no pd) against a worker switched on: as today */
  const oldOn = await walk(legs, { path: true, old: true });
  const same2 = oldOn.copy.every((c, i) => c[1] === plain.copy[i][1] && c[2] === plain.copy[i][2]);
  check('6d. an old phone (no `pd`) against a worker switched on: sent and moved exactly as today', same2 && oldOn.phoneSent.length === plain.phoneSent.length,
    { a: oldOn.phoneSent.length, b: plain.phoneSent.length });
  /* switched off mid-walk: the glide stops on the next tick */
  const { room, tickFn } = await makeRoom({ movepath: true });
  const B = await join(room, 'py');
  const base = { d: 'right', f: 'east', eqc: 'none', eql: 'none', eqs: 'none', ex: null, dodging: false, blocking: false, ba: null, dead: false, pd: 1 };
  await send(room, B, Object.assign({ type: 'move', x: 1000, y: 1000, z: 'town', vx: 0, vy: 0 }, base));
  await send(room, B, Object.assign({ type: 'move', x: 21704, y: 21792, z: 'wheel', vx: 0, vy: 0 }, base));
  NOW += 100;
  await send(room, B, Object.assign({ type: 'move', x: 21704, y: 21792, z: 'wheel', vx: 275, vy: 0 }, base));
  NOW += room.TICK_RATE; tickFn();
  const moved = room.playerState.py.x > 21704;
  room._liveFlags = {};
  const xs = room.playerState.py.x;
  NOW += room.TICK_RATE; tickFn();
  check('6e. the switch taken away stops every glide from the next tick', moved && room.playerState.py.x === xs, { moved, x: room.playerState.py.x, xs });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all move-path checks passed');
