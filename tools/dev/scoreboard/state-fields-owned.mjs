/* v2.3.6524 (card WL PR 5): part 3's row "State fields with an owner and a
   lifetime", counted off what the ledgers and their guard already hold.
   The rules, pinned (the shape review's part 3, item 11; its 186 and 42 of
   641 at main 0aec6482 are these):
     - a FIELD is a ledger row with `field` (src/state/<system>.js; the
       variables, rows with `variable`, are not fields of S);
     - ENFORCED: its lifetime names an edge (anything but 'sitting'): a
       reset that state-ledger check 6 holds at its door;
     - DECIDED: enforced, or its reset says `kept: ` and why (check 7's
       reading of "decided");
     - OWNED: state-ledger check 8's set, read off the guard's tree; a
       second system's writer of these is refused, not recorded;
     - OUTSIDE: the enforced fields OWNED does not hold (check 8b), and
       WAITING the fields waiting for one owner (8c).
   The ledgers are plain data (their guard's rule 1: no imports), so they
   are imported; the guard is read, never run. */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { treeOf, constInit, objectOfLists, objectKeys } from './_tree.mjs';

export default async function stateFieldsOwned({ root }) {
  const dir = join(root, 'src/state');
  const fields = [];
  for (const n of readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
    const mod = await import(pathToFileURL(join(dir, n)).href);
    if (!Array.isArray(mod.ROWS)) continue;            /* phases.js: the phase table, not a ledger */
    for (const row of mod.ROWS) if (row && typeof row.field === 'string') fields.push(row);
  }
  if (!fields.length) return { say: null, note: 'src/state/ holds no ledger rows with a field' };
  const enforced = fields.filter((r) => r.lifetime !== 'sitting');
  const decided = fields.filter((r) => r.lifetime !== 'sitting' || (typeof r.reset === 'string' && /^kept: /.test(r.reset)));
  const say = `${decided.length} decided, ${enforced.length} enforced, of ${fields.length}`;
  const ast = treeOf(root, 'tools/guards/state-ledger.test.mjs');
  const owned = ast && objectOfLists(constInit(ast, 'OWNED'));
  if (!owned) return { say, note: 'OWNED not measured: state-ledger has no OWNED set on this tree (card WL PR 3), or one this cannot read whole (a spread, a key or a value it cannot read): no wall counted' };
  const inOwned = new Set(Object.values(owned).flat());
  const outside = enforced.filter((r) => !inOwned.has(r.field)).length;
  const waiting = objectKeys(constInit(ast, 'WAITING'));
  return { say, note: `${inOwned.size} in OWNED (a second system's writer refused); ${outside} of the ${enforced.length} enforced outside it` + (waiting ? `; ${waiting.length} waiting for one owner` : '') };
}
