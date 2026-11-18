card: RD
branch: claude/plan-rd-*: -3-manualcombat (6182), -4-jumpbtn (6183), -2-crowdfight (6181)
prs: #2191 (6180) itemdrop: merged; (6182) manualcombat 10a and (6183) jumpbtn: opening (the planning session: before 6181); (6181) crowdfight: working
state: working

## Done
- #2191 (6180) itemdrop 5b: the TEST's (aged past its end; 0.6 fps at
  dpr 2). Merged.
- (6182) manualcombat 10a: the TEST's. Since v2.3.4802 a computer's bow
  in the game's own combat is drawn: the button held draws, its release
  looses (docs/specs/bow-feel.md "A computer"). 10a reads none on the
  press or while held ('drawing'), one at the release, no second; the
  press rule kept for `?bowfeel=0`. 5 runs green (44/44).
- (6183) jumpbtn 2b (added by the planning session): the TEST's.
  Sideways over the folded band the disc is laid out at 94 and drawn at
  0.85, 80 px (v2.3.4152, docs/specs/one-band.md part 3). 5 runs green
  (29/29).

## Next
- crowdfight (6181, claude/plan-rd-2-crowdfight): the TEST's (TRAPS
  §200). The dpr-3 page among 30 bots rejoins every 5-20 s here and can
  stop answering for 55+ min; the test now waits up to 240 s, makes a
  step the page could not play a skip, and caps a step at 15 min. Five
  runs of 0d7424b going (here and four helper sessions).

## Found
- wsClient.js _aliveTimer: a page drawing a frame less often than every
  5 s (RESYNC_AWAY_MS) rejoins on each gap; in a crowd on this box it
  never settles (town at 30 bots: 22 rejoins in 244 s, 21 of 30 known).
  A game question, not this card's (TRAPS §305).

## Needs
