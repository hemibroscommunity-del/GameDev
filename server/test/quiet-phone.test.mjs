/* ═══ v2.3.3254: THE QUIET PHONE (server/src/bundle.js, src/game/quietPhone.js) ═══
 *
 * Owner, 2026-10-14: "I want you to cut as much as you possibly can IF the
 * loss in quality is negligible or unnoticeable."
 *
 *   1. A BUNDLE is taken exactly as its messages one by one: two rooms in
 *      lockstep, one sent each message as a frame of its own, the other the
 *      same messages as bundles -- every player's state, every session's AFK
 *      clock and round trip, every message the rooms send out and every event
 *      they relay, the same;
 *   2. what a bundle may not carry: a join, an array, a string, a number;
 *      no more than BUNDLE.MAX; a bundle over the frame gate is dropped whole;
 *      a message that ends the session ends the bundle there;
 *   3. THE PING'S ANSWER: one held `hd` ms is measured without the wait; one
 *      for an older ping is no sample; `hd` past the sample counts as 0; an
 *      old phone's answer (no `hd`) is measured as before;
 *   4. caps.bundle and caps.quiet are advertised; `bundle: false` and `quiet:
 *      false` in the live flags take them back, and a room still TAKES a
 *      bundle;
 *   5. the phone's numbers match the worker's: NEAR_R, BUNDLE_MAX, the frame
 *      gate, the look's news (LOOK_RELAY), the move gaps, the map's heartbeat;
 *   6. the phone's rules: what in a look is news -- and never hold back
 *      anything the worker would relay (lookDelta, 3,000 random looks); who is
 *      near; the move gap; the keepalive; frames;
 *   7. the game's own files call all of it.
 *
 * v2.3.3291, found by the architecture review (2026-10-17):
 *   8. ONE AT A TIME: a bundle's parts each FINISH before the next begins.
 *      On a storage that answers a little late and hands back copies (as a
 *      Durable Object does), 24 harvests of one ripe bed in one bundle pay one
 *      harvest; ten ore sold 24 times in one bundle are paid for once; 24 buys
 *      out of a pile of one take one.  Before: 48 carrots, 4,320 gold, 24 ore.
 *   9. THE ROUTER WAITS: every call in _onMessage to a method that is async
 *      is awaited or returned there and then, and the bundle loop awaits
 *      _onMessage -- the static half of 8, so a new case cannot start the race
 *      again.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join as pjoin } from 'node:path';
import { GameRoom } from '../src/index.js';
import { BUNDLE, bundleParts } from '../src/bundle.js';
import { FAR_PLAYERS } from '../src/tick.js';
import { LOOK_RELAY, lookDelta } from '../src/lookrelay.js';
import { QUIET, LOOK_NEWS, lookNews, peerNear, quietMoveGap, keepaliveDue, framesOf, quietOn, bundleOn } from '../../src/game/quietPhone.js';
import { PRESENCE2_CLIENT } from '../../src/game/presence2.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = pjoin(here, '..', '..');
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_800_000_000_000;
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
async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return 0;
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return { ws, id };
}
const capsOf = (p) => {
  for (const s of p.ws.sent) { const m = JSON.parse(s); if (m.type === 'state_sync') return m.caps || {}; }
  return null;
};

/* ── 1. a bundle is its messages, one by one ─────────────────────────────── */
{
  const A = await makeRoom(), B = await makeRoom();
  const a1 = await join(A.room, 'p1'), a2 = await join(A.room, 'p2');
  const b1 = await join(B.room, 'p1'), b2 = await join(B.room, 'p2');
  /* the watcher stands beside the walker in the Wheel, so the swings and
     emotes reach it (a fight's events go to the phones near it, v2.3.3245) */
  for (const [R, w] of [[A.room, a2], [B.room, b2]]) {
    await R.webSocketMessage(w.ws, JSON.stringify({ type: 'move', x: 21504, y: 21792, d: 'down', f: 'south', z: 'wheel', vx: 0, vy: 0, ex: null, dead: false }));
  }
  const look = (n) => ({ x: 1000 + n, y: 1000, name: 'p1', avatar: 'a', aw: 0, dir: 'down', hw: n % 3 === 0 ? 'cap' : 'none', rpgHp: 40 + n, rpgMaxHp: 50, zone: 'wheel', rpgData: { kills: n, weapon: 'Fists' } });
  /* a minute of a walking, swinging, answering phone, in moments */
  const moments = [];
  let x = 21504, y = 21792;
  for (let i = 0; i < 120; i++) {
    const m = [];
    x += 5; y += (i % 7) - 3;
    m.push({ type: 'move', x, y, d: 'right', f: 'east', z: 'wheel', vx: 300, vy: 0, eqc: 'none', eql: 'none', eqs: 'none', ex: null, dodging: false, blocking: false, ba: null, dead: false });
    if (i % 5 === 0) m.push({ type: 'player_swing', payload: { id: 'p1', ts: NOW, kind: 'melee' } });
    if (i % 9 === 0) m.push({ type: 'emote', payload: { id: 'p1', emoji: '👋' } });   /* v2.3.3391: a listed emote (emotes.js) */
    if (i % 4 === 0) m.push({ type: 'track', data: look(i) });
    if (i % 11 === 0) m.push({ type: 'pong', ts: 0, hd: 5 });
    moments.push(m);
  }
  let k = 0;
  for (const m of moments) {
    NOW += 50;
    if (k % 11 === 0) {
      /* a ping out, the same in both rooms */
      for (const R of [A.room, B.room]) for (const [, s] of R.sessions) s.lastPing = NOW - 30;
      for (const mm of m) if (mm.type === 'pong') mm.ts = NOW - 30;
    }
    for (const mm of m) await A.room.webSocketMessage(a1.ws, JSON.stringify(mm));
    await B.room.webSocketMessage(b1.ws, JSON.stringify(m));
    if (k % 3 === 0) { A.tickFn(); B.tickFn(); }
    k++;
  }
  A.tickFn(); B.tickFn();
  const strip = (ps) => JSON.stringify(ps, (key, v) => (typeof v === 'function' ? undefined : v));
  check('a bundle: every player\'s state the same as its messages one by one', strip(A.room.playerState) === strip(B.room.playerState));
  const sa = A.room.sessions.get(a1.ws), sb = B.room.sessions.get(b1.ws);
  check('a bundle: the AFK clock and the round trip the same', sa.lastRecv === sb.lastRecv && Math.abs(sa.rtt - sb.rtt) < 1e-9 && sa.moveSig === sb.moveSig, { a: [sa.lastRecv, sa.rtt], b: [sb.lastRecv, sb.rtt] });
  /* a session's own random token is the only thing two rooms may differ in */
  const norm = (arr) => arr.join('\n').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'UUID');
  const outA = norm(a2.ws.sent), outB = norm(b2.ws.sent);
  check('a bundle: the other phone is sent exactly the same messages', outA === outB && a2.ws.sent.length > 10, { a: a2.ws.sent.length, b: b2.ws.sent.length });
  const outA1 = norm(a1.ws.sent), outB1 = norm(b1.ws.sent);
  check('a bundle: the sender itself is sent exactly the same messages', outA1 === outB1, { a: a1.ws.sent.length, b: b1.ws.sent.length });
  check('a bundle: the swings and emotes relayed (the default branch), as one by one', /player_swing/.test(outB) && /emote/.test(outB));
}

