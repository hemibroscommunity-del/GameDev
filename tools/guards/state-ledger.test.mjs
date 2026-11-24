/* ═══ v2.3.5160: THE STATE LEDGER, HELD (grand plan step 5.3, step 1; card U) ═══
 *
 * The ledger (src/state/README.md) is one file a system of card B's map,
 * src/state/<system>.js, with a row for every field of the state `S` and
 * every top-of-file variable of that system, one row a line.  Its rows are
 * made by card D's script (`node tools/dev/state-census.mjs --ledger <system>
 * --write`), never typed.  This guard holds it:
 *
 *   1. every file in src/state/ is the README, the phase table (phases.js,
 *      v2.3.5202: step 5.3b, held by phase-table.test.mjs) or a ledger named
 *      for a system of the map; a ledger is plain data (no import, no call,
 *      nothing but `SYSTEM`, `ROWS` and literals), says its own system, and
 *      every row has the README's columns;
 *   2. no row is in two ledger files, or twice in one;
 *   3. every row of a ledger is a row the census finds (a field gone from
 *      the code, a variable moved to another file: make the ledger again);
 *   4. every row the census finds is a row of a ledger, or counted as
 *      UNLISTED; the count may only fall (the plan's rule 3: a census.  Only
 *      the gatekeeper lowers UNLISTED_LINE, in a PR of its own; nobody
 *      raises it, and only the gatekeeper makes it strict);
 *   5. (v2.3.5201, reading the script) every listed row's MACHINE columns
 *      are the script's: `system`, `suggested`, `born`, `twoFiles`,
 *      `noRead`, `noSet`, `neverChanged`, `phase`, `flag`, `writers`, as
 *      `--ledger` makes them now.  A row changed by hand, or left stale by a
 *      change to the code (a new writer), fails: make the ledger again.  The
 *      hand's columns (`lifetime`, and any a later card adds beside it, card
 *      L's `reset`) are the hand's and are never compared;
 *   6. (v2.3.5203, reading the script) a row whose lifetime names an edge
 *      (`zone`, `rejoin`; `death` has no one door on the page yet) is reset
 *      there: by a resetOn(edge, fn) whose named fn writes it (the script's
 *      `resets`), or by the edge's door's own list (changeZone and
 *      clearZoneLocalFx; rejoinClear: a write there, or, v2.3.5219, a call
 *      there of the field's page door); and every reset writes only rows whose
 *      lifetime names its edge.  `lifetime` is `sitting` or edges joined by
 *      `+`; `reset` is `value <v>` or `fn <name>` beside an edge, `kept:
 *      <why>` beside `sitting` (src/state/README.md);
 *   7. the rows card D suggests a reset for (not `never`, not `?`) still
 *      `sitting` with no `kept:` may only fall: SITTING_LINE, which each of
 *      card L's reset PRs lowers to its count (its card's PR 4).
 *   8. (v2.3.6522, card WL PR 3) OWNED STATE: a row of OWNED (a field
 *      pinned to its system) is written only from its system's files, read
 *      off the code (the script's writes), never off the ledger's writers
 *      column: a second writer is refused, not recorded.  OWNED_LINE is its
 *      count and only rises (a row is taken off by the gatekeeper alone).
 *      A row whose writers ALL moved to one other system is re-pinned by
 *      hand in the same PR (moving is not crossing); 8b counts the fields
 *      with an enforced reset that OWNED does not hold (only falls); 8c
 *      counts the fields WAITING for one owner (only falls).
 * Printed, never failed: the unlisted rows by system, the rows of files the
 * map has not placed (`unsorted`: no ledger can take them), and a listed row
 * whose system has moved since it was listed (it stays in its file).
 *
 * WHERE THE ROWS COME FROM.  Card D's script is the one reader of the code
 * (the plan's rule 2).  v2.3.5201 (card L PR 1, the gatekeeper's finding,
 * sitting 6): the guard READS THE SCRIPT wherever it loads, GitHub's `test`
 * job included.  That job installs only server/'s packages; server/ now
 * carries the root's exact @babel/parser and @babel/traverse, and the
 * script's loader tries the root's packages, then server/'s.  Its run (~18 s)
 * is shared with four-lines' fourth number, one a `npm test`
 * (lib/fourLines.mjs, stateCensus()).  Only where it cannot load (no @babel
 * in either place: it exits 3) does the guard read the page the script
 * writes (docs/plan/census/state.md: a field by its name, a variable by its
 * file and name), says so, and skips 5 (the page carries no columns).  Until
 * then the guard was blind between rewrites of the page: a new top-of-file
 * `let` was green by the page and red by the code.  The page stays a census
 * the script rewrites, never a gate: it carries line numbers, so
 * `--check` would fail every PR that moves a line under src/.
 *
 * BREAK PROOF (the plan's rule 8), each tried by hand, 2026-11-14:
 *   1. `import x from './y.js';` at the top of src/state/life.js  -> FAIL 1
 *   2. the `_deathCard` row's line twice in src/state/life.js     -> FAIL 2
 *   3. `_deathCard` renamed `_deathCardX` in that row             -> FAIL 3 and 4
 *   4. the row deleted (unlisted 2128 -> 2129, its line 2128)     -> FAIL 4
 * v2.3.5201, each with ONLY server/'s packages installed (the root's
 * node_modules moved aside, as GitHub's `test` job), 2026-11-14:
 *   6. `let _l5201 = 0;` at the top of src/game/deathCard.js, with
 *      UNLISTED_LINE at its count (16: the gatekeeper's to set, rule 3;
 *      at 2128 a new row is room, not a fail)     -> FAIL 4 (17 of 2170)
 *      (by the page, `--page`, it stayed green: the blindness this fixes)
 *   7. the `_deathCard` row's `writers` changed by hand to
 *      ['src/game/lifeSkillRewards.js'] in src/state/life.js  -> FAIL 5
 *   8. its `suggested` 'death' -> 'zone' by hand              -> FAIL 5
 *   (its `lifetime` 'sitting' -> 'death' by hand: green, the hand's column)
 *   9. @babel moved aside in server/ too: the page is read and said,
 *      5 skipped, green; with `--live`                        -> FAIL 0
 * v2.3.5203 (card L PR 3), each tried by hand, 2026-11-14:
 *  10. `_shotEnds`'s lifetime set back to sitting in src/state/audio.js
 *      (its reset, hitSounds.js forgetShotEnds, then writes a row whose
 *      lifetime names no edge)                       -> FAIL 6 (and 7)
 *  11. `_iceAttack` given lifetime zone by hand, with no reset in the code
 *                                                         -> FAIL 6
 *  12. `_pointsResetAskedAt`'s `kept:` taken off (469, line 468) -> FAIL 7
 *  13. the reset given inline, `resetOn('zone', (S) => {...}, 'audio')`
 *                                                         -> FAIL 6
 * v2.3.6522 (card WL PR 3), each tried by hand, 2026-11-23:
 *  14. `S._deathCard = null;` in groundLoot.js updateGroundLootPickup (the
 *      shape review's plant 1)                          -> FAIL 5 and 8
 *  15. the same, then `state-census.mjs --ledger life --write` (the way
 *      out that recorded it)                            -> FAIL 8 alone
 *  16. `if (S._deathCard) S._deathCard.lost = 0;` there (a write inside it)
 *                                                         -> FAIL 8
 *  17. `_deathCard` taken off OWNED                       -> FAIL 8 (440,
 *      the line 441)
 *  18. `Object.assign(S, { _deathCard: ... })` there; and a helper
 *      `_zz(state) { ({ v: state._deathCard } = o); }` called `_zz(S)`
 *      there (a destructured write through a renamed name)  -> FAIL 8
 *  19. `_shotEnds` pinned to debug (every write is audio's): FAIL 8 says
 *      "moved, not crossed -- re-pin its row to audio"
 *  NOT CAUGHT: `Object.assign(S, z)` with z a variable holding the key, and
 *  a computed key (`{ ['_deathCard']: null }`): the script lists them as
 *  "merged with keys not written out" (its WHOLE) and its --json does not
 *  carry them, so no row can be refused for them here.
 *
 * Run from the repository's root: node tools/guards/state-ledger.test.mjs
 *   --live   insist on the script: fail where it cannot load (no fallback)
 *   --page   read the page, as where the script cannot load (to compare)
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SYSTEMS, ROOT, placeFiles, systemOf } from './lib/systems.mjs';
import { stateCensus, CENSUS_SCRIPT } from './lib/fourLines.mjs';

/* Set 2026-11-14 at its first count (the page at main 75946b7: 647 fields
   and 1,482 variables, 2,129 rows, less the one row of src/state/life.js).
   Only the gatekeeper lowers it.
   v2.3.5363 (the gatekeeper, sitting 7): 2128 -> 22, card U's nine merged.
   The count on sitting 7's rehearsed list: 16 by the page (the four files
   the map has not placed), 22 by the code (`--live`, and what card L's
   #1746 reads): the list brings six top-of-file variables no ledger lists
   yet, src/debug/report.js `_speed`, `_lastSentAt` (#1711),
   src/rendering/picsOnce.js `_walk`, `_walkMap`, `_seen` (#1741) and
   src/rendering/bodyBake.js `_unheard` (#1747).  The line is the code's
   count, so the list merged with #1746 stays green; the next
   `--ledger debug`, `--ledger preload` and `--ledger art` take them, and
   the next sitting lowers it again. */
