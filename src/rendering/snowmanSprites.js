/* Snowman monster sprite loader for the Pixi renderer.
 *
 * 8-direction animated idle loops.  5 source PNGs (south, southwest,
 * east, north, northeast) at /sprites/monsters/snowman/snowman-{s|sw|
 * e|n|ne}.png.  Each is a horizontal strip of 128×128 frames; frame
 * count is auto-detected from the loaded texture width so we can swap
 * art with different counts without touching this file.  The
 * remaining 3 facings (west, northwest, southeast) reuse the
 * corresponding source texture rendered with scale.x = -baseScale.
 *
 * Lookup: getFrame('south', frameIdx) -> { tex, mirror }.  Returns
 * null until the source PNG resolves; entityRenderer falls back to
 * the procedural archetype circle while the load is in flight.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 128;
const FRAME_H = 128;

/* Bump on every sprite-art change.  Browsers (and Cloudflare Pages'
   edge cache) hold the previous PNG by URL, so swapping bytes alone
   isn't enough — the URL has to change.  Append as ?v=… so the file
   on disk keeps its pretty name. */
const SPRITE_VERSION = '2.1.13';

const SOURCE_DIRS = ['south', 'southwest', 'east', 'north', 'northeast'];

/* Map every 8-cardinal facing to a (sourceDir, mirror) pair. */
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

const SHEETS = {};   // sourceDir -> { frames: Texture[] }
/* Single-frame death-scene sprite — what's left on the ground after a
   snowman is killed.  Held as a bare Texture, not a sheet, because
   it never animates. */
let remnantsTex = null;
/* Non-directional hit-reaction sheet — same recoil regardless of
   facing.  Frame count auto-detected from texture width. */
let hitFrames = [];
/* Non-directional death sheet — body shatters, then debris scatters.
   Source mp4 is 5.77 s; sampled to 12 frames so the strip plays in
   ~500 ms at 42 ms/frame (caller-controlled via SNOWMAN_DEATH_MS in
   the renderer). */
let deathFrames = [];
let loadPromise = null;

function dirShort(dir) {
  return ({ south: 's', southwest: 'sw', east: 'e', north: 'n', northeast: 'ne' })[dir];
}

async function loadOne(dir) {
  try {
    const tex = await Assets.load(`/sprites/monsters/snowman/snowman-${dirShort(dir)}.png?v=${SPRITE_VERSION}`);
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

async function loadRemnants() {
  try {
    const tex = await Assets.load(`/sprites/monsters/snowman-remnants.png?v=${SPRITE_VERSION}`);
    if (tex && tex.source) remnantsTex = tex;
  } catch {
    /* missing — caller falls back to procedural coin pile */
  }
}

async function loadStrip(url, into) {
  try {
    const tex = await Assets.load(url);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    into.push(...list);
  } catch {
    /* missing — caller skips and falls back to idle */
  }
}

async function loadHit() {
  await loadStrip(`/sprites/monsters/snowman-hit.png?v=${SPRITE_VERSION}`, hitFrames);
}

async function loadDeath() {
  await loadStrip(`/sprites/monsters/snowman-death.png?v=${SPRITE_VERSION}`, deathFrames);
}

export function loadSnowmanSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([...SOURCE_DIRS.map(loadOne), loadRemnants(), loadHit(), loadDeath()]);
  return loadPromise;
}

/** Single-frame death-scene texture, or null until loaded. */
export function getRemnantsTexture() {
  return remnantsTex;
}

/** Hit-reaction frame at the given index (wraps modulo length).  Null
 *  until the hit sheet has loaded. */
export function getHitFrame(frameIdx) {
  if (hitFrames.length === 0) return null;
  const len = hitFrames.length;
  const idx = ((frameIdx % len) + len) % len;
  return hitFrames[idx];
}

export function hitFrameCount() {
  return hitFrames.length;
}

/** Death-anim frame at the given index (clamped to last frame; death
 *  is a one-shot, not a loop).  Null until the sheet has loaded. */
export function getDeathFrame(frameIdx) {
  if (deathFrames.length === 0) return null;
  const idx = Math.max(0, Math.min(deathFrames.length - 1, frameIdx));
  return deathFrames[idx];
}

export function deathFrameCount() {
  return deathFrames.length;
}

/* Resolve a facing + frame index to the texture + mirror flag.  Frame
   index wraps modulo the strip's frame count, so callers can pass an
   ever-incrementing counter without bounds checking. */
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
