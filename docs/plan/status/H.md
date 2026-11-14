card: H
branch: claude/grand-plan-h-3-gear-sheet (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668 (ready), #1675 (ready), PR 3 on the branch above (ready; its number goes here with PR 4's commit)
state: ready

## Done

- #1668 (tag 5040), the worker's restart: the watch counts only visible
  time; a let-go worker restarts once a return. `mp-bodyworker` 6: red on
  main, green after; 97 of 97.
- #1675 (tag 5041), whose row: `whose` on every row of `KNOWN`; spec table;
  `held-sweep.test` 7b2 to 7b4. Its merge deploys the worker.
- PR 3 (tag 5042), `gear-sheet` and `portrait` off the list: what was left
  of both was the Equipment screen's figure (`characterPortrait.js`), now a
  step at a time in play with the body kept and witnessed. Sample: peer and
  armour x3, crowd b-fish to d-prints x4. One fix earned both lines, so the
  card's `portrait` PR is this one; PR 4 is `masked-bake`.

## Next

- PR 4 (tag 5043), `masked-bake` (24 ms): one hold of 32.7 ms at `armour`
  seen in PR 3's runs.

## Found

- `src/rendering/stripRead.js`: its 20 s clock (`READ_MS`) is wall time:
  after a 20 s freeze with a strip asked, that one strip is unpacked on the
  page (the worker is kept). Its `_dead` after `onerror` has no restart.
- `pack-page` (card P's): 17 to 35 ms at the main tour's `armour` against
  its 20 ms line, in most runs of PR 3's sample (`getImageData` in
  `packTrimmedSliced`). Not touched.
- `tools/qa/mp/mp-heldsweep.mjs` FAMILIES: a hold is named by the first
  family on its stack, so the figure read as `gear-sheet` or `body-bake`.

## Needs

- Nothing.
