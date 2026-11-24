card: PH
branch: claude/plan-ph-2-memalarm (PR 1's branch merged in: sitting 57)
prs: #2279 (PR 1, 6500, DEPLOYS: sitting 57's hold mended), #2291 (PR 2, 6501: this branch, sitting 57's hold mended), #2297 (PR 3, 6502), #2306 (PR 5, 6504)
state: working (part 6: mending sitting 58's holds on #2279 and #2291, one push each, then up the stack; PR 4 on claude/plan-ph-4-governor)

## Done
- Sitting 58 (review-z58) on #2279, mended (part 6): report.test 15.9 (a board's late or judged over the report's own: no board) and 15.10 (the page's own loop on a stand-in page and clock, 35 minutes riding). Its three plants red, tried by hand 2026-11-24.
- Sitting 58 (review-z58) on #2291, mended (part 6): frame-pacer.test 23j, the PAGE's pacer reading its own address (`?memalarm=0` on a stand-in page, then none): `memFull(ts, search = '')` and the call as `memFull(ts, '')` both red, tried by hand 2026-11-24.
- PR 1 (6500) #2279: the report sees heat, the board and the ramps.
  Sitting 57: 15.8c's fraction now positive; 15.8e/f the up row's late
  and below the kept verdict's (plants red, 2026-11-24, test box).
- PR 2 (6501) #2291: the governor's memory alarm on the game's own total
  (framePacer.js MEM_ALARM { READ 106.4, MB 120 }, on the test box;
  DECIDED FOR THE OWNER WHILE AWAY, not the owner's yes; `?memalarm=0`
  the old lines). Sitting 57: memFull exported with an address; 23i's
  filling phone rides memFull itself, thrown and not. Plants tried
  2026-11-24: `memOver(m)`, `memOver(m, true)`, `memAlarmOld()` without
  the address, the read's cadence -> each FAIL 23i. The header's "owner's
  yes" corrected.

## Next
- #2297 and #2306 take #2291's mend; main merged once at the bottom.
- Then PR 6 (6505). PR 4 (6503) waits for call 1.

## Found
- src/rendering/maskedEvict.js's header still says the memory rung is
  "the report's count over the memory check's lines" (not my card's file).
- The 30-bot crowd fight cannot be read on the test box (census/PH-phone.md).

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
- The owner's word on the alarm's level (call 3): decided while away, 120.
