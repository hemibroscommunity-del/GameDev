card: HB
branch: claude/plan-hb-4-pacermem
prs: #2188 (6240, the map): merged; #2199 (6241, the band's geometry): ready; #2201 (6242, the report's memory read): draft; #2202 (6243, the pacer's memory read): draft
state: working

## Done

- PR 1 (6240): docs/plan/census/HB-holds.md: O2's families over the line,
  resolved on an unminified build of main under both profiles (heldsweep
  all 8 stations x2, full paths), owners HB / EN / FX / list / box.

## Next

- PR 4 (6243): the pacer's count reads the total alone; frame-pacer.test
  23c widened (the planning session's one-off yes).  Then the next HB
  family by size.
- Measured, not opened: the World map's names' widths cached and its
  boxes kept (branch claude/plan-hb-3-maplabels, local): the longest
  hold is the first draw's cold measuring, the redraws are drawing.

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
