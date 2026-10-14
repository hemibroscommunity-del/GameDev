/* ═══ v2.3.3203: A PLAYER WALKING STEADILY IS SENT LESS OFTEN ═══
 *
 * steadymovers.js holds a Wheel player's update while they walk the line
 * their last update drew them on (within ERR_PX), for at most MAX_MS; a turn,
 * a stop, a start, a shove or any other change goes out at once.  Checked:
 *
 *   1. the rule on its own;
 *   2. a room: a walker beside a watcher, 30 moves a second like a phone --
 *      a straight walk is sent about every MAX_MS instead of on every tick,
 *      never more than MAX_MS + a tick apart; a turn, a stop, a start, new
 *      gear, a shove go out the very next tick; a far watcher still gets them;
 *      a presence tick holds nobody; `steadymovers: false` sends every move;
 *      nothing ever goes missing (the last place a walk ends is always sent);
 *   3. what a phone DRAWS: the phone's own dead reckoning
 *      (src/game/visualSystems.js, copied below) fed the updates the watcher
 *      got, on a walk of straight runs, turns, a zigzag and stops, with and
 *      without the hold: where it draws the walker, against where the walker
 *      really is;
 *   4. a SHAKY THUMB: the stick is analog (BroTown.jsx: its angle straight
 *      from the finger), so a real walk is never perfectly straight -- each
 *      move's heading drifts a little.  Still held about half the time, and
 *      still drawn where every update would draw it.
 */
import { GameRoom } from '../src/index.js';
import { STEADY, steadySig, steadyHold } from '../src/steadymovers.js';
import { FAR_PLAYERS } from '../src/tick.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;

