/* ═══ v2.3.5202: THE PHASE TABLE, HELD (grand plan step 5.3b; card L PR 2) ═══
 *
 * The owner, 2026-11-13: every implicit state machine explicit, through one
 * door.  src/state/phases.js is the table: one row a state machine a side
 * (the worker, the page), with its one field, its states, its one transition
 * function, what clears it, what a rejoin re-sends, and whether it is a
 * `door` today (one field, one function, and something that fails a second
 * writer) or `todo` (today's fields and writers, read from the code).  The
 * spec is docs/specs/phase-table.md.  This guard holds it:
 *
 *   1. every row has its columns, each from its closed list; no machine is
 *      two rows on one side; every name the plan and SHAPES part 5 give is a
 *      row (MUST, below);
 *   2. a `door` row's field has no writer outside its function.  What holds
 *      a door is a CLOSED LIST here (v2.3.5203, the gatekeeper's sitting 8:
 *      a suite that only named the field let a `todo` turn `door` with
 *      nothing built): DOOR_SUITES, the suites that fail a second writer of
 *      that field through that function today (life-door, zone-leftovers),
 *      for which this guard writes no second rule; and SCAN_DOORS, the rows
 *      no suite holds, whose `scan` this guard runs.  A scan reads every
 *      write of the field off the syntax tree (@babel: `x.phase =`,
 *      `x['phase'] =`, `++`, `delete`, `Object.assign(x, { phase })`), in
 *      the function the tree puts it in, and each must be in one of the
 *      row's places (`besides`: a write that is not the machine's, with why;
 *      a stale entry or a place that writes nothing fails).  A `door` row
 *      carries no `today`;
 *   2b. the table is plain data (read before it is imported);
 *   3. every slot of REJOIN_SLOTS (src/game/rejoinSlots.js) is named by a row,
 *      and every slot a row names is in REJOIN_SLOTS;
 *   4. every machine name in the wire table's `phase` column
 *      (server/src/wire/columns.js, card N's, and every row's demands) is a
 *      row;
 *   5. every ledger row with D's `phase` mark (src/state/<system>.js, card U's)
 *      is a page row's field (or one of a todo row's fields), or is listed in
 *      NOT_A_MACHINE with why; a page field a row names is a ledger row;
 *   6. a `todo` row's worker fields name files and functions that exist (each
 *      writer's file holds the field's name and the function's), and every
 *      row's `clears` names a function its file holds;
 *   7. the `todo` rows are a census (the plan's rule 3): their count may only
 *      fall.  TODO_LINE is the gatekeeper's alone to lower, and to make
 *      strict; nobody raises it.  A row turns `door` in its machine's PR
 *      (card L PR 5, one machine a PR).
 *
 * BREAK PROOF (the plan's rule 8), each tried by hand, 2026-11-14:
 *   1. a second writer of `ps.life` (`...playerState.x.life = 'alive';` in
 *      server/src/duel.js _resolveDuel) -> life-door.test FAIL 2, the suite
 *      the `life` row names.  This guard holds the row to that suite: the
 *      row's `fn` renamed `_lifeTo2`                        -> FAIL 2 here
 *   2. a second writer of `session.phase` (`_s.phase = 'joined';` in
 *      server/src/duel.js _resolveDuel)                    -> FAIL 2 (its scan)
 *   3. `Object.freeze({ slot: 'fish', since: 0, clears: ['rejoinClear'],
 *      resend: null, why: 'x' })` added to REJOIN_SLOTS      -> FAIL 3
 *   4. a ledger phase with no row: the `_facing` entry taken off
 *      NOT_A_MACHINE                                       -> FAIL 5
 *   5. the `race` worker row deleted -> FAIL 1 (4 stays green: the page's
 *      `race` row still carries the wire's name)
 *   6. TODO_LINE one under the count (4; tag 5676)           -> FAIL 7
 * v2.3.5203 (the gatekeeper's sitting 8, its two holes), each tried by hand:
 *   7. `_sneakJoin(ws,\n msg) { ... s.phase = 'joined' }` at the end of
 *      join.js's joinMethods (its parameters over two lines)  -> FAIL 2
 *   8. `Object.assign(_ss, { phase: 'joined' })` in duel.js _resolveDuel
 *                                                         -> FAIL 2
 *   9. `x.alive = true` in slimeboss.js (a monster made alive under
 *      another name than m)                                -> FAIL 2
 *  10. the worker `guard` row turned door (`ps.blocking`, `_hitStopped`,
 *      shield-guard.test, its `today` left in)  -> FAIL 2 (twice: not on
 *      DOOR_SUITES, and a door carrying today)
 *  11. `import x from "./y.js";` at the top of phases.js    -> FAIL 2b
 * v2.3.5209 (the gatekeeper's sitting 9: a suite-held door was held only by
 * that suite's pattern; now the tree reads it too), each tried by hand:
 *  12. `S.currentZone = "wheel"` in a new function of wheelHome.js -> FAIL 2
 *      (and zone-leftovers §6a)
 *  13. `Object.assign(S, { currentZone: "wheel" })` there   -> FAIL 2 (the
 *      suite's regex passes it: the hole this closes)
 *  14. `ps.life = "alive"` in a new function of monsterlife.js -> FAIL 2
 *  15. tileRenderer.js's `this.currentZone =` renamed (its besides gone)
 *                                                         -> FAIL 2
 * v2.3.5212 (the party door: a Map's set / delete / clear are writes):
 *  16. `this._partyByPlayer.set(accepterId, p)` back in _handlePartyAccept
 *                                                         -> FAIL 2
 *  17. `room._partyByPlayer.delete(id)` in a new function of alliance.js
 *                                                         -> FAIL 2
 * v2.3.5213 (the cook door):
 *  18. `ps.ex = msg.ex || null;` back in _handleMove      -> FAIL 2
 * v2.3.5214 (the harvest door: a record's keys are writes, `keyed`):
 *  19. `this.extractions[session.id] = rec;` back in _handleExtractionStart
 *                                                         -> FAIL 2
 *  20. `delete room.extractions[id];` in a new function of botsig.js
 *                                                         -> FAIL 2
 * v2.3.5214 (the gatekeeper's low, sitting 15: a birth by its text alone
 * let a wipe through; a `besides` entry may now say `fn` and `ifMissing`,
 * read off the tree):
 *  21. `this._partyByPlayer = new Map();` (no `if`) in a new function of
 *      party.js                                          -> FAIL 2
 *  22. `this.extractions = Object.create(null);` in a new function of
 *      index.js (not the constructor)                    -> FAIL 2
 * v2.3.5215 (the dungeon door):
 *  23. `inst.runPhase = 'done';` in a new function of slimeboss.js
 *                                                         -> FAIL 2
 *  24. `inst.state = 'done';` back in _dungeonComplete (the trade line's
 *      besides is the door's own, `fn`)                   -> FAIL 2
 * v2.3.5216 (the pose door):
 *  25. `ps.po = id;` back in _handlePose                  -> FAIL 2
 * v2.3.5216 (the gatekeeper's low, sitting 16: destructuring, template keys
 * and reflective writes, read off the tree):
 *  26. `({ ex: ps.ex } = msg);` in a new function of movement.js -> FAIL 2
 *  27. `[ps.po] = ['sit'];` in a new function of ride.js  -> FAIL 2
 *  28. ``ps[`po`] = 'robot';`` in the same                 -> FAIL 2
 *  29. `Reflect.set(ps, 'po', 'sit');` in admin.js        -> FAIL 2
 *  30. `Reflect.deleteProperty(room.extractions, id);` in admin.js
 *      (a keyed field's key)                              -> FAIL 2
 * v2.3.5217 (the race door):
 *  31. `ps._race = null;` back in _raceEnd                -> FAIL 2
 * v2.3.5218 (the race's page door):
 *  32. `S._race = null;` back in race.js dismissRace      -> FAIL 2
 * v2.3.5219 (the harvest's page door: the page's harvest, cook and fishing
 * rows, one field):
 *  33. `S._extraction = null;` back in succeedExtraction -> FAIL 2 (three
 *      times: the three rows)
 * v2.3.5520 (the pose's page door):
 *  34. `S._pose = null;` back in rejoinSlots.js rejoinClear -> FAIL 2
 * v2.3.5521 (the guard's page door):
 *  35. `S._shieldUp = false;` back in shieldToggle.js dropShield -> FAIL 2
 * v2.3.5522 (the arena door):
 *  36. `this._arena = null;` back in gladiator.js _tickArena -> FAIL 2
 *  37. `t.status = 'running';` back in _arenaStart -> FAIL 2 (the duel
 *      line's besides is the arena door's own, `fn`)
 * v2.3.5523 (the ride door):
 *  38. `ps._ride = true;` back in ride.js _handleRide -> FAIL 2
 * v2.3.5525 (the loading door):
 *  39. `S._farmArtHold = seq;` back in farmTrip.js -> loading-door.test FAIL 2
 *  40. `S._veils = new Map();` in zoneTransitions.js -> FAIL 2
 * v2.3.5533 (the fight's page door):
 *  48. `S._pvpSkullType = null;` back in noMansLand.js -> fight-page-door.test FAIL 2
 * v2.3.5531 (the arena's page door):
 *  47. `S3._arenaMatch = null;` back in BroTown.jsx -> arena-page-door.test FAIL 2
 * v2.3.5530 (the trade's and the ride's page doors):
 *  45. `S._t2Live = null;` back in rejoinSlots.js -> trade-page-door.test FAIL 2
 *  46. `r.on = !!p.on;` back in ride.js rideApply -> ride-page-door.test FAIL 2
 * v2.3.5529 (the duel's and the party's page doors):
 *  43. `S._inDuel = null;` back in rejoinSlots.js -> duel-page-door.test FAIL 2
 *  44. `S._party = payload;` back in gameEvents.js -> party-page-door.test FAIL 2
 * v2.3.5528 (the connection door):
 *  42. `S._realtimeStatus = 'idle';` back in wsClient.js -> connection-door.test FAIL 2
 * v2.3.5526 (the window door):
 *  41. `S._npcProxLatch = null;` back in BroTown.jsx gameLoop -> window-door.test FAIL 2
 *
 * Run from the repository's root: node tools/guards/phase-table.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { ROOT } from './lib/systems.mjs';
import { filesOf, systemNames } from './lib/filesOf.mjs';
/* v2.3.5219: a big file named by its file name, found through the system
   map (tests-by-system: a guard names no big file by its folder and name,
   which breaks the day it moves) */
