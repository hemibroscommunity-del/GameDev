card: HB
branch: claude/plan-hb-5-afterpaint
prs: #2188 (6240): merged; #2199 (6241), #2201 (6242), #2202 (6243): ready; #? (6244, the door prompt after the paint): draft
state: working

## Done

- PR 1 (6240): docs/plan/census/HB-holds.md: O2's families over the line,
  resolved on an unminified build of main under both profiles (heldsweep
  all 8 stations x2, full paths), owners HB / EN / FX / list / box.

## Next

- PR 5 (6244): the door prompt placed at the top of the next frame
  (`?afterpaint`, decided for the owner while away; the switch row added
  here, the planning session's yes).  Then the quest coach, the band's
  tap and the taps under the same switch, one a PR; pack-page after FX's
  #2200 (p256.js) is on main.
- Measured, not opened (no fall): the World map's names' widths cached
  (claude/plan-hb-3-maplabels, local); the figure's armour from frame 0
  (the standing sheets are one frame: claude/plan-hb-5-portrait, local).

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