export const UNLISTED_LINE = 22;
/* v2.3.5203 (card L PR 3): the rows card D suggests a reset for that are
   still `sitting` with no `kept:` (484 at main 75946b7's ledgers).  Each of
   card L's reset PRs lowers it with what it decides (its card's PR 4).
   v2.3.6060 (card U3): 233 -> 206, the last 27 rows outside ui and render
   (cards M and M2 hold those 206). */
export const SITTING_LINE = 206;

const LIVE = process.argv.includes('--live');
const PAGE_ONLY = process.argv.includes('--page');
const PAGE = 'docs/plan/census/state.md';
const DIR = 'src/state';
const NOT_LEDGER = 'phases.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const info = (s) => console.log('     ' + s);

/* ── the rows the census finds: Map(key -> the file whose system is the row's) ──
   a field: 'S <name>', its provisional system (the file that sets it most);
   a variable: '<file> <name>', its own file.  Paths from the root. */
function fromPage() {
  const text = readFileSync(join(ROOT, PAGE), 'utf8');
  const rows = new Map();
  let section = '', fields = 0, vars = 0;
  for (const line of text.split('\n')) {
    if (/^#{2,3} /.test(line)) { section = line; continue; }
    let m;
    if (section.startsWith('## The state\'s fields') && (m = /^\| `([^`]+)` \| [^|]+ \| ([^ |]+) \|/.exec(line))) {
      rows.set('S ' + m[1], 'src/' + m[2]); fields++;
    } else if (section.startsWith('## The variables at the top of files') && (m = /^\| ([^ |]+) \| \d+ \| `([^`]+)` \|/.exec(line))) {
      rows.set('src/' + m[1] + ' ' + m[2], 'src/' + m[1]); vars++;
    } else if (section.startsWith('### `let` and `var` never changed') && (m = /^- ([^ :]+): (.*)$/.exec(line))) {
      for (const n of m[2].matchAll(/`([^`]+)`/g)) { rows.set('src/' + m[1] + ' ' + n[1], 'src/' + m[1]); vars++; }
    }
  }
  /* the page says its own totals: a change in its form must not read as "no rows" */
  const t = /\*\*Totals: (\d+) fields and (\d+) top-of-file variables/.exec(text);
  check(`0: the census page's rows read (${fields} fields, ${vars} variables; it says ${t ? t[1] + ' and ' + t[2] : 'no totals'})`,
    !!t && Number(t[1]) === fields && Number(t[2]) === vars && rows.size === fields + vars);
  return rows;
}
function fromScript(j) {
  const rows = new Map();
  for (const r of j.fields) rows.set('S ' + r.name, 'src/' + r.system);
  for (const v of j.variables) rows.set('src/' + v.file + ' ' + v.name, 'src/' + v.file);
  check(`0: the census script's rows read (${j.fields.length} fields, ${j.variables.length} variables, ${(j.ledger || []).length} made as ledger rows)`,
    rows.size === j.fields.length + j.variables.length && Array.isArray(j.ledger) && j.ledger.length === rows.size);
  return rows;
}

/* ── a ledger file is plain data: with its comments and strings taken out,
   only `export const SYSTEM =`, `export const ROWS =`, keys, literals and
   punctuation are left (no import, no call, no expression) ── */
function plainData(src) {
  const rest = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, ' ')
    .replace(/export const (SYSTEM|ROWS) =/g, ' ')
    .replace(/\b[A-Za-z_$][\w$]*\s*:/g, ' ')
    .replace(/\b(null|true|false)\b|-?\b\d+(\.\d+)?\b/g, ' ');
  return /^[\s{}[\],;]*$/.test(rest) ? null : rest.replace(/[\s{}[\],;]+/g, ' ').trim().slice(0, 80);
}

const SUGGESTED = /^(\?|(never|zone|death|rejoin)(\+(zone|death|rejoin))*)$/;
const LIFETIME = /^(sitting|(zone|death|rejoin)(\+(zone|death|rejoin))*)$/;
const RESET = /^(value \S.*|fn [A-Za-z_$][\w$]*|kept: \S.*)$/;
const str = (x) => typeof x === 'string' && x.length > 0;
function rowFault(row) {
  if (!row || typeof row !== 'object') return 'not an object';
  const isField = row.field !== undefined;
  if (isField ? !str(row.field) || row.variable !== undefined : !str(row.variable) || !str(row.file)) return 'no field, or no variable and its file';
  if (!Object.hasOwn(SYSTEMS, row.system) && row.system !== 'unsorted') return 'system';
  /* v2.3.5203 (card L PR 3): the hand's two columns.  `lifetime` is
     `sitting` or the edges it is reset at; `reset` (absent until someone
     decides) is `value <v>` or `fn <name>` beside an edge, or `kept: <why>`
     beside `sitting` */
  if (!str(row.lifetime) || !LIFETIME.test(row.lifetime)) return 'lifetime';
  if (row.reset !== undefined) {
    if (!str(row.reset) || !RESET.test(row.reset)) return 'reset';
    if (/^kept: /.test(row.reset) !== (row.lifetime === 'sitting')) return 'reset (kept: beside sitting, a value or fn beside an edge)';
  } else if (row.lifetime !== 'sitting') return 'reset (an edge says what it resets to)';
  if (typeof row.suggested !== 'string' || !SUGGESTED.test(row.suggested)) return 'suggested';
  if (!str(row.born)) return 'born';
  if (!['', '2+', '2+~'].includes(row.twoFiles)) return 'twoFiles';
  if (![true, false, 'tests'].includes(row.noRead)) return 'noRead';
  if (isField && typeof row.noSet !== 'boolean') return 'noSet';
  if (!isField && typeof row.neverChanged !== 'boolean') return 'neverChanged';
  /* v2.3.5166: a phase's word may be '' -- the code sets look's _bakeTag
     (bodyRecolor.js) to '' and to 'jog-east', and the census keeps both */
  if (row.phase !== null && !(Array.isArray(row.phase) && row.phase.length > 0 && row.phase.every((w) => typeof w === 'string'))) return 'phase';
  if (typeof row.flag !== 'boolean') return 'flag';
  if (!Array.isArray(row.writers) || !row.writers.every(str)) return 'writers';
  return null;
}
const keyOf = (row) => (row.field !== undefined ? 'S ' + row.field : row.file + ' ' + row.variable);

/* the script wherever it loads (one run a `npm test`, shared with
   four-lines); the page only where it cannot, and said */
let census = null;
if (!PAGE_ONLY) {
  census = stateCensus();
  if (!census && LIVE) {
    check(`0: ${CENSUS_SCRIPT} loads its @babel (--live: no fallback to the page)`, false, 'run `npm install` at the root or in server/');
  }
}
info(census ? `reading the code: ${census.by}` : `reading the page ${PAGE}${PAGE_ONLY ? ' (--page)' : `: ${CENSUS_SCRIPT} cannot load its @babel here (neither the root's nor server/'s); check 5 skipped`}`);
const found = census ? fromScript(census.json) : fromPage();

/* ── 1. the files, their form, their rows ── */
const ledgers = new Map();   /* system -> rows */
{
  const names = existsSync(join(ROOT, DIR)) ? readdirSync(join(ROOT, DIR)).sort() : [];
  /* v2.3.5202 (card L PR 2): the phase table, src/state/phases.js, is the
     one file here that is not a ledger (step 5.3b; its own guard,
     phase-table.test.mjs) */
  const stray = names.filter((n) => n !== 'README.md' && n !== NOT_LEDGER && !(n.endsWith('.js') && Object.hasOwn(SYSTEMS, n.slice(0, -3))));
  check(`1: every file in ${DIR}/ is the README, the phase table or a ledger named for a system of the map (${names.length} files)`, stray.length === 0 && names.includes('README.md'), stray.length ? stray : 'no README.md');
  const bad = [];
  for (const n of names) {
    if (n === 'README.md' || n === NOT_LEDGER || stray.includes(n)) continue;
    const sys = n.slice(0, -3);
    const notData = plainData(readFileSync(join(ROOT, DIR, n), 'utf8'));
    if (notData) { bad.push(`${n}: not plain data (${notData})`); continue; }
    const mod = await import(pathToFileURL(join(ROOT, DIR, n)).href);
    if (mod.SYSTEM !== sys) bad.push(`${n}: SYSTEM is ${JSON.stringify(mod.SYSTEM)}`);
    if (!Array.isArray(mod.ROWS)) { bad.push(`${n}: no ROWS`); continue; }
    mod.ROWS.forEach((row, i) => { const f = rowFault(row); if (f) bad.push(`${n} row ${i + 1}: ${f}`); });
    ledgers.set(sys, mod.ROWS.filter((row) => !rowFault(row)));
  }
  check(`1: every ledger is plain data, says its system, and every row has the README's columns (${ledgers.size} ledgers)`, bad.length === 0, bad);
}

/* ── 2. a row in one place ── */
const listed = new Map();   /* key -> [system, ...] */
for (const [sys, rows] of ledgers) for (const row of rows) {
  const k = keyOf(row);
  if (!listed.has(k)) listed.set(k, []);
  listed.get(k).push(sys);
}
{
  const twice = [...listed].filter(([, s]) => s.length > 1).map(([k, s]) => `${k}: ${s.join(', ')}`);
  check(`2: no row is in two ledger files or twice in one (${listed.size} rows listed)`, twice.length === 0, twice);
}

/* ── 3 and 4: against the rows the census finds ── */
{
  const gone = [...listed.keys()].filter((k) => !found.has(k));
  check(`3: every listed row is one the census finds (${census ? 'the script' : 'its page'}): make the ledger again (state-census.mjs --ledger <system> --write)`, gone.length === 0, gone);
}
{
  const placed = placeFiles();
  const unlisted = [...found.keys()].filter((k) => !listed.has(k));
  const n = unlisted.length;
  check(`4: unlisted rows at or under the line ${UNLISTED_LINE} (${n} of ${found.size}): a new row goes in its system's ledger (state-census.mjs --ledger <system> --write)`, n <= UNLISTED_LINE);
  if (n < UNLISTED_LINE) info(`(room: ${UNLISTED_LINE - n} under the line ${UNLISTED_LINE}, at ${n} unlisted; the gatekeeper may lower it)`);
  const by = new Map();
  const unsortedFiles = new Set();
  for (const k of unlisted) {
    const s = systemOf(found.get(k), placed) || 'unsorted';
    by.set(s, (by.get(s) || 0) + 1);
    if (s === 'unsorted') unsortedFiles.add(found.get(k));
  }
  info('unlisted by system: ' + [...by].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([s, c]) => `${s} ${c}`).join(', '));
  if (unsortedFiles.size) info(`rows in files the map has not placed (no ledger can take them): ${[...unsortedFiles].sort().join(', ')}`);
  const moved = [];
  for (const [k, systems] of listed) {
    if (!found.has(k)) continue;
    const now = systemOf(found.get(k), placed) || 'unsorted';
    if (!systems.includes(now)) moved.push(`${k} (in ${systems[0]}, now ${now})`);
  }
  if (moved.length) info(`listed rows whose system has moved (they stay where they are): ${moved.join('; ')}`);
}

