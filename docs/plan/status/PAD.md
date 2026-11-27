card: PAD
branch: claude/plan-pad-12-fullpush (part 12, from main)
prs: #2354, #2363, part 6, #2387 part 8, #2393 part 9 (merged); #2402 part 10 (6645); part 11 (6646, draft); part 12 (6647, draft)
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
- 6646 part 11 ("Turn steel"): padSkin.js PAD_STEEL (the sheet's Attack
  face); the ready glow DEEBF6 (on the rim 4.58, gold 3.12/4.02); the
  tier's rings a CSS steel ring; the energy strip a steel twin
  (tools/art/steel-strip.mjs: full/empty 9.37, gold 7.58); `?padgold=1`.
  Guard pad-steel.test (26; 13 plants red); mp-padskin 8g, 9.
- 6647 part 12 (the owner's bug, card PAD-fullpush; branch
  claude/plan-pad-12-fullpush): a FULL push sprints (1.0 of the reach on,
  0.8 off), the reach the drawn radius or the room to the glass's edge less
  16 px (the band's top going south), never under 18 (stickZones.js
  stickReach); out of energy the bro walks on, no flicker; the words once
  an emptying; `?fullpush=0` yesterday's 1.25.  Only server/test changes
  under server/: deploys nothing.

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
