card: H
branch: claude/grand-plan-h-1-worker-restart (one branch a PR, each begun from the one before, as W's are: merge them in order)
prs: PR 1, the worker's restart, on the branch above (ready; its number goes here with PR 2's commit, to spare a paid run)
state: ready

## Done

- PR 1 (v2.3.5040), the worker's restart: `bodyBake.js`'s watch counts
  only visible time; a worker let go is started again once each time the page
  comes back. `mp-bodyworker` 6 freezes the page and its workers 25 s with a
  job waiting: red on main (every worker let go, never started again), green
  after; the whole test 97 of 97.

## Next

- PR 2 (tag 5041), whose row: `whose` on every row of `KNOWN`.

## Found

- `src/rendering/stripRead.js`: its 20 s clock (`READ_MS`) is a timer a read
  on the wall's clock. Back from a freeze of 20 s with a strip asked, that
  ONE strip is unpacked on the page and the worker's late answer is thrown
  away; the worker itself is kept, so it is not PR 1's fault ("for the rest of
  the sitting"). Its `_dead` after a worker's `onerror` is for the rest of
  the sitting, with no restart.

## Needs

- Nothing.
