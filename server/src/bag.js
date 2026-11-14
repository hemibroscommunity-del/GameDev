/* ═══ v2.3.4810: THE BAG DOOR -- every change to a count in a player's bag goes through here ═══
 * (spec: docs/specs/bag-door.md; pinned by server/test/bag-door.test.mjs)
 *
 * WHY.  A player's bag (`ps.inventory`, and a stored `rpg:` record's
 * `inventory`) was changed by hand in 69 places across 28 files: every cook,
 * craft, shop, harvest, trade, the mail, the bank.  Each place read the count
 * its own way -- eight different ways (below) -- and emptied a stack its own
 * way (two rules, which differ for a count that is not a number).  The gold
 * door (gold.js, v2.3.4670) found the same shape for gold; this is that, for
 * the bag.
 *
 * THE DOOR is three plain functions, bagGive, bagTake and bagSet (plain, not
 * GameRoom methods: gems.js and a few helpers are not on the room).  Each
 * takes the BAG itself (the `inventory` object, which the caller has made
 * sure exists, exactly as before), the key, the amount, and its ROAD -- its
 * row in BAG_ROADS -- and does the sum and the emptying that row says.
 * bag-door.test fails:
 *   - a write to a bag count anywhere else in server/src (`inventory[k] =`,
 *     `+=`, `-=`, `delete`, `inventory.key =`, or the same through a name
 *     that holds the bag);
 *   - a call naming a road the table has not got, or with the wrong verb;
 *   - a road with no caller, or with two;
 *   - a road whose sum is not the line its place had before the door.
 *
 * STEP 1 (this version): NOTHING A PLAYER SEES CHANGES.  Each row keeps the
 * exact read and the exact empty rule its place had, so the eight reads and
 * two empty rules are still here -- now as two columns of one table.  The
 * test replays each place's old line against the door for every count a bag
 * can hold (whole, fractional, negative, missing, NaN, a string) and they
 * agree to the bit.
 *
 * ═══ v2.3.4900: STEP 2 -- ONE READ AND ONE EMPTY RULE FOR EVERY ROAD ═══
 * The gold door's step 2 (v2.3.4803), for the bag.  Every road now reads the
 * count one way (bagCount: own key only, a whole number, never below 0; a
 * missing, NaN, fractional, negative, string or infinite count reads as the
 * whole number under it, or 0), reads the amount the same way, never takes
 * below 0, and empties a stack one way (a stack of 0 is gone).  A set makes
 * the count a whole number never below 0 by the same rule.  For an honest bag
 * and amount -- whole counts, not below 0, a take no larger than the stack,
 * which every caller checks -- it is the step-1 line exactly, but for one
 * thing nobody sees: a give of 0 onto nothing leaves no `0` stack behind
 * (bag-door.test §6 proves both, road by road).  What it heals: a count no
 * honest road made (a string, a fraction, NaN) and the Object.prototype
 * names, which the `plain` and `orZero` reads read off the prototype.
 * `bagonesum: false` in the live flags puts every road back on its step-1
 * read and empty rule (BAG_READS, the `read` and `empty` columns) at once:
 * plain functions cannot see the room's flags, so the room hands the switch
 * down (setBagOneSum, from liveops.js _syncBagCaps) whenever its flags load
 * or change.  The columns stay until this has run a while.
 *
 * WHAT IS NOT HERE (on purpose, listed in the test with why):
 *   - whole-bag assigns: a new bag (`ps.inventory = {}`), the join's load,
 *     the death wipe -- they make the bag, not a count in it;
 *   - the old gem pouch (`lifeSkills.gems`), the bank vault, a market order,
 *     a listing: other records, each with its own rules;
 *   - a local tally that is not the bag (farm.js's harvest `items`).
 *
 * No imports: node tests it directly.  (v2.3.5084: but one, gold.js's mail
 * table, which has none: a payout's class is read where every class is.)
 */
