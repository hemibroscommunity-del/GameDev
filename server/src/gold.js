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
 * ═══ v2.3.4803: STEP 2 -- ONE SUM FOR EVERY ROAD ═══
 * The owner, 2026-11-11, of the plan: "keep going on the architectural plan".
 * Every road now does the same sum (ONE_SUM below): the purse read as a whole
 * number never below 0, the amount likewise, and the answer never below 0.  A
 * set makes the purse a whole number never below 0 too, so a broken purse
 * saved long ago heals when its character loads.  For an honest purse and an
 * honest amount -- whole, not below 0, a take no larger than the purse, which
 * every road's caller checks -- it is the step-1 sum exactly (gold-door.test
 * §6 proves it road by road).  What it changes is a purse that was not a whole
 * number: the Ace flip's and the gamble's stakes come from the phone, are
 * checked to be finite but not whole, and could leave a fraction of a coin
 * behind.  `goldonesum: false` in the live flags puts every road back on its
 * step-1 sum (GOLD_SUMS, the `sum` column), which stays until this has run a
 * while and the column can be deleted.
 *
 * ═══ v2.3.4903: STEP 3 (first part) -- THE GOLD LOG ═══
 * Every move through the door is noted on a short list per purse: when, the
 * road, how much it moved, the purse after (GOLD_LOG below).  MEMORY ONLY --
 * no storage write, so no running cost (the gold door's own condition for
 * step 3): a WeakMap keyed by the purse object itself, so it never rides a
 * save (a stored record is written whole elsewhere, and rule 1 keeps the
 * rpg blob's field list fixed), goes when the player's state goes, and a
 * stored record's notes go with that record.  The last GOLD_LOG.KEEP moves a
 * purse.  Read by the owner's `GET /dev/goldlog?id=` (devtools.js), for
 * spotting duplicated gold or a cheat while it is happening.  Off with
 * `goldlog: false` in the live flags (nothing noted).
 *
 * STEP 3, the rest: the fight lock at the door, test mode.
 * docs/specs/gold-door.md has the list.
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

/* ═══ v2.3.5081: EVERY ROAD HAS A CLASS (grand plan step 4.4, card E PR 2) ═══
 * Where the gold came from or went (docs/SHAPES.md part 3, which rules the
 * edges).  Exactly one a road:
 *   mint    gold that was in no record before (a reward, a sale to the shop);
 *   burn    gold no record holds after (a price paid to the game);
 *   move    one side of gold passing from one player's holding to ANOTHER
 *           player's -- `other` is the road the other side lands by;
 *   escrow  one side of gold passing between a player's holding and a record
 *           the WORKER keeps for a stated purpose (ESCROW_PLACES) -- `other`
 *           names it (a list where one shared helper feeds several).
 * The world's sum (step 4.4) is: everything held equals the start, plus
 * what was minted, less what was burned; a move and its other side, and an
 * escrow and its record, add to nothing.  A SET road is classed by its
 * difference (the purse after, less what the world held for that character
 * before: the live purse, or for a load the stored record), and its counter
 * books that difference signed.  gold-door.test §8 fails a road with no
 * class, and a move or escrow with no other. */
export const CLASSES = Object.freeze(['mint', 'burn', 'move', 'escrow']);
/* v2.3.5081: the records an escrow road may name (SHAPES part 3).  Each is a
   storage prefix but for three single keys; `death_pile:` is a player's pile
   on the ground (its row when one is saved, the room's memory while it is up:
   a dropped item's pile is a death pile's own, never saved -- itemdrop.js). */
export const ESCROW_PLACES = Object.freeze(['bank:', 'mkt_order:', 'store_listing:', 'duelEscrow:', 'arena_entry:',
  'arena_stake:', 'bounty:', 'jackpot:draw', 'death_pile:', 'inbox:', 'shop_stock']);

/** v2.3.5081: what a road table's rows lack to be counted (gold-door.test
 *  and bag-door.test §8): a class, a move's other road (a row of
 *  `roadsOfOther`), an escrow's place.  [] when every row is whole. */
export function classFaults(table, roadsOfOther) {
  const bad = [];
  for (const [name, row] of Object.entries(table)) {
    const c = row && row.class;
    if (!CLASSES.includes(c)) { bad.push(name + ': no class (' + String(c) + ')'); continue; }
    const other = row.other;
    if (c === 'mint' || c === 'burn') { if (other != null) bad.push(name + ': a ' + c + ' has no other side, yet names ' + JSON.stringify(other)); continue; }
    if (other == null || other === '' || (Array.isArray(other) && !other.length)) { bad.push(name + ': a ' + c + ' with no other side'); continue; }
    if (c === 'move') {
      if (typeof other !== 'string' || !Object.prototype.hasOwnProperty.call(roadsOfOther, other)) bad.push(name + ': a move whose other side "' + other + '" is no road');
      continue;
    }
    for (const o of (Array.isArray(other) ? other : [other])) if (!ESCROW_PLACES.includes(o)) bad.push(name + ': an escrow into "' + o + '", which is not a place that holds (ESCROW_PLACES)');
  }
  return bad;
}

/* ── EVERY ROAD GOLD MOVES BY ──
 * dir:   'give' (into the purse), 'take' (out of it) or 'set' (the purse made
 *        this; a load or a loss).
 * sum:   the GOLD_SUMS row (give and take only).
 * at:    where its one caller is, for people (the test checks the caller).
 * class: v2.3.5081, CLASSES above; other: a move's other road, an escrow's
 *        place (ESCROW_PLACES), or null.
 * A new way to change gold is a new row here and one call that names it. */
const R = (dir, sum, at, cls, other = null) => Object.freeze({ dir, sum, at, class: cls, other: Array.isArray(other) ? Object.freeze(other.slice()) : other });
export const GOLD_ROADS = Object.freeze({
  /* ── a character arrives ── */
  /* v2.3.5081: a load changes nothing the world holds (the stored record IS
     the character while away) but the coin's fraction step 2 heals: a burn,
     booked signed (a negative purse healed to 0 books a negative burn) */
  join_stored:         R('set', null, 'join.js _handleJoin: the stored character', 'burn'),
  join_new:            R('set', null, 'join.js _handleJoin: a new character (the server\'s defaults, capped)', 'mint'),

  /* ── paying for things ── */
  amulet_craft:        R('take', 'plain', 'amulet.js _handleAmuletForge: craft an amulet', 'burn'),
  gem_extract:         R('take', 'plain', 'amulet.js _handleAmuletForge: take the gems out of a piece', 'burn'),
  weapon_forge:        R('take', 'plain', 'gear.js _handleForgeWeapon', 'burn'),
  harden:              R('take', 'plain', 'hardening.js _handleHardenWeapon', 'burn'),
  tonic_buy:           R('take', 'plain', 'cooking.js _handleShopPurchase', 'burn'),
  tonic_refund:        R('give', 'plain', 'cooking.js _handleShopPurchase: the tonic would not apply (an arena match)', 'mint'),   /* tonic_buy's burn, given back */
  farm_buy:            R('take', 'plain', 'farm.js _handleFarmBuy', 'burn'),
  pet_house:           R('take', 'whole', 'petbook.js _handlePetHouseBuy', 'burn'),
  clan_create:         R('take', 'plain', 'clans.js _handleClanCreate', 'burn'),
  arena_entry:         R('take', 'plain', 'gladiator.js _arenaJoin', 'escrow', 'arena_entry:'),
  shop_tool:           R('take', 'whole', 'shop.js _shopBuy: a lost tool bought back', 'burn'),
  shop_staple:         R('take', 'whole', 'shop.js _shopBuy: a staple', 'burn'),
  shop_pile:           R('take', 'whole', 'shop.js _shopBuy: from his pile', 'burn'),   /* the shop keeps goods, never gold */

  /* ── selling ── */
  shop_sell:           R('give', 'wholeClamp', 'shop.js _shopSell', 'mint'),
  weapon_sell:         R('give', 'orZero', 'gear.js _handleSellWeapon', 'mint'),

  /* ── rewards ── */
  quest_reward:        R('give', 'orZero', 'quests.js _handleQuestTurnIn', 'mint'),
  guild_rung:          R('give', 'orZero', 'guilds.js _handleGuildTurnIn', 'mint'),
  farm_order:          R('give', 'wholeFloor', 'farmorders.js _handleFarmOrder', 'mint'),
  daily_chest:         R('give', 'orZero', 'dailychest.js _handleChestOpen', 'mint'),
  dungeon_clear:       R('give', 'orZero', 'dungeon.js _dungeonComplete', 'mint'),
  boss_chest:          R('give', 'orZero', 'dungeonreward.js _dungeonReward', 'mint'),
  loot_gold:           R('give', 'orZero', 'index.js _handleLootPickup: a pile\'s gold', 'mint'),   /* a monster's pile: a player's pile holds goods only */
  loot_weapon_sold:    R('give', 'orZero', 'index.js _handleLootPickup: a full bag sells the pile\'s weapon', 'mint'),
  /* v2.3.5081: every credit lands here, so its own class is the CREDIT's,
     from MAIL_CLASSES below by its opId's first word; the landing itself is
     the mail (an escrow) paid on -- a credit to a player away waits in
     `inbox:` first, one to a player here lands at once */
  mail_gold:           R('give', 'orZeroClamp', 'inbox.js _applyCreditToPs: every _creditPlayer gold credit, landed', 'escrow', 'inbox:'),

  /* ── chance ── */
  ace_flip_win:        R('give', 'orZero', 'gamble.js _handleAceFlipRequest: won', 'mint'),
  ace_flip_loss:       R('take', 'orZero', 'gamble.js _handleAceFlipRequest: lost', 'burn'),
  gamble_win:          R('give', 'plain', 'gamble.js _handleGambleRequest: won', 'mint'),
  gamble_loss:         R('take', 'plain', 'gamble.js _handleGambleRequest: lost', 'burn'),
  jackpot_ticket:      R('take', 'plain', 'cadence.js _handleJackpotDeposit', 'escrow', 'jackpot:draw'),

  /* ── between players ── */
  gift_trade:          R('take', 'plain', 'trade.js _interceptTrade: the old gift trade, the sender', 'move', 'mail_gold'),   /* credit `trade:` */
  trade_window:        R('take', 'plain', 'trade2.js _handleTrade2Confirm: each side\'s gold', 'move', 'mail_gold'),        /* credit `trade2:` */
  threat_levy:         R('take', 'plain', 'threat.js _interceptThreat: the 10% fine', 'escrow', 'bounty:'),
  /* v2.3.5081: a player's kill moves the purse to the killer's mail (credit
     `nmlloot:`).  v2.3.5084: a red skull killed by a monster loses it to
     nobody, by `nml_lost` below */
  nml_loss:            R('set', null, 'nomansland.js _nmlOnDeath: the purse goes to the killer\'s mail', 'move', 'mail_gold'),
  /* v2.3.5084: ...and a red skull killed by anything but a player loses it
     to nobody: the same loss, a road of its own, because it is a burn (one
     class a road; card E PR 5, the owner's yes of 2026-11-14) */
  nml_lost:            R('set', null, 'nomansland.js _nmlOnDeath: a red skull killed by no player, the purse lost', 'burn'),

  /* ── into escrow, and back ── */
  bank_deposit:        R('take', 'whole', 'bank.js _handleBankMove: in', 'escrow', 'bank:'),
  bank_withdraw:       R('give', 'whole', 'bank.js _handleBankMove: out', 'escrow', 'bank:'),
  market_order:        R('take', 'plain', 'market.js _mktPlaceOrder: a buy order\'s gold', 'escrow', 'mkt_order:'),
  market_unwind:       R('give', 'orZero', 'market.js _mktUnwind: a buy order\'s gold back', 'escrow', 'mkt_order:'),
  ah_offer_back:       R('give', 'orZero', 'storeoffer.js _soPlaceOneWrite: the old offer\'s gold back', 'escrow', 'store_listing:'),
  ah_offer:            R('take', 'plain', 'storeoffer.js _soPlaceOneWrite: the new offer', 'escrow', 'store_listing:'),
  /* one shared helper, several records: the opId says which (`arenastake:`,
     `store:<id>:pay|bid|offer`, `duel:`) */
  escrow_debit:        R('take', 'plain', 'inbox.js _escrowDebitGold: a live player', 'escrow', ['arena_stake:', 'store_listing:']),
  escrow_debit_stored: R('take', 'plain', 'inbox.js _escrowDebitGold: the stored record of one who is away', 'escrow', ['arena_stake:', 'store_listing:']),
  escrow_debit_group:  R('take', 'plain', 'inbox.js _escrowDebitGoldTogether', 'escrow', ['duelEscrow:', 'arena_stake:', 'store_listing:']),
});

/* ═══ v2.3.5081: THE MAIL'S CLASS IS ITS CREDIT'S (SHAPES part 3, edge 2) ═══
 * Every settlement pays through _creditPlayer (handoff rule 4), and its gold
 * and goods land by ONE road each (`mail_gold`, bag.js `mail_item`).  So the
 * class of what a credit carries is not the road's: it is the credit's, from
 * this closed table, keyed by the FIRST WORD OF THE CREDIT'S opId.
 *
 * Why the opId and not `source`: `source` has 15 values and is too coarse to
 * carry a class (`arena` is an entry refunded, a pot, a stake's cut, a stake
 * won and a stake lost; `market` is three records and two directions).  The
 * opId's first word is finer -- every gold or goods credit of one word has
 * one class (the auction house's eight legs are all its listing paid on or
 * given back) -- and it is already the credit's identity: the same on a
 * retry, written on the inbox entry with it, and a literal in every caller
 * (gold-door.test §8 fails a credit whose word has no row here).
 *
 * A row: {class, other} as a road's, for the GOLD and GOODS a credit lands
 * (a weapon, a piece of gear, a pet or an achievement is another kind, not
 * summed by these roads).  `house` (edge 3): the champion's prize is the
 * entries held (an escrow paid on) and the house's gold (a mint) in ONE
 * credit, so it carries the two amounts -- `payload.house` the minted part
 * -- rather than becoming two credits a restart could split (handoff rule
 * 5).  The payload field is written by the PR that counts it (card E). */
const M = (cls, other = null, house = false) => Object.freeze({ class: cls, other, house });
export const MAIL_CLASSES = Object.freeze({
  admin:            M('mint'),                          /* the owner's grant (admin.js) */
  allywar:          M('mint'),                          /* an alliance war's flat pay */
  clanwar:          M('mint'),                          /* a clan war's flat pay */
  dq:               M('mint'),                          /* a daily quest's gold */
  season:           M('mint'),                          /* a season tier's gold or goods */
  loginspin:        M('mint'),                          /* the login wheel */
  spinpot:          M('mint'),                          /* the daily spin's pot: a promise until paid (double or nothing can end it) */
  questitem:        M('mint'),                          /* a quest's item, the bag full */
  risechest:        M('mint'),                          /* the chest on a rise */
  jackpotwin:       M('escrow', 'jackpot:draw'),        /* the weekly pool, paid on */
  duelpot:          M('escrow', 'duelEscrow:'),
  duelrefund:       M('escrow', 'duelEscrow:'),
  arenarefund:      M('escrow', 'arena_entry:'),
  arenapot:         M('escrow', 'arena_entry:', true),  /* the entries held, and the house's gold (`house`) minted */
  arenastakecut:    M('escrow', 'arena_stake:'),
  arenastakewin:    M('escrow', 'arena_stake:'),
  arenastakeloss:   M('escrow', 'arena_stake:'),
  arenastakerefund: M('escrow', 'arena_stake:'),
  arenaachv:        M('mint'),                          /* an achievement, no gold or goods: listed so every word has a row */
  settle:           M('escrow', 'mkt_order:'),          /* the General Store's legs: a buy order's gold paid on */
  mktunwind:        M('escrow', 'mkt_order:'),
  refund:           M('escrow', 'mkt_order:'),
  store:            M('escrow', 'store_listing:'),      /* the Auction House: pay, goods, gold, bid and offer refunds, unwind, refund */
  bountypay:        M('escrow', 'bounty:'),
  nmlloot:          M('move', 'nml_loss'),              /* the dead player's purse (the gold); goods are a pile's */
  trade:            M('move', 'gift_trade'),            /* the old gift trade (gold: GOLD_ROADS, goods: bag.js, the same name) */
  trade2:           M('move', 'trade_window'),          /* the trade window's gold and goods (its weapons and pets: other kinds) */
});
/** The class of a credit by its opId, or null when its first word has no row. */
export function mailClassOf(opId) {
  if (typeof opId !== 'string') return null;
  const w = opId.split(':')[0];
  return Object.prototype.hasOwnProperty.call(MAIL_CLASSES, w) ? MAIL_CLASSES[w] : null;
}

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* v2.3.4803: step 2's one sum.  Gold is a whole number of coins, never below
   0: a purse or an amount that is not (missing, NaN, fractional, below 0, not
   finite) is read as the whole number under it, or 0. */
const wholeGold = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
};
export function goldOneSum(cur, n, take) {
  const p = wholeGold(cur), a = wholeGold(n);
  return take ? Math.max(0, p - a) : p + a;
}
export { wholeGold };

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

