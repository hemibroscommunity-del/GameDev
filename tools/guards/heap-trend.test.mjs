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
 *   tools/qa/mp/memory-budget.mjs: heap `mb: 40.5`         -> FAIL 8
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HEADING, HEAP_LINE, RISE_MB, addRow, lastTrim, middleOf, parseRows, prsIn, say, unfallenTrims, verdict } from '../dev/heap-trend.mjs';

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
/* v2.3.6506 (sitting 59: a `trim` row was never checked to fall) */
ok('2 every later row marked trim fell below the row before it (a base reset only by a real trim)', unfallenTrims(rows).length === 0, unfallenTrims(rows).map((r) => r.sitting));
ok('2 ...a row marked trim at a heap that rose is caught', unfallenTrims([row('start', 38.5, true), row('58', 39.0), row('59', 39.2, true)]).map((r) => r.sitting).join() === '59'
  && unfallenTrims([row('start', 38.5, true), row('58', 39.0), row('59', 39.0, true)]).length === 1 && unfallenTrims([row('start', 38.5, true), row('58', 39.0), row('59', 38.9, true)]).length === 0);
ok('2 ...and `--trim` at a heap that did not fall is refused (not marked, said), at one that fell kept',
  verdict([row('start', 38.5, true), row('58', 39.0)], 39.0, true).trim === false && verdict([row('start', 38.5, true), row('58', 39.0)], 39.0, true).trimRefused === true
  && /--trim REFUSED/.test(say(verdict([row('start', 38.5, true), row('58', 39.0)], 39.0, true), 39.0, []))
  && verdict([row('start', 38.5, true), row('58', 39.0)], 38.9, true).trim === true && verdict([row('start', 38.5, true), row('58', 39.0)], 38.9, false).trim === false);

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

/* 10. v2.3.6506 (sitting 59 raised the heap line INSIDE mp-membudget's judge, and 8 read only the table): the
   judge itself, memory-budget.mjs judgeLines, driven with stops of known reads */
const { judgeLines } = await import(REPO + 'tools/qa/mp/memory-budget.mjs');
const readers = Object.fromEntries(Object.keys(MEMORY_BUDGET).map((k) => [k, (st) => st[k]]));
const stopsAt = (over) => [{ label: 'home' }, { label: 'fight' }].map((st, i) => ({ ...st, ...Object.fromEntries(Object.keys(MEMORY_BUDGET).map((k) => [k, i === 1 ? +(MEMORY_BUDGET[k].mb + (over[k] || 0)).toFixed(1) : 1])) }));
const atLines = judgeLines(stopsAt({}), readers);
ok('10 the judge: every line read AT its line is green, its peak the fight stop', atLines.rows.length === Object.keys(MEMORY_BUDGET).length && atLines.rows.every((r) => r.ok)
  && atLines.peaks.heap.at === 'fight' && atLines.peaks.heap.v === MEMORY_BUDGET.heap.mb, atLines.rows.filter((r) => !r.ok).map((r) => r.name));
const bad = Object.keys(MEMORY_BUDGET).filter((k) => { const j = judgeLines(stopsAt({ [k]: 0.1 }), readers); return j.rows.filter((r) => !r.ok).map((r) => r.detail.line).join() !== k; });
ok('10 ...each line read a tenth of a MB over (the heap among them) is red, and only that one', bad.length === 0, bad);
const unreadJ = judgeLines([{ label: 'home', heap: 30 }, { label: 'fight' }], { heap: (st) => st.heap });
ok('10 ...a stop whose reading is missing is red (never judged on the stops that read)', unreadJ.rows.length === 1 && unreadJ.rows[0].ok === false, unreadJ.rows);
const offList = judgeLines([{ label: 'home', nosuch: 1 }], { nosuch: (st) => st.nosuch });
ok('10 ...a reading with no line of its own is red', offList.rows[0].ok === false);

/* 10b. the scenario's side, by its syntax tree (it needs a browser to run): mp-membudget calls judgeLines once,
   with its stops and its READ, and hands each row to `rec.ok` as it is -- nothing between the row and the record */
{
  const { createRequire } = await import('node:module');
  let parser = null;
  for (const pkg of ['package.json', 'server/package.json']) { try { parser = createRequire(REPO + pkg)('@babel/parser'); break; } catch { /* the next */ } }
  const prog = parser ? parser.parse(readFileSync(REPO + 'tools/qa/mp/mp-membudget.mjs', 'utf8'), { sourceType: 'module', plugins: ['topLevelAwait'] }).program : null;
  const all = [];
  const walk = (n) => { if (!n || typeof n.type !== 'string') return; all.push(n); for (const k of Object.keys(n)) { const v = n[k]; if (k === 'loc' || k === 'start' || k === 'end') continue; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } };
  if (prog) walk(prog);
  const calls = all.filter((n) => n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && n.init.type === 'CallExpression'
    && n.init.callee.type === 'Identifier' && n.init.callee.name === 'judgeLines');
  const jn = calls.length === 1 ? calls[0].id.name : null;
  const a = jn ? calls[0].init.arguments : [];
  const argsOk = a.length >= 2 && a[0].type === 'MemberExpression' && a[0].property.name === 'stops' && a[1].type === 'Identifier' && a[1].name === 'READ';
  const passOn = all.filter((n) => n.type === 'ForOfStatement' && n.right.type === 'MemberExpression' && n.right.object.name === jn && n.right.property.name === 'rows').filter((n) => {
    const v = n.left.declarations && n.left.declarations[0].id.name;
    const c = n.body.type === 'ExpressionStatement' ? n.body.expression : null;
    const f = (x, k) => x && x.type === 'MemberExpression' && x.object.name === v && x.property.name === k;
    return c && c.type === 'CallExpression' && c.callee.type === 'MemberExpression' && c.callee.object.name === 'rec' && c.callee.property.name === 'ok'
      && c.arguments.length === 3 && f(c.arguments[0], 'name') && f(c.arguments[1], 'ok') && f(c.arguments[2], 'detail');
  });
  ok('10 ...and mp-membudget calls judgeLines once (its stops, its READ) and hands each row to rec.ok as it is', !!parser && !!jn && argsOk && passOn.length === 1,
    { parser: !!parser, jn, argsOk, passOn: passOn.length });
}

