card: O
branch: claude/plan-o-2-governor (one branch a PR: claude/plan-o-<n>-<word>; PR 2 begun from PR 1's)
prs: #1787 (5221, ready), PR 2 (5222, ready: after #1787)
state: ready

## Done

- #1787 (5221) `claude/plan-o-1-lanes`: the lane table and its reader
  (`src/game/drawLanes.js`), its guard, `docs/LANES.md`, the report's lane
  (`caps.report` 3, `reportlanes`), the worker's lists for the card, the
  wire row, the class asked at the join (card P's 18.4 ms). Deploys.
- PR 2 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`; the held-sweep sample shows no
  hold of its own. Deploys (server tests).

## Next

- PR 4 (5224), the rate's knob: (a) by the planning session's answer -- a
  fast screen's own steps stop at about 40, the rung moves a 60 screen.

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

- (none) #1787 merged before PR 2 (PR 2 is begun from it).
