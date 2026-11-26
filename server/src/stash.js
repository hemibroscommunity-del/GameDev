/* ═══ v2.3.5281: THE STASHES' DOOR (grand plan step 4.3, card R PR 2) ═══
 * (spec docs/specs/stash-door.md; pinned by server/test/stash-door.test.mjs)
 *
 * A player's stashes -- the weapon bag (`weaponStash`) and the five gear
 * lists (`armorStash`, `legsStash`, `shieldStash`, `gearStash`,
 * `amuletStash`) -- were written by hand in about forty places across sixteen
 * files: pushed, spliced, set in place, cut to a cap, made new.  Every change
 * goes through three functions now, each call naming its ROAD, its row in
 * STASH_ROADS:
 *
 *   stashGive(rec, field, piece, road, room)  a piece INTO the stash, at its
 *                                             end; false (nothing added) past
 *                                             the stash's cap
 *   stashTake(rec, field, at, road)           the piece at `at` OUT of it;
 *                                             returns it, or null (nothing
 *                                             there: nothing taken)
 *   stashSet(rec, field, v, road, at)         the stash MADE `v` (a load, a
 *                                             loss, a merge); with `at`, the
 *                                             one place `at` made `v` (a swap,
 *                                             an upgrade in place)
 *
 * `rec` is a live player's state or a stored record; give and take make the
 * list when it is missing, so no caller writes `rec.weaponStash = []`.
 *
 * THE CAP (ARCHITECTURE-HANDOFF rule 3): a give past the stash's cap is
 * REFUSED by the door (false: nothing added; the caller answers it, as each
 * did before: the mail, a refusal, a sale).  What is true of the cuts, and
 * only this (the gatekeeper's medium, sitting 17, by a probe through a real
 * join): `_saveRpg` and the equip NO LONGER cut the weapon bag, so a bag
 * over its cap (a cap lowered under `disable_bigbags`) keeps every weapon
 * while the player is in the room.  The cuts that REMAIN: the join's
 * (`_sanitizeWeaponList` cuts the stored bag to the cap at the next join),
 * the phone's copy (the capped list it is sent, persistence.js), and the
 * gear lists' at the save (`capStash`) and at the join (gearstash.js).  No
 * new loss against before; removing those cuts is a bigger change, for
 * later.  No kill switch: one would only bring back a cut that destroys
 * weapons.  The weapon bag's cap is the room's (`WEAPON_STASH_CAP`, its
 * live-flag size); the gear lists' is gearstash.js `gearStashCap()`.
 *
 * EACH ROAD (STASH_ROADS):
 *   verb    'give', 'take' or 'set';
 *   fields  the stashes it may touch;
 *   at      where its one caller is (the test checks the file);
 *   class   E's four (gold.js CLASSES): `mint` (a piece made), `burn` (a
 *           piece gone from the world: sold to the shop, salvaged), `move`
 *           (to or from a place of the SAME player: `other: 'self'`, the hand,
 *           the body, the stored record at a load), or `escrow` (into or out
 *           of a place that holds it: `other`, a gold.js ESCROW_PLACES
 *           record).
 * A new way to change a stash is a new row here and one call that names it.
 *
 * A WEAPON'S OWN ID (v2.3.5282, card R PR 3; SHAPES part 2): every weapon
 * carries `gid`, made by the minter gear has (gearprov.js gearMintId), the
 * same field and no second name.  A weapon the door gives into the bag or
 * sets in its place without a well-formed id is given one (a weapon just
 * made, or one made before ids); one that has its own keeps it, whatever
 * road it came by (traded, sold, mailed, listed, dropped).  At the join and
 * in the save's migration (migrations.js v22) `weaponIdsAll` does the hand
 * and the bag together: a weapon without one gets one, and the second of
 * two that share one gets a new one, so two never share.  No ledger row (a
 * weapon's is the card's cost question): the door's own counter.
 *
 * The stash roads between players (a weapon by the mail, the market, the
 * auction house, a trade window) are on PR 1's table (playerroads.js), whose
 * guard holds them.  One import, gearstash.js's cap: node tests it bare. */
import { gearStashCap } from './gearstash.js';   /* a function, called at run time only: gearstash.js imports this door back */
import { gearMintId, GID_RE } from './gearprov.js';   /* v2.3.5282: the one minter (called at run time only: gearprov.js imports this door back) */

/* the gear lists are gearstash.js GEAR_STASH_FIELDS, written out here (the
   two modules import each other; stash-door.test holds them the same) */
const GEAR_FIELDS = Object.freeze(['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash']);
export const STASH_FIELDS = Object.freeze(['weaponStash', ...GEAR_FIELDS]);
export const STASH_VERBS = Object.freeze(['give', 'take', 'set']);
/* a `move` within one player: the other side is the same record */
export const STASH_SELF = 'self';

const W = Object.freeze(['weaponStash']);
const G = GEAR_FIELDS;
const S = Object.freeze(['shieldStash']);
const R = (verb, fields, at, cls, other = null) => Object.freeze({ verb, fields, at, class: cls, other });

