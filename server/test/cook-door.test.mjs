/* ═══ v2.3.5213: THE COOK DOOR -- THE ACTIVITY CLAIM'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/cook-door.md)
 *
 * A cook's only phase on the worker is the phone's claim on its moves,
 * `ps.ex`, which also says fire, mine, chop, fish and a farm step.  Its one
 * writer is movement.js _exTo, by a way of EX_WAYS (move, linger, take), with
 * the edge stamps (_exAt, _exX, _exY).  A claim is a short string or nothing
 * (live flag `exdoor: false` takes any value the old line took).  This suite:
 *
 *   1. the door's own rules: the claim, its shape, the ways to nothing, the
 *      stamps on the nothing->something edge only, the kill switch;
 *   2. A SECOND WRITER FAILS: a write of `.ex` anywhere in server/src that is
 *      not _exTo's.  The phase table's guard reads the same off the syntax
 *      tree (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. through the real room: a move's `ex: 'cook'` claims and stamps; the
 *      phone's 500 ms heartbeat re-sending it moves no stamp; a farm step and
 *      every code the game sends pass whole; `ex: null` clears; a linger
 *      clears; a body take clears;
 *   4. step 1 changes nothing for the game's own claims; a claim that is no
 *      short string (a modified page's) is nothing, unless the switch is off;
 *   5. THE WIRE, BOTH WAYS (CLAUDE.md §5 "either side ships first"): the
 *      claim reaches the other phones on the tick as it always did, a v2
 *      phone and a v1 phone alike; a phone that sends no `ex` (an older one,
 *      a quiet move) leaves the claim as it was.  The shape on the wire is
 *      unchanged (a string or null; the game's own codes are 16 characters
 *      at most, game/farmWork.js parseFarmEx), so no cap: a newer phone with
 *      an older worker is today's phone with today's worker.
 *
 * Break proof, tried by hand: `ps.ex = msg.ex || null;` put back in
 * _handleMove -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { movementMethods, EX_WAYS, EX_MAX } from '../src/movement.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

let T = 1_900_000_000_000;
Date.now = () => T;

/* ── 1. the door's own rules ── */
{
  check('1. the ways: move claims; linger and take clear', JSON.stringify(EX_WAYS) === JSON.stringify({ move: 'claim', linger: 'none', take: 'none' }) && EX_MAX === 32);
  const door = Object.assign(Object.create(null), movementMethods, { _liveFlags: {} });
  const ps = { x: 10, y: 20, ex: null, _exAt: 0 };
  check('1. a claim is written, and stamps its start (when and where)', door._exTo(ps, 'cook', 'move') === true && ps.ex === 'cook' && ps._exAt === T && ps._exX === 10 && ps._exY === 20);
  T += 500; ps.x = 99;
  door._exTo(ps, 'cook', 'move');
  check('1. the same claim again moves no stamp (the edge only)', ps._exAt === T - 500 && ps._exX === 10);
  door._exTo(ps, 'fire', 'move');
  check('1. a claim changed without nothing between keeps the first start', ps.ex === 'fire' && ps._exAt === T - 500);
  door._exTo(ps, null, 'move');
  check('1. nothing clears it, and its clock', ps.ex === null && ps._exAt === 0);
  door._exTo(ps, 'chop', 'move');
  check('1. linger clears it', door._exTo(ps, 'cook', 'linger') === true && ps.ex === null && ps._exAt === 0);
  door._exTo(ps, 'chop', 'move');
  check('1. take clears it', door._exTo(ps, 'cook', 'take') === true && ps.ex === null && ps._exAt === 0);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._exTo(ps, 'cook', 'nope') === false && door._exTo(ps, 'cook', 'toString') === false && door._exTo(null, 'cook', 'move') === false && ps.ex === null);
  for (const bad of [7, { a: 1 }, ['cook'], true, 'x'.repeat(EX_MAX + 1), '']) {
    door._exTo(ps, 'cook', 'move');
    door._exTo(ps, bad, 'move');
    if (ps.ex !== null) { check('1. a claim that is no short string is nothing: ' + JSON.stringify(bad), false, ps.ex); break; }
  }
  check('1. a claim that is no short string is nothing (a number, an object, a list, true, 33 chars, empty)', ps.ex === null);
  door._liveFlags = { exdoor: false };
  door._exTo(ps, 7, 'move');
  check('1. exdoor: false takes any value the old line took (msg.ex || null)', ps.ex === 7);
  door._exTo(ps, 0, 'move');
  check('1. ...and a falsy one is still nothing', ps.ex === null);
  door._liveFlags = { exdoor: true };
  door._exTo(ps, 7, 'move');
  check('1. exdoor: true is the default', ps.ex === null);
}

