/* Shirt color catalog + selection store + recolored-texture cache.
 *
 * Mirror of facialHairColorCatalog.js.  Shirt sprites are shirt-only, so a
 * recolor is a brightness-ratio retint of every opaque pixel (the shared
 * recolorHairToCanvas) -- the native blue becomes any chosen color while the
 * shading + black outline are preserved.
 *
 * `target` is the LIT shirt color; null = the sprite's native color.
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';

export const SHIRT_COLOR_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#3a5bd0', target: null },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [185, 58, 46] },
  { id: 'orange',  name: 'Orange',  swatch: '#d97a1f', target: [212, 120, 42] },
  { id: 'yellow',  name: 'Yellow',  swatch: '#d9b53a', target: [216, 190, 72] },
  { id: 'green',   name: 'Green',   swatch: '#3a9a52', target: [70, 160, 84] },
  { id: 'teal',    name: 'Teal',    swatch: '#2aa9a0', target: [52, 172, 162] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 100, 200] },
  { id: 'navy',    name: 'Navy',    swatch: '#2a3470', target: [46, 56, 120] },
  { id: 'purple',  name: 'Purple',  swatch: '#7c4bd0', target: [126, 78, 200] },
  { id: 'pink',    name: 'Pink',    swatch: '#d05a9a', target: [214, 112, 168] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [224, 224, 230] },
  { id: 'gray',    name: 'Gray',    swatch: '#8a8a92', target: [140, 140, 148] },
  { id: 'black',   name: 'Black',   swatch: '#2c2c30', target: [46, 46, 52] },
];

export function shirtColorTarget(id) {
  const e = SHIRT_COLOR_CATALOG.find(c => c.id === id);
  return (e && e.target) || null;
}

/* The 'default' shirt color has target=null (it meant "native sprite blue" in
   the old overlay system).  The baked/procedural shirt has no sprite, so map
   default -> this concrete blue (== the #3a5bd0 swatch). */
export const SHIRT_DEFAULT_RGB = [58, 91, 208];

/** Resolve the LIT fill color for a shirt selection, or null when no shirt.
 *  Used by the baked torso-fill (playerSkins) and the login preview. */
export function shirtFill(shirtId, colorId) {
  if (!shirtId || shirtId === 'none') return null;
  return shirtColorTarget(colorId) || SHIRT_DEFAULT_RGB;
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = 'bt-shirtcolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected shirt color id ('default' = sprite's native color). */
export function getShirtColor() { return _active; }

/** Set + persist the active shirt color.  No-op if unchanged. */
export function setShirtColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onShirtColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── in-game recolored shirt textures ── */
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const TRAIT_VER = '2.3.2174';   /* v2.3.2174: de-fringe sweep across the trait sheets (tools/sprite-defringe.py); see playerSprites VERSION 101. */
/* `${shirtId}/${colorId}` -> { east:Texture, ... } | 'loading' */
const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* ═══ v2.3.2122: THE FOURTH RECOLOUR CACHE GETS ITS CAP ═══
 * v2.3.1119 bounded the hair, beard and hat caches with this exact code and
 * this exact reason — "so a crowded multiplayer zone can't grow it without
 * bound (one ~1MB, 5-dir entry per unique appearance)".  Shirts were missed.
 *
 * Found while hunting the demo's slowdown ("gameplay slowed down significantly
 * like accumulation over time"), and it is honest to say what this is and is
 * not: the shirt key is `shirtId/colorId` over 2 styles and 12 colours, so the
 * ceiling is ~24 entries rather than unbounded, and neither soak
 * (tools/qa/mp/mp-soak, mp-crowdsoak) reproduced the slowdown at all.  So this
 * is NOT a proven cause — it is a real, bounded miss in a set of four caches
 * where the other three are capped at 12, fixed because a crowded room is
 * exactly where it fills and leaving one of four uncapped is the kind of
 * inconsistency the next person has to re-derive from scratch.
 *
 * LRU with a 30s-deferred source destroy, identical to its three siblings: the
 * getter re-touches its key so live appearances stay resident, and eviction
 * never kills an in-flight bake or a texture that might still be mid-frame. */
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

function build(shirtId, colorId) {
  const target = shirtColorTarget(colorId);
  const key = shirtId + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map(async dir => {
    try {
      const img = await loadImg(`/sprites/traits/shirt/${shirtId}/${dir}.png?v=${TRAIT_VER}`);
      const cv = recolorHairToCanvas(img, target);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    } catch (e) { /* dir missing -> renderer falls back */ }
  })).then(() => { _cache[key] = tex; _capCache(); });
}

/** Recolored shirt texture map for (shirtId, colorId), or null for the
 *  default color / while baking (caller falls back to native textures). */
export function getColoredShirtTextures(shirtId, colorId) {
  if (!shirtId || shirtId === 'none' || !colorId || colorId === 'default' || !shirtColorTarget(colorId)) return null;
  const key = shirtId + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(shirtId, colorId); return null; }
  if (e === 'loading') return null;
  /* LRU touch: move this key to newest so _capCache evicts a genuinely cold
     one — the appearance being rendered right now must never be the one
     thrown away. */
  delete _cache[key]; _cache[key] = e;
  return e;
}
