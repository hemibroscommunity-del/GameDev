/* ═══ v2.3.1757: RECOLOURED GEAR SETS ═══
 *
 * A variant is an existing art set worn in a different metal.  It declares
 * which sheets to draw (`art`) and which material tint to draw them with
 * (`material`, see traits/materialTints.js) — nothing else, because nothing
 * else differs: the textures are literally the same TextureSource, so a
 * variant adds no download, no decode, no preload entry and no VRAM.
 *
 * That last point is why the resolution lives HERE rather than at each draw
 * site: getGearFrame keys its cache on the art id, so `copperplate` and
 * `steelplate` share one cache entry.  If a variant were given its own art id
 * the cache would split and the memory saving would quietly evaporate.
 *
 * Adding a set is one line.  Adding a metal is one line in MATERIALS.  The
 * cross-product costs nothing.
 */
import { materialTint, metalIconPath } from './traits/materialTints.js';

export const GEAR_VARIANTS = {
  copperplate: { slot: 'chest', art: 'steelplate', material: 'copper', name: 'Copper Plate' },
  coppergreaves: { slot: 'legs', art: 'steelgreaves', material: 'copper', name: 'Copper Greaves' },
  /* v2.3.1924: iron becomes obtainable — monsters drop the two pieces at
     1-in-500 each (server/src/data.js MONSTER_ARMOR_DROPS).  The metal has
     had a tint since v2.3.1760 and finished icon art (chest-plate-iron.webp /
     greaves-iron.webp) the whole time, and no way to get any of it; these two
     rows are the entire client cost of tier two, which is the "adding a metal
     is one line" claim at the top of this file being cashed. */
  ironplate: { slot: 'chest', art: 'steelplate', material: 'iron', name: 'Iron Plate' },
  irongreaves: { slot: 'legs', art: 'steelgreaves', material: 'iron', name: 'Iron Greaves' },
};

/* ═══ v2.3.2303: THE ART SETS THAT ACTUALLY SHIP ═══
 * Every gear loader interpolates a resolved art id straight into
 * `/sprites/gear/<slot>/<item>/<pose>-<dir>.png`, and the ids it resolves come
 * off the WIRE -- a peer's eqc/eql/eqs, which the worker admits as arbitrary
 * strings capped at 64 chars (server/src/index.js, the `eqc/eql/eqs/eqst`
 * sanitiser).  The server's own comment there claims "the receiving renderer
 * looks the id up in its own gear catalog and draws nothing for one it does
 * not know."  That was not true: gearArt() below returns an unknown id
 * UNCHANGED, so a crafted equip id reached the fetch.
 *
 * Three things that bought: wearing the RETIRED steel set on every other
 * screen (v2.3.1761 removed the catalog row, not the art); making every other
 * client fetch an arbitrary same-origin path; and rotating a fresh id every
 * couple of seconds to grow the loaders' caches without bound on everyone
 * else's device.
 *
 * One art set ships per slot, so the allow-list is exact rather than a
 * pattern.  A variant resolves to its `art` first (copper -> steel), so
 * recolours are covered without being listed.  Anything not here resolves to
 * null and the sprite simply does not draw -- which is what the server comment
 * always said happened. */
export const GEAR_ART_SETS = {
  shirt: ['tshirt'],
  chest: ['steelplate'],
  legs: ['steelgreaves'],
  belt: ['chainbelt'],
  fullset: ['steel'],
};

/** The art set a gear id draws from.  Non-variants are their own art. */
export function gearArt(item) {
  const v = item && Object.prototype.hasOwnProperty.call(GEAR_VARIANTS, item)
    ? GEAR_VARIANTS[item] : null;
  return v ? v.art : item;
}

/** gearArt(), but null for anything this slot has no sheets for.  Every loader
 *  that builds a sprite URL must go through this, not gearArt(). */
export function gearArtSafe(slot, item) {
  const art = gearArt(item);
  if (!art || typeof art !== 'string') return null;
  const ok = Object.prototype.hasOwnProperty.call(GEAR_ART_SETS, slot)
    && GEAR_ART_SETS[slot].indexOf(art) !== -1;
  return ok ? art : null;
}

/** The material id a gear id is worn in, or null for native art. */
export function gearMaterial(item) {
  const v = item && GEAR_VARIANTS[item];
  return v ? v.material : null;
}

/** Pixi tint for a gear id — 0xFFFFFF (a no-op) for everything unrecoloured,
 *  which is why this can be applied unconditionally at every draw site. */
export function gearTint(item) {
  return materialTint(gearMaterial(item));
}

/* ═══ v2.3.1758: THE MATERIAL TRAVELS WITH THE PIECE ═══
   Owner: "I'd like for copper to be the first armor in the game (you mine
   copper ore) so this should replace the iron armor.  The second tier of
   armor will be iron."

   A quest piece is a stat record (`{name, tierMult, slot, mat}`), and `mat` is
   the only thing that decides which art and which icon it wears.  Both lookups
   live here so a new tier is a row in these two tables and nothing else — the
   alternative is a `mat === 'copper' ? ... : ...` ladder in each of the five
   places that draw armour, which is how the same piece ends up copper on the
   character and steel in the bag.

   A piece with NO material is deliberately steel: that is every pre-v2.3.1758
   save, and it renders exactly as it always did. */
const ART_BY_MATERIAL = {
  chest: { copper: 'copperplate', iron: 'ironplate' },   /* v2.3.1924: iron */
  legs: { copper: 'coppergreaves', iron: 'irongreaves' },
};
const ART_DEFAULT = { chest: 'steelplate', legs: 'steelgreaves' };
const ICON_DEFAULT = { chest: '/icons/items/chest-plate.webp', legs: '/icons/items/greaves.webp' };

/** The gear id a worn stat piece should render as. */
export function gearIdFor(slot, material) {
  const byMat = ART_BY_MATERIAL[slot];
  return (byMat && material && byMat[material]) || ART_DEFAULT[slot] || 'none';
}

/** The inventory/loadout icon for a slot in a material.  Returns the path
 *  WITHOUT a cache-buster; callers append their own ITEMS_V. */
export function armorIconFor(slot, material) {
  /* v2.3.1760: the per-metal filename is a RULE (metalIconPath), shared with
     the generator that writes those files, so a new metal needs no entry
     here. */
  return metalIconPath(ICON_DEFAULT[slot] || null, material);
}

/** The icon for a gear id (the cosmetic layer's own id, not a stat piece). */
export function gearIdIcon(id) {
  for (const slot of ['chest', 'legs']) {
    if (id === ART_DEFAULT[slot]) return ICON_DEFAULT[slot];
    const byMat = ART_BY_MATERIAL[slot];
    for (const mat of Object.keys(byMat || {})) {
      if (byMat[mat] === id) return metalIconPath(ICON_DEFAULT[slot], mat);
    }
  }
  return null;
}

/** Display name for a variant, or null if the id is not one. */
export function gearVariantName(item) {
  const v = item && GEAR_VARIANTS[item];
  return v ? v.name : null;
}
