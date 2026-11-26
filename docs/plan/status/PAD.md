card: PAD
branch: claude/plan-pad-9-rimsprint (on part 8's branch, 897f7444)
prs: #2354, #2363, part 6 (merged); #2387 part 8 (6643); part 9 (6644, draft)
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
- The gatekeeper's sitting for parts 8 and 9 (part 9 DEPLOYS the worker:
  it touches server/test/stick-zones.test.mjs).
