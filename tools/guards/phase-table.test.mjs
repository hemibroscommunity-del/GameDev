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
 *   2d. A FENCE ON A LITERAL KEY, NOT A WALL (v2.3.6526, sitting 59's hold):
 *      every object-literal key naming a door's field, in a function,
 *      outside the door's files, and not an http status handed straight to
 *      `new Response(..)` / `Response.json(..)`, is a row of KEYS (by field
 *      and file, only falls: 63 rows, 118 keys).  Sitting 59's four
 *      (`...Object.freeze({ status })`, a conditional `_p`, `_up(d, {
 *      status })`, `..._ps[0]`) each plant such a literal and are red, as
 *      are card WL's own three (a string key, a template key, a const key).
 *      NOT GUARDED: a write by a key held in a variable (`x[k] = v`, 2,111
 *      today), a spread of a non-literal (776), Object.assign from a
 *      non-literal (434): the tree cannot read the key.  Not deny by
 *      default: the wall (each door keeps a shadow of what it set, the test
 *      room compares after every message and tick) is the card's next PR.
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
 *   6. TODO_LINE one under the count (-1; tag 5032)          -> FAIL 7
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
 * v2.3.5536 (the guard door):
 *  51. `ps.blocking = false;` back in linger.js -> guard-door.test FAIL 2
 * v2.3.5537 (the zone door):
 *  52. `ps.z = 'town';` back in index.js _tickPlayerRespawn -> zone-door.test FAIL 2
 * v2.3.5538 (the fight door):
 *  53. `this._pvpHealClocks.delete(id);` back in spar.js _sparRemove -> fight-door.test FAIL 2
 * v2.3.5525 (the loading door):
 *  39. `S._farmArtHold = seq;` back in farmTrip.js -> loading-door.test FAIL 2
 *  40. `S._veils = new Map();` in zoneTransitions.js -> FAIL 2
 * v2.3.5535 (the dungeon's page door):
 *  50. `S._inDungeon = false;` back in respawn.js -> dungeon-page-door.test FAIL 2
 * v2.3.5533 (the fight's page door):
 *  48. `S._pvpSkullType = null;` back in noMansLand.js -> fight-page-door.test FAIL 2
 * v2.3.5534 (the life's page door):
 *  49. `S._dying = false;` back in respawn.js -> life-page-door.test FAIL 2
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
 * v2.3.6520 (card WL; the shape review's plants 2a and 2b, which every
 * suite and this guard let through), tried 2026-11-23:
 *  54. `var _farmDefaults = { _shieldUp: true }; Object.assign(S, _farmDefaults);`
 *      in farmWalk.js tickFarmWalk                       -> FAIL 2 (was green)
 *  55. `const _d0 = { _shieldUp: true }; const _d1 = { ..._d0 };
 *      Object.assign(S, _d1);` there                     -> FAIL 2
 *  56. `S.x9 = { ...S.x9, _shieldUp: true };` there      -> FAIL 2
 *  57. `this._duels.set(d.id, { ...d, status: 'resolved' })` over
 *      this._duels in party.js _partySend                 -> FAIL 2 (was green)
 *  58. the same with the key in a const, `{ ...d, [_st]: 'resolved' }`
 *      (`const _st = 'status'`), and `d[_st] = 'resolved'` -> FAIL 2
 * v2.3.6520, sitting 58's hold (`{ ...d, ..._p }` with `_p = { status:
 * 'resolved' }` green): a spread's keys are FOLLOWED as a class
 * (literalProps), and a spread it cannot follow is counted (2c), tried
 * 2026-11-24, each in party.js _partySend over `const d = this._d0`:
 *  59. `const _p = { status: 'resolved' }; this._dx = { ...d, ..._p };` -> FAIL 2
 *  60. `{ ...d, ...(playerId ? { status: 'resolved' } : {}) }`,
 *      `{ ...d, ...(playerId && { status: 'resolved' }) }`  -> FAIL 2
 *  61. `const _mk = () => ({ status: 'resolved' }); { ...d, ..._mk() }`, and
 *      a declared function returning it from inside an `if` -> FAIL 2
 *  62. `this._dx = { ...this._d0, ...this._wire(playerId) }` -> FAIL 2c
 *  `{ ...d, other: 1 }` stays green (a copy that writes no door's field).
 *  Not caught, and why: a key built at run time (`'sta' + 'tus'`), and a
 *  record copied whole and changed in another module by a name this file
 *  never sees (`structuredClone(d)` handed to a helper that writes it):
 *  no reading of one file can, short of running it.
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
export const TODO_LINE = 0;   /* v2.3.5032: lowered 3 -> 0 by the gatekeeper, sitting 42, carried by sitting 43 (L's guard, zone and fight doors, #2058, #2065, #2067: no `todo` row left, the census strict); v2.3.5679: lowered 4 -> 3 by the gatekeeper, sitting 41 (L's dungeon page door, #2052); v2.3.5677: lowered 5 -> 4 by the gatekeeper, sitting 39 (L's life page door, #2046); v2.3.5676: lowered 6 -> 5 by the gatekeeper, sitting 38 (L's fight page door, #2039); v2.3.5675: lowered 7 -> 6 by the gatekeeper, sitting 37 (L's arena page door, #2031); v2.3.5674: lowered 9 -> 7 by the gatekeeper, sitting 36 (L's trade and ride page doors, #2027); v2.3.5673: lowered 11 -> 9 by the gatekeeper, sitting 35 (L's duel and party page doors, #2022); v2.3.5671: lowered 12 -> 11 by the gatekeeper, sitting 33 (L's connection door, #2012); v2.3.5669: lowered 13 -> 12 by the gatekeeper, sitting 31 (L's window door, #2000); v2.3.5663: 14 -> 13 (#1956) */

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
      { file: 'server/src/dungeon.js', text: "wave: 1, state: 'active'", fn: '_handleDungeonStart', why: 'a dungeon run\'s birth (its old state, the `dungeon` row\'s), not a trade (v2.3.6520: a key beside a spread)' },
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
      /* v2.3.6520: keys beside a spread (the new rule) */
      { file: 'server/src/index.js', text: 'attackerId: sourceId, status: statusId', fn: '_applyMonsterDot', why: 'a damage message\'s status effect, not a duel\'s' },
      { file: 'server/src/playerrestore.js', text: 'return { status: 200, ...answer, copy: null', fn: 'playerRestore', why: 'an HTTP answer\'s status code (the dry run)' },
      { file: 'server/src/playerrestore.js', text: 'return { status: 200, ...answer, copy: copyKey }', fn: 'playerRestore', why: 'an HTTP answer\'s status code' },
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
    prop: 'ex', besides: [
      { file: fileNamed('tick.js'), text: 'eqs: ps.eqs, ex: ps.ex,', fn: 'playerWire', why: 'a copy onto the tick\'s wire entry, not the player\'s (v2.3.6520: a key beside a spread)' },
    ] },
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
    prop: 'po', besides: [
      { file: fileNamed('tick.js'), text: '...(ps.po ? { po: ps.po } : {})', fn: 'playerWire', why: 'a copy onto the tick\'s wire entry, not the player\'s (v2.3.6520, sitting 58: a key a spread brings, followed)' },
    ] },
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
  /* v2.3.5535: the dungeon's page door (its notes: the suite's §2) */
  'server/test/dungeon-page-door.test.mjs': { field: 'S._inDungeon', fn: 'dungeonTo', holds: '§2: no write of S._inDungeon, S._inCustomDungeon or S._dungeonComplete in src/ outside dungeonTo',
    prop: '_inDungeon', besides: [] },
  /* v2.3.5536: the guard door (its parry stamp and break latch: the suite's §2) */
  'server/test/guard-door.test.mjs': { field: 'ps.blocking', fn: '_guardTo', holds: '§2: no write of .blocking, .blockStartT or ._guardBrokenUntil in server/src outside _guardTo',
    prop: 'blocking', besides: [
      { file: fileNamed('spar.js'), text: 'blocking: false, blockStartT: 0', fn: '_sparSpawn', why: 'the sparring clone\'s birth, guard down, before any move' },
      { file: fileNamed('tick.js'), text: 'e.blocking = ps.blocking || false;', why: 'a copy of the guard onto the tick\'s entry, not the player\'s' },
      { file: fileNamed('join.js'), text: 'dodging: false, blocking: false, dead: false', fn: '_handleJoin', why: 'a player\'s birth at the join when no body was kept, guard down (v2.3.6520: a key beside a spread)' },
    ] },
  /* v2.3.5537: the zone door */
  'server/test/zone-door.test.mjs': { field: 'ps.z', fn: '_zoneTo', holds: '§2: no write of a player\'s .z in server/src outside _zoneTo',
    prop: 'z', besides: [
      { file: fileNamed('join.js'), text: 'out.z = v;', fn: '_sanitizeJoinData', why: 'the join\'s cleaned copy of the phone\'s data, not a player' },
      { file: fileNamed('join.js'), text: 'cleanJoinData.z = _body.z;', fn: '_handleJoin', why: 'the join\'s data told the kept body\'s place, not a player' },
      { file: fileNamed('join.js'), text: 'cleanJoinData.z = \'town\';', fn: '_handleJoin', why: 'the join\'s data told the stand-up\'s town, not a player (the player\'s is the door\'s standup way)' },
      { file: fileNamed('nearjoin.js'), text: 'entry.z = q.z;', why: 'a near-join list\'s entry, a copy' },
      { file: fileNamed('nearjoin.js'), text: 'out.z = q.z;', fn: '_nearJoinListEntry', why: 'a near-join list\'s entry, a copy' },
      { file: fileNamed('spar.js'), text: 'z: ownerPs.z,', fn: '_sparSpawn', why: 'the sparring clone\'s birth, at its owner\'s place' },
      { file: fileNamed('tick.js'), text: 'e.z = ps.z;', why: 'a copy of the place onto the tick\'s entry, not the player\'s' },
      /* v2.3.6520: keys beside a spread (the new rule) */
      { file: fileNamed('join.js'), text: "x: 0, y: 0, d: 'down', z: 'town'", fn: '_handleJoin', why: 'a player\'s birth at the join when no body was kept, before any move' },
      { file: fileNamed('spar.js'), text: 'aw: 0, pet: null, x: ps.x, y: ps.y, z: ps.z', fn: '_sparSpawn', why: 'the sparring clone\'s look, a copy of its owner\'s place' },
      { file: 'server/src/index.js', text: 'r[id] = { ...c.look, x: cps.x, y: cps.y, z: cps.z', fn: 'getAllPlayerData', why: 'a sparring clone\'s entry on the players\' list, a copy of its place' },
      { file: fileNamed('tick.js'), text: 'd: ps.d, z: ps.z, vx: rp(ps.vx)', fn: 'playerWire', why: 'a copy of the place onto the tick\'s wire entry, not the player\'s' },
    ] },
  /* v2.3.5538: the fight door (the clock's pvpAt and healAt: the suite's §2) */
  'server/test/fight-door.test.mjs': { field: 'this._pvpHealClocks', fn: '_fightTo', holds: '§2: no write of this._pvpHealClocks, a clock\'s .pvpAt or .healAt in server/src outside _fightTo',
    prop: '_pvpHealClocks', besides: [] },
  /* v2.3.5533: the fight's page door (its note S._pvpSkullUntil: the suite's §2) */
  'server/test/fight-page-door.test.mjs': { field: 'S._pvpSkullType', fn: 'skullTo', holds: '§2: no write of S._pvpSkullType or S._pvpSkullUntil in src/ outside skullTo',
    prop: '_pvpSkullType', besides: [
      { file: fileNamed('entityRenderer.js'), text: '_pvpSkullType: null, _pvpSkullUntil: 0', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
    ] },
  /* v2.3.5534: the life's page door (its note S._deathStart: the suite's §2) */
  'server/test/life-page-door.test.mjs': { field: 'S._dying', fn: 'dyingTo', holds: '§2: no write of S._dying or S._deathStart in src/ outside dyingTo',
    prop: '_dying', besides: [
      { file: fileNamed('entityRenderer.js'), text: '_deathStart: null, _dying: false', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
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
  'server/test/stick-zones.test.mjs': { field: 'S._stickPhase', fn: 'stickTo', holds: '§5: no write of S._stickPhase in src/ outside stickTo', prop: '_stickPhase', besides: [] },   /* v2.3.6540: card CT, the two buttons */
  'server/test/sight.test.mjs': { field: 'S._sightPhase', fn: 'sightTo', holds: '§6: no write of S._sightPhase in src/ outside sightTo', prop: '_sightPhase', besides: [] },   /* v2.3.6540: card CT, the two buttons */
  'server/test/latch.test.mjs': { field: 'S._latchPhase', fn: 'latchTo', holds: '§4: no write of S._latchPhase in src/ outside latchTo', prop: '_latchPhase', besides: [] },   /* v2.3.6540: card CT, the two buttons */
  /* v2.3.5219: the harvest's page door (the page's harvest, cook and fishing rows: one field) */
  'server/test/harvest-page-door.test.mjs': { field: 'S._extraction', fn: 'harvestTo', holds: '§2: no write of ._extraction in src/ outside harvestTo, nor of a harvest record\'s .status',
    prop: '_extraction', besides: [
      { file: fileNamed('entityRenderer.js'), text: '_extraction: null, _firemaking: null', fn: 'poseFrame', why: 'a copy of the state made for a posed picture (Object.assign({}, real, ...)), never S' },
    ] },
});
/* v2.3.6520 (card WL): a scanned row's field as a key beside a spread
   (the new rule above) outside the row's own files, each with why.  Here,
   not in the row's `besides` (src/state/phases.js is card CT's side of the
   line: this guard's own exceptions live in this guard) */
const KEY_BESIDES = Object.freeze({
  'session (worker)': [
    { file: 'server/src/dungeon.js', text: 'ability, phase,', why: 'a boss ability\'s phase (wind-up, strike) on its notice to the room, not a session\'s' },
    { file: 'server/src/telegraph.js', text: 'ability: kind, phase,', why: 'a monster ability\'s phase on its telegraph message, not a session\'s' },
  ],
  'monster (worker)': [
    { file: 'server/src/wheelzone.js', text: 'alive: true,', why: 'a gathering node\'s birth on the Wheel (a tree, a rock), not a monster' },
  ],
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
/* v2.3.6520 (card WL): and, with the scope at hand, a key held in a `const`
   whose value is written out (`const k = 'status'; x[k] = ...`) */
const keyText = (n, sc) => {
  if (!n) return null;
  if (n.type === 'StringLiteral') return n.value;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0 && n.quasis.length === 1) return n.quasis[0].value.cooked;
  if (n.type === 'Identifier' && sc) {
    const b = sc.getBinding(n.name);
    if (b && b.kind === 'const' && b.path.isVariableDeclarator() && b.path.node.init) return keyText(b.path.node.init, null);
  }
  return null;
};
const propOf = (m, sc) => (m && m.type === 'MemberExpression'
  ? (!m.computed && m.property.type === 'Identifier' ? m.property.name : keyText(m.property, sc))
  : null);
const keyName = (pr, sc) => (pr && pr.type === 'ObjectProperty' ? (pr.key.type === 'Identifier' && !pr.computed ? pr.key.name : keyText(pr.key, sc)) : null);
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
  const hit = (path, n, missing, key) => out.push({ line: n.loc.start.line, fn: fnName(path), text: lines[n.loc.start.line - 1] || '', missing: !!missing, key: !!key });
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
  const at = (m, sc) => propOf(m, sc) === prop || (!!keyed && !!m && m.type === 'MemberExpression' && propOf(m.object, sc) === prop);
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
    if (targets(left, []).some((m) => at(m, path.scope))) hit(path, path.node);
  };
  babel.traverse(ast, {
    AssignmentExpression(path) {
      if (at(path.node.left, path.scope) && val(path.node.right)) hit(path, path.node, ifMissing(path));
      else patternHits(path, path.node.left);
    },
    'ForOfStatement|ForInStatement'(path) {
      const left = path.node.left;
      if (value === undefined && left && left.type === 'MemberExpression' && at(left, path.scope)) hit(path, path.node);
      else patternHits(path, left);
    },
    UpdateExpression(path) { if (value === undefined && at(path.node.argument, path.scope)) hit(path, path.node); },
    UnaryExpression(path) { if (value === undefined && path.node.operator === 'delete' && at(path.node.argument, path.scope)) hit(path, path.node); },
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
          if (keyText(key, path.scope) === prop || (keyed && propOf(obj) === prop)) { hit(path, path.node); return; }
        }
      }
      if (!(c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'Object' && propOf(c) === 'assign')) return;
      if (keyed && value === undefined && propOf(path.node.arguments[0]) === prop) { hit(path, path.node); return; }
      /* v2.3.6520 (card WL; the shape review's plant 2a): a source handed
         over in a variable, `var d = { _shieldUp: true }; Object.assign(S,
         d);`, or spread into the source, is read through to its literal */
      for (const a of path.node.arguments.slice(1)) {
        for (const pr of literalProps(a, path.scope, 0)) if (keyName(pr, path.scope) === prop && val(pr.value)) hit(path, pr);
      }
    },
    /* v2.3.6520 (card WL; the shape review's plant 2b): a record copied with
       the field changed, `this._duels.set(d.id, { ...d, status: 'resolved'
       })`, writes the field as surely as `d.status = ` does.  An object
       literal with a spread beside a key of the field's name is a write
       (`key`: the caller lets it stand only in the door's own file, or as a
       `besides` with why) */
    ObjectExpression(path) {
      const props = path.node.properties;
      if (!props.some((x) => x.type === 'SpreadElement')) return;
      /* v2.3.6520 (sitting 58's hold: `{ ...d, ..._p }` with `_p = { status:
         'resolved' }` stayed green): the keys a spread brings are followed
         too (literalProps: a name bound to a literal, either arm of `?:`,
         `&&`, `||`, a local function's returned literal), when the literal
         has anything beside that spread (a copy, not a literal alone) */
      if (props.length < 2) return;
      for (const pr of literalProps(path.node, path.scope, 0)) if (keyName(pr, path.scope) === prop && val(pr.value)) hit(path, pr, false, true);
    },
  });
  return out;
}
/* v2.3.6520: the properties an object handed to Object.assign holds: a
   literal's own, a spread's (followed), and a variable's whose binding is
   a literal (`const d = { ... }`), a few steps deep */
function literalProps(n, scope, depth) {
  if (!n || depth > 6) return [];
  /* v2.3.6520 (sitting 58): the forms a source can come in, followed as a
     class: either arm of a choice, a function's returned literal (a local
     function, called by name: `...mk()`), a literal in parentheses.  What
     is left is a record copied whole (a parameter, a member, an import's
     call), which carries only the fields it had: the keys it writes are
     the ones this guard reads where they are written */
  if (n.type === 'ConditionalExpression') return [...literalProps(n.consequent, scope, depth + 1), ...literalProps(n.alternate, scope, depth + 1)];
  if (n.type === 'LogicalExpression') return [...literalProps(n.left, scope, depth + 1), ...literalProps(n.right, scope, depth + 1)];
  if (n.type === 'SequenceExpression') return literalProps(n.expressions[n.expressions.length - 1], scope, depth + 1);
  if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && scope) {
    const b = scope.getBinding(n.callee.name);
    const fnNode = b && b.path && (b.path.isFunctionDeclaration() ? b.path.node
      : (b.path.isVariableDeclarator() && b.path.node.init && /Function/.test(b.path.node.init.type) ? b.path.node.init : null));
    if (!fnNode) return [];
    if (fnNode.body.type !== 'BlockStatement') return literalProps(fnNode.body, b.path.scope, depth + 1);
    /* every return of its own (in an if or a loop too; never a nested function's) */
    const out = [];
    const walk = (st) => {
      if (!st || typeof st !== 'object' || /Function/.test(st.type || '')) return;
      if (st.type === 'ReturnStatement') { out.push(...literalProps(st.argument, b.path.scope, depth + 1)); return; }
      for (const k of ['body', 'consequent', 'alternate', 'block', 'handler', 'finalizer', 'cases']) {
        const v = st[k];
        if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
      }
    };
    fnNode.body.body.forEach(walk);
    return out;
  }
  if (n.type === 'ObjectExpression') {
    const out = [];
    for (const pr of n.properties) {
      if (pr.type === 'SpreadElement') out.push(...literalProps(pr.argument, scope, depth + 1));
      else out.push(pr);
    }
    return out;
  }
  if (n.type === 'Identifier' && scope) {
    const b = scope.getBinding(n.name);
    if (b && b.path && b.path.isVariableDeclarator() && b.path.node.init) return literalProps(b.path.node.init, b.path.scope, depth + 1);
  }
  return [];
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
            if (f === r.file && w.fn === r.fn && !w.key) { mine++; continue; }
            if (f === r.file && w.key) continue;   /* v2.3.6520: a copy with a spread in the door's own file */
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
          if (w.key && allowed.some((p) => p.file === f)) continue;   /* v2.3.6520: a copy with a spread in the door's own file */
          if (hits.has(k) && !w.key) { hits.set(k, hits.get(k) + 1); continue; }
          const b = (held.besides || []).find((x) => x.file === f && w.text.includes(x.text))
            || (KEY_BESIDES[keyOf(r)] || []).find((x) => w.key && x.file === f && w.text.includes(x.text));
          if (b) { besidesSeen.add(b); continue; }
          bad.push(`${keyOf(r)}: ${f}:${w.line} (in ${w.fn || 'no function'}) writes .${sc.prop} outside ${sc.at.join(', ')}: ${w.text.trim().slice(0, 90)}`);
        }
      }
      for (const [k, n] of hits) if (!n) bad.push(`${keyOf(r)}: ${k} writes no .${sc.prop} any more (a stale place)`);
    }
    for (const b of held.besides || []) if (!besidesSeen.has(b)) bad.push(`${keyOf(r)}: its besides entry ${b.file} "${b.text}" is gone (delete it)`);
    for (const b of KEY_BESIDES[keyOf(r)] || []) if (!besidesSeen.has(b)) bad.push(`${keyOf(r)}: its KEY_BESIDES entry ${b.file} "${b.text}" is gone (delete it)`);
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

/* ── 2c. v2.3.6520 (sitting 58): the spreads the phase scan cannot follow ──
   A key a spread brings is followed (literalProps: a name bound to a
   literal, either arm of a choice, a local function's returned literal).
   A spread of a CALL into an import or a method (`...mkPatch()`,
   `...this._wire(d)`) brings keys from a body this file does not hold: the
   scan cannot follow it, so each is counted here by file and the list only
   falls (a new one is red: follow it, or move the keys where they are
   seen).  A spread of a record by name or member (`...d`, `...ps.eq`) is a
   copy of a record, which carries only the fields it already had: those
   are not counted (987 spreads in all, 2026-11-24; the record's own
   writes are read where they are made). */
const SPREAD_CALLS = Object.freeze(Object.assign(Object.create(null), {
  'server/src/clans.js': 1,
  'server/src/dungeon.js': 1,
  'server/src/gladiator.js': 1,
  'server/src/join.js': 1,
  'server/src/loginspin.js': 3,
  'server/src/market.js': 3,
  'server/src/persistence.js': 1,
  'server/src/petbook.js': 1,
  'server/src/revealbag.js': 3,
  'server/src/spar.js': 3,
  'server/src/spawnscale.js': 1,
  'server/src/store.js': 1,
  'server/src/trade2.js': 1,
  'src/game/wheelBreak.js': 1,
  'src/rendering/folkSkill.js': 1,
  'src/rendering/lightfx/lightFx.js': 1,
  'src/rendering/lookSets/skills.js': 1,
  'src/rendering/pixiRenderer.js': 1,
  [fileNamed('effectsRenderer.js')]: 2,   /* a big file, by its system (tests-by-system) */
  [fileNamed('BroTown.jsx')]: 1,
  'src/ui/mobile/NmlBadge.jsx': 1,
  'src/ui/mobile/dash/InventoryPanel.jsx': 1,
  'src/ui/mobile/dash/equipActions.js': 1,
  'src/ui/mobile/mockItems.js': 1,
  'src/ui/mobile/sheet/StatDemo.jsx': 2,
  'src/ui/panels/PlayerPaint.jsx': 6,
}));
function spreadCallsIn(rel) {
  const raw = readFileSync(join(ROOT, rel), 'utf8');
  if (!raw.includes('...')) return 0;
  let ast = astCache.get(rel);
  if (!ast) { ast = babel.parser.parse(raw, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); astCache.set(rel, ast); }
  let n = 0;
  babel.traverse(ast, {
    SpreadElement(path) {
      if (path.parent.type !== 'ObjectExpression') return;
      const a = path.node.argument;
      if (a.type !== 'CallExpression') return;
      const c = a.callee;
      const b = c.type === 'Identifier' ? path.scope.getBinding(c.name) : null;
      if (b && b.kind !== 'module') return;   /* a local function: followed */
      n++;
    },
  });
  return n;
}
if (babel) {
  const over = [];
  const counts = Object.create(null);
  let total = 0;
  for (const side of Object.keys(SRC_OF)) for (const f of filesUnder(SRC_OF[side])) {
    const n = spreadCallsIn(f);
    if (!n) continue;
    counts[f] = n; total += n;
    if (n > (SPREAD_CALLS[f] || 0)) over.push(`${f}: ${n} spread(s) of a call into an import or a method, the list ${SPREAD_CALLS[f] || 0}`);
  }
  check(`2c: spreads of a call the phase scan cannot follow: ${total} in ${Object.keys(counts).length} files (the list only falls)`, over.length === 0, over);
  const fell = Object.keys(SPREAD_CALLS).filter((f) => (counts[f] || 0) < SPREAD_CALLS[f]);
  if (fell.length) info(`(room: ${fell.map((f) => f + ' ' + (counts[f] || 0) + ' < ' + SPREAD_CALLS[f]).join(', ')}; lower the list)`);
  if (process.argv.includes('--write-spreads')) console.log(JSON.stringify(counts, null, 2));
}

/* ── 2d. v2.3.6526 (sitting 59's hold; the orchestrator's answer (a)): A
   FENCE ON A LITERAL KEY, NOT A WALL ──
   Sitting 59 wrote a door's field through a literal the scan did not follow
   (`Object.freeze({ status: 'resolved' })` spread, a conditional `_p`, a
   `_up(patch)` helper, `..._ps[0]`, party.js): each plants an object
   literal with the field's key.  So every object-literal key that names a
   door's field (its side's files, outside the door's own files) is counted,
   by field and file, and the list only falls (KEYS): a new one is red,
   whatever is done with the literal after.  The ALLOWED forms (no row):
     - a literal outside every function (a table built at load, the wire
       table's `phase` column: data, never a record's write);
     - a literal handed straight to `new Response(..)` / `Response.json(..)`
       (an http status, not a phase);
     - a key the guard cannot read (`{ [k]: v }` with a k it cannot read).
   NOT GUARDED (said in the PR, and here): a write by a key held in a
   variable (`x[k] = v`, 2,111 under src/ and server/src on 2026-11-24), a
   spread of a non-literal (776), Object.assign from a non-literal (434):
   the tree cannot read the key.  This is a fence, not deny by default; the
   wall (a shadow kept by each door, compared in the test room after every
   message and tick) is the card's next PR (docs/plan/status/WL.md, Found). */
const KEYS = Object.freeze(Object.assign(Object.create(null), {
  ['_dying ' + fileNamed('entityRenderer.js')]: 1,   /* a big file, by its system */
  ['_extraction ' + fileNamed('entityRenderer.js')]: 1,   /* a big file, by its system */
  ['_pvpSkullType ' + fileNamed('entityRenderer.js')]: 1,   /* a big file, by its system */
  ['_shieldUp ' + fileNamed('effectsRenderer.js')]: 1,   /* a big file, by its system */
  ['_shieldUp ' + fileNamed('entityRenderer.js')]: 1,   /* a big file, by its system */
  'alive server/src/devtools.js': 1,
  'alive server/src/dungeon.js': 2,
  'alive server/src/gathering.js': 1,
  'alive server/src/index.js': 1,
  'alive server/src/join.js': 2,
  'alive server/src/spawnscale.js': 2,
  'alive server/src/tick.js': 2,
  'alive server/src/wheelzone.js': 1,
  'alive src/data/gameSystems.js': 2,
  'alive src/data/lifeSkills.js': 1,
  'alive src/networking/gameEvents.js': 1,
  'alive src/networking/wsClient.js': 1,
  'alive src/rendering/farmWorld.js': 3,
  'alive src/rendering/lightfx/casters.js': 7,
  'alive src/rendering/systems/ambientFx.js': 1,
  ['alive ' + fileNamed('entityRenderer.js')]: 1,   /* a big file, by its system */
  'alive src/rendering/wheelDoors.js': 1,
  'alive src/rendering/wheelObjects.js': 2,
  ['alive ' + fileNamed('BroTown.jsx')]: 1,   /* a big file, by its system */
  'blocking server/src/admin.js': 1,
  'blocking server/src/index.js': 1,
  'blocking server/src/join.js': 1,
  'blocking server/src/spar.js': 1,
  ['currentZone ' + fileNamed('effectsRenderer.js')]: 2,   /* a big file, by its system */
  ['currentZone ' + fileNamed('BroTown.jsx')]: 1,   /* a big file, by its system */
  'ex server/src/admin.js': 1,
  'ex server/src/tick.js': 1,
  'life server/src/spar.js': 4,
  'phase server/src/dungeon.js': 1,
  'phase server/src/index.js': 1,
  'phase server/src/life.js': 1,
  'phase server/src/telegraph.js': 6,
  'po server/src/admin.js': 1,
  'po server/src/tick.js': 1,
  'state server/src/dungeon.js': 1,
  'state server/src/party.js': 3,
  'state server/src/rejoinresend.js': 1,
  'status server/src/alliance.js': 1,
  'status server/src/arena.js': 5,
  'status server/src/burst.js': 1,
  'status server/src/chainwriter.js': 3,
  'status server/src/clans.js': 1,
  'status server/src/gladiator.js': 10,
  'status server/src/index.js': 2,
  'status server/src/origin.js': 2,
  'status server/src/playerrestore.js': 9,
  'status server/src/publicreads.js': 1,
  'z server/src/bodytake.js': 1,
  'z server/src/eventplace.js': 3,
  'z server/src/index.js': 1,
  'z server/src/join.js': 1,
  'z server/src/lastplace.js': 2,
  'z server/src/moveclaims.js': 1,
  'z server/src/movement.js': 1,
  'z server/src/movepath.js': 1,
  'z server/src/spar.js': 2,
  'z server/src/tick.js': 2,
  'z server/src/wheeldungeon.js': 1,
}));
function keyLiteralsIn(rel, props, text = null) {
  const raw = text === null ? readFileSync(join(ROOT, rel), 'utf8') : text;
  if (![...props].some((p) => raw.includes(p))) return [];
  let ast = text === null ? astCache.get(rel) : null;
  if (!ast) { ast = babel.parser.parse(raw, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); if (text === null) astCache.set(rel, ast); }
  const out = [];
  babel.traverse(ast, {
    ObjectProperty(path) {
      if (path.parent.type !== 'ObjectExpression') return;
      const k = keyName(path.node, path.scope);
      if (!k || !props.has(k)) return;
      if (!path.getFunctionParent()) return;                                   /* a table built at load */
      const obj = path.parentPath, c = obj.parent;
      if (c && (c.type === 'NewExpression' || c.type === 'CallExpression') && c.arguments.includes(obj.node)) {
        const ce = c.callee;
        if ((ce.type === 'Identifier' && ce.name === 'Response')
          || (ce.type === 'MemberExpression' && ce.object.type === 'Identifier' && ce.object.name === 'Response' && propOf(ce) === 'json')) return;   /* an http status */
      }
      out.push({ prop: k, line: path.node.loc.start.line });
    },
  });
  return out;
}
const fenceFields = () => {
  /* side -> Map(prop -> Set(the door's own files)) */
  const m = { worker: new Map(), page: new Map() };
  const add = (side, prop, file) => { if (!m[side].has(prop)) m[side].set(prop, new Set()); if (file) m[side].get(prop).add(file); };
  for (const r of ROWS.filter((x) => x && x.status === 'door')) {
    const held = r.held || {};
    if (str(held.suite) && Object.prototype.hasOwnProperty.call(DOOR_SUITES, held.suite)) add(r.side, DOOR_SUITES[held.suite].prop, r.file);
    for (const sc of held.scan || []) { add(r.side, sc.prop, r.file); for (const a of sc.at || []) { const p = place(a); if (p) add(r.side, sc.prop, p.file); } }
  }
  return m;
};
if (babel) {
  const F = fenceFields();
  const found = Object.create(null);
  const byField = Object.create(null);
  for (const side of Object.keys(SRC_OF)) {
    const props = new Set(F[side].keys());
    for (const f of filesUnder(SRC_OF[side])) {
      for (const h of keyLiteralsIn(f, props)) {
        if (F[side].get(h.prop).has(f)) continue;                               /* the door's own file */
        const key = h.prop + ' ' + f;
        (found[key] = found[key] || []).push(h.line);
      }
    }
  }
  const over = [];
  for (const k of Object.keys(found).sort()) {
    const field = k.split(' ')[0];
    byField[field] = (byField[field] || 0) + found[k].length;
    if (found[k].length > (KEYS[k] || 0)) over.push(`${k}: ${found[k].length} literal key(s), its row ${KEYS[k] || 0} (lines ${found[k].join(', ')})`);
  }
  const n = Object.values(found).reduce((t, l) => t + l.length, 0);
  const line = Object.values(KEYS).reduce((t, x) => t + x, 0);
  check(`2d: a FENCE (not a wall): object-literal keys naming a door's field outside its file, in a function, not an http status: ${n} in ${Object.keys(found).length} (field, file) pairs, the list ${line} in ${Object.keys(KEYS).length} rows (it only falls); by field ${Object.entries(byField).sort((a, b) => b[1] - a[1]).map(([f, c]) => f + ' ' + c).join(', ')}`, over.length === 0, over);
  const stale = Object.keys(KEYS).filter((k) => !found[k]);
  if (stale.length) info(`(room: ${stale.join(', ')} hold none now; delete their rows)`);
  if (process.argv.includes('--write-keys')) for (const k of Object.keys(found).sort()) console.log(`  '${k}': ${found[k].length},`);
  const rowsBy = Object.create(null);
  for (const k of Object.keys(KEYS)) { const fld = k.split(' ')[0]; rowsBy[fld] = (rowsBy[fld] || 0) + 1; }
  info(`(2d's rows by field: ${Object.entries(rowsBy).sort((a, b) => b[1] - a[1]).map(([f, c]) => f + ' ' + c).join(', ')})`);
  /* the plants, every run: sitting 59's four (party.js:122), then card WL's own three; and the
     allowed forms, none */
  const wrap = (b) => `export function _partyLeave(d, c) {\n${b}\n}\n`;
  const ST = new Set(['status']);
  const RED = [
    "return { ...d, ...Object.freeze({ status: 'resolved' }) };",
    "const _p = c ? { status: 'resolved' } : null; return { ...d, ..._p };",
    "const _up = (o, patch) => Object.assign(o, patch); _up(d, { status: 'resolved' });",
    "const _ps = [{ status: 'resolved' }]; return { ...d, ..._ps[0] };",
    "return Object.assign(d, { 'status': 'resolved' });",
    "return { ...d, [`status`]: 'resolved' };",
    "const K = 'status'; return { ...d, [K]: 'resolved' };",
  ];
  const ALLOWED = ["return new Response('gone', { status: 410 });", "return Response.json({ ok: 1 }, { status: 200 });"];
  const missed = RED.filter((b) => !keyLiteralsIn('plant.js', ST, wrap(b)).length);
  const loud = ALLOWED.filter((b) => keyLiteralsIn('plant.js', ST, wrap(b)).length);
  check(`2d: each planted literal key is counted (${RED.length} plants), each allowed form is not (${ALLOWED.length})`, !missed.length && !loud.length, { missed, loud });
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
