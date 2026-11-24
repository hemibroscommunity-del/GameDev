/* v2.3.6524 (card WL PR 5): the memory check's lines summed against its
   readings (tools/qa/mp/memory-budget.mjs MEMORY_BUDGET: each row's `mb`,
   the line mp-membudget fails over, and `measured`, the reading written
   beside it: the file's header says "the highest of six runs on main"
   (2026-10-06), and a few rows were read again since).  The readings are
   the file's, by hand, on the test box (finish.md rule 4), never this
   run's, which needs a browser; a CI run's own readings are in its log,
   not on the tree.  The room is the lines' sum less the readings'. */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function memoryLines({ root }) {
  const { MEMORY_BUDGET } = await import(pathToFileURL(join(root, 'tools/qa/mp/memory-budget.mjs')).href);
  const rows = Object.entries(MEMORY_BUDGET || {});
  if (!rows.length) return { say: null, note: 'memory-budget.mjs has no MEMORY_BUDGET' };
  const unread = rows.filter(([, r]) => typeof r.measured !== 'number').map(([k]) => k);
  if (unread.length) return { say: null, note: `${unread.length} of ${rows.length} lines have no reading beside them: ${unread.join(', ')}` };
  const r1 = (x) => Math.round(x * 10) / 10;
  const lines = r1(rows.reduce((s, [, r]) => s + r.mb, 0));
  const read = r1(rows.reduce((s, [, r]) => s + r.measured, 0));
  const most = rows.map(([k, r]) => [k, r1(r.mb - r.measured)]).sort((a, b) => b[1] - a[1]);
  return { say: `${lines} MB of lines, ${read} MB read`, note: `${r1(lines - read)} MB of room over ${rows.length} lines, the most in ${most.slice(0, 2).map(([k, d]) => k + ' ' + d).join(', ')}; the readings: the file's 'measured', by hand on the test box, most from 2026-10-06` };
}
