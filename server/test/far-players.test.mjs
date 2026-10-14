/* ═══ v2.3.3197: FAR PLAYERS LESS OFTEN, POSITIONS IN WHOLE PIXELS ═══
 *
 * tick.js FAR_PLAYERS: a v2 session in the Wheel is sent the players within
 * NEAR_R of it on every tick, and the ones further off at most every EVERY_MS,
 * at the latest place they reached.  Every player's position and velocity go
 * out as whole numbers.  Checked here on a room with a fake clock:
 *
 *   1. positions and velocities are whole numbers; `roundpos: false` sends
 *      them as they came;
 *   2. a near mover arrives on every tick, a far one only when EVERY_MS has
 *      passed, at its latest position, and not again until it moves;
 *   3. a far mover's last step is sent even if nothing else happens (the
 *      quiet tick does not swallow it);
 *   4. NEAR_R is the line: at it you are near, a pixel past it far;
 *   5. a far player coming into reach is sent on the tick they cross;
 *   6. a v1 session in the Wheel, and sessions in other zones, get every
 *      mover every tick, as before;
 *   7. `farplayers: false` sends every mover every tick again;
 *   8. a player who left the Wheel before the far send is not sent as if
 *      still in it, and the presence roster still carries everyone;
 *   9. the two message builders agree byte for byte with far players about,
 *      ids that are array indexes included (they change JSON's key order).
 *
 * v2.3.3243: EVERY is 0 -- no far send, the far players go
 * with the presence roster (about once a second).  Sections 2-9 run with
 * `far_ms: 250` in the live flags, which brings v2.3.3197's far send back
 * (EVERY below), so they check that lever; section 10 checks the default:
 *  10. a far walker reaches a phone on the roster's ticks only, at its latest
 *      place; a near one on every tick; a far player who stopped is where it
 *      stopped at the next roster; nobody waits for a far send; `far_ms` is
 *      kept to 100-5000 ms; the two builders still agree byte for byte.
 */
import { GameRoom } from '../src/index.js';
import { FAR_PLAYERS } from '../src/tick.js';

