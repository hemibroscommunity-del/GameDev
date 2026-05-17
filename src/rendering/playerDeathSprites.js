/* Player death sprite-sheet loader.
 *
 * Single-state, horizontal strip:
 *   /sprites/players/death-v1.png — 21 frames at 128x128
 *
 * Frame count auto-detected from the loaded texture so art swaps that
 * change the count don't need a code change.
 *
 * Playback: caller computes elapsed ms since death and asks for the
 * frame by index.  Once past the last frame, getFrame() clamps to the
 * final frame (the pile-of-bones rest pose), which is what we want
 * until the player respawns.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME_W = 128;
const FRAME_H = 128;
const URL = '/sprites/players/death-v1.png';
/* Tuned so the full 21-frame anim plays over ~3.15 s — long enough
   to read as a real death transformation, short enough that the
   5 s server-monster respawn window has the pile-of-bones rest
   frame visible for ~2 s before teleport. */
export const DEATH_FRAME_MS = 150;

const state = {
  frames: [],
  loadPromise: null,
};

export function loadPlayerDeathSprites() {
  if (state.loadPromise) return state.loadPromise;
  state.loadPromise = Assets.load(URL).then((tex) => {
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    state.frames = list;
  }).catch(() => { /* falls back to procedural death visual */ });
  return state.loadPromise;
}

export function getDeathFrame(frameIdx) {
  if (state.frames.length === 0) return null;
  const len = state.frames.length;
  const i = Math.max(0, Math.min(len - 1, Math.floor(frameIdx)));
  return state.frames[i];
}

export function deathFrameCount() {
  return state.frames.length;
}

export function hasDeathSprites() {
  return state.frames.length > 0;
}

/* Convenience: convert ms-since-death to a frame index, clamping to
   the final frame so the corpse rests after the anim plays through. */
export function frameForElapsed(elapsedMs) {
  const len = state.frames.length;
  if (len === 0) return 0;
  return Math.max(0, Math.min(len - 1, Math.floor(elapsedMs / DEATH_FRAME_MS)));
}