/* 11. v2.3.6506 (sitting 59: the rise taken from `.slice(-1)` of the rows, the middle as `Math.min`, the list's
   line deleted -- all inside the gatekeeper's --heap, green here): THE REAL GATEKEEPER, `--heap`, on a stand-in
   repository (lib/gateSandbox.mjs) whose mp-membudget runs read heaps the test chose.  Its baseline: the start
   (a trim, 38.5) and a row at 39.0; two PRs merged since. */
const { makeSandbox } = await import('./lib/gateSandbox.mjs');
const table = (h) => '# baseline\n\n' + HEADING + '\n\n| sitting | date | main | three reads | middle | mark |\n|---|---|---|---|---|---|\n'
  + `| start | 2026-11-23 | \`${h.start.slice(0, 8)}\` | 38.2, 39.0, 38.5 | 38.5 | trim |\n| 59 | 2026-11-24 | \`${h.mid.slice(0, 8)}\` | 38.9, 39.0, 39.3 | 39.0 |  |\n\n## after\n`;
const sb = makeSandbox({ baseline: table });
try {
  const a = sb.run(['--heap', '--sitting=60'], { heaps: [39.7, 40.1, 39.2] });
  const rowsA = parseRows(sb.baselineText()), lastA = rowsA[rowsA.length - 1];
  ok('11 --heap runs mp-membudget three times on main and adds ONE row: the three reads as read, their MIDDLE (39.7)',
    a.status === 0 && a.steps.filter((x) => x.id === 'membudget').length === 3 && rowsA.length === 3 && lastA.sitting === '60'
      && lastA.reads.join() === '39.7,40.1,39.2' && lastA.middle === 39.7 && lastA.main === sb.hashes.main.slice(0, 8) && !lastA.trim,
    { status: a.status, last: lastA, tail: a.out.split('\n').slice(-5) });
  ok('11 ...the list names the rise FROM THE TRIM (start, 38.5: 1.2 MB, not the 0.7 since the last row) and the two PRs between',
    a.out.includes(`HEAP ROSE 1.2 MB since the last trim (start, ${sb.hashes.start.slice(0, 8)}: 38.5) to 39.7`) && /PRs merged between: #22, #21\./.test(a.out),
    a.out.split('\n').filter((l) => /heap|HEAP/.test(l)));
  const b = sb.run(['--heap', '--sitting=61', '--trim'], { heaps: [40.1, 39.2, 39.7] });
  const rowsB = parseRows(sb.baselineText()), lastB = rowsB[rowsB.length - 1];
  ok('11 ...the middle again where it is read last (39.7); `--trim` at a heap that did not fall: refused, said, not marked',
    b.status === 0 && lastB.sitting === '61' && lastB.middle === 39.7 && !lastB.trim && /--trim REFUSED/.test(b.out) && /HEAP ROSE 1\.2 MB/.test(b.out),
    { last: lastB, out: b.out.split('\n').filter((l) => /heap|HEAP|trim/.test(l)) });
  const c = sb.run(['--heap', '--sitting=62', '--trim'], { heaps: [38.4, 38.0, 38.2] });
  const rowsC = parseRows(sb.baselineText()), lastC = rowsC[rowsC.length - 1];
  ok('11 ...`--trim` where the heap fell (38.2, read in the middle): marked, the new base, within its MB',
    c.status === 0 && lastC.sitting === '62' && lastC.middle === 38.2 && lastC.trim && lastTrim(rowsC).sitting === '62' && /heap 38\.2 MB, -0\.3 since the last trim/.test(c.out) && unfallenTrims(rowsC).length === 0,
    { last: lastC, out: c.out.split('\n').filter((l) => /heap|HEAP|trim/.test(l)) });
  const d = sb.run(['--heap', '--sitting=63'], { heaps: [38.1, null, 38.3] });
  const noSitting = sb.run(['--heap'], { heaps: [38.1, 38.2, 38.3] }), withBranch = sb.run(['--heap', '--sitting=64', 'claude/stand-in'], { heaps: [38.1, 38.2, 38.3] });
  ok('11 ...`--heap` with no `--sitting=`, or with a branch named: the usage, exit 2, nothing run and no row',
    noSitting.status === 2 && noSitting.steps.length === 0 && withBranch.status === 2 && withBranch.steps.length === 0 && parseRows(sb.baselineText()).length === rowsC.length,
    { noSitting: noSitting.status, withBranch: withBranch.status });
  ok('11 ...a run that read no heap: no row, exit 1', d.status === 1 && parseRows(sb.baselineText()).length === rowsC.length && /three heap readings wanted/.test(d.out), { status: d.status });
} finally {
  sb.close();
}

process.exit(failed ? 1 : 0);
