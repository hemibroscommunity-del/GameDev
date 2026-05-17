/* Fire-goblin monster sprite loader for the Pixi renderer.
 *
 * 8-direction walk-cycle, sourced from 4 PNG strips
 * (/sprites/monsters/fire-goblin/walk-{s|sw|e|n}.png).  Each strip is
 * 8 frames × 256 px square.  The missing 4 facings reuse a source
 * texture with mirror=true or pick the closest available pose:
 *   west       -> sw (already side-on, no mirror)
 *   northwest  -> n  (back-facing, closest available)
 *   southeast  -> s  (front-facing, closest available)
 *   northeast  -> e  (per user spec, walk-e doubles)
 *
 * Lookup: getFrame('south', frameIdx) -> { tex, mirror } or null until
 * the source PNG resolves.  entityRenderer falls back to the
 * procedural archetype circle while the load is in flight.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 256;
const FRAME_H = 256;

/* Bump on every sprite-art change so Cloudflare Pages' edge cache
   serves the new PNG instead of the old one. */
const SPRITE_VERSION = '2.2.0';

const SOURCE_DIRS = ['s', 'sw', 'e', 'n'];

/* 8-facing -> (sourceDir, mirror) map.  Only 4 source PNGs exist;
   missing facings pick the visually closest pose. */
const DIR_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'sw', mirror: false },
  northwest: { src: 'n',  mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'e',  mirror: false },
  east:      { src: 'e',  mirror: false },
  southeast: { src: 's',  mirror: false },
};

const SHEETS = {};   // sourceDir -> { frames: Texture[] }
let loadPromise = null;

async function loadOne(dir) {
  try {
    const tex = await Assets.load(`/sprites/monsters/fire-goblin/walk-${dir}.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    SHEETS[dir] = { frames };
  } catch {
    /* missing strip — caller falls back to procedural circle */
  }
}

export function loadFireGoblinSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(SOURCE_DIRS.map(loadOne));
  return loadPromise;
}

/* Resolve a facing + frame index to the texture + mirror flag.  Frame
   index wraps modulo the strip's frame count. */
export function getFrame(facing, frameIdx) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = SHEETS[m.src];
  if (!sheet || sheet.frames.length === 0) return null;
  const len = sheet.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: sheet.frames[idx], mirror: m.mirror };
}

export function frameCount(facing) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = SHEETS[m.src];
  return (sheet && sheet.frames.length) || 0;
}

export function hasFrames() {
  return Object.keys(SHEETS).length > 0;
}
