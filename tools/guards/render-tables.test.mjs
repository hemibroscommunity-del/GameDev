/* ═══ v2.3.5344: THE RENDERERS' TABLES, COUNTED (grand plan step 5.5, card M PR 5) ═══
 *
 * The two renderers (entityRenderer.js, effectsRenderer.js) hold hand-tuned
 * tables (BODY_DIR_SCALE, BODY_ROWS, REST_ANG, NECK_ROWS, ...) that card M
 * moves out as leaf files with no imports, one renderer a PR (tags 5345,
 * 5346).  This guard holds the count while they go:
 *
 *   1. THE TABLES (a census, rule 3: it only falls; the gatekeeper alone
 *      makes it strict): the tables in the two files, by the rules pinned in
 *      lib/renderTables.mjs (a top-level `const` of literals only; one the
 *      code writes into, or hands on, is listed apart and never counted).
 *      A table that leaves lowers it; a new one fails.
 *   2. THE RULES, on a fixture: a literal table counts, a table naming a
 *      table counts, a call or a stray name does not, a table written into
 *      or handed on is apart (a local of the same name is not its write), a
 *      lone constant is marked tuned by its name's words.
 *   3. THE CENSUS (docs/plan/census/M-tables.md) is what --write makes from
 *      the same scan, but for its line numbers (a line moved elsewhere in a
 *      renderer must not fail every PR): the same names in each list.
 *
 * BREAK PROOF (rule 8), each tried by hand once, 2026-11-17:
 *   - a `const _ZZ = { a: 1 };` added to effectsRenderer.js
 *                                  -> FAIL 1 (55 tables, the line 54) and 3
 *   - lib/renderTables.mjs's literalOnly made to take any name
 *     (`case 'Identifier': return true;`)
 *                                  -> FAIL 2 (the stray name counted)
 *   - the write scan's `.push()` taken off MUTATORS
 *                                  -> FAIL 2 (the pushed table counted),
 *                                     1 (56) and 3
 *
 * Run from the repository's root:
 *   node tools/guards/render-tables.test.mjs           the checks
 *   node tools/guards/render-tables.test.mjs --write   write the census page
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanRenderers, scanText, suitesNaming, tunedName, ROOT } from './lib/renderTables.mjs';

/* the tables: only falls */
const TABLES_LINE = 54;   /* its first count, v2.3.5344 (main 17f749b): 30 in entityRenderer.js, 24 in effectsRenderer.js */

const CENSUS = 'docs/plan/census/M-tables.md';

const scan = await scanRenderers();

if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, CENSUS), censusPage(scan));
  console.log(`wrote ${CENSUS}: ${scan.tables.length} tables, ${scan.lone.filter((r) => r.tuned).length} tuned of ${scan.lone.length} lone constants`);
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* 1. the tables only fall */
{
  const n = scan.tables.length;
  check(`1: tables in the two renderers: ${n}, the line ${TABLES_LINE} (it only falls: a table moves to src/rendering/tables/)`, n <= TABLES_LINE,
    scan.tables.slice(-6).map((t) => `${t.file.split('/').pop()}:${t.line} ${t.name}`));
  if (n < TABLES_LINE) console.log(`     (room: ${n} under the line ${TABLES_LINE}; the gatekeeper may lower it)`);
}

/* 2. the rules, on a fixture */
{
  const fx = [
    'import { far } from "./x.js";',
    'const A = { a: 1, b: -2, c: "s", d: [true, null], e: -Math.PI / 4 };',   /* a table */
    'const B = [A, { ...A }];',                                               /* names a table: a table */
    'const C = { f: far };',                                                  /* a stray name: not */
    'const D = { g: Math.round(2) };',                                        /* a call: not */
    'const E = [];',                                                          /* pushed below: apart */
    'const F = { h: 1 };',                                                    /* handed on: apart */
    'const G = { i: 1 };',                                                    /* a local G is written, not this one */
    'const H = Object.freeze({ j: 1 });',                                     /* frozen: apart */
    'const BAR_W = 72, BAR_MS = 300, NAME = "x";',                            /* lone: tuned, not, not */
    'let K = { k: 1 };',                                                      /* a let: not a table */
    'function f() { E.push(1); keep(F); const G = {}; G.i = 2; return A.a + G.i; }',
  ].join('\n');
  const r = scanText(fx, 'fixture.js');
  const names = (k) => r[k].map((x) => x.name).join();
  const lone = Object.fromEntries(r.lone.map((x) => [x.name, x.tuned]));
  check('2: the rules: literals and a table\'s name count; a call or a stray name does not; written, handed and frozen apart; lone constants by their words',
    names('tables') === 'A,B,G' && names('written') === 'E' && names('handed') === 'F' && names('frozen') === 'H'
    && lone.BAR_W === true && lone.BAR_MS === false && lone.NAME === false && tunedName('BODY_DIR_SCALE') && !tunedName('PEER_CHOP_REACH'),
    { tables: names('tables'), written: names('written'), handed: names('handed'), frozen: names('frozen'), lone });
}

/* 3. the census page holds the scan's names */
{
  let page = '';
  try { page = readFileSync(join(ROOT, CENSUS), 'utf8'); } catch { /* missing: fails below */ }
  const strip = (s) => s.replace(/\| \d+ (?=\|)/g, '| L ').replace(/:\d+\b/g, ':L').replace(/line \d+/g, 'line L');
  check(`3: ${CENSUS} is the scan's (but for line numbers): \`node tools/guards/render-tables.test.mjs --write\``,
    page !== '' && strip(page) === strip(censusPage(scan)), page === '' ? 'missing' : 'differs');
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);

