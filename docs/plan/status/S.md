card: S
branch: claude/plan-s-shapes
prs: PR 1, tag 5025, the shapes page (ready; its number is in the PR list)
state: ready

## Done

- PR 1 (tag 5025): `docs/SHAPES.md`. The actor, ids (`stint`, `reqId`,
  `principal`; a weapon's `gid`), the roads' four classes, the report's
  fields and two sinks, the wire's columns, the device class, the other
  shapes of pillars 1, 4, 10 and 11, and the names checked free.

## Next

- PR 2 (tag 5026): `docs/BUDGETS.md`, on `claude/plan-s-budgets`.

## Found

- `window.__btPace` is set twice: `src/ui/onboardingPace.js:178` and the
  pacer's `src/ui/BroTown.jsx:4880`, which overwrites it; QA's
  `harness.mjs:659` reads the onboarding's fields from it (not run).
- The perf sample's `others` reads `.length` of a map: always 0
  (`src/game/renderFrame.js:97`); the strip's `oth` never worked.
- The cape's opId uses `S.playerId`, which nothing sets, so it is
  `<key>:me:<ms>` (`src/ui/panels/InventoryPanel.jsx:583`). Three phone
  opIds are stamped in `oplog:` as room-wide keys (`dailyrewards.js:622`,
  `dailychest.js:107`, `eventcapes.js:553`). `loginspin_go`'s is ignored.
- The crash road drops the `sha` and `gl` the phone sends
  (`server/src/feedback.js:79`).
- `server/src/leave.js:153` says botstat is written every 30 s; the
  constant is 300 s (`server/src/botfp.js:179`).

## Needs

- Card B: the guards rule 2 asks for (`docs/SHAPES.md` part 10).
- The owner, one question: where a per-player count the world's sums read
  is kept (`docs/SHAPES.md` part 7, "Open"): a second named field on the
  `rpg:` record (no new rows; bends handoff rule 1), or a sibling record
  in the same put (one more row every save). Card E meets it first.
