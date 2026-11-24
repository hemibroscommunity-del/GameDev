/* ═══ v2.3.5280: THE ROADS BETWEEN PLAYERS, ONE TABLE (grand plan step 10.5, card R PR 1) ═══
 * (spec: docs/specs/player-roads.md; held by server/test/player-roads.test.mjs)
 *
 * Every way value passes from one account to another, one row: its fee, its
 * hold, its pace, its ledger, and the door roads it runs on.  Before this the
 * answer to "how can gold or goods get from one player to another?" was
 * spread over a dozen files; a road nobody had listed was a road nobody
 * could slow, record or unwind (the plan's part 10: a trade moved 999,999
 * gold with no fee, and nothing said so in one place).
 *
 * ALL ZERO, AS TODAY.  The owner's call 12 (docs/GRAND-PLAN.md part 9):
 * "YES to building the table with everything at zero; turning one up is a
 * later call."  No settlement reads `fee`, `hold` or `pace` yet, so the
 * guard fails any value but 0: turning one up is a PR that builds its
 * reader (and says its unit there), and it is the owner's call, never
 * decided while away.  0 means none, whatever the unit turns out to be.
 *
 * NOT WIRED (v2.3.6463, card BK PR 4): LEVERS below says so of each of the
 * three, so a row's `fee: 0` is never read as "a fee of nothing is
 * charged": nothing charges, holds or paces at all.  A lever is wired in
 * the PR that builds its reader, with a test that sets it and sees it
 * applied (a fee set, then charged), on the owner's word; that PR turns
 * its mark to `wired: true`.  tools/guards/road-levers.test.mjs fails a
 * file of server/src that reads a lever marked not wired, and a lever
 * marked wired that nothing reads; player-roads.test §1 holds the marks.
 *
 * A ROW (one settlement: a way the value goes, start to landing):
 *   at        where its code is, for people
 *   carries   the kinds of value it moves (ROAD_KINDS): gold, bag counts, a
 *             weapon, a piece of gear, a pet
 *   roads     the door roads it runs on, by door: `gold` (gold.js
 *             GOLD_ROADS), `bag` (bag.js BAG_ROADS), `bagWhole` (bag.js
 *             BAG_WHOLE, the whole-bag assigns), `stash` (stash.js
 *             STASH_ROADS, v2.3.5281: weapons and gear).  Only `move` and
 *             `escrow` roads: a `mint` or a `burn` has no other account, and
 *             a stash `move` is within one player (`other: 'self'`).  The
 *             mail's landing (`mail_gold`, `mail_item`, `mail_weapon`,
 *             `gear_mail`) is named on every row that pays through it.  Pets
 *             have no door table yet (DOORLESS): the row names them in
 *             `carries` now, and the guard holds them once their door exists.
 *   fee       the part of the value the game keeps (0: none)
 *   hold      how long the value waits before it lands (0: none)
 *   pace      how many such settlements an account may make (0: none)
 *   ledger    `xfer` (one `xfer:` row a settlement, xfer.js: the row's key is
 *             a `move` road it names, or it names its `writer`, 'file fn',
 *             v2.3.5281: the gatekeeper's low, review-z13), `kill` (a kill
 *             writes none: the owner's "none a kill", call 13), or `none`,
 *             with why in `ledgerWhy`
 *   why       what it is, in a line
 *
 * READ BY xfer.js: XFER.ROADS (the rows whose ledger is `xfer`) and
 * XFER.KILLS (`kill`) are made from this table, so the ledger's list is
 * written once (the plan's rule 2).  A row's key is what an `xfer:` row
 * keeps as its `road`; the two that write one keep the names their rows
 * always had (`trade_window`, `gift_trade`, the same as their door roads).
 *
 * THE GUARD (player-roads.test, strict from the start: the plan's rule 3,
 * a set that value hangs on) fails: a `move` road on no row; an `escrow`
 * road on no row and not in OWN_ROADS; an escrow into a place the registry
 * marks `between` (storagemarks.js) left to OWN_ROADS; a row that names no
 * road, a road no door has, or a `mint` or `burn` road; a `carries` the
 * named roads do not cover; a ledger off its list, or `none` with no why; a
 * non-zero `fee`, `hold` or `pace`.
 *
 * NOT ROADS BETWEEN PLAYERS (the spec has each with why): the gamble hall
 * (every wager is against the house: a mint or a burn); a player's mail to
 * another (there is none: the mail is every row's landing, never a road of
 * its own); a party's or a dungeon's shared rewards (each share a mint).
 *
 * No imports: a leaf, so node reads it directly and xfer.js can make its
 * lists from it. */

