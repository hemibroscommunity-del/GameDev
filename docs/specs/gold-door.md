# One door for every change to a player's gold (v2.3.4670)

`server/src/gold.js`; held by `server/test/gold-door.test.mjs`.

## Why

A player's gold is `ps.coins` on the server (and `coins` in the stored `rpg:`
record). Before this version it was changed by hand in **41 places across 27
files**: every shop, gamble, quest, trade, the mail, the bank, No man's land.
Each place wrote its own sum, and the sums did not agree. There were six
different ways of reading the purse before adding or taking (the table below).

The trouble with that is not any one sum. It is that a rule meant for ALL gold
has to be copied into each place by hand, and a copy that misses it is a bug.
The state-machine sweep (2026-11-03, `docs/STATE-MACHINES.md`) found that
shape again and again: the Auction House's gold made from nothing, the fight
lock's missed roads. Monster hits had the same shape until v2.3.3296 gave them
one door (`hits.js`, `docs/specs/hit-door.md`). This is that, for gold, and
the first piece of the sweep's "one door per system" plan.

## The door

Three methods on the GameRoom:

| Method | What it does |
|---|---|
| `_goldGive(rec, n, road)` | gold INTO the purse |
| `_goldTake(rec, n, road)` | gold OUT of it (the caller has already checked it is there) |
| `_goldSet(rec, v, road)` | the purse MADE `v`: a character loaded, or a purse lost whole |

`rec` is a live player's state or a stored record. Every call names its
**road**, a row in `GOLD_ROADS`. The row says the verb and the sum, and the
door does that sum. Nothing else in `server/src` writes `.coins`.

## Step 1 (this version): nothing a player sees changes

Each road keeps the exact sum its place did before the door. So the six ways of
reading the purse are still there, now as one column of one table:

| Sum | What it does with the purse `c` | Roads |
|---|---|---|
| `plain` | `c - n` / `c + n`, as it is | amulet_craft, gem_extract, weapon_forge, harden, tonic_buy, tonic_refund, farm_buy, clan_create, arena_entry, gamble_win, gamble_loss, jackpot_ticket, gift_trade, trade_window, threat_levy, market_order, ah_offer, escrow_debit, escrow_debit_stored, escrow_debit_group |
| `orZero` | a missing (or NaN) purse counts as 0 | weapon_sell, quest_reward, guild_rung, daily_chest, dungeon_clear, boss_chest, loot_gold, loot_weapon_sold, ace_flip_win, ace_flip_loss, market_unwind, ah_offer_back |
| `whole` | made a whole number first | pet_house, shop_tool, shop_staple, shop_pile, bank_deposit, bank_withdraw |
| `wholeFloor` | whole, and not below 0, first | farm_order |
| `wholeClamp` | whole first, the answer not below 0 | shop_sell |
| `orZeroClamp` | missing is 0, the answer not below 0 | mail_gold (every `_creditPlayer` gold credit) |
| (set) | the purse is what it is given | join_stored, join_new, nml_loss |

The columns differ only for a purse no honest road makes: missing, NaN,
fractional or below 0. That is why they could drift apart unseen, and why
step 1 is safe: for a whole number of gold, every sum gives the same answer.

**How we know nothing changed.** `gold-door.test` §1 replays each road
against its place's own line from before the door, for every purse a record
could hold (whole, fractional, below 0, missing, null, NaN, huge) and several
amounts, and they agree to the bit. The server suite (338 suites) passed before
the change and after it unchanged. A probe run during the change found the
existing suites already drive **41 of the 44 roads** through their real
handlers; the other three are below.

Two places became two roads each, in the order their line did the sum:

- the Ace flip (`gamble.js`): `ace_flip_win` or `ace_flip_loss` (it read the
  purse `|| 0` two lines up, with nothing between);
