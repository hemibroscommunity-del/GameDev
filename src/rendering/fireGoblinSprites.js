/* Fire-goblin monster sprite loader for the Pixi renderer.
 *
 * Directional animations (per-facing strip of 8 × 256 px frames):
 *   walk-{s|sw|e|n}.png        — 4 source directions for the walk loop
 *   attack-{s|sw|w|nw|n}.png   — 5 source directions for the wind-up
 *   hit-{s|sw|nw|n}.png        — 4 source directions for the recoil
 *
 * Non-directional assets:
 *   death.png      — 16 frames × 256 px, plays once on kill
 *   remnants.png   — single 256 px frame, the burnt-stick pile left
 *                    on the ground for the goblin loot drop
 *
 * 8-facing DIR_MAP per directional set; missing facings reuse the
 * closest source with mirror=true where the motion flips cleanly, or
 * fall through to the nearest pose where mirroring would look wrong.
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
const SPRITE_VERSION = '2.2.4';

const WALK_DIRS = ['s', 'sw', 'e', 'n'];
const ATTACK_DIRS = ['s', 'sw', 'w', 'nw', 'n'];
const HIT_DIRS = ['s', 'sw', 'nw', 'n'];

/* WALK: only 4 source directions (no W / NW art).  Missing facings
   pick the closest available pose; west reuses the side-on sw,
   northwest falls back to the back-facing n. */
const WALK_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'sw', mirror: false },
  northwest: { src: 'n',  mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'e',  mirror: false },
  east:      { src: 'e',  mirror: false },
  southeast: { src: 's',  mirror: false },
};

/* ATTACK: 5 source directions (N / NW / W / SW / S).  East-side
   facings are produced by mirroring their west-side counterparts —
   attack motion flips cleanly so this looks natural. */
const ATTACK_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'w',  mirror: false },
  northwest: { src: 'nw', mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'nw', mirror: true  },
  east:      { src: 'w',  mirror: true  },
  southeast: { src: 'sw', mirror: true  },
};

/* HIT: 4 source directions (N / NW / SW / S).  Per user note the SW
   source is mostly side-on, so it doubles for both SW and W (and
   mirrors for E and SE).  NW mirrors to NE. */
const HIT_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'sw', mirror: false },
  northwest: { src: 'nw', mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'nw', mirror: true  },
  east:      { src: 'sw', mirror: true  },
  southeast: { src: 'sw', mirror: true  },
};

const walkSheets = {};   // dir -> { frames: Texture[] }
const attackSheets = {}; // dir -> { frames: Texture[] }
const hitSheets = {};    // dir -> { frames: Texture[] }
let deathFrames = [];    // Texture[] — non-directional, plays once
let remnantsTex = null;  // single-frame texture for the loot drop
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

export function loadFireGoblinSprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const d of WALK_DIRS) {
    tasks.push(loadStrip(`/sprites/monsters/fire-goblin/walk-${d}.png?v=${SPRITE_VERSION}`, walkSheets, d));
  }
  for (const d of ATTACK_DIRS) {
    tasks.push(loadStrip(`/sprites/monsters/fire-goblin/attack-${d}.png?v=${SPRITE_VERSION}`, attackSheets, d));
  }
  for (const d of HIT_DIRS) {
    tasks.push(loadStrip(`/sprites/monsters/fire-goblin/hit-${d}.png?v=${SPRITE_VERSION}`, hitSheets, d));
  }
  tasks.push(loadDeathStrip());
  tasks.push(loadRemnants());
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

async function loadDeathStrip() {
  try {
    const tex = await Assets.load(`/sprites/monsters/fire-goblin/death.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    for (let i = 0; i < count; i++) {
      deathFrames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
  } catch { /* missing — caller leaves death blank */ }
}

async function loadRemnants() {
  try {
    const tex = await Assets.load(`/sprites/monsters/fire-goblin/remnants.png?v=${SPRITE_VERSION}`);
    if (tex && tex.source) remnantsTex = tex;
  } catch { /* missing — caller falls back to slime remnants */ }
}

function lookup(map, sheets, facing, frameIdx) {
  const m = map[facing] || map.south;
  const sheet = sheets[m.src];
  if (!sheet || sheet.frames.length === 0) return null;
  const len = sheet.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: sheet.frames[idx], mirror: m.mirror };
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

export function getAttackFrame(facing, frameIdx) {
  return lookup(ATTACK_MAP, attackSheets, facing, frameIdx);
}

export function attackFrameCount(facing) {
  return countOf(ATTACK_MAP, attackSheets, facing);
}

export function hasAttackFrames() {
  return Object.keys(attackSheets).length > 0;
}

export function getHitFrame(facing, frameIdx) {
  return lookup(HIT_MAP, hitSheets, facing, frameIdx);
}

export function hitFrameCount(facing) {
  return countOf(HIT_MAP, hitSheets, facing);
}

export function hasHitFrames() {
  return Object.keys(hitSheets).length > 0;
}

/* Death animation — non-directional, plays once clamped to last frame
   so the body settles into the wreckage. */
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

/* Single-frame remnants texture for the loot drop on the ground. */
export function getRemnantsTexture() {
  return remnantsTex;
}
