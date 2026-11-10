/* ═══ v2.3.4356: THE STORM EYE -- THE ELECTRIC FOUNDRY'S MONSTER ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".
 *
 * Two strips (public/sprites/monsters/storm-eye/, rows of 256 px cells on 256
 * colours, cut from the owner's one sheet by tools/art/cut_storm_eye.py):
 *   views.png   5 cells, one still picture a side, in VIEWS' order: facing
 *               you, side on (right), front-left, from behind, back-right
 *   death.png   12 frames: it cracks, tips over and breaks up
 *
 * It has no walk, idle or attack frames: it is one picture a side, and it
 * floats.  The renderer hovers it (MONSTER_VARIANTS.stormEye `hover`) and its
 * electricity is drawn in code (rendering/stormSparksFx.js).  Eight facings
 * from the five views, three mirrored.  Lookups give { tex, mirror } or null
 * until the strip has loaded.
 */
import { loadTrackedStrip, unloadBundle } from './zoneTextures.js';
import { wantStormSparks } from './stormSparksFx.js';   /* v2.3.4361: its lightning's sprites come and go with its look */

const FRAME_W = 256;
const FRAME_H = 256;
/* Bump on every change to the pictures, so the edge cache serves the new ones. */
const SPRITE_VERSION = '2.3.4359';   /* v2.3.4359: re-cut on the monster's one shared list of 256 colours */
const DIR = '/sprites/monsters/storm-eye';
const BUNDLE = 'stormEye';

/* the cells of views.png, in order */
export const STORM_EYE_VIEWS = Object.freeze(['s', 'e', 'sw', 'n', 'ne']);
/* which view a facing is drawn from, and whether mirrored (the side and
   back-right views face right, the front-left view left) */
export const STORM_EYE_FACING = Object.freeze({
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'e',  mirror: true },
  northwest: { src: 'ne', mirror: true },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'ne', mirror: false },
  east:      { src: 'e',  mirror: false },
  southeast: { src: 'sw', mirror: true },
});

let viewFrames = [];
let deathFrames = [];
let loadPromise = null;

export function loadStormEyeSprites() {
  wantStormSparks(true);
  if (loadPromise) return loadPromise;
  const strip = async (name, set) => {
    try {
      const frames = await loadTrackedStrip(BUNDLE, `${DIR}/${name}.png?v=${SPRITE_VERSION}`, FRAME_W, FRAME_H);
      /* (assigned whole: a load that lands after an unload must not append
         to the next load's frames) */
      if (frames.length) set(frames);
    } catch { /* missing: the renderer's stand-in body */ }
  };
  loadPromise = Promise.all([
    strip('views', (f) => { viewFrames = f; }),
    strip('death', (f) => { deathFrames = f; }),
  ]);
  return loadPromise;
}

/* its one picture this way: the same whatever frame is asked for */
export function getFrame(facing) {
  if (!viewFrames.length) return null;
  const m = STORM_EYE_FACING[facing] || STORM_EYE_FACING.south;
  const tex = viewFrames[STORM_EYE_VIEWS.indexOf(m.src)] || viewFrames[0];
  return { tex, mirror: m.mirror, scaleMult: 1 };
}
export function frameCount() { return viewFrames.length ? 1 : 0; }
export function hasFrames() { return viewFrames.length > 0; }

/* the death: one strip, played once and held on its last frame */
export function getDeathFrame(frameIdx) {
  if (!deathFrames.length) return null;
  return deathFrames[Math.max(0, Math.min(deathFrames.length - 1, frameIdx))];
}
export function deathFrameCount() { return deathFrames.length; }
export function hasDeathFrames() { return deathFrames.length > 0; }

/* Let it all go (preloadAnimations freeZoneAssets, wheelMonsterArt freeLook):
   the memoised promise cleared too, so the next load is a real one. */
export function unloadStormEyeSprites() {
  wantStormSparks(false);
  loadPromise = null;
  viewFrames = [];
  deathFrames = [];
  return unloadBundle(BUNDLE);
}