/* ── 5. a listed row's machine columns are the script's (v2.3.5201) ──
   The columns `--ledger` makes (state-census.mjs's LEDGER_MADE, less the
   key): every one but the hand's, which are never compared. */
const MACHINE = ['system', 'suggested', 'born', 'twoFiles', 'noRead', 'noSet', 'neverChanged', 'phase', 'flag', 'writers'];
if (census) {
  const made = new Map(census.json.ledger.map((row) => [keyOf(row), row]));
  const hand = [];
  for (const [sys, rows] of ledgers) for (const row of rows) {
    const m = made.get(keyOf(row));
    if (!m) continue;   /* 3 names it */
    const cols = MACHINE.filter((c) => JSON.stringify(row[c]) !== JSON.stringify(m[c]));
    if (cols.length) hand.push(`src/state/${sys}.js ${keyOf(row)}: ` + cols.map((c) => `${c} ${JSON.stringify(row[c])}, the script's ${JSON.stringify(m[c])}`).join('; '));
  }
  check(`5: every listed row's machine columns are the script's (${MACHINE.join(', ')}): make the ledger again (state-census.mjs --ledger <system> --write); by hand only lifetime and the hand's columns`, hand.length === 0, hand);
} else {
  info('5: not checked: the page carries no columns (only where the script cannot load)');
}

