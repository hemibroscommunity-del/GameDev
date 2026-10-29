/* THE HARVEST'S RAW GESTURE, MEASURED BY THE SERVER (v2.3.3725,
 * docs/specs/gesture-points.md).
 *
 *   1. the packing: the phone's encoder (src/game/gesturePoints.js) and the
 *      worker's decoder (gesturefp.js) agree point for point; a long gesture
 *      is thinned (first and last kept), a jump held to a byte; 100 points
 *      are a few hundred characters; anything malformed decodes to nothing;
 *   2. the arithmetic: the worker's copies of the phone's four measures
 *      (ExtractionSwipeLayer.jsx) are the phone's own, line for line;
 *   3. the strike: a drawn gesture's points earn its perfect; a straight,
 *      even drag's do not (the worker's entropy), whatever summary rides
 *      beside it; points that do not decode are no fingerprint (never
 *      perfect); an old phone's summary still judges; `gesturepts: false`
 *      ignores the points; the join advertises the cap;
 *   4. E's rhythm (`k`): a person's taps and holds pass, a script's even ones
 *      are `keys`, which never flags alone; malformed pairs are not read; a
 *      test-mode character is not measured;
 *   5. the phone sends `g` (and `k`) only to a worker that says gesturepts,
 *      and the summary to any other. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { decodeGesturePts, fpFromPts, GPTS } from '../src/gesturefp.js';
import { BOTSIG } from '../src/botsig.js';
import { histTotal } from '../src/botstats.js';
import { encodeGesturePoints, GESTURE_PTS_MAX } from '../../src/game/gesturePoints.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };

/* a thumb chopping side to side on the button: ~1.5 s at ~60 Hz, its speed
   rising and falling, wobbling a little, its frames uneven */
function chop(n = 95) {
  const out = [];
  let t = 1000 + rnd() * 50;
  for (let i = 0; i < n; i++) {
    const ph = i / 9;
    out.push({ x: 400.3 + Math.sin(ph) * 40 + rnd() * 3, y: 700.6 + Math.sin(ph * 0.37) * 6 + rnd() * 2, t });
    t += 14 + rnd() * 6;
  }
  return out;
}
/* a script's drag one way: a straight line, constant speed, a frame every 16 ms */
function line(n = 95) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: 300 + i * 4, y: 700, t: 1000 + i * 16 });
  return out;
}
/* a script's drag: straight back and forth, constant speed, a frame every 16 ms */
function drag(n = 95) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: 400 + ((i % 20) < 10 ? (i % 10) * 8 : 80 - (i % 10) * 8), y: 700, t: 1000 + i * 16 });
  return out;
}

// ── 1. the packing ──
{
  const s = chop();
  const g = encodeGesturePoints(s);
  const pts = decodeGesturePts(g);
  const want = s.map((p) => ({ x: Math.round(p.x) - Math.round(s[0].x), y: Math.round(p.y) - Math.round(s[0].y), t: Math.round(p.t) - Math.round(s[0].t) }));
  check('1. phone -> worker: every point back, to the whole px and ms', pts && pts.length === s.length && pts.every((p, i) => p.x === want[i].x && p.y === want[i].y && p.t === want[i].t),
    pts && pts.slice(0, 3));
  check('1. 95 points are a few hundred characters (' + g.b.length + ')', g.b.length <= 400 && g.v === 1);
  const frame = JSON.stringify({ type: 'node_strike', payload: { id: 'wheel_tree_123', zone: 'wheel', accuracy: 'perfect', g: encodeGesturePoints(chop(GESTURE_PTS_MAX)) } });
  check('1. the fullest strike frame stays far under the 16 KB frame gate (' + frame.length + ' bytes)', frame.length < 1000);
  const long = chop(400);
  const lp = decodeGesturePts(encodeGesturePoints(long));
  check('1. a long gesture is thinned to ' + GESTURE_PTS_MAX + ', first and last kept', lp.length === GESTURE_PTS_MAX
    && lp[lp.length - 1].x === Math.round(long[399].x) - Math.round(long[0].x), lp.length);
  const jump = decodeGesturePts(encodeGesturePoints([{ x: 0, y: 0, t: 0 }, { x: 500, y: -300, t: 900 }]));
  check('1. a jump past a byte is held to it (127 px, 255 ms)', jump[1].x === 127 && jump[1].y === -128 && jump[1].t === 255, jump);
  check('1. fewer than two points: nothing to send', encodeGesturePoints([{ x: 1, y: 1, t: 1 }]) === null && encodeGesturePoints(null) === null);
  for (const [bad, why] of [[null, 'none'], [{ v: 2, b: g.b }, 'a newer shape'], [{ v: 1, b: 7 }, 'not text'], [{ v: 1, b: '' }, 'empty'],
    [{ v: 1, b: 'AAAA!' }, 'not base64'], [{ v: 1, b: 'AAAAAA==' }, 'not whole points'], [{ v: 1, b: 'A'.repeat(GPTS.B64_MAX + 4) }, 'too long']]) {
    check('1. ' + why + ' decodes to nothing', decodeGesturePts(bad) === null);
  }
}

