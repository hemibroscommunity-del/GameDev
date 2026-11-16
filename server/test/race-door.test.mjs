/* ═══ v2.3.5217: THE RACE DOOR -- A RACE'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/race-door.md)
 *
 * A race's phase is one field, `ps._race` (the race on, or none), written
 * only by race.js _raceTo, by a way of RACE_WAYS (start, end).  The countdown
 * and the running are times on the record.  A race on carries its gun and
 * its deadline after it, so the next move can always end it (live flag
 * `racedoor: false` writes any record a caller asks).  This suite:
 *
 *   1. the door's own rules: the ways, a record without its gun or its
 *      deadline refused, the end, the switch;
 *   2. A SECOND WRITER FAILS: a write of `._race` anywhere in server/src
 *      outside _raceTo.  The phase table's guard reads the same off the
 *      syntax tree (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. the race through the real room, in the Wheel: a start at Lil Bro's
 *      spot (the record, its gun and deadline), and every end the next move
 *      makes: late, a false start, a death, a leave of the Wheel;
 *   4. step 1 changes nothing: the start's own refusals (no quest, too far,
 *      outside the Wheel, too soon) still answer first and write nothing;
 *      a start over a race already on replaces it, as before.
 *
 * Break proof, tried by hand: `ps._race = null;` put back in _raceEnd ->
 * FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { raceMethods, RACE_WAYS, RACE } from '../src/race.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* a movable clock */
let clock = Date.now();
Date.now = () => clock;
const tick = (ms) => { clock += ms; };

