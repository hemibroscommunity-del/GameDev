/* Hat-color catalog + selection store + in-game recolored-texture cache.
 *
 * Only offered for hats flagged `solid` in headwearCatalog (single-color
 * designs).  Recolor is a brightness-ratio retint of every opaque hat pixel
 * -- the same method as hair color, shared via recolorHairToCanvas -- so the
 * hat lands on the chosen tone with its shading preserved.
 *
 * `target` is the LIT hat color; null = the sprite's native color.
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';
import { headwearIsSolid } from './headwearCatalog.js';
import { recolorEnabled, SOLID_ONLY_HAT_COLOR } from './recolorOptions.js';
import { segmentMaterials, mainMaterial } from './traitMaterials.js'; /* v2.3.1926 */

export const HAT_COLOR_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#7c6cff', target: null },
  { id: 'red',     name: 'Red',     swatch: '#c0392b', target: [196, 64, 50] },
  { id: 'orange',  name: 'Orange',  swatch: '#d97a1f', target: [214, 126, 40] },
  { id: 'yellow',  name: 'Yellow',  swatch: '#d9b53a', target: [220, 190, 70] },
  { id: 'green',   name: 'Green',   swatch: '#3a9a52', target: [70, 160, 86] },
  { id: 'teal',    name: 'Teal',    swatch: '#2aa9a0', target: [52, 178, 168] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [74, 96, 200] },
  { id: 'purple',  name: 'Purple',  swatch: '#7c4bd0', target: [128, 80, 208] },
  { id: 'pink',    name: 'Pink',    swatch: '#d05a9a', target: [212, 110, 168] },
  { id: 'black',   name: 'Black',   swatch: '#2b2b30', target: [46, 46, 52] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [230, 230, 236] },
  { id: 'gray',    name: 'Gray',    swatch: '#8a8a92', target: [140, 140, 148] },
];

/* v2.3.1927: colours a particular hat does not offer.
 *
 * Owner, after reviewing all 39 hats in all 11 colours: "keep all of them
 * except the yellow recolor for crown (the default is already yellow)."  It is
 * not that yellow looks wrong on the crown -- it is that the crown IS gold, so
 * the swatch is a control that appears to do nothing, which reads as broken.
 *
 * The list is per hat rather than a rule, because that is the only thing that
 * can be right here: whether a colour is worth offering is a look at the art,
 * not something derivable from it.  Add ids as they are reviewed.
 *
 * Object.create(null): keyed by a trait id that arrives from a saved
 * appearance, and a plain {} silently no-ops on '__proto__' (CLAUDE.md rule 4). */
const HAT_COLOR_EXCLUDE = Object.create(null);
HAT_COLOR_EXCLUDE.crown = ['yellow'];

/** True if `colorId` is deliberately not offered on `hatId`. */
export function hatColorExcluded(hatId, colorId) {
  const skip = hatId && HAT_COLOR_EXCLUDE[hatId];
  return !!(skip && skip.indexOf(colorId) >= 0);
}

/** The colours a hat's picker should show. */
export function hatColorsFor(hatId) {
  const skip = hatId && HAT_COLOR_EXCLUDE[hatId];
  return skip ? HAT_COLOR_CATALOG.filter(c => skip.indexOf(c.id) < 0) : HAT_COLOR_CATALOG;
}

/* `hatId` is optional: without it no exclusion applies, so a caller that has
   no hat in hand keeps the behaviour it always had. */
export function hatColorTarget(id, hatId) {
  if (!recolorEnabled('hat')) return null;  /* v2.3.1494 */
  if (hatColorExcluded(hatId, id)) return null;
  const e = HAT_COLOR_CATALOG.find(c => c.id === id);
  return (e && e.target) || null;
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = 'bt-hatcolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected hat color id ('default' = sprite's native color). */
export function getHatColor() { return _active; }

/** Set + persist the active hat color.  Notifies listeners.  No-op if
 *  unchanged. */
export function setHatColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onHatColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── in-game recolored hat textures ── */
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const TRAIT_VER = '2.3.394';
/* `${hatId}/${colorId}` -> { east:Texture, ... } | 'loading' */
const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* Mean luminance of opaque pixels across SEVERAL images (×1.15), so all of a
   hat's facings share ONE recolour reference. Keying every direction off the
   same ref makes the chosen hat colour land on the same tone per angle instead
   of drifting with each sheet's own outline-to-fabric pixel ratio. */