/* ── 2. what a bundle may not carry ──────────────────────────────────────── */
{
  const parts = bundleParts([{ type: 'move' }, { type: 'join', id: 'x' }, [{ type: 'move' }], 'move', 7, null, { type: 'emote' }]);
  check('bundleParts: a join, an array, a string, a number and null are left out, the order kept', parts.length === 2 && parts[0].type === 'move' && parts[1].type === 'emote', parts);
  const many = bundleParts(Array.from({ length: 40 }, (_, i) => ({ type: 'emote', i })));
  check(`bundleParts: at most BUNDLE.MAX (${BUNDLE.MAX})`, many.length === BUNDLE.MAX && many[BUNDLE.MAX - 1].i === BUNDLE.MAX - 1);
  check('bundleParts: not an array -> nothing', bundleParts({ type: 'move' }).length === 0 && bundleParts(null).length === 0);

  const { room } = await makeRoom();
  const p = await join(room, 'q1');
  const s0 = JSON.stringify(room.playerState.q1);
  /* a join inside a bundle does nothing */
  const before = room.sessions.get(p.ws).id;
  await room.webSocketMessage(p.ws, JSON.stringify([{ type: 'join', id: 'someone-else', name: 'x', protocolVersion: 2, data: {} }]));
  check('a join inside a bundle is never taken', room.sessions.get(p.ws).id === before && !room.playerState['someone-else']);
  /* over the frame gate: dropped whole, nothing in it taken */
  const big = [{ type: 'move', x: 1234, y: 1000, z: 'town', d: 'down', vx: 0, vy: 0 }, { type: 'emote', payload: { pad: 'x'.repeat(room.MAX_INBOUND_BYTES) } }];
  const ov = room.sessions.get(p.ws).oversize || 0;
  await room.webSocketMessage(p.ws, JSON.stringify(big));
  check('a bundle over the frame gate is dropped whole', (room.sessions.get(p.ws).oversize || 0) === ov + 1 && JSON.stringify(room.playerState.q1) === s0);
  /* a message that ends the session ends the bundle */
  const orig = room._onMessage;
  const seen = [];
  room._onMessage = async function (ws, session, msg) {
    seen.push(msg.type);
    if (msg.type === 'bye') { this.sessions.delete(ws); return; }
    return orig.call(this, ws, session, msg);
  };
  await room.webSocketMessage(p.ws, JSON.stringify([{ type: 'emote', payload: {} }, { type: 'bye' }, { type: 'emote', payload: {} }]));
  room._onMessage = orig;
  check('a message that ends the session ends the bundle there', seen.join(',') === 'emote,bye', seen);
  /* one that throws does not stop the rest, as frames of their own never did */
  const seen2 = [];
  const p2 = await join(room, 'q2');   /* q1's session ended above */
  room._onMessage = async function (ws, session, msg) {
    seen2.push(msg.type);
    if (msg.type === 'boom') throw new Error('boom');
    return orig.call(this, ws, session, msg);
  };
  const _ce = console.error; console.error = () => {};
  await room.webSocketMessage(p2.ws, JSON.stringify([{ type: 'boom' }, { type: 'emote', payload: {} }]));
  console.error = _ce;
  room._onMessage = orig;
  check('a message that throws does not stop the rest of its bundle', seen2.join(',') === 'boom,emote', seen2);
}

