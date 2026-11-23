card: CT
branch: claude/plan-ct-1-rules
prs: PR 1 (6540, ready)
state: ready

## Done
- PR 1 (6540): the three rules (stickZones, sight, latch), their suites,
  the phase rows, the ledger rows, mode 5 in manualMode, the switch rows.

## Next
- PR 2 (6541): the left stick in mode 5 (turn and walk, the ring).

## Found
- `manual-combat.test` 1h pinned `?manual=5` as no switch: now `6` (its
  one line, the nearest suite).

## Needs
- Files outside the card's list that PR 1 needed, mechanically: the three
  door lines in `tools/guards/phase-table.test.mjs` (DOOR_SUITES: a door
  row is refused without one); the three new files in `input` in
  `tools/guards/lib/systems.mjs` (and `docs/SYSTEMS.md`, made from it);
  `src/game/switches.js` and `docs/SWITCHES.md` (made by the switch table's
  `--write`). Asked of the orchestrator once, with PR 1.
- Readings the card does not fix, chosen behind `?manual=5` (asked once):
  the dead zone is 12% of the travel (a tap that wiggles past 4.5 px turns
  the body for that moment; the tap still acts as a tap); "nearest the
  facing's line" read as the least ANGLE off it; Block and the specials
  stay 400 ms after the last sighting; the one sighted keeps it to 55
  degrees off the facing; the walk starts from standing at the border
  (WALK_FLOOR 0, as today's stick rises from 0).
