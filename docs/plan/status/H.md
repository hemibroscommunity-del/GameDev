card: H
branch: claude/grand-plan-h-8-ui (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681 (merged); #1700, #1709, #1712 (sitting 4's holds mended: ready); #1714 (ready); PR 8 (working)
state: working

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait` off (the Equipment screen's figure).
- #1700 (5043) `masked-bake` off. Sitting 4: `main` in; the page's side in
  `bakeByAddress.js` (`four-lines`); a job's reads started together; what
  is still being read when the worker is stuck refused; sheets let go 15 s
  after the last job. Probe: 11 of 11 the same. Deploys.
- #1709 (5044) `strip-made` off. Sitting 4: rows the page changes make the
  waiting plans stale (`strip-door` 4l); the ride: 35 of 35. Deploys.
- #1712 (5045) `foldToMono` off. Sitting 4: the game's fold in
  `soundFold.js` (`four-lines`); a mono sound never waits (4g). Deploys.
- #1714 (5046) the equip redraw `other: R > J` off. Client only.
- PR 8 (5047) `ui:*` off: the gear tab's cells components, the formatter
  readied at load; six runs, 9.9 ms the longest (13.4 before).

## Next

- Sitting 4: #1714 (`main` in), then PR 8 opened. Then `sweepPicsOnce`
  (5048), `body-bake` (5049, + Z's #1668 finds).

## Found

- `stripRead.js`: `READ_MS` (20 s) is wall time; `_dead` has no restart.
- `pack-page` (card P's): 17 to 35 ms at `armour` against its 20 ms line.
- `other: wrapped` (`perfTracker.js`'s timer wrapper, its own time): over
  the line in 5 of ~40 runs, 19.6 ms the most; the sweep should look inside.
- `gear-sheet` again once: 22.4 ms at `armour` (`composeShirt` of the WHOLE
  upscaled shirt strip for the portrait's one frame): crop it first.
- The Leaderboard's faces (a step at a time since #1681): to measure
  (`g-boards`), as the gatekeeper asks.
- Masked bake worker let go as stuck ~3/min on this box; `wheelGround.js`
  `_sprite` up to 14.3 ms, unlisted.

## Needs

- Nothing.
