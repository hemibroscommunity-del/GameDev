card: HB
branch: claude/plan-hb-2-bandsize
prs: #2188 (6240, the map): ready; 6241: working
state: working

## Done

- PR 1 (6240): docs/plan/census/HB-holds.md: O2's families over the line,
  resolved on an unminified build of main under both profiles (heldsweep
  all 8 stations x2, full paths), owners HB / EN / FX / list / box.

## Next

- PR 2 (6241): the band's geometry: the window's size kept
  (playViewport.js winVw/winVh, cleared only by a trusted resize), the
  band's own resize marked (bandResize) so the play sizes stand through
  it.  Measuring under budget-android: the 200 ms renders' forced layouts
  (jumpAnchor) go; the tap's layout moves to the next reader (BroTown
  resize's visualViewport read, the mount measures).

## Found

- Under BT_QA_CPU_THROTTLE the profiler counts the throttle's pauses
  against whatever function runs (perfTracker.js `wrapped`, the long-task
  observer): a hold's length is real, its split by function looser.

## Needs

- Nothing yet.
