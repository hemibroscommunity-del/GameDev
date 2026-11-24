card: PH
branch: claude/plan-ph-3-membudget (stacked on claude/plan-ph-2-memalarm)
prs: #2279 (ready, PR 1, 6500, DEPLOYS), #2291 (ready, PR 2, 6501), #2297 (ready, PR 3, 6502: this branch)
state: ready

## Done
- PR 1 (6500) #2279: the report sees heat, the board and the ramps;
  sitting 56's four dodges tried through the room (report.test 15.8).
- PR 2 (6501) #2291: the memory alarm on the game's own total, 120 MB
  (decided for the owner while away; `?memalarm=0`); mp-memalarm 7/7.
  Sitting 57: PR 1's branch merged into it (the status files' add/add).
- PR 3 (6502) #2297, stacked on 6501, merges after it: the lines at the
  highest of six runs on the test box + max(scatter, 1.0): artCache 12.2,
  gpu 94.0, canvases 14.7, workers 24.3; sound 19.9 from its own CI run
  (18.9 there + 1.0); heap 40.0 and buffers 24.8 kept; a TOTAL 216.0.
  No line rises above main's.

## Next
- PRs 5 and 6 (6504, 6505), in order. PR 4 (6503) waits for call 1.

## Found
- src/rendering/maskedEvict.js's header still calls the memory rung "the
  report's count over the memory check's lines" (not my card's file).
- tools/guards/lib/budgets.mjs SHARED.mb says "seven lines, no sum": PR 3
  adds the sum (memory-budget.mjs total).
- The 30-bot crowd fight cannot be read on the test box.
- buffers: 24.8-24.9 on the test box, 24.3 on CI, its line 24.8 (main's,
  kept): 0.5 MB of room on CI. The next heap/buffers trim is owed.

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