/** The kinds of value a road may carry (SHAPES part 3, "What is summed"). */
export const ROAD_KINDS = Object.freeze(['gold', 'bag', 'weapon', 'gear', 'pet']);
/** The doors a kind moves through, and the `roads` key each is named under. */
export const KIND_DOORS = Object.freeze({ gold: Object.freeze(['gold']), bag: Object.freeze(['bag', 'bagWhole']),
  weapon: Object.freeze(['stash']), gear: Object.freeze(['stash']) });   /* v2.3.5281: the stashes' door */
/** Kinds with no door table yet: named in `carries`, not yet held by road.
 *  A kind leaves this list in the PR that builds its door (weapons and gear
 *  left it in card R PR 2, v2.3.5281). */
export const DOORLESS = Object.freeze(['pet']);
export const ROAD_LEDGERS = Object.freeze(['xfer', 'kill', 'none']);
/** v2.3.6463 (card BK PR 4): the three levers of a row, and whether
 *  anything reads them.  None does: `wired: false`, each 0 on every row. */
export const LEVERS = Object.freeze({
  fee: Object.freeze({ wired: false, means: 'the part of the value the game keeps: no settlement reads it, so nothing is charged' }),
  hold: Object.freeze({ wired: false, means: 'how long the value waits before it lands: no settlement reads it, so everything lands at once' }),
  pace: Object.freeze({ wired: false, means: 'how many such settlements an account may make: no settlement reads it, so none is counted' }),
});

const fz = (o) => {
  const out = {};
  for (const [k, v] of Object.entries(o.roads || {})) out[k] = Object.freeze(v.slice());
  return Object.freeze({ ...o, carries: Object.freeze(o.carries.slice()), roads: Object.freeze(out) });
};

