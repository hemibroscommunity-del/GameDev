card: RD
branch: claude/plan-rd-4-jumpbtn (one PR a branch, claude/plan-rd-*)
prs: #2191 (6180) itemdrop: merged; (6181) crowdfight: working; (6182) manualcombat 10a, (6183) jumpbtn: done, open after 6181 in order
state: working

## Done
- #2191 (6180) itemdrop 5b: the TEST's (aged past its end; 0.6 fps at
  dpr 2). Merged.
- (6182) manualcombat 10a: the TEST's (the computer's drawn bow looses on
  the release, docs/specs/bow-feel.md). 5 runs green (44/44).
- (6183) jumpbtn 2b (added by the planning session): the TEST's. Sideways
  over the folded band the disc is laid out at 94 and drawn at 0.85, 80 px
  (v2.3.4152, docs/specs/one-band.md part 3). 5 runs green (29/29).

## Next
- crowdfight (6181, claude/plan-rd-2-crowdfight): the TEST's (TRAPS
  §200); helper sessions running its five runs.

## Found
- wsClient.js _aliveTimer: a page drawing a frame less often than every
  5 s (RESYNC_AWAY_MS) rejoins on each gap; in a crowd on this box it
  never settles (town at 30 bots: 22 rejoins in 244 s, 21 of 30 known).
  A game question, not this card's (TRAPS §305).

## Needs
