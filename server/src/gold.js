/* ═══ v2.3.4670: THE GOLD DOOR -- every change to a player's gold goes through here ═══
 * (spec: docs/specs/gold-door.md; pinned by server/test/gold-door.test.mjs)
 *
 * WHY.  A player's gold (`ps.coins`, and the stored `rpg:` record's `coins`)
 * was changed by hand in 41 places across 27 files: every shop, gamble, quest,
 * trade, the mail, the bank, No man's land.  Each place did its own sum, and
 * they did not agree -- six different ways of reading the purse (below).  A
 * rule that should hold for ALL gold (the fight lock, test mode, a log of
 * where a player's gold came from) had to be copied into each place by hand,
 * and the copies that missed it are the bugs the state-machine sweep found
 * (the Auction House's gold from nothing, the fight lock's missed roads).
 * The monster hits had the same shape until v2.3.3296 gave them one door
 * (hits.js); this is that, for gold.
 *
 * THE DOOR is three methods: _goldGive, _goldTake and _goldSet.  Every place
 * that changes gold names its ROAD -- its row in GOLD_ROADS -- and the door
 * does the sum that row says.  gold-door.test fails:
 *   - a write to `.coins` anywhere else in server/src (the one note that is
 *     not a purse is listed there with its reason);
 *   - a call that names a road the table has not got, or with the wrong verb;
 *   - a road with no caller, or with two (one row, one place: deleting a
 *     feature deletes its row);
 *   - a road whose sum is not the one its place did before the door.
 *
 * STEP 1 (this version): NOTHING A PLAYER SEES CHANGES.  Each row keeps the
 * exact sum its place did before, cell for cell, so the six ways of reading
 * the purse are still here -- now as one column of one table, where they can
 * be seen side by side.  The test replays each place's old line against the
 * door for every purse it can hold (whole, fractional, negative, missing, NaN)
 * and they agree to the bit.
 *
 * STEP 2 (next, its own version and live switch): every road reads the purse
 * the one safe way (a whole number, never below 0), so the `sum` column goes.
 * STEP 3: what the door can now do once for every road -- the log, the fight
 * lock, test mode.  docs/specs/gold-door.md has the list.
 *
 * WHAT IS NOT HERE (on purpose):
 *   - the gold nuggets and bars (amulet.js): ingredients, not money;
 *   - a bank vault's, a market order's or an offer's own gold: escrow records,
 *     each with its own stamps (ARCHITECTURE-HANDOFF rules 5-7).  The door is
 *     the PLAYER's purse; money leaving it for escrow goes out through a road
 *     here, and coming back to it comes in through one;
 *   - `_creditPlayer` (inbox.js, handoff rule 4) stays the way every
 *     settlement PAYS: it parks a credit for an offline player and lands it
 *     on a live one through the `mail_gold` road.
 *
 * No imports: node tests it directly, and nothing here reaches the room yet.
 */

/* ── HOW EACH ROAD READS THE PURSE (step 1: as it did before the door) ──
 * `c` is the purse as it is (`rec.coins`), `n` the amount, `take` the verb.
 * The columns differ only for a purse no honest road makes -- missing, NaN,
 * fractional or below 0 -- which is why they could drift apart unseen. */
export const GOLD_SUMS = Object.freeze({
  /* `ps.coins -= n` / `ps.coins += n`: the purse as it is */
  plain: (c, n, take) => (take ? c - n : c + n),
  /* `(ps.coins || 0) + n`: a missing (or NaN) purse counts as 0 */
  orZero: (c, n, take) => (take ? (c || 0) - n : (c || 0) + n),
  /* `Math.floor(Number(ps.coins) || 0) - n`: a whole number first */
  whole: (c, n, take) => {
    const p = Math.floor(Number(c) || 0);
    return take ? p - n : p + n;
  },
  /* `Math.max(0, Math.floor(Number(ps.coins) || 0)) + n`: whole, not below 0, first */
  wholeFloor: (c, n, take) => {
    const p = Math.max(0, Math.floor(Number(c) || 0));
    return take ? p - n : p + n;
  },
  /* `Math.max(0, Math.floor(Number(ps.coins) || 0) + n)`: whole first, the answer not below 0 */
  wholeClamp: (c, n, take) => {
    const p = Math.floor(Number(c) || 0);
    return Math.max(0, take ? p - n : p + n);
  },
  /* `Math.max(0, (ps.coins || 0) + n)`: a missing purse is 0, the answer not below 0 */
  orZeroClamp: (c, n, take) => Math.max(0, take ? (c || 0) - n : (c || 0) + n),
});

