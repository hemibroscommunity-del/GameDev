/* Variant-side sprite registry.  Each entry exposes a uniform
 * interface so the renderer can dispatch without per-variant code.
 *
 * Adding a new variant: import its loader module and add an entry
 * below.  Missing capabilities (no attack sheet, no projectile, etc.)
 * are nullable -- the renderer falls back gracefully.
 *
 * See src/data/monsterVariants.js for the per-variant tuning
 * (scales, durations, AI base).  This file is the rendering side --
 * the actual textures and frame counts.
 */

import {
  loadFireGoblinSprites,
  getFrame as fgWalkFrame,
  hasFrames as fgHasWalk,
  frameCount as fgWalkCount,
  getHitFrame as fgHitFrame,
  hasHitFrames as fgHasHit,
  hitFrameCount as fgHitCount,
  getDeathFrame as fgDeathFrame,
  hasDeathFrames as fgHasDeath,
  deathFrameCount as fgDeathCount,
  getRemnantsTexture as fgRemnants,
  getFireballTexture as fgFireball,
  FIREBALL_BASE_ANG as FG_BASE_ANG,
} from './fireGoblinSprites.js';

export const VARIANT_SPRITES = {
  fireGoblin: {
    load: loadFireGoblinSprites,
    walk:  { get: fgWalkFrame,  has: fgHasWalk,  count: fgWalkCount  },
    hit:   { get: fgHitFrame,   has: fgHasHit,   count: fgHitCount   },
    /* No idle sheet -- walk loop covers standing.  No attack sheet
       (disabled per user feedback v2.2.6). */
    idle:   null,
    attack: null,
    death: { get: fgDeathFrame, has: fgHasDeath, count: fgDeathCount },
    /* getRemnantsTexture / getFireballTexture return the texture or
       null until loaded; renderer treats null as "not ready yet". */
    remnants:   { get: fgRemnants },
    projectile: { get: fgFireball, baseAng: FG_BASE_ANG },
  },
};

/* Boot helper — preload every registered variant's sprites in
   parallel.  pixiRenderer calls this once at startup. */
export function loadAllVariantSprites() {
  return Promise.all(
    Object.values(VARIANT_SPRITES)
      .map(v => (v.load ? v.load() : null))
      .filter(Boolean)
  );
}

export function variantSpritesFor(variantKey) {
  return (variantKey && VARIANT_SPRITES[variantKey]) || null;
}