/* ── 6. a row's lifetime and the resets (v2.3.5203, card L PR 3) ──
   Every listed row whose lifetime names an edge is reset there: by a
   resetOn(edge, fn) whose fn writes it (the script's `resets`: its file is
   then one of the row's writers; v2.3.5218, or asks the field's own page
   door, a phase-table row turned `door`), or by the edge's door's own list (the
   zone's changeZone and clearZoneLocalFx; the rejoin's rejoinClear: a write
   there, or, v2.3.5219, a call there of the field's page door).  And
   every reset writes only rows whose lifetime names its edge.  The death
   has no one door on the page yet (docs/specs/state-resets.md): nothing
   may be reset at it. */
const DOOR_LISTS = Object.freeze({
  zone: ['game/zoneTransitions.js changeZone', 'game/zoneTransitions.js clearZoneLocalFx'],
  rejoin: ['game/rejoinSlots.js rejoinClear'],
  death: [],
});
if (census) {
  const bad = [];
  const R = census.json.resets || [];
  for (const b of census.json.resetsBad || []) bad.push(b);
  /* key -> Set of edges its resets cover */
  const by = new Map();
  const cover = (k, e) => { if (!by.has(k)) by.set(k, new Set()); by.get(k).add(e); };
  for (const r of R) {
    for (const f of r.fields) cover('S ' + f, r.edge);
    for (const v of r.variables) cover(v, r.edge);   /* the script's own path, from the root */
  }
  /* the doors' own lists: a write whose site is "<file>:<line> <fn>" */
  const doorWrites = (sites, e) => (sites || []).some((x) => DOOR_LISTS[e].some((d) => { const [f, fn] = d.split(' '); return x.startsWith(f + ':') && x.split(' ')[1] === fn; }));
  const doorCovers = new Map();
  for (const r of census.json.fields) for (const e of Object.keys(DOOR_LISTS)) if (doorWrites([...r.sets, ...r.inside], e)) { const k = 'S ' + r.name; if (!doorCovers.has(k)) doorCovers.set(k, new Set()); doorCovers.get(k).add(e); }
  for (const v of census.json.variables) for (const e of Object.keys(DOOR_LISTS)) if (doorWrites(v.writes, e)) { const k = 'src/' + v.file + ' ' + v.name; if (!doorCovers.has(k)) doorCovers.set(k, new Set()); doorCovers.get(k).add(e); }
  /* v2.3.5219: a door list's own call of a field's page door clears it there too (clearZoneLocalFx asks the harvest's door) */
  for (const d of census.json.doorCalls || []) for (const e of Object.keys(DOOR_LISTS)) if (doorWrites([d.at], e)) { const k = 'S ' + d.field; if (!doorCovers.has(k)) doorCovers.set(k, new Set()); doorCovers.get(k).add(e); }
  const life = new Map();
  for (const [sys, rows] of ledgers) for (const row of rows) life.set(keyOf(row), { sys, edges: row.lifetime === 'sitting' ? [] : row.lifetime.split('+') });
  for (const [k, { sys, edges }] of life) {
    for (const e of edges) {
      if (e === 'death') { bad.push(`src/state/${sys}.js ${k}: lifetime death, but the death has no one door on the page yet`); continue; }
      if (!(by.get(k) && by.get(k).has(e)) && !(doorCovers.get(k) && doorCovers.get(k).has(e))) bad.push(`src/state/${sys}.js ${k}: lifetime ${e}, and no resetOn('${e}', ...) writes it (nor the ${e} door's own list)`);
    }
  }
  for (const r of R) {
    for (const k of [...r.fields.map((f) => 'S ' + f), ...r.variables]) {
      const l = life.get(k);
      if (!l || !l.edges.includes(r.edge)) bad.push(`${r.file}:${r.line} resetOn('${r.edge}', ${r.fn}) writes ${k}, whose ledger row's lifetime is ${l ? (l.edges.join('+') || 'sitting') : 'not listed'}`);
    }
    if (!r.fields.length && !r.variables.length) bad.push(`${r.file}:${r.line} resetOn('${r.edge}', ${r.fn}) writes no row (a reset writes its state itself, or through its field's page door, never through another call)`);
  }
  check(`6: every row reset at an edge has its reset there, and every reset a row (${R.length} resets)`, bad.length === 0, bad);
} else {
  info('6: not checked: the page carries no resets (only where the script cannot load)');
}

