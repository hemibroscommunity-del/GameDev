/* Player BODY recolor + selection stores (skin tone, pants, shoes).
 *
 * The player sheets bundle three recolorable regions into one body sprite:
 *   - SKIN  : warm tan pixels (face, neck, arms, bare torso)
 *   - PANTS : green pixels
 *   - SHOES : flat gray boot pixels
 * The near-black outline and eyes are left alone.
 *
 * Each region is retinted by the SAME brightness-ratio method: a pixel keeps
 * its luminance ratio vs that region's lit reference, and the chosen color is
 * applied at that ratio, so lit areas land on the color and shadows stay
 * proportionally darker (same hue, relative shading).
 *
 * Recolor runs once per (skin, pants, shoes) combo on a canvas into a texture
 * manifest mirroring playerSprites' layout, cached by combo key.  Each player
 * (local + remote) has one combo, so the cache stays tiny.  getBodyFrame()
 * falls back to the default sheets while a combo bakes or when nothing is
 * recolored.
 */

import { Rectangle, Texture } from 'pixi.js';
import { getFrame, SPRITE_VERSION } from './playerSprites.js';

/* ── Catalogs ── `target` = the LIT color for that choice; null = native. */
export const SKIN_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#cd864b', target: null },
  { id: 'pale',    name: 'Pale',    swatch: '#f0cdaa', target: [240, 205, 170] },
  { id: 'tan',     name: 'Tan',     swatch: '#c88c50', target: [200, 140, 80] },
  { id: 'olive',   name: 'Olive',   swatch: '#b18a5e', target: [178, 138, 94] },
  { id: 'brown',   name: 'Brown',   swatch: '#9b6941', target: [155, 105, 65] },
  { id: 'deep',    name: 'Deep',    swatch: '#6e4b32', target: [112, 76, 50] },
  { id: 'ebony',   name: 'Ebony',   swatch: '#50382a', target: [82, 56, 39] },
];

export const PANTS_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#6a7a45', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2c2c30', target: [46, 46, 52] },
  { id: 'gray',    name: 'Gray',    swatch: '#8a8a92', target: [140, 140, 148] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [224, 224, 230] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [120, 80, 50] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [185, 58, 46] },
  { id: 'orange',  name: 'Orange',  swatch: '#d97a1f', target: [212, 120, 42] },
  { id: 'yellow',  name: 'Yellow',  swatch: '#d9b53a', target: [216, 190, 72] },
  { id: 'green',   name: 'Green',   swatch: '#3a9a52', target: [70, 160, 84] },
  { id: 'teal',    name: 'Teal',    swatch: '#2aa9a0', target: [52, 172, 162] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 100, 200] },
  { id: 'navy',    name: 'Navy',    swatch: '#2a3470', target: [46, 56, 120] },
  { id: 'purple',  name: 'Purple',  swatch: '#7c4bd0', target: [126, 78, 200] },
  { id: 'pink',    name: 'Pink',    swatch: '#d05a9a', target: [214, 112, 168] },
];

export const SHOES_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#5a5a5a', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2a2a2e', target: [42, 42, 46] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [116, 76, 48] },
  { id: 'tan',     name: 'Tan',     swatch: '#bfa06a', target: [190, 160, 110] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [222, 222, 228] },
  { id: 'gray',    name: 'Gray',    swatch: '#9a9a9e', target: [150, 150, 156] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [182, 56, 44] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 98, 192] },
];

function _target(catalog, id) {
  const e = catalog.find(c => c.id === id);
  return (e && e.target) || null;
}
export function skinTarget(id) { return _target(SKIN_CATALOG, id); }
export function pantsTarget(id) { return _target(PANTS_CATALOG, id); }
export function shoesTarget(id) { return _target(SHOES_CATALOG, id); }

