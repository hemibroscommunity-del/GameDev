card: O
branch: claude/plan-o-5-pixels (one branch a PR: claude/plan-o-<n>-<word>; each begun from the one before)
prs: #1787 (5221), #1792 (5222), #1794 (5224), PR 5 (5225): ready, merged in that order
state: ready

## Done

- #1787 (5221) `claude/plan-o-1-lanes`: the lane table and its reader
  (`src/game/drawLanes.js`), its guard, `docs/LANES.md`, the report's lane
  (`caps.report` 3, `reportlanes`), the worker's lists for the card, the
  wire row, the class asked at the join (card P's 18.4 ms). Deploys.
- #1792 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`. Deploys (server tests).

## Next

- #1794 (5224) the rate's knob, (a); PR 5 (5225) the pixels' knob, (b): a
  quarter, then half, of the pixels drawn. Then PR 3 once #1792 is merged.
  PR 6 waits: the crowd cap is fixed in `entityRenderer.js` (H, TF).

## Found

- Shared lists (rule 3, TRAPS §333), each in a place of its own:
  `liveops.js`'s header (#1787 `reportlanes`); `switches.mjs` (#1787
  `?lane`, `reportlanes`; PR 2 `?govern`); `systems.mjs` (`drawLanes` in
  `device`); `src/state/phases.js` (PR 2, `ladder`).
- A `light` lane by facts (step 1.3) needs 20 reports or more from each of
  two classes that differ only in a fact a lane can read (say `mp` 3 and 9,
  the same `gl`, `soft`, `hz`), their `late` apart by more than a few points.
- No one field says a window covers the world (the phase table's `window`
  row is todo): pixels move at a loading screen or a tab's return only.
- Card L: the `ladder` row's `reset` is "kept: the device's" once L's
  `reset` column lands. Card M: two clocks (BUDGETS #5), "in play" four ways
  (#7), untouched.
- The QA box: React's redraw (`R > J`) holds 12 to 17 ms in the held sweep's
  `town`, on `main` too (noise: one run of two counted it).

## Needs

- (none) Merged in order: #1787, #1792, #1794, PR 5 (each begun from the one before).