/* ── 7. the rows still sitting with a suggestion (v2.3.5203, card L) ──
   A row card D suggests a reset for (zone, death, rejoin: not `never`, not
   `?`) is decided when its lifetime names its edge, or its reset says
   `kept:` and why.  The count of the undecided only falls; each of card L's
   reset PRs lowers SITTING_LINE with it (card L's card, PR 4). */
{
  let sitting = 0;
  const bySys = new Map();
  for (const [sys, rows] of ledgers) for (const row of rows) {
    if (row.suggested === 'never' || row.suggested === '?') continue;
    if (row.lifetime !== 'sitting' || (typeof row.reset === 'string' && /^kept: /.test(row.reset))) continue;
    sitting++;
    bySys.set(sys, (bySys.get(sys) || 0) + 1);
  }
  check(`7: rows still sitting with a suggestion at or under ${SITTING_LINE} (${sitting})`, sitting <= SITTING_LINE);
  if (sitting < SITTING_LINE) info(`(room: ${SITTING_LINE - sitting} under the line ${SITTING_LINE}: lower it in this PR)`);
  info('sitting with a suggestion, by system: ' + [...bySys].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([s2, c]) => `${s2} ${c}`).join(', '));
}

/* ── 8. owned state (v2.3.6522, card WL PR 3) ──
   For a row of OWNED, every place the code writes the field (the census
   script's sets, its writes inside the field, and its writes through a
   name given it) is a file of the row's system, pinned here.  The ledger's
   writers column is not read: "make the ledger again" records a second
   writer (5 goes green) and this stays red (shape-walls.md, plant 1).  A
   row is taken off only in the gatekeeper's PR: OWNED_LINE is the count,
   and it only rises.  Where the script cannot load, 8 is skipped and said
   (--live fails it).
   The first rows (main 0aec6482, 2026-11-23): every field whose writes sit
   in one file today, pinned to that file's system (so the dying door's
   _dying and _deathStart are life's, though ledgered in ui), and the
   page's phase fields whose writes sit in one system (_inDuel: duelDoor
   and duelPending).  Out, and why: _extraction (written from skills,
   social, render and ui) and _pose (townsfolk and audio) have no one owner
   yet; the fields the code never writes; a field written in a file the
   map has not placed.  Card CT's fields join as they land (the
   orchestrator names them).
   v2.3.6522 (the orchestrator, 2026-11-24, before sitting 57): stickX and
   stickY taken out (443 -> 441), so this PR and card CT's #2293 merge in
   either order: with both on main the two fields have writers in two
   systems (input's stickDrive in game/stickZones.js, ui's joystick
   handlers in BroTown.jsx), which OWNED must not claim to wall.  They wait
   in WAITING beside _extraction and _pose. */
