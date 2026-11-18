card: HB
branch: claude/plan-hb-2-bandsize
prs: #2188 (6240, the map): ready; #2199 (6241, the band's geometry): draft
state: working

## Done

- PR 1 (6240): docs/plan/census/HB-holds.md: O2's families over the line,
  resolved on an unminified build of main under both profiles (heldsweep
  all 8 stations x2, full paths), owners HB / EN / FX / list / box.

## Next

- PR 2 (6241): open as a draft, ready when green.  Then PR 3: the World
  map's labels measured each redraw (loop > draw > label > measureText,
  108.1 ms O2, 151.5 here).

## Found

- Under BT_QA_CPU_THROTTLE the profiler counts the throttle's pauses
  against whatever function runs (perfTracker.js `wrapped`, the long-task
  observer): a hold's length is real, its split by function looser.

- mp-jumpbtn fails on main (the same as on this branch): "sideways 844:
  2b" wants the disc 94 px sideways, it is 80 (tools/qa/mp/mp-jumpbtn.mjs:166).
- mp-membudget's heap line (38.5 MB) is within the noise of main itself:
  main read 38.8 (fail) and 38.3, this branch 38.5 and 38.2.

## Needs

- Nothing yet.