/* v2.3.3243: the far send sections 2-9 check, brought back by `far_ms` */
const EVERY = 250;
const FLAGS = { steadymovers: false, far_ms: EVERY };

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* a clock the test moves, so EVERY is exact */
let NOW = 1_800_000_000_000;
const realNow = Date.now;
Date.now = () => NOW;

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom(flags) {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  /* v2.3.3203: these checks are about who is near and who is far, one tick's
     small test moves at a time -- which steady-movers holding (a player on
     the line their last update drew, steadymovers.js) would rightly hold.
     steady-movers.test.mjs checks that, with near and far players too. */
  room._liveFlags = Object.assign({}, flags || FLAGS);
  return { room, tickFn };
}
async function join(room, id, { pv = 2 } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return { ws, id, pv, x: 1000, y: 1000, z: 'town' };
}
async function move(room, p, x, y, z = p.z, vx = 1, vy = 0) {
  p.x = x; p.y = y; p.z = z;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx, vy, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
/* a jump anywhere: through town and back, as a zone change skips the
   speed bound (movement.js) */
async function place(room, p, x, y) {
  await move(room, p, p.x, p.y, 'town');
  await move(room, p, x, y, 'wheel');
}

/* one tick, 22 ms on; the players of the last tick each session got */
function step(room, tickFn, everyone) {
  NOW += room.TICK_RATE;
  for (const p of everyone) p.ws.sent.length = 0;
  tickFn();
}
function ticksOf(p) { return p.ws.sent.map((s) => JSON.parse(s)).filter((m) => m.type === 'tick'); }
function playersOf(p) { const t = ticksOf(p); return t.length ? (t[t.length - 1].players || {}) : null; }
/* step past a presence tick if the next one is one, so a check is about the
   far rule and not the roster */
function skipPresence(room, tickFn, everyone) {
  if (room.tickSeq % room.PRESENCE_REFRESH_TICKS === 0) step(room, tickFn, everyone);
}
/* "a far send has just happened" */
function freshFar(room) {
  if (room._farPending) room._farPending.clear();
  room._farLastAt = NOW;
}

const ARRIVAL = { x: 21504, y: 21792 };

/* a spot 5,000 px from town and as far from every monster as such spots get,
   so no fight interrupts the walk */
function quietSpot(room, r) {
  const ms = (room.monsters && room.monsters.wheel) || [];
  let best = null, bestD = -1;
  for (let a = 0; a < 360; a += 3) {
    const x = ARRIVAL.x + Math.cos(a * Math.PI / 180) * r, y = ARRIVAL.y + Math.sin(a * Math.PI / 180) * r;
    let d = Infinity;
    for (const m of ms) d = Math.min(d, Math.hypot(m.x - x, m.y - y));
    if (d > bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

const { room, tickFn } = await makeRoom();
const A = await join(room, 'fa');
const B = await join(room, 'fb');
const C = await join(room, 'fc');
const D1 = await join(room, 'fd', { pv: 1 });   /* v1 in the Wheel */
const T1 = await join(room, 'ft1');             /* two in today's town */
const T2 = await join(room, 'ft2');
const everyone = [A, B, C, D1, T1, T2];
const far = quietSpot(room, 5000);
await place(room, A, ARRIVAL.x, ARRIVAL.y);
await place(room, B, ARRIVAL.x + 1000, ARRIVAL.y);
await place(room, C, far.x, far.y);
await place(room, D1, ARRIVAL.x - 50, ARRIVAL.y);
await move(room, T1, 600, 600, 'town');
await move(room, T2, 640, 600, 'town');
step(room, tickFn, everyone);

/* ── 1. whole numbers ─────────────────────────────────────────────────── */
{
  skipPresence(room, tickFn, everyone);
  await move(room, B, ARRIVAL.x + 1000.37, ARRIVAL.y + 0.62, 'wheel', 12.6, -7.4);
  step(room, tickFn, everyone);
  const pb = (playersOf(A) || {}).fb;
  check('1a a position is sent in whole pixels', pb && pb.x === ARRIVAL.x + 1000 && pb.y === ARRIVAL.y + 1, pb);
  check('1b a velocity in whole numbers', pb && pb.vx === 13 && pb.vy === -7, pb);
  room._liveFlags = Object.assign({}, FLAGS, { roundpos: false });
  skipPresence(room, tickFn, everyone);
  await move(room, B, ARRIVAL.x + 1000.41, ARRIVAL.y + 0.62, 'wheel', 12.6, -7.4);
  step(room, tickFn, everyone);
  const pb2 = (playersOf(A) || {}).fb;
  check('1c roundpos: false sends them as they came', pb2 && pb2.x === ARRIVAL.x + 1000.41 && pb2.vx === 12.6, pb2);
  room._liveFlags = Object.assign({}, FLAGS);
}

/* ── 2. near every tick, far at most every EVERY ms (`far_ms`), at the latest */
{
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, B, B.x + 5, B.y);
  await move(room, C, C.x + 5, C.y);
  step(room, tickFn, everyone);
  const p1 = playersOf(A) || {};
  check('2a the near mover is sent on its tick', !!p1.fb, Object.keys(p1));
  check('2b the far mover is not, yet', !p1.fc, Object.keys(p1));
  const own = playersOf(C) || {};
  check('2c the far mover still gets its own move', !!own.fc, Object.keys(own));
  /* C walks on; nothing reaches A until EVERY ms have passed since the last far send */
  let sawEarly = false, sawAt = -1, got = null;
  const t0 = room._farLastAt;
  for (let i = 0; i < 20 && sawAt < 0; i++) {
    await move(room, C, C.x + 5, C.y);
    step(room, tickFn, everyone);
    const pc = (playersOf(A) || {}).fc;
    if (pc) {
      if (NOW - t0 < EVERY && room.tickSeq % room.PRESENCE_REFRESH_TICKS !== 1) sawEarly = true;
      sawAt = NOW - t0; got = pc;
    }
  }
  check('2d the far mover is held back until EVERY ms', !sawEarly && sawAt >= EVERY && sawAt < EVERY + 2 * room.TICK_RATE, { sawAt });
  check('2e ...and then sent where it is now', got && got.x === Math.round(C.x) && got.y === Math.round(C.y), { got, C: [C.x, C.y] });
  skipPresence(room, tickFn, everyone);
  step(room, tickFn, everyone);
  const p3 = playersOf(A);
  check('2f ...and not again while it stands', !p3 || !p3.fc, p3 && Object.keys(p3));
  /* about 30 moves a second came down to four */
  let sent = 0, moved = 0;
  const tStart = NOW;
  while (NOW - tStart < 2000) {
    await move(room, C, C.x + (moved % 2 ? -4 : 4), C.y); moved++;
    step(room, tickFn, everyone);
    if ((playersOf(A) || {}).fc) sent++;
  }
  check('2g over 2 s a far walker reaches A ~8-10 times (4 a second, plus the roster)', sent >= 7 && sent <= 12, { sent, moved });
}

/* ── 3. the last step is not lost on a quiet tick ─────────────────────── */
{
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, C, C.x + 3, C.y);
  let at = -1;
  const t0 = NOW;
  for (let i = 0; i < 20 && at < 0; i++) {
    step(room, tickFn, everyone);
    const pc = (playersOf(A) || {}).fc;
    if (pc && pc.x === Math.round(C.x)) at = NOW - t0;
  }
  check('3a a far player who stopped is sent within EVERY ms anyway', at >= 0 && at <= EVERY + room.TICK_RATE, { at });
}

/* ── 4. NEAR_R is the line ─────────────────────────────────────────────── */
{
  /* along the x axis only: A stands exactly at ARRIVAL */
  await place(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R - 1, ARRIVAL.y);
  step(room, tickFn, everyone);
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R, ARRIVAL.y);
  step(room, tickFn, everyone);
  check('4a at NEAR_R a mover is near', !!(playersOf(A) || {}).fb);
  await place(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R + 2, ARRIVAL.y);
  step(room, tickFn, everyone);
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R + 1, ARRIVAL.y);
  step(room, tickFn, everyone);
  check('4b a pixel past it, far', !(playersOf(A) || {}).fb, playersOf(A) && Object.keys(playersOf(A)));
}