/* ── 1. the rule ───────────────────────────────────────────────────────── */
{
  const w = (o) => Object.assign({ x: 1000, y: 1000, d: 'right', z: 'wheel', vx: 275, vy: 0, f: 'east', eqc: 'none', eql: 'none', eqs: 'none', ex: null }, o);
  const base = w({});
  const sig = steadySig(base);
  const last = { sentAt: 0, t: 0, x: 1000, y: 1000, vx: 275, vy: 0, sig };
  /* 275 hundredths of a px a 60 Hz frame = 0.165 px a ms */
  check('1a. the signature leaves out position and speed only', steadySig(w({ x: 5, y: 6, vx: 1, vy: 2 })) === sig
    && steadySig(w({ eqc: 'iron' })) !== sig && steadySig(w({ f: 'west' })) !== sig && steadySig(w({ spr: 1 })) !== sig
    && steadySig(w({ ex: 'mine' })) !== sig && steadySig(w({ z: 'town' })) !== sig);
  check('1b. never sent before: goes out', steadyHold(null, base, sig, 10, 10) === false);
  check('1c. on the line, inside MAX_MS: held', steadyHold(last, w({ x: 1000 + 0.165 * 40 }), sig, 40, 40) === true);
  check('1d. MAX_MS after the last one: goes out', steadyHold(last, w({ x: 1000 + 0.165 * STEADY.MAX_MS }), sig, STEADY.MAX_MS, STEADY.MAX_MS) === false);
  check('1e. ERR_PX off the line: held at the edge, out past it', steadyHold(last, w({ x: 1000 + 0.165 * 40, y: 1000 + STEADY.ERR_PX }), sig, 40, 40) === true
    && steadyHold(last, w({ x: 1000 + 0.165 * 40, y: 1000 + STEADY.ERR_PX + 0.01 }), sig, 40, 40) === false);
  check('1f. a turn (the line left behind): out', steadyHold(last, w({ x: 1003, y: 1004, vx: 0, vy: 275 }), sig, 33, 33) === false);
  check('1g. a stop: out at once, even on the spot', steadyHold(last, w({ x: 1000 + 0.165 * 22, vx: 0, vy: 0 }), sig, 22, 22) === false);
  check('1h. a start: out at once', steadyHold({ sentAt: 0, t: 0, x: 1000, y: 1000, vx: 0, vy: 0, sig }, w({ x: 1000.5, vx: 275 }), sig, 22, 22) === false);
  check('1i. standing still in place: held until MAX_MS', steadyHold({ sentAt: 0, t: 0, x: 1000, y: 1000, vx: 0, vy: 0, sig }, w({ vx: 0, vy: 0 }), sig, 44, 44) === true
    && steadyHold({ sentAt: 0, t: 0, x: 1000, y: 1000, vx: 0, vy: 0, sig }, w({ vx: 0, vy: 0 }), sig, STEADY.MAX_MS, STEADY.MAX_MS) === false);
  check('1j. new gear mid-walk: out', steadyHold(last, w({ x: 1000 + 0.165 * 22, eqc: 'iron' }), steadySig(w({ eqc: 'iron' })), 22, 22) === false);
  check('1k. a shove (a jump, same speed): out', steadyHold(last, w({ x: 1050 }), sig, 22, 22) === false);
  check('1l. a time that runs backwards: out', steadyHold(last, base, sig, -5, -5) === false && steadyHold(last, base, sig, 10, -5) === false);
  /* v2.3.3204: kept under SPACED_MS, which sends whatever comes later */
  check('1m. along the line: as far as the speed takes them, give or take a busy room\'s lateness', steadyHold(last, w({ x: 1000 + 0.165 * 20 }), sig, 44, 20) === true
    && steadyHold(last, w({ x: 1000 + 0.165 * (10 + STEADY.JITTER_MS) }), sig, 44, 10) === true
    && steadyHold(last, w({ x: 1000 + 0.165 * (10 + STEADY.JITTER_MS + 20) }), sig, 44, 10) === false);
  check('1o. v2.3.3204: a move SPACED_MS after the last one sent (by the moves\' times) goes out -- its phone spaced it',
    steadyHold(last, w({ x: 1000 + 0.165 * (STEADY.SPACED_MS - 1) }), sig, 50, STEADY.SPACED_MS - 1) === true
    && steadyHold(last, w({ x: 1000 + 0.165 * STEADY.SPACED_MS }), sig, 50, STEADY.SPACED_MS) === false
    && STEADY.SPACED_MS < STEADY.MAX_MS);
  check('1n. a thumb\'s wobble in the speed: held; a real change: out', steadyHold(last, w({ x: 1000 + 0.165 * 20, vx: 278, vy: 4 }), sig, 44, 20) === true
    && steadyHold(last, w({ x: 1000 + 0.165 * 20, vx: 300 }), sig, 44, 20) === false
    && steadyHold(last, w({ x: 1000 + 0.165 * 20, vy: 20 }), sig, 44, 20) === false);
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
  return { ws, id, x: 1000, y: 1000, z: 'town', eqc: 'none' };
}
async function move(room, p, x, y, z, vx, vy) {
  p.x = x; p.y = y; p.z = z;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx, vy,
    eqc: p.eqc, eql: 'none', eqs: 'none', dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
async function place(room, p, x, y) { await move(room, p, p.x, p.y, 'town', 0, 0); await move(room, p, x, y, 'wheel', 0, 0); }
const ARRIVAL = { x: 21504, y: 21792 };
const SPEED = 165;                       /* px a second, a phone's walk */
const PER_FRAME = SPEED / 60 * 100;      /* the move's vx/vy unit: hundredths of a px a 60 Hz frame */
const MOVE_MS = 33;                      /* a phone's move every 33 ms (wsClient.js MOVE_GAP_SEEN_MS) */

/* a seeded random number (mulberry32): the shaky thumb is the same every run */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A walk: a list of legs {ms, dir: [dx, dy] unit or null to stand, eqc?,
   wobble?}.  `wobble` is a shaky thumb: at every move the heading drifts by a
   random step of about that many degrees, pulled a tenth of the way back to
   `dir` each time.  Runs a phone's moves and the room's ticks on one clock
   (1 ms steps) and records what the watcher was sent about the walker, and
   where the walker really was at every ms. */
async function walkScenario(flags, legs, { far = false, seed = 7 } = {}) {
  const rnd = seeded(seed);
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const { room, tickFn } = await makeRoom(flags);
  const A = await join(room, 'sa');      /* the watcher */
  const B = await join(room, 'sb');      /* the walker */
  await place(room, A, far ? ARRIVAL.x + FAR_PLAYERS.NEAR_R + 600 : ARRIVAL.x, ARRIVAL.y);
  await place(room, B, ARRIVAL.x + 200, ARRIVAL.y);
  /* settle: a few ticks, past any presence tick */
  for (let i = 0; i < 5; i++) { NOW += room.TICK_RATE; tickFn(); }
  A.ws.sent.length = 0;
  const truth = [];      /* [t, x, y, vx, vy] every ms */
  const got = [];        /* [t, entry] B's entries the watcher was sent */
  const tickTimes = [];
  let x = B.x, y = B.y, vx = 0, vy = 0;
  let nextMove = NOW + 7, nextTick = NOW + room.TICK_RATE;
  const t0 = NOW;
  for (const leg of legs) {
    const end = NOW + leg.ms;
    if (leg.eqc) B.eqc = leg.eqc;
    vx = leg.dir ? leg.dir[0] * PER_FRAME : 0;
    vy = leg.dir ? leg.dir[1] * PER_FRAME : 0;
    const heading = leg.dir ? Math.atan2(leg.dir[1], leg.dir[0]) : 0;
    let off = 0;
    /* the stick moved: a phone sends the new speed on its next batch window */
    while (NOW < end) {
      NOW += 1;
      x += vx * 0.0006; y += vy * 0.0006;      /* 0.0006 = 60 / 100 / 1000: hundredths of a px a frame -> px a ms */
      truth.push([NOW - t0, x, y, vx, vy]);
      if (NOW >= nextMove) {
        nextMove += MOVE_MS;
        if (leg.dir && leg.wobble) {
          off += gauss() * leg.wobble * Math.PI / 180 - 0.1 * off;
          vx = Math.cos(heading + off) * PER_FRAME; vy = Math.sin(heading + off) * PER_FRAME;
        }
        await move(room, B, Math.round(x * 10) / 10, Math.round(y * 10) / 10, 'wheel', Math.round(vx), Math.round(vy));
      }
      if (NOW >= nextTick) {
        nextTick += room.TICK_RATE;
        tickFn();
        tickTimes.push(NOW - t0);
        for (const s of A.ws.sent) {
          const m = JSON.parse(s);
          if (m.type === 'tick' && m.players && m.players.sb) got.push([NOW - t0, m.players.sb, (m.seq % room.PRESENCE_REFRESH_TICKS) === 0]);
        }
        A.ws.sent.length = 0;
      }
    }
  }
  return { room, truth, got, tickTimes, end: [x, y] };
}

/* ── 2. in a room ──────────────────────────────────────────────────────── */
const E = [1, 0], N = [0, -1], S = [0, 1], W = [-1, 0], NE = [Math.SQRT1_2, -Math.SQRT1_2];
{
  const legs = [{ ms: 2000, dir: E }];
  const on = await walkScenario({}, legs);
  const off = await walkScenario({ steadymovers: false }, legs);
  const walkGot = on.got.filter((g) => g[0] > 100);
  const gaps = walkGot.slice(1).map((g, i) => g[0] - walkGot[i][0]);
  check('2a. a straight walk: about every MAX_MS (' + Math.round(1000 / (gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length))) + ' updates a second; '
    + Math.round(off.got.length / 2) + ' without the hold)', on.got.length < off.got.length * 0.6 && on.got.length > 2000 / (STEADY.MAX_MS + 30), { on: on.got.length, off: off.got.length });
  check('2b. ...never more than MAX_MS + a tick apart', gaps.every((g) => g <= STEADY.MAX_MS + on.room.TICK_RATE + 1), { max: Math.max(...gaps) });
  check('2c. `steadymovers: false`: on every tick the walker moved, as before', off.got.length >= on.tickTimes.length * 0.6, { off: off.got.length, ticks: on.tickTimes.length });
  /* /dev/overview's readout: the updates the room sent before (one a tick
     with a new move), the ones it sent, the share saved -- presence ticks
     (never held) left out of both */
  const info = on.room._steadyInfo(), infoOff = off.room._steadyInfo();
  const presence = on.got.filter((g) => g[2]).length;
  check('2l. the overview counts what it saved (' + JSON.stringify(info) + ')', info.on === true
    && Math.abs(info.moved - (off.got.length - presence)) <= 3 && Math.abs(info.sent - (on.got.length - presence)) <= 3
    && info.saved > 0.3 && infoOff.on === false && infoOff.moved === 0, { info, infoOff, on: on.got.length, off: off.got.length, presence });
}
{
  /* a turn, a stop, a start, new gear: each out on the next tick */
  const legs = [{ ms: 600, dir: E }, { ms: 600, dir: N }, { ms: 500, dir: null }, { ms: 600, dir: W }, { ms: 600, dir: W, eqc: 'iron' }, { ms: 300, dir: null }];
  const r = await walkScenario({}, legs);
  const at = (t) => r.got.find((g) => g[0] >= t);
  const delay = (t, pred) => { const g = r.got.find((h) => h[0] >= t && pred(h[1])); return g ? g[0] - t : Infinity; };
  /* the move after a change is at most MOVE_MS later, and its tick at most a TICK_RATE after that */
  const lim = MOVE_MS + r.room.TICK_RATE + 1;
  check('2d. a turn goes out at once', delay(600, (e) => e.vy < 0) <= lim, { delay: delay(600, (e) => e.vy < 0) });
  check('2e. a stop goes out at once', delay(1200, (e) => e.vx === 0 && e.vy === 0) <= lim, { delay: delay(1200, (e) => e.vx === 0 && e.vy === 0) });
  check('2f. a start goes out at once', delay(1700, (e) => e.vx < 0) <= lim, { delay: delay(1700, (e) => e.vx < 0) });
  check('2g. new gear mid-walk goes out at once', delay(2300, (e) => e.eqc === 'iron') <= lim, { delay: delay(2300, (e) => e.eqc === 'iron') });
  const last = r.got[r.got.length - 1][1];
  check('2h. the walk\'s last place is sent (nothing stuck)', Math.abs(last.x - r.end[0]) <= 1 && Math.abs(last.y - r.end[1]) <= 1, { last, end: r.end });
  check('2i. never a gap past MAX_MS + a tick while walking', r.got.slice(1).every((g, i) => g[0] - r.got[i][0] <= STEADY.MAX_MS + r.room.TICK_RATE + MOVE_MS), {});
  void at;
}
{
  /* a presence tick carries everyone: none of them is held */
  const r = await walkScenario({}, [{ ms: 3000, dir: E }]);
  const presence = r.got.filter((g) => g[2]).length;
  check('2j. a presence tick holds nobody (the walker in each one)', presence >= 2, { presence });
}
{
  /* a far watcher, with a far send of its own (`far_ms`, v2.3.3197's 250 ms):
     the far send still carries them */
  const FAR_MS = 250;
  const r = await walkScenario({ far_ms: FAR_MS }, [{ ms: 2000, dir: E }], { far: true });
  const gaps = r.got.slice(1).map((g, i) => g[0] - r.got[i][0]);
  check('2k. far_ms 250: a far watcher still gets them, every 250 ms or so', r.got.length >= 2000 / (FAR_MS + STEADY.MAX_MS + 30) && gaps.every((g) => g <= FAR_MS + STEADY.MAX_MS + 2 * 22 + 1), { n: r.got.length, max: Math.max(0, ...gaps) });
}
{
  /* v2.3.3243: and by default with the presence roster alone (FAR_PLAYERS.EVERY_MS 0):
     the far watcher gets them on the roster's ticks and no others */
  const r = await walkScenario({}, [{ ms: 2000, dir: E }], { far: true });
  check('2m. by default a far watcher gets them with the roster only, about once a second', r.got.length >= 1 && r.got.length <= 2 && r.got.every((g) => g[2]), { n: r.got.length, roster: r.got.map((g) => g[2]) });
}

