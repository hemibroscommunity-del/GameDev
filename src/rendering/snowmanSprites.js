/* Snowman monster sprite loader for the Pixi renderer.
 *
 * 8-direction static sprites — one PNG per direction at 128×128 with
 * alpha.  5 source PNGs (south, southwest, east, north, northeast);
 * the remaining 3 (west, northwest, southeast) are mirrors rendered by
 * flipping scale.x at draw time.  Same convention as playerSprites.
 *
 * Lookup: getFrame('south') -> { tex, mirror }.  Returns null until
 * the file resolves; entityRenderer falls back to the procedural
 * archetype circle while the load is in flight.
 */

import { Assets } from 'pixi.js';

const SOURCE_DIRS = ['south', 'southwest', 'east', 'north', 'northeast'];

/* Map every 8-cardinal facing to a (sourceDir, mirror) pair.  Mirror
   directions reuse the source texture with scale.x = -baseScale. */
const DIR_MAP = {
  south:     { src: 'south',     mirror: false },
  southwest: { src: 'southwest', mirror: false },
  west:      { src: 'east',      mirror: true  },
  northwest: { src: 'northeast', mirror: true  },
  north:     { src: 'north',     mirror: false },
  northeast: { src: 'northeast', mirror: false },
  east:      { src: 'east',      mirror: false },
  southeast: { src: 'southwest', mirror: true  },
};

const TEXTURES = {};
let loadPromise = null;

async function loadOne(dir) {
  try {
    const tex = await Assets.load(`/sprites/monsters/snowman/snowman-${dirShort(dir)}.png`);
    if (tex) TEXTURES[dir] = tex;
  } catch {
    /* missing sheet — caller falls back to procedural circle */
  }
}

/* Match the on-disk filename convention (snowman-s.png, snowman-sw.png, ...). */
function dirShort(dir) {
  return ({ south: 's', southwest: 'sw', east: 'e', north: 'n', northeast: 'ne' })[dir];
}

export function loadSnowmanSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(SOURCE_DIRS.map(loadOne));
  return loadPromise;
}

/* Resolve a facing string to the texture + mirror flag for that
   direction.  Returns null if the corresponding source sheet hasn't
   loaded yet. */
export function getFrame(facing) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const tex = TEXTURES[m.src];
  if (!tex) return null;
  return { tex, mirror: m.mirror };
}

export function hasFrames() {
  return Object.keys(TEXTURES).length > 0;
}