import { mailMinted, ECON_V } from './gold.js';   /* v2.3.5084: a payout's own class (MAIL_CLASSES); v2.3.5085: `_econ`'s shape number, one place */

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ── HOW EACH ROAD READS THE COUNT (step 1: as it did before the door) ──
 * `b` is the bag, `k` the key.  They differ only for a count no honest road
 * makes -- missing, NaN, a string, fractional or below 0. */
export const BAG_READS = Object.freeze({
  /* `inv[k] -= n`: the count as it is */
  plain: (b, k) => b[k],
  /* `(inv[k] || 0)`: a missing (or NaN) count is 0 */
  orZero: (b, k) => b[k] || 0,
  /* `Math.floor(Number(inv[k]) || 0)`: a whole number */
  whole: (b, k) => Math.floor(Number(b[k]) || 0),
  /* `Math.max(0, Math.floor(Number(inv[k]) || 0))`: whole, not below 0 */
  wholeFloor: (b, k) => Math.max(0, Math.floor(Number(b[k]) || 0)),
  /* `own(inv, k) ? Math.floor(Number(inv[k]) || 0) : 0`: own key, whole */
  ownWhole: (b, k) => (own(b, k) ? Math.floor(Number(b[k]) || 0) : 0),
  /* own key, whole, not below 0 (trapping.js trapsIn, the shard crack, the boss chest) */
  ownWholeFloor: (b, k) => (own(b, k) ? Math.max(0, Math.floor(Number(b[k]) || 0)) : 0),
  /* inbox.js `_invCount`: own key, `Number(v) || 0` (not floored) */
  ownNumber: (b, k) => (typeof k !== 'string' || !own(b, k) ? 0 : Number(b[k]) || 0),
  /* gems.js `num`: own key, whole, finite and above 0, else 0 */
  gem: (b, k) => {
    if (!own(b, k)) return 0;
    const n = Math.floor(Number(b[k]));
    return Number.isFinite(n) && n > 0 ? n : 0;
  },
});

/* ── HOW EACH ROAD EMPTIES A STACK ──
 *   none:   the answer is written as it is;
 *   leZero: written, then `if (inv[k] <= 0) delete inv[k]` (a NaN stays);
 *   gtZero: `if (x > 0) inv[k] = x; else delete inv[k]` (a NaN goes). */
export const BAG_EMPTY = Object.freeze(['none', 'leZero', 'gtZero']);

/* ── EVERY ROAD A BAG COUNT MOVES BY ──
 * dir:   'give', 'take' or 'set' (the count made this, whatever it was).
 * read:  the BAG_READS row (give and take only).
 * empty: the BAG_EMPTY rule.
 * cap:   true when the call passes a most-it-fills-to (the quest grant).
 * at:    where its one caller is (the test checks the file).
 * class: v2.3.5081 (grand plan step 4.4, card E PR 2): `mint`, `burn`, `move`
 *        or `escrow`, as gold.js's CLASSES say, for this key's count; other:
 *        a move's other road (the mail's), an escrow's place (gold.js
 *        ESCROW_PLACES: `shop_stock` is Diego's pile, `death_pile:` a
 *        player's pile on the ground), or null.  A cook is two roads of two
 *        classes: the raw fish burned, the cooked fish minted.  The mail's
 *        own class is its credit's (gold.js MAIL_CLASSES).
 * A new way to change the bag is a new row here and one call that names it. */
const R = (dir, read, empty, at, cls, other = null, cap = false) =>
  Object.freeze({ dir, read, empty, at, cap, class: cls, other: Array.isArray(other) ? Object.freeze(other.slice()) : other });