/* ── 3. what the phone draws ───────────────────────────────────────────── */
/* src/game/visualSystems.js, the other-player block, per 1 ms frame step
   scaled to its 60 Hz terms (_dtScale = ms / 16.67) -- only the position:
   the velocity eased toward the last update's, the drawn place moved along
   it, pulled toward the update's place past 30 px, snapped past 100. */
function drawn(updates, truth) {
  let o = null;
  let k = 0;
  const err = [];
  const FRAME = 1000 / 60;
  let acc = 0;
  for (const [t, x, y] of truth) {
    while (k < updates.length && updates[k][0] <= t) {
      const e = updates[k][1];
      if (!o) o = { x: e.x, y: e.y, rx: e.x, ry: e.y, svx: e.vx / 100, svy: e.vy / 100 };
      o.x = e.x; o.y = e.y; o.vx = e.vx / 100; o.vy = e.vy / 100;
      k++;
    }
    if (!o) continue;
    acc += 1;
    if (acc >= FRAME) {   /* a 60 Hz phone frame */
      acc -= FRAME;
      const dt = 1;
      const vk = 1 - Math.pow(0.85, dt), nk = 1 - Math.pow(0.97, dt), ik = 1 - Math.pow(0.85, dt);
      o.svx += (o.vx - o.svx) * vk; o.svy += (o.vy - o.svy) * vk;
      if (o.vx === 0 && Math.abs(o.svx) < 0.01) o.svx = 0;
      if (o.vy === 0 && Math.abs(o.svy) < 0.01) o.svy = 0;
      const dx = o.x - o.rx, dy = o.y - o.ry, d = Math.hypot(dx, dy);
      if (d > 100) { o.rx = o.x; o.ry = o.y; }
      else if (Math.abs(o.svx) > 0.005 || Math.abs(o.svy) > 0.005) {
        o.rx += o.svx * dt; o.ry += o.svy * dt;
        if (d > 30) { o.rx += dx * nk; o.ry += dy * nk; }
      } else if (d > 0.5) { o.rx += dx * ik; o.ry += dy * ik; }
      else { o.rx = o.x; o.ry = o.y; }
    }
    err.push(Math.hypot(o.rx - x, o.ry - y));
  }
  err.sort((a, b) => a - b);
  return { mean: err.reduce((a, b) => a + b, 0) / Math.max(1, err.length), p95: err[Math.floor(err.length * 0.95)] || 0, max: err[err.length - 1] || 0 };
}
{
  /* straight runs, turns, a zigzag every 250 ms, a diagonal, stops */
  const legs = [{ ms: 1200, dir: E }, { ms: 800, dir: S }, { ms: 400, dir: null }, { ms: 900, dir: W }];
  for (let i = 0; i < 8; i++) legs.push({ ms: 250, dir: i % 2 ? NE : E });
  legs.push({ ms: 700, dir: N }, { ms: 500, dir: null });
  const on = await walkScenario({}, legs);
  const off = await walkScenario({ steadymovers: false }, legs);
  const dOn = drawn(on.got, on.truth), dOff = drawn(off.got, off.truth);
  const r1 = (v) => Math.round(v * 10) / 10;
  console.log(`      drawn vs real, every update: mean ${r1(dOff.mean)} px, 95% ${r1(dOff.p95)}, worst ${r1(dOff.max)}; with the hold: mean ${r1(dOn.mean)}, 95% ${r1(dOn.p95)}, worst ${r1(dOn.max)}; updates ${off.got.length} -> ${on.got.length}`);
  check('3a. the phone draws the walker as close to where they are as with every update (mean within 1 px)', dOn.mean <= dOff.mean + 1, { on: dOn, off: dOff });
  check('3b. ...and never more than ERR_PX + 1 px further off at the worst moments (95%)', dOn.p95 <= dOff.p95 + STEADY.ERR_PX + 1, { on: dOn, off: dOff });
  check('3c. with fewer updates', on.got.length < off.got.length * 0.75, { on: on.got.length, off: off.got.length });
}