// ── 2. the arithmetic is the phone's ──
{
  const norm = (src, name) => {
    const at = src.indexOf('function ' + name + '(');
    if (at < 0) return null;
    let depth = 0, i = src.indexOf('{', at);
    const start = i;
    for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) break; } }
    return src.slice(start, i + 1).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
  };
  const phone = readFileSync(new URL('../../src/ui/ExtractionSwipeLayer.jsx', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../src/gesturefp.js', import.meta.url), 'utf8');
  for (const fn of ['vectorEntropy', 'timingVariance', 'velocityCurvature', 'pathHash']) {
    const a = norm(phone, fn), b = norm(worker, fn);
    check('2. ' + fn + ': the worker\'s copy is the phone\'s', a && a === b, { phone: a && a.slice(0, 80), worker: b && b.slice(0, 80) });
  }
  const h = fpFromPts(decodeGesturePts(encodeGesturePoints(chop())));
  const d = fpFromPts(decodeGesturePts(encodeGesturePoints(drag())));
  const l = fpFromPts(decodeGesturePts(encodeGesturePoints(line())));
  console.log('    a thumb: ' + JSON.stringify(h) + '\n    a drag:  ' + JSON.stringify(d) + '\n    a line:  ' + JSON.stringify(l));
  check('2. a thumb\'s chop: over every floor (entropy, timing, speed change)', h.ent >= 0.04 && h.tv > 1 && h.vc > 0.02, h);
  check('2. a script\'s drag back and forth: its timing and speed flat (tv 0, vc 0)', d.tv <= 1 && d.vc <= 0.02, d);
  check('2. a script\'s line one way: under the entropy floor too', l.ent < 0.04 && l.tv <= 1, l);
}

// ── 3. the strike ──
function makeState() {
  const store = new Map();
  return { store, storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } }, getWebSockets: () => [], acceptWebSocket: () => {} };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'k' };
async function harvester(room, id) {
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'A', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'H', phrase: 'p-' + id, protocolVersion: 2, data: { x: -100000, y: -100000, z: 'town' } }));
  const ps = room.playerState[id];
  ps.z = 'meadow';
  const node = room._ensureZoneNodes('meadow')[0];
  ps.x = node.x; ps.y = node.y;
  ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 }; ps.lifeSkills = {};
  return { ws, ps, node, id, session: room.sessions.get(ws) };
}
async function strike(room, P, payload) {
  P.node.alive = true; P.node.respawnAt = 0;
  const skill = room._harvestSkillName(P.node.nodeType);
  await room.webSocketMessage(P.ws, JSON.stringify({ type: 'extraction_start', payload: { nodeId: P.node.id, zone: 'meadow', skill } }));
  const ex = room.extractions[P.id];
  if (ex) ex.startedAt = Date.now() - ex.openDelayBase - 1700;
  await room.webSocketMessage(P.ws, JSON.stringify({ type: 'node_strike', payload: Object.assign({ id: P.node.id, zone: 'meadow' }, payload) }));
  return room._botfp.get(P.id);
}
{
  const room = new GameRoom(makeState(), env);
  const P = await harvester(room, 'bp_gp_a');
  const caps = (P.ws.sent.find((m) => m.type === 'state_sync') || {}).caps || {};
  check('3. the join advertises caps.gesturepts', caps.gesturepts === true);
  let r = await strike(room, P, { accuracy: 'perfect', g: encodeGesturePoints(chop()) });
  check('3. a thumb\'s points keep its perfect (the worker\'s own entropy)', r.counters.entFloorHits === 0 && r.counters.noFpStrikes === 0, r.counters);
  r = await strike(room, P, { accuracy: 'good', g: encodeGesturePoints(drag()), swipeFp: { len: 900, n: 95, dur: 1500, ent: 0.3, tv: 40, vc: 0.5, h: 'forged' } });
  check('3. a drag\'s points score as scripted (flat timing and speed), a forged human summary beside them notwithstanding', r.counters.syntheticStrikes === 1, r.counters);
  r = await strike(room, P, { accuracy: 'perfect', g: encodeGesturePoints(line()), swipeFp: { len: 900, n: 95, dur: 1500, ent: 0.3, tv: 40, vc: 0.5, h: 'forged2' } });
  check('3. a straight line\'s points lose the perfect (the worker\'s entropy, not the summary\'s 0.3)', r.counters.entFloorHits === 1 && r.counters.syntheticStrikes === 2, r.counters);
  r = await strike(room, P, { accuracy: 'perfect', g: { v: 1, b: '!!!' } });
  check('3. points that do not decode are no fingerprint: counted, and never perfect', r.counters.noFpStrikes === 1 && r.counters.noFpPerfect === 1, r.counters);
  const efh = r.counters.entFloorHits;
  r = await strike(room, P, { accuracy: 'perfect', swipeFp: { len: 900, n: 95, dur: 1500, ent: 0.01, tv: 0, vc: 0.001, h: 'old' } });
  check('3. an old phone\'s summary still judges its strike', r.counters.entFloorHits === efh + 1, r.counters);
  const R2 = new GameRoom(makeState(), env);
  R2._liveFlags = { gesturepts: false };
  const Q = await harvester(R2, 'bp_gp_b');
  check('3. `gesturepts: false`: un-advertised', ((Q.ws.sent.find((m) => m.type === 'state_sync') || {}).caps || {}).gesturepts === false);
  const q = await strike(R2, Q, { accuracy: 'perfect', g: encodeGesturePoints(line()), swipeFp: { len: 900, n: 95, dur: 1500, ent: 0.3, tv: 40, vc: 0.5, h: 's' } });
  check('3. ...and any points that arrive are ignored (the summary judges, as before)', q.counters.entFloorHits === 0 && q.counters.syntheticStrikes === 0, q.counters);
  const src = readFileSync(new URL('../src/gathering.js', import.meta.url), 'utf8');
  check('3. the strike handler reads the points first', /const _ptsFp = this\._gesturePtsFp\(payload\);/.test(src));
}

