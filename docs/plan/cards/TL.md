# Card TL: the checks that lie (step 8.1's tools side)

**Tags:** 6160 to 6179 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Browser:** none. **Never touch:** package.json (card LG holds it), tools/guards/lib/switches.mjs, docs/SWITCHES.md, docs/TRAPS.md, .github/.

## PRs, in order
1. **(tag 6160) Precheck's server-tests cap fits the suite.**
   - Files: `tools/dev/precheck.mjs` only (the `server-tests` spawn near line 849, `timeout: 5 * 60 * 1000`).
   - Fact: on these 4-vCPU boxes the full `cd server && npm test` now takes longer than 5 minutes (one suite, switches-thrown, measured 718 s), so every card's precheck reports a false `server-tests` FAIL as `timeout`.
   - Measure the suite's real wall time here first (write it in the PR body). Then: raise the cap to a value with clear headroom over the measured time, AND make a timeout say so in plain words (a distinct `server-tests` WARN-or-FAIL message "timed out after N s; the suite did not finish", never "exited timeout"), so a slow box is never read as a red test. Keep it a FAIL if a suite actually fails. Tag comment in the code says why.
   - Done when precheck passes on a clean main checkout on this box, and a forced tiny cap (local edit, not committed) prints the new timeout message.
2. **(tag 6161) The listcap check-1 timing race.**
   - Files: `server/test/listcap.test.mjs` (and only if the race is in the code under test, name the server file in your status file and ask before touching it).
   - Fact: on CI, `listcap` check 1 alone goes red now and then and passes on a re-run (a timing race; its card V5 is archived). Find the race (run the suite many times here, e.g. 50 loops, and under load: run it alongside another suite), and make the check wait on the thing it means (an event, a promise, a counted state), never a longer sleep. Never skip, disable or loosen what it checks.
   - This touches `server/test/`, so its merge deploys the worker (that is expected).
   - Done when 50 runs in a row pass here, including under load, and the PR body says what the race was.

## Readings chosen for you
- "Headroom" = at least 1.5x the slowest measured run on this box.
- One system a PR; two PRs.
- When both are open and green, set state `done` after they merge.