const fileNamed = (name) => {
  for (const s of systemNames()) { const f = filesOf(s).find((x) => x.endsWith('/' + name)); if (f) return f; }
  return '(no file ' + name + ')';
};

/* Set 2026-11-14 at its first count.  Only the gatekeeper lowers it.
   v2.3.5371 (the gatekeeper, sitting 14, main 1cce0b2): 31 -> 30, the
   count since card L's trade door (#1809).
   v2.3.5373 (the gatekeeper, sitting 16, main 64bb498): 30 -> 28, the count
   since card L's duel and party doors (#1824, #1835).
   v2.3.5374 (the gatekeeper, sitting 17, main 59469b2): 28 -> 27, the count
   since card L's cook door (#1839).
   v2.3.5375 (the gatekeeper, sitting 18, main abff2ef): 27 -> 24, the count
   since card L's harvest and dungeon doors (#1851, #1855).
   v2.3.5376 (the gatekeeper, sitting 19, main 29b1a0d): 24 -> 22, the count
   since card L's pose and race doors (#1864, #1866).
   v2.3.5379 (the gatekeeper, sitting 21, main b2d763a): 22 -> 16, the count
   since card L's page doors (#1894, #1903, #1910).
   Tag 5660 (the gatekeeper, sitting 22, main f692b93): 16 -> 15, the count
   since card L's arena door (#1930).
   Tag 5661 (the gatekeeper, sitting 23, main 8149d61): 15 -> 14, the count
   since card L's ride door (#1936). */
export const TODO_LINE = 5;   /* v2.3.5676: lowered 6 -> 5 by the gatekeeper, sitting 38 (L's fight page door, #2039); v2.3.5675: lowered 7 -> 6 by the gatekeeper, sitting 37 (L's arena page door, #2031); v2.3.5674: lowered 9 -> 7 by the gatekeeper, sitting 36 (L's trade and ride page doors, #2027); v2.3.5673: lowered 11 -> 9 by the gatekeeper, sitting 35 (L's duel and party page doors, #2022); v2.3.5671: lowered 12 -> 11 by the gatekeeper, sitting 33 (L's connection door, #2012); v2.3.5669: lowered 13 -> 12 by the gatekeeper, sitting 31 (L's window door, #2000); v2.3.5663: 14 -> 13 (#1956) */