/* ── 5. coming into reach ──────────────────────────────────────────────── */
{
  await place(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R + 50, ARRIVAL.y);
  step(room, tickFn, everyone);
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, B, ARRIVAL.x + FAR_PLAYERS.NEAR_R - 20, ARRIVAL.y);
  step(room, tickFn, everyone);
  check('5a a far player is sent on the tick it comes into reach', !!(playersOf(A) || {}).fb);
  await place(room, B, ARRIVAL.x + 1000, ARRIVAL.y);
  step(room, tickFn, everyone);
}

/* ── 6. a v1 session in the Wheel, and other zones, as before ──────────── */
{
  skipPresence(room, tickFn, everyone);
  freshFar(room);
  await move(room, C, C.x + 4, C.y);
  await move(room, T2, T2.x + 4, T2.y, 'town');
  step(room, tickFn, everyone);
  check('6a a v1 session in the Wheel gets the far mover on its tick', !!(playersOf(D1) || {}).fc, playersOf(D1) && Object.keys(playersOf(D1)));
  check('6b a session in town gets town\'s mover on its tick', !!(playersOf(T1) || {}).ft2);
  check('6c and nothing of the Wheel\'s', !(playersOf(T1) || {}).fc);
}

/* ── 7. the kill switch ────────────────────────────────────────────────── */
{
  room._liveFlags = Object.assign({}, FLAGS, { farplayers: false });
  skipPresence(room, tickFn, everyone);
  room._farLastAt = NOW;
  await move(room, C, C.x + 4, C.y);
  step(room, tickFn, everyone);
  check('7a farplayers: false sends the far mover on its tick', !!(playersOf(A) || {}).fc);
  check('7b and holds nothing back', !room._farPending);
  room._liveFlags = Object.assign({}, FLAGS);
}

