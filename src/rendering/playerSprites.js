/* Player sprite-sheet loader for the Pixi renderer.
 *
 * Mirrors the data layout that BroTown.jsx populates into
 * `playerSpritesRef.current` for the Canvas 2D path:
 *   - 5 source directions × 3 poses = 15 sheets
 *   - directions: east, north, northeast, south, southwest
 *     (west / northwest / southeast are rendered by horizontal mirror)
 *   - poses: stand (1 frame), jog (24 frames), hit (6 frames)
 *   - each frame is 64×64 inside a horizontal strip
 *
 * The Canvas 2D path uses ctx.drawImage() with sub-rect crop; Pixi
 * needs per-frame Textures.  We load each sheet via Assets, then
 * carve it into N Texture instances pointing at the same source with
 * different frame rectangles.  Lookup is `getFrame(pose, dir, idx)`.
 *
 * `cycleMs(pose, dir)` returns the per-direction animation duration —
 * jog cycles vary by direction (east ~1.0s, south ~2.0s, …) so the
 * walk loop matches the original source-video cadence.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 64;
const FRAME_H = 64;
const JOG_FRAMES = 24;
const HIT_FRAMES = 6;

const JOG_DURATION_MS = {
  east: 1006, north: 2008, northeast: 1503, south: 2000, southwest: 1998,
};
const HIT_DURATION_MS = 250;

const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSES = ['stand', 'jog', 'hit'];

const VERSION = 10; /* matches the cache-buster on the Canvas 2D loader */

/* The loaded manifest:
 *   { stand: { east: [Texture], … }, jog: { east: [Texture×24], … }, hit: { east: [Texture×6], … } }
 * Filled in as load() resolves each sheet.  Lookups before load is
 * complete return null — entityRenderer falls back to procedural
 * Graphics until the manifest populates.
 */
const manifest = {
  stand: {}, jog: {}, hit: {},
};

let loadPromise = null;

function frameCount(pose) {
  if (pose === 'jog') return JOG_FRAMES;
  if (pose === 'hit') return HIT_FRAMES;
  return 1;
}

function spriteUrl(pose, dir) {
  return `/sprites/player/${pose}-${dir}.png?v=${VERSION}`;
}

async function loadSheet(pose, dir) {
  const url = spriteUrl(pose, dir);
  try {
    const tex = await Assets.load(url);
    if (!tex || !tex.source) return;
    const frames = frameCount(pose);
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    manifest[pose][dir] = out;
  } catch {
    /* Sheet missing — leave undefined, caller falls back to procedural. */
  }
}

/** Kick off all 15 sheet loads.  Idempotent; returns the same promise
 *  on subsequent calls so callers can `await loadPlayerSprites()`. */
export function loadPlayerSprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const pose of POSES) {
    for (const dir of SOURCE_DIRS) {
      tasks.push(loadSheet(pose, dir));
    }
  }
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

/** Resolve a `facing` string ('north' | 'south' | 'east' | 'west' |
 *  'northeast' | 'northwest' | 'southeast' | 'southwest') into the
 *  source direction we have a sheet for plus a `mirror` flag for the
 *  three flipped directions.
 */
export function resolveDirection(facing) {
  switch (facing) {
    case 'west':       return { dir: 'east',       mirror: true };
    case 'northwest':  return { dir: 'northeast',  mirror: true };
    case 'southeast':  return { dir: 'southwest',  mirror: true };
    case 'east':       return { dir: 'east',       mirror: false };
    case 'north':      return { dir: 'north',      mirror: false };
    case 'northeast':  return { dir: 'northeast',  mirror: false };
    case 'south':      return { dir: 'south',      mirror: false };
    case 'southwest':  return { dir: 'southwest',  mirror: false };
    default:           return { dir: 'south',      mirror: false };
  }
}

/** Pick the right Texture for (pose, dir, frameIdx).  Returns null if
 *  the sheet hasn't loaded yet — caller should fall back to procedural
 *  rendering for that frame. */
export function getFrame(pose, dir, frameIdx) {
  const set = manifest[pose] && manifest[pose][dir];
  if (!set || set.length === 0) return null;
  const safeIdx = ((frameIdx % set.length) + set.length) % set.length;
  return set[safeIdx];
}

/** How long the full animation cycle takes in ms for the given
 *  (pose, dir).  `stand` is treated as a 1s no-op since it has one
 *  frame.  Used by the renderer to compute frameIdx from `now`. */
export function cycleMs(pose, dir) {
  if (pose === 'jog') return JOG_DURATION_MS[dir] || 2000;
  if (pose === 'hit') return HIT_DURATION_MS;
  return 1000;
}

/** True if at least one sheet for the given pose has loaded.  Cheap
 *  check the renderer can use to gate the sprite path. */
export function hasPose(pose) {
  if (!manifest[pose]) return false;
  for (const dir of SOURCE_DIRS) {
    if (manifest[pose][dir]) return true;
  }
  return false;
}
