# The zone door (card L PR 5, grand plan step 5.3b; v2.3.5537)

`server/src/zonejudge.js` (`_zoneTo`, `ZONE_WAYS`, `_zoneDoorOff`); held by
`server/test/zone-door.test.mjs` and the phase table's guard (the `zone` row
on the worker). The page's half is the zone door of `zoneTransitions.js`.

## What it is

A player's place on the worker is one field, `ps.z` (the Wheel, town, the
farm, a run's `dungeon:<id>`). Four places wrote it by hand; now only
`_zoneTo` does, by a way of `ZONE_WAYS`:

| way | caller | to |
|---|---|---|
| `move` | `movement.js _handleMove` (the zone the move's judge let through, or the one it stays in) | the move's place |
| `respawn` | `index.js _tickPlayerRespawn` | town |
| `standup` | `join.js _handleJoin` (a join of a body left dead, stood up) | town |
| `spar` | `spar.js` (the sparring clone set beside its owner) | its owner's place |

- **The fresh body's place is its birth** (`join.js`'s new record, the
  join's cleaned data); a kept body keeps its own. Copies of the place onto
  other records (the join's data, the near-join lists, the tick's entries,
  the clone's birth) are not a player's: the phase table's `besides`.
- **Each caller still asks the duel after its write** (`_duelZoneMoved`),
  and the move still uses a run's pass (`_zonePassUse`): unchanged.

## Step 1: nothing a player sees changes

The door's one rule is a place that is a zone (`movement.js _validZone`):
every caller already wrote one (the move's judge drops a place that is none
before any write; the others write town or the owner's place).

## The switch

`zonedoor: false` in the live flags lifts the rule, as the lines before the
door. Its row is in card T's switch table. The judge's own switch,
`zonejudge: false`, is unchanged.

## What the test fails

- §1: the door's rules and the switch.
- §2: a write of a player's `.z` anywhere in `server/src` outside
  `_zoneTo`; each way at its caller.
- §3: the real room: a move in its own zone, a move naming no zone (no
  write), a respawn into town.
