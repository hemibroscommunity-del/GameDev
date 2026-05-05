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
/* JOG sheets now have VARIABLE frame counts per direction (north 24,
   south 31, northeast 25, southwest 35, east 24-ish).  Frame count is
   detected from the loaded texture width (sheet width / FRAME_W).
   stand/hit stay fixed since their sheets have known shapes. */
const STAND_FRAMES = 1;
const HIT_FRAMES = 6;

/* Base 1 s jog cycle.  Per-direction overrides reflect the cadence
   the user dialed in: north / south slowed so the legs don't blur,
   northeast / northwest sped up because the new source video runs at
   a slower gait than feels right.  (NW is a horizontal mirror of NE,
   so it shares NE's cycle.) */
const JOG_DURATION_MS = 1000;
const JOG_DURATION_BY_DIR = {
  north: 1400,
  south: 1400,
  northeast: 750,
};
const HIT_DURATION_MS = 250;

const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSES = ['stand', 'jog', 'hit'];

const VERSION = 29; /* matches the cache-buster on the Canvas 2D loader */

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

function spriteUrl(pose, dir) {
  return `/sprites/player/${pose}-${dir}.png?v=${VERSION}`;
}

/* Resolve frame count for a (pose, dir) sheet from the loaded texture
   width when available — jog sheets vary per direction (24-35 frames)
   so we can't hardcode.  Falls back to fixed counts for stand/hit. */
function deriveFrameCount(pose, tex) {
  const width = (tex && tex.source && tex.source.width) || 0;
  if (pose === 'jog') return Math.max(1, Math.floor(width / FRAME_W));
  if (pose === 'hit') return HIT_FRAMES;
  return STAND_FRAMES;
}

async function loadSheet(pose, dir) {
  const url = spriteUrl(pose, dir);
  try {
    const tex = await Assets.load(url);
    if (!tex || !tex.source) return;
    const frames = deriveFrameCount(pose, tex);
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

/** Resolve a `facing` string into a (dir, mirror) for the sprite path.
 *  Accepts both the 4-cardinal values that BroTown's input system
 *  actually emits ('up'/'down'/'left'/'right') AND the 8-direction
 *  compass names if a future caller supplies them.
 */
export function resolveDirection(facing) {
  switch (facing) {
    /* 4-cardinal — what S._facing currently uses. */
    case 'right':      return { dir: 'east',       mirror: false };
    case 'left':       return { dir: 'east',       mirror: true };
    case 'up':         return { dir: 'north',      mirror: false };
    case 'down':       return { dir: 'south',      mirror: false };
    /* 8-compass — for any path that fills in diagonals. */
    case 'east':       return { dir: 'east',       mirror: false };
    case 'west':       return { dir: 'east',       mirror: true };
    case 'north':      return { dir: 'north',      mirror: false };
    case 'south':      return { dir: 'south',      mirror: false };
    case 'northeast':  return { dir: 'northeast',  mirror: false };
    case 'northwest':  return { dir: 'northeast',  mirror: true };
    case 'southwest':  return { dir: 'southwest',  mirror: false };
    case 'southeast':  return { dir: 'southwest',  mirror: true };
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
 *  (pose, dir).  Jog defaults to JOG_DURATION_MS with a per-direction
 *  override map (e.g. northeast plays faster); stand is a 1s
 *  placeholder; hit is 250ms. */
export function cycleMs(pose, dir) {
  if (pose === 'jog') return JOG_DURATION_BY_DIR[dir] || JOG_DURATION_MS;
  if (pose === 'hit') return HIT_DURATION_MS;
  return 1000;
}

/** Frame count for a loaded (pose, dir) sheet.  Renderer uses this
 *  for jog so it can pick frameIdx based on the actual strip length
 *  instead of a hardcoded 24 (sheets are now variable: 24-35). */
export function frameCount(pose, dir) {
  const set = manifest[pose] && manifest[pose][dir];
  return set ? set.length : 0;
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
