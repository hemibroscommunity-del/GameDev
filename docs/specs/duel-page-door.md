# The duel's page door (card L PR 5, grand plan step 5.3b; v2.3.5529)

`src/game/duelDoor.js` (`duelTo`, `duelPhase`, `DUEL_PAGE_WAYS`,
`duelDoorOff`); held by `server/test/duel-page-door.test.mjs` and the phase
table's guard (the `duel` row on the page). The worker's half is the duel
door (`server/src/duel.js` `_duelTo`, v2.3.5211).

## What it is

The phone's duel is one field, `S._inDuel`: none, or its record (`settleBy`
on it while the Accept tap waits for the worker: `pending`). Its note,
`S._activeDuel` (the partner and the start, read by the lock and the hit
gates), is written beside it by the same call; the phase-table row names it
in `notes`, so the state ledger's rejoin cover counts the door's call for it.

| way | caller | writes |
|---|---|---|
| `start` | `gameEvents.js` arena_match_start, duel_accept (the challenger) | the duel and its note |
| `resume` | `rejoinSlots.js` `duelResume` (duel_resume) | the duel and its note |
| `pending` | `duelPending.js` `enterPendingDuel` (the Accept tap) | the duel alone |
| `drop` | `duelPending.js` `dropPending` | the duel before it, or none; the note only if it was this foe's |
| `end` | `gameEvents.js` duel_end | none, and its note |
| `rejoin` | `rejoinSlots.js` `rejoinClear` | none, and its note |

## Step 1: nothing a player sees changes

The rules are the callers' own: start, resume and pending write a duel with
an opponent; end and rejoin write none. `?dueldoor=0` writes what a caller
asks, as before.

## Beside the door

`settleOwnAccept`'s own marks on the record (`settleBy`, `prev`), the lock
(`duelLock.js`), the worker's duel.
