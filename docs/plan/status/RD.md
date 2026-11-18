card: RD
branch: claude/plan-rd-2-crowdfight (one PR a branch, claude/plan-rd-*)
prs: #2191 (6180), #2204 (6182), #2205 (6183): merged; (6181) crowdfight: opening
state: working

## Done
- #2191 (6180) itemdrop 5b: the TEST's (aged past its end; 0.6 fps).
- #2204 (6182) manualcombat 10a: the TEST's (the computer's bow is drawn
  since v2.3.4802, its release looses; docs/specs/bow-feel.md).
- #2205 (6183) jumpbtn 2b: the TEST's (sideways over the folded band the
  disc is drawn at 0.85, 80 px; docs/specs/one-band.md part 3).
- (6181) crowdfight: the TEST's (TRAPS §200). On this box the dpr-3
  page among 30 bots is held by its frames: a one-line read takes 3-13 s,
  each frame gap over 5 s rejoins (its socket made again every 6-30 s), so
  it takes in a step's new bots late or never though the worker sent them
  all; at worst it answers nothing for 55+ min. The wait is 240 s; a step
  that missed its bots on so slow a page is a skip; a step past 15 min
  ends the run as a skip; every other step must know its bots. Five runs
  of ea9ba39 green (here and four helper sessions; skips named).

## Next
- Nothing: 6181 waits for the gatekeeper. Then: done.

## Found
- wsClient.js _aliveTimer: a page drawing a frame less often than every
  5 s (RESYNC_AWAY_MS) rejoins on each gap; on this box it never settles
  in a crowd (a page knew 0 of 20 bots after 21 rejoins). A very slow
  device would loop the same way. A game question (TRAPS §305).

## Needs
