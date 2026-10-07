# Diego's trades are saved (v2.3.3128)

> Found by the review of the farm (PR #827). It was in the game before the
> farm and was proved on a copy of `main`. Owner, 2026-10-06: *"Yes fix all of
> your recommended fixes. Game is still a demo and nobody uses Diego yet."*

## What was wrong

Diego's two trades changed the player in memory and never saved them:

- `shop_sell` and `shop_buy` (`server/src/shop.js` `_shopSell` / `_shopBuy`)
  moved coins and items.
- Diego's public pile was saved (`shop_stock`).
- The player's own record (`rpg:<pid>`) was not.

Nothing else saves a player who stands still at full health:

- the regen tick writes only a pool that moved;
- `webSocketClose` writes only a dirty one;
- a reconnect reloads the player from storage;
- a deploy wipes the room's memory.

So a sale followed by any of those came undone. The coins vanished and the
goods came back to the bag, and they **also** stayed in Diego's pile. Repeated,
that copied goods onto his shelf for free. A purchase undone the same way
emptied his shelf for nothing.

Every other single-event payout already saves on its own line: gamble,
smelting, the daily chest and gathering. Diego's shop was the exception.

## The fix

- The router passes the player's id into both trades (`server/src/index.js`,
  `shop_sell` / `shop_buy`).
- Each trade calls `_saveRpg` straight after it changes the bag and purse:
  - **a sale or a purchase from the pile**: in the same synchronous run as
    `_shopSaveStock`. Both functions *issue* their put before their first
    `await`, so the Durable Object commits the player and the pile as one
    batch (rules 8 and 9), never the pile without the purse;
  - **a staple** (the shelf Diego never runs out of) touches no pile, so its
    one write is the player's.
- The suite's direct calls on bare objects pass no id and save nothing, as
  before.

No message, cap or client change: the client already reads the player from the
`player_state` echo, which was always right; only storage was behind it.

## Tests

`server/test/shop.test.mjs`, "A TRADE WITH DIEGO IS SAVED", through the real
message path:

- a sale: storage holds the coins paid and the bag without the goods, and the
  pile holds them, in the same batch;
- a reconnect after it: the coins stay and the goods do not come back;
- a purchase from the pile, and a staple: both saved.

With the saves taken out, all four checks fail.

The suite's mock storage now **copies** on put, as Durable Object storage does
(a structured clone). By reference, a saved record went on changing with the
live player, so a check of what storage held could not fail.
