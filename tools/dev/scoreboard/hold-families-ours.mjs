/* v2.3.6524 (card WL PR 5): part 3's row "Hold families on the debt list
   that are ours to fix", with the list's rows by kind.  The debt list is
   tools/qa/mp/held-budget.mjs KNOWN; each row says `whose` (step 3.1, card
   H): ours, box (the test box's slowness) or browser (the browser's own
   work).  Until every row is marked there is no count, only how far the
   marking has got (the rule scoreboard.mjs's first counter kept; this file
   takes its place and adds the kinds). */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const KINDS = ['ours', 'box', 'browser'];

export default async function holdFamiliesOurs({ root }) {
  const { KNOWN } = await import(pathToFileURL(join(root, 'tools/qa/mp/held-budget.mjs')).href);
  const rows = Object.values(KNOWN || {});
  const by = Object.fromEntries(KINDS.map((k) => [k, rows.filter((r) => r && r.whose === k).length]));
  const unmarked = rows.length - KINDS.reduce((s, k) => s + by[k], 0);
  const kinds = `ours ${by.ours}, the box's ${by.box}, the browser's ${by.browser}`;
  if (unmarked) return { say: null, note: `${rows.length} rows on the debt list, ${unmarked} not yet marked (${kinds})` };
  return { say: String(by.ours), note: `of ${rows.length} rows on the debt list: ${kinds}` };
}
