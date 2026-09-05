/* ═══ v2.3.2272: ZONE ART HAS TO BE ABLE TO GO AWAY AGAIN ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."
 *
 * ── WHAT WAS MEASURED, BEFORE ANY OF THIS WAS WRITTEN ──
 * mp-perfdrift looked in the SCENE and found nothing: over a minute of held-
 * attack combat the node count sat flat at ~310.  mp-texdrift then asked what
 * the client still HOLDS after you walk away, sampling resident decoded
 * texture (window.__btTex) at the worldview hub between legs of a tour:
 *
 *     hub 382.5MB -> ember -> 413 -> sky -> 449.2 -> frost -> 468.8 -> verdant
 *     -> 474.4MB.  Same hub, same art on screen, +92MB.
 *
 * Monotone, and never released.  The ~6MB dip on each return is the ONE thing
 * v2.3.1405 frees, the zone map -- which is also the control that says the
 * instrument can see a release when one happens.
 *
 * ── WHY THE REST WAS NEVER FREED ──
 * Not an oversight in one place; there was nowhere to put it.  Every monster
 * sprite module keeps its strips in module-scope closures behind a memoised
 * `loadPromise`, and none of them has ever had an unload, so once a zone has
 * been visited its art is resident for the life of the page.  Decoded, that is
 * not small: measured off the PNG headers, fire-goblin is 60.5MB of RGBA
 * (1.9MB as PNG on disk -- which is why file sizes never made this look like a
 * problem), mummy 22.0, snowman 17.5, skeleton 14.2.
 *
 * ── WHY A TRACKER RATHER THAN SIX HAND-WRITTEN URL LISTS ──
 * An unload that re-derives the loader's URLs is a drift hazard: the day
 * someone adds a sheet or bumps a SPRITE_VERSION, the unload silently stops
 * matching and leaks again with no symptom.  So the URL list is not written
 * twice -- `loadTracked` IS the load call, and it records what it loaded.  A
 * sheet that is loaded is a sheet that can be freed, by construction.
 *
 * Bundles, not variant keys: thornShambler and rockmonster share one loader
 * (as do bogLurker and fishman), so freeing by key would tear the art out from
 * under a variant that is still in the zone you just walked into.
 *
 * ── THIS DOES NOT WEAKEN THE PRELOADING LAW ──
 * CLAUDE.md's law forbids LAZY loads -- art that arrives mid-play and hitches.
 * Everything freed here is re-loaded by `preloadZoneAssets`, awaited behind the
 * per-zone loading overlay, which is the ZONE-ASSET EXCEPTION the same law
 * already carves out and exactly the trade v2.3.1405 made for the map.  What
 * changes is the steady state: "the zone you are standing in" instead of
 * "everywhere you have been".
 */
import { Assets } from 'pixi.js';

/* bundle name -> the set of URLs loaded under it.  A Set, so a re-entered zone
   re-registering the same sheet costs one entry rather than a growing list. */
const _bundles = new Map();

/** Load a texture and remember which bundle it belongs to.  Drop-in for
 *  `Assets.load(url)` -- same promise, same value, same caching (Assets is
 *  still the cache; this only records the key so it can be handed back). */
export function loadTracked(bundle, url) {
  let set = _bundles.get(bundle);
  if (!set) { set = new Set(); _bundles.set(bundle, set); }
  set.add(url);
  return Assets.load(url);
}

/** Release every URL a bundle loaded.  Resolves to how many were released, so
 *  a caller (and mp-texdrift) can tell "freed nothing" from "was never loaded".
 *  Each unload is guarded on its own: one URL that is still referenced must not
 *  abandon the rest of the bundle. */
export async function unloadBundle(bundle) {
  const set = _bundles.get(bundle);
  if (!set || set.size === 0) return 0;
  _bundles.delete(bundle);
  let n = 0;
  for (const url of set) {
    try { await Assets.unload(url); n++; } catch (e) { /* still in use / already gone */ }
  }
  return n;
}

/** Whether a bundle currently holds anything -- used by the zone-exit sweep to
 *  skip work rather than to decide correctness. */
export function bundleLoaded(bundle) {
  const set = _bundles.get(bundle);
  return !!(set && set.size);
}

/* Dev probe, house style: which bundles are resident and how many URLs each
   holds.  mp-texdrift reads this to say WHICH art a climb is made of, which a
   total in megabytes cannot. */
if (typeof window !== 'undefined') {
  window.__btBundles = function () {
    const out = {};
    _bundles.forEach((set, k) => { out[k] = set.size; });
    return out;
  };
}
