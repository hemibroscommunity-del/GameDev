#!/usr/bin/env node
/* ═══ v2.3.5023: THE SCOREBOARD (the grand plan's wave 0) ═══
 *
 * docs/GRAND-PLAN.md part 3 is a table: where the game stands on each of the
 * plan's measures, and the line each must reach.  "From wave 0 on, a machine
 * makes this table.  A session never reports its own numbers."  This is that
 * machine:
 *
 *   node tools/dev/scoreboard.mjs            the table, as part 3 prints it
 *   node tools/dev/scoreboard.mjs --json     the same, for a script
 *
 * IT NEVER GUESSES.  A row with no counter prints "not measured".  The
 * plan's own "today" figures were read by hand ("about 3,600 lines"): they
 * are not copied here, because a number nothing counts is a number nobody
 * can hold a line to.  A counter that cannot find what it counts says so in
 * the row and is not given a number either.
 *
 * A ROW GETS ITS COUNTER IN ONE OF TWO WAYS:
 *   - a file `tools/dev/scoreboard/<id>.mjs` whose default export returns
 *     the row's word (a number or a short sentence), or `null` for "not
 *     measured".  It is found by its file name: the session whose step
 *     makes the thing countable adds the file and edits nothing here (the
 *     rails' way: tools/guards/README.md).  It is given { root, read };
 *   - `count` in the row below, for the few that could be counted on the
 *     day this was written.  A file wins over it.
 *
 * It reads the working tree and runs nothing heavy (no browser, no worker,
 * no build): a few file reads.  It exits 1 only when a counter THREW (the
 * row says so), so the gatekeeper sees a broken counter; a row not yet
 * measured is not a failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

/* the debt list's rows marked ours (step 3.1, card H: each row of KNOWN gets
   `whose`: ours, box or browser).  Until every row is marked there is no
   count, only how far the marking has got. */
async function holdFamiliesOurs() {
  const { KNOWN } = await import(pathToFileURL(join(ROOT, 'tools/qa/mp/held-budget.mjs')).href);
  const rows = Object.values(KNOWN);
  const unmarked = rows.filter((r) => !['ours', 'box', 'browser'].includes(r && r.whose)).length;
  if (unmarked) return { say: null, note: `${rows.length} rows on the debt list, ${unmarked} not yet marked ours, the box's or the browser's (step 3.1)` };
  return { say: String(rows.filter((r) => r.whose === 'ours').length) };
}

/* the cases the restart test lists as red on today's code: the entries of
   its KNOWN map (server/test/chaos-restart.test.mjs) */