/** The purse after `n` moves by `road` by its STEP-1 sum (its `sum` column) --
    pure, the test's.  v2.3.4803: the door does goldOneSum unless `goldonesum: false`. */
export function goldAfter(cur, n, road) {
  const row = own(GOLD_ROADS, road) ? GOLD_ROADS[road] : null;
  if (!row || row.dir === 'set') throw new Error('gold door: goldAfter needs a give or take road, not "' + road + '"');
  return GOLD_SUMS[row.sum](cur, n, row.dir === 'take');
}

/* v2.3.4903: the gold log (step 3).  Keyed by the purse object: never saved,
   gone with it.  KEEP moves a purse, the oldest dropped. */
export const GOLD_LOG = Object.freeze({ KEEP: 32 });
const goldLogs = new WeakMap();
function goldLogNote(rec, road, before, after, now) {
  if (!rec || typeof rec !== 'object') return;
  let list = goldLogs.get(rec);
  if (!list) { list = []; goldLogs.set(rec, list); }
  const b = Number(before), a = Number(after);
  list.push({ at: now, road, d: Number.isFinite(a) && Number.isFinite(b) ? a - b : null, c: Number.isFinite(a) ? a : null });
  if (list.length > GOLD_LOG.KEEP) list.splice(0, list.length - GOLD_LOG.KEEP);
}
/** The log of a purse, oldest first (a copy), or []. */
export function goldLogOf(rec) {
  const list = rec && typeof rec === 'object' ? goldLogs.get(rec) : null;
  return list ? list.map((e) => ({ ...e })) : [];
}

