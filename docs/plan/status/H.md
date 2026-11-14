card: H
branch: claude/grand-plan-h-12-portrait-shirt (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681, #1700, #1709, #1712, #1714, #1733, #1741, #1747, #1762, #1777 (all merged)
state: done

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; then off the
  list: #1681 `gear-sheet`, `portrait`; #1700 `masked-bake`; #1709
  `strip-made`; #1712 `foldToMono`; #1714 the equip redraw; #1733 `ui:*`;
  #1741 `sweepPicsOnce`; #1747 `body-bake` (5042 to 5049). Step 3.1's part
  is done: `pack-page` (card P's) is the one row left that is ours.
- #1762 (5050) sitting 5's loose ends on #1700, and why `masked-bake` grew
  back (card A: 23.7 ms): the whole tour's stuck kills refused addresses
  that had read (two whole tours after: none, 4.6 ms; `main` 18.6, 28.3).
- #1777 (5051) the page's own armour bake refuses a piece not readable
  (sitting 9; `worn-bake.test` §5, `tools/qa/belt-unreadable.mjs`). Its
  figure cut was withdrawn (its sheets are one frame each).

## Next

- Nothing: every PR of the card is on main (#1777 at sitting 10). Tags
  5052 to 5054 unused. The figure's 22 ms (below) waits for whoever takes it.

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
