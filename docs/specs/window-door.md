# The window door (card L PR 5, grand plan step 5.3b; v2.3.5526)

`src/game/windowDoor.js` (`windowTo`, `windowPhase`, `WINDOW_WHYS`,
`windowDoorOff`); held by `server/test/window-door.test.mjs` and the phase
table's guard (the `window` row on the page).

## What it is

Something is open over the world for one of two reasons, each read by its
old name. The planner's reading (2026-11-17), as the loading door's: a
door's one field is the set of reasons. So they are one field,
`S._windows`, a Map from the reason to its hold, written only by
`windowTo`, which also writes the reason's old field:

| reason | old field | its writer |
|---|---|---|
| `panel` | `S._uiBusy` (a lift is `false`) | `BroTown.jsx` `BroTown`, every render: any panel, sheet or card of BroTown's own open |
| `npc` | `S._npcProxLatch` (a lift is `null`) | `BroTown.jsx` `gameLoop` and the townsperson's tap: the townsperson whose prompt is up |

The phase: `open` while any reason holds, else `none` (`windowPhase`).

## Step 1: nothing a player sees changes

`windowTo` writes each old field exactly as its line did, and every reader
reads the old field.

## Beside the door

- The decision panels' count (`ui/mobile/modalGuardBus.js` `_depth`,
  `guardPush` and the release it hands back): module state with no `S`,
  read by the chrome that stands down.
- Each window's own bus record (`inventoryBus`, `wheelBus`, `ChestReveal`):
  what is in a window, not whether the world is covered.

## The switch

`?windowdoor=0` writes the old fields alone, as before; `S._windows` is not
kept.

## What the test fails

- §1: the reasons, a hold and a lift each, the old fields as before, the
  phase, a reason that is none, the switch.
- §2: a write of `S._windows` or a reason's old field anywhere in `src/`
  outside `windowTo`; each reason's callers in `BroTown.jsx`; no other caller.