/* ═══ v2.3.5084: THE DOOR COUNTS WHAT IT MINTS AND BURNS (grand plan step 4.4, card E PR 5) ═══
 * Into the record's own `_econ` (migrations.js ECON: rule 1's second
 * exception), so the count rides the purse's own put (the plan's rule 5).
 * The difference is read the way the world's sum reads a purse: whole coins
 * never below 0 (wholeGold).  A `mint` road books it under `m`, a `burn`
 * road under `b`; a `move` or an `escrow` changes no world total and books
 * nothing.  A `set` road books its difference signed (SHAPES part 3, edge
 * 1); a LOAD (GOLD_LOADS) books nothing: the world held the stored purse
 * while the character was away, and under the whole-coin reading the load
 * changes nothing.  The mail (`mail_gold`) is an escrow of `inbox:`: what a
 * payout carries is counted by its own class when its credit is handed to
 * the door (`credit`, MAIL_CLASSES by its opId; `house`, the part minted). */
export const GOLD_LOADS = Object.freeze(['join_stored']);
export const ECON_V = 1;   /* migrations.js ECON.V: the shape the doors write into */
/** The record's `_econ`, made if it has none; null for a NEWER one (never
 *  counted into: a rolled-back worker leaves a newer shape alone). */
export function econOn(rec) {
  if (!rec || typeof rec !== 'object') return null;
  let e = rec._econ;
  if (e === undefined || e === null || typeof e !== 'object') {
    e = rec._econ = { v: ECON_V, g: { m: 0, b: 0 }, i: Object.create(null) };
  }
  if (typeof e.v === 'number' && e.v > ECON_V) return null;
  if (!e.g || typeof e.g !== 'object') e.g = { m: 0, b: 0 };
  if (!e.i || typeof e.i !== 'object') e.i = Object.create(null);
  return e;
}
const econNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
/* `d`: the purse after less the purse before, by the sum's reading */
function econGold(rec, cls, d) {
  if (!d || (cls !== 'mint' && cls !== 'burn')) return;
  const e = econOn(rec);
  if (!e) return;
  if (cls === 'mint') e.g.m = econNum(e.g.m) + d;
  else e.g.b = econNum(e.g.b) - d;
}
/** v2.3.5084: what a payout landing by the mail counts: its class by its
 *  opId's first word; a mint all of what landed, an escrow with `house` the
 *  house's part of it (edge 3), a move or any other escrow nothing.  A payout
 *  whose word has no row counts nothing (gold-door.test fails such a word). */