- the Auction House offer (`storeoffer.js`): `ps.coins = (ps.coins || 0) +
  back - gold` is `ah_offer_back` (the old offer's gold back) then `ah_offer`
  (the new one out).

## What the test holds

`server/test/gold-door.test.mjs`:

1. **The sums**: every road against its longhand line (the `EXPECT` table).
2. **One door**: no `.coins` is written in `server/src` but in `gold.js`. The
   one write that is not a purse is listed in `NOT_A_PURSE` with why
   (`nomansland.js` `lost.coins`: the loss's own note of what the purse held).
3. **One row, one place**: every call names a road the table has, with its
   verb, from the file its row names; every road has exactly one caller. A row
   nobody calls fails, so deleting a feature deletes its row.
4. **A wrong road moves nothing**: an unknown road, a wrong verb, or an
   `Object.prototype` name throws, and the purse is untouched. (The test
   catches every wrong road before it ships; throwing keeps one that slipped
   past from moving gold by a sum nobody chose.)
5. **The room**: the door is on the GameRoom, and `_creditPlayer`'s gold lands
   through it.

## What is not in it (on purpose)

- **Gold nuggets and bars** (`amulet.js`): ingredients, not money.
- **Escrow records**: a bank vault's gold, a market order's, an Auction House
  offer's. Each has its own stamps (ARCHITECTURE-HANDOFF rules 5-7). The door
  is the PLAYER's purse: gold leaving it for escrow goes out by a road, and
  coming back comes in by one.
- **`_creditPlayer`** (`inbox.js`, handoff rule 4) is still how every
  settlement PAYS. It parks a credit for an offline player and lands it on a
  live one by the `mail_gold` road.

## Found on the way

- **Three roads nobody can reach today.** Diego's shelf (`DIEGO_SHELF`,
  `server/src/data.js`) is empty, so `tonic_buy` and `tonic_refund`
  (`cooking.js _handleShopPurchase`, which already said "no live client sends
  this") and `shop_staple` (`shop.js`, `isShopStaple` reads the same shelf)
  never run. Their sums are proven by §1. Left in place: removing them, or
  stocking the shelf again, is its own change.

## Step 2 (v2.3.4803): one sum for every road

The owner, 2026-11-11: "keep going on the architectural plan". Every road now
does the same sum, `goldOneSum` (gold.js):

- the purse is read as a whole number never below 0 (missing, NaN, fractional,
  below 0 or not finite reads as the whole number under it, or 0);
- the amount likewise;
- a take never leaves the purse below 0;
- a set (a character loading, a purse lost whole) makes the purse a whole
  number never below 0, so a broken purse saved long ago heals as it loads.

**Nothing changes for an honest purse and amount** (whole, not below 0, a take
no larger than the purse, which every road's caller checks): `gold-door.test`
§6 proves each road gives its step-1 line exactly there. What it does change:
the Ace flip's and the gamble's stakes come from the phone and are checked to
be finite but not whole, so a stake of 10.5 used to leave half a coin in the
purse. Now it moves 10.

**The switch**: `goldonesum: false` in the live flags puts every road back on
its step-1 sum (`GOLD_SUMS`, the `sum` column) at once. The column stays until
this has run a while; deleting it is then a small change of its own.

## Step 3, first part (v2.3.4903): the gold log

Every move through the door is noted on a short list per purse: when, the
road, how much it moved (`d`), and the purse after (`c`). The last 32
(`GOLD_LOG.KEEP`) are kept, the oldest dropped.

- **No running cost.** The log is in memory only: no storage write, no row,
  no message. It is a `WeakMap` keyed by the purse object itself, so it is
  never a field on the purse that a save could carry (handoff rule 1). It
  goes when the player's state goes (a rejoin starts a new list), and a
  stored record's notes go with that record.
- **Reading it.** `GET /dev/goldlog?id=<pid>` (the admin routes,
  devtools.js): a live player's purse and its log, oldest first. It is for
  spotting duplicated gold or a cheat while it is happening. Read-only.
- **The switch.** `goldlog: false` in the live flags notes nothing (the gold
  still moves).
- **Proof.** `gold-door.test` §7: every verb is noted, nothing is written to
  storage, nothing new appears on the purse, the cap, a read is a copy, the
  switch, and the admin read (with a 404 for `__proto__`).

## Next steps (each its own version, with a live switch)

1. ~~One sum~~: done, step 2 above.
2. **What the door can now do once for every road**:
   - ~~a per-player record of where gold came from and went~~: done in memory,
     step 3 above. Keeping it across a rejoin or a deploy would cost a write,
     so it waits for the owner's word;
   - the fight lock checked at the door too, for roads no message drives (a
     settlement), beside the router's table (`fightlock.js`);
   - test mode, where a road should treat the owner's characters differently.
3. **The other doors**, the same way: the bag (its step 2), health and
   death (its steps 2a and 2b), the session.

## Adding a way to change gold

A row in `GOLD_ROADS` (its verb, its sum, where its caller is), one call that
names it, and its longhand line in the test's `EXPECT`. Never write `.coins`
directly: `gold-door.test` fails it.

## Wire, storage and switches

None. No message, no cap, no storage key and no record shape changed, and no
live switch: nothing a player sees changed. It is a `server/**` change, so
merging it deploys the worker (CLAUDE.md §4).
