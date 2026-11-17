# The arena's page door (card L PR 5, grand plan step 5.3b; v2.3.5531)

`src/game/arenaDoor.js` (`arenaTo`, `arenaPhase`, `ARENA_PAGE_WAYS`,
`arenaDoorOff`); held by `server/test/arena-page-door.test.mjs` and the phase
table's guard (the `arena` row on the page). The worker's half is the arena
door (`server/src/gladiator.js` `_arenaTo`, v2.3.5522).

## What it is

Your arena on the phone is one field, `S._arenaMatch`: none, or your live
match (the PvP kill hook and the quiet phone read it). Its notes, written
beside it by the same call (the phase-table row's `notes`):
`S._arenaInvolved` (queued or in the bracket) and `S._arenaTournamentId`.
The phase: `fighting` with a match, `involved` without one but in it, else
`none`.

The one way, `poll`: the arena's status poll in the screen (`BroTown.jsx`)
writes your place and your match, as its lines did (the tournament's id
only with a match).

## Step 1: nothing a player sees changes

The rule is the poll's own: a match is a record or none. `?arenadoor=0`
writes what the poll asks, as before; the worker's `arenadoor` is its own
door's switch.

## Beside the door

The stake board (`S._arenaStakeBoard`, `gameEvents.js`), the match's popup
mark (`S._arenaNotified`), and the duel the match rides (`S._inDuel`, the
duel's page door).