export const STASH_ROADS = Object.freeze({
  /* ── the weapon bag ── */
  join_stored:     R('set',  W, 'join.js _handleJoin: the stored character\'s bag, loaded', 'move', STASH_SELF),
  join_new:        R('set',  W, 'join.js _handleJoin: a new character\'s bag, from its first join (sanitized, strict)', 'mint'),
  quest_reward:    R('give', W, 'quests.js _grantQuestItem: a quest\'s weapon (a full bag keeps it aside)', 'mint'),
  quest_wood:      R('set',  W, 'quests.js _questTradeApply: a weapon traded up to a better wood, in its place', 'move', STASH_SELF),
  reveal_dev:      R('give', W, 'revealbag.js _revealBagDev: the owner\'s test blade, still a "?"', 'mint'),
  loot_weapon:     R('give', W, 'index.js _handleLootPickup: a blade from a pile', 'mint'),
  mail_weapon:     R('give', W, 'inbox.js _applyCreditToPs: a weapon by the mail', 'escrow', 'inbox:'),
  market_sell:     R('take', W, 'market.js _mktPlaceOrder: a sell order\'s weapon, held', 'escrow', 'mkt_order:'),
  market_back:     R('give', W, 'market.js _mktUnwind: an order\'s weapon back (the mail when the bag is full)', 'escrow', 'mkt_order:'),
  store_list:      R('take', W, 'store.js _stCreateListing: a weapon listed at the auction house', 'escrow', 'store_listing:'),
  trade_put:       R('take', W, 'trade2.js _handleTrade2StageWeapon: a weapon put in a trade window', 'escrow', 'trade2wpn:'),
  nml_weapons:     R('set',  W, 'nomansland.js _nmlOnDeath: the bag lost in No man\'s land, to the killer\'s mail', 'escrow', 'inbox:'),
  salvage_weapon:  R('take', W, 'salvage.js _handleSmithSalvage: a weapon broken for its metal', 'burn'),
  weapon_sell:     R('take', W, 'gear.js _handleSellWeapon: a weapon sold to the shop', 'burn'),
  forge_swap:      R('give', W, 'gear.js _handleForgeWeapon: the old weapon off the hand as the new one is forged', 'move', STASH_SELF),
  unequip_weapon:  R('give', W, 'gear.js _handleUnequipRequest: a weapon off the hand', 'move', STASH_SELF),
  equip_swap:      R('set',  W, 'gear.js _handleEquipRequest: the hand\'s weapon into the place of the one taken up', 'move', STASH_SELF),
  equip_take:      R('take', W, 'gear.js _handleEquipRequest: a weapon taken up into an empty hand', 'move', STASH_SELF),

  /* ── the gear lists ── */
  gear_join_own:   R('set',  G, 'gearstash.js _gearStashAdoptOnJoin: the stored lists, loaded and resolved by the ledger', 'move', STASH_SELF),
  gear_join_claim: R('set',  G, 'gearstash.js _gearStashAdoptOnJoin: the phone\'s claim merged in (capped, by the ledger)', 'mint'),
  gear_migrate:    R('set',  G, 'gearstash.js normalizeGearStashes: a stored record\'s lists made lists (migration)', 'move', STASH_SELF),
  gear_quest:      R('give', G, 'quests.js _grantQuestItem: a quest\'s piece of armour', 'mint'),
  gear_reveal:     R('give', G, 'revealbag.js _revealBagDev: the owner\'s test piece', 'mint'),
  gear_forge:      R('give', G, 'armorforge.js _handleForgeArmor: a piece forged', 'mint'),
  gear_chest:      R('give', G, 'dailychest.js _handleChestOpen: the daily chest\'s piece', 'mint'),
  gear_loot:       R('give', G, 'index.js _handleLootPickup: armour from a pile', 'mint'),
  gear_swap_off:   R('give', G, 'grids.js _gridsApplyArmor: the piece taken off as another goes on', 'move', STASH_SELF),
  gear_swap_on:    R('take', G, 'grids.js _gridsApplyArmor: the piece put on', 'move', STASH_SELF),
  gear_unequip:    R('give', G, 'gear.js _handleUnequipRequest: armour or legs taken off', 'move', STASH_SELF),
  gear_mail:       R('give', G, 'storegear.js _stGearApplyCredit: a piece by the mail (bought, or back)', 'escrow', 'inbox:'),
  gear_list:       R('take', G, 'gearprov.js _gearProvTake: a piece listed at the auction house', 'escrow', 'store_listing:'),
  shield_off:      R('give', S, 'shieldwear.js _handleShieldWear: the shield taken off (none worn)', 'move', STASH_SELF),
  shield_swap_off: R('give', S, 'shieldwear.js _handleShieldWear: the shield taken off as another goes on', 'move', STASH_SELF),
  shield_on:       R('take', S, 'shieldwear.js _handleShieldWear: the shield put on, from the bag', 'move', STASH_SELF),
  shop_shield:     R('give', S, 'shop.js _shopBuy: the Pine Shield bought back at Diego\'s (v2.3.6800)', 'mint'),
  nml_gear:        R('set',  G, 'nomansland.js _nmlOnDeath: the gear lost in No man\'s land, to the killer\'s mail', 'escrow', 'inbox:'),

  /* ── the owner's restore of one player (v2.3.5285, card R PR 6) ── */
  restore:         R('set',  STASH_FIELDS, 'playerrestore.js restoredCharacter: each stash made the copy\'s (judged by its difference)', 'mint'),
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ── a weapon's own id (v2.3.5282) ── */
/* the door's counter for the minter (a weapon has no ledger: SHAPES part 2) */
const WEAPON_MINT = { seq: 0 };
/** The hands a weapon is held in (a weapon in a hand keeps its id). */
export const WEAPON_HANDS = Object.freeze(['weapon', 'rangedWeapon', 'staffWeapon']);
/** True when `w` carries an id as the minter writes it. */
export function weaponIdOk(w) {
  return !!w && typeof w === 'object' && typeof w.gid === 'string' && GID_RE.test(w.gid);
}
/** `w` given its own id when it has none well-formed (it keeps one it has).
 *  Returns `w`. */
export function weaponIdGive(w) {
  if (w && typeof w === 'object' && !Array.isArray(w) && !weaponIdOk(w)) w.gid = gearMintId(WEAPON_MINT);
  return w;
}
/** Every weapon `rec` holds, in its hands and its bag, with an id, and no
 *  two sharing one: a weapon without one is given one, and the second of
 *  two that share one is given a new one (the first keeps it).  The join's
 *  load and the save's migration run it.  Returns how many were given. */
export function weaponIdsAll(rec) {
  if (!rec || typeof rec !== 'object') return 0;
  const seen = new Set();
  let n = 0;
  const one = (w) => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) return;
    if (!weaponIdOk(w) || seen.has(w.gid)) { w.gid = gearMintId(WEAPON_MINT); n++; }
    seen.add(w.gid);
  };
  for (const h of WEAPON_HANDS) one(rec[h]);
  if (Array.isArray(rec.weaponStash)) for (const w of rec.weaponStash) one(w);
  return n;
}

