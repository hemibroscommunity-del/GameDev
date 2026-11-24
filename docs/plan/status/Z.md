card: Z
branch: claude/plan-z-sitting-56
prs: DIR #2275, CK #2284, LF #2276 #2277 #2280, BK #2278 (listed); this PR (tag 6268), the last line
state: ready

## Done
- `census/review-z56.md`: 10 ready PRs checked against their cards, each
  that changes a guard or the game read by a purpose lane (top model,
  plants); rehearsed on `main` 0aec6482 (card CK's gatekeeper.mjs), tree
  2fe89fcc: precheck 0 FAIL (160 s), every switch thrown once (89, 641 s),
  build, questline 187/187; one merge base each, step by step.
- Sitting 54's notes landed (3.1's tick, `census/review-z54.md`); the shape
  review's part 4 boxes; the two renderers' lines 8941 -> 7984 and
  9870 -> 9450; the log (`docs/plan/log.md`) begun.
## The list: merge in this order, "Create a merge commit", in one go
1 #2275 (DIR 6400)  2 #2284 (CK 6420, urgent: every check shorter)
3 #2276 (LF 6292)  4 #2277 (LF 6310)  5 #2278 (BK 6460; DEPLOYS: a server
test only)  6 #2280 (LF 6291)  7 Z (6268, a draft: mark it ready first).
## Held / To 57
- Held, each a plant green in the PR's own suite (review-z56 4b): #2281
  (row 14's weapon doubled or lost), #2283 (the guard gutted, all green),
  #2279 (PH's dodges a and d), #2282 (`angleOff`'s negative wrap).
- To 57: those four re-pushed during this sitting (new heads: review
  again); WL #2286 and 6521, WHO 6480; RR #2273 (DEPLOYS). CT before any WL
  PR in `phase-table.test.mjs`. Tick nothing of this list until merged.
## Found
- `worldsum.js` counts no weapon pieces: a weapon lost on an equip swap
  passes world-sum (card BK).
- switches-thrown never catches a cap advertised whatever its reader says
  (`harvestGrade`): plain suites do (card CK's, no loss).
- quietphone's 80%-of-near line is a named skip on every run on this box
  (near under 20): the hard 16 a second line is what guards here.
- CK's status file says `working` with its PR ready.
## Needs
- Nothing from the owner for this list. Owner's own still: `.github/`,
  Cloudflare; the controls trial's verdict (deskkeys 8f; card CT).