/* the machines every side must have a row for: SHAPES part 5's names and
   step 5.3b's list (the plan's own `dungeon`, `connection`, `loading`,
   `window`, and a monster's life).  `worker` / `page` / `both`. */
const MUST = Object.freeze({
  session: 'worker', life: 'both', zone: 'both', monster: 'both',
  fight: 'both', duel: 'both', trade: 'both', party: 'both', ride: 'both',
  harvest: 'both', cook: 'both', guard: 'both', pose: 'both', race: 'both',
  arena: 'both', fishing: 'both', dungeon: 'both',
  connection: 'page', loading: 'page', window: 'page',
});
const SIDES = ['worker', 'page'];
const STATUS = ['door', 'todo'];
/* the edges a machine is cleared on: card D's three (the page's zone, death
   and rejoin), the worker's leave, its own end, or never */
const EDGES = ['zone', 'death', 'rejoin', 'leave', 'end', 'never'];
const SRC_OF = { worker: 'server/src', page: 'src' };

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 1200)));
};
const info = (s) => console.log('     ' + s);
const str = (x) => typeof x === 'string' && x.length > 0;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── 2b. the table is plain data (v2.3.5203, the gatekeeper's sitting 8):
   no import, no call, no expression -- the page could import it one day,
   and a table that runs code is not a table ── */
{
  const rest = readFileSync(join(ROOT, 'src/state/phases.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, ' ')
    .replace(/export const (PHASES|NOT_A_MACHINE) =/g, ' ')
    .replace(/\b[A-Za-z_$][\w$]*\s*:/g, ' ')
    .replace(/\b(null|true|false)\b|-?\b\d+(\.\d+)?\b/g, ' ');
  const left = rest.replace(/[\s{}[\],;]+/g, ' ').trim();
  check('2b: src/state/phases.js is plain data (two lists of literals, nothing else)', left === '', left.slice(0, 120));
  /* read before it is imported: a table that imports or runs anything is
     never run here */
  if (left !== '') { console.log('\n' + failed + ' failed'); process.exit(1); }
}

const T = await import(pathToFileURL(join(ROOT, 'src/state/phases.js')).href);
const ROWS = Array.isArray(T.PHASES) ? T.PHASES : [];
const NOT_A_MACHINE = Array.isArray(T.NOT_A_MACHINE) ? T.NOT_A_MACHINE : [];

/* ── the code, comments blanked out, lines kept (life-door.test's strip) ── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const codeCache = new Map();
function codeOf(rel) {
  if (!codeCache.has(rel)) codeCache.set(rel, existsSync(join(ROOT, rel)) ? strip(readFileSync(join(ROOT, rel), 'utf8')) : null);
  return codeCache.get(rel);
}
function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(join(ROOT, d)).sort()) {
      if (n === 'node_modules' || n.startsWith('.')) continue;
      /* v2.3.5203: the worker's vendored code is not the game's (src-walk.mjs
         skips it too), and src/state/ is data about the code, never code */
      if ((d === 'server/src' && n === 'vendor') || (d === 'src' && n === 'state')) continue;
      const p = d + '/' + n;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(n)) out.push(p);
    }
  };
  walk(dir);
  return out;
}
/* "server/src/leave.js _leaveRun" -> { file, fn } */
const place = (s) => { const m = /^(\S+)\s+(\S+)$/.exec(s || ''); return m ? { file: m[1], fn: m[2] } : null; };
const has = (src, word) => new RegExp('(^|[^\\w$])' + word.replace(/[$]/g, '\\$') + '(?![\\w$])').test(src);

/* ── 1. the rows' columns ── */
const keyOf = (r) => r.name + ' (' + r.side + ')';
{
  const bad = [];
  const seen = new Set();
  for (const [i, r] of ROWS.entries()) {
    const at = `row ${i + 1}${r && r.name ? ' ' + keyOf(r) : ''}`;
    if (!r || typeof r !== 'object') { bad.push(at + ': not an object'); continue; }
    if (!str(r.name) || !/^[a-z][a-zA-Z]*$/.test(r.name)) bad.push(at + ': name');
    if (!SIDES.includes(r.side)) bad.push(at + ': side');
    if (!STATUS.includes(r.status)) bad.push(at + ': status');
    if (seen.has(keyOf(r))) bad.push(at + ': two rows for one machine on one side');
    seen.add(keyOf(r));
    if (!Array.isArray(r.states) || !r.states.length || !r.states.every(str)) bad.push(at + ': states');
    if (!str(r.what)) bad.push(at + ': what (one sentence)');
    if (!Array.isArray(r.clears) || !r.clears.length || !r.clears.every((c) => c && EDGES.includes(c.edge) && str(c.at))) bad.push(at + ': clears ({ edge, at } each, the edge one of ' + EDGES.join(' ') + ')');
    if (!(Array.isArray(r.rejoin) && r.rejoin.length && r.rejoin.every(str)) && !(typeof r.rejoin === 'string' && /^none: \S/.test(r.rejoin))) bad.push(at + ': rejoin (REJOIN_SLOTS slots, or "none: <why>")');
    if (r.status === 'door') {
      if (!str(r.field) || !str(r.fn) || !str(r.file)) bad.push(at + ': a door has its field, fn and file');
      const held = r.held || {};
      if (!str(held.suite) && !(Array.isArray(held.scan) && held.scan.length)) bad.push(at + ': a door is held by its suite or its scan');
    } else if (r.status === 'todo') {
      if (r.field !== null || r.fn !== null || r.file !== null) bad.push(at + ': a todo row has no field, fn or file yet (null)');
      if (!Array.isArray(r.today) || !r.today.length) bad.push(at + ': a todo row lists today\'s fields');
      for (const t of r.today || []) {
        if (r.side === 'page' && !(str(t.field) && /^S\./.test(t.field)) && !(str(t.variable) && str(t.file))) bad.push(at + ': a page field is `S.<name>`, or a variable and its file');
        if (r.side === 'worker' && !(str(t.field) && str(t.file) && Array.isArray(t.writers) && t.writers.length && t.writers.every((w) => place(w)))) bad.push(at + ': a worker field has its file and writers ("<file> <function>")');
      }
    }
  }
  check(`1: every row has its columns, each from its closed list (${ROWS.length} rows)`, bad.length === 0, bad);
  const missing = [];
  for (const [name, sides] of Object.entries(MUST)) {
    for (const side of sides === 'both' ? SIDES : [sides]) if (!seen.has(name + ' (' + side + ')')) missing.push(name + ' (' + side + ')');
  }
  check(`1: every machine of step 5.3b and SHAPES part 5 is a row on its sides (${Object.keys(MUST).length} machines)`, missing.length === 0, missing);
}

