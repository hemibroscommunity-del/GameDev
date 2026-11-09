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
  unloadFireGoblinSprites,
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
  unloadMummySprites,
  getFrame as mWalkFrame,
  hasFrames as mHasWalk,
  frameCount as mWalkCount,
  getTransformFrame as mTransformFrame,
  hasTransformFrames as mHasTransform,
  transformFrameCount as mTransformCount,
} from './mummySprites.js';

import {
  loadSkeletonSprites,
  unloadSkeletonSprites,
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
  unloadFishmanSprites,
  getFrame as fhWalkFrame,
  hasFrames as fhHasWalk,
  frameCount as fhWalkCount,
} from './fishmanSprites.js';

/* v2.3.4355: the water frog -- the Water Caves' monster (key `fishman`) */
import {
  loadWaterFrogSprites,
  unloadWaterFrogSprites,
  getFrame as wfHopFrame,
  hasFrames as wfHasHop,
  frameCount as wfHopCount,
  getIdleFrame as wfIdleFrame,
  hasIdleFrames as wfHasIdle,
  idleFrameCount as wfIdleCount,
  getAttackFrame as wfAttackFrame,
  hasAttackFrames as wfHasAttack,
  attackFrameCount as wfAttackCount,
  getDeathFrame as wfDeathFrame,
  hasDeathFrames as wfHasDeath,
  deathFrameCount as wfDeathCount,
} from './waterFrogSprites.js';

import {
  loadRockmonsterSprites,
  unloadRockmonsterSprites,
  getFrame as rmWalkFrame,
  hasFrames as rmHasWalk,
  frameCount as rmWalkCount,
} from './rockmonsterSprites.js';

/* v2.3.4356: the storm eye -- the Electric Foundry's monster */
import {
  loadStormEyeSprites,
  unloadStormEyeSprites,
  getFrame as seFrame,
  hasFrames as seHas,
  frameCount as seCount,
  getDeathFrame as seDeathFrame,
  hasDeathFrames as seHasDeath,
  deathFrameCount as seDeathCount,
} from './stormEyeSprites.js';

