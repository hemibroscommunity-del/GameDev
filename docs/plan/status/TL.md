card: TL
branch: claude/plan-tl-1
prs: PR 1 (6160, working)
state: working

## Done
- PR 1 (6160): precheck's server-tests cap 5 min -> 20 min (whole run
  measured 610 s here, switches-thrown 543 s of it); a timeout now says
  "timed out after N s; the suite did not finish" (still a FAIL). Precheck
  with the suite forced on: OK TO PUSH in 612 s; a forced 5 s cap prints
  the new message.

## Next
- PR 2 (6161): the listcap check-1 race.

## Found
- server/test/run.mjs: when precheck's timeout kills `npm test`, the suites
  it had started run on as orphans until they finish (no process-group
  kill); harmless but they load the box for a minute or two.

## Needs
- Nothing.
