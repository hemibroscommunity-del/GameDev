/* Skeleton variant sprite loader -- the post-transform form of the
 * mummy.  Skeletons appear at runtime when a mummy's HP drops below
 * its transform threshold (see MONSTER_VARIANTS.mummy.transformAt).
 *
 * Directional run strips (per-facing strip of 8 x 256 px frames):
 *   run-{s,w,nw,n,sw}.png  -- 5 source directions
 *
 * The user-uploaded set covers the LEFT half of the compass; right
 * facings (e, ne, se) are produced by mirror=true off the left-side
 * art at lookup time.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 256;
const FRAME_H = 256;
const SPRITE_VERSION = '2.3.60';

const RUN_DIRS = ['s', 'w', 'nw', 'n', 'sw'];
const DEATH_FRAMES_EXPECTED = 16;

/* Run set covers s / w / nw / n / sw -- mirror w for e, nw for ne,
   sw for se. */
const RUN_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'w',  mirror: false },
  northwest: { src: 'nw', mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'nw', mirror: true  },
  east:      { src: 'w',  mirror: true  },
  southeast: { src: 'sw', mirror: true  },
};

const runSheets = {};
let deathFrames = [];      // Texture[] -- non-directional crumble + bone pile
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
  } catch { /* missing strip -- caller falls back */ }
}

async function loadDeathStrip() {
  try {
    const tex = await Assets.load(`/sprites/monsters/skeleton/death.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    for (let i = 0; i < count; i++) {
      deathFrames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
  } catch { /* missing -- renderer falls back to no death anim */ }
}

export function loadSkeletonSprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const d of RUN_DIRS) {
    tasks.push(loadStrip(`/sprites/monsters/skeleton/run-${d}.png?v=${SPRITE_VERSION}`, runSheets, d));
  }
  tasks.push(loadDeathStrip());
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

function lookup(map, sheets, facing, frameIdx) {
  const m = map[facing] || map.south;
  let sheet = sheets[m.src];
  let mirror = m.mirror;
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
  return { tex: sheet.frames[idx], mirror };
}

function countOf(map, sheets, facing) {
  const m = map[facing] || map.south;
  const sheet = sheets[m.src];
  return (sheet && sheet.frames.length) || 0;
}

export function getFrame(facing, frameIdx) {
  return lookup(RUN_MAP, runSheets, facing, frameIdx);
}

export function frameCount(facing) {
  return countOf(RUN_MAP, runSheets, facing);
}

export function hasFrames() {
  return Object.keys(runSheets).length > 0;
}

/* Death animation -- non-directional, plays once clamped to last
   frame so the bone pile settles on the ground. */
export function getDeathFrame(frameIdx) {
  if (deathFrames.length === 0) return null;
  const idx = Math.max(0, Math.min(deathFrames.length - 1, frameIdx));
  return deathFrames[idx];
}

export function deathFrameCount() {
  return deathFrames.length;
}

export function hasDeathFrames() {
  return deathFrames.length > 0;
}
