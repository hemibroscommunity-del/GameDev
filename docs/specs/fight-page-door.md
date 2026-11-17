# The fight's page door (card L PR 5, grand plan step 5.3b; v2.3.5533)

`src/game/skullDoor.js` (`skullTo`, `skullPhase`, `SKULL_WAYS`,
`skullDoorOff`); held by `server/test/fight-page-door.test.mjs` and the
phase table's guard (the `fight` row on the page).

## What it is

The skull the phone shows over you is one field, `S._pvpSkullType`: none
(free), `red` (you threatened, or No man's land's red skull) or `white`
(you were threatened and may answer). Its time, `S._pvpSkullUntil`, is
written beside it by the same call (0 with none; the row's `notes`).

| way | caller | writes |
|---|---|---|
| `threat` | `gameEvents.js` pvp_threat, threat_response, threat_penalty, threat_expired | the worker's word on a threat |
| `issue` | `InspectPlayerPanel.jsx` | your own threat, shown at once |
| `nml` | `noMansLand.js` | No man's land's skull, from the worker |

## Step 1: nothing a player sees changes

The rule is the callers' own: red, white or none, with a time that is a
number. Every caller writes one. The one exception is a relayed
`pvp_threat` whose `countdown` is no number: the old line wrote a string
time, and the door refuses it (no honest phone sends one). `?skulldoor=0`
writes what a caller asks, as before.

## Beside the door

The fight's own clock (`S._pvpAt`, `fightFood.js`: the last blow given or
taken), the threat's record on the save (`S.rpg._threatState`) and its
cooldown (`S._pvpThreatCdUntil`), No man's land's own record
(`S._nmlSelf`), and the renderer's posed-picture copy (`poseFrame`).
