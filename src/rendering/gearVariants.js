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
import { materialTint } from './traits/materialTints.js';

export const GEAR_VARIANTS = {
  copperplate: { slot: 'chest', art: 'steelplate', material: 'copper', name: 'Copper Plate' },
  coppergreaves: { slot: 'legs', art: 'steelgreaves', material: 'copper', name: 'Copper Greaves' },
};

/** The art set a gear id draws from.  Non-variants are their own art. */
export function gearArt(item) {
  const v = item && GEAR_VARIANTS[item];
  return v ? v.art : item;
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

/** Display name for a variant, or null if the id is not one. */
export function gearVariantName(item) {
  const v = item && GEAR_VARIANTS[item];
  return v ? v.name : null;
}
