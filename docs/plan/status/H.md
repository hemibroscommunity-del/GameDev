card: H
branch: claude/grand-plan-h-9-picsonce (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681, #1700, #1709, #1712, #1714 (merged); #1733 (ready); PR 9 on the branch above (ready; its number with the next commit)
state: ready

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait` off (the Equipment screen's figure).
- #1700 (5043) `masked-bake`, #1709 (5044) `strip-made`, #1712 (5045)
  `foldToMono`, #1714 (5046) the equip redraw: off, sitting 4's holds
  mended, merged.
- #1733 (5047) `ui:*` off: the gear tab's cells components, the formatter
  readied at load; six runs, 9.9 ms the longest (13.4); geartab 122 of 122.
- PR 9 (5048) `sweepPicsOnce` off: the walk over Pixi's cache a slice a
  turn, the address read once and last; nine runs, 7.2 ms the longest but
  one shared 12.1 (23.9 before).
- The Leaderboard's faces (the gatekeeper's ask): `g-boards`, 32 faces,
  9.7 ms the longest (PR 9's spec section).

## Next

- `body-bake` (5049), the card's last, with Z's #1668 finds (a hung worker
  restarted each return; `BT_BW_PARTS`). `pack-page` is card P's.

## Found

- `stripRead.js`: `READ_MS` (20 s) is wall time; `_dead` has no restart.
  Bake worker stuck ~3/min here; `wheelGround.js` `_sprite` 14.3 ms.
- `pack-page` (card P's): over its line at `armour` in 4 of 6 runs, to
  42.5 ms (once inside a React render, named `R > J`).
- `other: wrapped` (`perfTracker.js`'s timer wrapper, its own time): over
  the line in 5 of ~40 runs (19.6 ms); the sweep should look inside it.
- `gear-sheet` again once: 22.4 ms at `armour` (`composeShirt` of the WHOLE
  upscaled shirt strip for the portrait's one frame): crop it first.
- `QuestCoach > loadDone` 23.3 ms once at `town` (measures the page).

## Needs

- Nothing.
