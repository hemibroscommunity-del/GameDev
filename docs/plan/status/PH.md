card: PH
branch: claude/plan-ph-2-memalarm (PR 1: claude/plan-ph-1-report)
prs: #2279 (ready, PR 1, 6500, DEPLOYS)
state: working

## Done
- PR 1 (6500) #2279: the report sees heat (`up`), the board (`ride`) and
  the address bar's ramps (in the cell); caps.report 4, `reportheat`.
  Waits for the gatekeeper. Its status file is on its own branch.

## Next (handed over at 338,000 tokens; a fresh session takes these)
- PR 2 (6501), branch claude/plan-ph-2-memalarm, pushed, no PR yet:
  framePacer.js MEM_ALARM on the game's own total, `?memalarm=0` (the old
  lines, frozen), __btMemAlarm probe (force), frame-pacer.test 23a/23b/23i
  written. TO DO: set MEM_ALARM = { MB, READ } (it is { MB: 0 } now: never
  merge so); the phone test `mp-memalarm` (govern on, force the total over,
  the caches rung taken: __btLane().rung.mem, maskedCap halved); the
  memory-budget.mjs note about the pacer's copy (line ~419); merge main
  (this branch is from 0aec6482, before #2279: the status file conflicts).
- PR 3 (6502): the three runs are in census/PH-phone.md.
- PR 4 (6503) waits for the owner's call 1; PRs 5, 6 after card CK's
  first PR has merged.

## Found
- report.test 7's "full" cell was not full (its late and rung dropped by
  its own numbers); mended in PR 1.

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
- The owner's yes on the alarm's level (call 3) and the 30-bot crowdfight
  reading (census/PH-phone.md): PR 2's MB.
