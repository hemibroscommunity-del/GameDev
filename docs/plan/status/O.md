card: O
branch: claude/plan-o-4-rate (one branch a PR: claude/plan-o-<n>-<word>; each begun from the one before)
prs: #1787 (5221, ready), PR 2 (5222, ready: after #1787), PR 4 (5224, ready: after PR 2)
state: ready

## Done

- #1787 (5221) `claude/plan-o-1-lanes`: the lane table and its reader
  (`src/game/drawLanes.js`), its guard, `docs/LANES.md`, the report's lane
  (`caps.report` 3, `reportlanes`), the worker's lists for the card, the
  wire row, the class asked at the join (card P's 18.4 ms). Deploys.
- PR 2 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`. Deploys (server tests).

## Next

- PR 4 (5224) `claude/plan-o-4-rate`: the rate's knob (a 60 screen to a
  steady 30 at the rung; a fast screen as before: the planning session's
  (a)). Then PR 3 once PR 2 is merged; PRs 5 and 6.

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

- (none) Merged in order: #1787, PR 2, PR 4 (each begun from the one before).
