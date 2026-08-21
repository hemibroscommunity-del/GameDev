/* Slime monster sprite-sheet loader for the Pixi renderer.
 *
 * Mirrors the Canvas 2D path in BroTown.jsx (~line 1384):
 *   /sprites/monsters/slime-idle-v5.png       — idle loop
 *   /sprites/monsters/slime-shoot-v2.png      — attack lunge
 *   /sprites/monsters/slime-hit-v1.png        — squash on damage
 *   /sprites/monsters/slime-death-v10.png     — death burst (15 frames, strict-keyed)
 *   /sprites/monsters/slime-projectile-v1.png — single-frame ranged orb
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

/* ═══ v2.3.1824: WHERE THE BLOB ACTUALLY SITS IN ITS CELL ═══
 *
 * Owner: "the hitbox for the slime is way off.  All hitboxes need to be
 * based on where the actual base of where the sprite is shown in the game.
 * It's hard to see here but it's the red circle around the 6G coins."
 *
 * The slime is drawn in a 128px cell that it does not fill: on the live
 * sheets the blob's lowest opaque row is 86, so there are 41 empty rows
 * UNDER it.  The sprite was anchored at the frame's bottom, which put the
 * blob's visible base 34 world px ABOVE the monster's own position — and
 * everything keyed to that position (the loot pile in the owner's
 * screenshot, the hit tests, the tap-to-lock circle) landed that far below
 * the slime you can see.
 *
 * v2.3.1704 met the same geometry from the other side — the ground shadow
 * was sitting in the road under the blob — and answered it by deleting the
 * shadow, which fixed the shadow and left everything else misaligned.  This
 * is the fix that one declined: anchor the sprite at the row the artwork
 * actually rests on, so the monster's position IS the base of what you see
 * and every consumer is right for free.
 *
 * MEASURED, not eyeballed — the numbers are the per-frame alpha bounds of
 * the shipped sheets, and slimeAnchor.test.mjs re-measures them so a
 * re-exported sheet fails loudly instead of quietly sliding the hitbox back.
 * Death is on its OWN baseline (the splat spreads to row ~108) and gets its
 * own number; sharing one would drop the splat 24px through the floor. */
export const SLIME_BASE_ROW = {
  idle: 86,
  shoot: 86,
  hit: 87,
  death: 108,
};
/** The blob's HIGHEST row across the idle loop's bounce — what the HP bar
 *  and level text have to clear. */
export const SLIME_TOP_ROW = 29;
/** Frame cell size, so consumers can turn the rows above into a fraction. */
export const SLIME_FRAME_PX = FRAME_H;

const SHEETS = {
  idle:       { url: '/sprites/monsters/slime-idle-v5.png',       frames: [] },
  shoot:      { url: '/sprites/monsters/slime-shoot-v2.png',      frames: [] },
  hit:        { url: '/sprites/monsters/slime-hit-v1.png',        frames: [] },
  death:      { url: '/sprites/monsters/slime-death-v10.png',     frames: [] },
  /* Single-frame splat that lands on the ground after the death anim
     ends.  Loaded as a 1-frame "sheet" so the same machinery applies. */
  remnants:   { url: '/sprites/monsters/slime-remnants-v1.png',   frames: [] },
  /* Single-frame slime orb thrown by fodder slimes — drawn at the
     projectile's render position with a small scale so it reads as a
     visible incoming attack. */
  projectile: { url: '/sprites/monsters/slime-projectile-v1.png', frames: [] },
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
