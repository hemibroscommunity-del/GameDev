# The roads between players, one table (v2.3.5280)

`server/src/playerroads.js` (`PLAYER_ROADS`, `OWN_ROADS`); held by
`server/test/player-roads.test.mjs`. Grand plan step 10.5, card R PR 1.

## Why

Gold and goods can pass from one player to another in a dozen ways: the
trade window, the old gift, the General Store's order book, the Auction
House, a duel, the arena, a fine on a threatener's head, the jackpot, a pile
on the ground, Diego's pile, No man's land. Before this, the answer to "what
are they all?" was spread over those files. A way nobody had listed was a way
nobody could slow, record or unwind. A trade moved 999,999 gold with no fee,
and nothing said so in one place (`docs/GRAND-PLAN.md` part 10).

## The table

One row a way value passes from one account to another (a settlement, from
its start to its landing). Each row says:

| Column | What it holds |
|---|---|
| `at` | where its code is, for people |
| `carries` | what it moves: `gold`, `bag` (counts in a bag), a `weapon`, a piece of `gear`, a `pet` |
| `roads` | the door roads it runs on: `gold` (`GOLD_ROADS`), `bag` (`BAG_ROADS`), `bagWhole` (`BAG_WHOLE`, the bag's whole assigns). Only `move` and `escrow` roads: a `mint` or a `burn` has no other account. The mail's landing (`mail_gold`, `mail_item`) is named on every row that pays through it |
| `fee` | the part the game keeps. **0** |
| `hold` | how long the value waits before it lands. **0** |
| `pace` | how many such settlements an account may make. **0** |
| `ledger` | `xfer` (one row a settlement in the transfer ledger, `xfer:`), `kill` (a kill writes none), or `none`, with why in `ledgerWhy` |
| `why` | what it is |

**Everything at zero, as today.** The owner's call 12 (`docs/GRAND-PLAN.md`
part 9): *"YES to building the table with everything at zero; turning one up
is a later call."* No settlement reads `fee`, `hold` or `pace` yet. 0 means
none, whatever unit the reader chooses: the PR that turns one up builds its
reader and says its unit there, and it is the owner's call, never decided
while away.

