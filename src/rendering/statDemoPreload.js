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
import { STAT_DEMO_URLS, SLIME, setBlueSlimeSheets } from '../data/statDemoAssets.js';
import { retintToCanvas } from './monsterRecolor.js';          /* v2.3.2979 */
import { MONSTER_VARIANTS } from '../data/monsterVariants.js';  /* v2.3.2979 */

const _held = [];

/* ═══ v2.3.2979: THE BLUE SLIME, BAKED ON THE GATE ═══
   Resist's scene is the blue slime's death burst (statDemoAssets.js says
   why).  The world draws that slime by retinting the green sheets into Pixi
   textures; the scene is DOM, so it needs the same retint as image URLs.
   Same function, same colour (the variant's own `recolor`), so the scene's
   slime is the world's slime -- and done HERE, on the loading screen, because
   an asset known at load time that is built on first open of a window is the
   first-use hitch the preloading law names.  Two strips (idle for the swell,
   death for the burst), encoded once and kept for the session; a failure
   leaves the scene on the green sheets and never fails the gate. */
/* ═══ v2.3.4431: ONCE A PAGE, NOT ONCE A JOIN ═══
   Back to the menu and joining again runs the loading screen again, and this
   baked the two strips again under new blob URLs (the old ones never
   revoked) and held another set of warmed <img>s: about 2.4 MB a rejoin,
   for the page (state-machine sweep VC-2, R5-9).  Now a bake that worked is
   kept (`_blueBaked`), and a URL already warmed is not warmed again (`_warm`,
   its promise).  A bake or warm that FAILED is still tried by the next
   loading screen, as before. */
let _blueBaked = null, _blueBaking = null;
const _warm = new Map();   /* url -> the promise of its held <img> (a failed one is dropped) */
function bakeBlueSlime() {
  if (_blueBaked) return _blueBaked;
  if (_blueBaking) return _blueBaking;   /* (two loading screens at once: one bake) */
  const v = MONSTER_VARIANTS && MONSTER_VARIANTS.blueSlime;
  const rgb = v && v.recolor;
  if (!rgb || typeof document === 'undefined') return Promise.resolve(null);
  const one = (state) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = retintToCanvas(img, rgb);
        if (!cv.toBlob) { resolve(null); return; }
        cv.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = SLIME[state].url;
  });
  _blueBaking = Promise.all([one('idle'), one('death')]).then(([idle, death]) => {
    _blueBaking = null;
    if (!idle || !death) {
      /* v2.3.4431: half a bake is let go of (it is made again next time) */
      for (const u of [idle, death]) if (u) { try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } }
      return null;
    }
    setBlueSlimeSheets({ idle, death });
    /* ...and decoded and held like every other scene asset, so the first
       swell paints a bitmap that is already there */
    const p = Promise.all([warm(idle), warm(death)]);
    _blueBaked = p;   /* v2.3.4431: kept for the page (above) */
    return p;
  });
  return _blueBaking;
}

function warm(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  if (_warm.has(url)) return _warm.get(url);   /* v2.3.4431: warmed already */
  const p = new Promise((resolve) => {
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
    img.onerror = () => { _warm.delete(url); resolve(null); };
    img.src = url;
  });
  _warm.set(url, p);
  return p;
}

export function preloadStatDemo() {
  return Promise.all([...STAT_DEMO_URLS.map(warm), bakeBlueSlime()]);
}

/* For rigs: how many warms are actually being held. */
export function statDemoWarmCount() { return _held.length; }
