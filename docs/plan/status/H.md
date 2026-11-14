card: H
branch: claude/grand-plan-h-10-body-bake (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681, #1700, #1709, #1712, #1714, #1733 (merged); #1741 (ready); PR 10 on the branch above (ready; its number with the next commit)
state: ready

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait`; #1700 (5043) `masked-bake`; #1709 (5044)
  `strip-made`; #1712 (5045) `foldToMono`; #1714 (5046) the equip redraw;
  #1733 (5047) `ui:*`: off the list, merged.
- #1741 (5048) `sweepPicsOnce` off: a slice a turn, the address read last.
  The Leaderboard's faces measured: 32 faces, 9.7 ms.
- PR 10 (5049) `body-bake` off: none in six runs, every crowd group there.
  Z's #1668 finds: a worker never heard from is not restarted at a return
  (6c, its break proof); `BT_BW_PARTS` refuses a typo. 101 of 101.
- Card H's part of step 3.1 is done: `pack-page` (card P's) is the one row
  left that is ours.

## Next

- Nothing on the card. Spare tags 5050 to 5054, if the owner wants the
  follow-ups under Needs.

## Found

- `stripRead.js`: `READ_MS` (20 s) is wall time; `_dead` has no restart.
- `other: wrapped` (`perfTracker.js`'s timer wrapper): over the line in 5
  of ~40 runs; the sweep should look inside it. `QuestCoach > loadDone`
  23.3 ms once at `town` (measures the page).
- Pixi's render threw (`addressModeU` of null) once, a hung worker's jobs
  failing twice (the old restart rule, as on `main` until PR 10).

## Needs (the owner's, asked once)

- Follow-ups, each its own PR with a spare tag, or leave them? (a) sitting
  5's loose ends on #1700 (review-z5.md: low, speed only); (b) the Equipment
  screen's shirt composed whole for one frame (`gear-sheet` 22.4 ms once).
- The sweep's turn kept off the list (box spikes 12.1 to 18.3 ms named by
  it), or listed at 13 ms, which every run passes? Off unless told.
