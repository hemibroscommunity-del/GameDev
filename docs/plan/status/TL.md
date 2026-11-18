card: TL
branch: claude/plan-tl-2 (PR 2; PR 1: claude/plan-tl-1)
prs: #2175 (6160, ready); PR 2 (6161, working)
state: working

## Done
- PR 1 (6160): precheck's server-tests cap 5 min -> 20 min (whole run
  measured 610 s here, switches-thrown 543 s of it); a timeout now says
  "timed out after N s; the suite did not finish" (still a FAIL).
- PR 2 (6161): listcap check 1's race: the walk's next page (NEXT_MS 10 ms,
  armed at the end of the call) fired before the test's 5 ms settle() after
  any 5 ms+ stall, so "one call, one page" counted two. The test now holds
  `_listNext` while it counts one call (and checks the next page was asked
  for), then releases it. An 8 ms stall turned it red before; 50 ms stays
  green after. 50 runs alone, 50 beside `npm test`, 50 on one shared core:
  all green.

## Next
- Both PRs wait for CI and the gatekeeper; done once both merge.

## Found
- server/test/run.mjs: when precheck's timeout kills `npm test`, the suites
  it had started run on as orphans until they finish (no process-group
  kill); harmless but they load the box for a minute or two.

## Needs
- Nothing.