export const BAG_ROADS = Object.freeze({
  /* ── eating, drinking, burning ── */
  eat_meal:           R('take', 'plain', 'leZero', 'cooking.js _handleEatRequest: a meal', 'burn'),
  eat_fish:           R('take', 'plain', 'leZero', 'cooking.js _handleEatRequest: a cooked fish or crop', 'burn'),
  firemaking:         R('take', 'plain', 'leZero', 'cooking.js _handleFiremakingRequest', 'burn'),
  drink:              R('take', 'plain', 'leZero', 'cooking.js _handleDrinkRequest', 'burn'),
  shop_item_trap:     R('give', 'orZero', 'none', 'cooking.js _applyShopItem: a trap', 'mint'),

  /* ── cooking ── */
  cook_ingredient:    R('take', 'plain', 'leZero', 'cooking.js _consumeIngredient', 'burn'),
  cook_recipe:        R('give', 'whole', 'none', 'cooking.js _handleCookRecipe', 'mint'),
  cook_fish_used:     R('take', 'plain', 'leZero', 'cooking.js _handleCookRequest: the raw fish', 'burn'),
  cook_fish_cooked:   R('give', 'orZero', 'none', 'cooking.js _handleCookRequest: cooked', 'mint'),
  cook_burnt:         R('give', 'orZero', 'none', 'cooking.js _handleCookRequest: burnt', 'mint'),

  /* ── crafting ── */
  armor_forge:        R('take', 'whole', 'leZero', 'armorforge.js _handleForgeArmor: the bars', 'burn'),
  weapon_forge:       R('take', 'plain', 'leZero', 'gear.js _handleForgeWeapon: the bars, logs or ore', 'burn'),
  harden_mats:        R('take', 'ownWhole', 'leZero', 'hardening.js _handleHardenWeapon', 'burn'),
  hardwood_logs:      R('take', 'ownWholeFloor', 'leZero', 'hardenedwood.js _handleMakeHardenedWood: the logs', 'burn'),
  hardwood_made:      R('give', 'ownWhole', 'none', 'hardenedwood.js _handleMakeHardenedWood: the hardened wood', 'mint'),
  smelt_ore:          R('take', 'whole', 'leZero', 'smelting.js _handleSmeltBar: the ore', 'burn'),
  smelt_bar:          R('give', 'whole', 'none', 'smelting.js _handleSmeltBar: the bars', 'mint'),
  salvage_bars:       R('give', 'whole', 'none', 'salvage.js _handleSmithSalvage: the bars', 'mint'),
  salvage_essence:    R('give', 'whole', 'none', 'salvage.js _handleSmithSalvage: the essence', 'mint'),
  essence_apply:      R('take', 'whole', 'leZero', 'salvage.js _handleEssenceApply', 'burn'),
  trap_logs:          R('take', 'ownWholeFloor', 'leZero', 'trapping.js _handleMakeTraps: the logs', 'burn'),
  trap_made:          R('give', 'ownWholeFloor', 'none', 'trapping.js _handleMakeTraps: the traps', 'mint'),
  trap_sprung:        R('take', 'ownWholeFloor', 'leZero', 'trapping.js _trapRollOnKill', 'burn'),
  trap_legacy_out:    R('set', null, 'gtZero', 'trapping.js _trapJoinConvert: the old trap key (set to 0: gone)', 'burn'),
  trap_legacy_in:     R('give', 'ownWholeFloor', 'none', 'trapping.js _trapJoinConvert: as new traps', 'mint'),

  /* ── gems and shards ── */
  gem_take:           R('take', 'gem', 'gtZero', 'gems.js gemTake: the bag\'s part (every gem spent)', 'burn'),
  gem_give:           R('give', 'gem', 'none', 'gems.js gemGive (every gem gained)', 'mint'),
  shard_crack:        R('take', 'ownWholeFloor', 'gtZero', 'shardcrack.js _handleShardCrack', 'burn'),
  rare_gem_combine:   R('take', 'ownWholeFloor', 'gtZero', 'shardcrack.js _handleGemCombine: a rare gem', 'burn'),

  /* ── gathering ── */
  harvest:            R('give', 'orZero', 'none', 'gathering.js _handleNodeStrike: the yield', 'mint'),
  harvest_shard:      R('give', 'orZero', 'none', 'gathering.js _handleNodeStrike: a shard', 'mint'),
  fish_catch_plain:   R('give', 'orZero', 'none', 'fishlog.js _fishCatch: not one of the game\'s fish', 'mint'),
  fish_catch:         R('give', 'orZero', 'none', 'fishlog.js _fishCatch: each fish', 'mint'),

  /* ── the farm ── */
  farm_plant:         R('take', 'whole', 'gtZero', 'farm.js _handleFarmAct: seeds', 'burn'),
  farm_feed:          R('take', 'whole', 'gtZero', 'farm.js _handleFarmAct: compost', 'burn'),
  farm_harvest:       R('give', 'whole', 'none', 'farm.js _handleFarmAct: the crops', 'mint'),
  farm_buy:           R('give', 'whole', 'none', 'farm.js _handleFarmBuy', 'mint'),
  farm_order:         R('take', 'whole', 'gtZero', 'farmorders.js _handleFarmOrder', 'burn'),

  /* ── shops ── */
  shop_sell:          R('take', 'whole', 'leZero', 'shop.js _shopSell: what sold (v2.3.4900: a take, read after the stock\'s await)', 'escrow', 'shop_stock'),
  shop_tool:          R('set', null, 'none', 'shop.js _shopBuy: a lost tool bought back (one)', 'mint'),
  shop_staple:        R('give', 'whole', 'none', 'shop.js _shopBuy: a staple', 'mint'),
  shop_pile:          R('give', 'whole', 'none', 'shop.js _shopBuy: from his pile', 'escrow', 'shop_stock'),

  /* ── rewards ── */
  chest_key:          R('take', 'plain', 'leZero', 'dailychest.js _handleChestOpen: the key', 'burn'),
  chest_prize:        R('give', 'whole', 'none', 'dailychest.js _handleChestOpen: a fish or gem prize', 'mint'),
  boss_chest_item:    R('give', 'ownWholeFloor', 'none', 'dungeonreward.js _dungeonReward', 'mint'),
  quest_collect:      R('take', 'orZero', 'gtZero', 'quests.js _collectConsume', 'burn'),
  quest_item:         R('give', 'orZero', 'none', 'quests.js _grantQuestItem', 'mint', null, true),
  cape_ticket:        R('give', 'orZero', 'none', 'eventcapes.js _claimCapeTicket', 'mint'),
  cape_ticket_spent:  R('take', 'plain', 'leZero', 'eventcapes.js _handleCapeRedeem: the ticket', 'burn'),
  cape_trophy:        R('give', 'whole', 'none', 'eventcapes.js _handleCapeRedeem: the cape', 'mint'),
  loot_death_items:   R('give', 'orZero', 'none', 'index.js _handleLootPickup: a death pile\'s items', 'escrow', 'death_pile:'),
  loot_skull:         R('give', 'orZero', 'none', 'index.js _handleLootPickup: a skull', 'mint'),
  loot_shard:         R('give', 'orZero', 'none', 'index.js _handleLootPickup: a shard', 'mint'),
  loot_gem:           R('give', 'orZero', 'none', 'index.js _handleLootPickup: a gem', 'mint'),

  /* ── chance ── */
  ace_items_win:      R('give', 'whole', 'none', 'gamble.js _handleAceItemFlipRequest: won (doubled)', 'mint'),
  ace_items_loss:     R('take', 'whole', 'gtZero', 'gamble.js _handleAceItemFlipRequest: lost', 'burn'),

  /* ── between players, and the ground ── */
  gift_trade:         R('take', 'ownNumber', 'leZero', 'trade.js _interceptTrade: the old gift trade, the sender', 'move', 'mail_item'),
  trade_window:       R('take', 'ownNumber', 'leZero', 'trade2.js _handleTrade2Confirm: each side\'s items', 'move', 'mail_item'),
  item_drop:          R('take', 'ownWhole', 'gtZero', 'itemdrop.js _handleItemDrop', 'escrow', 'death_pile:'),

  /* ── into escrow, and back ── */
  bank_deposit:       R('take', 'ownWhole', 'gtZero', 'bank.js _handleBankMove: in', 'escrow', 'bank:'),
  bank_withdraw:      R('give', 'ownWhole', 'none', 'bank.js _handleBankMove: out', 'escrow', 'bank:'),
  ah_listing:         R('take', 'ownNumber', 'leZero', 'store.js _stCreateListing', 'escrow', 'store_listing:'),
  mail_item:          R('give', 'ownNumber', 'none', 'inbox.js _applyCreditToPs: every _creditPlayer item credit, landed', 'escrow', 'inbox:'),
  escrow_item:        R('take', 'ownNumber', 'leZero', 'inbox.js _escrowTakeItem: a live player', 'escrow', ['store_listing:']),
  escrow_item_stored: R('take', 'ownNumber', 'leZero', 'inbox.js _escrowTakeItem: the stored record of one who is away', 'escrow', ['store_listing:']),

  /* ── the owner's Test panel ── */
  dev_shards:         R('give', 'wholeFloor', 'none', 'devtools.js _devKit: shards', 'mint'),
  dev_traps:          R('set', null, 'gtZero', 'devtools.js _devTrapping: traps', 'mint'),
  dev_logs:           R('set', null, 'gtZero', 'devtools.js _devTrapping: logs', 'mint'),
  fish_dev:           R('give', 'orZero', 'none', 'fishlog.js _fishDev: give a fish', 'mint'),
});

