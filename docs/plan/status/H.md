card: H
branch: claude/grand-plan-h-8-ui (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668, #1675, #1681 (merged), #1700 (sitting 2's hold answered), #1709, #1712, #1714 (ready), PR 8 on the branch above (working)
state: working

## Done

- #1668 (5040) the worker's restart; #1675 (5041) whose row; #1681 (5042)
  `gear-sheet` and `portrait` off (the Equipment screen's figure).
- #1700 (5043) `masked-bake` off: an image's frame goes to the bake's worker
  as its address; 7.7 ms. Sitting 2's hold answered (`jobDone`, 4 sheets /
  4 MB, `keptMB`, a MEMORY-MAP row). Deploys.
- #1709 (5044) `strip-made` off: a strip numbered for its row on the
  reader's worker (`stripRows.js`); town 34 holds -> 11. Deploys.
- #1712 (5045) `foldToMono` off: the fold a stretch at a time, the same
  buffer (sound-fold.test 4); 13.4 -> 6.9 ms. Deploys.
- #1714 (5046) the equip redraw `other: R > J` off: the root re-rendered on
  every equip, now only on a worn flag's change, as a transition
  (`gearWornSync.js`); 17.5 -> 8.6 ms. Client only.

## Next

- PR 8 (5047) `ui:*`: the cells their own components, the formatter warmed;
  sample running. Then `sweepPicsOnce`, `body-bake` (+ Z's #1668 finds).

## Found

- `stripRead.js`: `READ_MS` (20 s) is wall time; `_dead` has no restart.
- `pack-page` (card P's): 17 to 35 ms at `armour` against its 20 ms line.
- `mp-heldsweep.mjs` FAMILIES names a hold by the first family on its stack;
  and `other: wrapped` is `perfTracker.js`'s timer wrapper (anonymous timer
  jobs, 10 to 19.6 ms in 8 of ~30 runs): the sweep should look inside it.
- `entityRenderer.js`: the masked bake's worker let go as stuck 3 times in a
  2-player minute, with or without #1700 (`_BAKE_STUCK_MS` 6 s).
- `wheelGround.js` `_sprite` (ground pieces uploaded as you ride): up to
  14.3 ms, over the general line in two of six runs; unlisted.

## Needs

- Nothing.
