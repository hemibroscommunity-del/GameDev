card: S
branch: claude/plan-s-shapes (PR 1); claude/plan-s-budgets (PR 2, holds PR 1)
prs: #1666 (ready), PR 2 (ready; its number is in the PR list)
state: ready

## Done

- PR 1 (tag 5025): `docs/SHAPES.md`. The actor, ids (`stint`, `reqId`,
  `principal`; a weapon's `gid`), the roads' four classes, the report's
  fields and sinks, the wire's columns, the device class, the rest of
  pillars 1, 4, 10 and 11, and the names checked free.
- PR 2 (tag 5026): `docs/BUDGETS.md`. Seven shared things, each with its
  line, file and controllers; 16 second controllers in its part 8.

## Next

- Nothing: both PRs wait for the gatekeeper.

## Found

- `window.__btPace` is set twice (`src/ui/onboardingPace.js:178`, then the
  pacer's `src/ui/BroTown.jsx:4880`); `harness.mjs:659` reads the first's.
- The perf sample's `others` is a map's `.length`: always 0
  (`src/game/renderFrame.js:97`).
- The cape's opId uses `S.playerId`, which nothing sets
  (`src/ui/panels/InventoryPanel.jsx:583`). Three phone opIds are stamped
  in `oplog:` as room-wide keys (`dailyrewards.js:622`, `dailychest.js:107`,
  `eventcapes.js:553`); `loginspin_go`'s is never read.
- The crash road drops the phone's `sha` and `gl` (`server/src/feedback.js:79`).
- `server/src/leave.js:153` says botstat goes every 30 s; it is 300 s
  (`server/src/botfp.js:179`).

## Needs

- Card B: the guards of rule 2 and rule 6 (`docs/SHAPES.md` part 10,
  `docs/BUDGETS.md` part 9).
- The owner, one question: where a per-player count the world's sums read
  is kept (`docs/SHAPES.md` part 7, "Open"): a second named field on the
  `rpg:` record (no new rows; bends handoff rule 1), or a sibling record
  in the same put (one more row every save). Card E meets it first.
