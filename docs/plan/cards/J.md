# Card J: red on `main` to zero (step 8.1)

**Starts:** day one, beside W and S.
**Read:** `CLAUDE.md` (§6); the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; step 8.1; TRAPS §177; `docs/STATE-MACHINES.md`,
"Already red on `main`" (its list is partly stale: three of its tests are
gone).
**Tags:** 5035 to 5039, one a PR.
**Browser:** heavy. One run at a time.

## PRs, in order

1. **(v2.3.5035) The census: `docs/plan/census/red.md`**, with your status
   file. A docs PR.
   - **Ask the owner first, once** (CLAUDE.md §6): the sample now, about
     an hour; or every phone test, about 375 of them at a minute or more
     each, six hours or more. Begin the sample while you wait.
   - **The sample**:
     - `cd server && npm test`;
     - `node tools/world/test-world-core.mjs --check`;
     - `node tools/art/head-bake.mjs --check`;
     - the two that run on every PR: `node tools/qa/mp/run.mjs questline`
       and `membudget`;
     - every phone test STATE-MACHINES lists as red that still exists.
   - A red is run once more, alone (TRAPS §177), before it is written down.
   - **Each row**: the command; the step that fails; whether the TEST is
     wrong or the GAME is; the file.
   - Done when every command above has a verdict.
2. **Then the fixes, one PR a cause** (5036 to 5039).
   - A test that is wrong is fixed. A test for something the game no
     longer does is deleted, its file and its one line in `run.mjs`, with
     the reason in the PR's words and in `red.md`.
   - Never skipped, never switched off.

## Readings chosen for you

- **Your files** are `tools/qa/mp/mp-*.mjs`, and the one line of a deleted
  test in `run.mjs`. Not `harness.mjs`, not the budgets, not
  `mp-bodyworker.mjs` (card H's).
- **When the game is at fault, you do not fix the game.** Write the row,
  with the failing step and the file you suspect, and put it under Found.
  The gatekeeper routes it.
- **A server suite that reads a phone test you changed** may turn red.
  That suite is yours to bring in line, in the same PR; say that its merge
  deploys the worker.
- The three known reds that are not phone tests (the two `--check`
  commands and a `soundcues` check) are yours to judge and list. Fix them
  only if the fault is the test's.

## Not yours

Game code; `harness.mjs`; `run.mjs` beyond a deleted test's line (W).
