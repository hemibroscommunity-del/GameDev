# Card H: the debt list, ours first (step 3.1)

**Starts:** day one, beside W and S.
**Read:** `CLAUDE.md` (§7's laws); the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; step 3.1; `tools/qa/mp/held-budget.mjs`;
`docs/specs/held-sweep.md`; `docs/specs/body-bake-worker.md`.
**Tags:** 5040 to 5054, one a PR.
**Browser:** heavy. One sweep at a time.

## PRs, in order

1. **The worker's restart.**
   - Files: `src/rendering/bodyBake.js` (and `bodyBakeWorker.js` if it
     needs it), `tools/qa/mp/mp-bodyworker.mjs`,
     `docs/specs/body-bake-worker.md`.
   - Today a bake worker let go after 20 silent seconds is never started
     again, so a phone back from its lock screen may bake on the page for
     the rest of the sitting. The watch's clock counts only time the page
     is visible; a worker is started again once each time the page comes
     back.
   - Done when `mp-bodyworker` holds a page frozen past 20 s with a job
     waiting, red before the fix and green after.
2. **Whose row.**
   - Files: `tools/qa/mp/held-budget.mjs`, `docs/specs/held-sweep.md`,
     `server/test/held-sweep.test.mjs`.
   - Each row of `KNOWN` gets a field `whose`: `ours`, `box` or `browser`.
     `screen-check` and `the frame itself` are the box's; `gc` is the
     browser's; the other ten are ours. The spec's table lists all
     thirteen.
   - It touches `server/test/`: its merge deploys the worker.
3. **Then a family a PR, by its line's ms, largest first:**
   `gear-sheet` (195), `portrait` (40), `masked-bake` (24), `strip-made`
   (24), `foldToMono` (20), the equip redraw `other: R > J` (20), `ui:*`
   (16), `sweepPicsOnce` (16), `body-bake` (13). Each family's `next` in
   `held-budget.mjs` says what to do. A PR lowers its family's line, or
   takes the family off the list when it is under the general line.
   - `pack-page` (20) waits for the asset door (card P): skip it and say so.

## Readings chosen for you

- **Your files** are each family's own, wherever they are: most in
  `src/rendering/` (the two big renderers included: nobody else is in them
  yet), the fold in `src/data/soundFold.js`, the equip redraw and `ui:*`
  in the gear tab under `src/ui/`. Plus the phone scenario that proves the
  family, its spec, and `held-budget.mjs`.
- **The proof is a sample** (the owner's rule, CLAUDE.md §6): the stations
  that measure that family, three runs. Not both whole tours. Say so in
  the PR, and offer the full tour.
- **"In the `full` and the `light` lane"** (pillar 3) cannot be met yet:
  no lane exists. Today's default is the lane.
- **You lower your own lines** in `held-budget.mjs`, in the PR that earns
  it (the house rule). The gatekeeper lowers only pillar 5's size lines.
- `stripRead.js` has a 20 s clock of its own. If it has the same fault,
  write it under Found; it is not PR 1.

## Not yours

The pacer, the resolution and the look palette's choice
(`framePacer.js`, `renderRes.js`, `lookPaletteChoice.js`); other tests in
`tools/qa/mp/` (J).