/* ── the census page ── */
function censusPage(s) {
  const short = (f) => f.split('/').pop();
  const all = [...s.tables, ...s.written, ...s.handed, ...s.frozen, ...s.lone];
  const suites = suitesNaming(all.map((r) => r.name));
  const su = (n) => (suites.get(n) || []).map((x) => x.replace(/^server\/test\/|^tools\/guards\//, '').replace(/\.test\.mjs$/, '')).join(', ') || '-';
  const tuned = s.lone.filter((r) => r.tuned);
  const L = [];
  L.push('# Card M: the renderers\' tables, counted (v2.3.5344)');
  L.push('');
  L.push('Made by `node tools/guards/render-tables.test.mjs --write` from');
  L.push('`tools/guards/lib/renderTables.mjs`, the one reader of the two renderers\'');
  L.push('top level (its header pins the rules). Never edited by hand: the guard');
  L.push('fails a page that is not the scan\'s (line numbers aside). The tables line');
  L.push('(`TABLES_LINE`) only falls; the gatekeeper lowers it.');
  L.push('');
  L.push('## The count');
  L.push('');
  const per = (f, k) => s[k].filter((r) => short(r.file) === f).length;
  L.push('| | entityRenderer.js | effectsRenderer.js |');
  L.push('|---|---|---|');
  for (const [k, what] of [['tables', 'tables (counted)'], ['written', 'written into (apart)'], ['handed', 'handed on (apart)'], ['frozen', 'frozen (a call: apart)']]) {
    L.push(`| ${what} | ${per('entityRenderer.js', k)} | ${per('effectsRenderer.js', k)} |`);
  }
  const lone = (f, t) => s.lone.filter((r) => short(r.file) === f && (t === undefined || r.tuned === t)).length;
  L.push(`| lone constants | ${lone('entityRenderer.js')} | ${lone('effectsRenderer.js')} |`);
  L.push(`| ...tuned (leave with the tables) | ${lone('entityRenderer.js', true)} | ${lone('effectsRenderer.js', true)} |`);
  const named = new Set([...s.tables, ...tuned].flatMap((r) => suites.get(r.name) || []));
  L.push('');
  L.push(`Suites that name a counted table or a tuned constant by its text: ${named.size} (${[...named].sort().map((x) => '`' + x.split('/').pop().replace(/\.test\.mjs$/, '') + '`').join(', ')}). They move with the two table PRs (the owner's review, 2026-11-17).`);
  L.push('');
  L.push('## The systems, and their order (largest first)');
  L.push('');
  L.push('A counted table\'s system is read by hand from what it draws');
  L.push('(`TABLE_SYSTEM` in the lib). The tables leave in two PRs, one a renderer');
  L.push('(tag 5345 entityRenderer.js, 5346 effectsRenderer.js); in each, the');
  L.push('systems go in this order, a system\'s tables together.');
  L.push('');
  L.push('| renderer | system | tables | their lines |');
  L.push('|---|---|---|---|');
  for (const f of ['entityRenderer.js', 'effectsRenderer.js']) {
    const by = new Map();
    for (const r of s.tables.filter((t) => short(t.file) === f)) {
      const e = by.get(r.system) || { n: 0, lines: 0 };
      e.n++; e.lines += r.lines; by.set(r.system, e);
    }
    for (const [sys, e] of [...by].sort((a, b) => b[1].lines - a[1].lines || b[1].n - a[1].n || a[0].localeCompare(b[0]))) L.push(`| ${f} | ${sys} | ${e.n} | ${e.lines} |`);
  }
  L.push('');
  L.push('## 1. The tables (counted)');
  L.push('');
  L.push('| name | file | line | lines | system | names tables | suites that read it |');
  L.push('|---|---|---|---|---|---|---|');
  for (const r of s.tables) L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | ${r.lines} | ${r.system}${r.byHand ? '' : ' (by its words)'} | ${(r.names || []).join(', ') || '-'} | ${su(r.name)} |`);
  L.push('');
  L.push('## 2. The tuned lone constants (a scale, an offset or an anchor of the art)');
  L.push('');
  L.push('Marked by the name\'s words (`TUNED_WORDS`, none of `UNTUNED_WORDS`). They');
  L.push('leave with their renderer\'s tables.');
  L.push('');
  L.push('| name | file | line | suites that read it |');
  L.push('|---|---|---|---|');
  for (const r of tuned) L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | ${su(r.name)} |`);
  L.push('');
  L.push('## 3. The other lone constants (stay)');
  L.push('');
  for (const f of ['entityRenderer.js', 'effectsRenderer.js']) {
    L.push(`- ${f}: ${s.lone.filter((r) => short(r.file) === f && !r.tuned).map((r) => `\`${r.name}\`:${r.line}`).join(', ')}`);
  }
  L.push('');
  L.push('## 4. Apart: not counted, they stay');
  L.push('');
  L.push('A table the code writes into, or hands on (aliased, an argument, an');
  L.push('element of a literal, returned: it may be written where it goes), and a');
  L.push('literal wrapped in `Object.freeze` (a call).');
  L.push('');
  L.push('| name | file | line | why | suites that read it |');
  L.push('|---|---|---|---|---|');
  for (const r of s.written) L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | written: ${r.how} | ${su(r.name)} |`);
  for (const r of s.handed) L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | handed on: ${r.how} | ${su(r.name)} |`);
  for (const r of s.frozen) L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | frozen | ${su(r.name)} |`);
  L.push('');
  return L.join('\n');
}
