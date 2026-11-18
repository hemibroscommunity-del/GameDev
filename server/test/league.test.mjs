/* ═══ v2.3.6121: THE LEAGUE (GRAND-PLAN 10.7; card LG PR 2) ═══
 *
 * The house's own bots, each rung harder (tools/league/), against every
 * detector the worker has, as frozen at this commit.  Tools only: this
 * suite reads the detectors, and changes none.
 *
 *   1. RUNG 1 IS CAUGHT.  A script on the wire at machine-perfect timing
 *      (tools/league/bots/wire-script.mjs) is the easiest bot there is.  If
 *      every detector misses it, a detector has gone blind: fail.  (Were no
 *      detector ever to catch it, that is a finding for the owner, and this
 *      line becomes a `todo` naming it: card LG's reading.)
 *   2. NO HONEST PLAYER IS FLAGGED OR HELD.  The honest players (until PR 3's
 *      recorded trace, the claims' bench's own: server/test/claimbots.mjs,
 *      an honest harvester, sword and cook) run beside the bots: a flag, or a
 *      claim held, on any of them fails.
 *   3. EVERY BOT PLAYED.  A session that threw, or did nothing a detector
 *      reads, fails: a miss is never an idle bot.
 *
 *   4. v2.3.6122: THE RECORDED HONEST TRACE PASSES AT EVERY SPEED.  A
 *      person-paced play recorded off the real page (tools/league/traces/
 *      honest-harvest.json, bots/page-script.mjs) replayed at 60, 30, 20 and
 *      4 frames a second and through a deploy (replay.mjs): no flag, no claim
 *      held, no step or strike refused, at any of them.
 *
 * Rungs 2-4 (noise; the real page at machine pace; a person's recording
 * played over and over) are SCORED, never held to a line.
 * Rung 2 (the same script with a person's noise) is SCORED, never held to a
 * line: today every detector misses it, and catching it is the detectors'
 * card's (K4), never this suite's.  The scores print every run.
 * The room is the worker's own (score.mjs); about 12 s. */
import { existsSync } from 'node:fs';
import { runLeague, runTraces, TRACES, rungTable, printLeague, caughtBy, DETECTORS } from '../../tools/league/score.mjs';

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};
const todo = (name, why) => console.log('TODO ' + name + '  ' + why);

const rows = await runLeague({ minutes: 10, seed: '' });
check('4 the honest trace is on file (tools/league/traces/honest-harvest.json)', existsSync(TRACES.honest));
rows.push(...(await runTraces({ seed: '' })));
printLeague(rows);

/* 3. every session played */
const traceRows = rows.filter((r) => r.who === 'honest trace');
for (const r of rows) {
  const did = Object.values(r.det.did || {}).reduce((a, b) => a + b, 0);
  check(`3 ${r.who} ${r.kind}: played (no throw, ${did} measured actions)`, !r.err && did > 0, r.err ? r.err.split('\n').slice(0, 3) : r.det.did);
}

/* 1. rung 1 caught by at least one detector */
const t = rungTable(rows);
const r1 = t.find((x) => x.rung === 1);
if (r1.caught.size) check(`1 rung 1 (${r1.name}) is caught: ${[...r1.caught].join(', ')}`, true);
else todo('1 rung 1 is caught', 'FINDING for the owner: every detector (' + DETECTORS.join(', ') + ') misses a script on the wire at machine-perfect timing');

/* 4. the honest trace, at every speed and through the deploy */
check('4 the honest trace ran at 60, 30, 20, 4 fps and through a deploy', traceRows.length === 5, traceRows.map((r) => r.kind));

/* 2. no honest player flagged or held (the trace's rows too: 4) */
for (const r of rows.filter((x) => x.rung === 0)) {
  const by = caughtBy(r.det);
  check(`2 honest ${r.kind}: flagged by none, held by none`, by.length === 0, Object.fromEntries(by.map((d) => [d, r.det[d]])));
  check(`2 honest ${r.kind}: the bench met no refusal`, !(r.refusals && r.refusals.length), r.refusals);
}

/* rungs 2-4: scored, never held */
for (const x of t.filter((y) => y.rung >= 2)) console.log('SCORE ' + x.name + ': ' + (x.caught.size ? 'caught by ' + [...x.caught].join(', ') : 'missed by every detector'));

console.log(failures ? `\n${failures} FAILED` : '\nleague: all passed');
process.exit(failures ? 1 : 0);
