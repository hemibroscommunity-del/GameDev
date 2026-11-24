card: CK
branch: claude/ck-bookkeeping (one PR a branch, claude/ck-*; on #2294's)
prs: #2284 (6420, merged), #2288 (6421, ready), #2294 (6422, ready), this branch's (6423, ready)
state: ready

## Done
- (6420) #2284: switches-thrown throws what a PR touched, a few by the
  commit; `--whole` at the gatekeeper. Docs suite 979 -> 215.5 s.
- (6421) #2288: asset guards trust main's files by git's ids: door 16.5 ->
  0.23 s, sources 13.2 -> 0.07 s.
- (6422) #2294: per-suite mends (the orchestrator's answer): ladder-passes
  20.3 -> 0.25 s, picture-door 7.2 -> 1.2 s; plants red before and after.
- (6423) bookkeeping: SLOW_FIRST from 2026-11-24 (suite 153 s, claims-gain
  128 s first); precheck's rest cap 20 -> 10 min, the gatekeeper's precheck
  70 -> 25 min; CLAUDE.md 6's time; the brief hides all-merged blocks
  (102 -> 96 lines); README's rule already on main (v2.3.6400).

## Next
- PR 5 only on the owner's own words (Needs). Card done otherwise.

## Found
- docs/specs/switch-table.md line 165 ("On every PR only the rows born
  from tag 5301 on run"): stale after 6420 (not this card's file).
- server/test/claims-gain.test.mjs (card BK's): 128-162 s here (header:
  25 s); the suite cannot be under 120 s while it is.
- run.mjs: `npm test -- switches` runs switches-thrown too (not PR 4's).
- switches-thrown (gatekeeper's): never catches a cap advertised whatever
  its reader says (harvestGrade; plain suites do). Fits no PR of CK's.
- tools/guards/phase-table.test.mjs (WL's; #2286, #2282 on it): 7 s, babel
  traverse and GC; a parse kept by git id fits, after those merge.

## Needs
- PR 5 waits on the owner's own words, two changes under `.github/`:
  (a) server-ci.yml: `concurrency: { group: <workflow>-<ref>,
  cancel-in-progress: true }`, so a newer push cancels the older run
  (each push 22 to 43 paid minutes); (b) the required `test` job ends
  green at its first step when the PR changes only `docs/` (a step that
  diffs against main, never a path filter on the trigger: TRAPS 238),
  saving a whole suite run on every documents-only push.
