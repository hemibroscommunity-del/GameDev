# Card CK: the checks' cost (finish line 9: working here stays cheap and checked)

**Purpose:** a push costs minutes, not a quarter of an hour, and no check is
dropped: each runs where it is paid for once.

**Measured 2026-11-23** (`docs/plan/census/shape-cost.md`): the server suite
takes 979 s on a session's box and 1,258 s on GitHub's (it took 69 s on
2026-10-17); `switches-thrown` is 894 s of it, `claims-gain` 235 s, the two
asset guards 30 s; every push pays the whole suite; 37% of commits are
bookkeeping, each a push.

**Tags:** 6420 to 6439, one a PR, in order.
**Model and effort:** the strong model, high.
**Read:** `CLAUDE.md`; `docs/plan/finish.md` parts 5 and 6 (they bind you);
`shape-cost.md`; the headers of `tools/guards/switches-thrown.test.mjs` and
`server/test/run.mjs`; `docs/plan/cards/RR.md` line 3 (the caps RR set).
**You hold:** `tools/guards/switches-thrown.test.mjs` and
`tools/guards/lib/thrown.mjs`, `server/test/run.mjs`,
`tools/guards/asset-door.test.mjs`, `asset-sources.test.mjs`,
`tools/dev/precheck.mjs`, `tools/dev/gatekeeper.mjs`,
`tools/dev/session-brief.mjs`, `CLAUDE.md` (section 6's one stale line),
`docs/plan/README.md` (one rule).
**Not yours:** `server/test/claims-gain.test.mjs` (card BK's), anything under
`.github/` (the owner's own words: see PR 5).
**Browser:** none.

## PRs, in order

1. **(6420) `switches-thrown` throws on a PR only what the PR can break.**
   Today it throws every switch born since tag 5301 (89 rows, 2,418 suite
   runs) on every push. On a PR: the switches whose row, or whose system's
   files, the branch changed against `main`; with nothing of theirs changed,
   a fixed few chosen by the commit, so every switch is still thrown over
   time. The whole set runs once a sitting, in the gatekeeper's rehearsal
   (`gatekeeper.mjs` calls it; its result is on the list).
   - Find out what GitHub's runner can know of "changed against `main`" (the
     checkout may hold one commit); where it cannot tell, the few.
   - Done when: the whole suite on a branch of documents runs under 120 s on
     a session's box; a branch that breaks a switch's off path it touches
     goes red on its own PR (plant one); a branch that breaks a switch it did
     not touch goes red at the rehearsal (plant one). Say all three numbers
     in the PR.
2. **(6421) The asset guards do not hash what git already hashed.** They
   hash 3,488 files on every run. Use git's own ids for a file's content
   (the index has them) and hash only what changed since `shipped.json`.
   Done when both run under 3 s and a changed picture with the same size
   still fails (plant one).
3. **(6422) One parse of the big files for the suites that read them**, if
   it is simple: a parse kept by the file's git id (`phase-table` 19.7 s,
   `picture-door` and `ladder-passes` about 20 s each; 114 suites read the
   same three files). Skip it, and say so, if it needs more than a day.
4. **(6423) The bookkeeping.** `session-brief.mjs` leaves out the blocks
   that are all merged (the table is 80% of the brief). `CLAUDE.md` section
   6 says the suite's true time and "run a suite by its name while you
   work; the whole suite once before a push". `docs/plan/README.md`: the
   status file rides the work's commit; never a status-only push to an open
   PR. `SLOW_FIRST` in `run.mjs` made true. `precheck`'s and the
   gatekeeper's caps set from the new times.
5. **(no tag: for the owner's words)** Write in your status file's Needs,
   exactly, the two changes under `.github/` and what each saves: an older
   run cancelled when a newer push arrives; the required `test` job ending
   green at its first step when only `docs/` changed (not a path filter on
   the trigger: TRAPS 238). You do not make them. If the owner says yes in
   their own words to the orchestrator, the orchestrator tells you, quoting
   them, and it is PR 5 (6424).

## Readings chosen for you

- Never drop, skip or weaken a check to save time: move it to where it is
  paid once, and prove with a plant that it still catches there.
- `run.mjs` is under `server/test/`: its merge deploys the worker. One PR
  of yours touches it, not three.
- A number in a PR's words is measured here, with the command.
