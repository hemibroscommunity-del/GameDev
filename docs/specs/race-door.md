# The race door (v2.3.5217)

`server/src/race.js` (`_raceTo`, `RACE_WAYS`); held by
`server/test/race-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree). Card L PR 5's eighth worker door, after the trade, duel, party,
cook, harvest, dungeon and pose doors. The race itself is Lil Bro's lap of
the square (v2.3.3525, the tour's `race_1`).

## What it is

- **One field.** `ps._race`: the race on (its record), or none. The
  countdown and the running are times on the record, not phases of their
  own: `t0` is the gun, and `endBy` is Lil Bro's time plus the grace.
- **One writer.** `this._raceTo(ps, race, way)`. Each way in `RACE_WAYS`:
  - `start`: the record (`_handleRaceStart`, at Lil Bro's spot);
  - `end`: none (`_raceEnd`: the finish, won or lost; late; a false start;
    a death or a leave of the Wheel, at the next move).
- **No join way.** "A race lost to a reconnect is a race run again": the
  join makes the body afresh.
- **The door's rule**: a race on carries its gun and its deadline after it,
  so the next move can always end it ('late').
- **As before**: a start over a race already on replaces it (the start's
  own `soon` spaces two starts); an end of no race writes none, as the old
  line did.

## Step 1: nothing a player sees changes

Every start builds its record with both times, and the start's own refusals
(no `race_1`, too far, outside the Wheel, too soon) still answer first and
write nothing. `tour`, `ride`, `safe-heal`, `move-claims` and
`refusal-door` pass unchanged.

## The switch

`racedoor: false` in the live flags writes any record a caller asks, as the
old line would have. It never lets an end carry a record, or an unknown way
through. The worker's row is in card T's switch table.

## What the test fails

- a write of `._race` anywhere in `server/src` but `_raceTo` (an assignment
  of any kind, an update, a `delete`, an `Object.assign`, a destructuring
  target; the guard reads the tree for the rest);
- a way with no caller, or a caller of a way the table has not got;
- a race without its gun or its deadline getting through the door.

It plays the race through the real room, in the Wheel: the start's
refusals, a start and its record, a second start too soon and one past the
gap, and every end the next move makes (late, a false start, a death, a
leave of the Wheel); and a move before the gun writes nothing.
