/* Mummy variant sprite loader for the Pixi renderer.
 *
 * Directional walk strips (per-facing strip of 8 x 256 px frames):
 *   walk-{s,se,w,nw,n}.png  -- 5 source directions
 *
 * One-shot transform animation:
 *   transform.png  -- 8 x 256 px, mummy -> skeleton bandage shred.
 *   Non-directional; renderer plays this once at the trigger moment
 *   over ~480 ms then falls through to the skeleton walk loop.
 *
 * 8-facing WALK_MAP picks the closest source for each compass dir;
 * right-side facings mirror=true off the left-side art.
 *
 * Lookup APIs return { tex, mirror } or null until the source PNG
 * resolves; entityRenderer falls back to the slime sheet (or the
 * procedural circle) while the load is in flight.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 256;
const FRAME_H = 256;

/* Bump on every sprite-art change so Cloudflare Pages' edge cache
   serves the new PNG instead of the old one. */
const SPRITE_VERSION = '2.3.58';

const WALK_DIRS = ['s', 'se', 'w', 'nw', 'n'];

/* User's uploaded set covers S/SE on the right side plus W/NW/N
   on the left.  Right-side (E, NE) get produced by mirroring.
   v2.3.45: SE/SW mirror flags swapped per user review -- the file
   labeled 'se' actually shows the mummy facing SW (the user reported
   "mummy faces southwest when traveling southeast and vice versa").
   v2.3.54: per-direction scaleMult.  East + Southwest read visibly
   larger than the other 6 facings even after normalize_mummy_sheets
   matched their figure heights to 220 px.  Bumping them down 10 %
   evens the perceived silhouette without touching the source PNGs. */
const WALK_MAP = {
  south:     { src: 's',  mirror: false, scaleMult: 1.0 },
  southeast: { src: 'se', mirror: true,  scaleMult: 1.0 },
  east:      { src: 'w',  mirror: true,  scaleMult: 0.9 },
  northeast: { src: 'nw', mirror: true,  scaleMult: 1.0 },
  north:     { src: 'n',  mirror: false, scaleMult: 1.0 },
  northwest: { src: 'nw', mirror: false, scaleMult: 1.0 },
  west:      { src: 'w',  mirror: false, scaleMult: 1.0 },
  southwest: { src: 'se', mirror: false, scaleMult: 0.9 },
};

const walkSheets = {};         // dir -> { frames: Texture[] }
let transformFrames = [];      // Texture[] -- non-directional shred animation
let loadPromise = null;

async function loadStrip(url, into, key) {
  try {
    const tex = await Assets.load(url);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    into[key] = { frames };
  } catch {
    /* missing strip — caller falls back to the next-best path */
  }
}

async function loadTransformStrip() {
  try {
    const tex = await Assets.load(`/sprites/monsters/mummy/transform.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    for (let i = 0; i < count; i++) {
      transformFrames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
  } catch { /* missing — renderer skips the transform anim */ }
}

export function loadMummySprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const d of WALK_DIRS) {
    tasks.push(loadStrip(`/sprites/monsters/mummy/walk-${d}.png?v=${SPRITE_VERSION}`, walkSheets, d));
  }
  tasks.push(loadTransformStrip());
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

function lookup(map, sheets, facing, frameIdx) {
  const m = map[facing] || map.south;
  let sheet = sheets[m.src];
  let mirror = m.mirror;
  const scaleMult = (m.scaleMult != null) ? m.scaleMult : 1;
  if (!sheet || sheet.frames.length === 0) {
    const south = sheets['s'];
    if (south && south.frames.length) {
      sheet = south;
      mirror = false;
    } else {
      for (const key of Object.keys(sheets)) {
        if (sheets[key].frames.length > 0) { sheet = sheets[key]; mirror = false; break; }
      }
    }
  }
  if (!sheet || sheet.frames.length === 0) return null;
  const len = sheet.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: sheet.frames[idx], mirror, scaleMult };
}

function countOf(map, sheets, facing) {
  const m = map[facing] || map.south;
  const sheet = sheets[m.src];
  return (sheet && sheet.frames.length) || 0;
}

export function getFrame(facing, frameIdx) {
  return lookup(WALK_MAP, walkSheets, facing, frameIdx);
}

export function frameCount(facing) {
  return countOf(WALK_MAP, walkSheets, facing);
}

export function hasFrames() {
  return Object.keys(walkSheets).length > 0;
}

/* Transform animation -- non-directional, plays once at the trigger
   moment clamped to the last frame so the camera lands on the fully
   skeletal pose before the skeleton walk loop takes over. */
export function getTransformFrame(frameIdx) {
  if (transformFrames.length === 0) return null;
  const idx = Math.max(0, Math.min(transformFrames.length - 1, frameIdx));
  return transformFrames[idx];
}

export function transformFrameCount() {
  return transformFrames.length;
}

export function hasTransformFrames() {
  return transformFrames.length > 0;
}
