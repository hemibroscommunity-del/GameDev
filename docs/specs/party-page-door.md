# The party's page door (card L PR 5, grand plan step 5.3b; v2.3.5529)

`src/game/partyDoor.js` (`partyTo`, `partyPhase`, `PARTY_PAGE_WAYS`,
`partyDoorOff`); held by `server/test/party-page-door.test.mjs` and the
phase table's guard (the `party` row on the page). The worker's half is the
party door (`server/src/party.js` `_partyIn`, v2.3.5212).

## What it is

The phone's copy of its party is one field, `S._party`: none, or the
worker's last `party_state` (the renderer's nameplate marker reads it each
frame).

| way | caller | writes |
|---|---|---|
| `state` | `gameEvents.js` party_state | the worker's roster (member) |
| `gone` | `gameEvents.js` party_state (left, kicked, disbanded) | none |
| `rejoin` | `wsClient.js` state_sync | none, until the worker says it again (REJOIN_SLOTS' `party` row) |

## Step 1: nothing a player sees changes

The rule is the callers' own: `state` writes a record, the others none.
`?partydoor=0` writes what a caller asks, as before. The HUD (`setParty`,
React's own state) stays with the callers.
