/* ═══ v2.3.5102: THE SYSTEM MAP HOLDS (grand plan step 5.2, card B PR 3) ═══
 *
 * The map is tools/guards/lib/systems.mjs; docs/SYSTEMS.md is made from it.
 * This guard holds:
 *
 *   1. every file under src/ and server/src/ is in one system or in
 *      `unsorted`: a file two systems claim fails;
 *   2. `unsorted` only falls (UNSORTED_LINE; rule 3: a census, made strict by
 *      the gatekeeper alone, who also lowers the line);
 *   3. every file the table names by name exists (a renamed or deleted file
 *      leaves a name that would silently claim nothing);
 *   4. every door's file is in its own system, and holds the door's name;
 *   5. every system has a short name (lower case, a hyphen at most), says
 *      what it is, and its traps' words are the census's;
 *   6. docs/SYSTEMS.md is what the table makes.  The page says the table's
 *      RULES, never today's lists: a page that listed every file and test
 *      would go stale with every PR that adds one, anywhere (`--list` prints
 *      the lists).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. add 'gold' to `combat`'s server/src names (gold.js in two)  -> FAIL 1
 *   2. `touch src/game/zzNew.js` (a new file, no system)          -> FAIL 2
 *   3. rename 'farmorders' to 'farmorder' in `skills`              -> FAIL 3 (and 2)
 *   4. a door `{ name: '_goldGive', file: 'server/src/bag.js' }`   -> FAIL 4
 *   6. edit a line of docs/SYSTEMS.md by hand                     -> FAIL 6
 *      (and `touch server/test/zz.test.mjs` leaves 6 green: the page holds
 *      no list a new test changes)
 *
 * Run from the repository's root:
 *   node tools/guards/systems.test.mjs           the checks
 *   node tools/guards/systems.test.mjs --write   write docs/SYSTEMS.md from the table
 *   node tools/guards/systems.test.mjs --list combat   a system's files, suites,
 *                                                 scenarios, specs and traps today
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SYSTEMS, UNSORTED_LINE, ROOT, placeFiles, makePage, trapRows, describe } from './lib/systems.mjs';

const PAGE = join(ROOT, 'docs/SYSTEMS.md');
if (process.argv.includes('--write')) {
  writeFileSync(PAGE, makePage());
  console.log('wrote docs/SYSTEMS.md');
  process.exit(0);
}
const li = process.argv.indexOf('--list');
if (li > 0) {
  const want = process.argv[li + 1];
  const d = describe();
  if (want === 'unsorted') { console.log(d.unsorted.join('\n')); process.exit(0); }
  const s = d.systems.find((x) => x.name === want);
  if (!s) { console.error(`no system "${want}": ${d.systems.map((x) => x.name).join(', ')}, unsorted`); process.exit(2); }
  for (const k of ['files', 'suites', 'scenarios', 'specs', 'traps']) console.log(`${k} (${s[k].length}):\n  ${s[k].join('\n  ')}`);
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const placed = placeFiles();
const names = Object.keys(SYSTEMS);

/* ── 1. one system a file ── */
{
  const n = Object.values(placed.bySystem).reduce((a, x) => a + x.length, 0);
  check(`1: no file in two systems (${n} files in ${names.length} systems)`, placed.twice.length === 0,
    placed.twice.map((t) => `${t.file}: ${t.systems.join(' and ')}`));
}

/* ── 2. unsorted only falls ── */
{
  const n = placed.unsorted.length;
  check(`2: unsorted at or under its line ${UNSORTED_LINE} (${n}): give a new file a system in tools/guards/lib/systems.mjs`, n <= UNSORTED_LINE, placed.unsorted);
  if (n < UNSORTED_LINE) console.log(`     (room: ${n} under the line ${UNSORTED_LINE}; the gatekeeper may lower it)`);
}

/* ── 3. every name in the table is a file ── */
{
  const missing = [];
  for (const [n, s] of Object.entries(SYSTEMS)) {
    for (const r of s.files) {
      if (!r.named) continue;
      for (const b of r.named.names) {
        if (!['js', 'jsx', 'mjs', 'json'].some((e) => existsSync(join(ROOT, r.named.dir, b + '.' + e)))) missing.push(`${n}: ${r.named.dir}/${b}`);
      }
    }
  }
  check('3: every file the table names exists', missing.length === 0, missing);
}

/* ── 4. the doors ── */
{
  const bad = [];
  let n = 0;
  for (const [sys, s] of Object.entries(SYSTEMS)) {
    for (const d of s.doors) {
      n++;
      if (!placed.bySystem[sys].includes(d.file)) { bad.push(`${sys}: ${d.name}'s file ${d.file} is not in ${sys}`); continue; }
      if (!readFileSync(join(ROOT, d.file), 'utf8').includes(d.name)) bad.push(`${sys}: ${d.file} does not hold ${d.name}`);
    }
  }
  check(`4: every door (${n}) is in its system's files and holds its name`, bad.length === 0, bad);
}

/* ── 5. names, words, traps ── */
{
  const bad = names.filter((n) => !/^[a-z]+(?:-[a-z]+)?$/.test(n) || n === 'unsorted' || !SYSTEMS[n].what);
  check('5: every system has a short lower-case name and says what it is', bad.length === 0, bad);
  const vocab = new Set(trapRows().flatMap((t) => t.systems));
  const unknown = names.flatMap((n) => (SYSTEMS[n].traps || []).filter((v) => !vocab.has(v)).map((v) => `${n}: ${v}`));
  check(`5: every system's trap words are the traps census's (${vocab.size} words there)`, vocab.size > 0 && unknown.length === 0, unknown);
}

/* ── 6. the page ── */
{
  const want = makePage();
  const have = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : '';
  check('6: docs/SYSTEMS.md is what the table makes (node tools/guards/systems.test.mjs --write)', have === want,
    have ? 'stale' : 'missing');
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