const OWNED = Object.freeze({
  audio: ['_shotEnds'],
  combat: ['_abilityFx', '_acc', '_accState', '_bfPose', '_burnUntil',
    '_chillUntil', '_climbNoteAt', '_dazeNoteAt', '_dazeUntil',
    '_dmgFromMonster', '_dodgeFlash', '_engaged', '_engagedGapAt',
    '_engagedId', '_fractureStacks', '_fractureUntil', '_frozenAt',
    '_frozenUntil', '_hasDodged', '_killXpFlewAt', '_killXpKillAt',
    '_killXpWait', '_lockDroppedAt', '_lockDroppedWhy', '_lungeIFramesUntil',
    '_mc', '_offlineNoteAt', '_peerDmgLastRel', '_peerDmgQueue',
    '_peerDmgZone', '_perimeterPx', '_poisonUntil', '_pvpSwSent',
    '_pvpSwSentBy', '_shieldDroppedAt', '_shieldDroppedWhy', '_shieldThreat',
    '_shieldUp', '_shockAt', '_shockFrom', '_shockUntil', '_slowMult',
    '_slowUntil', '_soakUntil', '_stf', '_stuckNoteAt', '_stuckUntil',
    '_targetCands', '_thornUntil', '_wardAt', '_wardElem', '_wardPct',
    '_wobbleFrom', '_wobbleUntil'],
  desktop: ['_dblTapRolls', '_eTalkHints', '_interactNow', '_isDesktop',
    '_teachNode', 'keys'],
  economy: ['_bank', '_bankPending', '_dailyRewards', '_dlCredits',
    '_dropLast', '_mail', '_mktPlaceBusy', '_revealLast', '_spinBoard',
    '_t2Leave', '_t2Live', '_t2QuietUntil'],
  input: ['_burstMsgAt', '_iceAttack', '_lastBurstAt', '_lastSwipe'],
  life: ['_deathCard', '_deathStart', '_dying'],
  liveops: ['_testMode'],
  monsters: ['_bowShotAng', '_bowSight', '_cursedUntil', '_monNoiseAt',
    '_ownSpecialRecent', '_playerStunUntil', '_propSwingAt', '_rpgSaveTimer',
    '_staffCadenceMs'],
  movement: ['_flipCount', '_jumpCount', '_jumpLandAt', '_jumpLandFx',
    '_jumpOver', '_jumpWhy', '_lastFlip', '_lastJumpRun', '_pushY',
    '_restAsked', '_ride', '_riseChestAsk', '_riseChestGot', '_sprint',
    '_sprintRunOuts', '_tapAtk', '_tapAtkWhy', '_tapAttacks', '_wheelSwim'],
  'page-thread': ['__pixiErrStreak', '_heapBurnSentAt', '_heapBurnUntil',
    '_splitLog'],
  quests: ['_pointsResetAskedAt', '_qcNextPoll', '_qcSeen'],
  render: ['_blockPose', '_blockShieldBehind', '_bloodBursts',
    '_bodyAnimDir', '_bodyAnimFrame', '_bodyAnimMirror', '_bodyDrawH',
    '_bodyFootY', '_bodyMoving', '_bowArtReady', '_bowDir', '_bowGripDX',
    '_bowGripDY', '_bowGripX', '_bowGripY', '_bowHoldFrame', '_bowJogLegs',
    '_bowShowing', '_catchFlights', '_climbFrame', '_dazeGritAt',
    '_dodgeTrail', '_dustPuffs', '_emoteHudDrop', '_facingSrc', '_farmHands',
    '_figureScaleY', '_frozenChipAt', '_gustDustAt', '_jogBodyH',
    '_monstersArtWait', '_monstersFarHidden', '_peerArmTex',
    '_peerBlockPose', '_peerBowFacingsReady', '_peerShieldHeld',
    '_peerStandGeom', '_peersCrowdHidden', '_peersFarHidden',
    '_peersNotDrawn', '_renderFacing', '_selfBandBotY', '_selfBandHalfW',
    '_selfBandTopY', '_selfChatTipY', '_staffTipAt', '_staffTipBehind',
    '_staffTipX', '_staffTipY', '_standInBody', '_standInBodyH',
    '_standInFootY', '_stormZaps', '_swordBodyH', '_swordFootY',
    '_swordJogLegs', '_swordSwingDir', '_swordSwinging', '_waterBlows',
    '_whirlCatch', '_worldScaleX', '_worldScaleY'],
  session: ['_mapWatchSent', '_onlineAt'],
  skills: ['_dealtAt', '_farmAskedAt', '_farmLastSeed', '_farmLastStep',
    '_farmSeedPick', '_farmSteps', '_fishBoard', '_gatherHitSeq',
    '_instantHealAt', '_lastHarvestOkAt', '_nearBed', '_petBook',
    '_petBookRev', '_petLevelSaid', '_petLevelUps', '_petXpGained', '_pvpAt',
    '_smithing', '_strikeShown', '_trapArms', '_trapCatches', '_trapLast',
    '_trapReveal', '_trapRolls', '_trapTries', '_trapsMade', '_wardHits',
    '_wardSaid', '_wardSaidAt'],
  social: ['_activeDuel', '_arenaInvolved', '_arenaMatch',
    '_arenaTournamentId', '_diceAskAt', '_inDuel', '_nmlFoes', '_party',
    '_pvpBlows', '_pvpBouts', '_pvpHitBy', '_pvpSkullType', '_pvpSkullUntil',
    '_race', '_raceLil', '_serverMuteNames', '_serverMutes', '_spar'],
  townsfolk: ['_emoteAt', '_emoteMove', '_idleChatAt', '_idleChatSeq',
    'emote'],
  ui: ['__aliveAt', '__introLiftedAt', '__introLiftedZone', '__wdArmedAt',
    '__wdDark', '__wdEverLit', '__wdFastRebuiltAt', '__wdFirstNext',
    '__wdHb', '__wdNext', '__wdReloading', '_arenaHistoryLoaded',
    '_arenaLastBgPoll', '_arenaLastPoll', '_arenaNotified', '_atkEnergy',
    '_atkHoldUntil', '_atkPressAt', '_backpedaling', '_blocked',
    '_btnHarvest', '_chatBySelfTap', '_clanPaintColor', '_clanPainting',
    '_customDungeonTerrain', '_deskPressBash', '_deskPressLock',
    '_discGhost', '_discRect', '_discRectAt', '_dtScale', '_fbLastFilter',
    '_frameCount', '_frameMs', '_friends', '_gambleWager', '_harvestKeys',
    '_hasSled', '_hitStop', '_hudPopups', '_kaConfirmed', '_lJoyHeld',
    '_lJoyLiveUntil', '_lJoyPreviewUntil', '_lJoyShown', '_lastBroadcastBa',
    '_lastBroadcastBlocking', '_lastBroadcastDead', '_lastBroadcastEx',
    '_lastBroadcastFacing', '_lastBroadcastGear', '_lastBroadcastX',
    '_lastBroadcastY', '_lastBroadcastZone', '_lastExBroadcast',
    '_lastGatherNodeAt', '_lastGatherNodeId', '_lastMoveBroadcast',
    '_lastStatsUpdateSig', '_lastTrack', '_lbLastTab', '_lbServerData',
    '_mcEarly', '_mcTeachAt', '_mcTeachN', '_mktLastRefresh',
    '_mouseAimAngle', '_mouseScreen', '_mouseWorldX', '_mouseWorldY',
    '_nearHouse', '_nearNode', '_nearNpc', '_nearPetHouse',
    '_nearWheelBuilding', '_nearWheelDoor', '_nearWorkshop', '_perf',
    '_petPrevPX', '_petPrevPY', '_playerCount', '_playtimeTick',
    '_preDungeonMap', '_preDungeonMonsters', '_preDungeonNodes', '_proxNode',
    '_pvpThreatCdUntil', '_rBtnLiveUntil', '_rBtnPressUntil', '_rBtnShown',
    '_rJoyLiveUntil', '_raft', '_railCss', '_railCssAt', '_restPending',
    '_resumeSpot', '_shieldAimMouse', '_shieldCdUntil', '_sleeping',
    '_slideVx', '_slideVy', '_smithyTab', '_snowballCd', '_staleTouches',
    '_statsSavedJson', '_tapActs', '_tapEmptySeq', '_tourStarted',
    '_trailTimer', '_tutorialDoneAt', '_tutorialStep', '_userCycledSlot',
    '_warTarget', '_warTargetData', '_warZone', '_wasMovingBcast',
    '_weaponSwapFlash', '_windows', '_wwType', '_xpBarLastGainTs', 'blocked',
    'bodySize', 'collectibles', 'friends', 'lastBroadcast', 'myBroData',
    'nearBuilding', 'trail'],
  wire: ['_arenaStakeBoard', '_authRejects', '_capeStatusLine',
    '_characterReset', '_currentRoom', '_dungeonEnteredAt', '_evErrLogged',
    '_frozenByAdmin', '_gambleResult', '_hardenedWoodSeen', '_httpToken',
    '_jackpotPool', '_jackpotTickets', '_joinId', '_joinKey',
    '_joinRejectedFatal', '_joinedId', '_keyFellBack', '_keyIdAsked',
    '_keyNewAt', '_lastAbilityReject', '_lastArrowBoom', '_lastGhostSweep',
    '_lastReportAck', '_levelShownBaselined', '_manaFlat', '_nodeResyncT',
    '_pendingZoneNodes', '_pvpSrvHits', '_realtimeStatus', '_resetRefused',
    '_serverCaps', '_serverGatherNodes', '_serverLoot', '_staggerUntil',
    '_stunEnd', '_t2LocalEnd', '_tabClaim', '_tabKey', '_tabKeyOld',
    '_tabMoved', '_tooFarAt', '_verifyToken', '_xpBuff', '_xpBuffMul',
    'channel'],
  world: ['_bodyPlaceDue', '_bodyPlacedAt', '_diveAir', '_diveStarted',
    '_dungeonClear', '_dungeonComplete', '_echoActive', '_enteredFromDir',
    '_enteredFromExit', '_enteredFromHub', '_hubExitDisarm',
    '_inCustomDungeon', '_inDungeon', '_lastDrownTick', '_mapPins',
    '_nmlAskAgain', '_nmlAsked', '_nmlAskedAt', '_nmlConfiscatedAt',
    '_nmlLevel', '_nmlLockAskAt', '_nmlLocks', '_nmlSelf', '_spawnAskedAt',
    '_spawnSince', '_spawnToWheel', '_swimming', '_tideLevel', '_veils',
    '_wheelDoorAskedAt', '_wheelGateHits', '_wheelSpawnInit', '_zoneLockAt',
    '_zoneWarnAt', 'currentZone'],
});
const OWNED_LINE = 441;
/* 8c. the fields that wait for one owner (written from two systems or
   more today), each with what it waits for.  Its count only falls: a row
   leaves when it joins OWNED, and a field is not added to dodge 8. */
