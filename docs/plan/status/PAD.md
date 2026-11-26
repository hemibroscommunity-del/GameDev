card: PAD
branch: claude/plan-pad-8-nojump (from main 7ec316e9)
prs: #2354, #2363, part 6 (merged, sitting 68); part 8 (tag 6643, draft)
state: ready

## Done
- 6640 part 1: the controls as a controller (`?padskin=0` today's look).
- 6641 parts 3-5: ONE shell on the band, every control in a well, Block
  the big well in a fight, the shield a tap; the shell at the world's
  width; the board's poll keys on the controller's pick; Block's stamp.
- 6642 part 6: Whirlwind and Shield Bash in a TIER over the right lobe
  (padSkin.js specialLayout; the right lobe drawn ~42 px taller while
  either shows); Sprint stands over the tier (clearOfTier).
- 6643 part 8 (CUT DOWN by the owner's "Do 1.": Jump stays small in the
  middle well in a fight, as built): no game file changed.  mp-padskin
  8c's read waits for Attack's socket (shown, its face in the attack
  well, up to 8 s) before it reads: part 22's one-in-three red.

## Found
- CHARGE (the card's check): it IS drawn in the top-left (mobility) well
  whenever the game shows it (padSkin.js wellOf: charge -> 'mobility';
  ctxFor: Charge over the board).  It shows (controlVisibility.js
  chargeShown, thumbSide.js chargeUp) with a melee weapon (never the bow
  or staff), a monster SIGHTED or locked and NONE IN REACH.  The well is
  empty in a fight when: a monster is in reach (the specials' phase: you
  are already swinging); a duel, an arena match or a player locked
  (v2.3.6554: Charge is for monsters); the bow or staff in hand; or
  `?chargebtn=0`.  The board takes the well only out of a fight (or for
  a rider).  With the guard up Shield Bash's tier sits over that well.
- The bow and staff have no extra special: Whirlwind is the sword's;
  Shield Bash the raised shield's with any weapon.
- Special hides while the guard is up.  Sideways the tier meets the
  minimap: the owner's call.  A computer's Jump key is unchanged.

## Next
- Nothing: message the orchestrator, stop.

## Needs
- The gatekeeper's sitting for part 8 (a test-only change: no deploy).
