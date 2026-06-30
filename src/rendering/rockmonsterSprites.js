/* Rockmonster variant sprite loader for the Deep Hollows brute slot.
 *
 * Source art is a single still pose (no walk cycle), so each
 * directional walk-{dir}.png is one 256x256 frame.  The renderer
 * cycles frame indices but with frameCount=1 it dwells on the only
 * frame -- the boulder translates around the map while always
 * facing in its source orientation.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';
import { loadTextureWebpOrPng } from './webpImage.js'; /* v2.3.1122: WebP w/ PNG fallback */

const FRAME_W = 256;
const FRAME_H = 256;
const SPRITE_VERSION = '2.3.137';

const WALK_DIRS = ['south', 'north', 'east', 'west'];

const WALK_MAP = {
  south:     { src: 'south', mirror: false },
  southeast: { src: 'east',  mirror: false },
  east:      { src: 'east',  mirror: false },
  northeast: { src: 'east',  mirror: false },
  north:     { src: 'north', mirror: false },
  northwest: { src: 'west',  mirror: false },
  west:      { src: 'west',  mirror: false },
  southwest: { src: 'west',  mirror: false },
};

const walkSheets = {};
let loadPromise = null;

async function loadStrip(url, key) {
  try {
    const tex = await loadTextureWebpOrPng(url);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    walkSheets[key] = { frames };
  } catch {
    /* missing strip -- renderer falls back to brute generic */
  }
}

export function loadRockmonsterSprites() {
  if (loadPromise) return loadPromise;
  const tasks = WALK_DIRS.map((d) => loadStrip(`/sprites/monsters/rockmonster/walk-${d}.png?v=${SPRITE_VERSION}`, d));
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

function lookup(facing, frameIdx) {
  const m = WALK_MAP[facing] || WALK_MAP.south;
  let sheet = walkSheets[m.src];
  let mirror = m.mirror;
  if (!sheet || sheet.frames.length === 0) {
    const south = walkSheets.south;
    if (south && south.frames.length) {
      sheet = south;
      mirror = false;
    } else {
      for (const key of Object.keys(walkSheets)) {
        if (walkSheets[key].frames.length > 0) { sheet = walkSheets[key]; mirror = false; break; }
      }
    }
  }
  if (!sheet || sheet.frames.length === 0) return null;
  const len = sheet.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: sheet.frames[idx], mirror, scaleMult: 1 };
}

export function getFrame(facing, frameIdx) {
  return lookup(facing, frameIdx);
}

export function frameCount(facing) {
  const m = WALK_MAP[facing] || WALK_MAP.south;
  const sheet = walkSheets[m.src];
  return (sheet && sheet.frames.length) || 0;
}

export function hasFrames() {
  return Object.keys(walkSheets).length > 0;
}
