# The duel door (v2.3.5211)

`server/src/duel.js` (`_duelTo`, `DUEL_WAYS`); held by
`server/test/duel-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree). Card L PR 5's second worker door, built as the trade door was
(`docs/specs/trade-door.md`).

## What it is

- **One field.** A duel's phase is `d.status`. It is born `'active'` in
  `_makeDuel` (its literal). A social duel's accept and the arena's match
  both make their record there, and neither passes a status of its own.
- **One writer.** `this._duelTo(d, to, way)`. There is one way, `resolve`,
  to `'resolved'`, and it runs through `_resolveDuel` alone:
  - a clean kill or a death (`_duelOnDeath`);
  - a forfeit when the away clock runs out (`_tickDuels`);
  - the time running out (`_tickDuels`).
  An arena match ends the same way, and `_resolveDuel` tells its bracket.
- **The end is final.** A resolved duel stays resolved.
- **A challenge is not a duel.** It is a key of `_duelChallenges`, with its
  own TTL (`DUEL.CHALLENGE_TTL`).
- **Away is not a phase.** It is a per-player clock on an active duel
  (`d.away[pid]`, `DUEL.GRACE_MS`). A leave starts it; it does not end the
  duel.

## Step 1: nothing a player sees changes

The one old line wrote over `'active'` only, behind `_resolveDuel`'s
double-resolution guard. That guard stays, because it decides the pot. The
suite plays every way a duel ends through the real room, and a second
resolve still sends nothing.

## The switch

`dueldoor: false` in the live flags lets `_duelTo` write over a resolved
duel, as the old line would have. It never lets the way go to another
phase. The worker's row is in card T's switch table.

## What the test fails

- a write of `.status` anywhere in `server/src` but `_duelTo`, beside
  `NOT_A_DUEL`'s (an alliance war's and a clan war's end, an arena
  tournament, the old Arena object's tournament);
- a stale `NOT_A_DUEL` entry;
- a duel born active anywhere but `_makeDuel`, or the arena passing a status
  of its own;
- the old line not through the door.
