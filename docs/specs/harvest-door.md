# The harvest door (v2.3.5214)

`server/src/gathering.js` (`_harvestTo`, `HARVEST_WAYS`); held by
`server/test/harvest-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree; since this door, a line marked `keyed` counts a write of one of
the field's keys). Card L PR 5's fifth worker door, after the trade, duel,
party and cook doors. **Fishing's row is the same door**: a fish is a gather
record with skill `fishing` (the phase table's note: "a door for harvest is
fishing's too").

## What it is

- **One field.** A player's gather record, `this.extractions[pid]`: none,
  or started (mining, woodcutting and fishing alike). The window opening is a
  time on the record (`openDelayBase`, or the hits' plan), not a phase; a
  strike ends it, paid or not.
- **One writer.** `this._harvestTo(pid, rec, way)`. Each way in
  `HARVEST_WAYS`:
  - `start`: the record (`_handleExtractionStart`);
  - `strike`: none, once a strike resolves (`_handleNodeStrike`);
  - `end`: none, when the gatherer attacks (a swing, a PvP strike) or
    casts (an ability, an arrow blast, an element burst) (`_endExtraction`;
    a stuck arrow's late chip keeps it, `keepRecord`);
  - `sweep`: none, past `EXTRACTION_TIMEOUT_MS`
    (`_sweepStaleExtractions`, on the tick).

  The first takes the record; the others take `null`. A way to none of no
  record writes nothing.
- **No leave way.** The record outlives its socket on purpose (`leave.js`,
  v2.3.3322): the phone replays a strike its dropped socket ate.
- **The door's one rule**: a started record carries its start, a finite
  `startedAt`. The sweep reads `e.startedAt < cutoff`, which is false for a
  record without one, so such a record would stand forever.
- **Not folded here**: a cook keeps no record (`_planCookHits`): its phase is
  the phone's claim, the cook door (`movement.js _exTo`, v2.3.5213).
  `_extractionShielded` and `botsig.js` only read the record.

## Step 1: nothing a player sees changes

Every record the start builds has its `startedAt` (`Date.now()`). Every way to
none deleted a record before, or did nothing when there was none, and still
does. A strike too early still keeps the record. The gathering suites pass
unchanged.

## The switch

`harvestdoor: false` in the live flags writes a record without its start,
as the old line would have. It never lets a way to none take a record. The
worker's row is in card T's switch table.

## What the test fails

- a write of `this.extractions` or one of its keys anywhere in `server/src`
  but `_harvestTo` and its birth (the room's constructor, an empty map);
- a stale birth;
- a way with no caller, or a caller of a way the table has not got.

It plays every way through the real room, in the Wheel: a mining start and a
strike too early (kept), then in its window (paid, ended); a fishing start
and its paid strike; a chop ended by an attack, and kept by a late chip; the
sweep on either side of its time; a closed socket (kept); and a cook's ask
(no record).
