/* ═══ v2.3.2616: THE STAT-DEMO SCENES' ASSETS, ON THE GATE ═══
 *
 * CLAUDE.md's preloading LAW applied to the explainer scenes.  They are DOM
 * assets (CSS backgrounds and <img>), not Pixi textures, which is exactly the
 * kind of thing a later reader assumes was forgotten — the same case
 * levelUpBurstPreload.js spells out for the level-up burst, and this file
 * follows it deliberately.
 *
 * ═══ THE FINDING THIS FILE EXISTS FOR ═══
 * Most of what a scene draws WAS already warm, by construction rather than by
 * registration: the scenes reuse the slime strips and the projectiles at the
 * world's own URLs, so preloadWorldAnimations' `slime` and `fx` groups answer
 * for them.  That is a good pattern and it is why nothing hitched.
 *
 * Two did not, and were loading on first open:
 *
 *   /icons/popups/shield-defense.webp — nothing else in the client references
 *     this file AT ALL.  effectsRenderer warms seven popup icons
 *     (POPUP_ICON_KEYS) and `shield` is not among them, so the Defense scene's
 *     raised guard has always been fetched the first time somebody opened that
 *     explainer.  Since v2.3.2598 the Stamina scene wants it too.
 *
 *   /icons/ui/hero/crit.webp?v=2.3.1694 — the renderer DOES load crit.webp,
 *     but through _loadPopupIcon, which appends ?v=2.3.2201.  A query string is
 *     part of the cache key, so the renderer's copy does not answer this
 *     request.  It happened to be warm anyway because the Crit stat row draws
 *     its icon at this same URL — i.e. it depended on having scrolled past that
 *     row first.  That is a coincidence, not a guarantee.
 *
 * Both are small (a few KB each); the point is not the bytes, it is that a
 * first-use fetch inside an animation is the regression the law names, and the
 * owner has reported this class of bug personally more than once.
 *
 * decode() rather than onload, and the Images are HELD in a module-level array,
 * for the reasons levelUpBurstPreload.js gives: onload means the bytes arrived,
 * decode() means there is a bitmap to paint, and an unreferenced decoded image
 * is collectable under memory pressure — which would put the fetch back on
 * first use, silently.
 */
import { STAT_DEMO_URLS } from '../data/statDemoAssets.js';

const _held = [];

function warm(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.push(img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* A failed warm must never fail the gate: the intro overlay lifting is
       worth more than an explainer icon, and the <img> falls back to an
       ordinary fetch when the scene actually runs. */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadStatDemo() {
  return Promise.all(STAT_DEMO_URLS.map(warm));
}

/* For rigs: how many warms are actually being held. */
export function statDemoWarmCount() { return _held.length; }
