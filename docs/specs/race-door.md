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

## The page (v2.3.5218)

`src/game/raceDoor.js` (`raceTo`, `RACE_PAGE_WAYS`, `racePhase`); held by
`server/test/race-page-door.test.mjs` and the phase table's guard (the
`race` row on the page). The phone's copy of the race is one field,
`S._race`: none, or its record, whose own `phase` goes `asked` (the phone
asked), `count` (the worker's `race_state`: the countdown), `run` (the gun)
and `done` (the worker's `race_end`: the result card). `game/race.js` wrote
it in eight places; now only `raceTo` does, by a way of `RACE_PAGE_WAYS`:

| way | caller in `game/race.js` | to |
|---|---|---|
| `ask` | `requestRace` | a record `{phase: 'asked'}` |
| `fail` | `requestRace` (the ask could not be sent) | none |
| `state` | `onRaceState` | a record `{phase: 'count', ...}` |
| `gun` | `raceTick` at `t0` | the record's phase, count to run, in place |
| `end` | `onRaceEnd` | a record `{phase: 'done', ...}` |
| `dismiss` | `dismissRace` (the card closed) | none |
| `timeout` | `raceTick` (an ask unanswered; a race never heard the end of) | none |
| `forget` | `forgetRace` (the rejoin's reset) | none |

- **The rules are `race.js`'s own checks**, so nothing a player sees
  changes: an ask only while no race is live, the gun only from the
  countdown, a dismiss only of the card, a timeout only of an ask or a run,
  and a record only of its own way's phase. `?racedoor=0` lifts them (its
  row is in card T's table).
- **Not folded**: Lil Bro's run (`S._raceLil`, `raceDriveNpc`'s drawing of
  him), which outlives the race until he is home; the flags touched and the
  countdown's beat, counts on the record.
- **A module of no imports**, so a node test reads its rules; `race.js`
  imports it. The suite also loads `race.js` itself, its `@/` imports
  resolved to `src/` by a resolve hook, and plays every way through it.
- **The rejoin's reset asks the door.** `forgetRace` clears the race by
  `raceTo(S, null, 'forget')`. The state census counts a reset's call of a
  page field's own door as its write (`state-census.mjs resetsFound`), and
  `state-resets.test` gives a rebuilt reset the real door.
