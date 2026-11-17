# The connection door (card L PR 5, grand plan step 5.3b; v2.3.5528)

`src/game/connectionDoor.js` (`connTo`, `CONN_PHASES`, `connDoorOff`); held
by `server/test/connection-door.test.mjs` and the phase table's guard (the
`connection` row on the page).

## What it is

The phone's socket is in one phase, `S._realtimeStatus`, which every reader
already reads (the Info panel's dot, Settings, Social, the trade slot).
`wsClient.js` wrote it in 21 places; now only `connTo` does. The door was
built once card K freed `wsClient.js` (the planner, 2026-11-17).

The phases (`CONN_PHASES`): `connecting`, `connected`, `disconnected`,
`idle`, `linger`, and each refusal's own screen: `full`, `device`, `key`,
`locked`, `origin`, `rejected`, `superseded`, `verify`, `frozen`.

## Step 1: nothing a player sees changes

The door's one rule is the callers' own: the phase is a word of the list.
Every caller writes one today, so nothing a player sees changes.

## Beside the door

- The refusals' own marks (`S._joinRejectedFatal`, `S._tabMoved`,
  `S._frozenByAdmin`): what a screen says, read by it.
- The server's veil, `S._netHold`: the loading door's `net` reason
  (v2.3.5527).
- `serverReady.js`'s own `_state` and `_veil`.

## The switch

`?conndoor=0` writes any word a caller asks, as before.

## What the test fails

- §1: every phase, a word that is none, no `S`, the switch.
- §2: a write of `S._realtimeStatus` anywhere in `src/` outside `connTo`;
  every call writes a word of the list; the callers are the wire system's.