const WAITING = Object.freeze({
  _extraction: 'written from skills, social, render and ui: no one owner yet',
  _pose: 'written from townsfolk and audio: no one owner yet',
  stickX: "waiting for one owner: card CT's PR 3 (6542) sends BroTown's joystick writes through stickZones' stickTo and adds both rows pinned to `input`",
  stickY: "waiting for one owner: card CT's PR 3 (6542) sends BroTown's joystick writes through stickZones' stickTo and adds both rows pinned to `input`",
});
const WAITING_LINE = 4;
const RESETS_OUTSIDE_LINE = 26;
if (census) {
  const byName = new Map(census.json.fields.map((f) => [f.name, f]));
  const placed = placeFiles();
  const bad = [];
  const seen = new Set();
  let n = 0;
  for (const [sys, names] of Object.entries(OWNED)) {
    if (!Object.hasOwn(SYSTEMS, sys)) { bad.push(`${sys}: not a system of the map`); continue; }
    for (const name of names) {
      n++;
      if (seen.has(name)) { bad.push(`${name}: in OWNED twice`); continue; }
      seen.add(name);
      const f = byName.get(name);
      if (!f) { bad.push(`S.${name} (${sys}): the census finds no such field (gone from the code: the gatekeeper takes its row off)`); continue; }
      /* the orchestrator's reading (2026-11-23): moving is not forbidden,
         only crossing.  A row whose writers ALL moved to one other system
         (a slice taken out of a big file, finish.md rule 5) is re-pinned
         by hand in that same PR, one line; writers in two systems fail */
      const sites = [...f.sets, ...f.inside, ...(f.throughAName || [])];
      const sysOfAt = (at) => systemOf('src/' + at.split(':')[0], placed) || 'unsorted';
      const out = sites.filter((at) => sysOfAt(at) !== sys);
      if (!out.length) continue;
      const all = new Set(sites.map(sysOfAt));
      if (all.size === 1) bad.push(`S.${name} is ${sys}'s, and every write of it is now ${[...all][0]}'s (${out.join(', ')}): moved, not crossed -- re-pin its row to ${[...all][0]} in OWNED, in this same PR, one line`);
      else bad.push(`S.${name} is ${sys}'s, written from ${[...all].filter((x) => x !== sys).join(', ')} too: ${out.join(', ')} (a second system's writer is refused; give it the owner's door or call)`);
    }
  }
  if (n < OWNED_LINE) bad.unshift(`OWNED holds ${n}, under its line ${OWNED_LINE}: a row is taken off only by the gatekeeper`);
  check(`8: every owned field is written only from its system's files (${n} fields in OWNED, the line ${OWNED_LINE}): a second writer is refused, not recorded`, bad.length === 0, bad);
  /* 8b. the enforced resets outside the wall (the orchestrator's counter,
     2026-11-23, for the scoreboard, PR 6524): the rows whose lifetime
     names an edge and that OWNED does not hold, written from more than one
     system today.  26 at main 0aec6482 (16 of the 42 are in OWNED: the
     14 with one writer file, and _race and _inDuel).  Only
     falls: a row joins OWNED as its writers come into one system. */
  const edgeRows = [];
  for (const rows of ledgers.values()) for (const row of rows) if (row.field !== undefined && row.lifetime !== 'sitting') edgeRows.push(row.field);
  const outside = edgeRows.filter((x) => !seen.has(x));
  check(`8b: the enforced-reset fields outside OWNED at or under the line ${RESETS_OUTSIDE_LINE} (${outside.length} of ${edgeRows.length}; ${edgeRows.length - outside.length} inside)`, outside.length <= RESETS_OUTSIDE_LINE, outside);
  if (outside.length < RESETS_OUTSIDE_LINE) info(`(room: ${RESETS_OUTSIDE_LINE - outside.length} under the line ${RESETS_OUTSIDE_LINE}: the gatekeeper lowers it)`);
  const waiting = Object.keys(WAITING);
  const both = waiting.filter((x) => seen.has(x));
  check(`8c: the fields waiting for one owner at or under the line ${WAITING_LINE} (${waiting.length}: ${waiting.join(', ')}), none of them in OWNED`, waiting.length <= WAITING_LINE && !both.length, both.map((x) => `S.${x} is in OWNED and WAITING: take it off WAITING (and lower WAITING_LINE)`));
} else {
  info('8: not checked: the page carries no writers (only where the script cannot load)');
}
console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