/* ── 3. the ping's answer ────────────────────────────────────────────────── */
{
  const { room } = await makeRoom();
  const p = await join(room, 'r1');
  const s = room.sessions.get(p.ws);
  const alpha = room.LAGCOMP_RTT_ALPHA;
  const reset = () => { s.rtt = 80; };
  /* held 400 ms of a 460 ms trip: the sample is 60 */
  reset(); s.lastPing = NOW - 460;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: s.lastPing, hd: 400 }));
  check('a pong held 400 ms of 460: the sample is 60 ms', Math.abs(s.rtt - (80 * (1 - alpha) + 60 * alpha)) < 1e-9, s.rtt);
  /* inside a bundle, the same */
  reset(); s.lastPing = NOW - 460;
  await room.webSocketMessage(p.ws, JSON.stringify([{ type: 'emote', payload: {} }, { type: 'pong', ts: s.lastPing, hd: 400 }]));
  check('...and the same riding in a bundle', Math.abs(s.rtt - (80 * (1 - alpha) + 60 * alpha)) < 1e-9, s.rtt);
  /* an older ping's answer: no sample */
  reset(); s.lastPing = NOW - 100;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: NOW - 3100, hd: 0 }));
  check('an answer to an older ping is no sample (it read as a few ms)', s.rtt === 80, s.rtt);
  /* hd past the sample: 0, never negative */
  reset(); s.lastPing = NOW - 50;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: s.lastPing, hd: 9000 }));
  check('hd past the trip counts the trip as 0, never less', Math.abs(s.rtt - 80 * (1 - alpha)) < 1e-9, s.rtt);
  /* an old phone: ts, no hd -- as before */
  reset(); s.lastPing = NOW - 120;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: s.lastPing }));
  check('an old phone\'s answer (no hd) is measured as before', Math.abs(s.rtt - (80 * (1 - alpha) + 120 * alpha)) < 1e-9, s.rtt);
  /* a negative or junk hd is not subtracted */
  reset(); s.lastPing = NOW - 120;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: s.lastPing, hd: -500 }));
  const r1 = s.rtt;
  reset(); s.lastPing = NOW - 120;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'pong', ts: s.lastPing, hd: 'x' }));
  check('a negative or junk hd is ignored', Math.abs(r1 - (80 * (1 - alpha) + 120 * alpha)) < 1e-9 && Math.abs(s.rtt - r1) < 1e-9, [r1, s.rtt]);
  /* a pong is still never activity */
  const lr = s.lastRecv; NOW += 5000;
  await room.webSocketMessage(p.ws, JSON.stringify([{ type: 'pong', ts: s.lastPing, hd: 1 }]));
  check('a pong in a bundle is still never activity (the AFK clock)', s.lastRecv === lr);
}

