/* ═══ v2.3.6504 (card PH PR 5): THE HEAP AS A TREND, HELD ═══
 *
 * What it holds (tools/dev/heap-trend.mjs has the why):
 *   1. a sitting's heap is the MIDDLE of three runs, never one run or a mean;
 *   2. baseline.md's table "The heap at each sitting" reads back, and each
 *      row's middle is its three readings' middle (a row cannot be typed in);
 *   3. a rise of over 1.0 MB is named, 1.0 itself is not;
 *   4. the rise is measured from the last TRIM, never from the last sitting:
 *      0.3 MB a sitting for four sittings is 1.2 MB, and it is named;
 *   5. a trim row resets the base;
 *   6. the PRs between are read from git's merge subjects;
 *   7. a row added by the gatekeeper reads back the same;
 *   8. the heap line (memory-budget.mjs) is at most HEAP_LINE: it stops
 *      being raised to follow main (card PH PR 5);
 *   9. the gatekeeper has its `--heap` mode and reads tools/dev/heap-trend.mjs.
 *
 * Break proofs (tried 2026-11-24, in a scratch copy):
 *   tools/dev/heap-trend.mjs lastTrim: `return rows[rows.length - 1] || null;`
 *     (the rise from the last sitting)                     -> FAIL 4, 6
 *   tools/dev/heap-trend.mjs verdict: `named: rise >= RISE_MB`    -> FAIL 3, 5
 *   tools/qa/mp/memory-budget.mjs: heap `mb: 43.0`         -> FAIL 8 (v2.3.6503: was 40.5 at HEAP_LINE 40.0)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HEADING, HEAP_LINE, RISE_MB, addRow, lastTrim, middleOf, parseRows, prsIn, say, verdict } from '../dev/heap-trend.mjs';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
let failed = 0;
const ok = (name, cond, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
  if (!cond) failed++;
};
const row = (sitting, middle, trim = false) => ({ sitting, date: '2026-11-24', main: 'abcdef0123', reads: [middle - 0.2, middle, middle + 0.3].map((x) => +x.toFixed(1)), middle, trim });

/* 1 */
ok('1 the middle of three', middleOf([38.2, 39.0, 38.5]) === 38.5 && middleOf([40, 30, 35]) === 35);
let threw = false; try { middleOf([38.2, 39.0]); } catch { threw = true; }
ok('1 two readings are refused', threw);

/* 2 */
const md = readFileSync(REPO + 'docs/plan/baseline.md', 'utf8');
const rows = parseRows(md);
ok(`2 baseline.md holds "${HEADING}" with its first row`, md.includes(HEADING) && rows.length >= 1, { rows: rows.length });
const untrue = rows.filter((r) => r.reads.length !== 3 || middleOf(r.reads) !== r.middle);
ok('2 each row\'s middle is its three readings\' middle', untrue.length === 0, untrue.map((r) => r.sitting));
ok('2 the first row is a base (marked trim)', rows.length > 0 && rows[0].trim);

/* 3 */
const start = [row('start', 38.5, true)];
ok(`3 a rise of ${RISE_MB + 0.1} MB is named`, verdict(start, 39.6).named === true, verdict(start, 39.6));
ok(`3 a rise of exactly ${RISE_MB} MB is not`, verdict(start, 39.5).named === false, verdict(start, 39.5));
ok('3 a fall is not', verdict(start, 37.0).named === false);

/* 4 */
const creep = [row('start', 38.5, true), row('58', 38.8), row('59', 39.1), row('60', 39.4)];
const vc = verdict(creep, 39.7);
ok('4 0.3 MB a sitting, four sittings: named from the trim', vc.named === true && vc.base.sitting === 'start' && vc.rise === 1.2, vc);

/* 5 */
const trimmed = [row('start', 38.5, true), row('58', 40.0), row('59', 38.0, true)];
ok('5 the last trim is the base', lastTrim(trimmed).sitting === '59');
ok('5 a rise of 1.0 from the trim is not named', verdict(trimmed, 39.0).named === false, verdict(trimmed, 39.0));
ok('5 a rise of 1.1 from the trim is named', verdict(trimmed, 39.1).named === true, verdict(trimmed, 39.1));

/* 6 */
const subjects = 'Merge pull request #2292 from x/claude/plan-z-sitting-56\nv2.3.6460: something\nMerge pull request #2284 from x/y\nMerge pull request #2292 from x/again';
const prs = prsIn(subjects);
ok('6 the PRs between, once each', JSON.stringify(prs) === '["#2292","#2284"]', prs);
ok('6 the list names them', say(vc, 39.7, prs).includes('#2292, #2284') && say(vc, 39.7, prs).startsWith('HEAP ROSE'));

/* 7 */
const added = parseRows(addRow(md, { sitting: '99', date: '2026-12-01', main: '0123456789ab', reads: [39.1, 39.4, 39.2], middle: 39.2, trim: false }));
const back = added[added.length - 1];
ok('7 a row added reads back', added.length === rows.length + 1 && back.sitting === '99' && back.middle === 39.2 && back.main === '01234567' && !back.trim, back);

/* 8 */
const { MEMORY_BUDGET } = await import(REPO + 'tools/qa/mp/memory-budget.mjs');
ok(`8 the heap line is at most ${HEAP_LINE} MB (it follows the trend, never main)`, MEMORY_BUDGET.heap.mb <= HEAP_LINE, { line: MEMORY_BUDGET.heap.mb });

/* 9 */
const gk = readFileSync(REPO + 'tools/dev/gatekeeper.mjs', 'utf8');
ok('9 the gatekeeper has --heap and reads tools/dev/heap-trend.mjs', gk.includes("'--heap'") && gk.includes("import('./heap-trend.mjs')"));

process.exit(failed ? 1 : 0);