/* ── 2. no second writer ── */
{
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor') walk(r + '/'); }
      else if (/\.(js|mjs)$/.test(n)) files.push(r);
    }
  })('server/src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /(?:\.ex|\[\s*['"]ex['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\.ex\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\bex\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!/\bex\b/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/movement.js') {
        if (/^\s{2}_exTo\(ps, ex, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _exTo writes the claim (one write)', doorWrites === 1, doorWrites);
  check('2. no write of .ex in server/src outside _exTo', outside.length === 0, outside);
  const src = ['movement.js', 'linger.js', 'bodytake.js'].map((f) => readFileSync(new URL('server/src/' + f, ROOT), 'utf8')).join('\n');
  const ways = [...src.matchAll(/this\._exTo\([^,]+,\s*[^,]+,\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its one caller: linger, move, take', ways.join() === 'linger,move,take', ways);
}

/* ── 3. through the real room ── */
const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
{
  const room = new GameRoom(mockState(), mockEnv);
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_cd_p', name: 'Cook', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._liveFlags = {};
  const P = room.playerState.bp_cd_p;
  check('setup: one player joined', !!P);
  const move = async (fields, dt) => {
    T += (dt === undefined ? 20 : dt);
    await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: P.x, y: P.y, d: 'left', f: 'west', z: P.z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ...fields }));
  };
  await move({ ex: 'cook' });
  const at = P._exAt;
  check('3. a move\'s ex: cook claims and stamps its start', P.ex === 'cook' && at === T && typeof P._exX === 'number');
  await move({ ex: 'cook' }, 500);
  check('3. the phone\'s heartbeat re-sending it moves no stamp', P.ex === 'cook' && P._exAt === at);
  await move({}, 20);
  check('3. a move with no ex leaves the claim as it was', P.ex === 'cook' && P._exAt === at);
  for (const code of ['fire', 'mine', 'chop', 'fish', 'farm:water:7']) {
    await move({ ex: code });
    if (P.ex !== code) { check('3. every code the game sends passes whole: ' + code, false, P.ex); break; }
  }
  check('3. every code the game sends passes whole (fire, mine, chop, fish, a farm step)', P.ex === 'farm:water:7');
  await move({ ex: null });
  check('3. ex: null clears it', P.ex === null && P._exAt === 0);
  await move({ ex: { not: 'a claim' } });
  check('4. a claim that is no short string is nothing (a modified page\'s)', P.ex === null);
  room._liveFlags = { exdoor: false };
  await move({ ex: { not: 'a claim' } });
  check('4. ...unless exdoor: false, which takes it as the old line did', P.ex && typeof P.ex === 'object');
  room._liveFlags = {};
  await move({ ex: 'cook' });
  room._exTo(P, null, 'linger');
  check('3. a linger clears it', P.ex === null && P._exAt === 0);
  await move({ ex: 'chop' });
  room._exTo(P, null, 'take');
  check('3. a body take clears it', P.ex === null && P._exAt === 0);
}

/* ── 5. the wire, both ways: the claim reaches the other phones ── */
{
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = {};
  const at = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };
  const P = {};
  for (const [id, pv] of [['bp_cd_a', 2], ['bp_cd_v2', 2], ['bp_cd_v1', 1]]) {
    const ws = fakeWs();
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T, moveSig: '' });
    const msg = { type: 'join', id, name: id, ws: [1, 5], data: { x: at.x, y: at.y, z: 'wheel' } };
    if (pv === 2) msg.protocolVersion = 2;
    await room.webSocketMessage(ws, JSON.stringify(msg));
    P[id] = ws;
  }
  const moveA = async (fields) => {
    T += 50;
    await room.webSocketMessage(P.bp_cd_a, JSON.stringify({ type: 'move', x: at.x, y: at.y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ...fields }));
  };
  for (const id of Object.keys(P)) await room.webSocketMessage(P[id], JSON.stringify({ type: 'move', x: at.x, y: at.y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  tickFn();
  /* A's entry as the others last read it: whatever message carried it */
  const exSeen = (ws) => {
    let last;
    for (const raw of ws.sent) {
      const m = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(o, 'bp_cd_a') && o.bp_cd_a && typeof o.bp_cd_a === 'object' && Object.prototype.hasOwnProperty.call(o.bp_cd_a, 'ex')) last = o.bp_cd_a.ex;
        for (const k of Object.keys(o)) if (k !== 'bp_cd_a') walk(o[k]);
      };
      walk(m);
    }
    return last;
  };
  const clear = () => { for (const ws of Object.values(P)) ws.sent.length = 0; };
  clear();
  await moveA({ ex: 'cook' });
  T += 50; tickFn();
  check('5. a v2 phone reads the cook\'s claim on the tick', exSeen(P.bp_cd_v2) === 'cook', exSeen(P.bp_cd_v2));
  check('5. a v1 phone reads it too', exSeen(P.bp_cd_v1) === 'cook', exSeen(P.bp_cd_v1));
  clear();
  await moveA({ ex: 'farm:water:7' });
  T += 50; tickFn();
  check('5. a farm step goes out whole', exSeen(P.bp_cd_v2) === 'farm:water:7' && exSeen(P.bp_cd_v1) === 'farm:water:7', [exSeen(P.bp_cd_v2), exSeen(P.bp_cd_v1)]);
  clear();
  await moveA({ ex: null });
  T += 50; tickFn();
  check('5. its end goes out as null, as before', exSeen(P.bp_cd_v2) === null && exSeen(P.bp_cd_v1) === null, [exSeen(P.bp_cd_v2), exSeen(P.bp_cd_v1)]);
  clear();
  await moveA({ ex: { not: 'a claim' } });
  T += 50; tickFn();
  const v2 = exSeen(P.bp_cd_v2), v1 = exSeen(P.bp_cd_v1);
  check('5. a claim that is no short string never reaches another phone', (v2 === undefined || v2 === null) && (v1 === undefined || v1 === null), [v2, v1]);
  clearInterval(room.tickInterval);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