/* ═══ v2.3.5081: THE WHOLE-BAG ASSIGNS, CLASSED (SHAPES part 3, edge 4) ═══
 * Four lines make the bag whole rather than change a count in it, so they
 * are not roads (bag-door.test WHOLE_BAG lists each, with why).  The world's
 * sum still has to know what each does to what the bag holds:
 *   class null   the assign holds nothing the world did not hold before (an
 *                empty bag; the stored bag loaded, as the stored purse is);
 *   otherwise    a road's class and other.  The death's wipe MOVES the bag
 *                (less the tools and the pickup shield it keeps) to the
 *                pile on the ground (`death_pile:`); the respawn's wipe ends
 *                whatever came into a dead player's bag after it (nothing,
 *                for an honest death: a burn). */
const W = (cls, other, why) => Object.freeze({ class: cls, other, why });
export const BAG_WHOLE = Object.freeze({
  new_bag:     W(null, null, 'a new, empty bag for a player who has none'),
  join_load:   W(null, null, 'the join loads the stored character\'s bag (the record IS the character while away)'),
  join_first:  W(null, null, 'a new character\'s first bag: no claim reaches it since v2.3.3138, so it is empty (a starter kit there would be a mint)'),
  death_wipe:  W('escrow', 'death_pile:', 'the death: the bag less what the dead keep goes to the pile'),
  respawn_wipe: W('burn', null, 'the respawn: what a dead player\'s bag gained after the death wipe'),
});

