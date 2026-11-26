card: PAD
branch: claude/plan-pad-6-specials (stacked on claude/plan-pad-3-housing)
prs: #2354 (draft, tag 6640, part 1: lands only with part 3); #2363 (tag 6641, parts 3-5); part 6 (tag 6642, draft, base #2363's branch)
state: ready

## Done
- 6640 part 1: the controls as a controller (`?padskin=0` today's look).
- 6641 parts 3-5: ONE shell on the band, every control in a well, Block
  the big well in a fight, the shield a tap; the shell at the world's
  width; the board's poll keys on the controller's pick; Block's stamp.
- 6642 part 6: Whirlwind and Shield Bash in a TIER over the right lobe
  (padSkin.js specialLayout): the housing as drawn has no free 44 px
  place, so while either shows the right lobe is drawn ~42 px taller (the
  same housing.png, its steep wall band stretched: no new picture);
  Whirlwind over Special, Bash over the mobility well, the old buttons'
  own faces at the top row's size, boxes 44.  Who shows: the old rule
  (AbilityButtons' list, abilityStatus), told to the shell (padTier.js).
  Sprint (no well) stands 4 px over the tier always (clearOfTier: its old
  place sat 10 px into it upright).  pad-skin.test 3c/3f-3q; mp-padskin 8.

## Found
- The bow and staff have no extra special of their own: Whirlwind is the
  sword's alone; Shield Bash is the RAISED SHIELD's with any weapon (a bow
  with its guard up shows Bash, as the old layout did).
- Special hides while the guard is up (today's rule), so with Bash shown
  Special's well is empty.
- Sideways (844 x 390) the tier's top meets the minimap's foot (its
  "Lv 1-5" line half under it): flagged, the owner's call.
- mp-padskin: 53/55 on the full run (the 2 reds my step 8's own: a test
  bug, mended); step 8 upright 7/8 after (8f the test's, mended); the
  final full run is a helper's (PR body).

## Next
- Nothing: one message to the orchestrator, then stop.

## Needs
- The gatekeeper's sitting for #2363 with #2354, then this.  The owner's
  iPhone: the tier is the orchestrator's choice (other ways: floating in
  the old places, new art; or the tier always drawn for a sword).
