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

/* v2.3.407: recolor LAZILY, one sheet at a time, keyed
   `${skin}/${pants}/${shoes}|${pose}/${dir}` -> [Texture] | 'loading'.  The
   old version baked all ~21 sheets up front the first time a custom-appearance
   player rendered -- a big synchronous canvas pass (each jog sheet is
   13056x256) that froze the main thread at spawn and left the 2D procedural
   fallback on screen.  Now only the (pose,dir) actually drawn gets recolored,
   on demand, so cost is spread and the freeze is gone. */
const _bodySheets = {};

function _retint(d, i, target, ref) {
  const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
  d[i]     = Math.min(255, Math.round(target[0] * k));
  d[i + 1] = Math.min(255, Math.round(target[1] * k));
  d[i + 2] = Math.min(255, Math.round(target[2] * k));
}

/* Pixel tests shared by the recolor loop and the torso-band pass.  Run on the
   DEFAULT-colored source (always tan skin / green pants), so they're stable
   regardless of the chosen skin or shirt color. */
function _isSkin(r, g, b, a) { return a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; }
function _isPants(r, g, b, a) { return a > 180 && g >= r - 10 && g > b + 8 && r < 150; }

/* Fraction of the crown->waist span at which the shirt collar sits.  Anchored
   to two STABLE per-frame references (crown = topmost skin; waist = topmost
   pants) rather than a noisy shoulder-width detection, so the collar doesn't
   jitter up/down between run frames -- it tracks the body's bob smoothly.
   0.48 places it at the base of the neck (neck skin stays visible, no face
   coverage, shoulders covered).  Tuned offline across stand + run, all dirs. */
const SHIRT_NECK_FRAC = 0.48;

/* Per-frame torso band [neckY, waistY, fillLum] + a per-pixel class map for
   the SHIRT.  Derived from each 256px frame's own pixels: crown = topmost skin
   row; waist = topmost pants row in the lower body; neck = crown +
   NECK_FRAC*(waist-crown).  fillLum = mean skin luminance in the band (used to
   flatten contour lines).  cls (one byte/pixel: 0 transparent, 1 skin, 2 other
   opaque) lets the recolor loop test ORIGINAL neighbour classes -- needed so a
   pixel already recolored earlier in the pass doesn't corrupt the seam test.
   Keyed off each frame's own body, so it follows the run lean/twist/bob. */
function _torsoBands(d, w, h, frameW, frames) {
  const bands = new Array(frames);
  const cls = new Uint8Array(w * h);
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    const pantsRow = new Int16Array(h);
    const skinLumSum = new Float64Array(h), skinCnt = new Int16Array(h);
    let crown = -1, bottom = -1;
    for (let y = 0; y < h; y++) {
      let pc = 0, anyOp = false, lumSum = 0, sc = 0;
      const base = y * w;
      for (let x = x0; x < x1; x++) {
        const i = (base + x) * 4;
        const a = d[i + 3]; if (a <= 40) continue;
        anyOp = true;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (_isSkin(r, g, b, a)) { sc++; lumSum += 0.299 * r + 0.587 * g + 0.114 * b; cls[base + x] = 1; }
        else { if (_isPants(r, g, b, a)) pc++; cls[base + x] = 2; }
      }
      skinCnt[y] = sc; skinLumSum[y] = lumSum; pantsRow[y] = pc;
      if (sc > 0 && crown < 0) crown = y;
      if (anyOp) bottom = y;
    }
    if (crown < 0 || bottom <= crown) { bands[f] = null; continue; }
    const mid = (crown + bottom) >> 1;
    let waist = -1;
    for (let y = mid; y < bottom; y++) { if (pantsRow[y] >= 3) { waist = y; break; } }
    if (waist < 0) waist = Math.round(crown + 0.62 * (bottom - crown));
    const neck = Math.round(crown + SHIRT_NECK_FRAC * (waist - crown));
    let ls = 0, lc = 0;
    for (let y = neck; y < waist; y++) { ls += skinLumSum[y]; lc += skinCnt[y]; }
    const fillLum = lc > 0 ? ls / lc : SKIN_REF;
    bands[f] = [Math.max(0, neck), waist, fillLum];
  }
  return { bands, cls };
}

