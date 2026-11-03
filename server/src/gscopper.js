/* ═══ v2.3.3980: OLD WOODEN GREATSWORDS BECOME COPPER ═══
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
 * THE ONE LIMIT: never a weapon made weaker.  A drop with no gearBase whose
 * tierMult is ABOVE copper's (the old Elemental 1.50, Fusion 2.25 and Shift
 * 3.00 rolls, data.js RARITY_TIERS) is not a wooden sword, and as copper it
 * would lose up to two thirds of its damage -- or keep its damage under a
 * copper name and copper's equip gate (rung 0), wearable at level 1.  So it
 * is left exactly as it is (the smaller, safer choice; the spec asks the
 * owner).
 *
 * WHAT CHANGES: `gearBase` -> 'copper', `tierMult` -> 1.12, and a name the
 * GAME gave is rebuilt as the copper one ("Copper Great Sword", a gem's
 * "Copper Flame Great Sword" through weaponGemName).  Everything else stays:
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
   gearBase that is no stronger than copper.  Anything else is left alone. */
export function isOldGreatsword(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  if (w.type !== 'greatsword') return false;
  if (w.gearBase === 'wood') return true;
  if (has(w, 'gearBase') && w.gearBase !== null && w.gearBase !== undefined && w.gearBase !== '') return false;
  const tm = (typeof w.tierMult === 'number' && w.tierMult > 0) ? w.tierMult : 1;
  return tm <= COPPER_MULT;
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

/** Convert one weapon blob, in place, if it is an old wooden (or base-less,
 *  no-stronger-than-copper) greatsword.  Returns true when it changed.  Never
 *  throws on junk.  Idempotent: a copper greatsword is never touched. */
export function oldGreatswordToCopper(w) {
  if (!isOldGreatsword(w)) return false;
  const was = { t: 'greatsword', name: typeof w.name === 'string' ? w.name : null, gearBase: has(w, 'gearBase') ? w.gearBase : null };
  if (has(w, 'tierMult')) was.tierMult = w.tierMult;
  const gameNamed = typeof w.name !== 'string' || !w.name || gameNamesFor(w).has(w.name);
  w.gearBase = 'copper';
  w.tierMult = COPPER_MULT;
  if (gameNamed) w.name = weaponGemName(w);                     /* "Copper Great Sword", "Copper Flame Great Sword" */
  else if (/^Wood(en)?\s/.test(w.name)) w.name = w.name.replace(/^Wood(en)?\s/, 'Copper ');
  if (!w.was) w.was = was;
  return true;
}

/** Every weapon a character's record holds: the three slots and the bag, as
 *  v12 and v19 walk them.  Returns true when any changed. */
export function convertRecordGreatswords(blob) {
  if (!blob || typeof blob !== 'object') return false;
  let changed = false;
  for (const slot of ['weapon', 'rangedWeapon', 'staffWeapon']) {
    if (oldGreatswordToCopper(blob[slot])) changed = true;
  }
  if (Array.isArray(blob.weaponStash)) {
    for (const w of blob.weaponStash) if (oldGreatswordToCopper(w)) changed = true;
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