/* ── 4. the caps and their switches ──────────────────────────────────────── */
{
  const { room } = await makeRoom();
  const p = await join(room, 'c1');
  const c = capsOf(p);
  check('caps.bundle and caps.quiet are advertised', !!(c && c.bundle === true && c.quiet === true), c);
  room._liveFlags = { bundle: false, quiet: false };
  room._liveFlagsEnsure = async () => room._liveFlags;
  const p2 = await join(room, 'c2');
  const c2 = capsOf(p2);
  check('`bundle: false` and `quiet: false` in the live flags take them back', !!(c2 && c2.bundle === false && c2.quiet === false), c2);
  NOW += 50;
  await room.webSocketMessage(p.ws, JSON.stringify([{ type: 'move', x: 1100, y: 1000, z: 'town', d: 'down', vx: 0, vy: 0, dead: false }]));
  check('...and a room still takes a bundle (a phone that joined before the switch)', room.playerState.c1.x === 1100, room.playerState.c1.x);
}

/* ── 5. the phone's numbers are the worker's ─────────────────────────────── */
{
  const room = new GameRoom(mockState(), mockEnv);
  check(`NEAR_R is the worker's FAR_PLAYERS.NEAR_R (${FAR_PLAYERS.NEAR_R})`, QUIET.NEAR_R === FAR_PLAYERS.NEAR_R);
  check(`BUNDLE_MAX is the worker's BUNDLE.MAX (${BUNDLE.MAX})`, QUIET.BUNDLE_MAX === BUNDLE.MAX);
  check('BUNDLE_CHARS is under the frame gate', QUIET.BUNDLE_CHARS < room.MAX_INBOUND_BYTES, [QUIET.BUNDLE_CHARS, room.MAX_INBOUND_BYTES]);
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  check('the look\'s news is the worker\'s rule (RIDE_ALONG, LAZY, LAZY_IN)', same(LOOK_NEWS.RIDE_ALONG, LOOK_RELAY.RIDE_ALONG) && same(LOOK_NEWS.LAZY, LOOK_RELAY.LAZY)
    && same(Object.keys(LOOK_NEWS.LAZY_IN), Object.keys(LOOK_RELAY.LAZY_IN))
    && Object.keys(LOOK_RELAY.LAZY_IN).every((k) => same(LOOK_NEWS.LAZY_IN[k], LOOK_RELAY.LAZY_IN[k])));
  const ws = readFileSync(pjoin(ROOT, 'src/networking/wsClient.js'), 'utf8');
  const seen = /MOVE_GAP_SEEN_MS = (\d+)/.exec(ws), solo = /MOVE_GAP_SOLO_MS = (\d+)/.exec(ws);
  check('the move gaps are the phone\'s own (33 seen, 66 alone)', !!(seen && solo && +seen[1] === QUIET.SEEN_GAP_MS && +solo[1] === QUIET.ALONE_GAP_MS), [seen && seen[1], solo && solo[1]]);
  check('the open map\'s heartbeat is presence v2\'s', QUIET.MAP_BEAT_MS === PRESENCE2_CLIENT.MAP_HEARTBEAT_MS);
  check('the look goes alone well inside the worker\'s 2-minute away clock', QUIET.TRACK_QUIET_MS * 3 <= room.IDLE_TIMEOUT_MS, [QUIET.TRACK_QUIET_MS, room.IDLE_TIMEOUT_MS]);
}

