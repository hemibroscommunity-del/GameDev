card: O
branch: claude/plan-o-2-governor (one branch a PR: claude/plan-o-<n>-<word>; PR 2 begun from PR 1's)
prs: PR 1 (5221, ready), PR 2 (5222, ready: after PR 1)
state: ready

## Done

- PR 1 (5221) `claude/plan-o-1-lanes`: the lane table and its reader
  (`src/game/drawLanes.js`), its guard and `docs/LANES.md`, the report's
  lane (`caps.report` 3, `reportlanes`), the worker's lists for the card;
  the wire row; the class asked at the join (card P's 18.4 ms hold).
  Deploys the worker.
- PR 2 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`. `questline`, `mp-steadypace`,
  `mp-speedtest` green; the held-sweep sample shows no hold of its own.

## Next

- PR 4 (5224), the rate's knob: (a) by the planning session's answer -- a
  fast screen's own steps stop at about 40, the rung moves a 60 screen.

## Found

- Shared lists (rule 3, TRAPS §333): PR 1 adds a line of its own to
  `server/src/liveops.js`'s header (`reportlanes`); rows in a block of their
  own in `tools/guards/lib/switches.mjs` (PR 1 `?lane`, `reportlanes`; PR 2
  `?govern`); `drawLanes` in `device` (`tools/guards/lib/systems.mjs`);
  PR 2 a row of its own in `src/state/phases.js` (`ladder`).
- A `light` lane by facts (step 1.3) needs 20 reports or more from each of
  two classes that differ only in a fact a lane can read (say `mp` 3 and 9,
  the same `gl`, `soft`, `hz`), their `late` apart by more than a few points.
- No one field says a window covers the world (the phase table's `window`
  row is todo): pixels move at a loading screen or a tab's return only.
- Card L: the `ladder` row's `reset` is "kept: the device's, not the
  zone's" once L's `reset` column lands; its ledger `lifetime` is `sitting`.
- Card M: the frame still measured by two clocks (BUDGETS #5) and "in play"
  asked four ways (#7): untouched.
- The QA box: React's redraw (`R > J`) holds the page 12 to 17 ms in the
  held sweep's `town`, on `main` too; one run of two counted it (noise).

## Needs

- (none) PR 1 merged before PR 2 (PR 2 is begun from it).
