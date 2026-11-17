/* ═══ v2.3.5781: EVERY CAP THE PAGE READS IS IN CAP_GATES (card U2 PR 2; CLAUDE.md §8 row "a server behaviour") ═══
 *
 * CLAUDE.md §5: "A new cap goes in CAP_GATES (precheck cap-registry)".  That
 * rule ran only on a laptop, in tools/dev/precheck.mjs; the plan's rule 1 says
 * a gate is a test GitHub runs.  This is that test, with precheck's own rule
 * (tools/guards/lib/capGates.mjs: one copy, precheck calls it too):
 *
 *   1. every `_serverCaps.<name>` under src/ is in CAP_GATES
 *      (src/ui/panels/DevPanel.jsx), the list the test panel walks to say
 *      which systems a worker did NOT claim;
 *   2. the scan found the page's caps at all (more than 100: a moved
 *      CAP_GATES or a renamed `_serverCaps` must never read as "nothing to
 *      check, green").
 *
 * The lower-case kill switch half of the row is liveops.test §8e's; the
 * worker's caps literal is caps-audit's.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   DevPanel.jsx: `'charLock', ` taken out of CAP_GATES        -> FAIL 1 (naming charLock and where it is read)
 *   capGates.mjs: `_serverCaps` read as `_serverCapz` in the scan -> FAIL 2
 */
import { capGateRows } from './lib/capGates.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 1500))); }
}

const { rows, gates, used, missing } = capGateRows();
const bad = rows.filter((r) => r.level !== 'PASS');
check(`1. every cap the page reads (${used.size}) is in CAP_GATES (${gates ? gates.size : 0} listed)`,
  !!gates && missing.length === 0 && bad.length === 0, bad.map((r) => r.msg).join('\n'));
check('2. ...and the scan found the page\'s caps (more than 100)', used.size > 100, used.size);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
