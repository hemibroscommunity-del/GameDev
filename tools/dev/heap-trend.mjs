/* ═══ v2.3.6504 (card PH PR 5): THE HEAP AS A TREND ═══
 *
 * The memory check's `heap` line (tools/qa/mp/memory-budget.mjs) was raised
 * five times to follow main (33 -> 34 -> ... -> 40.0), each time because
 * main's own code had reached it and every PR failed by the luck of the run.
 * No one change was ever measured: about 1.5 MB came "a little with each of
 * ~400 changes" (that file's v2.3.4483 note).  A line raised to follow main
 * says nothing; a trend does.
 *
 * So the gatekeeper records main's heap at each sitting (`node
 * tools/dev/gatekeeper.mjs --heap --sitting=N`: three mp-membudget runs on
 * origin/main, the middle of the three) as a row of docs/plan/baseline.md's
 * table "The heap at each sitting".  A rise of over RISE_MB since the last
 * TRIM (a row marked `trim`: the sitting after a change that lowered the
 * heap; the table's first row is the start) is named on the gatekeeper's
 * list with the PRs merged between, so the rise has names before it has a
 * line.  The line itself stops being raised (tools/guards/heap-trend.test.mjs
 * holds it at HEAP_LINE).
 *
 * Plain functions, no imports, no side effect on import: the gatekeeper and
 * tools/guards/heap-trend.test.mjs share them (approved outside card PH's
 * files by the orchestrator, 2026-11-24).
 * Measured where the gatekeeper runs: the test box (finish.md part 5, rule 4).
 */

export const RISE_MB = 1.0;
/* the heap line on main when this landed; it may only fall (lower it here
   with a trim, in the same change).  v2.3.6503: 40.0 -> 42.5 with the line, the
   one rise, +2.5 MB by the owner's phone sharpness of 1.5 (decided for the
   owner while away by the orchestrator, 2026-11-24; the reads and the reason
   are in memory-budget.mjs's header); the rule stands from here: it only falls. */
export const HEAP_LINE = 42.5;
export const HEADING = '## The heap at each sitting';

/* the middle of three readings (never their mean: one slow run moves a mean) */
export function middleOf(reads) {
  const v = reads.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length !== 3) throw new Error(`heap-trend: three readings wanted, got ${reads.length} (${v.length} numbers)`);
  return v[1];
}

/* the table's rows, oldest first:
   | sitting | date | main | three reads | middle | mark |            */
export function parseRows(md) {
  const at = md.indexOf(HEADING);
  if (at < 0) return [];
  const rows = [];
  for (const line of md.slice(at).split('\n').slice(1)) {
    if (/^## /.test(line)) break;
    if (!/^\|/.test(line) || /^\|\s*-/.test(line) || /^\|\s*sitting\s*\|/.test(line)) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 6) continue;
    const reads = c[3].split(',').map((s) => Number(s.trim()));
    rows.push({ sitting: c[0], date: c[1], main: c[2].replace(/`/g, ''), reads, middle: Number(c[4]), trim: /\btrim\b/.test(c[5]) });
  }
  return rows;
}

/* the base a rise is measured from: the last trim, else the first row */
export function lastTrim(rows) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].trim) return rows[i];
  return rows[0] || null;
}

/* the verdict on a new reading against the table so far.  v2.3.6506 (the
   sitting-59 mend: a row marked `trim` was never held to have fallen, so a
   `--trim` at a heap that ROSE reset the base and hid the creep): a trim is
   kept only where the middle fell below the row before it (`trimAsked` the
   gatekeeper's --trim); asked and not fallen, the row is not marked and the
   list says so */
export function verdict(rows, middle, trimAsked = false) {
  const base = lastTrim(rows);
  const before = rows.length ? rows[rows.length - 1] : null;
  const trim = !!trimAsked && !!before && middle < before.middle;
  const trimRefused = !!trimAsked && !trim;
  if (!base) return { base: null, rise: 0, named: false, trim: !!trimAsked, trimRefused: false };
  const rise = +(middle - base.middle).toFixed(1);
  return { base, rise, named: rise > RISE_MB, trim, trimRefused, before };
}

/* v2.3.6506: the rows marked `trim` (after the first, the start) whose middle
   did not fall below the row before: a base reset with no trim behind it */
export function unfallenTrims(rows) {
  return rows.filter((r, i) => i > 0 && r.trim && !(r.middle < rows[i - 1].middle));
}

/* the PR numbers in `git log --first-parent --format=%s base..main` */
export function prsIn(subjects) {
  const out = [];
  for (const s of String(subjects).split('\n')) {
    const m = /^Merge pull request #(\d+)\b/.exec(s.trim());
    if (m && !out.includes('#' + m[1])) out.push('#' + m[1]);
  }
  return out;
}

export function rowLine({ sitting, date, main, reads, middle, trim }) {
  return `| ${sitting} | ${date} | \`${String(main).slice(0, 8)}\` | ${reads.join(', ')} | ${middle} | ${trim ? 'trim' : ''} |`;
}

/* the file with one row added at the end of the table */
export function addRow(md, row) {
  const at = md.indexOf(HEADING);
  if (at < 0) throw new Error(`heap-trend: no "${HEADING}" table in baseline.md`);
  const lines = md.split('\n');
  let i = md.slice(0, at).split('\n').length - 1;
  let last = -1;
  for (i += 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    if (/^\|/.test(lines[i])) last = i;
  }
  if (last < 0) throw new Error('heap-trend: the table has no header');
  lines.splice(last + 1, 0, rowLine(row));
  return lines.join('\n');
}

/* the line on the gatekeeper's list */
export function say(v, middle, prs) {
  const refused = v.trimRefused ? `\n--trim REFUSED: ${middle} MB did not fall below the row before (${v.before ? v.before.sitting + ': ' + v.before.middle : 'none'}); the row is not marked trim and the base stays.` : '';
  return _say(v, middle, prs) + refused;
}
function _say(v, middle, prs) {
  if (!v.base) return `heap ${middle} MB: the first row of the trend`;
  const from = `since the last trim (${v.base.sitting}, ${v.base.main.slice(0, 8)}: ${v.base.middle})`;
  if (!v.named) return `heap ${middle} MB, ${v.rise >= 0 ? '+' : ''}${v.rise} ${from}: within ${RISE_MB} MB`;
  return `HEAP ROSE ${v.rise} MB ${from} to ${middle}: over ${RISE_MB} MB. The PRs merged between: `
    + (prs.length ? prs.join(', ') : '(none found: read git log)') + '. A trim is owed; the line is not raised.';
}
