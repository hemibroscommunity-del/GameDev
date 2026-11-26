card: PAD
branch: claude/plan-pad-10-steel (on part 9's claude/plan-pad-9-rimsprint)
prs: #2354, #2363, part 6 (merged); #2387 part 8 (6643); #2393 part 9 (6644, draft); part 10 (6645, draft)
state: ready

## Done
- 6640 part 1: the controls as a controller (`?padskin=0` today's look).
- 6641 parts 3-5: ONE shell on the band, every control in a well, Block
  the big well in a fight, the shield a tap; the board's poll; Block's stamp.
- 6642 part 6: Whirlwind and Shield Bash in a TIER over the right lobe
  (padSkin.js specialLayout); Sprint stands over the tier (clearOfTier).
- 6643 part 8 (cut down by the owner's "Do 1."): no game file changed;
  mp-padskin 8c's read waits for Attack's socket.
- 6644 part 9 (the owner: "remove sprint button"): on a touch screen the
  usual stick past its rim sprints (stickZones.js rimSprintLive,
  stickAnalog), no Sprint button; `?rimsprint=0` the button back.
- 6645 part 10 (the owner: "swap out the control color with this one. I
  don't like the gold"): every public/ui/pad picture cut off the owner's
  steel sheet (assets/icons-source/owner-2026-11-26-pad4/, layout.json;
  tools/art/cut-pad.mjs), same names and sizes; the icons and the dimmed
  Attack made from its faces; the lit well keeps the sheet's gold ring.
  Re-measured: padSkin CUT_R 400 -> 420, TIER_BAND 70 -> 75 (and
  pad-skin.test's five measures): the PR DEPLOYS the worker.

## Found
- CHARGE: drawn in the top-left (mobility) well whenever the game shows it
  (padSkin.js wellOf).  It shows with a melee weapon, a monster SIGHTED or
  locked and NONE IN REACH; the well is empty in a fight with a monster in
  reach, a duel/arena/player lock, the bow or staff, or `?chargebtn=0`.
- The bow and staff have no extra special; Special hides while the guard is
  up; sideways the tier meets the minimap (the owner's call).
- Part 9: sideways the open dashboard hides the controls (no stick to
  sprint with until folded); the energy shows as the five blocks under the
  bro while spent, never the dashboard's EN bar at rest or folded.
- The old layout still keeps Sprint's slot clear (ShieldButton.jsx
  rightCluster): not this card's.  Main's own reds: mp-sprint's two place
  checks, mp-oneband's three sideways, shot-thumbbtn's 38 Jump-orbit (it
  named no lane and ran nowhere: given one), twobuttons' 2b/6a/2c/3h.

## Next
- Nothing: message the orchestrator, stop.

## Needs
- The gatekeeper's sitting for parts 8, 9 and 10 (part 9 DEPLOYS the
  worker: it touches server/test/stick-zones.test.mjs; part 10 too:
  server/test/pad-skin.test.mjs).
- The owner: which gold beside the controller goes next (part 10's PR lists
  it, with pictures).
