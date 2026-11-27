card: PAD
branch: claude/plan-pad-14-misslift (part 14, from main)
prs: #2354, #2363, part 6, #2387 part 8, #2393 part 9 (merged); #2402 part 10 (6645); part 11 (6646, draft); part 12 (6647, draft); #2425 part 13 (6648, merged); part 14 (6649, draft)
state: ready

## Done
- 6640 part 1: the controls as a controller (`?padskin=0` today's look).
- 6641 parts 3-5: ONE shell on the band, every control in a well, Block
  the big well in a fight, the shield a tap; the board's poll; Block's stamp.
- 6642 part 6: Whirlwind and Shield Bash in a TIER over the right lobe.
- 6643 part 8: no game file changed; mp-padskin 8c waits for Attack.
- 6644 part 9 ("remove sprint button"): the stick past its rim sprints.
- 6645 part 10 ("I don't like the gold"): every public/ui/pad picture cut
  off the owner's steel sheet; padSkin CUT_R 420, TIER_BAND 75: DEPLOYS.
- 6646 part 11 ("Turn steel"): padSkin.js PAD_STEEL; `?padgold=1`.
- 6647 part 12 (card PAD-fullpush): a FULL push sprints (stickZones.js
  stickReach); `?fullpush=0` yesterday's 1.25.
- 6648 part 13 (#2425): the two buttons' Attack a stick for a bow or staff.
- 6649 part 14 (sitting 73's reviewer, on #2425): a bow's or a staff's
  stick lets go on EVERY lift of Attack, its touch found or missed
  (rangedStick.js discLiftMissed, before bE's `if (!t) return;`): a missed
  lift no longer keeps the bow shooting.  Guard ranged-stick-lift.test;
  mp-rangedstick 4b.

## Found
- The energy blocks show only briefly after a spend: no in-game picture
  caught them (docs/shots/pad11-energy-strips.png has both strips).
- Their file is read off the page's thread: in no resource list
  (fxStrips.js __btBlockBars, a QA probe, names it).

## Next
- Nothing: the ready message to the orchestrator, stop.

## Needs
- The gatekeeper's sitting for parts 10 and 11 (10 DEPLOYS; 11 no server
  file).