/* ── 1. the door's own rules ── */
{
  check('1. the ways: start puts a race on; end takes it off', JSON.stringify(RACE_WAYS) === JSON.stringify({ start: 'on', end: 'none' }));
  const door = Object.assign(Object.create(null), raceMethods, { _liveFlags: {} });
  const ps = { _race: null };
  const rec = () => ({ t0: 1000, next: 0, lilMs: 9000, endBy: 12000 });
  const r1 = rec();
  check('1. a start writes the race', door._raceTo(ps, r1, 'start') === true && ps._race === r1);
  const r2 = rec();
  check('1. a start over a race on replaces it (as before)', door._raceTo(ps, r2, 'start') === true && ps._race === r2);
  check('1. an end takes it off', door._raceTo(ps, null, 'end') === true && ps._race === null);
  check('1. an end of no race is still an end (it was: the old line wrote null)', door._raceTo(ps, null, 'end') === true && ps._race === null);
  check('1. an end takes no record (null only)', door._raceTo(ps, rec(), 'end') === false);
  let bad = 0;
  for (const r of [null, 7, 'x', { t0: 1000 }, { endBy: 2000 }, { t0: NaN, endBy: 2000 }, { t0: 1000, endBy: Infinity }, { t0: 2000, endBy: 1000 }, { t0: 1000, endBy: 1000 }, { t0: '1000', endBy: '2000' }]) {
    if (door._raceTo(ps, r, 'start') !== false || ps._race !== null) bad++;
  }
  check('1. a race without its gun, or its deadline after it, is refused (the next move could never end it)', bad === 0, bad);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._raceTo(ps, rec(), 'nope') === false && door._raceTo(ps, rec(), 'hasOwnProperty') === false && door._raceTo(null, rec(), 'start') === false);
  door._liveFlags = { racedoor: false };
  check('1. racedoor: false writes a record without its gun or deadline, as the old line would have', door._raceTo(ps, { lilMs: 1 }, 'start') === true && ps._race && ps._race.lilMs === 1);
  check('1. ...but never an end with a record, nor an unknown way', door._raceTo(ps, rec(), 'end') === false && door._raceTo(ps, rec(), 'nope') === false);
  door._liveFlags = { racedoor: true };
  ps._race = null;
  check('1. racedoor: true is the default', door._raceTo(ps, { lilMs: 1 }, 'start') === false && ps._race === null);
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
  const WRITE = /(?:\._race|\[\s*['"`]_race['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|\._race\s*(?:\+\+|--)|delete\s+[\w$.]+\._race\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_race\s*:|\{[^}]*\b_race\s*:\s*[\w$.]+\._race\b[^}]*\}\s*=/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_race')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/race.js') {
        if (/^\s{2}_raceTo\(ps, race, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _raceTo writes the race (its end and its start)', doorWrites === 2, doorWrites);
  check('2. no write of ._race in server/src outside _raceTo', outside.length === 0, outside);
  const src = readFileSync(new URL('server/src/race.js', ROOT), 'utf8');
  const ways = [...src.matchAll(/this\._raceTo\(ps,\s*(?:\{[^}]*\}|null),\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its one caller: end, start', ways.join() === 'end,start', ways);
}

/* ── 3 and 4. the race through the real room, in the Wheel ── */
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const last = (ws, type) => { const r = ws.sent.filter((m) => m.type === type); return r.length ? r[r.length - 1].payload : null; };
{
  const room = new GameRoom(makeState(), mockEnv);
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._liveFlags = {};
  const [cx, cy] = room._wheelT().WHEEL_CENTRE;
  const s0 = { x: cx + RACE.START[0], y: cy + RACE.START[1] };
  const fresh = async (id) => {
    const ws = fakeWs();
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { z: WHEEL_ZONE } }));
    clearInterval(room.tickInterval); room.tickInterval = null;
    const ps = room.playerState[id];
    ps.z = WHEEL_ZONE; ps.x = s0.x; ps.y = s0.y;
    ps._quests = Object.create(null);
    ps._questKills = Object.create(null);
    return { ws, ps, id };
  };
  const start = (P) => room.webSocketMessage(P.ws, JSON.stringify({ type: 'race_start', payload: {} }));
  const move = (P) => room._raceOnMove(P.id, P.ps, P.ps.x, P.ps.y);

  /* the start's own refusals answer first, and write nothing */
  const R = await fresh('bp_rd_r');
  await start(R);
  check('4. no race_1 running: refused (quest), no race on', (last(R.ws, 'race_end') || {}).err === 'quest' && !R.ps._race, last(R.ws, 'race_end'));
  R.ps._quests[RACE.QUEST] = 'active';
  R.ps.x = s0.x + 600;
  await start(R);
  check('4. far from Lil Bro: refused (far), no race on', (last(R.ws, 'race_end') || {}).err === 'far' && !R.ps._race);
  R.ps.x = s0.x; R.ps.z = 'town';
  await start(R);
  check('4. outside the Wheel: refused (where), no race on', (last(R.ws, 'race_end') || {}).err === 'where' && !R.ps._race);
  R.ps.z = WHEEL_ZONE;

  /* a start: the record, with its gun and its deadline */
  await start(R);
  const r = R.ps._race;
  const st = last(R.ws, 'race_state');
  check('3. a start at Lil Bro\'s spot puts a race on, its gun COUNTDOWN_MS away and its deadline after Lil Bro\'s lap',
    !!r && r.t0 === Date.now() + RACE.COUNTDOWN_MS && r.endBy > r.t0 && !!st && st.in === RACE.COUNTDOWN_MS, { r, st });
  await start(R);
  check('4. a second start inside START_GAP_MS: refused (soon), the race kept', (last(R.ws, 'race_end') || {}).err === 'soon' && R.ps._race === r);
  tick(RACE.START_GAP_MS + 1);
  await start(R);
  check('4. a start past the gap, over the race on, replaces it (as before)', !!R.ps._race && R.ps._race !== r && R.ps._race.endBy > R.ps._race.t0);

  /* every end the next move makes */
  tick(R.ps._race.endBy - Date.now() + 1);
  move(R);
  check('3. a move past the deadline ends it: late', R.ps._race === null && (last(R.ws, 'race_end') || {}).err === 'late', last(R.ws, 'race_end'));
  tick(RACE.START_GAP_MS + 1);
  await start(R);
  tick(RACE.COUNTDOWN_MS + 10);
  R.ps.x = s0.x + 900;
  room._raceOnMove(R.id, R.ps, s0.x + 900, s0.y);
  check('3. a first step after the gun from off the line ends it: a false start (early)', R.ps._race === null && (last(R.ws, 'race_end') || {}).err === 'early', last(R.ws, 'race_end'));
  R.ps.x = s0.x;
  tick(RACE.START_GAP_MS + 1);
  await start(R);
  R.ps.dead = true;
  move(R);
  check('3. a death ends it at the next move (left)', R.ps._race === null && (last(R.ws, 'race_end') || {}).err === 'left');
  R.ps.dead = false;
  tick(RACE.START_GAP_MS + 1);
  await start(R);
  R.ps.z = 'town';
  move(R);
  check('3. a leave of the Wheel ends it at the next move (left)', R.ps._race === null && (last(R.ws, 'race_end') || {}).err === 'left');
  R.ps.z = WHEEL_ZONE;
  tick(RACE.START_GAP_MS + 1);
  const ways = [];
  const realTo = room._raceTo;
  room._raceTo = function (ps, race, way) { ways.push(way); return realTo.call(this, ps, race, way); };
  await start(R);
  move(R);   /* before the gun: nothing counts, nothing written */
  room._raceTo = realTo;
  check('3. a move before the gun writes nothing (the start the only way used)', ways.join() === 'start' && !!R.ps._race, ways);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
