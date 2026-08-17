/* Preload the COMBAT-pose gear sheets (sword-swing + bow-shot) so the first
 * armored attack doesn't hitch.
 *
 * Idle/stand/jog gear is warmed by gearSheets.preloadGear() into its own cache,
 * but the swing/bowshot strips render through a SEPARATE instance cache in
 * effectsRenderer (_gearStripFrame), which lazily Assets.load()s the sheet on
 * first use -> a cold network fetch + GPU upload mid-combat.  We warm the exact
 * same URLs into the Pixi Assets cache here so that lazy load is an instant
 * cache hit (the cheap per-frame slice stays lazy).  GPU upload of these is
 * handled by entityRenderer.uploadGearTextures over the same URL list.
 *
 * The (pose,dir) keys MUST match effectsRenderer's cfg keys (NOT facings):
 *   swing   -> south/east/north          (_swordCfg)
 *   bowshot -> east/southwest/south/northwest/north  (_bowCfg)
 * Only chest + legs layer during combat.  Missing slot×item×dir combos 404 by
 * design (.catch keeps them from stalling the gate). */

import { Assets } from 'pixi.js';
import { gearArt } from './gearVariants.js'; /* v2.3.1761 */
import { GEAR_CATALOG, getEquip } from './gearCatalog.js';
import { GEARLAYER_VER } from './gearVersion.js';

const COMBAT_SLOTS = ['chest', 'legs'];
const COMBAT_POSE_DIRS = {
  swing:   ['south', 'east', 'north'],
  bowshot: ['east', 'southwest', 'south', 'northwest', 'north'],
};

/** Every combat-gear sheet URL worth warming: equipped item + all catalog
 *  options per slot, across the dirs each attack pose actually ships. */
export function combatGearUrls() {
  const urls = [];
  for (const slot of COMBAT_SLOTS) {
    const items = new Set();
    /* v2.3.1761: a recoloured set has no sheets of its own — warm the art it
       borrows, or every copper id here requests a 404 per pose per dir. */
    const eq = gearArt(getEquip(slot));
    if (eq && eq !== 'none') items.add(eq);
    for (const c of (GEAR_CATALOG[slot] || [])) {
      const art = gearArt(c.id);
      if (art && art !== 'none') items.add(art);
    }
    for (const item of items) {
      for (const pose of Object.keys(COMBAT_POSE_DIRS)) {
        for (const dir of COMBAT_POSE_DIRS[pose]) {
          urls.push(`/sprites/gear/${slot}/${item}/${pose}-${dir}.png?v=${GEARLAYER_VER}`);
        }
      }
    }
  }
  return urls;
}

/** Warm the combat-gear sheets into the Pixi Assets cache.  Network-only, so it
 *  parallelizes with the other intro-gate loaders; always resolves. */
export function preloadCombatGear() {
  return Promise.allSettled(combatGearUrls().map((u) => Assets.load(u).catch(() => {})));
}