/* ── 6. the phone's rules ────────────────────────────────────────────────── */
{
  const base = { x: 1, y: 2, dir: 'down', name: 'a', hw: 'cap', rpgHp: 40, rpgMaxHp: 50, aw: 0, rpgData: { kills: 3, weapon: 'Fists', shield: null, playtime: 9 } };
  const n0 = lookNews(base);
  check('look: where you are, which way, your HP: not news', lookNews({ ...base, x: 900, y: -4, dir: 'up', rpgHp: 1, rpgMaxHp: 99 }) === n0);
  check('look: the inspect card\'s counters: not news', lookNews({ ...base, rpgData: { ...base.rpgData, kills: 99, playtime: 300 } }) === n0);
  check('look: a hat, a shield, the away flag: news', lookNews({ ...base, hw: 'none' }) !== n0 && lookNews({ ...base, rpgData: { ...base.rpgData, shield: 'Oak' } }) !== n0 && lookNews({ ...base, aw: 1 }) !== n0);
  check('look: key order does not matter; a key gone is news', lookNews(Object.fromEntries(Object.entries(base).reverse())) === n0 && lookNews({ ...base, hw: undefined }) !== n0);
  /* never hold back what the worker would relay: 3,000 random pairs */
  /* mulberry32: an LCG's low bit alternates, and every choice below is a
     small modulus */
  let seed = 7;
  const rnd = (n) => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) % n);
  };
  const KEYS = ['x', 'y', 'dir', 'name', 'hw', 'hr', 'sk', 'aw', 'zone', 'rpgHp', 'rpgMaxHp', 'rpgLv', 'hg', 'fr', 'clanTag'];
  const randLook = () => {
    const o = {};
    for (const k of KEYS) if (rnd(5)) o[k] = k === 'aw' ? rnd(2) : (k === 'x' || k === 'y' || k === 'rpgHp') ? rnd(3000) : ['a', 'b', null][rnd(3)];
    if (rnd(4)) o.rpgData = { kills: rnd(3), playtime: rnd(3), weapon: ['Fists', 'Sword'][rnd(2)], shield: rnd(3) ? null : 'Oak' };
    return o;
  };
  let held = 0, wrong = 0, first = null;
  for (let i = 0; i < 3000; i++) {
    const a = randLook();
    const b = rnd(2) ? { ...a } : randLook();
    if (rnd(2)) { b.x = rnd(3000); b.rpgHp = rnd(3000); if (b.rpgData) b.rpgData = { ...b.rpgData, kills: rnd(9) }; }
    const r0 = lookDelta(a, null, NOW);
    const r1 = lookDelta(b, r0.last, NOW + 2000);
    if (lookNews(a) === lookNews(b)) {
      held++;
      if (r1.data) { wrong++; if (!first) first = { a, b, relayed: r1.data }; }
    }
  }
  check(`look: the phone never holds back a look the worker would relay (${held} of 3,000 held, ${wrong} wrong)`, held > 300 && wrong === 0, first);

  const S = (others, extra = {}) => Object.assign({ player: { x: 0, y: 0 }, currentZone: 'wheel', others }, extra);
  check('near: no one -> alone (66 ms)', peerNear(S({})) === false && quietMoveGap(S({})) === QUIET.ALONE_GAP_MS);
  check('near: a player 2,399 px away -> near (33 ms); 2,401 -> alone', peerNear(S({ a: { x: 2399, y: 0, zone: 'wheel' } })) === true && quietMoveGap(S({ a: { x: 2401, y: 0, zone: 'wheel' } })) === QUIET.ALONE_GAP_MS);
  check('near: another zone, or a copy parked out of sight -> not near', peerNear(S({ a: { x: 5, y: 0, zone: 'town' }, b: { x: 5, y: 0, zone: 'wheel', _away: true } })) === false);
  check('near: a zone or place not known yet counts as near (the doubt costs messages, never smoothness)', peerNear(S({ a: { x: 9000, y: 0 } })) === true && peerNear(S({ a: { zone: 'wheel' } })) === true && peerNear(null) === true);
  check('near: an arena match is always 33 ms', quietMoveGap(S({}, { _arenaMatch: true })) === QUIET.SEEN_GAP_MS);
  check('near: a test of who (No man\'s land\'s rule) -- only those who pass', peerNear(S({ a: { x: 5, y: 0, zone: 'wheel' } }), QUIET.NEAR_R, () => false) === false && peerNear(S({ a: { x: 5, y: 0, zone: 'wheel' } }), QUIET.NEAR_R, (id) => id === 'a') === true);
  check('keepalive: KEEP_CONFIRM_MS after a move, then every KEEP_QUIET_MS', keepaliveDue(999, false) === false && keepaliveDue(1000, false) === true && keepaliveDue(9999, true) === false && keepaliveDue(10000, true) === true);
  const one = framesOf([{ type: 'move', x: 1 }]);
  check('frames: one message goes as itself, as it always did', one.length === 1 && one[0] === '{"type":"move","x":1}');
  const three = framesOf([{ type: 'move' }, { type: 'emote' }, { type: 'pong', ts: 1 }]);
  check('frames: more go as one array, in order', three.length === 1 && JSON.stringify(JSON.parse(three[0]).map((m) => m.type)) === '["move","emote","pong"]');
  const lots = framesOf(Array.from({ length: 30 }, (_, i) => ({ type: 'emote', i })));
  check(`frames: at most ${QUIET.BUNDLE_MAX} a frame`, lots.length === 2 && JSON.parse(lots[0]).length === QUIET.BUNDLE_MAX && JSON.parse(lots[1]).length === 6);
  const fat = framesOf([{ type: 'a', s: 'x'.repeat(9000) }, { type: 'b', s: 'x'.repeat(9000) }, { type: 'c' }]);
  check('frames: never over BUNDLE_CHARS; a message too big for one goes alone', fat.length === 2 && fat.every((f) => f.length <= QUIET.BUNDLE_CHARS) && JSON.parse(fat[0]).type === 'a');
  check('frames: each bundle the worker takes whole and in order', framesOf(Array.from({ length: 30 }, (_, i) => ({ type: 'emote', i }))).flatMap((f) => { const v = JSON.parse(f); return Array.isArray(v) ? bundleParts(v) : [v]; }).map((m) => m.i).join(',') === Array.from({ length: 30 }, (_, i) => i).join(','));
  check('quietOn / bundleOn read the caps', quietOn({ _serverCaps: { quiet: true } }) && !quietOn({ _serverCaps: { quiet: false } }) && bundleOn({ _serverCaps: { bundle: true } }) && !bundleOn({}));
}

