/* Slime monster sprite-sheet loader for the Pixi renderer.
 *
 * Mirrors the Canvas 2D path in BroTown.jsx (~line 1384):
 *   /sprites/monsters/slime-idle-v5.png   — idle loop
 *   /sprites/monsters/slime-shoot-v2.png  — attack lunge
 *   /sprites/monsters/slime-hit-v1.png    — squash on damage
 *   /sprites/monsters/slime-death-v7.png  — death burst (15 frames, no windup)
 *
 * All sheets are horizontal strips of 128×128 frames.  Frame count is
 * auto-detected from the loaded texture width so we can swap art with
 * different frame counts without touching this file.
 *
 * Animation priority during render: hit > shoot > idle.  Death is a
 * separate one-shot triggered when a fodder slime first observes
 * alive = false (handled by caller).
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 128;
const FRAME_H = 128;

const SHEETS = {
  idle:     { url: '/sprites/monsters/slime-idle-v5.png',     frames: [] },
  shoot:    { url: '/sprites/monsters/slime-shoot-v2.png',    frames: [] },
  hit:      { url: '/sprites/monsters/slime-hit-v1.png',      frames: [] },
  death:    { url: '/sprites/monsters/slime-death-v7.png',    frames: [] },
  /* Single-frame splat that lands on the ground after the death anim
     ends.  Loaded as a 1-frame "sheet" so the same machinery applies. */
  remnants: { url: '/sprites/monsters/slime-remnants-v1.png', frames: [] },
};

let loadPromise = null;

async function loadSheet(state) {
  const entry = SHEETS[state];
  try {
    const tex = await Assets.load(entry.url);
    if (!tex || !tex.source) return;
    /* Frame count = source width / FRAME_W.  v5 idle/death are 24 frames
       (3072×128), v2 shoot ≈ 8 frames (1024×128), v1 hit ≈ 8.  Using the
       texture width lets art swaps just bump the file. */
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    entry.frames = list;
  } catch {
    /* Sheet missing — caller falls back to procedural circle. */
  }
}

/** Kick off all 4 sheet loads.  Idempotent; same promise on repeat
 *  calls.  Caller can `await loadSlimeSprites()` if it cares about
 *  completion (the renderer doesn't — it polls hasState() per frame). */
export function loadSlimeSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(Object.keys(SHEETS).map(loadSheet));
  return loadPromise;
}

/** Pick the frame Texture for (state, frameIdx).  Returns null until the
 *  sheet has loaded — caller falls back to the procedural circle. */
export function getFrame(state, frameIdx) {
  const entry = SHEETS[state];
  if (!entry || entry.frames.length === 0) return null;
  const len = entry.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return entry.frames[idx];
}

/** How many frames are in the loaded sheet for `state`.  0 if not yet
 *  loaded. */
export function frameCount(state) {
  return (SHEETS[state] && SHEETS[state].frames.length) || 0;
}

/** Convenience: true if at least one frame has loaded for this state. */
export function hasState(state) {
  return frameCount(state) > 0;
}
