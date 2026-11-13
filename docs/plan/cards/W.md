# Card W: wave 0, the rails (step 8.0)

**Starts:** first. The other day-one cards may start beside it; nothing
else starts until W and S are merged.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; part 11; `docs/plan/README.md`.
**Tags:** 5021 to 5024, one a PR, in the order below.
**Browser:** light (one `questline` run for PR 4).

## PRs, in order

1. **(v2.3.5021) A scenario is found by its file.**
   - Files: `tools/qa/mp/run.mjs`, `tools/dev/precheck.mjs` (its `old-map`
     check only).
   - `run.mjs`: a name that is not in `SCENARIOS` is looked up as
     `./mp-<name>.mjs`. The table stays as it is; a NEW scenario needs no
     line. Precheck's `old-map` check reads the files, not the table.
   - Done when a scratch `mp-zzz.mjs` with no line runs by name, and the
     `old-map` check still refuses a scenario that names no world.
2. **(v2.3.5022) Guards and checks in files of their own.**
   - Files: new `tools/guards/` (with a README and one example guard),
     `server/test/run.mjs`, new `tools/dev/checks/`, `tools/dev/precheck.mjs`.
   - `server/test/run.mjs` also runs `tools/guards/*.test.mjs`. Precheck
     loads `tools/dev/checks/*.mjs` by file name. Existing checks stay
     where they are.
   - This PR touches `server/test/`, so its merge deploys the worker once.
   - Done when a guard file and a check file, each added with no other
     edit, run.
3. **(v2.3.5023) Tags, status, the scoreboard.**
   - Files: new `tools/dev/tag-blocks.json`, `tools/dev/session-brief.mjs`,
     new `tools/dev/scoreboard.mjs`.
   - `tag-blocks.json`: a card's letter to its first and last number, as
     bare numbers (written `v2.3.N`, the tag check reads each as used). It
     starts with day one's blocks as the cards give them, then blocks of
     twenty from 5060. The brief prints the table in place of one
     suggested tag.
   - `scoreboard.mjs` prints part 3's table. A row with no counter yet
     prints "not measured"; it never guesses.
   - Done when the brief shows the blocks and the scoreboard runs clean.
4. **(v2.3.5024) The gatekeeper's script, the baseline, the house rules.**
   - Files: new `tools/dev/gatekeeper.mjs`, new `docs/plan/baseline.md`,
     `CLAUDE.md`.
   - `gatekeeper.mjs`, given branch names in order: a scratch worktree from
     `origin/main`, merge each, then `node tools/dev/precheck.mjs`,
     `npm run build`, `node tools/qa/mp/run.mjs questline`; it prints each
     command's result and the merged tree's hash. It merges nothing for
     real.
   - `baseline.md`: the commit, and the test box's own numbers at it
     (`membudget`, and a sample of `mp-heldsweep`). Never the Cloudflare
     lab: CLAUDE.md forbids it from a branch.
   - `CLAUDE.md`: §3 (tags come from the card or the blocks file), §6 and
     §8 (a new scenario needs no line in `run.mjs`), §4 (a PR merges from
     the gatekeeper's list). Lines changed, none added beyond these.
   - Done when two scratch branches that each add a scenario, a guard and
     a check merge clean in both orders, precheck and `npm test` green.

## Readings chosen for you

- "Merge clean" means no git conflict AND precheck and `npm test` green.
- A new cap and a new live flag still meet on one line (TRAPS §333 pins a
  cap's place). Curing that changes server code and is NOT wave 0: rule 3
  of part 11 covers it (the gatekeeper merges such PRs one after another).
- The baseline's sweep is a sample (the owner's rule, CLAUDE.md §6). Offer
  the full run in the PR's words.

## Not yours

`docs/SHAPES.md` (S); the system map and the four lines (B); any game code.
