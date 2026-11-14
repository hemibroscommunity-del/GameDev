# The dungeon door (v2.3.5215)

`server/src/dungeon.js` (`_dungeonTo`, `_dungeonPhase`, `DUNGEON_WAYS`,
`DUNGEON_PHASES`); held by `server/test/dungeon-door.test.mjs` and the phase
table's guard (`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES`
line, read off the syntax tree). Card L PR 5's sixth worker door, after the
trade, duel, party, cook and harvest doors.

## What it is

A run's phase was two fields: `inst.state` ('active', then 'done') and the
boolean beside it, `inst.bossSpawned`. CLAUDE.md §5: a phase lives in one
field, never a second boolean beside the first. So, as the life door did
(v2.3.4820):

- **One field.** `inst.runPhase`: `active` (its waves), `boss`, `done`.
- **One writer.** `this._dungeonTo(inst, to, way)`. Each way in
  `DUNGEON_WAYS`:
  - `boss`: the boss comes (`_dungeonSpawnBoss`);
  - `clear`: the run is won (`_dungeonComplete`).

  A run is born `active` in `_handleDungeonStart`.
- **The old pair, for their readers.** The door writes `state` 'done' at
  the end and `bossSpawned` true at the boss. Every reader reads what it read
  before: `state` stays 'active' all through the boss (the start's "already
  running", `slime-boss.test`'s "the run waits for it"), and the tick still
  reads `bossSpawned`. No reader changes.
- **A run made by hand** (a test's, or one from before the door) has no
  `runPhase`: `_dungeonPhase` reads it from the old pair.
- **The door's rules**: the end is final, and the boss comes once, after
  the waves.
- **Not phases**: the wave (`inst.wave`, a count), the empty clock
  (`emptySince`), and the run's place in `this._dungeons` (born at the start,
  gone at `_dungeonCleanup`). A player is in a run by their place
  (`_dungeonZonePlayers`), with no field of their own.

## Step 1: nothing a player sees changes

The tick asks for a boss only while the run has none and is not done, and
for the clear only while it is not done. So the door's rules refuse nothing
today. The dungeon suites (`dungeon`, `dungeon-clear`, `dungeon-reward`,
`dungeon-live`, `slime-boss`, `wheeldungeon`, `grotto-party`, `duel-zone`,
`mayor-dungeon`, `mayor-grotto`, `dungeon-art`) pass unchanged.

## The switch

`dungeondoor: false` in the live flags lets a done run be written again and
a second boss come, as the old lines could have (the boss on a done run
writes only `bossSpawned`, as before; `state` stays 'done'). It never lets a
way go to the other phase. The worker's row is in card T's switch table.

## What the test fails

- a write of `.runPhase` or `.bossSpawned` anywhere in `server/src`, or of
  `.state` in the dungeon's own files (`dungeon.js`, `wheeldungeon.js`,
  `slimeboss.js`), outside `_dungeonTo`;
- a run born anywhere but `_handleDungeonStart`;
- a way with no caller, or a caller of a way the table has not got.

The trade door's guard line keeps its `inst.state` exception, now held to
`_dungeonTo` (`fn`). The suite also plays a real run through the room, in
the Wheel: born active, a wave, the boss, the clear, and a run with no boss.
