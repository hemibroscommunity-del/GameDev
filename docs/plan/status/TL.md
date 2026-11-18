card: TL
branch: claude/plan-tl-2 (PR 2, stacked on PR 1's claude/plan-tl-1)
prs: #2175 (6160, ready); #2181 (6161, ready, stacked on #2175)
state: ready

## Done
- PR 1 (6160): precheck's server-tests cap 5 min -> 20 min (whole run
  measured 610 s here, switches-thrown 543 s of it); a timeout now says
  "timed out after N s; the suite did not finish" (still a FAIL).
- PR 2 (6161): listcap check 1's race: the walk's 10 ms next page beat the
  test's 5 ms settle() after any stall; the test holds `_listNext` while it
  counts one call. 150 runs green (alone, beside npm test, one core).

## Next
- PR 3 (6162) stacks on this branch; done once all three merge.

## Found
- server/test/run.mjs: when precheck's timeout kills `npm test`, the suites
  it had started run on as orphans until they finish (no process-group
  kill); harmless but they load the box for a minute or two.

## Needs
- Nothing.
