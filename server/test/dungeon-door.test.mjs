/* ═══ v2.3.5215: THE DUNGEON DOOR -- A RUN'S ONE PHASE WRITER (card L PR 5) ═══
 * (docs/specs/dungeon-door.md)
 *
 * A run's phase is one field, `inst.runPhase` ('active', 'boss', 'done'),
 * written only by dungeon.js _dungeonTo, by a way of DUNGEON_WAYS (boss,
 * clear), which also writes the old pair for its readers (`state` 'done' at
 * the end, `bossSpawned` true at the boss).  The end is final and the boss
 * comes once, after the waves (live flag `dungeondoor: false` lets both be
 * written again).  This suite:
 *
 *   1. the door's own rules: the ways, the old pair, a run made by hand read
 *      from the old pair, the end final, one boss, the switch;
 *   2. A SECOND WRITER FAILS: a write of `.runPhase` or `.bossSpawned`
 *      anywhere in server/src, or of `.state` in the dungeon's own files,
 *      outside _dungeonTo.  The phase table's guard reads `.runPhase` off
 *      the syntax tree too (tools/guards/phase-table.test.mjs §2);
 *   3. a real run through the room, in the Wheel: born active, its waves,
 *      the boss, the clear; and a run with no boss, straight to done;
 *   4. step 1 changes nothing: all through the boss the old `state` still
 *      reads 'active' (the start's "already running" refuses a second run,
 *      as before), and a done run's tick asks the door nothing.
 *
 * Break proof, tried by hand: `inst.bossSpawned = true;` put back in
 * _dungeonSpawnBoss -> FAIL 2 (and the run's phase stays 'active': FAIL 3).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { dungeonMethods, DUNGEON_PHASES, DUNGEON_WAYS } from '../src/dungeon.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the phases are active, boss, done', DUNGEON_PHASES.join() === 'active,boss,done');
  check('1. the ways: boss -> boss, clear -> done', JSON.stringify(DUNGEON_WAYS) === JSON.stringify({ boss: 'boss', clear: 'done' }));
  const door = Object.assign(Object.create(null), dungeonMethods, { _liveFlags: {} });
  const run = () => ({ state: 'active', bossSpawned: false, runPhase: 'active' });
  let r = run();
  check('1. active -> boss, and the old bossSpawned with it (state still active)',
    door._dungeonTo(r, 'boss', 'boss') === true && r.runPhase === 'boss' && r.bossSpawned === true && r.state === 'active');
  check('1. boss -> done, and the old state with it', door._dungeonTo(r, 'done', 'clear') === true && r.runPhase === 'done' && r.state === 'done');
  r = run();
  check('1. active -> done (a run with no boss)', door._dungeonTo(r, 'done', 'clear') === true && r.runPhase === 'done' && r.state === 'done' && r.bossSpawned === false);
  check('1. the end is final: no boss after it, no second clear',
    door._dungeonTo(r, 'boss', 'boss') === false && door._dungeonTo(r, 'done', 'clear') === false && r.runPhase === 'done' && r.bossSpawned === false);
  r = run();
  door._dungeonTo(r, 'boss', 'boss');
  check('1. one boss: a second is refused', door._dungeonTo(r, 'boss', 'boss') === false && r.runPhase === 'boss');
  r = run();
  check('1. a way names its own phase only', door._dungeonTo(r, 'done', 'boss') === false && door._dungeonTo(r, 'boss', 'clear') === false && r.runPhase === 'active');
  check('1. an unknown way, one off the prototype, or no run is refused',
    door._dungeonTo(r, 'done', 'nope') === false && door._dungeonTo(r, undefined, 'toString') === false && door._dungeonTo(null, 'done', 'clear') === false && door._dungeonTo(7, 'done', 'clear') === false);
  check('1. a run made by hand (no runPhase) is read from the old pair',
    door._dungeonPhase({ state: 'active' }) === 'active' && door._dungeonPhase({ state: 'active', bossSpawned: true }) === 'boss'
    && door._dungeonPhase({ state: 'done', bossSpawned: true }) === 'done' && door._dungeonPhase(null) === null);
  const hand = { state: 'done', bossSpawned: false };
  check('1. ...so a done run made by hand is final too', door._dungeonTo(hand, 'boss', 'boss') === false && hand.bossSpawned === false);
  r = run();
  r.runPhase = 'nonsense';
  check('1. a runPhase that is no phase is read from the old pair', door._dungeonPhase(r) === 'active');
  door._liveFlags = { dungeondoor: false };
  r = { state: 'done', bossSpawned: false, runPhase: 'done' };
  check('1. dungeondoor: false writes a boss on a done run, as the old line would have (state stays done)',
    door._dungeonTo(r, 'boss', 'boss') === true && r.bossSpawned === true && r.state === 'done');
  check('1. ...and a second clear', door._dungeonTo(r, 'done', 'clear') === true && r.state === 'done');
  check('1. ...but never a wrong way', door._dungeonTo(r, 'done', 'boss') === false);
  door._liveFlags = { dungeondoor: true };
  check('1. dungeondoor: true is the default', door._dungeonTo({ state: 'done', runPhase: 'done' }, 'done', 'clear') === false);
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
  const writeOf = (prop) => new RegExp('(?:\\.' + prop + '|\\[\\s*[\'"]' + prop + '[\'"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.' + prop + '\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b' + prop + '\\s*:');
  const RUN = writeOf('runPhase'), BOSS = writeOf('bossSpawned'), STATE = writeOf('state');
  const DUNGEON_FILES = new Set(['server/src/dungeon.js', 'server/src/wheeldungeon.js', 'server/src/slimeboss.js']);
  const outside = [];
  const doorWrites = { runPhase: 0, state: 0, bossSpawned: 0 };
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/dungeon.js') {
        if (/^\s{2}_dungeonTo\(inst, to, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      const hits = [];
      if (RUN.test(l)) hits.push('runPhase');
      if (BOSS.test(l)) hits.push('bossSpawned');
      if (DUNGEON_FILES.has(f) && STATE.test(l)) hits.push('state');
      if (!hits.length) continue;
      if (inDoor) { for (const h of hits) doorWrites[h]++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _dungeonTo writes the phase and the old pair (one write each)', doorWrites.runPhase === 1 && doorWrites.state === 1 && doorWrites.bossSpawned === 1, doorWrites);
  check('2. no write of .runPhase or .bossSpawned in server/src, nor of a run\'s .state, outside _dungeonTo', outside.length === 0, outside);
  const src = readFileSync(new URL('server/src/dungeon.js', ROOT), 'utf8');
  check('2. a run is born active, once, in _handleDungeonStart', (src.match(/state: 'active', bossSpawned: false, runPhase: 'active',/g) || []).length === 1);
  const ways = [...src.matchAll(/this\._dungeonTo\([^,]+,\s*'[a-z]+',\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its one caller: boss, clear', ways.join() === 'boss,clear', ways);
}

/* ── 3 and 4. a real run through the room ── */
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const ofType = (ws, type) => ws.sent.filter((m) => m.type === type);
{
  const room = new GameRoom(makeState(), mockEnv);
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._liveFlags = {};
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_dd_a', name: 'Delver', protocolVersion: 2, ws: [1, 5], data: { z: 'wheel' } }));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const ps = room.playerState.bp_dd_a;
  ps.level = 5;
  const start = (config) => room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { config } }));
  const killAll = (zone) => { for (const m of room.monsters[zone] || []) m.alive = false; };

  ws.sent.length = 0;
  await start({ waves: 2, hasBoss: true, monsters: [{ archetype: 'fodder', count: 2 }] });
  const st = ofType(ws, 'dungeon_started')[0];
  const zone = st && st.payload.zone;
  const inst = zone && room._dungeons.get(zone.slice('dungeon:'.length));
  check('3. a start makes a run, born active (and the old pair: active, no boss)',
    !!inst && inst.runPhase === 'active' && inst.state === 'active' && inst.bossSpawned === false, inst && { p: inst.runPhase, s: inst.state, b: inst.bossSpawned });
  ps.z = zone;   /* inside: a run is ticked by the players in its place */
  killAll(zone);
  room._tickDungeons(Date.now());
  check('3. a wave cleared is no phase: wave 2, still active', inst.wave === 2 && inst.runPhase === 'active', { wave: inst.wave, p: inst.runPhase });
  killAll(zone);
  ws.sent.length = 0;
  room._tickDungeons(Date.now());
  const boss = (room.monsters[zone] || []).find((m) => m._dungeonBoss && m.alive);
  check('3. the last wave cleared brings the boss: runPhase boss, bossSpawned true', !!boss && inst.runPhase === 'boss' && inst.bossSpawned === true && ofType(ws, 'dungeon_boss').length === 1,
    { boss: !!boss, p: inst.runPhase, b: inst.bossSpawned });
  check('4. ...and the old state still reads active all through the boss (its readers)', inst.state === 'active');
  ws.sent.length = 0;
  await start({ waves: 1 });
  check('4. a second start while you are in your run in its boss: already-running, as before',
    (ofType(ws, 'dungeon_error')[0] || { payload: {} }).payload.code === 'already-running' && room._dungeons.size === 1, ws.sent.map((m) => m.type));
  room._tickDungeons(Date.now());
  check('3. the boss alive: the run waits (no clear)', inst.runPhase === 'boss');
  killAll(zone);
  ws.sent.length = 0;
  room._tickDungeons(Date.now());
  check('3. the boss killed: the run is done (and the old state with it), dungeon_complete sent',
    inst.runPhase === 'done' && inst.state === 'done' && ofType(ws, 'dungeon_complete').length === 1, { p: inst.runPhase, s: inst.state, sent: ws.sent.map((m) => m.type) });
  const doneAt = inst.doneAt;
  ws.sent.length = 0;
  room._tickDungeons(Date.now());
  check('4. a done run\'s tick asks nothing more (no second complete, the end kept)',
    inst.runPhase === 'done' && inst.doneAt === doneAt && ofType(ws, 'dungeon_complete').length === 0);

  /* a run with no boss: active, straight to done */
  room._dungeonCleanup(inst);
  ps.z = 'wheel';
  ws.sent.length = 0;
  await start({ waves: 1, hasBoss: false, monsters: [{ archetype: 'fodder', count: 1 }] });
  const st2 = ofType(ws, 'dungeon_started')[0];
  const zone2 = st2 && st2.payload.zone;
  const inst2 = zone2 && room._dungeons.get(zone2.slice('dungeon:'.length));
  ps.z = zone2;
  killAll(zone2);
  room._tickDungeons(Date.now());
  check('3. a run with no boss: active, straight to done, never a boss', !!inst2 && inst2.runPhase === 'done' && inst2.state === 'done' && inst2.bossSpawned === false,
    inst2 && { p: inst2.runPhase, s: inst2.state, b: inst2.bossSpawned });
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