export function mailMinted(credit, landed) {
  const row = credit && typeof credit === 'object' ? mailClassOf(credit.opId) : null;
  if (!row || !(landed > 0)) return 0;
  if (row.class === 'mint') return landed;
  if (row.house) {
    const p = credit.payload || {};
    return Math.max(0, Math.min(landed, Math.floor(Number(p.house) || 0)));
  }
  return 0;
}

export const goldMethods = {
  /** v2.3.4903: step 3's log switch -- on unless `goldlog: false` in the live flags */
  _goldLogOn() {
    const f = this && this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'goldlog') && !f.goldlog);
  },
  _goldLogged(rec, road, before) {
    if (this._goldLogOn()) goldLogNote(rec, road, before, rec.coins, Date.now());
    return rec.coins;
  },

  /** v2.3.4803: step 2's switch -- on unless `goldonesum: false` in the live flags */
  _goldOneSumOn() {
    const f = this && this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'goldonesum') && !f.goldonesum);
  },

  /** Gold INTO `rec`'s purse (a live player's state or a stored record) by `road`. Returns the purse.
      v2.3.5084: `credit`, the payout the mail road lands (inbox.js), counted by its own class. */
  _goldGive(rec, n, road, credit) {
    const row = roadFor(road, 'give');
    const before = rec.coins;
    rec.coins = this._goldOneSumOn() ? goldOneSum(rec.coins, n, false) : GOLD_SUMS[row.sum](rec.coins, n, false);   /* v2.3.4803 */
    const d = wholeGold(rec.coins) - wholeGold(before);
    econGold(rec, row.class, d);   /* v2.3.5084 */
    if (credit) econGold(rec, 'mint', mailMinted(credit, d));
    return this._goldLogged(rec, road, before);   /* v2.3.4903 */
  },

  /** Gold OUT of `rec`'s purse by `road`.  The caller has already checked the
      purse holds it (step 1: as each did before the door).  Returns the purse. */
  _goldTake(rec, n, road) {
    const row = roadFor(road, 'take');
    const before = rec.coins;
    rec.coins = this._goldOneSumOn() ? goldOneSum(rec.coins, n, true) : GOLD_SUMS[row.sum](rec.coins, n, true);   /* v2.3.4803 */
    econGold(rec, row.class, wholeGold(rec.coins) - wholeGold(before));   /* v2.3.5084 */
    return this._goldLogged(rec, road, before);   /* v2.3.4903 */
  },

  /** The purse MADE `v` by `road`: a character loaded, or a purse lost whole. */
  _goldSet(rec, v, road) {
    const row = roadFor(road, 'set');
    const before = rec.coins;
    rec.coins = this._goldOneSumOn() ? wholeGold(v) : v;   /* v2.3.4803: a broken purse heals as it loads */
    if (!GOLD_LOADS.includes(road)) econGold(rec, row.class, wholeGold(rec.coins) - wholeGold(before));   /* v2.3.5084 */
    return this._goldLogged(rec, road, before);   /* v2.3.4903 */
  },
};
