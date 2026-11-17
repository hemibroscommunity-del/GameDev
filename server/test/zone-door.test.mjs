/* ═══ v2.3.5537: THE ZONE DOOR -- A PLAYER'S PLACE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/zone-door.md)
 *
 * A player's place on the worker is one field, `ps.z`, written only by
 * zonejudge.js _zoneTo, by a way of ZONE_WAYS (move, respawn, standup, spar).
 * A place that is no zone (movement.js _validZone) is refused (live flag
 * `zonedoor: false` lifts that).  This suite:
 *
 *   1. the door's own rules: each way, a place that is none, a hostile way,
 *      no body, the switch;
 *   2. A SECOND WRITER FAILS: a write of a player's `.z` anywhere in
 *      server/src outside _zoneTo (the copies onto other records -- the
 *      join's data, the near-join lists, the tick's entries, the clone's
 *      birth -- are the phase table's `besides`, read off the tree there:
 *      DOOR_SUITES); each way at its caller;
 *   3. through the real room: a move into the Wheel through the move way, a
 *      move naming no zone keeps the place, a respawn puts them in town.
 *
 * Break proof, tried by hand: `ps.z = 'town';` back in index.js
 * _tickPlayerRespawn -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { zoneJudgeMethods, ZONE_WAYS } from '../src/zonejudge.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(mockState, mockEnv);
room._liveFlags = {};

/* ── 1. the door's own rules ── */
{
  check('1. the ways', JSON.stringify(Object.keys(ZONE_WAYS)) === JSON.stringify(['move', 'respawn', 'standup', 'spar']));
  const door = Object.assign(Object.create(null), zoneJudgeMethods, { _liveFlags: {}, _validZone: room._validZone });
  const ps = { z: 'town' };
  let ok = true;
  for (const [way, z] of [['move', WHEEL_ZONE], ['respawn', 'town'], ['standup', 'town'], ['spar', 'farm_home'], ['move', 'dungeon:abc123']]) {
    if (door._zoneTo(ps, z, way) !== true || ps.z !== z) ok = false;
  }
  check('1. each way writes a place that is a zone', ok, ps.z);
  let bad = 0;
  for (const z of ['', 'nowhere', null, undefined, 7, 'x'.repeat(41), '__proto__']) if (door._zoneTo(ps, z, 'move') !== false || ps.z !== 'dungeon:abc123') bad++;
  check('1. a place that is no zone is refused, the place stands', bad === 0, bad);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._zoneTo(ps, 'town', 'teleport') === false && door._zoneTo(ps, 'town', 'constructor') === false && door._zoneTo(ps, 'town', '__proto__') === false && door._zoneTo(null, 'town', 'move') === false && ps.z === 'dungeon:abc123');
  door._liveFlags = { zonedoor: false };
  check('1. zonedoor: false writes what a caller asks, as the old lines could have', door._zoneTo(ps, 'nowhere', 'move') === true && ps.z === 'nowhere');
  check('1. ...but never an unknown way', door._zoneTo(ps, 'town', 'teleport') === false);
  door._liveFlags = { zonedoor: true };
  check('1. zonedoor: true is the default', door._zoneTo(ps, 'nowhere', 'move') === false);
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
  /* a player's record by the names the worker gives it */
  const WRITE = /\b(?:ps|_ps|p|pl|player|targetPs|attackerPs|ownerPs|this\.playerState\[[^\]]+\])\.z\s*(?:=(?!=)|\+\+|--)|delete\s+[\w$.]+\.z\b/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!/\.z\b/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/zonejudge.js') {
        if (/^\s{2}_zoneTo\(ps, z, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _zoneTo writes the place (one write)', doorWrites === 1, doorWrites);
  check('2. no write of a player\'s .z in server/src outside _zoneTo', outside.length === 0, outside);
  const read = (f) => strip(readFileSync(new URL('server/src/' + f, ROOT), 'utf8'));
  check('2. each way at its caller: the move\'s, the respawn\'s, the stand-up\'s, the clone\'s',
    /this\._zoneTo\(ps, newZone, 'move'\)/.test(read('movement.js'))
    && /this\._zoneTo\(ps, 'town', 'respawn'\)/.test(read('index.js'))
    && /this\._zoneTo\(_ps, 'town', 'standup'\)/.test(read('join.js'))
    && /this\._zoneTo\(ps, ownerPs\.z, 'spar'\)/.test(read('spar.js')));
}

/* ── 3. through the real room ── */
{
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_zd_a', name: 'Placer', protocolVersion: 2, ws: [1, 5], data: { x: 200, y: 200, z: 'town' } }));
  const ps = room.playerState.bp_zd_a;
  const ways = [];
  const realTo = room._zoneTo;
  room._zoneTo = function (p, z, way) { ways.push(way + ':' + z); return realTo.call(this, p, z, way); };
  check('3. a joined player in town', !!ps && ps.z === 'town', ps && ps.z);
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: 201, y: 200, d: 'down', z: 'town' }));
  check('3. a move in its own zone: the place written through the move way', ps.z === 'town' && ways.join() === 'move:town', ways);
  ways.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: 202, y: 200, d: 'down', z: 'nowhere' }));
  check('3. a move naming no zone keeps the place (the move judge drops it first: no write)', ps.z === 'town' && ways.length === 0, ways);
  ways.length = 0;
  ps.z = WHEEL_ZONE;   /* the test's own seat, as a run's arrival would have it */
  ps.dying = true; ps.respawnAt = 1;
  room._tickPlayerRespawn();
  check('3. a respawn: town, through the respawn way', ps.z === 'town' && ways.includes('respawn:town'), { z: ps.z, ways });
  room._zoneTo = realTo;
  clearInterval(room.tickInterval);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
