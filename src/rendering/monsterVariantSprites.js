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
  getDeathFrame as skDeathFrame,
  hasDeathFrames as skHasDeath,
  deathFrameCount as skDeathCount,
  getRemnantsTexture as skRemnants,
} from './skeletonSprites.js';

import {
  loadFishmanSprites,
  getFrame as fhWalkFrame,
  hasFrames as fhHasWalk,
  frameCount as fhWalkCount,
} from './fishmanSprites.js';

import {
  loadRockmonsterSprites,
  getFrame as rmWalkFrame,
  hasFrames as rmHasWalk,
  frameCount as rmWalkCount,
} from './rockmonsterSprites.js';

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
    /* 16-frame crumble + dust + bone-pile death animation.  Plays
       at MONSTER_VARIANTS.skeleton.deathMs in entityRenderer's death
       branch (line ~474), clamps to last frame so the pile settles. */
    death: { get: skDeathFrame, has: skHasDeath, count: skDeathCount },
    /* Bone-pile remnants -- single-frame texture rendered by
       effectsRenderer's ground-loot branch when the skeleton kill's
       loot drop lands.  variant.noFodderRemnants is OFF for skeleton
       so the fodder branch picks up this texture instead of falling
       through to the slime splat. */
    remnants: { get: skRemnants },
  },
  fishman: {
    load: loadFishmanSprites,
    /* Single still pose; renderer dwells on the only frame while the
       entity translates around the map.  No attack/hit/death sheets --
       falls through to the brute generic paths. */
    walk: { get: fhWalkFrame, has: fhHasWalk, count: fhWalkCount },
  },
  rockmonster: {
    load: loadRockmonsterSprites,
    /* Same still-pose pattern as fishman -- one frame per direction,
       no attack/hit/death sheets, falls through to brute generic. */
    walk: { get: rmWalkFrame, has: rmHasWalk, count: rmWalkCount },
  },
};

/* Boot helper — preload every registered variant's sprites in parallel.
   v2.3.1119: NO LONGER called at startup (kept for any explicit warm).  Variant
   sheets now load lazily per-variant the first time that variant is rendered
   (see variantSpritesFor), so a town session -- which has no monsters -- never
   pays for the ~10-20MB of variant textures.  Each variant's load() caches
   internally, so per-variant kicks are idempotent. */
export function loadAllVariantSprites() {
  return Promise.all(
    Object.values(VARIANT_SPRITES)
      .map(v => (v.load ? v.load() : null))
      .filter(Boolean)
  );
}

/* v2.3.1119: track which variants we've already kicked a load for, so the
   per-frame render lookup fires each variant's load() exactly once. */
const _variantLoadKicked = new Set();
export function variantSpritesFor(variantKey) {
  const v = (variantKey && VARIANT_SPRITES[variantKey]) || null;
  /* Lazy first-sighting load: the renderer calls this every frame for a visible
     monster; kick the variant's own loader once and let it fall back to the base
     archetype until the sheets land. */
  if (v && v.load && !_variantLoadKicked.has(variantKey)) {
    _variantLoadKicked.add(variantKey);
    try { Promise.resolve(v.load()).catch(() => {}); } catch (e) { /* ignore */ }
  }
  return v;
}
