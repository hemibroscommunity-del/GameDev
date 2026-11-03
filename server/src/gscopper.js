/* ═══ v2.3.4000: OLD WOODEN GREATSWORDS BECOME COPPER ═══
 * Spec: docs/specs/greatsword-copper.md
 *
 * The owner, 2026-11-03: "'Copper great sword' when Smithed looks gray in
 * color like iron.  Fix that.  Also just remove any of the 'wooden' swords.
 * Right now it's just called 'great sword'."
 *
 * v2.3.3895 (swordconvert.js) turned every one-handed sword into a
 * greatsword, a wood one into a copper one -- and touched no greatsword.  Two
 * kinds of greatsword are still held that are not a metal the game draws:
 *   - gearBase 'wood': the old starter grant (v2.3.1681-1759, renamed "Copper
 *     Great Sword" by migration v12 on its name alone, so its gearBase stayed
 *     'wood') and the old Forge's wood tier (not forged since v2.3.3524).  The
 *     wood tier has no metal (materialTints.js), so the blade drew in the
 *     native grey steel -- a "Copper Great Sword" that looks like iron;
 *   - no gearBase at all: the old random drops (v2.3.1141-v2.3.3209), named
 *     "Great Sword" (WEAPON_TYPE_LABELS), drawn grey too.
 * The owner's call for a wood sword stands for these: a wood greatsword is
 * "not an actual weapon in the game" (v2.3.3524), so it becomes the game's
 * first weapon, COPPER (tierMult 1.12 against wood's 1.00: a small gift, the
 * v19 rule).
 *
 * NEVER A WEAPON MADE WEAKER.  v2.3.4000 (the owner's intent, through the
 * orchestrator: "just remove any of the 'wooden' swords.  Right now it's just
 * called 'great sword'" -- yes, the strong ones too): a drop with no gearBase
 * whose tierMult is ABOVE copper's (the old Elemental 1.50, Fusion 2.25 and
 * Shift 3.00 rolls, data.js RARITY_TIERS) becomes the METAL whose tier
 * multiplier is the closest one not above its own (never wood: 1.50 -> Black
 * Steel 1.40, 2.25 -> Diamond 2.16, 3.00 -> Shadowsteel 2.98) and KEEPS its
 * own tierMult, so its damage and sell value do not move.  The wear gate it
 * then meets is that metal's rung (gear.js _prog3EquipOk: 5 a rung above
 * copper, iron free), never more than the tierMult curve it met with no
 * gearBase (round((tierMult - 1) x 6) x 5, measured from rung 0) -- so nobody
 * loses the right to a sword they wear; and the gate is asked only at equip
 * time (prog3.js _prog3GearOk), so nothing is ever taken off a player.
 *
 * WHAT CHANGES: a wood one, or a base-less one no stronger than copper:
 * `gearBase` -> 'copper', `tierMult` -> 1.12.  A base-less one stronger than
 * copper: `gearBase` -> its metal (above), `tierMult` kept.  A name the GAME
 * gave is rebuilt for the metal ("Copper Great Sword", "Black Steel Great
 * Sword", a gem's "Diamond Flame Great Sword" through weaponGemName).  Everything else stays:
 * the grade (`quality`), hardness, temper, the reforge and harden bonuses, the
 * gems.  A name given by hand is kept (v19's owner call 3).  `was` records
 * what it was (v19's owner call 4), once.
 *
 * ONE FUNCTION, EVERY DOOR, as v19: migration v20 (migrations.js), the post's
 * weapon credit (inbox.js), the Auction House's and the Marketplace's
 * wake-time rebuilds (store.js, market.js), and an order for one in the
 * Marketplace is placed for copper.  The Forge is not touched: it has made no
 * wood greatsword since v2.3.3524 (forgeladder.js), and `forgeladder: false`,
 * the operator's rollback of that ladder, stays whole (forge-ladder.test §7c)
 * -- a wood greatsword forged during such a rollback converts when it next
 * passes a door here (the post, a shelf), not at the load (v20 has run).
 *
 * NEVER A SHIELD.  The Pine Shield is gearBase 'wood' on purpose (data.js
 * tut_1: the wood tier carries its stats), and so is every other wooden thing
 * that is not a greatsword: this reads `type === 'greatsword'` before anything
 * else.  (`wtype`, not `type:` in object literals -- the hardening suite reads
 * `type:` literals in server/src as event names; swordconvert.js's note.)
 */
import { BLACKSMITH_TIERS, BLACKSMITH_TIER_LABELS, WEAPON_TYPE_LABELS } from './data.js';
import { weaponGemName } from './weapongem.js';

const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const COPPER_MULT = BLACKSMITH_TIERS.copper.tierMult;   /* 1.12 */

