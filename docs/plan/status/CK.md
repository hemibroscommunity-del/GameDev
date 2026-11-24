card: CK
branch: claude/ck-ci-settings (one PR a branch, claude/ck-*; on #2305's)
prs: #2284, #2288, #2294, #2296 (6420-6423, merged), #2305 (6425, ready), this branch's (6424, ready)
state: ready

## Done
- (6420) #2284: switches-thrown throws what a PR touched, a few by the
  commit; `--whole` at the gatekeeper. Docs suite 979 -> 215.5 s.
- (6421) #2288: asset guards by git's ids: 16.5 -> 0.23 s, 13.2 -> 0.07 s.
- (6422) #2294: ladder-passes 20.3 -> 0.25 s, picture-door 7.2 -> 1.2 s.
- (6423) #2296 bookkeeping: SLOW_FIRST from 2026-11-24 (suite 153 s, claims-gain
  128 s first); precheck's rest cap 20 -> 10 min, the gatekeeper's precheck
  70 -> 25 min; CLAUDE.md 6's time; the brief hides all-merged blocks
  (102 -> 96 lines); README's rule already on main (v2.3.6400).
- (6425) #2305: the rest's cap back to 20 min, the gatekeeper's
  precheck step 35 min (the Found below; the orchestrator's yes).

## Next
- (6424) this branch, PR 5: the owner's "Yes to GitHub check settings. Do
  whatever works best." (2026-11-24, the orchestrator's session): a newer
  push cancels a PR's older run; a PR of documents no suite reads ends
  `test` green at its first step. Card done once it merges.

## Found
- Z on #2296: the 10-min rest cap timed out at sitting 57 on a box shared
  with lanes, no suite red. Reading: mend (6425), 10 fit a quiet box only.
- docs/specs/switch-table.md line 165: stale after 6420 (not CK's file).
- server/test/claims-gain.test.mjs (card BK's): 128-162 s here (header:
  25 s); the suite cannot be under 120 s while it is.
- run.mjs: `npm test -- switches` runs switches-thrown too (not PR 4's).
- switches-thrown (gatekeeper's): never catches a cap advertised whatever
  its reader says (harvestGrade; plain suites do). Fits no PR of CK's.
- tools/guards/phase-table.test.mjs (WL's; #2286, #2282 on it): 7 s, babel
  traverse and GC; a parse kept by git id fits, after those merge.

## Needs
- None (call 2 answered: PR 5 is this branch).