/* The row for a road and a verb, or a thrown error (nothing written).  Every
   call names a literal row, so a wrong one is a slip the test catches; failing
   loudly keeps one that slipped past from moving a stack by a sum nobody chose. */
function roadFor(road, dir) {
  const row = typeof road === 'string' && own(BAG_ROADS, road) ? BAG_ROADS[road] : null;
  if (!row) throw new Error('bag door: no road "' + road + '" (bag.js BAG_ROADS)');
  if (row.dir !== dir) throw new Error('bag door: road "' + road + '" is a ' + row.dir + ', not a ' + dir);
  return row;
}

/* ═══ v2.3.5084: THE DOOR COUNTS WHAT IT MINTS AND BURNS (grand plan step 4.4, card E PR 5) ═══
 * Each bag key by itself, into the character's `_econ.i[key]` (migrations.js
 * ECON), as the gold door counts gold: a `mint` road books the count's rise
 * under `m`, a `burn` road its fall under `b`, a `set` its difference signed,
 * a `move` or an `escrow` nothing; read the way the world's sum reads a bag
 * (bagCount: own key, whole, never below 0).  A payout landing by the mail
 * (`mail_item`, an escrow of `inbox:`) is counted by its own class when its
 * credit is handed to the door (gold.js mailMinted).
 *
 * The door holds the BAG, not the record the count belongs on.  So the
 * record is learned at its save: `_saveRpg` names the bag's record
 * (bagEconOwn), and from then on the door counts straight into it.  A bag no
 * save has named yet (a join's, a death's new one) keeps its counts beside it
 * (memory only, keyed by the bag object itself) until its record's next
 * save folds them in -- in that save's own put, so what the sum reads is
 * written with what it counts (the plan's rule 5).  bagEconPending lets the
 * world's sum read what waits. */