export const PLAYER_ROADS = Object.freeze({
  /* ── straight from one player to another ── */
  trade_window: fz({
    at: 'trade2.js _handleTrade2Confirm', carries: ['gold', 'bag', 'weapon', 'pet'],
    roads: { gold: ['trade_window', 'mail_gold'], bag: ['trade_window', 'mail_item'], stash: ['trade_put', 'mail_weapon'] },
    fee: 0, hold: 0, pace: 0, ledger: 'xfer',
    why: 'the trade window: both sides staged, both confirmed, swapped in one write (weapons staged in `trade2wpn:`, pets moved book to book)',
  }),
  gift_trade: fz({
    at: 'trade.js _interceptTrade', carries: ['gold', 'bag'],
    roads: { gold: ['gift_trade', 'mail_gold'], bag: ['gift_trade', 'mail_item'] },
    fee: 0, hold: 0, pace: 0, ledger: 'xfer',
    why: 'the old one-way gift: the sender stages, the other accepts, nothing comes back',
  }),
  nml_loss: fz({
    at: 'nomansland.js _nmlOnDeath', carries: ['gold', 'weapon', 'gear'],
    roads: { gold: ['nml_loss', 'mail_gold'], stash: ['nml_weapons', 'nml_gear', 'mail_weapon', 'gear_mail'] },
    fee: 0, hold: 0, pace: 0, ledger: 'kill',
    why: 'No man\'s land: a player killed under its rule loses the purse and the spare weapons (a red skull its worn gear too) to the killer\'s mail; the bag goes to the ground',
  }),

  /* ── through a record the worker holds between them ── */
  market: fz({
    at: 'market.js _mktPlaceOrder, _mktSettleRun', carries: ['gold', 'weapon'],
    roads: { gold: ['market_order', 'market_unwind', 'mail_gold'], stash: ['market_sell', 'market_back', 'mail_weapon'] },
    /* v2.3.5293 (card R PR 17): one row a sale, in its commit's run, only
       with `xferescrow: true` (OFF by default) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'market.js xferMarketSale',
    why: 'the General Store\'s order book: a buy order\'s gold and a sell order\'s weapon rest in `mkt_order:`; a cross pays each side by the mail',
  }),
  auction_sale: fz({
    at: 'store.js _stCreateListing, _stBuyNow, _stSettle', carries: ['gold', 'bag', 'weapon', 'gear', 'pet'],
    roads: { gold: ['escrow_debit', 'escrow_debit_stored', 'escrow_debit_group', 'mail_gold'], bag: ['ah_listing', 'escrow_item', 'escrow_item_stored', 'mail_item'],
      stash: ['store_list', 'gear_list', 'mail_weapon', 'gear_mail'] },
    /* v2.3.5293 (card R PR 17): one row a sale, in its commit's run, only
       with `xferescrow: true` (OFF by default) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'store.js xferAuctionSale',
    why: 'the Auction House, bought now: the seller\'s goods held in `store_listing:`, the buyer\'s gold paid in, each side paid by the mail',
  }),
  auction_bid: fz({
    at: 'store.js _stCreateListing, _stPlaceBid, _stAcceptBid, _stSettle', carries: ['gold', 'bag', 'weapon', 'gear', 'pet'],
    roads: { gold: ['escrow_debit', 'escrow_debit_stored', 'mail_gold'], bag: ['ah_listing', 'escrow_item', 'escrow_item_stored', 'mail_item'],
      stash: ['store_list', 'gear_list', 'mail_weapon', 'gear_mail'] },
    /* v2.3.5293 (card R PR 17): one row a sale, in its commit's run, only
       with `xferescrow: true` (OFF by default) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'store.js xferAuctionSale',
    why: 'the Auction House, a bid won: the bid\'s gold held on the listing until it wins (or is refunded, outbid), then the goods and the gold swap by the mail',
  }),
  auction_offer: fz({
    at: 'store.js _stCreateListing; storeoffer.js _stOfferPlace, _soPlaceOneWrite, _stOfferReply', carries: ['gold', 'bag', 'weapon', 'gear', 'pet'],
    roads: { gold: ['ah_offer', 'ah_offer_back', 'escrow_debit', 'escrow_debit_stored', 'mail_gold'], bag: ['ah_listing', 'escrow_item', 'escrow_item_stored', 'mail_item'],
      stash: ['store_list', 'gear_list', 'mail_weapon', 'gear_mail'] },
    /* v2.3.5293 (card R PR 17): one row a sale, in its commit's run, only
       with `xferescrow: true` (OFF by default) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'storeoffer.js xferAuctionSale',
    why: 'the Auction House, an offer taken: the offer\'s gold held on the listing until the seller takes it (or it is refunded), then the swap by the mail',
  }),
  duel_pot: fz({
    at: 'duel.js _interceptDuel, _resolveDuel', carries: ['gold'],
    roads: { gold: ['escrow_debit_group', 'mail_gold'] },
    /* v2.3.5290 (card R PR 11): its row, in the pot's own run, only with
       `xferescrow: true` (OFF by default: a row a wagered duel) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'duel.js xferDuelPot',
    why: 'a duel\'s wagers: both held in `duelEscrow:` in one write, the pot paid to the winner (`duelpot:`), a void refunded (`duelrefund:`)',
  }),
  arena_entries: fz({
    at: 'gladiator.js _arenaJoin, _arenaCrown', carries: ['gold'],
    roads: { gold: ['arena_entry', 'mail_gold'] },
    fee: 0, hold: 0, pace: 0, ledger: 'none',
    ledgerWhy: 'an escrow road: card R PR 11 (`xferescrow`)',
    why: 'the Gladiator Arena\'s entry fees: held in `arena_entry:`, paid to the champion with the house\'s part (`arenapot:`), refunded on a void (`arenarefund:`)',
  }),
  arena_stakes: fz({
    at: 'gladiator.js _handleArenaSponsor, _arenaSettleStakes', carries: ['gold'],
    roads: { gold: ['escrow_debit', 'escrow_debit_stored', 'escrow_debit_group', 'mail_gold'] },
    /* v2.3.5292 (card R PR 13): a row a losing stake, to the winning
       fighter, the winning sponsors' parts in its ids, in the plan's own
       run, only with `xferescrow: true` (OFF by default) */
    fee: 0, hold: 0, pace: 0, ledger: 'xfer', writer: 'gladiator.js xferArenaStakes',
    why: 'the arena\'s sponsorship stakes: held in `arena_stake:`, paid as the fighter\'s cut, the sponsors\' winnings and a failed sponsorship\'s claim, refunded on a void',
  }),
  threat_bounty: fz({
    at: 'threat.js _interceptThreat, _bountyOnDeath', carries: ['gold'],
    roads: { gold: ['threat_levy', 'mail_gold'] },
    fee: 0, hold: 0, pace: 0, ledger: 'none',
    ledgerWhy: 'a fine, then a bounty paid to whoever kills its owner: a kill (the owner\'s "none a kill")',
    why: 'the threat\'s levy: a threatener the guards were called on is fined 10%, held on their head in `bounty:`, paid to the player who kills them (`bountypay:`)',
  }),
  jackpot: fz({
    at: 'cadence.js _handleJackpotDeposit, _jackpotMaybeResolve', carries: ['gold'],
    roads: { gold: ['jackpot_ticket', 'mail_gold'] },
    fee: 0, hold: 0, pace: 0, ledger: 'none',
    ledgerWhy: 'a draw among many: no one player\'s gold reaches one other (the winner takes the pool)',
    why: 'the weekly jackpot: every ticket\'s gold pooled in `jackpot:draw`, the pool paid to one winner (`jackpotwin:`)',
  }),
  ground: fz({
    at: 'index.js _handlePlayerDeath, _handleLootPickup; itemdrop.js _handleItemDrop', carries: ['bag'],
    roads: { bag: ['item_drop', 'loot_death_items'], bagWhole: ['death_wipe'] },
    fee: 0, hold: 0, pace: 0, ledger: 'none',
    ledgerWhy: 'a pile on the ground is taken whole by whoever comes first (the dead player\'s own minute aside): nobody chose the other side',
    why: 'a pile on the ground: a death\'s bag (`death_pile:`) or a dropped stack, taken by whoever picks it up',
  }),
  diego_pile: fz({
    at: 'shop.js _shopSell, _shopBuy', carries: ['bag'],
    roads: { bag: ['shop_sell', 'shop_pile'] },
    fee: 0, hold: 0, pace: 0, ledger: 'none',
    ledgerWhy: 'each side trades with the shop at the shop\'s price (a mint, a burn); the two players never meet',
    why: 'Diego\'s pile (`shop_stock`, the room\'s): what one player sells him, the next buys from him',
  }),
});

/* ═══ THE ESCROW ROADS THAT ARE A PLAYER'S OWN ═══
 * An `escrow` road into a record the registry marks `player` (the
 * character's own, restored with them) moves nothing to another account.
 * Listed here with why, so the guard can tell "not between players" from
 * "nobody listed it".  An escrow into a place marked `between` may never be
 * here. */
export const OWN_ROADS = Object.freeze({
  bank: Object.freeze({
    roads: Object.freeze({ gold: Object.freeze(['bank_deposit', 'bank_withdraw']), bag: Object.freeze(['bank_deposit', 'bank_withdraw']) }),
    why: 'the vault (`bank:<pid>`): the player\'s own, out of a death\'s reach; nothing in it reaches another account',
  }),
});

/** The rows whose ledger is `ledger`, in table order (xfer.js makes its
 *  lists by this). */
export function playerRoadsBy(ledger) {
  return Object.keys(PLAYER_ROADS).filter((k) => PLAYER_ROADS[k].ledger === ledger);
}
