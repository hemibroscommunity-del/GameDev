# The trade's page door (card L PR 5, grand plan step 5.3b; v2.3.5530)

`src/game/tradeSlot.js` (`t2LiveTo`, `tradePhase`, `TRADE_PAGE_WAYS`,
`tradeDoorOff`); held by `server/test/trade-page-door.test.mjs` and the phase
table's guard (the `trade` row on the page). The worker's half is the trade
door (`server/src/trade.js`, v2.3.5210).

## What it is

The phone's trade is one field, `S._t2Live`: none, or the open trade's id
(`true` when the worker sent none).

| way | caller | writes |
|---|---|---|
| `open` | `gameEvents.js` trade2_state (open) | the trade's id |
| `close` | `gameEvents.js` trade2_state's end, a cancel, a local end | none |
| `rejoin` | `rejoinSlots.js` `rejoinClear` | none, until the worker re-sends a trade still open |

## Step 1: nothing a player sees changes

The rule is the callers' own: `open` writes an id, the others none.
`?tradedoor=0` writes what a caller asks, as before.

## Beside the door

The invite card (React state; REJOIN_SLOTS' `trade-invite`), a leave under
way (`S._t2Leave` and its hush `S._t2QuietUntil`, `t2Leave`), the done
watch (`S._t2DoneWatch`) and the local end (`S._t2LocalEnd`).
