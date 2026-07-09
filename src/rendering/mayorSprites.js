/* Mayor Bro NPC sprite loader for the Pixi renderer (v2.3.1218).
 *
 * Mayor Bro is a stationary town quest-giver, so unlike the monsters he
 * needs only ONE facing: a front (south) idle loop.  The art is a single
 * horizontal strip of 128×128 frames at /sprites/npcs/mayor/mayor-s.png,
 * keyed + stitched from the owner's 4×3 grid (white bg flood-filled to
 * transparent, cells laid out row-major).  Frame count
 * is auto-detected from the loaded texture width, so the art can be
 * re-baked with a different frame count without touching this file.
 *
 * Lookup: getMayorFrame(idx) -> { tex } (index wraps modulo the frame
 * count).  Returns null until the PNG resolves — entityRenderer._updateNPCs
 * falls back to the 🎩 emoji + circle while the load is in flight, and if
 * the sheet is absent entirely (not yet baked) the emoji simply stays.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

/* Native cell size of the baked strip (mayor-s.png is a 12-frame 128px
   idle, keyed from the owner's 4×3 grid).  Matches the snowman/slime scale. */
const FRAME_W = 128;
const FRAME_H = 128;

/* Bump on every sprite-art re-bake.  Cloudflare Pages' edge cache holds the
   previous PNG by URL, so swapping bytes alone isn't enough — the ?v=… has
   to change while the file keeps its name. */
export const SPRITE_VERSION = '1.0.0';

let frames = [];
let loadPromise = null;

export function loadMayorSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const tex = await Assets.load(`/sprites/npcs/mayor/mayor-s.png?v=${SPRITE_VERSION}`);
      if (!tex || !tex.source) return;
      const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
        }));
      }
      frames = list;
    } catch {
      /* sheet not baked yet / missing — caller keeps the emoji fallback */
    }
  })();
  return loadPromise;
}

/* Idle frame at the given index, wrapping modulo the strip length so the
   caller can pass an ever-incrementing counter.  Null until loaded. */
export function getMayorFrame(frameIdx) {
  if (frames.length === 0) return null;
  const len = frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: frames[idx] };
}

export function mayorFrameCount() {
  return frames.length;
}

export function hasMayorFrames() {
  return frames.length > 0;
}

/* Logical frame size, so the renderer can scale target-px / FRAME_W the
   same way it does for monster variants (liveScalePx / 256). */
export const MAYOR_FRAME_SIZE = FRAME_W;