/* ── 8. leaving the Wheel; the roster ──────────────────────────────────── */
{
  /* start just after a roster, so a far send comes before the next one */
  while (room.tickSeq % room.PRESENCE_REFRESH_TICKS !== 1) step(room, tickFn, everyone);
  freshFar(room);
  await move(room, C, C.x + 4, C.y);
  step(room, tickFn, everyone);
  await move(room, C, C.x, C.y, 'town');   /* gone before the far send */
  let sentAsWheel = false, sawFlush = false;
  for (let i = 0; i < 16; i++) {
    if (room.tickSeq % room.PRESENCE_REFRESH_TICKS === 0) break;
    const before = room._farLastAt;
    step(room, tickFn, everyone);
    if (room._farLastAt !== before) sawFlush = true;
    const pc = (playersOf(A) || {}).fc;
    if (pc && pc.z === 'wheel') sentAsWheel = true;
  }
  check('8a a far send happened', sawFlush);
  check('8b the player who left is not sent as still in the Wheel', !sentAsWheel);
  while (room.tickSeq % room.PRESENCE_REFRESH_TICKS !== 0) step(room, tickFn, everyone);
  step(room, tickFn, everyone);
  const roster = playersOf(A) || {};
  check('8c the presence roster carries everyone, far or not', !!roster.fc && roster.fc.z === 'town' && !!roster.fb && !!roster.ft1, Object.keys(roster));
  check('8d ...and leaves nothing held', !room._farPending || room._farPending.size === 0);
  await place(room, C, far.x, far.y);
  step(room, tickFn, everyone);
}

/* ── 9. byte for byte, ids that are array indexes included ─────────────── */
{
  const extra = [];
  for (const id of ['123', '7', 'fz']) { const p = await join(room, id); extra.push(p); everyone.push(p); }
  await place(room, extra[0], far.x - 300, far.y);              /* '123' far from A */
  await place(room, extra[1], ARRIVAL.x + 200, ARRIVAL.y + 100); /* '7' near A */
  await place(room, extra[2], ARRIVAL.x - 900, ARRIVAL.y);
  const verify = { checked: 0, mismatched: 0, first: null };
  room._tickShareVerify = verify;
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const walkers = [A, B, C, extra[0], extra[1], extra[2]];
  let farSends = 0, partial = 0;
  for (let t = 0; t < 200; t++) {
    for (const p of walkers) {
      if (rnd() < 0.6) await move(room, p, p.x + (rnd() - 0.5) * 10, p.y + (rnd() - 0.5) * 10);
    }
    const before = room._farLastAt;
    step(room, tickFn, everyone);
    if (room._farLastAt !== before) farSends++;
    const pa = playersOf(A);
    if (pa && !pa.fc && pa.fb) partial++;
  }
  room._tickShareVerify = null;
  check('9a messages were compared', verify.checked > 400, verify.checked);
  check('9b none differed', verify.mismatched === 0, verify.first);
  /* 200 ticks of 22 ms is 4.4 s: one far send every 12 ticks (264 ms) */
  check('9c far sends happened (~4 a second)', farSends >= 14 && farSends <= 22, farSends);
  check('9d and ticks carried only the near ones', partial > 50, partial);
}