// ── 4. E's rhythm ──
{
  const room = new GameRoom(makeState(), env);
  const bot = await harvester(room, 'bp_gp_kbot');
  const hum = await harvester(room, 'bp_gp_khum');
  const tm = await harvester(room, 'bp_gp_ktm');
  tm.ps._testMode = true;
  const taps = (even) => {
    const k = [];
    let t = 0;
    for (let i = 0; i < 8; i++) { k.push([t, even ? 90 : Math.round(60 + rnd() * 140)]); t += even ? 250 : Math.round(170 + rnd() * 260); }
    return k;
  };
  for (let i = 0; i < 12; i++) {
    await strike(room, bot, { accuracy: 'good', k: taps(true) });
    await strike(room, hum, { accuracy: 'good', k: taps(false) });
    await strike(room, tm, { accuracy: 'good', k: taps(true) });
  }
  for (const P of [bot, hum]) room._sigEval(P.id, room._botfp.get(P.id), Date.now());
  const sb = room._botfp.get('bp_gp_kbot').sig, sh = room._botfp.get('bp_gp_khum').sig;
  check('4. E tapped to an exact beat: keys', sb.reasons.includes('keys') && histTotal(sb.keyGap) >= BOTSIG.KEYS_MIN_N, { r: sb.reasons, n: histTotal(sb.keyGap) });
  check('4. ...weighing W_KEYS, never a flag alone', sb.score === BOTSIG.W_KEYS && sb.score < BOTSIG.SIG_FLAG_AT
    && !room._botfp.get('bp_gp_kbot').flags.some((f) => f.kind === 'server-signals'), sb.score);
  check('4. a person\'s taps and holds: not', !sh.reasons.includes('keys') && histTotal(sh.keyGap) >= BOTSIG.KEYS_MIN_N, sh.reasons);
  const st = room._botfp.get('bp_gp_ktm') && room._botfp.get('bp_gp_ktm').sig;
  check('4. a test-mode character\'s presses are not measured', !st || histTotal(st.keyGap) === 0);
  const before = histTotal(sh.keyGap);
  for (const bad of [[[0, 1]], [[0, 1], [5, 'x']], [[0, 1], [-5, 3]], Array.from({ length: 30 }, (_, i) => [i * 100, 50]), [[0, 1], [9e9, 3]], 'k']) {
    await strike(room, hum, { accuracy: 'good', k: bad });
  }
  check('4. malformed or oversized presses are not read', histTotal(sh.keyGap) === before, histTotal(sh.keyGap) - before);
}

// ── 5. the phone sends them only to a worker that reads them ──
{
  const { strikePayload } = await import('../../src/game/lifeSkillRewards.js').catch((e) => ({ err: e }));
  if (typeof strikePayload !== 'function') {
    /* the client module pulls the game's data in through Vite aliases: read the source instead */
    const src = readFileSync(new URL('../../src/game/lifeSkillRewards.js', import.meta.url), 'utf8');
    check('5. strikePayload: g and k only with caps.gesturepts, the summary otherwise',
      /var pts = !!\(S\._serverCaps && S\._serverCaps\.gesturepts\);/.test(src) && /if \(pts && ex && ex\.gesturePts\) np\.g = ex\.gesturePts;\s*else if \(ex && ex\.swipeFp\) np\.swipeFp = ex\.swipeFp;/.test(src)
      && /if \(pts && ex && Array\.isArray\(ex\.keyRhythm\)/.test(src) && (src.match(/strikePayload\(S, node, accuracy\)/g) || []).length === 4 /* the three strikes and its own line */);
  } else {
    const ex = { gesturePts: { v: 1, b: 'AAAA' }, swipeFp: { ent: 0.1 }, keyRhythm: [[0, 50], [200, 60]] };
    const on = strikePayload({ _serverCaps: { gesturepts: true }, _extraction: ex, currentZone: 'wheel' }, { id: 'n' }, 'good');
    const off = strikePayload({ _serverCaps: {}, _extraction: ex, currentZone: 'wheel' }, { id: 'n' }, 'good');
    check('5. with the cap: points and presses, no summary', on.g && on.k && !on.swipeFp);
    check('5. without it: the summary, as before', off.swipeFp && !off.g && !off.k);
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
if (failures) process.exit(1);