/* ── 2. a door's field has no writer outside its function ── */
/* v2.3.5203 (the gatekeeper's sitting 8, two holes closed):
   - WHAT HOLDS A DOOR is a closed list, here, in this file a reviewer reads:
     the suites that fail a second writer of a door's field today
     (DOOR_SUITES: a suite that merely NAMES the field and the function is
     not enough -- that let a `todo` row turn `door` with nothing built), and
     the rows whose writers this guard scans itself because no suite does
     (SCAN_DOORS).  A row turned `door` adds its line to one of them, in its
     machine's PR, with what holds it; a `door` row carrying `today` (the
     fields of a machine not yet one) is refused.
   - A WRITE IS READ OFF THE SYNTAX TREE (@babel, the root's or server/'s, as
     the census script loads it), never off the indentation: `x.phase = `,
     `x['phase'] = `, `++`/`--`, `delete x.phase`, and `Object.assign(x, {
     phase })`, each in the function the tree says it is in (a method whose
     parameters run over two lines is its own name, not the one above).
   - every place a scan names must still write it (a stale place fails). */
/* v2.3.5209 (the gatekeeper's sitting 9, a Found for card L's PR 4): a
   suite's own reading is a pattern (zone-leftovers §6a, a regex over the
   text), so a door it holds is ALSO read here off the syntax tree, the one
   reader: every write of the field's `prop` on the row's side is in the
   row's function and file, or is one of the `besides` (another object's
   property of the same name, named with why). */