/* ── Selection stores (localStorage) ── */
function makeStore(key, defId) {
  let active = defId;
  try { const s = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (s) active = s; } catch (e) { /* ignore */ }
  const listeners = new Set();
  return {
    get: () => active,
    set: (id) => {
      if (id === active) return;
      active = id;
      try { localStorage.setItem(key, id); } catch (e) { /* ignore */ }
      listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
    },
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
const _skinStore = makeStore('bt-skin', 'default');
const _pantsStore = makeStore('bt-pants', 'default');
const _shoesStore = makeStore('bt-shoes', 'default');

export const getSkin = _skinStore.get,  setSkin = _skinStore.set,  onSkinChange = _skinStore.on;
export const getPants = _pantsStore.get, setPants = _pantsStore.set, onPantsChange = _pantsStore.on;
export const getShoes = _shoesStore.get, setShoes = _shoesStore.set, onShoesChange = _shoesStore.on;

/* ── Recolor pipeline ── */
const FRAME_W = 256;
const FRAME_H = 256;
const SKIN_REF = 149;   // lit luminance of each region (measured from the sheets)
const PANTS_REF = 112;
const SHOES_REF = 75;
const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSES = ['stand', 'jog', 'hit', 'pickup', 'attack'];

/* combo key `${skin}/${pants}/${shoes}` -> manifest | 'loading' | null(none) */
const _bodyManifests = {};

function _retint(d, i, target, ref) {
  const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
  d[i]     = Math.min(255, Math.round(target[0] * k));
  d[i + 1] = Math.min(255, Math.round(target[1] * k));
  d[i + 2] = Math.min(255, Math.round(target[2] * k));
}

export function recolorBodyToCanvas(img, skinT, pantsT, shoesT) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25) {
      /* skin */ if (skinT) _retint(d, i, skinT, SKIN_REF);
    } else if (a > 180 && g >= r - 10 && g > b + 8 && r < 150) {
      /* pants (green) */ if (pantsT) _retint(d, i, pantsT, PANTS_REF);
    } else if (a > 180) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx - mn) < 28 && mx >= 45 && mx < 140) {
        /* boots (flat gray) */ if (shoesT) _retint(d, i, shoesT, SHOES_REF);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return cv;
}

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

function buildBodyManifest(key, skinT, pantsT, shoesT) {
  _bodyManifests[key] = 'loading';
  const man = { stand: {}, jog: {}, hit: {}, pickup: {}, attack: {} };
  const tasks = [];
  for (const pose of POSES) {
    for (const dir of SOURCE_DIRS) {
      if (pose === 'pickup' && dir !== 'south') continue;
      tasks.push((async () => {
        try {
          const img = await loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`);
          const cv = recolorBodyToCanvas(img, skinT, pantsT, shoesT);
          const src = Texture.from(cv).source;
          src.scaleMode = 'linear';
          src.autoGenerateMipmaps = true;
          const frames = Math.max(1, Math.floor(cv.width / FRAME_W));
          const out = [];
          for (let i = 0; i < frames; i++) {
            out.push(new Texture({ source: src, frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H) }));
          }
          man[pose][dir] = out;
        } catch (e) { /* sheet missing -- caller falls back */ }
      })());
    }
  }
  return Promise.all(tasks).then(() => { _bodyManifests[key] = man; });
}

/** Recolored body frame for (skin, pants, shoes, pose, dir, frameIdx).  Falls
 *  back to the default sheets when nothing is recolored or while a combo is
 *  still baking, so the player is never invisible.  Mirroring is handled by
 *  the caller (scale.x), same as getFrame. */
export function getBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  if (!skinT && !pantsT && !shoesT) return getFrame(pose, dir, frameIdx);
  const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default');
  const man = _bodyManifests[key];
  if (man === undefined) { buildBodyManifest(key, skinT, pantsT, shoesT); return getFrame(pose, dir, frameIdx); }
  if (man === 'loading' || !man) return getFrame(pose, dir, frameIdx);
  const set = man[pose] && man[pose][dir];
  if (!set || set.length === 0) return getFrame(pose, dir, frameIdx);
  const safeIdx = ((frameIdx % set.length) + set.length) % set.length;
  return set[safeIdx];
}

/** Back-compat wrapper (skin only). */
export function getSkinnedFrame(skinId, pose, dir, frameIdx) {
  return getBodyFrame(skinId, 'default', 'default', pose, dir, frameIdx);
}
