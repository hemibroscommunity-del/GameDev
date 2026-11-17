# The ride door (card L PR 5, grand plan step 5.3b; v2.3.5523)

`server/src/ride.js` (`_rideTo`, `RIDE_WAYS`, `_rideDoorOff`); held by
`server/test/ride-door.test.mjs` and the phase table's guard (the `ride` row
on the worker). The skateboard itself is in `ride.js`'s head.

## What it is

The skateboard is one field on a player, `ps._ride`: off or on. The session
it tells, `ps._ridePid`, is written beside it, never alone. Two places wrote
them in `ride.js`; now only `_rideTo` does, by a way of `RIDE_WAYS`:

| way | caller | to |
|---|---|---|
| `board` | `_handleRide` (a get-on the refusals passed) | on, telling its session |
| `end` | `_rideEnd` (every end: asked, edge, zone, dead, hit, fight, duel, off) | off |

- **No join or load way**: nothing is stored, and a join is off the board
  (the phone clears its own copy: the ride slot's why in `REJOIN_SLOTS`).
- Every end already went through `_rideEnd` (combat.js's hit, duel.js's
  start, index.js's death, movement.js's moves, index.js's fighting
  messages): they are unchanged.

## Step 1: nothing a player sees changes

The door's rules are the callers' own checks: a board is taken only by the
living, with a session to tell (`_rideRefusal` answers `dead` first); an end
is only of a ride that is on (`_rideEnd` returns first when not). `ride`,
`sprint`, `movement` and `tick-share` pass unchanged.

## The switch

`ridedoor: false` in the live flags lifts the rules, as the lines before the
door. Its row is in card T's switch table. The skateboard's own switch,
`ride: false`, is unchanged.

## What the test fails

- §1: the door's rules and the switch.
- §2: a write of `._ride` or `._ridePid` anywhere in `server/src` outside
  `_rideTo`; each way at its caller.
- §3 and §4: the real room: on, off, a hit, a death, a step off the safe
  ground; the handler's refusals (`where`, `busy`, `dead`, `off`, `soon`)
  still answer first.
