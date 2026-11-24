/* v2.3.6524 (card WL PR 5): the switches a run throws (rule 4: all new, or
   exactly one switch thrown), off the table and the guard that throws them
   (tools/guards/switches-thrown.test.mjs, v2.3.6420 card CK).  At the
   rehearsal (tools/dev/gatekeeper.mjs, `--whole`): every worker switch born
   from BORN_FROM on.  On a PR: of those, the ones the branch touches and a
   few its commit picks (FEW_RUNS suite runs), so a PR's number is the
   branch's, not the tree's: the note says how it is chosen.  The older
   worker switches, the `both` ones and every page switch are thrown by no
   run on a PR or at a sitting (`--all` is by hand).  The guard's numbers
   are read off its tree, never by running it (it throws switches). */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { treeOf, constNumber } from './_tree.mjs';

export default async function switchesThrown({ root }) {
  const ast = treeOf(root, 'tools/guards/switches-thrown.test.mjs');
  const born = constNumber(ast, 'BORN_FROM');
  if (born === null) return { say: null, note: 'switches-thrown.test.mjs has no BORN_FROM on this tree' };
  const few = constNumber(ast, 'FEW_RUNS');
  const noPlay = constNumber(ast, 'NO_PLAY_LINE');
  const { SWITCHES } = await import(pathToFileURL(join(root, 'tools/guards/lib/switches.mjs')).href);
  const sw = SWITCHES.filter((r) => r.kind === 'switch');
  const worker = sw.filter((r) => r.side === 'worker');
  const whole = worker.filter((r) => typeof r.born === 'number' && r.born >= born).length;
  const both = sw.filter((r) => r.side === 'both').length;
  const page = sw.filter((r) => r.side === 'page').length;
  return {
    say: `${whole} of ${sw.length} at the rehearsal`,
    note: `the worker's switches born from tag ${born} on, of ${worker.length} worker, ${both} both, ${page} page; on a PR: those of the ${whole} it touches, and a few by its commit` + (few !== null ? ` (${few} suite runs)` : '')
      + `; the page's: thrown by no run` + (noPlay !== null ? ` (${noPlay} with no test that plays them thrown, the line)` : ''),
  };
}
