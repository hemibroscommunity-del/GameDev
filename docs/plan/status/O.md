card: O
branch: claude/plan-o-2-governor (one branch a PR: claude/plan-o-<n>-<word>; PR 2 begun from PR 1's)
prs: PR 1 (5221, done, not pushed: waits on Needs), PR 2 (5222, done, not pushed)
state: working

## Done

- PR 1 (5221) `claude/plan-o-1-lanes`: the lane table and its reader
  (`src/game/drawLanes.js`), its guard and `docs/LANES.md`, the report's
  lane (`caps.report` 3, `reportlanes`), the worker's lists for the card.
  Server suite, `questline` and `mp-speedtest` green. Deploys the worker.
- PR 2 (5222) `claude/plan-o-2-governor`: the governor (the pacer, grown),
  its model (30, 60, 120), `mp-governor`. `questline`, `mp-steadypace`,
  `mp-speedtest` green; the held-sweep sample shows no hold of its own.

## Next

- Push PRs 1 and 2 once Needs is answered; then PR 4 (the rate's knob).

## Found

- Shared lists (rule 3, TRAPS §333): PR 1 adds a line of its own to
  `server/src/liveops.js`'s header (`reportlanes`); rows in a block of their
  own in `tools/guards/lib/switches.mjs` (PR 1 `?lane`, `reportlanes`; PR 2
  `?govern`); `drawLanes` in `device` (`tools/guards/lib/systems.mjs`);
  PR 2 a row of its own in `src/state/phases.js` (`ladder`).
- Card N: the wire table's `report` row (`server/src/wire/in.js`) lists no
  `speed` (card A's), nor `rung` or `self` (card O's).
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

- The planning session: `tools/guards/shapes-once.test.mjs`
  `NAMES.drawLane.where` = `'src/game/drawLanes.js'` (the guard asks for it
  the day `drawLane` is defined; outside the card). Asked 2026-11-14.
