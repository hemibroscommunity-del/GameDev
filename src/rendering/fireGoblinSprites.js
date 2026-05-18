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
 *   fireball.png   — single 256 px frame, the projectile the goblin
 *                    shoots.  Sprite is drawn pointing southwest
 *                    (atan2 angle ~ 3π/4), so the renderer should set
 *                    sprite.rotation = projectile.ang - FIREBALL_BASE_ANG
 *                    to make it nose in the direction of flight.
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
const SPRITE_VERSION = '2.3.26';

/* The fireball is drawn pointing southwest (nose at lower-left).
   atan2(dy, dx) where down is +y gives 3π/4 for that direction.
   Renderers subtract this from the projectile's flight angle to land
   on the right Pixi rotation value. */
export const FIREBALL_BASE_ANG = Math.PI * 0.75;

const WALK_DIRS = ['s', 'sw', 'e', 'n'];
const ATTACK_DIRS = ['s', 'sw', 'w', 'nw', 'n'];
const HIT_DIRS = ['s', 'sw', 'nw', 'n'];

/* WALK: 4 source files but the names are misleading -- per user
   v2.3.5 review, the actual poses are:
     walk-sw.png -- pure side profile facing west (NOT southwest)
     walk-e.png  -- 3/4 view facing southwest (NOT east)
     walk-n.png  -- back
     walk-s.png  -- front
   So the proper map uses 'sw' for W/NW (side profile) and 'e' for
   SW (3/4 view), with east-side facings produced by mirroring. */
const WALK_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'e',  mirror: false },
  west:      { src: 'sw', mirror: false },
  northwest: { src: 'sw', mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'sw', mirror: true  },
  east:      { src: 'sw', mirror: true  },
  southeast: { src: 'e',  mirror: true  },
};

/* ATTACK: 5 source files, labels shifted two positions on the west
   side relative to actual direction (per user v2.3.24 review):
     NW slot uses attack-n  (the file misnamed 'n' for that pose)
     W  slot uses attack-sw
     SW slot uses attack-w
   East-side facings are produced by mirroring. */
const ATTACK_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'w',  mirror: false },
  west:      { src: 'sw', mirror: false },
  northwest: { src: 'n',  mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'n',  mirror: true  },
  east:      { src: 'sw', mirror: true  },
  southeast: { src: 'w',  mirror: true  },
};

/* HIT: 4 source files.  SW and NW use the naturally-named file
   (per user v2.3.24 review — the earlier v2.3.6 swap was reverted
   when the SW/NW source art was redrawn).  W still doubles up with
   NW art; east-side facings are produced by mirroring. */
const HIT_MAP = {
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'nw', mirror: false },
  northwest: { src: 'nw', mirror: false },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'nw', mirror: true  },
  east:      { src: 'nw', mirror: true  },
  southeast: { src: 'sw', mirror: true  },
};

const walkSheets = {};   // dir -> { frames: Texture[] }
const attackSheets = {}; // dir -> { frames: Texture[] }
const hitSheets = {};    // dir -> { frames: Texture[] }
let deathFrames = [];    // Texture[] — non-directional, plays once
let remnantsTex = null;  // single-frame texture for the loot drop
let fireballTex = null;  // single-frame texture for the projectile
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
  tasks.push(loadFireball());
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

async function loadFireball() {
  try {
    const tex = await Assets.load(`/sprites/monsters/fire-goblin/fireball.png?v=${SPRITE_VERSION}`);
    if (tex && tex.source) fireballTex = tex;
  } catch { /* missing — caller falls back to slime orb */ }
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
  let sheet = sheets[m.src];
  let mirror = m.mirror;
  /* Fallback: if the requested facing's sheet hasn't resolved yet,
     reach for the next-best loaded sheet so the renderer doesn't fall
     to the procedural-body branch mid-load (visible as a per-frame
     flicker between the goblin and an empty/circle on the first 200 ms
     after entry).  Preference order: requested sheet -> south ->
     anything loaded. */
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

/* Single-frame fireball projectile texture.  See FIREBALL_BASE_ANG. */
export function getFireballTexture() {
  return fireballTex;
}
