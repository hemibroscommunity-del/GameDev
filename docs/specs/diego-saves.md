# Diego's trades are saved (v2.3.3137)

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

## v2.3.3163: not with the dead, and a refusal is nobody else's news

Found by the overnight economy review, both reproduced on main:

- **Diego traded with a dead player.** `_shopSell` and `_shopBuy` skipped the
  `ps.dying || ps.dead || ps.disconnected` check that every other counter
  makes (salvage, the forges, smelting, traps, the farm, the weapon vendor).
  A player in the 5-second death window could still buy: 5 bars for 1,200
  gold, which the respawn then wiped, gold spent. It lost value rather than
  making it, and nobody honest is at his counter then (he stands in town,
  where no one dies). Both now answer "Not now" and move nothing.
- **Every refused trade was broadcast.** After every `shop_sell` /
  `shop_buy` the router sent the whole pile to every player in the room,
  refusals included, with no rate limit. 200 refused sales from one client
  sent 200 copies of the pile to each bystander. Now only a trade that
  happened goes to everyone; a refused one sends the fresh pile to the asker
  alone, so a stale panel still refreshes.

No price, odd or rule changed. Tests: `shop.test.mjs`, the last section (5
checks, 4 fail on main).
