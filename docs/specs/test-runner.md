# Every suite, every failure, in one run (v2.3.3302)

Found by the architecture review (2026-10-17). Tooling only: no game code
changes.

## What was wrong

- **`npm test` was one `&&` chain of 132 suites** (`server/package.json`):
  - one at a time, about 69 s on a 4-core box;
  - it stopped at the first failure. On average that hid half the suites
    behind it, so each run reported one failure, and the next one surfaced
    only after a fix and a whole new run.
- **A suite on disk but not in the chain never ran.** `eventcapes.test.mjs`
  (v2.3.2026) ran in no workflow and no script. It passes.
- **The chain was one line every new suite edited.** Two PRs that each added
  a suite conflicted there. A branch stacked on another failed CI on a file it
  did not have (`&& node test/verify.test.mjs`).
- **Server CI ran only for `server/**`, `src/data/**` and
  `src/game/t1Sync.js`.** The suites import or read 97 files outside
  `server/`, 61 of them outside that list (`src/game/sprint.js`,
  `quietPhone.js`, `wsClient.js`, `gameEvents.js`,
  `public/tools/world/plan.js`, docs). A PR that changed only one of those ran
  no server suite, on the PR or on main.
- **The worker deployed with no test.** `deploy-worker.yml` deployed whatever
  `main` held. Two PRs each green on its own but red together, or one merged
  before its CI finished, went straight to the players.

## What changed

- **`npm test` is `node test/run.mjs`** (`server/test/run.mjs`):
  - it runs every `test/*.test.mjs`, four at a time (fewer on a smaller box,
    `TEST_JOBS` or `--jobs=N` to choose), each in its own process exactly as
    the chain ran it (cwd `server/`, `node <file>`, its exit code the verdict);
  - one line a suite, its time, and for a failure its FAIL lines (or, for a
    crash, the error and stack);
  - at the end, the list of every failed suite, and exit 1 if there is one;
  - the slowest suites start first (`SLOW_FIRST`), so the run does not end on
    one of them alone;
  - Node's notice that `server/package.json` names no module type, printed
    once by every suite, is left out of what it shows.
- **133 suites in about 30 s here** (all green), eventcapes included. A new
  suite needs no line anywhere.
- `npm test -- relay hit-door` runs only the suites whose names match;
  `--verbose` prints every suite's whole output.
- **Server CI runs on every PR and every push to main** (`server-ci.yml`, no
  path list).
- **The deploy waits for the suite** (`deploy-worker.yml`):
  - a `test` job runs `npm ci && npm test` in `server/` on the same commit,
    and `deploy` needs it;
  - a red suite deploys nothing, and production stays on the last good
    version. Once the cause is fixed (or for a flaky check), re-run the
    workflow from the Actions tab.
  - **The deploy job itself is unchanged**: a fresh checkout with no
    `node_modules`, so wrangler-action installs the wrangler it has always
    deployed with (3.90.0 in the last run's log). Running `npm ci` in the
    deploy job would have handed it the project's own wrangler (4.96.0)
    instead, a change of deploy tool nobody asked for and this repo cannot
    test.
- The precheck's `server-tests` step shows the last 30 lines of a failing run,
  which is the failed-suite list and the FAIL lines above it.

## Checked

- The full run: 133 suites, 4 at a time, 28 s, all green; the chain took
  ~69 s.
- Three throwaway suites (one passing, one printing a FAIL line and exiting 1,
  one importing a missing file) are reported as 1 ok and 2 FAILED, the FAIL
  line and the error shown, and exit 1.
- The two suites that time themselves (spawn-scale, wheelzone) have 14x and
  more headroom here when four run side by side.
