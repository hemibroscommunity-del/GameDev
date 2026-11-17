# The loading door (card L PR 5, grand plan step 5.3b; v2.3.5525)

`src/game/veilDoor.js` (`veilTo`, `veilPhase`, `VEIL_WHYS`, `veilDoorOff`);
held by `server/test/loading-door.test.mjs` and the phase table's guard (the
`loading` row on the page).

## What it is

The world is veiled (the zone-loading screen up, your bro held still) for
any of several reasons at once. Each was a hold of its own, which its
readers still read by its old name. The planner's reading (2026-11-17): a
door's one field is the set of reasons. So they are one field,
`S._veils`, a Map from the reason to its hold, written only by `veilTo`,
which also writes the reason's old field:

| reason | old field | its ways (hold, lift) |
|---|---|---|
| `zone` | `S._zoneLoading` | `zoneTransitions.js` `handleZoneTransitions` (a zone's art behind its overlay) |
| `trip` | `S._wheelTripVeil` | `zoneTransitions.js` `veilWheelTrip`, `syncTownScenery`, `_liftTownVeil` |
| `town` | `S._townArtHold` | `zoneTransitions.js` `syncTownScenery`, `_liftTownVeil` |
| `farm` | `S._farmArtHold` | `farmTrip.js` (your farm's art) |
| `avatar` | `S._avatarArtHold` | `avatarHold.js` `holdForAvatar` (your bro's pictures) |
| `net` | `S._netHold` (a lift is `false`) | `wsClient.js` (state_sync's readiness, the socket's close) and `serverReady.js` (v2.3.5527, once card K freed `wsClient.js`) |

The phase: `veiled` while any reason holds, else `in` (`veilPhase`).

## Step 1: nothing a player sees changes

`veilTo` writes each old field exactly as its line did (a lift of the trip
is `false`, of the others `null`), and every reader reads the old field.
The overlay (`showZoneLoadingOverlay`, `hideZoneLoadingOverlay`) stays with
the callers: the door writes state, never a screen. Nothing moves off the
loading screen (questline and an `mp-heldsweep` sample, at the PR).

## Beside the door

- `S._wheelDungeonOpening`: the dungeon row's.
- The first loading screen's gate (`ui/loadingGate.js`): its own read of the
  overlay (`_up`), the one-way `_worldIn` and the queue `_waiting`.

## The switch

`?veildoor=0` writes the old fields alone, as before; `S._veils` is not kept.

## What the test fails

- §1: the reasons, a hold and a lift each, the old fields as before, the
  phase, a reason that is none, the switch.
- §2: a write of `S._veils` or a reason's old field anywhere in `src/`
  outside `veilTo`; each reason's hold and lift at its callers; no other
  caller.
- §3: a real hold (`holdForAvatar`) veils and lifts through the door.