const ECON_BAD = new Set(['__proto__', 'constructor', 'prototype']);
const econOwner = new WeakMap();     /* bag -> the record that holds it (named at its save) */
const econWaiting = new WeakMap();   /* bag -> { key: {m, b} } counted before its record was named */
function econTarget(bag) {
  const rec = econOwner.get(bag);
  if (rec && rec.inventory === bag) {
    let e = rec._econ;
    if (e === undefined || e === null || typeof e !== 'object') e = rec._econ = { v: ECON_V, g: { m: 0, b: 0 }, i: Object.create(null) };
    if (typeof e.v === 'number' && e.v > ECON_V) return null;   /* a newer worker's shape: never counted into */
    if (!e.i || typeof e.i !== 'object') e.i = Object.create(null);
    return e.i;
  }
  let w = econWaiting.get(bag);
  if (!w) { w = Object.create(null); econWaiting.set(bag, w); }
  return w;
}
/* ═══ v2.3.5085: THE DAY'S BOOK, `econ` PART (card E PR 6) ═══
   Plain functions cannot reach the room, so the room hands the bag door the
   book's door (liveops.js _syncBagCaps, where it hands down the one sum's
   switch): what each road mints and burns of each key is added to the day's
   `econ` part as it runs -- the one call card E's PR 6 makes in this door. */
let BOOK = null;
export function setBagBook(fn) { BOOK = typeof fn === 'function' ? fn : null; }
/* v2.3.5085 (the gatekeeper's sitting 8): the counting's kill switch,
   `econ: false` (gold.js _econOff), handed down as the one sum's is */
let ECON_ON = true;
export function setBagEcon(on) { ECON_ON = on !== false; }
function econBag(bag, k, cls, d) {
  if (!ECON_ON) return;
  if (!d || (cls !== 'mint' && cls !== 'burn') || typeof k !== 'string' || !k || ECON_BAD.has(k)) return;
  if (!bag || typeof bag !== 'object') return;
  if (BOOK) { try { BOOK(cls, k, cls === 'mint' ? d : -d); } catch (e) { /* a count never stops a road */ } }
  const into = econTarget(bag);
  if (!into) return;
  const p = Object.prototype.hasOwnProperty.call(into, k) ? into[k] : (into[k] = { m: 0, b: 0 });
  if (cls === 'mint') p.m = (Number(p.m) || 0) + d;
  else p.b = (Number(p.b) || 0) - d;
}
/** v2.3.5084: `rec` holds `bag` (persistence.js _saveRpg, before its put):
 *  the door counts into `rec._econ` from now on, and what waited beside the
 *  bag is folded in here. */
export function bagEconOwn(bag, rec) {
  if (!bag || typeof bag !== 'object' || !rec || typeof rec !== 'object') return;
  econOwner.set(bag, rec);
  const w = econWaiting.get(bag);
  if (!w) return;
  econWaiting.delete(bag);
  const into = econTarget(bag);
  if (!into) return;
  for (const k of Object.keys(w)) {
    const p = Object.prototype.hasOwnProperty.call(into, k) ? into[k] : (into[k] = { m: 0, b: 0 });
    p.m = (Number(p.m) || 0) + w[k].m;
    p.b = (Number(p.b) || 0) + w[k].b;
  }
}
/** v2.3.5084: the counts waiting beside `bag` for its record's next save (a
 *  copy), for the world's sum. */
export function bagEconPending(bag) {
  const w = bag && typeof bag === 'object' ? econWaiting.get(bag) : null;
  const out = Object.create(null);
  if (w) for (const k of Object.keys(w)) out[k] = { m: w[k].m, b: w[k].b };
  return out;
}

/* Write `v` under `k` by the row's empty rule; the count left (undefined: gone). */
function put(bag, k, v, empty) {
  if (empty === 'gtZero') {
    if (v > 0) bag[k] = v; else delete bag[k];
  } else {
    bag[k] = v;
    if (empty === 'leZero' && bag[k] <= 0) delete bag[k];
  }
  return bag[k];
}