export function recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const w = cv.width, h = cv.height;
  /* Shirt = torso region recolored to the shirt color.  Compute the per-frame
     band up front. */
  const frames = Math.max(1, Math.floor(w / FRAME_W));
  const tb = shirtT ? _torsoBands(d, w, h, FRAME_W, frames) : null;
  const bands = tb ? tb.bands : null, cls = tb ? tb.cls : null;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    /* In-band? */
    let bd = null, y = 0, px = 0;
    if (bands) {
      px = i >> 2;
      y = (px / w) | 0;
      const cand = bands[((px % w) / FRAME_W) | 0];
      if (cand && y >= cand[0] && y < cand[1]) bd = cand;
    }
    if (_isSkin(r, g, b, a)) {
      /* torso skin -> shirt (keep its shading via own luminance); else skin. */
      if (bd) _retint(d, i, shirtT, SKIN_REF);
      else if (skinT) _retint(d, i, skinT, SKIN_REF);
    } else if (bd && a > 40) {
      /* Non-skin opaque pixel inside the shirt.  EDGE (touches transparent on
         any side) = silhouette outline -> keep (shirt reuses the body outline).
         A VERTICAL dark run = the arm/torso seam that separates the sleeves
         from the body -> keep, so the arms stay distinct.  Everything else
         interior = a horizontal body-contour line (chest/abs) -> flatten to the
         band's mean shirt tone so the shirt reads clean.  Neighbour classes
         come from `cls` (original), not the half-recolored pixels. */
      const x = px % w;
      const up = px - w, dn = px + w;
      const edge = x === 0 || x === w - 1 || y === 0 || y === h - 1
        || cls[px - 1] === 0 || cls[px + 1] === 0 || cls[up] === 0 || cls[dn] === 0;
      const seam = cls[up] === 2 && cls[dn] === 2; /* vertical dark run */
      if (!edge && !seam) {
        const k = bd[2] / SKIN_REF;
        d[i] = Math.min(255, Math.round(shirtT[0] * k));
        d[i + 1] = Math.min(255, Math.round(shirtT[1] * k));
        d[i + 2] = Math.min(255, Math.round(shirtT[2] * k));
      }
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

function buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT) {
  _bodySheets[sheetKey] = 'loading';
  loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`).then(img => {
    const cv = recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT);
    const src = Texture.from(cv).source;
    src.scaleMode = 'linear';
    src.autoGenerateMipmaps = true;
    const frames = Math.max(1, Math.floor(cv.width / FRAME_W));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H) }));
    }
    _bodySheets[sheetKey] = out;
  }).catch(() => { _bodySheets[sheetKey] = []; /* missing -> caller falls back */ });
}

/** Recolored body frame for (skin, pants, shoes, pose, dir, frameIdx).  Falls
 *  back to the default sheets when nothing is recolored or while a sheet is
 *  still baking, so the player is never invisible.  Each (pose,dir) sheet is
 *  recolored lazily on first use.  Mirroring is handled by the caller. */
export function getBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, shirtT, shirtKey) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  if (!skinT && !pantsT && !shoesT && !shirtT) return getFrame(pose, dir, frameIdx);
  const sheetKey = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default')
    + '/' + (shirtT ? (shirtKey || 'shirt') : 'none') + '|' + pose + '/' + dir;
  const entry = _bodySheets[sheetKey];
  if (entry === undefined) { buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT); return getFrame(pose, dir, frameIdx); }
  if (entry === 'loading' || !entry.length) return getFrame(pose, dir, frameIdx);
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/** Back-compat wrapper (skin only). */
export function getSkinnedFrame(skinId, pose, dir, frameIdx) {
  return getBodyFrame(skinId, 'default', 'default', pose, dir, frameIdx);
}

/* Pre-warm the local player's recolored body sheets so the correct skin is
   baked BEFORE the player first renders -- otherwise getBodyFrame falls back
   to the default (un-recolored) frame for the first frame(s) while the async
   recolor runs, which shows as a brief default-skin flicker on spawn.  Bakes
   the 'stand' pose (the spawn pose) for all base dirs of the current combo.
   Fires on module load (a returning player's stored combo) and whenever the
   login picker changes skin/pants/shoes -- both give plenty of lead time
   before the player presses Play and spawns. */
export function prewarmBody(skinId, pantsId, shoesId, shirtT, shirtKey) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  if (!skinT && !pantsT && !shoesT && !shirtT) return; /* default combo: nothing to bake */
  const shKey = shirtT ? (shirtKey || 'shirt') : 'none';
  for (const dir of SOURCE_DIRS) {
    const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '/' + shKey + '|stand/' + dir;
    if (_bodySheets[key] === undefined) buildBodySheet(key, 'stand', dir, skinT, pantsT, shoesT, shirtT);
  }
}
/* Resolve the current shirt via dynamic import (static import would form a
   cycle: playerSkins -> shirtColorCatalog -> characterPortrait -> playerSkins),
   then prewarm the spawn pose with the full combo so there's no skin-torso
   flash before the shirt bakes. */
function _prewarmCurrent() {
  Promise.all([import('./traits/shirtCatalog.js'), import('./traits/shirtColorCatalog.js')])
    .then(([sc, scc]) => {
      const shirtId = sc.getShirt(), colorId = scc.getShirtColor();
      const shirtT = scc.shirtFill(shirtId, colorId);
      prewarmBody(_skinStore.get(), _pantsStore.get(), _shoesStore.get(), shirtT, shirtId + '-' + colorId);
      if (!_shirtSubscribed) {
        _shirtSubscribed = true;
        sc.onShirtChange(_prewarmCurrent);
        scc.onShirtColorChange(_prewarmCurrent);
      }
    })
    .catch(() => { try { prewarmBody(_skinStore.get(), _pantsStore.get(), _shoesStore.get(), null, 'none'); } catch (e) { /* ignore */ } });
}
let _shirtSubscribed = false;
_skinStore.on(_prewarmCurrent);
_pantsStore.on(_prewarmCurrent);
_shoesStore.on(_prewarmCurrent);
_prewarmCurrent();
