# The ride's page door (card L PR 5, grand plan step 5.3b; v2.3.5530)

`src/game/ride.js` (`rideTo`, `ridePhase`, `RIDE_PAGE_WAYS`, `rideDoorOff`);
held by `server/test/ride-page-door.test.mjs` and the phase table's guard
(the `ride` row on the page). The worker's half is the ride door
(`server/src/ride.js` `_rideTo`, v2.3.5523).

## What it is

Your board on the phone is one record, `S._ride`; its phase is its `on`
(off, on: the worker's word, `ride_state`).

| way | caller | writes |
|---|---|---|
| `make` | `r0` (the record on first use) | a fresh record, off |
| `apply` | `rideApply` (the worker's `ride_state`) | `on` |
| `forget` | `clearRide` (a fresh join) | none |

The record's other numbers (the ask, the speed, the last step) are notes on
it, written by their own steps.

## Step 1: nothing a player sees changes

The rules are the callers' own (a record is made only where none is).
`?ridedoor=0` writes what a caller asks, as before; the worker's `ridedoor`
is its own door's switch.