function roadFor(road, verb, field) {
  const row = typeof road === 'string' && own(STASH_ROADS, road) ? STASH_ROADS[road] : null;
  if (!row) throw new Error('stash door: no road "' + road + '" (stash.js STASH_ROADS)');
  if (row.verb !== verb) throw new Error('stash door: road "' + road + '" is a ' + row.verb + ', not a ' + verb);
  if (!row.fields.includes(field)) throw new Error('stash door: road "' + road + '" does not touch ' + field);
  return row;
}

/** The cap a stash holds: the weapon bag's the room's, the gear lists'
 *  gearstash.js's. */
export function stashCap(field, room) {
  if (field === 'weaponStash') {
    const n = room && room.WEAPON_STASH_CAP;
    if (!Number.isFinite(n) || n < 0) throw new Error('stash door: the weapon bag\'s cap is the room\'s (WEAPON_STASH_CAP)');
    return n;
  }
  return gearStashCap();
}

/* the list, made when missing (a record from before a stash existed) */
function listOf(rec, field) {
  if (!Array.isArray(rec[field])) rec[field] = [];
  return rec[field];
}

/** A piece INTO `field`, at its end, by `road`.  False, nothing added, when
 *  the stash is at its cap (rule 3: refused here; the cuts that remain
 *  are in the header). */
export function stashGive(rec, field, piece, road, room) {
  roadFor(road, 'give', field);
  const list = listOf(rec, field);
  if (list.length >= stashCap(field, room)) return false;
  if (field === 'weaponStash') weaponIdGive(piece);   /* v2.3.5282: a weapon's own id */
  list.push(piece);
  return true;
}

/** The piece at `at` OUT of `field` by `road`: it, or null (nothing there). */
export function stashTake(rec, field, at, road) {
  roadFor(road, 'take', field);
  const list = listOf(rec, field);
  if (!Number.isInteger(at) || at < 0 || at >= list.length) return null;
  return list.splice(at, 1)[0];
}

/** `field` MADE `v` by `road` (a list; anything else, an empty one); with
 *  `at`, the one place `at` made `v` (false when `at` is not a place). */
export function stashSet(rec, field, v, road, at) {
  roadFor(road, 'set', field);
  if (at === undefined) {
    rec[field] = Array.isArray(v) ? v : [];
    if (field === 'weaponStash') for (const w of rec[field]) weaponIdGive(w);   /* v2.3.5282 */
    return true;
  }
  const list = listOf(rec, field);
  if (!Number.isInteger(at) || at < 0 || at >= list.length) return false;
  if (field === 'weaponStash') weaponIdGive(v);   /* v2.3.5282 */
  list[at] = v;
  return true;
}