/* v2.3.4900: step 2's one read.  A bag count is a whole number never below 0,
   held under the bag's OWN key: anything else reads as the whole number under
   it, or 0 (the gold door's wholeGold, for a stack). */
export function wholeCount(v) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
}
/** v2.3.4900: THE one way to read a count in a bag (own key, whole, never below 0). */
export function bagCount(bag, k) {
  return own(bag, k) ? wholeCount(bag[k]) : 0;
}
/** v2.3.4900: step 2's one sum, before the one empty rule -- pure (the test's). */
export function bagOneSum(bag, k, n, take, cap) {
  const have = bagCount(bag, k), a = wholeCount(n);
  if (take) return Math.max(0, have - a);
  return cap === undefined ? have + a : Math.min(wholeCount(cap), have + a);
}

/* v2.3.4900: step 2's switch.  Plain functions cannot read the room's flags,
   so the room sets this whenever its flags load or change (liveops.js
   _syncBagCaps: on unless `bagonesum: false`), as it sets the gear lists'
   cap (gearstash.js setGearStashCap). */
let ONE_SUM = true;
export function setBagOneSum(on) { ONE_SUM = on !== false; }
export function bagOneSumOn() { return ONE_SUM; }

/** The count a give or take would write, before its empty rule, by its STEP-1
    read -- pure (the test's).  v2.3.4900: the door does bagOneSum unless off. */
export function bagAfter(bag, k, n, road, cap) {
  const row = own(BAG_ROADS, road) ? BAG_ROADS[road] : null;
  if (!row || row.dir === 'set') throw new Error('bag door: bagAfter needs a give or take road, not "' + road + '"');
  const cur = BAG_READS[row.read](bag, k);
  if (row.dir === 'take') return cur - n;
  return row.cap ? Math.min(cap, cur + n) : cur + n;
}

/** `n` of `k` INTO `bag` by `road` (a road with `cap` fills to at most `cap`).
    Returns the count left under `k`. */
export function bagGive(bag, k, n, road, cap, credit) {
  const row = roadFor(road, 'give');
  const before = bagCount(bag, k);   /* v2.3.5084: the count, as the world's sum reads it */
  let left;
  if (ONE_SUM) left = put(bag, k, bagOneSum(bag, k, n, false, row.cap ? cap : undefined), 'gtZero');   /* v2.3.4900 */
  else {
    const cur = BAG_READS[row.read](bag, k);
    left = put(bag, k, row.cap ? Math.min(cap, cur + n) : cur + n, row.empty);
  }
  const d = bagCount(bag, k) - before;
  econBag(bag, k, row.class, d);   /* v2.3.5084 */
  if (credit) econBag(bag, k, 'mint', mailMinted(credit, d));   /* v2.3.5084: a payout by its own class */
  return left;
}

/** `n` of `k` OUT of `bag` by `road`.  The caller has already checked the bag
    holds it (step 1: as each did before the door).  Returns the count left
    (undefined: the stack is gone). */
export function bagTake(bag, k, n, road) {
  const row = roadFor(road, 'take');
  const before = bagCount(bag, k);   /* v2.3.5084 */
  const left = ONE_SUM ? put(bag, k, bagOneSum(bag, k, n, true), 'gtZero')   /* v2.3.4900 */
    : put(bag, k, BAG_READS[row.read](bag, k) - n, row.empty);
  econBag(bag, k, row.class, bagCount(bag, k) - before);   /* v2.3.5084 */
  return left;
}

/** The count under `k` MADE `v` by `road` (by its empty rule).  Returns it. */
export function bagSet(bag, k, v, road) {
  const row = roadFor(road, 'set');
  const before = bagCount(bag, k);   /* v2.3.5084 */
  const left = ONE_SUM ? put(bag, k, wholeCount(v), 'gtZero')   /* v2.3.4900: a set heals what it makes */
    : put(bag, k, v, row.empty);
  econBag(bag, k, row.class, bagCount(bag, k) - before);   /* v2.3.5084: by its difference, signed */
  return left;
}
