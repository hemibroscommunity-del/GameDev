card: O
branch: claude/plan-o-1-lanes (one branch a PR: claude/plan-o-<n>-<word>)
prs: PR 1 (5221, ready)
state: ready

## Done

- PR 1 (5221): the lane table and its reader (`src/game/drawLanes.js`), its
  guard and `docs/LANES.md`, the report's lane (`caps.report` 3,
  `reportlanes`), the worker's lists for the whole card (lanes, programs,
  `rung`); the wire table's `report` row gains `speed`, `rung`, `self`; the
  device class's chip facts asked at the join, behind the loading screen
  (card P's `wrapped > _poll > _due`, 18.4 ms). Deploys the worker.

## Next

- PR 2 (5222), the governor, on `claude/plan-o-2-governor` (begun from this
  branch: merge PR 1 first).

## Found

- Shared lists (rule 3, TRAPS §333): PR 1 adds a line of its own to
  `server/src/liveops.js`'s header (`reportlanes`), two rows in their own
  block of `tools/guards/lib/switches.mjs` (`?lane`, `reportlanes`), and
  `drawLanes` to the `device` system of `tools/guards/lib/systems.mjs`.
- A `light` lane picked by facts (step 1.3) needs two device classes that
  run differently: 20 reports or more from each, from at least two classes
  that differ only in a fact a lane could read (say `mp` 3 against 9 with the
  same `gl`, `soft` and `hz`), with `late` apart by more than a few points.

## Needs

- (none) The planning session allowed, 2026-11-14: `shapes-once.test.mjs`
  `NAMES.drawLane.where`; the wire table's `report` row.
