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
import { Assets, Cache, Rectangle, Texture } from 'pixi.js';
import { packTrimmed } from './gearSheets.js';   /* v2.3.2860: monster strips load cropped */

/* bundle name -> the set of URLs loaded under it.  A Set, so a re-entered zone
   re-registering the same sheet costs one entry rather than a growing list. */
const _bundles = new Map();
/* v2.3.2860: bundle name -> the cropped canvas sources loadTrackedStrip made.
   Not Assets-owned, so Assets.unload cannot free them; unloadBundle does. */
const _crops = new Map();
/* v2.3.2860: bumped by every unload, so a strip still decoding when its zone
   is left is dropped on arrival instead of published into a freed bundle. */
const _gen = new Map();

/** Load a texture and remember which bundle it belongs to.  Drop-in for
 *  `Assets.load(url)` -- same promise, same value, same caching (Assets is
 *  still the cache; this only records the key so it can be handed back). */
export function loadTracked(bundle, url) {
  let set = _bundles.get(bundle);
  if (!set) { set = new Set(); _bundles.set(bundle, set); }
  set.add(url);
  return Assets.load(url);
}

/* ═══ v2.3.2860: MONSTER STRIPS, CROPPED ═══
 *
 * Owner: "find out how to reduce memory in ember too".  Measured (tex-attrib,
 * v2.3.2859): the fire goblin is Ember's largest cost at 35MB decoded, and
 * every monster strip is a row of 256x256 (the snowman's 128x128) cells with
 * the creature in the middle of each -- 27-40% of every cell is empty.  This
 * is the loader the armour, the stand-ins and the NPC walk strips already use
 * (gearSheets.packTrimmed): each cell cropped to its art, the crops packed into
 * one canvas, each frame a Texture whose `orig` is the whole cell and whose
 * `trim` is where the crop sits in it -- so a Sprite draws it in exactly the
 * same place, at the same size.
 *
 * Decoded through a plain Image rather than Assets.load, for the reason item
 * 11 of OPTIMIZATION-ROADMAP P7 found: Assets would keep the WHOLE strip in
 * its cache beside the crop, and the saving would be negative.  The canvas is
 * therefore not Assets-owned, so the bundle records the source and
 * unloadBundle destroys it (and the Cache entry Texture.from made for it).
 *
 * Resolves to the frames (one per cell, floor(width / fw) of them, as the
 * modules counted before) or [] for a missing file.  Frames carry `__btIx` /
 * `__btN` like every cropped frame (TRAPS §106: never recover an index from
 * frame.x / frame.width).  A strip the packer declines (art fills the cells)
 * comes back as plain slices of the uncropped image, still tracked. */
export function loadTrackedStrip(bundle, url, fw, fh) {
  const gen = _gen.get(bundle) || 0;
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = rej; im.src = url;
  }).then((img) => {
    if ((_gen.get(bundle) || 0) !== gen) return [];   /* its zone was left while it decoded */
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const n = Math.max(1, Math.floor(W / fw));
    const packed = packTrimmed(img, fw, fh, n);
    const src = Texture.from(packed ? packed.canvas : img).source;
    let set = _crops.get(bundle);
    if (!set) { set = new Set(); _crops.set(bundle, set); }
    set.add(src);
    _stripStats.push({ bundle, url, fullBytes: W * H * 4,
      packedBytes: packed ? packed.canvas.width * packed.canvas.height * 4 : W * H * 4 });
    const frames = [];
    for (let i = 0; i < n; i++) {
      let t;
      if (packed) {
        const c = packed.cells[i];
        t = new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
          orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) });
      } else {
        t = new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) });
      }
      t.__btIx = i; t.__btN = n;
      frames.push(t);
    }
    if (_verify) _verify.set(url, { frames, fw, fh });
    return frames;
  }).catch(() => []);
}
const _stripStats = [];
/* QA only: mp-monstertrim sets __btTrimVerify before load and compares every
   cropped frame against the served file. */
const _verify = (typeof window !== 'undefined' && window.__btTrimVerify) ? new Map() : null;
if (typeof window !== 'undefined') {
  window.__btStripTrim = () => _stripStats.slice();
  window.__btStripTrimFrames = () => (_verify ? [..._verify.entries()].map(([url, v]) => ({ url, ...v })) : null);
}

function _releaseCrops(bundle) {
  const set = _crops.get(bundle);
  if (!set) return 0;
  _crops.delete(bundle);
  let n = 0;
  for (const src of set) {
    const res = src.resource;
    try { if (!src.destroyed) src.destroy(); n++; } catch (e) { /* gone */ }
    /* Texture.from parked a Texture under the canvas (or image) in Cache; it
       only leaves when THAT texture is destroyed, which nothing holds. */
    try { if (res && Cache.has(res)) Cache.remove(res); } catch (e) { /* older pixi */ }
    try { if (res && res.getContext) { res.width = 0; res.height = 0; } } catch (e) { /* not a canvas */ }
  }
  return n;
}

/** Release every URL a bundle loaded.  Resolves to how many were released, so
 *  a caller (and mp-texdrift) can tell "freed nothing" from "was never loaded".
 *  Each unload is guarded on its own: one URL that is still referenced must not
 *  abandon the rest of the bundle. */
export async function unloadBundle(bundle) {
  _gen.set(bundle, (_gen.get(bundle) || 0) + 1);   /* v2.3.2860: strips in flight are dropped on arrival */
  let n = _releaseCrops(bundle);                    /* v2.3.2860: the cropped strips */
  const set = _bundles.get(bundle);
  if (!set || set.size === 0) return n;
  _bundles.delete(bundle);
  for (const url of set) {
    try { await Assets.unload(url); n++; } catch (e) { /* still in use / already gone */ }
  }
  return n;
}

/** Whether a bundle currently holds anything -- used by the zone-exit sweep to
 *  skip work rather than to decide correctness. */
export function bundleLoaded(bundle) {
  const set = _bundles.get(bundle);
  const crops = _crops.get(bundle);
  return !!((set && set.size) || (crops && crops.size));
}

/* Dev probe, house style: which bundles are resident and how many URLs each
   holds.  mp-texdrift reads this to say WHICH art a climb is made of, which a
   total in megabytes cannot. */
if (typeof window !== 'undefined') {
  window.__btBundles = function () {
    const out = {};
    _bundles.forEach((set, k) => { out[k] = set.size; });
    _crops.forEach((set, k) => { out[k] = (out[k] || 0) + set.size; });   /* v2.3.2860 */
    return out;
  };
}
