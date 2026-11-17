/* ═══ v2.3.5523: THE RIDE DOOR -- THE BOARD'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/ride-door.md)
 *
 * The skateboard is one field, `ps._ride` (off, on), with the session it
 * tells, `ps._ridePid`, beside it; written only by ride.js _rideTo, by a way
 * of RIDE_WAYS (board, end).  A board is taken by the living alone and tells
 * a session; an end is only of a ride that is on (live flag
 * `ridedoor: false` lifts both).  This suite:
 *
 *   1. the door's own rules: the ways, the dead, no session, an end of
 *      none, a hostile way, the switch;
 *   2. A SECOND WRITER FAILS: a write of `._ride` or `._ridePid` anywhere in
 *      server/src outside _rideTo.  The phase table's guard reads the same
 *      off the syntax tree (tools/guards/phase-table.test.mjs §2,
 *      DOOR_SUITES);
 *   3. every way through the real room, in the Wheel: on, off, a step off
 *      the safe ground, a hit, a death;
 *   4. step 1 changes nothing: the handler's own checks still answer first
 *      (where, busy, soon, the `ride` switch).
 *
 * Break proof, tried by hand: `ps._ride = true;` put back in _handleRide
 * -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { rideMethods, RIDE_WAYS, RIDE } from '../src/ride.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways: board gets on, end gets off', JSON.stringify(RIDE_WAYS) === JSON.stringify({ board: 'on', end: 'off' }));
  const door = Object.assign(Object.create(null), rideMethods, { _liveFlags: {} });
  const ps = { _ride: false };
  check('1. board puts the living on, telling its session', door._rideTo(ps, 'board', 'p1') === true && ps._ride === true && ps._ridePid === 'p1');
  check('1. end takes them off, and forgets the session', door._rideTo(ps, 'end') === true && ps._ride === false && ps._ridePid === undefined);
  check('1. an end of a ride that is off is refused', door._rideTo(ps, 'end') === false && ps._ride === false);
  const dead = { _ride: false, dead: true }, dying = { _ride: false, dying: true };
  check('1. the dead and the dying get on no board', door._rideTo(dead, 'board', 'p1') === false && door._rideTo(dying, 'board', 'p1') === false && !dead._ride && !dying._ride);
  let bad = 0;
  for (const pid of [null, undefined, '', 7, { id: 'p1' }]) if (door._rideTo(ps, 'board', pid) !== false || ps._ride) bad++;
  check('1. a board with no session to tell is refused', bad === 0, bad);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._rideTo(ps, 'nope', 'p1') === false && door._rideTo(ps, 'constructor', 'p1') === false && door._rideTo(ps, '__proto__', 'p1') === false && door._rideTo(null, 'board', 'p1') === false && !ps._ride);
  door._liveFlags = { ridedoor: false };
  check('1. ridedoor: false writes what a caller asks, as the old lines would have',
    door._rideTo(dead, 'board', 'p1') === true && dead._ride === true && door._rideTo(ps, 'end') === true && ps._ride === false);
  check('1. ...but never an unknown way', door._rideTo(ps, 'nope', 'p1') === false);
  door._liveFlags = { ridedoor: true };
  check('1. ridedoor: true is the default', door._rideTo({ dead: true }, 'board', 'p1') === false);
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
  const WRITE = /(?:\._ride(?:Pid)?\b|\[\s*['"]_ride(?:Pid)?['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._ride(?:Pid)?\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_ride(?:Pid)?\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!/_ride/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/ride.js') {
        if (/^\s{2}_rideTo\(ps, way, pid\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _rideTo writes the board and its session (four writes: on and off)', doorWrites === 4, doorWrites);
  check('2. no write of ._ride or ._ridePid in server/src outside _rideTo', outside.length === 0, outside);
  const src = readFileSync(new URL('server/src/ride.js', ROOT), 'utf8');
  check('2. the board way is _handleRide\'s, the end way _rideEnd\'s',
    /_handleRide\(session, msg\) \{[\s\S]*?this\._rideTo\(ps, 'board', pid\)[\s\S]*?\n {2}\},/.test(src)
    && /_rideEnd\(ps, why, pid\) \{[\s\S]*?this\._rideTo\(ps, 'end'\)[\s\S]*?\n {2}\},/.test(src));
}

/* ── 3 and 4. through the real room, in the Wheel ── */
const realNow = Date.now;
let T = realNow();
Date.now = () => T;
const wait = (ms) => { T += ms; };
const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
{
  const room = new GameRoom(mockState, mockEnv);
  room._liveFlags = {};
  const Wt = room._wheelT();
  const [CX, CY] = Wt.WHEEL_CENTRE;
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_rd_a', name: 'Rider', protocolVersion: 2, data: { x: CX, y: CY, z: 'wheel' } }));
  const ps = room.playerState.bp_rd_a;
  const send = async (o) => room.webSocketMessage(ws, JSON.stringify(o));
  const ride = async (on) => { wait(RIDE.TOGGLE_MS + 1); await send({ type: 'ride', payload: { on: on ? 1 : 0 } }); };
  const last = () => { const m = ws.sent.filter((q) => q.type === 'ride_state'); return m.length ? m[m.length - 1].payload : null; };
  const fresh = () => {
    ps.z = 'wheel'; ps.x = CX; ps.y = CY; ps.dead = false; ps.dying = false; ps.disconnected = false;
    ps.blocking = false; ps.dodging = false; ps.ex = null; ps.po = null; ps._race = null;
    ps.hp = ps.maxHp = 1e6; ps._godUntil = 0; room._liveFlags = {};
  };
  const ways = [];
  const realTo = room._rideTo;
  room._rideTo = function (p, way, pid) { ways.push(way); return realTo.call(this, p, way, pid); };

  fresh();
  await ride(true);
  check('3. a get-on in the town: on, through the board way, telling its session',
    ps._ride === true && ps._ridePid === 'bp_rd_a' && last() && last().on === true && ways.join() === 'board', { ride: ps._ride, pid: ps._ridePid, last: last(), ways });
  ways.length = 0;
  await ride(false);
  check('3. a get-off: off, through the end way, why "asked"', ps._ride === false && ps._ridePid === undefined && last().on === false && last().why === 'asked' && ways.join() === 'end', { last: last(), ways });

  fresh(); await ride(true); ways.length = 0;
  room._rideEnd(ps, 'hit');
  check('3. a hit ends it through the end way (combat.js\'s call)', ps._ride === false && last().why === 'hit' && ways.join() === 'end', { last: last(), ways });

  fresh(); await ride(true); ways.length = 0;
  ps.dying = true;
  room._rideOnMove('bp_rd_a', ps, false);
  check('3. the dying are put off on the next move, through the end way', ps._ride === false && last().why === 'dead' && ways.join() === 'end', { last: last(), ways });

  fresh(); await ride(true); ways.length = 0;
  ps.x = CX + Wt.WHEEL_SAFE_R * 4;
  room._rideOnMove('bp_rd_a', ps, false);
  check('3. off the safe ground: put off, why "edge"', ps._ride === false && last().why === 'edge' && ways.join() === 'end', { last: last(), ways });

  fresh(); ways.length = 0;
  room._rideEnd(ps, 'hit');
  check('3. an end of nobody riding writes nothing and says nothing', ways.length === 0);

  /* step 1: the handler still answers first */
  fresh();
  ps.x = CX + Wt.WHEEL_SAFE_R * 4;
  await ride(true);
  check('4. off the safe ground: refused "where" (the handler\'s own check)', ps._ride === false && last().why === 'where', last());
  fresh();
  ps.po = 'sit';
  await ride(true);
  check('4. posing: refused "busy"', ps._ride === false && last().why === 'busy', last());
  fresh();
  ps.dead = true;
  await ride(true);
  check('4. dead: refused "dead"', ps._ride === false && last().why === 'dead', last());
  fresh();
  room._liveFlags = { ride: false };
  await ride(true);
  check('4. ride: false: refused "off" (the ride\'s own switch)', ps._ride === false && last().why === 'off', last());
  fresh();
  await ride(true);
  await send({ type: 'ride', payload: { on: 0 } });   /* no wait */
  check('4. two toggles inside RIDE.TOGGLE_MS: the second answered "soon", still on', ps._ride === true && last().why === 'soon', last());
  room._rideTo = realTo;
  clearInterval(room.tickInterval);
}
Date.now = realNow;

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
