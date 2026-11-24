card: PH
branch: claude/plan-ph-3-membudget (stacked on claude/plan-ph-2-memalarm)
prs: #2279 (ready, PR 1, 6500, DEPLOYS), #2291 (ready, PR 2, 6501), PR 3 (6502, draft: this branch)
state: working

## Done
- PR 1 (6500) #2279: the report sees heat, the board and the ramps;
  sitting 56's four dodges tried through the room (report.test 15.8).
- PR 2 (6501) #2291: the memory alarm on the game's own total, 120 MB
  (decided for the owner while away; `?memalarm=0`); mp-memalarm 7/7.
- PR 3 (6502), stacked on 6501, merges after it: the lines at the highest
  of six runs + max(scatter, 1.0): artCache 12.2, gpu 94.0, canvases 14.7,
  sound 19.1, workers 24.3; heap 40.0 and buffers 24.8 kept; a TOTAL
  216.0 (mp-membudget READ.total and TRIP_GROWTH.total, approved).

## Next (handed over at 250,000 tokens)
- PR 3: read its own CI memory-budget run for all eight lines; any with
  under 1.0 MB of room there is set from CI's read (no line rises: say
  so), then mark it ready. Heap and buffers read AT their lines on main's
  code on this box (census/PH-phone.md): expect them there.
- PR 4 (6503) waits for the owner's call 1. PRs 5 and 6 (6504, 6505):
  card CK's first PR merged (sitting 56): next in order.

## Found
- src/rendering/maskedEvict.js's header still calls the memory rung "the
  report's count over the memory check's lines" (not my card's file).
- tools/guards/lib/budgets.mjs SHARED.mb says "seven lines, no sum": PR 3
  adds the sum (memory-budget.mjs total).
- The 30-bot crowd fight cannot be read on the test box.
- buffers reads 24.8-24.9 on main's code on this box, its line 24.8.

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
