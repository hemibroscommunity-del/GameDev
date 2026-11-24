card: LF
branch: claude/plan-lf-thaw-edges (carries this file; based on #2273's branch)
prs: #2276 (6292), #2277 (6310), #2280 (6291), #2273 (6309, frozen at 72c08a15); the mend 6311 (claude/plan-lf-thaw-edges, on #2273's branch); 6313 (claude/plan-lf-mend60)
state: working

## Done
- Line 4: #2276 (6292, ground rule): precheck OK, level with main.
- Line 2: #2277 (6310, mp-quietphone): 15/15, 1 named skip, this box, 2026-11-23.
- Line 3: #2280 (6291, narrow keys): oneband all pass; deskkeys 59 of 60 + 1
  skip, the 1 fail 8f (not ours). Step 1's two lines changed (planning
  session's yes: mp-deskkeys.mjs is outside the card).
- Line 1: #2273 (6309): mp-comeback was red twice at 5b on 988dddff; the split
  run showed the TEST's assertion (the off path skips the judge), so 5b was
  mended as the orchestrator said (a new socket, a whole state_sync, the
  judge's counters untouched). 12/12 twice on the merged head, precheck OK.
- Line 5: EN done, HB2 true (on #2280), RR true (here).
- Part 2, sitting 57's hold on #2273: the decision moved into
  src/game/thawCarried.js; thaw-carried §8 plays the road, §6 reads
  wsClient's tree. Every plant red (40 green then). The PR's "Plants".
- Part 3, sitting 58's hold on #2273 (a return before the real thawResume
  stayed green): thaw-carried.test §9 lifts the alive timer's body and
  _resumeRecover from wsClient's tree and RUNS them on a fake clock (stubs,
  a rejoin spy). The review's five plants and LF's three (M1-M3) each red
  (scratch copy); green unplanted (55). The PR body's "Plants".
- Part 3, sitting 59's hold (no uncarried 5-12 s gap played): #2273 frozen;
  the mend is 6311 on its own branch: every gap 4-12 s both sides of the
  line, a mutation pass (118 mutants, 6 equivalent survivors), the
  review's five floors and LF's three unplanned plants red (69 green).
- Part 4, sitting 60's hold (four-lines, wsClient 2599 over 2598): the thaw's
  try/catch moved into thawBeat; thaw-carried §10 plays it. Tag 6313 (6312 is
  elemental2's on main).

## Next
- The mend's `test` green; the owner's word on #2273 (frozen); then a sitting.

## Found
- deskkeys 8f stays red on main (card CT's verdict).

## Needs
- Nothing.
