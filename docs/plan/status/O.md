card: O
branch: claude/plan-o-1-lanes (one branch a PR: claude/plan-o-<n>-<word>)
prs: PR 1 (5221, working)
state: working

## Done

- (none merged yet)

## Next

- PR 1 (5221): the lane table and its reader (`src/game/drawLanes.js`),
  its guard and `docs/LANES.md`, the report's lane (`caps.report` 3,
  `reportlanes`), the worker's lists for the whole card (lanes, programs,
  `rung`). Its merge deploys the worker (it touches `server/`).

## Found

- Shared lists (rule 3, TRAPS §333): PR 1 adds a line of its own to
  `server/src/liveops.js`'s header (`reportlanes`), two rows in their own
  block of `tools/guards/lib/switches.mjs` (`?lane`, `reportlanes`), and
  `drawLanes` to the `device` system of `tools/guards/lib/systems.mjs`.
- Card N: the wire table's `report` row (`server/src/wire/in.js`) lists no
  `speed` (card A's), and will list no `rung` or `self` (card O's).
- A `light` lane picked by facts (step 1.3) needs two device classes that
  run differently: 20 reports or more from each, from at least two classes
  that differ only in a fact a lane could read (say `mp` 3 against 9 with the
  same `gl`, `soft` and `hz`), with `late` apart by more than a few points.

## Needs

- The planning session: `tools/guards/shapes-once.test.mjs`
  `NAMES.drawLane.where` = `'src/game/drawLanes.js'` (the guard asks for it
  the day `drawLane` is defined; outside the card). Asked 2026-11-14.