/* ── EVERY ROAD GOLD MOVES BY ──
 * dir: 'give' (into the purse), 'take' (out of it) or 'set' (the purse made
 *      this; a load or a loss).
 * sum: the GOLD_SUMS row (give and take only).
 * at:  where its one caller is, for people (the test checks the caller).
 * A new way to change gold is a new row here and one call that names it. */
const R = (dir, sum, at) => Object.freeze({ dir, sum, at });
export const GOLD_ROADS = Object.freeze({
  /* ── a character arrives ── */
  join_stored:         R('set', null, 'join.js _handleJoin: the stored character'),
  join_new:            R('set', null, 'join.js _handleJoin: a new character (the server\'s defaults, capped)'),

  /* ── paying for things ── */
  amulet_craft:        R('take', 'plain', 'amulet.js _handleAmuletForge: craft an amulet'),
  gem_extract:         R('take', 'plain', 'amulet.js _handleAmuletForge: take the gems out of a piece'),
  weapon_forge:        R('take', 'plain', 'gear.js _handleForgeWeapon'),
  harden:              R('take', 'plain', 'hardening.js _handleHardenWeapon'),
  tonic_buy:           R('take', 'plain', 'cooking.js _handleShopPurchase'),
  tonic_refund:        R('give', 'plain', 'cooking.js _handleShopPurchase: the tonic would not apply (an arena match)'),
  farm_buy:            R('take', 'plain', 'farm.js _handleFarmBuy'),
  pet_house:           R('take', 'whole', 'petbook.js _handlePetHouseBuy'),
  clan_create:         R('take', 'plain', 'clans.js _handleClanCreate'),
  arena_entry:         R('take', 'plain', 'gladiator.js _arenaJoin'),
  shop_tool:           R('take', 'whole', 'shop.js _shopBuy: a lost tool bought back'),
  shop_staple:         R('take', 'whole', 'shop.js _shopBuy: a staple'),
  shop_pile:           R('take', 'whole', 'shop.js _shopBuy: from his pile'),

  /* ── selling ── */
  shop_sell:           R('give', 'wholeClamp', 'shop.js _shopSell'),
  weapon_sell:         R('give', 'orZero', 'gear.js _handleSellWeapon'),

  /* ── rewards ── */
  quest_reward:        R('give', 'orZero', 'quests.js _handleQuestTurnIn'),
  guild_rung:          R('give', 'orZero', 'guilds.js _handleGuildTurnIn'),
  farm_order:          R('give', 'wholeFloor', 'farmorders.js _handleFarmOrder'),
  daily_chest:         R('give', 'orZero', 'dailychest.js _handleChestOpen'),
  dungeon_clear:       R('give', 'orZero', 'dungeon.js _dungeonComplete'),
  boss_chest:          R('give', 'orZero', 'dungeonreward.js _dungeonReward'),
  loot_gold:           R('give', 'orZero', 'index.js _handleLootPickup: a pile\'s gold'),
  loot_weapon_sold:    R('give', 'orZero', 'index.js _handleLootPickup: a full bag sells the pile\'s weapon'),
  mail_gold:           R('give', 'orZeroClamp', 'inbox.js _applyCreditToPs: every _creditPlayer gold credit, landed'),

  /* ── chance ── */
  ace_flip_win:        R('give', 'orZero', 'gamble.js _handleAceFlipRequest: won'),
  ace_flip_loss:       R('take', 'orZero', 'gamble.js _handleAceFlipRequest: lost'),
  gamble_win:          R('give', 'plain', 'gamble.js _handleGambleRequest: won'),
  gamble_loss:         R('take', 'plain', 'gamble.js _handleGambleRequest: lost'),
  jackpot_ticket:      R('take', 'plain', 'cadence.js _handleJackpotDeposit'),

  /* ── between players ── */
  gift_trade:          R('take', 'plain', 'trade.js _interceptTrade: the old gift trade, the sender'),
  trade_window:        R('take', 'plain', 'trade2.js _handleTrade2Confirm: each side\'s gold'),
  threat_levy:         R('take', 'plain', 'threat.js _interceptThreat: the 10% fine'),
  nml_loss:            R('set', null, 'nomansland.js _nmlOnDeath: the purse goes to the killer\'s mail'),

  /* ── into escrow, and back ── */
  bank_deposit:        R('take', 'whole', 'bank.js _handleBankMove: in'),
  bank_withdraw:       R('give', 'whole', 'bank.js _handleBankMove: out'),
  market_order:        R('take', 'plain', 'market.js _mktPlaceOrder: a buy order\'s gold'),
  market_unwind:       R('give', 'orZero', 'market.js _mktUnwind: a buy order\'s gold back'),
  ah_offer_back:       R('give', 'orZero', 'storeoffer.js _soPlaceOneWrite: the old offer\'s gold back'),
  ah_offer:            R('take', 'plain', 'storeoffer.js _soPlaceOneWrite: the new offer'),
  escrow_debit:        R('take', 'plain', 'inbox.js _escrowDebitGold: a live player'),
  escrow_debit_stored: R('take', 'plain', 'inbox.js _escrowDebitGold: the stored record of one who is away'),
  escrow_debit_group:  R('take', 'plain', 'inbox.js _escrowDebitGoldTogether'),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* The row for a road and a verb, or a thrown error.  A wrong road is a
   programming slip the test catches before it ships (every call names a
   literal row); failing loudly here keeps one that slipped past from moving
   gold by a sum nobody chose. */
function roadFor(road, dir) {
  const row = typeof road === 'string' && own(GOLD_ROADS, road) ? GOLD_ROADS[road] : null;
  if (!row) throw new Error('gold door: no road "' + road + '" (gold.js GOLD_ROADS)');
  if (row.dir !== dir) throw new Error('gold door: road "' + road + '" is a ' + row.dir + ', not a ' + dir);
  return row;
}

/** The purse after `n` moves by `road` -- the door's whole sum, pure (the test's). */
export function goldAfter(cur, n, road) {
  const row = own(GOLD_ROADS, road) ? GOLD_ROADS[road] : null;
  if (!row || row.dir === 'set') throw new Error('gold door: goldAfter needs a give or take road, not "' + road + '"');
  return GOLD_SUMS[row.sum](cur, n, row.dir === 'take');
}

export const goldMethods = {
  /** Gold INTO `rec`'s purse (a live player's state or a stored record) by `road`. Returns the purse. */
  _goldGive(rec, n, road) {
    const row = roadFor(road, 'give');
    rec.coins = GOLD_SUMS[row.sum](rec.coins, n, false);
    return rec.coins;
  },

  /** Gold OUT of `rec`'s purse by `road`.  The caller has already checked the
      purse holds it (step 1: as each did before the door).  Returns the purse. */
  _goldTake(rec, n, road) {
    const row = roadFor(road, 'take');
    rec.coins = GOLD_SUMS[row.sum](rec.coins, n, true);
    return rec.coins;
  },

  /** The purse MADE `v` by `road`: a character loaded, or a purse lost whole. */
  _goldSet(rec, v, road) {
    roadFor(road, 'set');
    rec.coins = v;
    return rec.coins;
  },
};
