/* ═══ v2.3.3895: OLD ONE-HANDED SWORDS BECOME GREATSWORDS ═══
 * Spec: docs/specs/sword-to-greatsword.md
 *
 * The owner, 2026-10-30: "Yes turn old swords into greatswords".  The Forge
 * has made only greatswords since v2.3.3524 ("the one-handed sword was a
 * bamboo stick in every picture", docs/specs/blacksmith-2026-10-19.md), and
 * older characters still held the retired weapon.  Their answers to the plan's
 * four questions, all as recommended:
 *   1. a WOOD sword (the bamboo stick, "Bro's Sword") becomes a COPPER
 *      greatsword -- the game's first weapon; a wood greatsword is "not an
 *      actual weapon in the game";
 *   2. the rise is accepted: a greatsword's base is 10 against the sword's
 *      6.67 (gear.js _weaponBase), what the Forge makes from the same bars;
 *   3. names the GAME gave are rebuilt ("copper sword" -> "copper
 *      greatsword", "Flame Sword" -> "Flame Great Sword"); a name given by
 *      hand ("Iron Longsword") is kept;
 *   4. a mark, `was`, records what the weapon was, so this can be undone
 *      exactly.
 *
 * ONE FUNCTION, EVERY DOOR.  `swordToGreatsword(w)` is pure (no `this`, no
 * storage): it converts one weapon blob IN PLACE and says whether it did.  The
 * rpg migration (migrations.js v19), the post's weapon credit (inbox.js), the
 * Auction House's and the Marketplace's wake-time rebuilds (store.js,
 * market.js) and the Forge (gear.js) all call it, so they can never disagree
 * about what a converted sword is.
 *
 * WHAT CHANGES, AND WHAT DOES NOT.  The TYPE only, and for a wood sword its
 * metal.  Everything that makes the weapon this weapon stays: its grade
 * (`quality`), hardness, temper, reforge and harden bonuses, its gems
 * (`element1`, `element2`, `isVolatile`).  Equipping does not change: the
 * skill, the category, the slot, salvage, hardening's material and the equip
 * gate all treat a sword and a greatsword as the one sword family.  There is
 * no two-handed rule anywhere, so no shield is touched.
 *
 * `'sword'` IS ALSO A SKILL KEY (prog3.sk.sword, weaponSpecs.sword, atk.sword):
 * this file reads and writes a weapon's `type` and nothing else so named.
 *
 * IDEMPOTENT.  A greatsword is never touched, and `was` is written once, so
 * converting twice is converting once.
 *
 * (`wtype`, not `type:` in object literals: the hardening suite scans this
 * folder for `type:` literals as emittable event names -- migrations.js v12's
 * note.)
 */
import { BLACKSMITH_TIERS, BLACKSMITH_TIER_LABELS, WEAPON_TYPE_LABELS } from './data.js';
import { weaponGemName } from './weapongem.js';

const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* What the game names a sword it made, for each way it made one, so a name
   that matches one of them is the game's own and is rebuilt -- the same
   generator, for a greatsword. */
function gameNamesFor(w) {
  const base = typeof w.gearBase === 'string' ? w.gearBase : '';
  const out = new Set(["Bro's Sword"]);              /* the old starter grant */
  if (base) {
    out.add(base + ' sword');                          /* the Forge: gear.js `tierKey + ' ' + weaponType` */
    if (has(BLACKSMITH_TIER_LABELS, base)) out.add(BLACKSMITH_TIER_LABELS[base] + ' ' + WEAPON_TYPE_LABELS.sword);   /* amulet.js _stripGems */
    out.add(weaponGemName(w));                         /* a gem set (weapongem.js) */
  }
  return out;
}

/** Convert one weapon blob, in place, if it is a one-handed sword.  Returns
 *  true when it changed.  Never throws on junk: anything that is not a sword
 *  blob is left alone. */
export function swordToGreatsword(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  if (w.type !== 'sword') return false;
  const was = { t: 'sword', name: typeof w.name === 'string' ? w.name : null };
  if (has(w, 'gearBase')) was.gearBase = w.gearBase;
  if (has(w, 'tierMult')) was.tierMult = w.tierMult;
  const gameNamed = typeof w.name === 'string' && gameNamesFor(w).has(w.name);
  const forgeNamed = typeof w.name === 'string' && typeof w.gearBase === 'string' && w.name === w.gearBase + ' sword';

  /* owner call 1: the bamboo stick becomes the first weapon, copper */
  if (w.gearBase === 'wood') {
    w.gearBase = 'copper';
    w.tierMult = BLACKSMITH_TIERS.copper.tierMult;
  }
  w.type = 'greatsword';

  /* owner call 3: the game's names rebuilt, a hand-given one kept */
  if (typeof w.name === 'string') {
    if (forgeNamed) w.name = w.gearBase + ' greatsword';
    else if (gameNamed && typeof w.gearBase === 'string' && w.gearBase) w.name = weaponGemName(w);
    else if (/(^|\s)Sword$/.test(w.name)) w.name = w.name.replace(/Sword$/, WEAPON_TYPE_LABELS.greatsword);
    else if (/(^|\s)sword$/.test(w.name)) w.name = w.name.replace(/sword$/, 'greatsword');
  }
  /* owner call 4: the mark, once -- what it was, so it can be undone exactly */
  if (!w.was) w.was = was;
  return true;
}

/** Every weapon a character's record holds: the three slots and the bag.
 *  Returns true when any changed. */
export function convertRecordSwords(blob) {
  if (!blob || typeof blob !== 'object') return false;
  let changed = false;
  for (const slot of ['weapon', 'rangedWeapon', 'staffWeapon']) {
    if (swordToGreatsword(blob[slot])) changed = true;
  }
  if (Array.isArray(blob.weaponStash)) {
    for (const w of blob.weaponStash) if (swordToGreatsword(w)) changed = true;
  }
  return changed;
}

export const swordConvertMethods = {
  /* KILL SWITCH (lower case, TRAPS §117): `swordconvert: false` stops the
     boundary heals (the post, the shelves' rebuilds) and the Forge's mapping.
     The rpg migration is not switchable: it is the record's shape, stamped by
     `_v`, and a switch that stopped it part-way through the players would
     leave the same thing in two shapes. */
  _swordConvertOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'swordconvert') && !f.swordconvert);
  },
};
