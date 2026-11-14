card: H
branch: claude/grand-plan-h-12-portrait-shirt (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681, #1700, #1709, #1712, #1714, #1733, #1741, #1747, #1762 (merged); #1777 (ready, this branch)
state: ready

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait`; #1700 (5043) `masked-bake`; #1709 (5044)
  `strip-made`; #1712 (5045) `foldToMono`; #1714 (5046) the equip redraw;
  #1733 (5047) `ui:*`: off the list, merged.
- #1741 (5048) `sweepPicsOnce` off (the faces: 32, 9.7 ms); #1747 (5049)
  `body-bake` off, Z's #1668 finds (6c; `BT_BW_PARTS`). Card H's part of
  step 3.1 is done: `pack-page` (card P's) is the one row left that is ours.
- #1762 (5050) sitting 5's loose ends on #1700, and why `masked-bake` grew
  back (card A: 23.7 ms): the whole tour's stuck kills refused addresses
  that had read (two whole tours after: none, 4.6 ms; `main` 18.6, 28.3).

## Next

- #1777 (5051), ready: sitting 9's low find, the page's own armour bake
  draws the body plain for a piece not readable (`worn-bake.test` §5). It
  deploys. The figure's cut is dropped (sitting 10: its sheets are 1 frame).

## Found

- The figure's 22 ms (`gear-sheet` 22.4, `portrait` 22.6) is NOT explained:
  its sheets are one 128x128 frame each. Candidates, unmeasured: a cold
  decode inside `drawImage`; `composeShirt`'s and the tint's `getImageData`.

- `stripRead.js`: `READ_MS` (20 s) is wall time; `_dead` has no restart.
- `other: wrapped` (`perfTracker.js`'s timer wrapper): over the line in 5
  of ~40 runs; the sweep should look inside it. `QuestCoach > loadDone`
  23.3 ms once at `town` (measures the page).
- Pixi's render threw (`addressModeU` of null) once. `mp-lookarmour` red
  on `main` too: its side-by-side picture throws (`alphaMode` of null).

## Needs

- Nothing (both questions answered by the planning session, 2026-11-14).