/* ── 10. v2.3.3243: by default the far players go with the roster ──────── */
{
  const r2 = await makeRoom({ steadymovers: false });
  const room2 = r2.room, tick2 = r2.tickFn;
  const A2 = await join(room2, 'ga');
  const B2 = await join(room2, 'gb');
  const C2 = await join(room2, 'gc');
  const all2 = [A2, B2, C2];
  const far2 = quietSpot(room2, 5000);
  await place(room2, A2, ARRIVAL.x, ARRIVAL.y);
  await place(room2, B2, ARRIVAL.x + 1000, ARRIVAL.y);
  await place(room2, C2, far2.x, far2.y);
  step(room2, tick2, all2);
  check('10a the default sends no far players on their own (FAR_PLAYERS.EVERY_MS 0)', FAR_PLAYERS.EVERY_MS === 0 && room2._farEveryMs() === 0);
  /* both walk for 2.5 s: B near A, C far from it */
  let farTicks = 0, farOffRoster = 0, stale = null, nearMissed = 0, nearMoves = 0;
  const t0 = NOW;
  while (NOW - t0 < 2500) {
    await move(room2, B2, B2.x + (nearMoves % 2 ? -4 : 4), B2.y); nearMoves++;
    await move(room2, C2, C2.x + (nearMoves % 2 ? -4 : 4), C2.y);
    const roster = room2.tickSeq % room2.PRESENCE_REFRESH_TICKS === 0;
    step(room2, tick2, all2);
    const pa = playersOf(A2) || {};
    if (!pa.gb) nearMissed++;
    if (pa.gc) {
      farTicks++;
      if (!roster) farOffRoster++;
      if (pa.gc.x !== Math.round(C2.x) && !stale) stale = { sent: pa.gc.x, at: C2.x };
    }
  }
  const rosters = Math.floor(2500 / room2.TICK_RATE / room2.PRESENCE_REFRESH_TICKS);
  check(`10b a far walker reaches A on the roster's ticks only, about once a second (${farTicks} times in 2.5 s)`,
    farOffRoster === 0 && farTicks >= rosters && farTicks <= rosters + 1, { farTicks, farOffRoster, rosters });
  check('10c ...each time where it is now', !stale, stale);
  check('10d the near walker on every tick it moves, as before', nearMissed === 0, { nearMissed, nearMoves });
  check('10e nobody waits for a far send', !room2._farPending || room2._farPending.size === 0, room2._farPending && room2._farPending.size);
  /* C stops; its last place is at the next roster, and no tick runs early for it */
  skipPresence(room2, tick2, all2);
  await move(room2, C2, C2.x + 3, C2.y, 'wheel', 0, 0);
  let at = -1, sentEarly = false;
  for (let i = 0; i < room2.PRESENCE_REFRESH_TICKS + 2 && at < 0; i++) {
    const roster = room2.tickSeq % room2.PRESENCE_REFRESH_TICKS === 0;
    step(room2, tick2, all2);
    const pc = (playersOf(A2) || {}).gc;
    if (pc) { if (!roster) sentEarly = true; if (pc.x === Math.round(C2.x)) at = i; }
  }
  check('10f a far player who stopped is where it stopped at the next roster', at >= 0 && !sentEarly, { at, sentEarly });
  /* `far_ms` is kept to 100-5000 ms */
  room2._liveFlags = { steadymovers: false, far_ms: 20 };
  const low = room2._farEveryMs();
  room2._liveFlags = { steadymovers: false, far_ms: 99999 };
  const high = room2._farEveryMs();
  room2._liveFlags = { steadymovers: false, far_ms: 'often' };
  const junk = room2._farEveryMs();
  check('10g far_ms is kept to 100-5000 ms, and only a number counts', low === 100 && high === 5000 && junk === 0, { low, high, junk });
  /* turned on, a far send comes back; turned off again, it goes */
  room2._liveFlags = { steadymovers: false, far_ms: 250 };
  skipPresence(room2, tick2, all2);
  freshFar(room2);
  let back = 0;
  const t1 = NOW;
  while (NOW - t1 < 1000) {
    await move(room2, C2, C2.x + (back % 2 ? -4 : 4), C2.y);
    const roster = room2.tickSeq % room2.PRESENCE_REFRESH_TICKS === 0;
    step(room2, tick2, all2);
    if ((playersOf(A2) || {}).gc && !roster) back++;
  }
  check('10h far_ms 250 brings the far send back (~4 a second besides the roster)', back >= 3 && back <= 5, { back });
  room2._liveFlags = { steadymovers: false };
  /* the two builders, with the far players riding the roster */
  const verify = { checked: 0, mismatched: 0, first: null };
  room2._tickShareVerify = verify;
  let seed = 11;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let t = 0; t < 150; t++) {
    for (const p of all2) if (rnd() < 0.6) await move(room2, p, p.x + (rnd() - 0.5) * 10, p.y + (rnd() - 0.5) * 10);
    step(room2, tick2, all2);
  }
  room2._tickShareVerify = null;
  check(`10i the shared and the whole-message builders agree byte for byte (${verify.checked} messages)`, verify.checked > 200 && verify.mismatched === 0, verify.first);
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all far-players checks passed');