**Not wired, and marked so** (v2.3.6463, card BK PR 4). `LEVERS` in
`playerroads.js` marks each of the three `wired: false`, with what it `means`: a
`fee: 0` means no fee is ever looked at, not a fee of nothing charged. A
lever is wired by the PR that builds its reader and a test that sets it and
sees it applied (a fee set, then charged), on the owner's word, and that PR
turns its mark to `wired: true`. `tools/guards/road-levers.test.mjs` holds
the marks to the source, off the syntax tree: it follows the table's value
binding by binding (an alias, a const key, destructuring, a local function,
a callback, a dynamic import; the table's own file included) and fails a
read of a lever marked not wired, a use it cannot follow (so an unknown
spelling is red, never green: sitting 58's hold, mended in BK part 5), a
lever marked wired that nothing reads, and a file that passes the rows on
under any name. Its §5 plants sixteen spellings and three honest uses.

| Row | What it is | Carries | Ledger |
|---|---|---|---|
| `trade_window` | the trade window: both sides staged and confirmed, swapped in one write | gold, bag, weapon, pet | `xfer` |
| `gift_trade` | the old one-way gift | gold, bag | `xfer` |
| `nml_loss` | No man's land: a player killed under its rule loses the purse, the spare weapons (a red skull the worn gear too) to the killer's mail | gold, weapon, gear | `kill` |
| `market` | the General Store's order book: a buy order's gold and a sell order's weapon rest in `mkt_order:`; a cross pays each side by the mail | gold, weapon | `xfer` (v2.3.5293; only with `xferescrow: true`) |
| `auction_sale` | the Auction House, bought now | gold, bag, weapon, gear, pet | `xfer` (v2.3.5293; only with `xferescrow: true`) |
| `auction_bid` | the Auction House, a bid won | gold, bag, weapon, gear, pet | `xfer` (v2.3.5293; only with `xferescrow: true`) |
| `auction_offer` | the Auction House, an offer taken | gold, bag, weapon, gear, pet | `xfer` (v2.3.5293; only with `xferescrow: true`) |
| `duel_pot` | a duel's two wagers, held in `duelEscrow:`, the pot to the winner | gold | `xfer` (v2.3.5290; only with `xferescrow: true`) |
| `arena_entries` | the arena's entry fees, held in `arena_entry:`, paid to the champion with the house's part | gold | `none` |
| `arena_stakes` | the arena's sponsorship stakes, held in `arena_stake:`, paid as the cut, the winnings and a failed sponsorship's claim | gold | `xfer` (v2.3.5292; only with `xferescrow: true`) |
| `threat_bounty` | the threat's 10% fine, held on the threatener's head in `bounty:`, paid to whoever kills them | gold | `none` (a kill) |
| `jackpot` | the weekly pool: every ticket's gold in `jackpot:draw`, paid to one winner | gold | `none` (a draw among many) |
| `ground` | a pile on the ground: a death's bag or a dropped stack (`death_pile:`), taken by whoever picks it up | bag | `none` (nobody chose the other side) |
| `diego_pile` | Diego's pile (`shop_stock`): what one player sells him, the next buys | bag | `none` (each side trades with the shop) |

The escrow rows' ledger (card R PR 11, tag 5290, the planning session's
reading (b)): each settlement writes one `xfer:` row in its own run, which is
more rows a day, a cost question for the owner, so it is built OFF behind
`xferescrow: true` in the live flags (`xfer.js xferEscrowOn`; off too with
`xfer: false`). Built first for **the duel's pot** (`xferDuelPot`: the
loser's wager to the winner, the price empty, `by` the winner's blow or
nobody's; paid through `inbox.js _creditWith` so the credit, its stamp and
the row are one write; `xfer.test` §8, `cost-guard` §20: one row a wagered
duel, two over its life with its prune). **The market and the Auction House**
(card R PR 17, tag 5293, after card K's 5194, 5196 and 5197): a sale writes
one row, the goods' side `from` the seller `to` the buyer, the price the
gold, `by` the tap that settled it. The market's noted cross (`mkt-<maker
order>`, `xferMarketSale`) is put beside the maker order's own put; the
Auction House's (`ah-<listing>`, `xferAuctionSale`) beside the listing's put
on a bid accepted (`auction_bid`) or an offer taken (`auction_offer`), and on
a buy-now (`auction_sale`) inside the buyer's debit run (`inbox.js
_escrowDebitGoldTogether`'s `also`), so a refused debit writes none
(`xfer.test` §11, `cost-guard` §23: one write more a sale, flag on).

**The arena's stakes** (card R PR 13, tag 5292; card L's arena door #1930
first). A match's stakes settle as a pool: when no sponsor backed the
winner, every losing stake goes whole to the winning fighter; when some
did, the fighter keeps `FIGHTER_CUT` of the losing stakes (and the rounding's
coins) and the winning sponsors share the rest, pro rata. A row has one
`from` and one `to`, so (the planning session's reading (1), no change to the
row's shape): **one row a losing stake**, `from` its sponsor, **`to` the
winning fighter**, its whole gold, the price empty, `by` nobody (a stake
settles by the match's end, not by a tap on it). **Its `ids` carry the
winning sponsors' parts of that stake**, `share:<sponsorId>:<n>`; the
fighter's part is the rest. The parts are whole coins (`xfer.js
arenaStakeParts`: each its floor of the pro-rata share, then the coins left
over to the largest remainders), so **the gold of a match's rows adds up to
the losing pool**, each winning sponsor's shares across them to exactly what
it gained beyond its own stake, and the fighter's parts to its cut. Written
by `xferArenaStakes` in the plan's own run (`gladiator.js
_arenaSettleStakes`: the plan's put, the losers' stamps and the rows, one
run: a restart lands before all of them or after), so a plan the sweep
finishes already has its rows. The old order (`arenasettleplan: false`)
writes none. Rows: one a losing sponsor a match (two over its life, with its
prune); a winning stake is its owner's own coming back, no row. `xfer.test`
§9, `cost-guard` §21.

Sitting 23's two lows, mended (tag 5295, card R PR 15): a share counts
against its own bound, `XFER.SHARES_MAX` (128, above the room's 120 players),
not `IDS_MAX` (32), so a match with more winning sponsors than that keeps
every share and its rows still add up to the pool; and the owner's card
(`econcard.js` `itemsOf`) counts no item for a share (`xferIsShare`), since a
share is how the gold was split, not a thing that moved. `xfer.test` §10.

**A player's own escrow** is not a road between players. `OWN_ROADS` lists
those with why: today the bank (`bank:<pid>`, marked `player` in the storage
registry: nothing in it reaches another account).

## What is not a road between players, and why

- **The gamble hall**: every wager (the Ace flip, the item flip, the gamble)
  is against the house: a `mint` when won, a `burn` when lost. No player is
  on the other side. The jackpot is (its row above).
- **Mail between players**: there is none. The mail (`inbox:`) is where every
  settlement lands (`mail_gold`, `mail_item`), named on each row that pays
  through it; no player sends mail to another.
- **A party's or a dungeon's shared rewards**: each share is a `mint` to its
  player.

## Read by

- `server/src/xfer.js`: `XFER.ROADS` is the rows whose `ledger` is `xfer`,
  `XFER.KILLS` the rows whose `ledger` is `kill` (the plan's rule 2: the list
  is written once). A row's key is the `road` an `xfer:` row keeps; the two
  that write one keep the names they always had (`trade_window`,
  `gift_trade`). `xfer.test` §2 holds that every `move` road is on a row
  whose ledger is `xfer` or `kill`.

## The guard

`server/test/player-roads.test.mjs`, strict from the start (the plan's rule
3: a set that value hangs on). It fails:

1. a `fee`, `hold` or `pace` that is not 0; the three levers not each marked
   in `LEVERS` with what it means; a lever marked not wired that is not 0 (v2.3.6463);
2. a row that is not whole (no `at` or `why`, a kind off the list, a ledger
   off its list or `none` with no why, no road, a road no door has, a `mint`
   or `burn` road, a kind with a door and no road of that door);
3. a `move` road (`GOLD_ROADS`, `BAG_ROADS`, `BAG_WHOLE`) on no row;
4. an `escrow` road on no row and not a player's own; an escrow into a place
   the registry marks `between` (`storagemarks.js`) is always on a row; a
   player's own escrow holds only in places marked `player`;
5. a kind neither behind a door nor listed `DOORLESS`;
6. its own checks, run on a planted copy of the tables, not failing.

Break proofs, tried by hand (its header): a `move` road planted in
`GOLD_ROADS` fails §3; `fee: 1` on `trade_window` fails §1.

## Weapons, gear and pets

They move between players (the trade window, the Auction House, the order
book, No man's land) on roads with no door table yet, so a row names them in
`carries` and the guard cannot hold their roads. `DOORLESS` lists them; a
kind leaves it in the PR that builds its door, and from then on the guard
holds its roads as it holds gold's. Weapons and gear: card R PR 2, the stash
door. Pets: no card names their door yet.

## Kill switch

None: the table changes no behaviour. Nothing reads `fee`, `hold` or `pace`,
and `XFER.ROADS` and `XFER.KILLS` are the same lists as before
(`trade_window` and `gift_trade`; `nml_loss`). The ledger's own switch stays
`xfer: false`.
