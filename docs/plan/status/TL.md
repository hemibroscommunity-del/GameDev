card: TL
branch: claude/plan-tl-3 (PR 3; PR 1: claude/plan-tl-1, PR 2: claude/plan-tl-2)
prs: #2175 (6160, ready); #2181 (6161, ready); PR 3 (6162, working)
state: working

## Done
- PR 1 (6160): precheck's server-tests cap 5 min -> 20 min (whole run
  measured 610 s here, switches-thrown 543 s of it); a timeout now says
  "timed out after N s; the suite did not finish" (still a FAIL).
- PR 2 (6161): listcap check 1's race: the walk's 10 ms next page beat the
  test's 5 ms settle() after any stall; the test holds `_listNext` while it
  counts one call. 150 runs green (alone, beside npm test, one core).
- PR 3 (6162, added by the planning session's message of 05:02 UTC):
  arena.test's house-budget block crossed a clock hour under switches-thrown
  (CI run 44225792204). Its Date.now now runs from one minute into the
  current hour, restored at the block's end. A clock shifted so the hour
  turns mid-block reproduces CI's two FAILs on the old test; none on the new.

## Next
- The three PRs wait for CI and the gatekeeper; done once all merge.

## Found
- server/test/run.mjs: when precheck's timeout kills `npm test`, the suites
  it had started run on as orphans until they finish (no process-group
  kill); harmless but they load the box for a minute or two.

## Needs
- Nothing.
