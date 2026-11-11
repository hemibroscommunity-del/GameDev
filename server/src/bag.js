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
 * STEP 2 (next, its own version and live switch): every road reads the count
 * the one safe way (own key, a whole number, never below 0) and empties a
 * stack the one way (nothing at 0 or below, nothing that is not a number).
 * docs/specs/bag-door.md has the list.
 *
 * WHAT IS NOT HERE (on purpose, listed in the test with why):
 *   - whole-bag assigns: a new bag (`ps.inventory = {}`), the join's load,
 *     the death wipe -- they make the bag, not a count in it;
 *   - the old gem pouch (`lifeSkills.gems`), the bank vault, a market order,
 *     a listing: other records, each with its own rules;
 *   - a local tally that is not the bag (farm.js's harvest `items`).
 *
 * No imports: node tests it directly.
 */

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
 * A new way to change the bag is a new row here and one call that names it. */
const R = (dir, read, empty, at, cap = false) => Object.freeze({ dir, read, empty, at, cap });
export const BAG_ROADS = Object.freeze({
  /* ── eating, drinking, burning ── */
  eat_meal:           R('take', 'plain', 'leZero', 'cooking.js _handleEatRequest: a meal'),
  eat_fish:           R('take', 'plain', 'leZero', 'cooking.js _handleEatRequest: a cooked fish or crop'),
  firemaking:         R('take', 'plain', 'leZero', 'cooking.js _handleFiremakingRequest'),
  drink:              R('take', 'plain', 'leZero', 'cooking.js _handleDrinkRequest'),
  shop_item_trap:     R('give', 'orZero', 'none', 'cooking.js _applyShopItem: a trap'),

  /* ── cooking ── */
  cook_ingredient:    R('take', 'plain', 'leZero', 'cooking.js _consumeIngredient'),
  cook_recipe:        R('give', 'whole', 'none', 'cooking.js _handleCookRecipe'),
  cook_fish_used:     R('take', 'plain', 'leZero', 'cooking.js _handleCookRequest: the raw fish'),
  cook_fish_cooked:   R('give', 'orZero', 'none', 'cooking.js _handleCookRequest: cooked'),
  cook_burnt:         R('give', 'orZero', 'none', 'cooking.js _handleCookRequest: burnt'),

  /* ── crafting ── */
  armor_forge:        R('take', 'whole', 'leZero', 'armorforge.js _handleForgeArmor: the bars'),
  weapon_forge:       R('take', 'plain', 'leZero', 'gear.js _handleForgeWeapon: the bars, logs or ore'),
  harden_mats:        R('take', 'ownWhole', 'leZero', 'hardening.js _handleHardenWeapon'),
  hardwood_logs:      R('take', 'ownWholeFloor', 'leZero', 'hardenedwood.js _handleMakeHardenedWood: the logs'),
  hardwood_made:      R('give', 'ownWhole', 'none', 'hardenedwood.js _handleMakeHardenedWood: the hardened wood'),
  smelt_ore:          R('take', 'whole', 'leZero', 'smelting.js _handleSmeltBar: the ore'),
  smelt_bar:          R('give', 'whole', 'none', 'smelting.js _handleSmeltBar: the bars'),
  salvage_bars:       R('give', 'whole', 'none', 'salvage.js _handleSmithSalvage: the bars'),
  salvage_essence:    R('give', 'whole', 'none', 'salvage.js _handleSmithSalvage: the essence'),
  essence_apply:      R('take', 'whole', 'leZero', 'salvage.js _handleEssenceApply'),
  trap_logs:          R('take', 'ownWholeFloor', 'leZero', 'trapping.js _handleMakeTraps: the logs'),
  trap_made:          R('give', 'ownWholeFloor', 'none', 'trapping.js _handleMakeTraps: the traps'),
  trap_sprung:        R('take', 'ownWholeFloor', 'leZero', 'trapping.js _trapRollOnKill'),
  trap_legacy_out:    R('set', null, 'gtZero', 'trapping.js _trapJoinConvert: the old trap key (set to 0: gone)'),
  trap_legacy_in:     R('give', 'ownWholeFloor', 'none', 'trapping.js _trapJoinConvert: as new traps'),

  /* ── gems and shards ── */
  gem_take:           R('take', 'gem', 'gtZero', 'gems.js gemTake: the bag\'s part (every gem spent)'),
  gem_give:           R('give', 'gem', 'none', 'gems.js gemGive (every gem gained)'),
  shard_crack:        R('take', 'ownWholeFloor', 'gtZero', 'shardcrack.js _handleShardCrack'),
  rare_gem_combine:   R('take', 'ownWholeFloor', 'gtZero', 'shardcrack.js _handleGemCombine: a rare gem'),

  /* ── gathering ── */
  harvest:            R('give', 'orZero', 'none', 'gathering.js _handleNodeStrike: the yield'),
  harvest_shard:      R('give', 'orZero', 'none', 'gathering.js _handleNodeStrike: a shard'),
  fish_catch_plain:   R('give', 'orZero', 'none', 'fishlog.js _fishCatch: not one of the game\'s fish'),
  fish_catch:         R('give', 'orZero', 'none', 'fishlog.js _fishCatch: each fish'),

  /* ── the farm ── */
  farm_plant:         R('take', 'whole', 'gtZero', 'farm.js _handleFarmAct: seeds'),
  farm_feed:          R('take', 'whole', 'gtZero', 'farm.js _handleFarmAct: compost'),
  farm_harvest:       R('give', 'whole', 'none', 'farm.js _handleFarmAct: the crops'),
  farm_buy:           R('give', 'whole', 'none', 'farm.js _handleFarmBuy'),
  farm_order:         R('take', 'whole', 'gtZero', 'farmorders.js _handleFarmOrder'),

  /* ── shops ── */
  shop_sell:          R('set', null, 'leZero', 'shop.js _shopSell: the count read before the stock\'s await, less what sold'),
  shop_tool:          R('set', null, 'none', 'shop.js _shopBuy: a lost tool bought back (one)'),
  shop_staple:        R('give', 'whole', 'none', 'shop.js _shopBuy: a staple'),
  shop_pile:          R('give', 'whole', 'none', 'shop.js _shopBuy: from his pile'),

  /* ── rewards ── */
  chest_key:          R('take', 'plain', 'leZero', 'dailychest.js _handleChestOpen: the key'),
  chest_prize:        R('give', 'whole', 'none', 'dailychest.js _handleChestOpen: a fish or gem prize'),
  boss_chest_item:    R('give', 'ownWholeFloor', 'none', 'dungeonreward.js _dungeonReward'),
  quest_collect:      R('take', 'orZero', 'gtZero', 'quests.js _collectConsume'),
  quest_item:         R('give', 'orZero', 'none', 'quests.js _grantQuestItem', true),
  cape_ticket:        R('give', 'orZero', 'none', 'eventcapes.js _claimCapeTicket'),
  cape_ticket_spent:  R('take', 'plain', 'leZero', 'eventcapes.js _handleCapeRedeem: the ticket'),
  cape_trophy:        R('give', 'whole', 'none', 'eventcapes.js _handleCapeRedeem: the cape'),
  loot_death_items:   R('give', 'orZero', 'none', 'index.js _handleLootPickup: a death pile\'s items'),
  loot_skull:         R('give', 'orZero', 'none', 'index.js _handleLootPickup: a skull'),
  loot_shard:         R('give', 'orZero', 'none', 'index.js _handleLootPickup: a shard'),
  loot_gem:           R('give', 'orZero', 'none', 'index.js _handleLootPickup: a gem'),

  /* ── chance ── */
  ace_items_win:      R('give', 'whole', 'none', 'gamble.js _handleAceItemFlipRequest: won (doubled)'),
  ace_items_loss:     R('take', 'whole', 'gtZero', 'gamble.js _handleAceItemFlipRequest: lost'),

  /* ── between players, and the ground ── */
  gift_trade:         R('take', 'ownNumber', 'leZero', 'trade.js _interceptTrade: the old gift trade, the sender'),
  trade_window:       R('take', 'ownNumber', 'leZero', 'trade2.js _handleTrade2Confirm: each side\'s items'),
  item_drop:          R('take', 'ownWhole', 'gtZero', 'itemdrop.js _handleItemDrop'),

  /* ── into escrow, and back ── */
  bank_deposit:       R('take', 'ownWhole', 'gtZero', 'bank.js _handleBankMove: in'),
  bank_withdraw:      R('give', 'ownWhole', 'none', 'bank.js _handleBankMove: out'),
  ah_listing:         R('take', 'ownNumber', 'leZero', 'store.js _stCreateListing'),
  mail_item:          R('give', 'ownNumber', 'none', 'inbox.js _applyCreditToPs: every _creditPlayer item credit, landed'),
  escrow_item:        R('take', 'ownNumber', 'leZero', 'inbox.js _escrowTakeItem: a live player'),
  escrow_item_stored: R('take', 'ownNumber', 'leZero', 'inbox.js _escrowTakeItem: the stored record of one who is away'),

  /* ── the owner's Test panel ── */
  dev_shards:         R('give', 'wholeFloor', 'none', 'devtools.js _devKit: shards'),
  dev_traps:          R('set', null, 'gtZero', 'devtools.js _devTrapping: traps'),
  dev_logs:           R('set', null, 'gtZero', 'devtools.js _devTrapping: logs'),
  fish_dev:           R('give', 'orZero', 'none', 'fishlog.js _fishDev: give a fish'),
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

/** The count a give or take would write, before its empty rule -- pure (the test's). */
export function bagAfter(bag, k, n, road, cap) {
  const row = own(BAG_ROADS, road) ? BAG_ROADS[road] : null;
  if (!row || row.dir === 'set') throw new Error('bag door: bagAfter needs a give or take road, not "' + road + '"');
  const cur = BAG_READS[row.read](bag, k);
  if (row.dir === 'take') return cur - n;
  return row.cap ? Math.min(cap, cur + n) : cur + n;
}

/** `n` of `k` INTO `bag` by `road` (a road with `cap` fills to at most `cap`).
    Returns the count left under `k`. */
export function bagGive(bag, k, n, road, cap) {
  const row = roadFor(road, 'give');
  const cur = BAG_READS[row.read](bag, k);
  return put(bag, k, row.cap ? Math.min(cap, cur + n) : cur + n, row.empty);
}

/** `n` of `k` OUT of `bag` by `road`.  The caller has already checked the bag
    holds it (step 1: as each did before the door).  Returns the count left
    (undefined: the stack is gone). */
export function bagTake(bag, k, n, road) {
  const row = roadFor(road, 'take');
  return put(bag, k, BAG_READS[row.read](bag, k) - n, row.empty);
}

/** The count under `k` MADE `v` by `road` (by its empty rule).  Returns it. */
export function bagSet(bag, k, v, road) {
  const row = roadFor(road, 'set');
  return put(bag, k, v, row.empty);
}
