/* ═══ v2.3.5160: THE STATE LEDGER, HELD (grand plan step 5.3, step 1; card U) ═══
 *
 * The ledger (src/state/README.md) is one file a system of card B's map,
 * src/state/<system>.js, with a row for every field of the state `S` and
 * every top-of-file variable of that system, one row a line.  Its rows are
 * made by card D's script (`node tools/dev/state-census.mjs --ledger <system>
 * --write`), never typed.  This guard holds it:
 *
 *   1. every file in src/state/ is the README or a ledger named for a system
 *      of the map; a ledger is plain data (no import, no call, nothing but
 *      `SYSTEM`, `ROWS` and literals), says its own system, and every row
 *      has the README's columns;
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
 *      L's `reset`) are the hand's and are never compared.
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
   Only the gatekeeper lowers it. */
export const UNLISTED_LINE = 2128;

const LIVE = process.argv.includes('--live');
const PAGE_ONLY = process.argv.includes('--page');
const PAGE = 'docs/plan/census/state.md';
const DIR = 'src/state';

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
const str = (x) => typeof x === 'string' && x.length > 0;
function rowFault(row) {
  if (!row || typeof row !== 'object') return 'not an object';
  const isField = row.field !== undefined;
  if (isField ? !str(row.field) || row.variable !== undefined : !str(row.variable) || !str(row.file)) return 'no field, or no variable and its file';
  if (!Object.hasOwn(SYSTEMS, row.system) && row.system !== 'unsorted') return 'system';
  if (!str(row.lifetime)) return 'lifetime';
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
  const stray = names.filter((n) => n !== 'README.md' && !(n.endsWith('.js') && Object.hasOwn(SYSTEMS, n.slice(0, -3))));
  check(`1: every file in ${DIR}/ is the README or a ledger named for a system of the map (${names.length} files)`, stray.length === 0 && names.includes('README.md'), stray.length ? stray : 'no README.md');
  const bad = [];
  for (const n of names) {
    if (n === 'README.md' || stray.includes(n)) continue;
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

console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
