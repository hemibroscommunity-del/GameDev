card: PH
branch: the stack, bottom to top: claude/plan-ph-1-report, -2-memalarm, -3-membudget, -5-heaptrend, -6-debtgate, -4-governor, -mend59 (all frozen as sitting 60 reviewed them), and claude/plan-ph-mend60 on top
prs: #2279 (PR 1, 6500, DEPLOYS), #2291 (PR 2, 6501), #2297 (PR 3, 6502), #2306 (PR 5, 6504), #2314 (PR 6, 6505, draft), #2318 (PR 4, 6503, draft), #2323 (the sitting-59 mend, 6506, draft); the sitting-60 mend (6507, draft, DEPLOYS: server/test) on claude/plan-ph-mend60, its base claude/plan-ph-mend59
state: working (part 10: sitting 60's three holds mended on ONE new branch on the stack's top; the stack waits for sitting 61)

## Done
- Sitting 58 (review-z58) on #2279, mended (part 6): report.test 15.9 and 15.10; its three plants red, tried by hand 2026-11-24. 148 passed (test box). #2279's words updated for sitting 58 (part 7).
- Sitting 58 (review-z58) on #2291, mended (part 6): frame-pacer.test 23j, the page's pacer reading its own address (`?memalarm=0`); both plants red, tried by hand 2026-11-24.
- PR 2 (6501) #2291: the memory alarm on the game's own total (MEM_ALARM
  MB 120, test box; DECIDED FOR THE OWNER WHILE AWAY; `?memalarm=0`).
- PR 3 (6502) #2297: the seven lines + TOTAL 216.0. PR 5 (6504) #2306: --heap.
- PR 6 (6505) #2314 (draft): the gate's held sample (stand, town, ride),
  gate-steps.test; screen-check mended in the test; `server-message` a
  named debt row; mp-skateboard on the game's clock. Lands AFTER CK's
  #2305 and #2307.
- PR 4 (6503), on its branch: the cooling margin (COOL_MARGIN 8%;
  `?govcool=0`), the screen's beat held (keptBeat; `?beathold=0`),
  frame-pacer.test §24 (the heat model); a phone at 1.5 (renderRes.js
  PHONE_RES; `?phoneres=0`); `?shine=0|1`. `playable` passed on it.
- The sitting-59 mend (6506) #2323: 630 mutants, 545 killed, 85 listed;
  report.test 15.11-15.13, gate-steps 6-10, heap-trend 10-12.
- Sitting 60 (review-z60), mended (part 10, 6507): (1) #2318's chip-caused step never came back: heatSeen (framePacer.js) keeps the margin only where the work rose; frame-pacer 24k-24m (the gatekeeper's probe, at 60 and 120, and the edge). (2) The doubling masked by the margin: §13 runs `?govcool=0` too; break proof 13 true again. (3) #2323's three worker plants: report.test 15.14. All five plants red, tried by hand 2026-11-24.

## Next
- PR 4 (#2318): DECIDED FOR THE OWNER WHILE AWAY (orchestrator part 9,
  2026-11-24): heap line 40.0 -> 42.5 (reads 39.4, 40.2 CI; 41.5, 39.3
  `?phoneres=0` box), TOTAL 216.0; heap-trend.mjs HEAP_LINE follows. Merged up
  into the mend. Its words name 1.5, shine ON (`?shine=0|1`), rate-first order.
- Next part: sitting 61 reads both mends; the owner's Speed test
  once PR 4 lands. Swings-not-time for mp-membudget stays in #2318's words.
## Found
- maskedEvict.js's header still says the memory rung is "the report's count over the memory check's lines" (not my file).
- The 30-bot crowd fight cannot be read on the test box (census/PH-phone.md).

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs (today's order kept until then).
- The owner's word on the alarm's level (call 3): decided while away, 120.
