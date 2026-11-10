/* ═══ v2.3.4358: THE ROCK GOLEM -- THE STONE HOLLOWS' MONSTER ═══
 *
 * The owner, 2026-11-09: "Also this to replace the rock monster that's there
 * now."
 *
 * It wears the rock monster's variant key (`rockmonster`: the worker's name
 * for the Stone Hollows' brute, on the wire and in every saved codex), and so
 * does the thorn shambler, which was always the rock monster's pictures in
 * moss green (monsterVariantSprites.js: one module for both keys).  The old
 * one-pose egg of rock and its module are gone.
 *
 * Two strips (public/sprites/monsters/rock-golem/, rows of 256 px cells on
 * 256 colours, cut from the owner's one sheet by tools/art/cut_rock_golem.py):
 *   walk.png    20 cells: it grinding along, 4 frames a side, the five sides
 *               in SIDES' order -- facing you, side on (right), front-left,
 *               from behind, back-right.  Walking, and standing still (its
 *               idle: the same four, by the clock).
 *   death.png   13 frames: its eyes go out, it cracks and falls to rubble
 *
 * Eight facings from the five sides, three mirrored.  Lookups give
 * { tex, mirror } or null until the strip has loaded.
 */
import { loadTrackedStrip, unloadBundle } from './zoneTextures.js';

const FRAME_W = 256;
const FRAME_H = 256;
/* Bump on every change to the pictures, so the edge cache serves the new ones. */
const SPRITE_VERSION = '2.3.4359';   /* v2.3.4359: re-cut on the monster's one shared list of 256 colours */
const DIR = '/sprites/monsters/rock-golem';
const BUNDLE = 'rockGolem';

/* the rows of walk.png, in order, and the frames in each */
export const ROCK_GOLEM_SIDES = Object.freeze(['s', 'e', 'sw', 'n', 'ne']);
export const ROCK_GOLEM_FRAMES = 4;
/* which side a facing is drawn from, and whether mirrored (the side and
   back-right rows face right, the front-left row left) */
export const ROCK_GOLEM_FACING = Object.freeze({
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

export function loadRockGolemSprites() {
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
  if (walkFrames.length < ROCK_GOLEM_SIDES.length * ROCK_GOLEM_FRAMES) return null;
  const m = ROCK_GOLEM_FACING[facing] || ROCK_GOLEM_FACING.south;
  const i = ((frameIdx % ROCK_GOLEM_FRAMES) + ROCK_GOLEM_FRAMES) % ROCK_GOLEM_FRAMES;
  return { tex: walkFrames[ROCK_GOLEM_SIDES.indexOf(m.src) * ROCK_GOLEM_FRAMES + i], mirror: m.mirror, scaleMult: 1 };
}
export function frameCount() { return walkFrames.length ? ROCK_GOLEM_FRAMES : 0; }
export function hasFrames() { return walkFrames.length > 0; }

/* the death: one strip, played once and held on its last frame */
export function getDeathFrame(frameIdx) {
  if (!deathFrames.length) return null;
  return deathFrames[Math.max(0, Math.min(deathFrames.length - 1, frameIdx))];
}
export function deathFrameCount() { return deathFrames.length; }
export function hasDeathFrames() { return deathFrames.length > 0; }

/* Let it all go (preloadAnimations freeZoneAssets, wheelMonsterArt freeLook):
   the memoised promise cleared too, so the next load is a real one.  The rock
   monster's and the thorn shambler's keys share this one module:
   unloadVariantSprites frees it once, and never from under a key that is kept. */
export function unloadRockGolemSprites() {
  loadPromise = null;
  walkFrames = [];
  deathFrames = [];
  return unloadBundle(BUNDLE);
}
