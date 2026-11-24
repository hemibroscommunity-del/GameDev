card: CK
branch: claude/ck-one-parse (one PR a branch, claude/ck-*; on #2288's)
prs: #2284 (6420, ready), #2288 (6421, ready; on #2284), this branch's (6422, ready; on #2288)
state: ready

## Done
- (6420) #2284: switches-thrown throws on a PR what it touched and a few
  by the commit; `--whole` once a sitting (the gatekeeper). Docs branch's
  suite 979 -> 215.5 s (claims-gain 162 s, card BK's); plants A, B red.
- (6421) #2288: asset guards trust what is main's by git's ids; in the
  suite door 16.5 -> 0.23 s, sources 13.2 -> 0.07 s; docs suite 164.8 s.
- (6422) the per-suite mends, not one shared parse (the orchestrator's
  answer: the time is not parsing). ladder-passes 20.3 -> 0.25 s (it gave
  the renderer's word, p256.js's 20 s wait); picture-door 7.2 -> 1.2 s
  (`blank()` kept by its text). Each one plant red before and after.

## Next
- PR 4 (6423), the bookkeeping (run.mjs; one PR of mine touches it).

## Found
- docs/specs/switch-table.md line 165 ("On every PR only the rows born
  from tag 5301 on run"): stale after 6420 (not this card's file).
- server/test/claims-gain.test.mjs (card BK's): 162 s alone here
  (`time node test/claims-gain.test.mjs`), its header says about 25 s:
  the whole suite cannot be under 120 s while it is.
- run.mjs: `npm test -- switches` runs switches-thrown too (PR 4's).
- switches-thrown (gatekeeper's): never catches a cap advertised whatever
  its reader says (harvestGrade; plain suites do). Fits no PR of CK's.
- tools/guards/phase-table.test.mjs (card WL's; #2286 open on it, #2282
  adds rows): 7 s, babel's traverse and GC. A parse kept by git id fits
  it: for after #2286 and #2282 have merged.

## Needs
- PR 5 waits on the owner's own words, two changes under `.github/`:
  (a) server-ci.yml: `concurrency: { group: <workflow>-<ref>,
  cancel-in-progress: true }`, so a newer push cancels the older run
  (each push 22 to 43 paid minutes); (b) the required `test` job ends
  green at its first step when the PR changes only `docs/` (a step that
  diffs against main, never a path filter on the trigger: TRAPS 238),
  saving a whole suite run on every documents-only push.
