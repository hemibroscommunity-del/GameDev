card: H
branch: claude/grand-plan-h-4-masked-bake (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668 (merged), #1675 (merged), #1681 (merged), #1700 (ready: the gatekeeper's hold answered)
state: ready

## Done

- #1668 (tag 5040, merged), the worker's restart. #1675 (tag 5041,
  merged), whose row.
- #1681 (tag 5042), `gear-sheet` and `portrait` off the list: both were the
  Equipment screen's figure, now a step at a time in play, its body kept and
  witnessed. One fix earned both lines (the card's `portrait` PR is this).
- #1700 (tag 5043), `masked-bake` off the list: a frame of an image goes to
  the bake's worker as its address. 33 of 33 inputs byte for byte; 7.7 ms.
  Its merge deploys the worker. Sitting 2's hold answered: every exit of a
  job lets its sheets go (`jobDone`), keep 4 sheets / 4 MB, `keptMB`
  reported, a `MEMORY-MAP.md` row; 31 of 31 again, 0.9 MB held at most.

## Next

- PR 5 (tag 5044), `strip-made` (24 ms): the strip's remap onto its row on
  the reader's worker. The `body-bake` PR (last) also takes Z's two finds
  on #1668: a hung worker restarted at every return; `BT_BW_PARTS` typos.

## Found

- `src/rendering/stripRead.js`: its 20 s clock (`READ_MS`) is wall time:
  after a 20 s freeze with a strip asked, that one strip is unpacked on the
  page (the worker is kept). Its `_dead` after `onerror` has no restart.
- `pack-page` (card P's): 17 to 35 ms at the main tour's `armour` against
  its 20 ms line, in most runs of PR 3's sample (`getImageData` in
  `packTrimmedSliced`). Not touched.
- `tools/qa/mp/mp-heldsweep.mjs` FAMILIES: a hold is named by the first
  family on its stack, so the figure read as `gear-sheet` or `body-bake`.
- `entityRenderer.js`: the masked bake's worker let go as stuck 3 times in
  a 2-player minute here, with or without PR 4 (`_BAKE_STUCK_MS` 6 s).

## Needs

- Nothing.
