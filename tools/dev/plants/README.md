# The shape review's plants (v2.3.6400)

The faults the reviewers of 2026-11-23 planted to see whether a guard
catches them (`docs/plan/census/shape-review.md`). Kept so the cards that
mend the guards (DG, BK, PH) can run them again: a mended guard turns its
plants RED. They change files while they run and put each back; run them
in a clean tree, one at a time, never during another test run.

| File | What it does | Run |
|---|---|---|
| `batch.mjs` | plants each line of a list, runs the named suites alone, prints RED or GREEN, restores the file | `cd server && node ../tools/dev/plants/batch.mjs ../tools/dev/plants/plants1.json` |
| `plants1.json` to `plants6.json` | the lists: the value doors (1), the sums and the lists (2), the hit door and the hostile suite's reach (3), a double pay and the action door (4), the relay (5), sitting 59's holds and the mend's own (6; v2.3.6446: 35, all red) | with `batch.mjs` |
| `judge.mjs` | what the wire door lets in for a field its row names | `cd server && node ../tools/dev/plants/judge.mjs` |
| `reach.mjs` | which named fields the hostile suite's run ever read (after `plants3.json`'s REACH plant wrote `/tmp/wire-reads.json`) | `cd server && node ../tools/dev/plants/reach.mjs /tmp/wire-reads.json` |
| `govsim.mjs` | the governor on a phone whose heat follows the work done, not the clock | `node tools/dev/plants/govsim.mjs .` |
| `probe-freeswing.mjs` | the sword's liar whose join says `fs: 1` | `cd server && node ../tools/dev/plants/probe-freeswing.mjs` |

On 2026-11-23, `main` 0aec6482: all 8 control plants (the obvious spelling)
went red; of 47 realistic plants on the doors, 44 stayed GREEN.
