card: PAD
branch: claude/plan-pad-10-steel (on part 9's claude/plan-pad-9-rimsprint)
prs: #2354, #2363, part 6, #2387 part 8 (merged); #2393 part 9 (6644, draft); part 10 (6645, draft)
state: ready

## Done
- 6640 part 1: the controls as a controller (`?padskin=0` today's look).
- 6641 parts 3-5: ONE shell on the band, every control in a well, Block
  the big well in a fight, the shield a tap; the board's poll; Block's stamp.
- 6642 part 6: Whirlwind and Shield Bash in a TIER over the right lobe.
- 6643 part 8: no game file changed; mp-padskin 8c waits for Attack.
- 6644 part 9 ("remove sprint button"): the stick past its rim sprints
  (stickZones.js rimSprintLive); `?rimsprint=0` the button back.
- 6645 part 10 ("I don't like the gold"): every public/ui/pad picture cut
  off the owner's steel sheet (owner-2026-11-26-pad4/, cut-pad.mjs), same
  names and sizes; re-measured padSkin CUT_R 420, TIER_BAND 75: DEPLOYS.

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
- The gatekeeper's sitting for parts 9 and 10 (both DEPLOY the worker:
  server/test/stick-zones.test.mjs, server/test/pad-skin.test.mjs).
- The owner: which gold beside the controller goes next (part 10's PR lists
  it, with pictures).
