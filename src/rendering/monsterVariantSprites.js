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
  getAttackFrame as fgAttackFrame,
  hasAttackFrames as fgHasAttack,
  attackFrameCount as fgAttackCount,
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

import {
  loadMummySprites,
  getFrame as mWalkFrame,
  hasFrames as mHasWalk,
  frameCount as mWalkCount,
  getTransformFrame as mTransformFrame,
  hasTransformFrames as mHasTransform,
  transformFrameCount as mTransformCount,
} from './mummySprites.js';

import {
  loadSkeletonSprites,
  getFrame as skWalkFrame,
  hasFrames as skHasWalk,
  frameCount as skWalkCount,
} from './skeletonSprites.js';

export const VARIANT_SPRITES = {
  fireGoblin: {
    load: loadFireGoblinSprites,
    walk:   { get: fgWalkFrame,   has: fgHasWalk,   count: fgWalkCount   },
    attack: { get: fgAttackFrame, has: fgHasAttack, count: fgAttackCount },
    hit:    { get: fgHitFrame,    has: fgHasHit,    count: fgHitCount    },
    /* No idle sheet -- walk frame 0 holds the standing pose. */
    idle:   null,
    death: { get: fgDeathFrame, has: fgHasDeath, count: fgDeathCount },
    /* getRemnantsTexture / getFireballTexture return the texture or
       null until loaded; renderer treats null as "not ready yet". */
    remnants:   { get: fgRemnants },
    projectile: { get: fgFireball, baseAng: FG_BASE_ANG },
  },
  mummy: {
    load: loadMummySprites,
    walk:   { get: mWalkFrame, has: mHasWalk, count: mWalkCount },
    /* No attack/hit/death art yet -- renderer falls through to the
       generic fodder paths.  The transform field plays the one-shot
       bandage shred at the moment the mummy crosses its HP threshold
       (see MONSTER_VARIANTS.mummy.transformAt + transformFrameMs). */
    transform: { get: mTransformFrame, has: mHasTransform, count: mTransformCount },
  },
  skeleton: {
    load: loadSkeletonSprites,
    /* Skeleton uses the run strip for both moving and standing
       (frame 0 holds the contact pose for the standing case in
       entityRenderer's idle branch). */
    walk: { get: skWalkFrame, has: skHasWalk, count: skWalkCount },
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
