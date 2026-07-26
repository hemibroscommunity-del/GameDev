/* Hair-color catalog + selection store + in-game recolored-texture cache.
 *
 * Hair sprites are hair-only (transparent elsewhere), so recoloring is just
 * a brightness-ratio retint of every opaque pixel -- the same method as the
 * skin recolor, shared with the login portrait (recolorHairToCanvas).  This
 * module owns the catalog + persisted selection AND the per-(hairId,colorId)
 * Pixi-texture cache the renderer pulls from.
 *
 * `target` is the LIT hair color for that choice; null = the sprite's
 * native color (no recolor).
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';
import { recolorEnabled } from './recolorOptions.js';

export const HAIR_COLOR_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#5a3a22', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2b2420', target: [46, 40, 38] },
  { id: 'brown',   name: 'Brown',   swatch: '#6e4423', target: [112, 72, 40] },
  { id: 'auburn',  name: 'Auburn',  swatch: '#8a3a22', target: [140, 70, 44] },
  { id: 'blonde',  name: 'Blonde',  swatch: '#d4af5a', target: [212, 176, 96] },
  { id: 'gray',    name: 'Gray',    swatch: '#9a9a9e', target: [156, 156, 162] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [170, 58, 42] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [74, 96, 200] },
];

export function hairColorTarget(id) {
  if (!recolorEnabled('hair')) return null;  /* v2.3.1494 */
  const e = HAIR_COLOR_CATALOG.find(c => c.id === id);
  return (e && e.target) || null;
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = 'bt-haircolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected hair color id ('default' = sprite's native color). */
export function getHairColor() { return _active; }

/** Set + persist the active hair color.  Notifies listeners.  No-op if
 *  unchanged. */
export function setHairColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onHairColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── in-game recolored hair textures ── */
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const TRAIT_VER = '2.3.391';
/* `${hairId}/${colorId}` -> { east:Texture, ... } | 'loading' */
const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* v2.3.1119: cap the recolor cache so a crowded multiplayer zone can't grow it
   without bound (one ~1MB, 5-dir entry per unique hair+colour appearance).  LRU:
   the getter re-touches its key so active appearances stay resident; eviction
   takes the oldest cold entry and destroys its texture sources after 30s
   (deferred so an in-use texture is never killed mid-frame -- same guard as
   entityRenderer's masked-body cache). */
const _CACHE_CAP = 12;
function _capCache() {
  const keys = Object.keys(_cache);
  if (keys.length <= _CACHE_CAP) return;
  for (const k of keys) {
    const e = _cache[k];
    if (e === 'loading') continue;        // never evict an in-flight bake
    delete _cache[k];
    setTimeout(() => {
      try { for (const dir in e) { const t = e[dir]; if (t && t.source) t.source.destroy(); } }
      catch (err) { /* ignore */ }
    }, 30000);
    break;
  }
}

function build(hairId, colorId) {
  const target = hairColorTarget(colorId);
  const key = hairId + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map(async dir => {
    try {
      const img = await loadImg(`/sprites/traits/hair/${hairId}/${dir}.png?v=${TRAIT_VER}`);
      const cv = recolorHairToCanvas(img, target);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    } catch (e) { /* dir missing -> renderer falls back */ }
  })).then(() => { _cache[key] = tex; _capCache(); });
}

/** Recolored hair texture map for (hairId, colorId), or null for the default
 *  color / while baking (caller falls back to the native-color textures). */
export function getColoredHairTextures(hairId, colorId) {
  /* The long-hair sprite is ~88% pure black; recoloring it over-processes the
     thin lit rim (a light color washes out, even "black" lifts to a brown-gray)
     while the NATIVE sprite is the truest black.  So long hair always renders
     native -- its picker only offers a single black swatch (see BroTown). */
  if (hairId === 'long') return null;
  if (!hairId || hairId === 'none' || !colorId || colorId === 'default' || !hairColorTarget(colorId)) return null;
  const key = hairId + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(hairId, colorId); return null; }
  if (e === 'loading') return null;
  /* LRU touch: move this key to newest so _capCache evicts a genuinely cold one. */
  delete _cache[key]; _cache[key] = e;
  return e;
}
