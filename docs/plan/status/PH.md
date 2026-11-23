card: PH
branch: claude/plan-ph-1-report
prs: PR 1 (6500, ready: the PR opened from this branch)
state: ready

## Done
- PR 1 (tag 6500): the report sees heat (`up`), the board (`ride`) and
  the address bar's off-ramps (`ramps`, in the cell); caps.report 4, kill
  switch `reportheat`. DEPLOYS the worker. Ready for the gatekeeper.

## Next
- PR 2 (6501): the memory alarm on the game's own total (its level waits
  for the owner); PR 3 (6502): the three mp-membudget runs are in hand.

## Found
- server/test/report.test.mjs section 7's "full" cell was not full: its
  late (40 of 900 > 105 drawn) and rung (120 s > 46 covered) were dropped by
  the checks, so the floor of sixteen cells a day measured a 1.5 KB cell; a
  truly full one was 1.7 KB (fourteen a day). Mended in PR 1 (my suite).

## Needs
- The owner's five minutes (finish.md part 9, call 1): the Speed test's
  table, `?govern=0` against on when warm, `?groundsend=0` on the board.
  PR 4's order of rungs waits on it; PRs 1 to 3 do not.
- The owner's yes on the memory alarm's level (call 3): PR 2's level.
