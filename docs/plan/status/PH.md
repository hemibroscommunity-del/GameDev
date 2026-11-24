card: PH
branch: claude/plan-ph-1-report
prs: #2279 (PR 1, 6500, DEPLOYS: sitting 57's hold mended), #2291 (PR 2, 6501), #2297 (PR 3, 6502), #2306 (PR 5, 6504)
state: working (part 6: mending sitting 58's holds on #2279 and #2291, one push each, then up the stack; PR 4 on claude/plan-ph-4-governor)

## Done
- Sitting 58 (review-z58) on #2279, mended (part 6): report.test 15.9 (a board's late or judged over the report's own: no board) and 15.10 (the page's own loop, a stand-in page and clock, 35 minutes riding: each report's `up` its stretch's middle minute, its board all its seen seconds). The three plants red, tried by hand 2026-11-24.
- PR 1 (6500) #2279: the report sees heat, the board and the ramps.
  Sitting 57 (review-z57): 15.8c's "fraction" sat on an empty bin (a -0.5,
  a negative), so `every(x >= 0)` stayed green: now on the fullest bin
  (99.5 of 100). New 15.8e and 15.8f: the `up` row's late and below
  columns are the kept verdict's, never the claim. Plants tried
  2026-11-24 on the test box: rideGaps sign-only, `msg.late[0]`,
  `msg.rung[1]`, below `0` each -> FAIL 15.8c / e / f / f.

## Next
- #2291's mend (memFull and `?memalarm=0`), carried into #2297 and #2306.
- Then PR 6 (6505). PR 4 (6503) waits for call 1.

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
