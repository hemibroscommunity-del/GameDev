/* Facial-hair (beard) color catalog + selection store + recolored-texture
 * cache.  Beard sprites are beard-only, so recolor is a brightness-ratio
 * retint of every opaque pixel -- same method as hair color, shared via
 * recolorHairToCanvas.  Independent selection from hair color so a player
 * can mismatch beard and hair.
 *
 * `target` is the LIT beard color; null = the sprite's native color.
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';
import { recolorEnabled } from './recolorOptions.js';

export const FACIALHAIR_COLOR_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#5a3a22', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2b2420', target: [46, 40, 38] },
  { id: 'brown',   name: 'Brown',   swatch: '#6e4423', target: [112, 72, 40] },
  { id: 'auburn',  name: 'Auburn',  swatch: '#8a3a22', target: [140, 70, 44] },
  { id: 'blonde',  name: 'Blonde',  swatch: '#d4af5a', target: [212, 176, 96] },
  { id: 'gray',    name: 'Gray',    swatch: '#9a9a9e', target: [156, 156, 162] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [170, 58, 42] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [228, 228, 234] },
];

export function facialHairColorTarget(id) {
  if (!recolorEnabled('beard')) return null;  /* v2.3.1494 */
  const e = FACIALHAIR_COLOR_CATALOG.find(c => c.id === id);
  return (e && e.target) || null;
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = 'bt-beardcolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected beard color id ('default' = sprite's native color). */
export function getFacialHairColor() { return _active; }

/** Set + persist the active beard color.  No-op if unchanged. */
export function setFacialHairColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onFacialHairColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── in-game recolored beard textures ── */
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const TRAIT_VER = '2.3.2174';   /* v2.3.2174: de-fringe sweep across the trait sheets (tools/sprite-defringe.py); see playerSprites VERSION 101. */
/* `${fhId}/${colorId}` -> { east:Texture, ... } | 'loading' */
const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* v2.3.1119: bound the recolor cache (see hairColorCatalog for rationale) --
   LRU cap with a 30s-deferred source destroy. */
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

function build(fhId, colorId) {
  const target = facialHairColorTarget(colorId);
  const key = fhId + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map(async dir => {
    try {
      const img = await loadImg(`/sprites/traits/facialhair/${fhId}/${dir}.png?v=${TRAIT_VER}`);
      const cv = recolorHairToCanvas(img, target);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    } catch (e) { /* dir missing -> renderer falls back */ }
  })).then(() => { _cache[key] = tex; _capCache(); });
}

/** Recolored beard texture map for (fhId, colorId), or null for the default
 *  color / while baking (caller falls back to the native-color textures). */
export function getColoredFacialHairTextures(fhId, colorId) {
  if (!fhId || fhId === 'none' || !colorId || colorId === 'default' || !facialHairColorTarget(colorId)) return null;
  const key = fhId + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(fhId, colorId); return null; }
  if (e === 'loading') return null;
  /* LRU touch: keep actively-rendered beards out of the eviction front. */
  delete _cache[key]; _cache[key] = e;
  return e;
}