function restartLossesKnown() {
  const src = read('server/test/chaos-restart.test.mjs');
  const m = /\nconst KNOWN = new Map\(\[\n([\s\S]*?)\n\]\);/.exec(src);
  if (!m) return { say: null, note: 'chaos-restart.test.mjs has no `const KNOWN = new Map([` to count' };
  return { say: String(m[1].split('\n').filter((l) => /^\s*\['[^']+',/.test(l)).length) };
}

/* v2.3.5101 (card B PR 2): the longest function and the largest file, read
   by the four lines' guard's own measure (tools/guards/lib/fourLines.mjs,
   where the rules are pinned: a code line holds a token, comments never
   count; a function counts the functions inside it).  One measure, so the
   scoreboard and the guard can never say two numbers. */
let _fourLines = null;
async function fourLines() {
  if (!_fourLines) {
    const lib = await import(pathToFileURL(join(ROOT, 'tools/guards/lib/fourLines.mjs')).href);
    _fourLines = { m: lib.measureClient(), LINES: lib.LINES };
  }
  return _fourLines;
}
async function longestClientFunction() {
  const { m, LINES } = await fourLines();
  const f = m.functions[0];
  return { say: String(f.lines), note: `code lines: ${f.file.slice(4)} ${f.name}; the line ${LINES.FUNCTION[f.file + '#' + f.name] ?? LINES.OTHER_FUNCTION}` };
}
async function largestFileCodeLines() {
  const { m, LINES } = await fourLines();
  const [f, n] = Object.entries(m.files).sort((a, b) => b[1] - a[1])[0];
  return { say: String(n), note: `${f.slice(4)}; the line ${LINES.FILE[f] ?? LINES.OTHER_FILE}` };
}

/* part 3's rows, in its order, in its words */
const ROWS = [
  { id: 'devices-reporting', measure: 'Devices that report their own smoothness', line: 'every sitting' },
  { id: 'device-choices-by-name', measure: 'Device choices made by a name, outside the profile', line: '0' },
  { id: 'hold-families-ours', measure: 'Hold families on the debt list that are ours to fix', line: '0', count: holdFamiliesOurs },
  { id: 'late-frame-controllers', measure: 'Controllers reading "the frames are late"', line: '1' },
  { id: 'wire-rows', measure: 'Wire rows that say who may start them and what they do', line: 'all, the HTTP routes included' },
  { id: 'bounded-claims', measure: 'Bounded claims, and what a lying phone gains by each', line: 'counted; each gain at most 1.5 times an honest player\'s' },
  { id: 'unexplained-gold', measure: 'Unexplained gold in the whole world\'s sum', line: '0' },
  { id: 'restart-losses-known', measure: 'Losses the restart test knows of', line: '0', count: restartLossesKnown },
  { id: 'restore-covers', measure: 'Records of value a restore covers', line: 'all, by the registry' },
  { id: 'longest-client-function', measure: 'Longest function in the client', line: 'a line that only falls', count: longestClientFunction },
  { id: 'largest-file-code-lines', measure: 'Code lines in the largest file, comments not counted', line: 'a line that only falls', count: largestFileCodeLines },
  { id: 'state-fields-owned', measure: 'State fields with an owner and a lifetime', line: 'all, by system' },
  { id: 'switch-rows', measure: 'Switches with a row (risk, what it needs, fallback or not)', line: 'all' },
  { id: 'art-mb-by-family', measure: 'Art: MB held at the memory check\'s fight, by family', line: 'by machine, each family at its bar' },
  { id: 'file-papers', measure: 'Supplied files with their papers (where from, licence, AI-made)', line: 'all' },
  { id: 'tests-red-on-main', measure: 'Tests red on `main`', line: '0' },
  { id: 'traps-with-break-proof', measure: 'Traps held by a test that has a break proof', line: 'counted, rising' },
];

const NOT = 'not measured';
let threw = 0;
const out = [];
for (const row of ROWS) {
  let say = null, note = '', by = '';
  try {
    const file = join(ROOT, 'tools/dev/scoreboard', row.id + '.mjs');
    if (existsSync(file)) {
      by = 'tools/dev/scoreboard/' + row.id + '.mjs';
      const mod = await import(pathToFileURL(file).href);
      if (typeof mod.default !== 'function') throw new Error('no default export to run');
      const v = await mod.default({ root: ROOT, read });
      if (v && typeof v === 'object') { say = v.say ?? null; note = v.note || ''; } else if (v !== null && v !== undefined) say = String(v);
    } else if (row.count) {
      by = 'scoreboard.mjs';
      const v = await row.count();
      say = v.say ?? null; note = v.note || '';
    }
  } catch (e) {
    threw++; say = null;
    note = 'its counter threw: ' + String(e && e.message || e).slice(0, 160);
  }
  out.push({ id: row.id, measure: row.measure, today: say === null ? NOT : say, measured: say !== null, note, by, line: row.line });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows: out, measured: out.filter((r) => r.measured).length, of: out.length }, null, 2));
} else {
  let commit = '';
  try { commit = (await import('node:child_process')).execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* not a repository */ }
  console.log(`The grand plan's scoreboard (docs/GRAND-PLAN.md part 3)${commit ? ', at ' + commit : ''}\n`);
  console.log('| Measure | Today | The line to reach |');
  console.log('|---|---|---|');
  for (const r of out) console.log(`| ${r.measure} | ${r.today}${r.note ? ' (' + r.note + ')' : ''} | ${r.line} |`);
  const n = out.filter((r) => r.measured).length;
  console.log(`\n${n} of ${out.length} rows measured.  A row is measured once its counter exists: tools/dev/scoreboard/<id>.mjs (the ids: --json).`);
  if (threw) console.log(`${threw} counter(s) THREW: see the row.`);
}
process.exit(threw ? 1 : 0);