export const VARIANT_SPRITES = {
  fireGoblin: {
    load: loadFireGoblinSprites,
    unload: unloadFireGoblinSprites,
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
    unload: unloadMummySprites,
    walk:   { get: mWalkFrame, has: mHasWalk, count: mWalkCount },
    /* No attack/hit/death art yet -- renderer falls through to the
       generic fodder paths.  The transform field plays the one-shot
       bandage shred at the moment the mummy crosses its HP threshold
       (see MONSTER_VARIANTS.mummy.transformAt + transformFrameMs). */
    transform: { get: mTransformFrame, has: mHasTransform, count: mTransformCount },
  },
  skeleton: {
    load: loadSkeletonSprites,
    unload: unloadSkeletonSprites,
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
  /* v2.3.4355: THE WATER FROG (the owner: "I want to replace the fish man
     monster").  The key stays `fishman` -- the worker's and every saved
     codex's name for the Water Caves' brute -- and the pictures are the
     frog's: a hop for its walk, a breath for standing still (`idle`, the
     first variant with one), a wind-up and recovery for its blows, and its
     own death (waterFrogSprites.js; MONSTER_VARIANTS.fishman has the pace
     of each). */
  fishman: {
    load: loadWaterFrogSprites,
    unload: unloadWaterFrogSprites,
    walk:   { get: wfHopFrame,    has: wfHasHop,    count: wfHopCount    },
    idle:   { get: wfIdleFrame,   has: wfHasIdle,   count: wfIdleCount   },
    attack: { get: wfAttackFrame, has: wfHasAttack, count: wfAttackCount },
    death:  { get: wfDeathFrame,  has: wfHasDeath,  count: wfDeathCount  },
  },
  /* v2.3.4356: THE STORM EYE (the owner: "add this electric eyeball monster
     instead of the stand-in electric slime").  One still picture a side
     (`walk`: the renderer hovers it, MONSTER_VARIANTS.stormEye) and its own
     death; no attack, hit or idle strips -- its electricity is drawn in
     code (stormSparksFx.js). */
  stormEye: {
    load: loadStormEyeSprites,
    unload: unloadStormEyeSprites,
    walk:  { get: seFrame,      has: seHas,      count: seCount      },
    death: { get: seDeathFrame, has: seHasDeath, count: seDeathCount },
  },
  rockmonster: {
    load: loadRockmonsterSprites,
    unload: unloadRockmonsterSprites,
    /* A single still pose -- one frame per direction, no attack/hit/death
       sheets, falls through to brute generic. */
    walk: { get: rmWalkFrame, has: rmHasWalk, count: rmWalkCount },
  },
  /* v2.3.1147: verdant/mist brute reskins -- SAME loaders as their
     source variants (loaders cache internally, so the textures are
     shared; the recolor is a per-sprite Pixi tint from
     MONSTER_VARIANTS[key].tint applied in entityRenderer).  The two
     fodder reskins (mossSlime/mireWisp) deliberately have NO entry
     here: useSlimeSheets routes them through the slime state branch. */
  thornShambler: {
    load: loadRockmonsterSprites,
    unload: unloadRockmonsterSprites,
    walk: { get: rmWalkFrame, has: rmHasWalk, count: rmWalkCount },
  },
  /* v2.3.4355: the bog lurker keeps the old fishman pictures (a single
     still pose a direction), now its alone: the Water Caves' own monster
     is the water frog above. */
  bogLurker: {
    load: loadFishmanSprites,
    unload: unloadFishmanSprites,
    walk: { get: fhWalkFrame, has: fhHasWalk, count: fhWalkCount },
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
/* v2.3.2989: the Wheel loads its monsters' looks itself, as you walk toward
   them (wheelMonsterArt.js), and draws none before its look is ready; there
   the kick below is off, so nothing else starts a load behind its back (or
   loads again what it let go). */
let _kicksOn = true;
export function setVariantKicks(on) { _kicksOn = !!on; }

export function variantSpritesFor(variantKey) {
  const v = (variantKey && VARIANT_SPRITES[variantKey]) || null;
  /* Lazy first-sighting load: the renderer calls this every frame for a visible
     monster; kick the variant's own loader once and let it fall back to the base
     archetype until the sheets land. */
  if (_kicksOn && v && v.load && !_variantLoadKicked.has(variantKey)) {
    _variantLoadKicked.add(variantKey);
    try { Promise.resolve(v.load()).catch(() => {}); } catch (e) { /* ignore */ }
  }
  return v;
}


/* ═══ v2.3.2272: RELEASE A SET OF VARIANTS, ONCE EACH ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."  Measured as +92MB of resident decoded texture across a
 * four-zone tour that never came back (mp-texdrift); see zoneTextures.js for
 * the numbers and why nothing was freed before.
 *
 * DEDUPED BY LOADER, NOT BY KEY, and that is the whole reason this helper
 * exists rather than a loop at the call site.  thornShambler and rockmonster
 * are two variant keys over ONE sprite module (v2.3.1147's reskins share
 * their source's sheets), so freeing by key would
 * tear the art out from under a variant that is still in the zone being walked
 * into, and would try to free the same module twice.
 *
 * The kicked-load set is cleared for the freed keys too: it exists so
 * variantSpritesFor's lazy first-sighting fallback fires once, and a key left
 * in it after its art is gone would leave that fallback permanently spent. */
export function unloadVariantSprites(keys, keep) {
  const fns = new Set();
  const freed = [];
  /* ═══ v2.3.3016: ...AND NEVER A MODULE A KEPT KEY DRAWS FROM ═══
     Deduping within `keys` was half of it.  The day a zone kept SOME of the
     zone it left -- out of the Wheel (all eight lands' looks) into one of its
     dungeons (one land's) -- the free dropped the Verdant Wilds' thornShambler
     and with it the one rockmonster module, from under the Great Cave's rock
     monsters: their textures destroyed under live sprites ("Cannot read
     properties of null (reading 'addressModeU')" every frame, none drawn).
     `keep` is the destination's keys (freeZoneAssets passes them). */
  const held = new Set();
  for (const key of keep || []) {
    const v = VARIANT_SPRITES[key];
    if (v && v.unload) held.add(v.unload);
  }
  for (const key of keys || []) {
    const v = VARIANT_SPRITES[key];
    if (!v || !v.unload || fns.has(v.unload) || held.has(v.unload)) continue;
    fns.add(v.unload);
    freed.push(key);
  }
  for (const key of keys || []) _variantLoadKicked.delete(key);
  return Promise.all([...fns].map((fn) => {
    try { return Promise.resolve(fn()).catch(() => 0); } catch (e) { return 0; }
  })).then(() => freed);
}