const DOOR_SUITES = Object.freeze({
  'server/test/life-door.test.mjs': { field: 'ps.life', fn: '_lifeTo', holds: '§2: no .life / .dying / .dead written in server/src but in life.js',
    prop: 'life', besides: [{ file: 'server/src/monsterlife.js', text: 'm.life = ', why: 'a monster\'s count of lives, not a player\'s phase' }] },
  'server/test/zone-leftovers.test.mjs': { field: 'S.currentZone', fn: 'changeZone', holds: '§6a: the only writer of the game\'s place is changeZone',
    prop: 'currentZone', besides: [{ file: 'src/rendering/systems/tileRenderer.js', text: 'this.currentZone = ', why: 'the tile renderer\'s own note of the zone it drew' }] },
  /* v2.3.5210: the trade door (card L PR 5's first) */
  'server/test/trade-door.test.mjs': { field: 's.state', fn: '_t2To', holds: '§2: no .state written in server/src but in _t2To and NOT_A_TRADE\'s',
    prop: 'state', besides: [
      ...['server/src/index.js', 'server/src/marketplace.js', 'server/src/leaderboard.js', 'server/src/arena.js', 'server/src/feedback.js']
        .map((file) => ({ file, text: 'this.state = state', fn: 'constructor', why: 'the Durable Object\'s own handle, in its constructor' })),
      { file: 'server/src/dungeon.js', text: 'inst.state = ', fn: '_dungeonTo', why: 'a dungeon run\'s old state, written by its own door (the `dungeon` row, v2.3.5215)' },
    ] },
  /* v2.3.5222: card O's ladder (the governor's rung, drawLanes.js `LANE._rung`) -- the planning session's word, sitting 12:
     the rung is a property of a module object, so the tree reads its writes as every other door's */
  'server/test/frame-pacer.test.mjs': { field: '_rung', fn: 'setRung', holds: '§17: setRung is called by the governor alone (framePacer.js), and the rung is written in setRung and the tests\' reset, nowhere else',
    prop: '_rung', besides: [{ file: 'src/game/drawLanes.js', text: 'LANE._rung = ROW', why: 'the tests\' reset (_resetLanes), never the page\'s' }] },
  /* v2.3.5211: the duel door */
  'server/test/duel-door.test.mjs': { field: 'd.status', fn: '_duelTo', holds: '§2: no .status written in server/src but in _duelTo and NOT_A_DUEL\'s',
    prop: 'status', besides: [
      { file: 'server/src/alliance.js', text: 'w.status = ', why: 'an alliance war\'s end, its own record' },
      { file: 'server/src/clans.js', text: 'war.status = ', why: 'a clan war\'s end, its own record' },
      { file: 'server/src/gladiator.js', text: ' t.status = ', fn: '_arenaTo', why: 'an arena tournament: the `arena` row\'s own door (v2.3.5522; the space before `t` keeps out `mt.status =`, the gatekeeper\'s low)' },
      { file: 'server/src/arena.js', text: 'tournament.status = ', why: 'the old Arena object\'s tournament (kept for its binding)' },
    ] },
  /* v2.3.5212: the party door -- a Map, so its set / delete / clear are
     writes too (writesIn) */
  'server/test/party-door.test.mjs': { field: 'this._partyByPlayer', fn: '_partyIn', holds: '§2: no set, delete, clear or new Map of _partyByPlayer in server/src but in _partyIn and its births',
    prop: '_partyByPlayer', besides: [
      { file: 'server/src/party.js', text: 'this._partyByPlayer = new Map()', ifMissing: true, why: 'the map\'s birth, empty, before a load or an accept fills it (through _partyIn); only where it is missing (v2.3.5214)' },
      { file: 'server/src/clanparty.js', text: 'this._partyByPlayer = new Map()', ifMissing: true, why: 'the map\'s birth, empty, before a clan becomes a party (through _partyIn); only where it is missing (v2.3.5214)' },
    ] },
  /* v2.3.5213: the cook door -- the phone's claim on its moves, cooking's
     only phase on the worker (and mining's, chopping's, fishing's and a
     farm step's) */
  'server/test/cook-door.test.mjs': { field: 'ps.ex', fn: '_exTo', holds: '§2: no write of .ex in server/src outside _exTo',
    prop: 'ex', besides: [] },
  /* v2.3.5214: the harvest door (fishing's too) -- a record keyed by id, so
     a write of one of its keys is a write (writesIn's `keyed`) */
  'server/test/harvest-door.test.mjs': { field: 'this.extractions', fn: '_harvestTo', holds: '§2: no write of this.extractions or its keys in server/src outside _harvestTo but its birth',
    prop: 'extractions', keyed: true, besides: [
      { file: 'server/src/index.js', text: 'this.extractions = Object.create(null)', fn: 'constructor', why: 'the map\'s birth, empty, in the room\'s constructor' },
    ] },
  /* v2.3.5215: the dungeon door -- a run's phase in one new field, the old
     pair (state, bossSpawned) written by the door for their readers (the
     suite holds those) */
  'server/test/dungeon-door.test.mjs': { field: 'inst.runPhase', fn: '_dungeonTo', holds: '§2: no write of .runPhase or .bossSpawned in server/src, nor of a run\'s .state, outside _dungeonTo',
    prop: 'runPhase', besides: [] },
  /* v2.3.5216: the pose door */
  'server/test/pose-door.test.mjs': { field: 'ps.po', fn: '_poseTo', holds: '§2: no write of .po in server/src outside _poseTo',
    prop: 'po', besides: [] },
  /* v2.3.5217: the race door */
  'server/test/race-door.test.mjs': { field: 'ps._race', fn: '_raceTo', holds: '§2: no write of ._race in server/src outside _raceTo',
    prop: '_race', besides: [] },
  /* v2.3.5218: the race's page door (the page half of the race row) */
  'server/test/race-page-door.test.mjs': { field: 'S._race', fn: 'raceTo', holds: '§2: no write of ._race in src/ outside raceTo, nor of the race record\'s .phase in race.js',
    prop: '_race', besides: [] },
  /* v2.3.5522: the arena door (its status writes are the duel line's besides, in _arenaTo) */
  'server/test/arena-door.test.mjs': { field: 'this._arena', fn: '_arenaTo', holds: '§2: no write of this._arena in server/src outside _arenaTo, nor of a tournament\'s status',
    prop: '_arena', besides: [] },
  /* v2.3.5523: the ride door (ps._ridePid is written beside it, in _rideTo) */
  'server/test/ride-door.test.mjs': { field: 'ps._ride', fn: '_rideTo', holds: '§2: no write of ._ride or ._ridePid in server/src outside _rideTo',
    prop: '_ride', besides: [] },
  /* v2.3.5533: the fight's page door (its note S._pvpSkullUntil: the suite's §2) */
  'server/test/fight-page-door.test.mjs': { field: 'S._pvpSkullType', fn: 'skullTo', holds: '§2: no write of S._pvpSkullType or S._pvpSkullUntil in src/ outside skullTo',
    prop: '_pvpSkullType', besides: [
      { file: fileNamed('entityRenderer.js'), text: '_pvpSkullType: null, _pvpSkullUntil: 0', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
    ] },
  /* v2.3.5531: the arena's page door (its notes: the suite's §2) */
  'server/test/arena-page-door.test.mjs': { field: 'S._arenaMatch', fn: 'arenaTo', holds: '§2: no write of S._arenaMatch, S._arenaInvolved or S._arenaTournamentId in src/ outside arenaTo',
    prop: '_arenaMatch', besides: [] },
  /* v2.3.5530: the trade's page door */
  'server/test/trade-page-door.test.mjs': { field: 'S._t2Live', fn: 't2LiveTo', holds: '§2: no write of S._t2Live in src/ outside t2LiveTo',
    prop: '_t2Live', besides: [] },
  /* v2.3.5530: the ride's page door (its phase, the record's on: the suite's §2) */
  'server/test/ride-page-door.test.mjs': { field: 'S._ride', fn: 'rideTo', holds: '§2: no write of S._ride, nor of its on, in src/ outside rideTo',
    prop: '_ride', besides: [] },
  /* v2.3.5529: the duel's page door (its note S._activeDuel: the suite's §2) */
  'server/test/duel-page-door.test.mjs': { field: 'S._inDuel', fn: 'duelTo', holds: '§2: no write of S._inDuel or S._activeDuel in src/ outside duelTo',
    prop: '_inDuel', besides: [] },
  /* v2.3.5529: the party's page door */
  'server/test/party-page-door.test.mjs': { field: 'S._party', fn: 'partyTo', holds: '§2: no write of S._party in src/ outside partyTo',
    prop: '_party', besides: [] },
  /* v2.3.5528: the connection door */
  'server/test/connection-door.test.mjs': { field: 'S._realtimeStatus', fn: 'connTo', holds: '§2: no write of S._realtimeStatus in src/ outside connTo',
    prop: '_realtimeStatus', besides: [] },
  /* v2.3.5526: the window door (its reasons' old fields: the suite's §2) */
  'server/test/window-door.test.mjs': { field: 'S._windows', fn: 'windowTo', holds: '§2: no write of S._windows, nor of a window\'s old field (S._uiBusy, S._npcProxLatch), in src/ outside windowTo',
    prop: '_windows', besides: [] },
  /* v2.3.5525: the loading door (its reasons' old fields: the suite's §2) */
  'server/test/loading-door.test.mjs': { field: 'S._veils', fn: 'veilTo', holds: '§2: no write of S._veils, nor of a veil\'s old field (S._zoneLoading, S._wheelTripVeil, S._townArtHold, S._farmArtHold, S._avatarArtHold, S._netHold), in src/ outside veilTo',
    prop: '_veils', besides: [] },
  /* v2.3.5521: the guard's page door */
  'server/test/guard-page-door.test.mjs': { field: 'S._shieldUp', fn: 'guardTo', holds: '§2: no write of S._shieldUp in src/ outside guardTo',
    prop: '_shieldUp', besides: [
      { file: 'src/game/shieldCopies.js', text: 'other._shieldUp = up', why: 'a peer\'s copy of their guard (player_shield), not yours' },
      { file: fileNamed('entityRenderer.js'), text: '_shieldUp: false, _shieldAngle: null', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
      { file: fileNamed('effectsRenderer.js'), text: '_shieldUp: false, _bashPose: false', why: 'a copy of the state made for a posed picture, never S' },
    ] },
  /* v2.3.5520: the pose's page door */
  'server/test/pose-page-door.test.mjs': { field: 'S._pose', fn: 'poseTo', holds: '§2: no write of ._pose in src/ outside poseTo',
    prop: '_pose', besides: [] },
  /* v2.3.5219: the harvest's page door (the page's harvest, cook and fishing rows: one field) */
  'server/test/harvest-page-door.test.mjs': { field: 'S._extraction', fn: 'harvestTo', holds: '§2: no write of ._extraction in src/ outside harvestTo, nor of a harvest record\'s .status',
    prop: '_extraction', besides: [
      { file: fileNamed('entityRenderer.js'), text: '_extraction: null, _firemaking: null', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
    ] },
});
const SCAN_DOORS = Object.freeze({
  'session (worker)': 'session-door.test plays the phases but fails no second writer of session.phase',
  'monster (worker)': 'monster-newlife.test holds the reset\'s lists, not who makes a new life',
  'monster (page)': 'monster-life.test §6 holds that both edges call the one reset, not who else writes alive',
});
let babel = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(join(ROOT, pkg));
    const t = req('@babel/traverse');
    babel = { parser: req('@babel/parser'), traverse: t.default || t };
    break;
  } catch { /* the next */ }
}
/* the named function a node sits in (the census script's rule: the nearest
   function with a name -- its own, a method's key, the variable or property
   it is given to) */
function fnName(path) {
  for (let p = path.getFunctionParent(); p; p = p.parentPath && p.parentPath.getFunctionParent()) {
    const n = p.node;
    if (n.id && n.id.name) return n.id.name;
    if (n.key && !n.computed && (n.key.name || n.key.value)) return String(n.key.name || n.key.value);
    const pp = p.parentPath;
    if (pp && pp.isVariableDeclarator() && pp.node.id.type === 'Identifier') return pp.node.id.name;
    if (pp && pp.isAssignmentExpression() && pp.node.left.type === 'MemberExpression' && !pp.node.left.computed) return pp.node.left.property.name;
    if (pp && pp.isObjectProperty() && !pp.node.computed) return String(pp.node.key.name || pp.node.key.value);
  }
  return null;
}
/* a key written out: `x.k`, `x['k']`, and (v2.3.5216, the gatekeeper's low,
   sitting 16) a template with nothing in it, ``x[`k`]``.  A key held in a
   variable (`x[k]`) cannot be read here: no rule can, short of running it */
const keyText = (n) => (!n ? null : n.type === 'StringLiteral' ? n.value
  : (n.type === 'TemplateLiteral' && n.expressions.length === 0 && n.quasis.length === 1 ? n.quasis[0].value.cooked : null));
const propOf = (m) => (m && m.type === 'MemberExpression'
  ? (!m.computed && m.property.type === 'Identifier' ? m.property.name : keyText(m.property))
  : null);
const keyName = (pr) => (pr && pr.type === 'ObjectProperty' ? (pr.key.type === 'Identifier' && !pr.computed ? pr.key.name : keyText(pr.key)) : null);
/* every write of `.prop` in a file: [{ line, fn, text }]; with `value`, only
   a write of that literal (alive = true); with `keyed` (v2.3.5214, a door's
   field that is a record keyed by id, the harvest's this.extractions), a
   write of one of its keys too: `X.prop[k] = `, `delete X.prop[k]`,
   `X.prop[k]++`, `Object.assign(X.prop, ...)` */
const astCache = new Map();
function writesIn(rel, prop, value, keyed) {
  const raw = readFileSync(join(ROOT, rel), 'utf8');
  if (!new RegExp('\\b' + prop + '\\b').test(raw)) return [];   /* a cheap look first: most files never name it */
  let ast = astCache.get(rel);
  if (!ast) {
    ast = babel.parser.parse(raw, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    astCache.set(rel, ast);
  }
  const lines = raw.split('\n');
  const out = [];
  const val = (n) => value === undefined || (n && n.type === 'BooleanLiteral' && n.value === value);
  const hit = (path, n, missing) => out.push({ line: n.loc.start.line, fn: fnName(path), text: lines[n.loc.start.line - 1] || '', missing: !!missing });
  /* v2.3.5214 (the gatekeeper's low, sitting 15): a birth is matched by the
     tree, not by its text alone.  `missing`: the write is the consequent of
     `if (!<the same field>)`, so it only ever makes a field that is not there
     (an unconditional `this._partyByPlayer = new Map()` would wipe the map
     and is no birth). */
  const same = (a, b) => !!a && !!b && a.type === b.type && (a.type === 'ThisExpression'
    || (a.type === 'Identifier' && a.name === b.name)
    || (a.type === 'MemberExpression' && !a.computed && !b.computed && propOf(a) === propOf(b) && same(a.object, b.object)));
  const ifMissing = (path) => {
    const st = path.parentPath;
    if (!st || !st.isExpressionStatement()) return false;
    let up = st.parentPath, arm = st.node;
    if (up && up.isBlockStatement() && up.node.body.length === 1) { arm = up.node; up = up.parentPath; }
    if (!up || !up.isIfStatement() || up.node.consequent !== arm) return false;
    const t = up.node.test;
    return t.type === 'UnaryExpression' && t.operator === '!' && same(t.argument, path.node.left);
  };
  const at = (m) => propOf(m) === prop || (!!keyed && !!m && m.type === 'MemberExpression' && propOf(m.object) === prop);
  /* v2.3.5216 (the gatekeeper's low, sitting 16): a destructuring target is a
     write too -- `({ ex: ps.ex } = msg)`, `[ps.po] = list`, a default
     (`{ po: ps.po = 'sit' }`), a rest (`[...ps.po]`), nested -- its value
     unknown, so only when no literal is asked for */
  const targets = (n, outT) => {
    if (!n) return outT;
    if (n.type === 'MemberExpression') outT.push(n);
    else if (n.type === 'ObjectPattern') for (const pr of n.properties) targets(pr.type === 'RestElement' ? pr.argument : pr.value, outT);
    else if (n.type === 'ArrayPattern') for (const el of n.elements) targets(el, outT);
    else if (n.type === 'AssignmentPattern') targets(n.left, outT);
    else if (n.type === 'RestElement') targets(n.argument, outT);
    return outT;
  };
  const patternHits = (path, left) => {
    if (value !== undefined || !left || (left.type !== 'ObjectPattern' && left.type !== 'ArrayPattern')) return;
    if (targets(left, []).some(at)) hit(path, path.node);
  };
  babel.traverse(ast, {
    AssignmentExpression(path) {
      if (at(path.node.left) && val(path.node.right)) hit(path, path.node, ifMissing(path));
      else patternHits(path, path.node.left);
    },
    'ForOfStatement|ForInStatement'(path) {
      const left = path.node.left;
      if (value === undefined && left && left.type === 'MemberExpression' && at(left)) hit(path, path.node);
      else patternHits(path, left);
    },
    UpdateExpression(path) { if (value === undefined && at(path.node.argument)) hit(path, path.node); },
    UnaryExpression(path) { if (value === undefined && path.node.operator === 'delete' && at(path.node.argument)) hit(path, path.node); },
    CallExpression(path) {
      const c = path.node.callee;
      /* v2.3.5212: a door's field that is a Map (the party's
         this._partyByPlayer) is written by its own set, delete and clear */
      if (value === undefined && c.type === 'MemberExpression' && ['set', 'delete', 'clear'].includes(propOf(c)) && propOf(c.object) === prop) { hit(path, path.node); return; }
      /* v2.3.5216 (sitting 16's low): the reflective writes,
         Object.defineProperty(x, 'prop', ...), Reflect.set / defineProperty /
         deleteProperty (x, 'prop', ...), and on a keyed field any key of it */
      if (value === undefined && c.type === 'MemberExpression' && c.object.type === 'Identifier') {
        const who = c.object.name, how = propOf(c);
        if ((who === 'Object' && how === 'defineProperty') || (who === 'Reflect' && ['set', 'defineProperty', 'deleteProperty'].includes(how))) {
          const [obj, key] = path.node.arguments;
          if (keyText(key) === prop || (keyed && propOf(obj) === prop)) { hit(path, path.node); return; }
        }
      }
      if (!(c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'Object' && propOf(c) === 'assign')) return;
      if (keyed && value === undefined && propOf(path.node.arguments[0]) === prop) { hit(path, path.node); return; }
      for (const a of path.node.arguments.slice(1)) {
        if (a.type !== 'ObjectExpression') continue;
        for (const pr of a.properties) if (keyName(pr) === prop && val(pr.value)) hit(path, pr);
      }
    },
  });
  return out;
}
{
  const bad = [];
  const doors = ROWS.filter((r) => r && r.status === 'door');
  if (!babel) bad.push('@babel/parser and @babel/traverse load from neither the root nor server/ (npm install in one of them)');
  for (const r of babel ? doors : []) {
    const fnFile = codeOf(r.file);
    if (!fnFile || !has(fnFile, r.fn)) bad.push(`${keyOf(r)}: ${r.file} has no ${r.fn}`);
    if (r.today !== undefined) bad.push(`${keyOf(r)}: a door carries no \`today\` (a machine with fields still to fold is a todo)`);
    const held = r.held || {};
    if (str(held.suite)) {
      /* its own suite holds it, and that suite is on the closed list for
         this very field and function */
      const want = Object.prototype.hasOwnProperty.call(DOOR_SUITES, held.suite) ? DOOR_SUITES[held.suite] : null;
      if (!want) bad.push(`${keyOf(r)}: ${held.suite} is not on DOOR_SUITES (the suites that fail a second writer of a door\'s field): a door is built, then listed`);
      else if (want.field !== r.field || want.fn !== r.fn) bad.push(`${keyOf(r)}: ${held.suite} holds ${want.field} through ${want.fn}, not ${r.field} through ${r.fn}`);
      else if (!existsSync(join(ROOT, held.suite))) bad.push(`${keyOf(r)}: its suite ${held.suite} is gone`);
      /* v2.3.5209: and the tree's own reading of it, beside the suite's */
      if (want && want.field === r.field && want.fn === r.fn) {
        if (!str(want.prop)) { bad.push(`${keyOf(r)}: its DOOR_SUITES line names no prop to read off the tree`); continue; }
        let mine = 0;
        const seen = new Set();
        for (const f of filesUnder(SRC_OF[r.side])) {
          for (const w of writesIn(f, want.prop, undefined, want.keyed)) {
            if (f === r.file && w.fn === r.fn) { mine++; continue; }
            /* v2.3.5214: an entry may also say where (`fn`, the function the
               tree places it in) and how (`ifMissing`, a birth only) */
            const b = (want.besides || []).find((x) => x.file === f && w.text.includes(x.text) && (!x.fn || w.fn === x.fn) && (!x.ifMissing || w.missing));
            if (b) { seen.add(b); continue; }
            bad.push(`${keyOf(r)}: ${f}:${w.line} (in ${w.fn || 'no function'}) writes .${want.prop} outside ${r.file} ${r.fn}, read off the tree: ${w.text.trim().slice(0, 90)}`);
          }
        }
        if (!mine) bad.push(`${keyOf(r)}: ${r.file} ${r.fn} writes no .${want.prop} any more (a stale door)`);
        for (const b of want.besides || []) if (!seen.has(b)) bad.push(`${keyOf(r)}: its besides entry ${b.file} "${b.text}"${b.fn ? ' in ' + b.fn : ''}${b.ifMissing ? ' (a birth only)' : ''} is gone (delete it)`);
      }
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(SCAN_DOORS, keyOf(r))) { bad.push(`${keyOf(r)}: held by a scan, but not on SCAN_DOORS: a door is built, then listed`); continue; }
    /* nothing else holds it: the row's scan is the rule */
    const files = filesUnder(SRC_OF[r.side]);
    const besidesSeen = new Set();
    for (const sc of held.scan || []) {
      const allowed = (sc.at || []).map(place);
      if (!str(sc.prop) || !allowed.length || allowed.some((p) => !p)) { bad.push(`${keyOf(r)}: a scan is { prop, value?, at: ["<file> <function>"] }`); continue; }
      const hits = new Map(allowed.map((p) => [p.file + ' ' + p.fn, 0]));
      for (const f of files) {
        for (const w of writesIn(f, sc.prop, sc.value)) {
          const k = f + ' ' + w.fn;
          if (hits.has(k)) { hits.set(k, hits.get(k) + 1); continue; }
          const b = (held.besides || []).find((x) => x.file === f && w.text.includes(x.text));
          if (b) { besidesSeen.add(b); continue; }
          bad.push(`${keyOf(r)}: ${f}:${w.line} (in ${w.fn || 'no function'}) writes .${sc.prop} outside ${sc.at.join(', ')}: ${w.text.trim().slice(0, 90)}`);
        }
      }
      for (const [k, n] of hits) if (!n) bad.push(`${keyOf(r)}: ${k} writes no .${sc.prop} any more (a stale place)`);
    }
    for (const b of held.besides || []) if (!besidesSeen.has(b)) bad.push(`${keyOf(r)}: its besides entry ${b.file} "${b.text}" is gone (delete it)`);
    for (const b of held.born || []) {
      const p = place(b.at);
      const src = p && codeOf(p.file);
      if (!src || !src.includes(b.text) || !has(src, p.fn)) bad.push(`${keyOf(r)}: its birth ${b.at} "${b.text}" is gone`);
    }
  }
  const listed = [...Object.keys(SCAN_DOORS)].filter((k) => !doors.some((r) => keyOf(r) === k));
  if (listed.length) bad.push(`SCAN_DOORS lists rows that are not doors: ${listed.join(', ')}`);
  check(`2: a door's field has no writer outside its function, and what holds it is on the closed lists (${doors.length} doors: ${doors.map(keyOf).join(', ')})`, bad.length === 0, bad);
}

/* ── 3. REJOIN_SLOTS, both ways ── */
{
  const { REJOIN_SLOTS } = await import(pathToFileURL(join(ROOT, 'src/game/rejoinSlots.js')).href);
  const slots = new Set(REJOIN_SLOTS.map((s) => s.slot));
  const named = new Set();
  const unknown = [];
  for (const r of ROWS) if (Array.isArray(r.rejoin)) for (const s of r.rejoin) { named.add(s); if (!slots.has(s)) unknown.push(`${keyOf(r)}: ${s}`); }
  const orphan = [...slots].filter((s) => !named.has(s));
  check(`3: every slot of REJOIN_SLOTS is named by a row (${slots.size} slots)`, orphan.length === 0, orphan);
  check('3: every slot a row names is in REJOIN_SLOTS', unknown.length === 0, unknown);
}

/* ── 4. the wire table's phase column ── */
{
  const { WIRE_COLUMNS } = await import(pathToFileURL(join(ROOT, 'server/src/wire/columns.js')).href);
  const P = WIRE_COLUMNS.phase;
  const names = new Set(Object.keys(P).filter((k) => k !== 'NONE' && k !== 'IMPLICIT').concat(Object.keys(P.IMPLICIT || {})));
  for (const f of ['in', 'relays', 'out', 'http']) {
    const m = await import(pathToFileURL(join(ROOT, 'server/src/wire/' + f + '.js')).href);
    for (const row of Object.values(m)[0]) for (const d of row.phase || []) if (d !== P.NONE) names.add(String(d).split(':')[0]);
  }
  const rowNames = new Set(ROWS.map((r) => r.name));
  const missing = [...names].filter((n) => !rowNames.has(n));
  check(`4: every machine the wire table's phase column names is a row (${names.size}: ${[...names].join(', ')})`, missing.length === 0, missing);
}

/* ── 5. the ledger's phase marks ── */
{
  const ledgerRows = [];
  for (const n of readdirSync(join(ROOT, 'src/state')).sort()) {
    if (!n.endsWith('.js') || n === 'phases.js') continue;
    const m = await import(pathToFileURL(join(ROOT, 'src/state', n)).href);
    for (const row of m.ROWS || []) ledgerRows.push(row);
  }
  const lkey = (x) => (x.field !== undefined ? 'S.' + x.field : x.file + ' ' + x.variable);
  const ledger = new Set(ledgerRows.map(lkey));
  const pageFields = new Set();
  const notLedger = [];
  for (const r of ROWS.filter((x) => x.side === 'page')) {
    const fields = r.status === 'door' ? [{ field: r.field }] : (r.today || []);
    for (const t of fields) {
      const k = t.variable ? t.file + ' ' + t.variable : t.field;
      if (!/^S\./.test(k) && !t.variable) continue;   /* a door on a monster's own field (m.alive) is no ledger row */
      pageFields.add(k);
      if (!ledger.has(k)) notLedger.push(`${keyOf(r)}: ${k}`);
    }
  }
  const nam = new Map();
  const namBad = [];
  for (const x of NOT_A_MACHINE) {
    if (!x || !str(x.why) || !(str(x.field) || (str(x.variable) && str(x.file)))) { namBad.push(x); continue; }
    nam.set(x.field ? 'S.' + x.field : x.file + ' ' + x.variable, x);
  }
  const marked = ledgerRows.filter((x) => x.phase !== null && x.phase !== undefined).map(lkey);
  const loose = marked.filter((k) => !pageFields.has(k) && !nam.has(k));
  const stale = [...nam.keys()].filter((k) => !marked.includes(k));
  check(`5: every ledger row with D's phase mark is a row's field or NOT_A_MACHINE, with why (${marked.length} marked)`, loose.length === 0 && namBad.length === 0, { loose, namBad });
  check('5: every NOT_A_MACHINE entry is still a marked ledger row (a stale one is deleted)', stale.length === 0, stale);
  check(`5: every page field a row names is a ledger row (${pageFields.size} fields)`, notLedger.length === 0, notLedger);
}

/* ── 6. a todo row's worker writers exist ── */
{
  const bad = [];
  for (const r of ROWS.filter((x) => x.status === 'todo' && x.side === 'worker')) {
    for (const t of r.today || []) {
      const prop = String(t.field).replace(/\[.*$/, '').split('.').pop();
      const src = codeOf(t.file);
      if (!src || !has(src, prop)) bad.push(`${keyOf(r)}: ${t.file} has no ${prop}`);
      for (const w of t.writers || []) {
        const p = place(w);
        const ws = p && codeOf(p.file);
        if (!ws || !has(ws, p.fn) || !has(ws, prop)) bad.push(`${keyOf(r)}: ${w} (for ${t.field}) is not there`);
      }
    }
  }
  /* and every row's clears, both sides */
  for (const r of ROWS) for (const c of r.clears || []) {
    const p = place(c.at);
    if (!p || !(codeOf(p.file) && has(codeOf(p.file), p.fn))) bad.push(`${keyOf(r)}: clears at ${c.at}: not there`);
  }
  check('6: a todo row\'s worker fields and writers, and every row\'s clears, are where it says', bad.length === 0, bad);
}

/* ── 7. the todo count, a census ── */
{
  const todo = ROWS.filter((r) => r.status === 'todo');
  check(`7: todo rows at or under the line ${TODO_LINE} (${todo.length}; a row turns door in its machine's PR, card L PR 5)`, todo.length <= TODO_LINE);
  if (todo.length < TODO_LINE) info(`(room: ${TODO_LINE - todo.length} under the line ${TODO_LINE}; the gatekeeper may lower it)`);
  info('door: ' + ROWS.filter((r) => r.status === 'door').map(keyOf).join(', '));
}

console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
