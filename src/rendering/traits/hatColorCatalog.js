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

export function hatColorTarget(id) {
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

function build(hatId, colorId) {
  const target = hatColorTarget(colorId);
  const key = hatId + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map(async dir => {
    try {
      const img = await loadImg(`/sprites/traits/headwear/${hatId}/${dir}.png?v=${TRAIT_VER}`);
      const cv = recolorHairToCanvas(img, target);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    } catch (e) { /* dir missing -> renderer falls back */ }
  })).then(() => { _cache[key] = tex; });
}

/** Recolored hat texture map for (hatId, colorId), or null for the default
 *  color / while baking (caller falls back to the native-color textures). */
export function getColoredHatTextures(hatId, colorId) {
  if (!hatId || hatId === 'none' || !colorId || colorId === 'default' || !hatColorTarget(colorId)) return null;
  const key = hatId + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(hatId, colorId); return null; }
  if (e === 'loading') return null;
  return e;
}
