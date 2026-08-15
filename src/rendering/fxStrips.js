/* ═══ v2.3.1735: SHARED FX STRIPS (owner art) ═══
 *
 * A LEAF module: it imports pixi and nothing else in this repo, so both
 * renderers can use it without a cycle.  That is the whole reason it exists —
 * effectsRenderer already imports entityRenderer, so the strips could not
 * live in effectsRenderer and still be drawn by entityRenderer.
 *
 *   STUN_STARS   — the ring of stars over a stunned monster's head.  Drawn by
 *                  entityRenderer, in the monster's own container, REPLACING
 *                  the procedural three-star orbit that has been there since
 *                  the stun existed.  It replaces rather than joins it: two
 *                  star rings on one monster is what the first cut of this
 *                  shipped, and it read as a bug.
 *   WHIRL_VORTEX — the spiral under a Whirlwind cast.  Drawn by
 *                  effectsRenderer on the world overlay.
 *
 * PRELOADING IS LAW (CLAUDE.md, owner directive 2026-07-19): every animation
 * must be fully loaded before the intro overlay lifts, and a NEW animation
 * system must register its loader in the central manifest in the same PR.
 * `fxStripsReady()` is that registration — preloadWorldAnimations awaits it
 * (preloadAnimations.js).  These are two small global sheets, not per-zone
 * art, so they belong in the global manifest and not preloadZoneAssets.
 *
 * Both are 8 equal cells in one row, the contract EFFECT_BURSTS uses.  Owner
 * sheets are normalised to 2048x256 by tools/import_fx_sheet.mjs.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';

export const STUN_STARS = { frames: [], url: '/sprites/fx/stun-stars-v1.png?v=2.3.1735' };
export const WHIRL_VORTEX = { frames: [], url: '/sprites/fx/whirl-vortex-v1.png?v=2.3.1735' };

/* One full turn of the star ring.  Slow enough to read as a daze rather than
   a strobe; matches the 700ms period of the procedural orbit it replaces so
   the feel does not change, only the art. */
export const STUN_SPIN_MS = 700;
export const WHIRL_FX_MS = 520;

const _pending = [];
for (const cfg of [STUN_STARS, WHIRL_VORTEX]) {
  const p = Assets.load(cfg.url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 8);
    for (let i = 0; i < 8; i++) {
      cfg.frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, tex.source.height),
      }));
    }
  }).catch((err) => console.warn('[fx-strips] load failed', cfg.url, err));
  _pending.push(p);
}

/* Awaited by the central manifest.  allSettled, not all: a missing sheet must
   degrade to the procedural fallback, never block the loading screen. */
export function fxStripsReady() { return Promise.allSettled(_pending); }