/* ── 7. the game's own files call it ─────────────────────────────────────── */
{
  const ws = readFileSync(pjoin(ROOT, 'src/networking/wsClient.js'), 'utf8');
  const bt = readFileSync(pjoin(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  /* the join, an old worker's pong, and wsOut's own two (a frame each, or the bundle's frames) */
  check('wsClient: every game message goes through wsOut (only the join and the old pong send themselves)', (ws.match(/ws\.send\(/g) || []).length === 4 && /function wsOut\(obj\)/.test(ws) && /ws\.send\(frames\[i\]\)/.test(ws), (ws.match(/ws\.send\(/g) || []).length);
  check('wsClient: a frame a moment (queueMicrotask, framesOf)', /queueMicrotask\(_flushOutbox\)/.test(ws) && /framesOf\(msgs\)/.test(ws));
  check('wsClient: the ping rides (hd), one in PONG_EVERY alone', /_ride\('pong'/.test(ws) && /r\.msg\.hd = /.test(ws) && /QUIET\.PONG_EVERY/.test(ws));
  check('wsClient: the look by its news', /lookNews\(data\)/.test(ws) && /QUIET\.TRACK_QUIET_MS/.test(ws));
  check('wsClient: the move gap and the diet ask the quiet rules', /if \(quietOn\(_S\)\) return quietMoveGap\(_S\)/.test(ws) && /nmlCanAttack\(_Sq, id\)/.test(ws));
  check('wsClient: a damage claim takes the waiting move along when bundling', /if \(_bundling\(\)\) flushInputBuffer\(\);\s*wsOut\(msg\);/.test(ws));
  check('wsClient: a new socket starts clean', /_quietReset\(\);/.test(ws));
  /* the last worker's caps stay in S._serverCaps until the new one's
     state_sync: a reconnect to an older worker (a rollback) must not be sent a
     bundle, which it would relay to the whole room */
  check('wsClient: nothing bundled or riding until THIS socket\'s state_sync',
    /function _quietReset\(\) \{\s*_capsHere = false;/.test(ws)
      && /S\._serverCaps = msg\.caps \|\| \{\};\s*_capsHere = true;/.test(ws)
      && /return _capsHere && bundleOn\(/.test(ws)
      && /return _capsHere && quietOn\(_Sq\) && bundleOn\(_Sq\)/.test(ws));
  check('BroTown: the keepalive and the harvest heartbeat ask the quiet rules', /keepaliveDue\(/.test(bt) && /var _exHeartbeat = !_quietPh/.test(bt));
}

/* ── 8. one at a time: a bundle's parts each finish before the next ─────── */
/* v2.3.3291.  The storage here answers 2 ms late and hands back copies, as a
   Durable Object's does: on the suite's instant, same-object mock above two
   parts barely overlap, which is how the race hid from every suite. */
{
  function slowState() {
    const store = new Map();
    const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    return {
      storage: {
        get: async (k) => { const v = copy(store.get(k)); await new Promise((r) => setTimeout(r, 2)); return v; },
        put: async (k, v) => { store.set(k, copy(v)); },
        list: async () => new Map(),
        delete: async (k) => { if (Array.isArray(k)) for (const x of k) store.delete(x); else store.delete(k); },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    };
  }
  const settle = () => new Promise((r) => setTimeout(r, 40));
  async function slowRoom(id) {
    const state = slowState();
    const room = new GameRoom(state, mockEnv);
    const p = await join(room, id);
    await settle();
    const send = async (obj) => { await room.webSocketMessage(p.ws, JSON.stringify(obj)); await settle(); };
    const answers = (type) => p.ws.sent.map((s) => JSON.parse(s)).filter((m) => m.type === type);
    return { room, state, ps: room.playerState[id], send, answers };
  }

  /* A ripe bed, harvested 24 times: as 24 frames of their own, and as ONE
     bundle.  The bed is the only replay guard (farm.js), read fresh each time. */
  async function harvestRipeBed(id, bundled) {
    const r = await slowRoom(id);
    await r.send({ type: 'farm_act', payload: { op: 'dig', beds: [0] } });
    r.ps.inventory.seed_carrot = 1;
    await r.send({ type: 'farm_act', payload: { op: 'plant', beds: [0], crop: 'carrot' } });
    NOW += 3 * 24 * 3600 * 1000;   /* well past ripe */
    r.room._farmRate = new Map();
    const before = Math.floor(Number(r.ps.inventory.crop_carrot) || 0);
    const harvest = { type: 'farm_act', payload: { op: 'harvest', beds: [0] } };
    if (bundled) await r.send(Array.from({ length: 24 }, () => harvest));
    else for (let i = 0; i < 24; i++) await r.send(harvest);
    const paid = r.answers('farm_state').filter((m) => m.payload && m.payload.did && m.payload.did.op === 'harvest' && m.payload.did.n > 0).length;
    return { gained: Math.floor(Number(r.ps.inventory.crop_carrot) || 0) - before, paid };
  }
  const frames = await harvestRipeBed('bp_order_f1', false);
  const bundle = await harvestRipeBed('bp_order_f2', true);
  check('one at a time: one ripe bed harvested 24 times in separate frames pays one harvest (the guard)', frames.gained === 2 && frames.paid === 1, frames);
  check('one at a time: ...and 24 times in ONE bundle pays the same one harvest (was 48 carrots)', bundle.gained === frames.gained && bundle.paid === 1, bundle);

  /* Ten ore sold 24 times in one bundle: _shopSell reads the bag's count,
     awaits Diego's pile, and pays for the count it read. */
  {
    const r = await slowRoom('bp_order_s1');
    r.ps.inventory.ore_copper = 10;
    const coins0 = Math.floor(Number(r.ps.coins) || 0);
    await r.send(Array.from({ length: 24 }, () => ({ type: 'shop_sell', payload: { key: 'ore_copper', qty: 10 } })));
    const ok = r.answers('shop_result').filter((m) => m.payload && m.payload.ok);
    const gained = Math.floor(Number(r.ps.coins) || 0) - coins0;
    check('one at a time: ten ore sold 24 times in one bundle are paid for ONCE (was 24 sales, 4,320 gold)',
      ok.length === 1 && gained === ok[0].payload.paid && gained > 0 && !(r.ps.inventory.ore_copper > 0),
      { sales: ok.length, gained, left: r.ps.inventory.ore_copper });
  }

  /* 24 buys out of a pile of ONE: each read the pile before any wrote it back. */
  {
    const r = await slowRoom('bp_order_b1');
    await r.state.storage.put('shop_stock', { ore_copper: 1 });
    r.ps.coins = 100000;
    await r.send(Array.from({ length: 24 }, () => ({ type: 'shop_buy', payload: { key: 'ore_copper', qty: 1 } })));
    const ok = r.answers('shop_result').filter((m) => m.payload && m.payload.ok);
    const pile = await r.state.storage.get('shop_stock');
    check('one at a time: 24 buys in one bundle out of a pile of one take ONE (was 24)',
      ok.length === 1 && r.ps.inventory.ore_copper === 1 && pile && (pile.ore_copper || 0) === 0,
      { buys: ok.length, got: r.ps.inventory.ore_copper, pile });
  }

  /* The bundle still keeps its order, and a part after a slow one still runs. */
  {
    const r = await slowRoom('bp_order_o1');
    r.ps.inventory.ore_copper = 2;
    await r.send([
      { type: 'shop_sell', payload: { key: 'ore_copper', qty: 1 } },
      { type: 'shop_sell', payload: { key: 'ore_copper', qty: 1 } },
      { type: 'shop_sell', payload: { key: 'ore_copper', qty: 1 } },
    ]);
    const res = r.answers('shop_result').map((m) => !!(m.payload && m.payload.ok));
    check('one at a time: three sales of two ore in one bundle: the first two sell, in order, the third is refused',
      res.join(',') === 'true,true,false' && !(r.ps.inventory.ore_copper > 0), res);
  }
}

/* ── 9. the router waits for every handler ────────────────────────────────── */
/* v2.3.3291: the static half of §8.  A call in _onMessage to a method that is
   `async` must be awaited (or returned) in the statement that makes it -- a
   promise kept in a variable and awaited later, or never, is how twenty cases
   came to run side by side in one bundle.  If a new case is flagged here, write
   `await this._handleX(...)` (with a .catch, or a try, if it must not throw). */
{
  const SRC = pjoin(ROOT, 'server/src');
  /* comments become spaces, so a word in one is never read as code and every
     offset stays where it was */
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  const asyncNames = new Set();
  for (const f of readdirSync(SRC).filter((n) => n.endsWith('.js'))) {
    for (const m of strip(readFileSync(pjoin(SRC, f), 'utf8')).matchAll(/^ {2}async\s+([A-Za-z_$][\w$]*)\s*\(/gm)) asyncNames.add(m[1]);
  }
  const index = strip(readFileSync(pjoin(SRC, 'index.js'), 'utf8'));
  const lines = index.split('\n');
  const at = lines.findIndex((l) => /^ {2}async _onMessage\(/.test(l));
  let end = at + 1;
  while (end < lines.length && !/^ {2}\}\s*$/.test(lines[end])) end++;
  const body = lines.slice(at + 1, end).join('\n');
  /* The one call left running on purpose: the Leaderboard report is a cross-
     object fetch that moves no value (rank and the inspect card), throttled
     on its own clock.  Awaited, every bundle with a `track` in it would wait
     out a network round trip before its next part -- and the gate opens
     while it does.  Add a name here only with a reason as good as that. */
  const LEFT_RUNNING = new Set(['reportToLeaderboard']);
  const loose = [];
  let calls = 0;
  for (const m of body.matchAll(/this\.([A-Za-z_$][\w$]*)\(/g)) {
    if (!asyncNames.has(m[1]) || LEFT_RUNNING.has(m[1])) continue;
    calls++;
    const before = body.slice(0, m.index);
    const from = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}'));
    if (!/\b(await|return)\b/.test(body.slice(from + 1, m.index))) loose.push(m[1] + ' (index.js:' + (at + 1 + before.split('\n').length) + ')');
  }
  check('the router: it finds the async handlers it calls (guard: the scan is reading the right method)', at > 0 && end > at + 500 && calls >= 20, { at, end, calls });
  check('the router: every async handler _onMessage calls is awaited or returned where it is called', loose.length === 0, loose);
  check('the router: the bundle loop awaits each part, in order',
    /for \(const m of bundleParts\(msg\)\) \{[\s\S]{0,400}?await this\._onMessage\(ws, _s, m\)/.test(index));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
