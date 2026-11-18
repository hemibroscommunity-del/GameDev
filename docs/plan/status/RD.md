card: RD
branch: claude/plan-rd-3-manualcombat (one PR a branch, claude/plan-rd-*)
prs: #2191 (6180) itemdrop: merged; (6181) crowdfight: working; (6182) manualcombat 10a: done, opens after 6181
state: working

## Done
- #2191 (6180) itemdrop 5b: the TEST's (aged past its end; 0.6 fps at
  dpr 2). Merged.
- (6182) manualcombat 10a: the TEST's. Since v2.3.4802 a computer's bow
  in the game's own combat is drawn: the button held draws, its release
  looses (docs/specs/bow-feel.md "A computer"). 10a now reads none on the
  press or while held ('drawing'), one at the release, no second; the
  press rule kept for `?bowfeel=0`. 5 runs green (44/44).

## Next
- crowdfight (6181, claude/plan-rd-2-crowdfight): the TEST's (TRAPS
  §200); helper sessions running its five runs.
- Then jumpbtn (6183, added by the planning session).

## Found
- wsClient.js _aliveTimer: a page drawing a frame less often than every
  5 s (RESYNC_AWAY_MS) rejoins on each gap; in a crowd on this box it
  never settles (town at 30 bots: 22 rejoins in 244 s, 21 of 30 known).
  On a real phone frames are fast; a very slow device would loop the
  same way. A game question, not this card's (TRAPS §305).

## Needs
