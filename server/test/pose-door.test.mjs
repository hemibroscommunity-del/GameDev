/* ═══ v2.3.5216: THE POSE DOOR -- A HELD POSE'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/pose-door.md)
 *
 * A held pose is one field, `ps.po` (none, or one of POSE.IDS), written only
 * by poses.js _poseTo, by a way of POSE_WAYS (hold, stand, move, take).  A
 * pose held is one of POSE.IDS and never by the dead or the dying (live flag
 * `posedoor: false` writes any pose a caller asks).  This suite:
 *
 *   1. the door's own rules: the ways, a pose that is no pose, the dead, a
 *      hostile id, the switch;
 *   2. A SECOND WRITER FAILS: a write of `.po` anywhere in server/src outside
 *      _poseTo.  The phase table's guard reads the same off the syntax tree
 *      (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. every way through the real room, in the Wheel: a pose held and on the
 *      tick to a phone near, a stand-up, a step that ends it, a second tab
 *      taking the body over;
 *   4. step 1 changes nothing: the handler's own checks still answer first
 *      (a pose that is no pose, the dead, `emotemoves: false`), and the
 *      spacing between poses is the handler's.
 *
 * Break proof, tried by hand: `ps.po = id;` put back in _handlePose -> FAIL 2
 * (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { poseMethods, POSE_WAYS, POSE } from '../src/poses.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways: hold takes a pose; stand, move and take stand up',
    JSON.stringify(POSE_WAYS) === JSON.stringify({ hold: 'pose', stand: 'none', move: 'none', take: 'none' }));
  const door = Object.assign(Object.create(null), poseMethods, { _liveFlags: {} });
  const ps = { po: null };
  check('1. hold writes a listed pose', door._poseTo(ps, 'sit', 'hold') === true && ps.po === 'sit');
  check('1. ...and another over it', door._poseTo(ps, 'robot', 'hold') === true && ps.po === 'robot');
  for (const way of ['stand', 'move', 'take']) {
    door._poseTo(ps, 'sit', 'hold');
    if (door._poseTo(ps, 'sit', way) !== true || ps.po !== null) { check('1. ' + way + ' stands up (its id ignored)', false, ps.po); break; }
  }
  check('1. stand, move and take each stand up, whatever id they carry', ps.po === null);
  let bad = 0;
  for (const id of ['dance', '__proto__', 'toString', '', 7, { id: 'sit' }, ['sit'], null, undefined]) {
    door._poseTo(ps, 'sit', 'hold');
    if (door._poseTo(ps, id, 'hold') !== false || ps.po !== 'sit') bad++;
  }
  check('1. a hold of what is no pose is refused, and the pose stands as it was', bad === 0, bad);
  check('1. every listed pose can be held', POSE.IDS.every((id) => door._poseTo(ps, id, 'hold') === true && ps.po === id));
  const dead = { po: null, dead: true }, dying = { po: null, dying: true };
  check('1. the dead and the dying hold no pose', door._poseTo(dead, 'sit', 'hold') === false && door._poseTo(dying, 'sit', 'hold') === false && dead.po === null && dying.po === null);
  check('1. ...but stand up', door._poseTo({ po: 'sit', dead: true }, null, 'stand') === true);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._poseTo(ps, 'sit', 'nope') === false && door._poseTo(ps, 'sit', 'constructor') === false && door._poseTo(null, 'sit', 'hold') === false);
  door._liveFlags = { posedoor: false };
  check('1. posedoor: false writes any pose a caller asks, as the old line would have',
    door._poseTo(ps, 'dance', 'hold') === true && ps.po === 'dance' && door._poseTo(dead, 'sit', 'hold') === true && dead.po === 'sit');
  check('1. ...but never an unknown way', door._poseTo(ps, 'sit', 'nope') === false);
  door._liveFlags = { posedoor: true };
  check('1. posedoor: true is the default', door._poseTo(ps, 'dance', 'hold') === false);
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
  const WRITE = /(?:\.po|\[\s*['"]po['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\.po\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\bpo\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!/\bpo\b/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/poses.js') {
        if (/^\s{2}_poseTo\(ps, id, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _poseTo writes the pose (one write)', doorWrites === 1, doorWrites);
  check('2. no write of .po in server/src outside _poseTo', outside.length === 0, outside);
  const src = ['poses.js', 'movement.js', 'bodytake.js'].map((f) => readFileSync(new URL('server/src/' + f, ROOT), 'utf8')).join('\n');
  const ways = [...src.matchAll(/this\._poseTo\([^,]+,\s*[^,]+,\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. move and take have their callers', ways.join() === 'move,take', ways);
  check('2. the phone\'s hold and stand go through one call, by its id', /this\._poseTo\(ps, id, id \? 'hold' : 'stand'\)/.test(src));
}

/* ── 3 and 4. through the real room, in the Wheel ── */
function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
{
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = {};
  const at = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };
  const join = async (id) => {
    const ws = fakeWs();
    room.sessions.set(ws, baseSession());
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: at.x, y: at.y, z: 'wheel' } }));
    return ws;
  };
  const A = await join('bp_pd_a'), B = await join('bp_pd_b');
  const psA = room.playerState.bp_pd_a;
  const keep = () => { for (const id of ['bp_pd_a', 'bp_pd_b']) { const s = room.playerState[id]; if (s) { s.hp = s.maxHp = 1e6; s.dead = false; s.dying = false; } } };
  const step = async (ws, x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  await step(A, at.x, at.y); await step(B, at.x, at.y);
  const pose = async (id) => { const s = room.sessions.get(A); s._poseAt = 0; await room.webSocketMessage(A, JSON.stringify({ type: 'pose', id })); };
  const poSeen = (from) => {
    let last;
    for (const raw of B.sent.slice(from)) {
      const m = JSON.parse(raw);
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (o.bp_pd_a && typeof o.bp_pd_a === 'object') last = o.bp_pd_a.po === undefined ? null : o.bp_pd_a.po;
        for (const k of Object.keys(o)) if (k !== 'bp_pd_a') walk(o[k]);
      };
      walk(m);
    }
    return last;
  };

  keep();
  let from = B.sent.length;
  await pose('sit');
  keep(); tickFn();
  check('3. a pose held: on the player, and on the tick to a phone near', psA.po === 'sit' && poSeen(from) === 'sit', { po: psA.po, seen: poSeen(from) });
  await pose(null);
  check('3. a stand-up', psA.po === null);
  await pose('robot');
  psA.lastMoveAt = Date.now() - 200;
  await step(A, psA.x + 20, psA.y);
  check('3. a real step ends it (the worker\'s move way)', psA.po === null, psA.po);
  await pose('sleep');
  check('3. a pose again after the step', psA.po === 'sleep');
  /* a second tab taking over a body in a fight (bodytake.js; join.js
     calls it only for a fight and a phone that can be placed, `tb: 1`):
     the real start, on the posing body */
  const ways = [];
  const realTo = room._poseTo;
  room._poseTo = function (ps, id, way) { ways.push(way); return realTo.call(this, ps, id, way); };
  room._bodyTakeStart('bp_pd_a', Date.now());
  room._poseTo = realTo;
  check('3. a body taken over by a second tab stands up, through the take way', psA.po === null && ways.join() === 'take', { po: psA.po, ways });
  if (room._bodyTakes) room._bodyTakes.delete('bp_pd_a');
  psA._bodyWait = 0;
  const A2 = await join('bp_pd_a');
  check('3. ...and a plain second join makes the body afresh, with no pose', room.playerState.bp_pd_a.po == null, room.playerState.bp_pd_a.po);

  /* step 1: the handler still answers first */
  const ps2 = room.playerState.bp_pd_a;
  const pose2 = async (id) => { const s = room.sessions.get(A2); s._poseAt = 0; await room.webSocketMessage(A2, JSON.stringify({ type: 'pose', id })); };
  await pose2('dance');
  check('4. a pose that is no pose: none (the handler\'s own check)', ps2.po == null);
  await pose2('sit');
  ps2.dead = true;
  await pose2('robot');
  check('4. the dead strike no pose, and stand up (the handler\'s own check)', ps2.po == null, ps2.po);
  ps2.dead = false;
  room._liveFlags = { emotemoves: false };
  await pose2('sit');
  check('4. emotemoves: false: no pose (the handler\'s switch)', ps2.po == null);
  room._liveFlags = {};
  await pose2('sit');
  const s2 = room.sessions.get(A2);
  await room.webSocketMessage(A2, JSON.stringify({ type: 'pose', id: 'robot' }));
  check('4. two poses inside POSE.MIN_GAP_MS: the second waits (the handler\'s spacing)', ps2.po === 'sit' && s2._poseAt > 0, ps2.po);
  clearInterval(room.tickInterval);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
