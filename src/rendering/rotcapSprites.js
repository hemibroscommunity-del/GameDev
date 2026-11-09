/* ═══ v2.3.4357: THE ROTCAP -- THE POISON FOREST'S MONSTERS ═══
 *
 * The owner, 2026-11-09: "Also this for poison land" -- and, asked which of
 * the Poison Forest's two stand-ins it replaces (the violet slime, the old
 * fishman picture in murk): "Both".
 *
 * So both of the land's variant keys draw from this (monsterVariantSprites.js
 * `mireWisp`, the one that spits, and `bogLurker`, the big dark one that
 * slams: MONSTER_VARIANTS has each one's size and colour).
 *
 * Two strips (public/sprites/monsters/rotcap/, rows of 256 px cells on 256
 * colours, cut from the owner's one sheet by tools/art/cut_rotcap.py):
 *   walk.png    20 cells: its shuffle, 4 frames a side, the five sides in
 *               SIDES' order -- facing you, side on (right), front-left, from
 *               behind, back-right.  Walking, and standing still (its idle:
 *               the same four, by the clock).
 *   death.png   12 frames: it sags, folds and rots down flat
 *
 * Eight facings from the five sides, three mirrored.  Lookups give
 * { tex, mirror } or null until the strip has loaded.
 */
import { loadTrackedStrip, unloadBundle } from './zoneTextures.js';

const FRAME_W = 256;
const FRAME_H = 256;
/* Bump on every change to the pictures, so the edge cache serves the new ones. */
const SPRITE_VERSION = '2.3.4357';
const DIR = '/sprites/monsters/rotcap';
const BUNDLE = 'rotcap';

/* the rows of walk.png, in order, and the frames in each */
export const ROTCAP_SIDES = Object.freeze(['s', 'e', 'sw', 'n', 'ne']);
export const ROTCAP_FRAMES = 4;
/* which side a facing is drawn from, and whether mirrored (the side and
   back-right rows face right, the front-left row left) */
export const ROTCAP_FACING = Object.freeze({
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'e',  mirror: true },
  northwest: { src: 'ne', mirror: true },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'ne', mirror: false },
  east:      { src: 'e',  mirror: false },
  southeast: { src: 'sw', mirror: true },
});

let walkFrames = [];
let deathFrames = [];
let loadPromise = null;

export function loadRotcapSprites() {
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
    strip('walk', (f) => { walkFrames = f; }),
    strip('death', (f) => { deathFrames = f; }),
  ]);
  return loadPromise;
}

export function getFrame(facing, frameIdx) {
  if (walkFrames.length < ROTCAP_SIDES.length * ROTCAP_FRAMES) return null;
  const m = ROTCAP_FACING[facing] || ROTCAP_FACING.south;
  const i = ((frameIdx % ROTCAP_FRAMES) + ROTCAP_FRAMES) % ROTCAP_FRAMES;
  return { tex: walkFrames[ROTCAP_SIDES.indexOf(m.src) * ROTCAP_FRAMES + i], mirror: m.mirror, scaleMult: 1 };
}
export function frameCount() { return walkFrames.length ? ROTCAP_FRAMES : 0; }
export function hasFrames() { return walkFrames.length > 0; }

/* the death: one strip, played once and held on its last frame */
export function getDeathFrame(frameIdx) {
  if (!deathFrames.length) return null;
  return deathFrames[Math.max(0, Math.min(deathFrames.length - 1, frameIdx))];
}
export function deathFrameCount() { return deathFrames.length; }
export function hasDeathFrames() { return deathFrames.length > 0; }

/* Let it all go (preloadAnimations freeZoneAssets, wheelMonsterArt freeLook):
   the memoised promise cleared too, so the next load is a real one.  Both of
   the land's keys share this one module: unloadVariantSprites frees it once,
   and never from under a key that is kept. */
export function unloadRotcapSprites() {
  loadPromise = null;
  walkFrames = [];
  deathFrames = [];
  return unloadBundle(BUNDLE);
}