/* v2.3.1926: returns the MATERIAL PROFILE as well, from the same single read of
   the pixels -- which material is the hat's own colour, so a recolour can leave
   the eyes, the teeth, the band and the outline alone (traitMaterials.js).
   `ref` is byte-for-byte the number this function always returned; the recolour
   of the hat's own material is therefore unchanged, and the only difference
   anywhere is the materials that are now skipped. */
function _pooledProfile(imgs, hatId) {
  const chunks = [];
  let sum = 0, n = 0, maxL = 1;
  for (const img of imgs) {
    if (!img) continue;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    chunks.push(d);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += l; n++; if (l > maxL) maxL = l;
      }
    }
  }
  const mats = segmentMaterials(chunks);
  return { ref: Math.max(1, n ? (sum / n) * 1.15 : maxL), mats, main: mainMaterial(hatId, mats) };
}

/* hatId -> shared pooled recolour profile (reference luminance + the hat's
   materials), cached across colours and reused by the character-creator
   portrait so its hat shade matches the in-game one.
   Object.create(null): keyed by a trait id that reaches here from a saved
   appearance, and a plain {} silently no-ops on '__proto__' (CLAUDE.md rule 4). */
const _refCache = Object.create(null);
export function getHatRef(hatId) {
  if (!hatId || hatId === 'none') return Promise.resolve(0);
  if (_refCache[hatId]) return Promise.resolve(_refCache[hatId]);
  return Promise.all(DIRS.map(dir =>
    loadImg(`/sprites/traits/headwear/${hatId}/${dir}.png?v=${TRAIT_VER}`).then(img => img).catch(() => null)
  )).then(imgs => (_refCache[hatId] = _pooledProfile(imgs, hatId)));
}

/* v2.3.1119: bound the recolor cache (see hairColorCatalog for rationale) --
   LRU cap with a 30s-deferred source destroy so a crowded zone can't grow it
   without limit. */
const _CACHE_CAP = 12;
function _capCache() {
  const keys = Object.keys(_cache);
  if (keys.length <= _CACHE_CAP) return;
  for (const k of keys) {
    const e = _cache[k];
    if (e === 'loading') continue;
    delete _cache[k];
    setTimeout(() => {
      try { for (const dir in e) { const t = e[dir]; if (t && t.source) t.source.destroy(); } }
      catch (err) { /* ignore */ }
    }, 30000);
    break;
  }
}

function build(hatId, colorId) {
  const target = hatColorTarget(colorId);
  const key = hatId + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  /* Load every facing FIRST, derive one shared reference, then recolour each
     with it -> identical tone per angle. */
  Promise.all(DIRS.map(dir =>
    loadImg(`/sprites/traits/headwear/${hatId}/${dir}.png?v=${TRAIT_VER}`).then(img => ({ dir, img })).catch(() => ({ dir, img: null }))
  )).then(loaded => {
    const prof = _refCache[hatId] || (_refCache[hatId] = _pooledProfile(loaded.map(l => l.img), hatId));
    for (const { dir, img } of loaded) {
      if (!img) continue; /* dir missing -> renderer falls back */
      const cv = recolorHairToCanvas(img, target, prof);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    }
    _cache[key] = tex;
    _capCache();
  });
}

/** Recolored hat texture map for (hatId, colorId), or null for the default
 *  color / while baking (caller falls back to the native-color textures). */
export function getColoredHatTextures(hatId, colorId) {
  /* v2.3.1927: an excluded colour renders as the hat's native art, so a saved
     appearance that still names one falls back cleanly instead of showing a
     colour the picker no longer offers. */
  if (!hatId || hatId === 'none' || !colorId || colorId === 'default' || !hatColorTarget(colorId, hatId)) return null;
  /* v2.3.1493: enforce what line 3 of this file has always claimed -- recolor
     is for `solid` hats only.  It was never checked anywhere, so the picker was
     offered on every hat, and the retint is a brightness-ratio pass over EVERY
     opaque pixel: on a multi-tone hat it flattens the accents it was written to
     preserve, and on the generated batch (v2.3.1488+), whose frames still carry
     the head they were drawn on, it repaints that head a flat color and turns a
     hidden passenger into a glaring second head.  Gating here rather than only
     in the picker matters: hatColor persists in localStorage, so a player who
     already chose one would keep seeing it long after the picker was hidden. */
  if (SOLID_ONLY_HAT_COLOR && !headwearIsSolid(hatId)) return null;
  const key = hatId + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(hatId, colorId); return null; }
  if (e === 'loading') return null;
  /* LRU touch: keep actively-rendered hats out of the eviction front. */
  delete _cache[key]; _cache[key] = e;
  return e;
}
