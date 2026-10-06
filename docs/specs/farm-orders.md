# The Feed & Seed's order board (v2.3.3109)

The owner, on what farming is for: *"Farming needs a purpose. I think the best
purpose it can serve are temporary buffs (boss fights, PvP, dueling, etc) and
source of income."*

The buff half is docs/specs/fight-food.md. This is the income half.

## Why a board

Diego buys crops, but his price falls as his pile grows (shop.js), so he is a
trickle that dries up. He buys no dish at all since v2.3.3107. The farming
plan (docs/FARMING-PLAN.md, "What farming pays") named the dependable
source: an order board at the Feed & Seed, three orders a day, each for gold
and Farming XP.

## What you see

In the Feed & Seed there is a third tab, **Orders**, beside Beds and Seeds.
It shows today's three orders. Each row has:

- what the order wants, for example "12 × Carrot";
- how many you have;
- what it pays: gold and Farming XP;
- a **Deliver** button. It is lit only when your bag holds enough. Once the
  order is done, the button becomes "Delivered ✓".

Under the list is when the orders turn over: "New orders in 5h 45m", at
midnight UTC.

A delivery takes the goods from your bag and pays at once. The words over
your bro say "Order delivered", "+55 gold" and "+200 Farming XP", and the
Farming level-up plays if the XP crosses a level.

## The orders

`server/src/farmorders.js` `FARM_ORDERS.POOL`:

| Order | Wants | Gold | Farming XP | Needs |
|---|---|---|---|---|
| carrots | 12 Carrot | 50 | 150 | Farming 1 |
| firebloom | 6 Firebloom | 55 | 200 | Farming 1 |
| bread | 3 Herb Bread | 50 | 250 | Farming 1, Cooking 1 |
| tonic | 3 Stamina Tonic | 40 | 200 | Farming 1, Cooking 1 |
| rock_vine | 6 Rock Vine | 100 | 400 | Farming 5 |
| potatoes | 9 Potato | 70 | 350 | Farming 5 |
| garden_stew | 2 Garden Stew | 80 | 400 | Farming 5, Cooking 4 |
| cloudpetal | 4 Cloudpetal | 110 | 500 | Farming 10 |
| pumpkins | 3 Pumpkin | 120 | 600 | Farming 10 |
| root_stew | 2 Root Stew | 110 | 450 | Farming 10, Cooking 3 |
| pies | 3 Pumpkin Pie | 220 | 800 | Farming 10, Cooking 8 |

- **You are only asked for what you can make yourself.**
  - The Farming level is what the order's crops need.
  - The Cooking level is what its recipe needs.
  - The Root Stew needs Cloudpetal, which grows at Farming 10.
- **Every order pays more than Diego would for its goods.** That is half
  their value when his pile is empty. A dish is valued at its ingredients.
  The XP comes on top.
- **About 150 gold a day for a new farmer.** One who grows and cooks
  everything averages about 260 a day, and 450 at most.
- **A fixed number a day, each delivered once.** The board is a dependable
  income, never a faucet.
- **Goods can come from anywhere.** You can buy them from another player at
  the auction house. The board makes farm goods worth selling.

These numbers are tuning, meant to be changed once there is real play data.
Add new orders at the end of the list: a stored board looks its ids up in
this list.

## How it works

- **One board per player per UTC day.**
  - It is drawn the first time it is read that day: on opening the Feed &
    Seed, or on a delivery.
  - It is shuffled by a seed of the player's id and the day, from the orders
    their levels can fill.
  - It is then **stored** as `farmorders:<pid>` `{day, ids, done}`. Levelling
    up mid-day or a worker restart does not change today's board.
  - Nothing ticks. A day that ends in an empty room is just a stale record
    that the next read replaces (rule 12).
- **A delivery is one event with two writes**, the farm's own rule (farm.js
  header; guilds.js's order):
  - The worker loads the board and checks the bag.
  - It marks the order done, takes the goods, and pays the gold and the XP
    on the live player.
  - It then issues the board's put and `_saveRpg` with no wait between them,
    so they commit as one batch, the board first.
  - If the two were ever split, a crash could cost one delivery's pay, but
    never pay it twice. The order's `done` flag is what refuses a resent
    delivery.
- **The phone sends** `farm_order {slot, day, id}`.
  - Only the slot is used.
  - The day and id are a check. A board that turned over at midnight under
    a window left open has a different order in slot 0. A tap meant for
    yesterday's carrots must never hand in today's pies, so a mismatch is
    refused (`order-stale`) and the new board comes back.
  - The phone never sends a key, a count or a price.
- **Answers** come back on `farm_state`:
  - `orders`, the board as the worker knows it;
  - `did: {op: 'order', n, slot, item, count, gold, xp, leveled, fromLevel,
    newLevel}` when it paid;
  - `err` when it did not: `order-short`, `order-done`, `order-stale`,
    `order-gone` or `off`.

  `farm_open`'s answer carries the board (null when switched off). A bed
  action's answer has no `orders` key and leaves the board as it is
  (farmBus.js).
- **An order id this worker does not know** (a newer worker's, after a
  rollback) shows as gone and cannot be delivered. Tomorrow's board replaces
  it, and nothing is lost.
- **A character restart deletes the board**, which was drawn for the old
  levels (persistence.js).

## Deploy order and the kill switch

- **`caps.farmorders`** gates the Orders tab and every `farm_order` send. An
  older worker has no case for it and would rebroadcast it to the room.
- **`farmorders: false`** in the live flags:
  - un-advertises the cap;
  - answers `farm_order` with `off`;
  - leaves the board out of `farm_open`.
- **`farm: false`** closes the board along with the farm.

## Tests

- **`server/test/farmorders.test.mjs`** (49 checks):
  - **The pool:** every order is made from what the farm grows, at the
    levels it asks, and pays more than Diego would.
  - **The draw:** the same for the same day, different across days, only
    what the levels allow, and pies at Cooking 8 but not 7.
  - **Opening:** `farm_open` carries the board and writes it, and a level
    gained mid-day leaves it alone.
  - **A delivery:** short, exact, paid once, saved, and refused when done,
    stale (day or id), gone, or sent with a bad slot.
  - **A garbled stored board** is healed.
  - **A new day** brings a new board, and a tap left over from yesterday is
    refused against it.
  - **The batch order:** the board's put is issued before the save.
  - **Switches and restart:** both kill switches and the restart.
  - **The phone's side:** it names and draws every order.
- **`tools/qa/mp/mp-farmorders.mjs`** (15 checks), on a phone against a real
  worker:
  - the tab shows exactly the drawn board, its rows and the reset time;
  - Deliver is off with an empty bag;
  - Deliver lights once the goods are in the bag, and pays exactly, as the
    worker's own copy of the bag and purse show;
  - the row reads "Delivered", and the words over the bro appear;
  - a resend by hand is refused;
  - there are no page errors.