/* Is this a greatsword the conversion is for?  A wood one, or one with no
   gearBase at all.  Anything else (a metal one, any other weapon) is left
   alone. */
export function isOldGreatsword(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  if (w.type !== 'greatsword') return false;
  if (w.gearBase === 'wood') return true;
  return !has(w, 'gearBase') || w.gearBase === null || w.gearBase === undefined || w.gearBase === '';
}

/* v2.3.4000: the metal a base-less greatsword of tierMult `tm` becomes: the
   forge tier whose multiplier is the closest one NOT above `tm`, never wood
   (and so never below copper). */
export function metalForTierMult(tm) {
  let best = 'copper';
  for (const k of Object.keys(BLACKSMITH_TIERS)) {
    if (k === 'wood') continue;
    const m = BLACKSMITH_TIERS[k].tierMult;
    if (typeof m === 'number' && m <= tm && m > BLACKSMITH_TIERS[best].tierMult) best = k;
  }
  return best;
}

/* The names the game gave a greatsword like this one, so a name in this set
   is rebuilt and any other is kept.  Built from the weapon as it is BEFORE the
   change (its old gearBase, its gems). */
function gameNamesFor(w) {
  const base = typeof w.gearBase === 'string' ? w.gearBase : '';
  const label = WEAPON_TYPE_LABELS.greatsword;                  /* 'Great Sword' */
  const out = new Set([
    label,                                                      /* an old drop: data.js WEAPON_TYPE_LABELS */
    "Bro's Sword",                                              /* the old starter grant, before v12 */
    'Copper ' + label,                                          /* ...and after it (v12 renamed it by name only) */
    'Wood ' + label, 'Wooden ' + label, 'Wood Greatsword', 'Wooden Greatsword',
    'greatsword', 'wood greatsword',                            /* the Forge: gear.js `tierKey + ' ' + weaponType` */
  ]);
  if (base) {
    out.add(base + ' greatsword');
    if (has(BLACKSMITH_TIER_LABELS, base)) out.add(BLACKSMITH_TIER_LABELS[base] + ' ' + label);
  }
  out.add(weaponGemName(w));                                    /* a gem set (weapongem.js), at its old base */
  return out;
}

/** Convert one weapon blob, in place, if it is an old wooden or base-less
 *  greatsword: a metal at last, never weaker.  Returns true when it changed.
 *  Never throws on junk.  Idempotent: a greatsword with a metal is never
 *  touched again.  (v2.3.4000: was oldGreatswordToCopper.) */
export function oldGreatswordToMetal(w) {
  if (!isOldGreatsword(w)) return false;
  const was = { t: 'greatsword', name: typeof w.name === 'string' ? w.name : null, gearBase: has(w, 'gearBase') ? w.gearBase : null };
  if (has(w, 'tierMult')) was.tierMult = w.tierMult;
  const gameNamed = typeof w.name !== 'string' || !w.name || gameNamesFor(w).has(w.name);
  const tm = (typeof w.tierMult === 'number' && w.tierMult > 0) ? w.tierMult : 1;
  if (w.gearBase !== 'wood' && tm > COPPER_MULT) {
    w.gearBase = metalForTierMult(tm);                          /* its tierMult KEPT: never weaker */
  } else {
    w.gearBase = 'copper';
    w.tierMult = COPPER_MULT;                                   /* wood's 1.00 and the common drop's: the small gift */
  }
  const metal = BLACKSMITH_TIER_LABELS[w.gearBase] || 'Copper';
  if (gameNamed) w.name = weaponGemName(w);                     /* "Copper Great Sword", "Black Steel Flame Great Sword" */
  else if (/^Wood(en)?\s/.test(w.name)) w.name = w.name.replace(/^Wood(en)?\s/, metal + ' ');
  if (!w.was) w.was = was;
  return true;
}

/** Every weapon a character's record holds: the three slots and the bag, as
 *  v12 and v19 walk them.  Returns true when any changed. */
export function convertRecordGreatswords(blob) {
  if (!blob || typeof blob !== 'object') return false;
  let changed = false;
  for (const slot of ['weapon', 'rangedWeapon', 'staffWeapon']) {
    if (oldGreatswordToMetal(blob[slot])) changed = true;
  }
  if (Array.isArray(blob.weaponStash)) {
    for (const w of blob.weaponStash) if (oldGreatswordToMetal(w)) changed = true;
  }
  return changed;
}

export const gsCopperMethods = {
  /* KILL SWITCH (lower case, TRAPS §117): `gscopper: false` stops the
     boundary heals (the post, the shelves' rebuilds) and the Marketplace's
     mapping of a new order.  The rpg migration is
     not switchable, for v19's reason: it is the record's shape, stamped by
     `_v`. */
  _gsCopperOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'gscopper') && !f.gscopper);
  },
};
