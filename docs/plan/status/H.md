card: H
branch: claude/grand-plan-h-5-strip-made (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681 (merged), #1700 (ready: sitting 2's hold answered), PR 5 on the branch above (ready; its number goes here with PR 6's commit)
state: ready

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait` off the list (the Equipment screen's figure).
- #1700 (5043) `masked-bake` off the list: a frame of an image goes to the
  bake's worker as its address; 7.7 ms. Sitting 2's hold answered: every
  exit of a job lets its sheets go (`jobDone`), keep 4 sheets / 4 MB,
  `keptMB` reported, a `MEMORY-MAP.md` row; 31 of 31 inputs the same.
  Its merge deploys the worker (the picture door's list).
- PR 5 (5044) `strip-made` off the list: a strip numbered for its row on the
  reader's worker (`stripRows.js`): 1000 of 1000 made-up strips the page's
  rule, 35 of 35 in play; town 34 holds -> 11. Its merge deploys the worker
  (strip-door.test). Stacked on #1700: merge that first.

## Next

- PR 6 (tag 5045), `foldToMono` (20 ms). The `body-bake` PR (last) also
  takes Z's two finds on #1668: a hung worker restarted at every return;
  `BT_BW_PARTS` typos.

## Found

- `stripRead.js`: its 20 s clock (`READ_MS`) is wall time: after a 20 s
  freeze one strip is unpacked on the page. `_dead` after `onerror`: no restart.
- `pack-page` (card P's): 17 to 35 ms at `armour` against its 20 ms line.
- `mp-heldsweep.mjs` FAMILIES: a hold is named by the first family on its
  stack (the figure read as `gear-sheet` or `body-bake`).
- `entityRenderer.js`: the masked bake's worker let go as stuck 3 times in a
  2-player minute, with or without #1700 (`_BAKE_STUCK_MS` 6 s).
- `wheelGround.js` `_sprite` (ground pieces made and uploaded as you ride):
  up to 14.3 ms, twice over the general line in two of six runs; unlisted.

## Needs

- Nothing.