/* ── 4. a shaky thumb ──────────────────────────────────────────────────── */
{
  /* bots and tests walk dead straight; a thumb does not.  2 degrees of drift
     a move is a shaky one (the hold's speed check allows ~2.3 at a walk) --
     still held about half the time, and drawn where every update draws it */
  const legs = [{ ms: 1500, dir: E, wobble: 2 }, { ms: 1500, dir: S, wobble: 2 }, { ms: 300, dir: null }];
  const on = await walkScenario({}, legs, { seed: 11 });
  const off = await walkScenario({ steadymovers: false }, legs, { seed: 11 });
  const dOn = drawn(on.got, on.truth), dOff = drawn(off.got, off.truth);
  const r1 = (v) => Math.round(v * 10) / 10;
  console.log(`      a shaky thumb (2 degrees a move): updates ${off.got.length} -> ${on.got.length}; drawn vs real, every update: mean ${r1(dOff.mean)} px, 95% ${r1(dOff.p95)}; with the hold: mean ${r1(dOn.mean)}, 95% ${r1(dOn.p95)}`);
  check('4a. a shaky thumb\'s walk is still held: at most 3/4 of the updates', on.got.length <= off.got.length * 0.75, { on: on.got.length, off: off.got.length });
  check('4b. ...and drawn as close to where they are as with every update (mean within 1 px, 95% within ERR_PX + 1)',
    dOn.mean <= dOff.mean + 1 && dOn.p95 <= dOff.p95 + STEADY.ERR_PX + 1, { on: dOn, off: dOff });
  const last = on.got[on.got.length - 1][1];
  check('4c. ...and its last place sent', Math.abs(last.x - on.end[0]) <= 1 && Math.abs(last.y - on.end[1]) <= 1, { last, end: on.end });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all steady-movers checks passed');
