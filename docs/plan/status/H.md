card: H
branch: claude/grand-plan-h-2-whose-row (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: #1668 (ready), PR 2 whose row on the branch above (ready; its number goes here with PR 3's commit, to spare a paid run)
state: ready

## Done

- #1668 (v2.3.5040), the worker's restart: `bodyBake.js`'s watch counts
  only visible time; a worker let go is started again once each time the page
  comes back. `mp-bodyworker` 6: red on main, green after; 97 of 97.
- PR 2 (v2.3.5041), whose row: every row of `KNOWN` says `whose` (10 ours,
  2 the box's, 1 the browser's); `debtOf('ours')` is step 3.1's count; the
  spec's table lists all thirteen; `held-sweep.test` 7b2 to 7b4, each with a
  break proof. Touches `server/test/`: its merge deploys the worker.

## Next

- PR 3 (tag 5042), `gear-sheet` (195 ms): the stations that measure it,
  three runs.

## Found

- `src/rendering/stripRead.js`: its 20 s clock (`READ_MS`) is a timer a read
  on the wall's clock. Back from a freeze of 20 s with a strip asked, that
  ONE strip is unpacked on the page and the worker's late answer is thrown
  away; the worker itself is kept, so it is not PR 1's fault ("for the rest of
  the sitting"). Its `_dead` after a worker's `onerror` is for the rest of
  the sitting, with no restart.

## Needs

- Nothing.
