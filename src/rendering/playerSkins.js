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

/* Slightly-below-lit factor for the flat shirt fill (a hair of depth without
   any internal shading that would re-expose the body's contour lines). */
const SHIRT_FILL_K = 0.96;

/* Sleeve length as a fraction of the crown->waist span below the collar.  The
   shoulder cap covers all arm skin down to neck + SLEEVE_FRAC*(waist-neck);
   below that only the TORSO is followed, so forearms + HANDS stay skin (a
   t-shirt, not long sleeves that paint the hands). */
const SHIRT_SLEEVE_FRAC = 0.42;

/* Per-frame SHIRT pixel mask.  For each 256px frame:
   - classify pixels (skin / pants / other) and find crown (topmost skin),
     waist (topmost pants in the lower body), collar (crown+NECK_FRAC*span,
     stable refs so it doesn't jitter), per-column hem (first pants per column,
     closes hip skin corners), sleeve cap (collar+SLEEVE_FRAC*span).
   - shoulder cap: mark ALL skin in [collar, sleeveCap].
   - torso flood: from the cap's central skin run, follow the trunk DOWNWARD to
     the per-column hem.  Arms branch off ABOVE the cap, so the downward flood
     never enters them -> forearms/hands stay skin.
   Returns shirtPx (1 = this skin pixel is shirt).  Keyed off each frame's body,
   so it follows the run lean/twist/bob. */
function _torsoBands(d, w, h, frameW, frames) {
  const cls = new Uint8Array(w * h);
  const colWaist = new Int16Array(w);
  const shirtPx = new Uint8Array(w * h);
  const cur = new Uint8Array(frameW), nxt = new Uint8Array(frameW);
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    const pantsRow = new Int16Array(h);
    let crown = -1, bottom = -1;
    for (let y = 0; y < h; y++) {
      let pc = 0, anyOp = false, sc = 0;
      const base = y * w;
      for (let x = x0; x < x1; x++) {
        const i = (base + x) * 4;
        const a = d[i + 3]; if (a <= 40) continue;
        anyOp = true;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (_isSkin(r, g, b, a)) { sc++; cls[base + x] = 1; }
        else if (_isPants(r, g, b, a)) { pc++; cls[base + x] = 3; }
        else cls[base + x] = 2;
      }
      pantsRow[y] = pc;
      if (sc > 0 && crown < 0) crown = y;
      if (anyOp) bottom = y;
    }
    if (crown < 0 || bottom <= crown) continue;
    const mid = (crown + bottom) >> 1;
    let waist = -1;
    for (let y = mid; y < bottom; y++) { if (pantsRow[y] >= 3) { waist = y; break; } }
    if (waist < 0) waist = Math.round(crown + 0.62 * (bottom - crown));
    const collar = Math.max(0, Math.round(crown + SHIRT_NECK_FRAC * (waist - crown)));
    const sleeveCap = Math.min(bottom, Math.round(collar + SHIRT_SLEEVE_FRAC * (waist - collar)));
    /* per-column hem */
    for (let x = x0; x < x1; x++) {
      let cw = waist;
      for (let y = mid; y < bottom; y++) { if (cls[y * w + x] === 3) { cw = y; break; } }
      colWaist[x] = cw;
    }
    /* shoulder cap: all skin in [collar, sleeveCap) */
    for (let y = collar; y < sleeveCap; y++) {
      const base = y * w;
      for (let x = x0; x < x1; x++) if (cls[base + x] === 1 && y < colWaist[x]) shirtPx[base + x] = 1;
    }
    /* torso flood from the cap down.  Seed = skin run at sleeveCap containing
       the chest centre. */
    let cxl = 1e9, cxr = -1;
    for (let y = collar; y < Math.min(collar + 6, sleeveCap + 1); y++)
      for (let x = x0; x < x1; x++) if (cls[y * w + x] === 1) { if (x < cxl) cxl = x; if (x > cxr) cxr = x; }
    let cx = cxr >= cxl ? (cxl + cxr) >> 1 : (x0 + x1) >> 1;
    cur.fill(0);
    let seedRow = sleeveCap;
    if (seedRow >= bottom) seedRow = bottom - 1;
    /* find seed x: chest centre, else nearest skin on that row */
    let sx = -1;
    if (cls[seedRow * w + cx] === 1) sx = cx;
    else for (let dd = 1; dd < frameW; dd++) {
      if (cx - dd >= x0 && cls[seedRow * w + (cx - dd)] === 1) { sx = cx - dd; break; }
      if (cx + dd < x1 && cls[seedRow * w + (cx + dd)] === 1) { sx = cx + dd; break; }
    }
    if (sx >= 0) {
      let l = sx; while (l > x0 && cls[seedRow * w + (l - 1)] === 1) l--;
      let r = sx; while (r < x1 - 1 && cls[seedRow * w + (r + 1)] === 1) r++;
      for (let xx = l; xx <= r; xx++) if (seedRow < colWaist[xx]) { cur[xx - x0] = 1; shirtPx[seedRow * w + xx] = 1; }
      for (let y = seedRow + 1; y < bottom; y++) {
        nxt.fill(0);
        let any = false;
        const base = y * w;
        for (let lx = 0; lx < frameW; lx++) {
          const x = x0 + lx;
          if (cls[base + x] !== 1 || y >= colWaist[x]) continue;
          if (!(cur[lx] || (lx > 0 && cur[lx - 1]) || (lx < frameW - 1 && cur[lx + 1]))) continue;
          /* expand to the full skin run, then skip past it */
          let l2 = lx; while (l2 > 0 && cls[base + (x0 + l2 - 1)] === 1) l2--;
          let r2 = lx; while (r2 < frameW - 1 && cls[base + (x0 + r2 + 1)] === 1) r2++;
          for (let k = l2; k <= r2; k++) { const xx = x0 + k; if (y < colWaist[xx]) { nxt[k] = 1; shirtPx[base + xx] = 1; any = true; } }
          lx = r2;
        }
        cur.set(nxt); // nxt becomes the new frontier
        if (!any) break;
      }
    }
  }
  return shirtPx;
}

export function recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const w = cv.width, h = cv.height;
  const frames = Math.max(1, Math.floor(w / FRAME_W));
  const shirtPx = shirtT ? _torsoBands(d, w, h, FRAME_W, frames) : null;
  /* Flat shirt fill colour (no per-pixel shading -> no resurfacing of the
     body's contour lines).  Computed once. */
  let sf0 = 0, sf1 = 0, sf2 = 0;
  if (shirtT) {
    sf0 = Math.min(255, Math.round(shirtT[0] * SHIRT_FILL_K));
    sf1 = Math.min(255, Math.round(shirtT[1] * SHIRT_FILL_K));
    sf2 = Math.min(255, Math.round(shirtT[2] * SHIRT_FILL_K));
  }
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (shirtPx && shirtPx[i >> 2]) {
      /* shirt skin -> flat fill (kills muscle shading); dark outline/seam
         pixels are never in shirtPx, so they stay and give the shirt its
         outline + arm definition. */
      d[i] = sf0; d[i + 1] = sf1; d[i + 2] = sf2;
    } else if (_isSkin(r, g, b, a)) {
      if (skinT) _retint(d, i, skinT, SKIN_REF);
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
  /* Returns an always-resolving promise so a full preload can await it. */
  return loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`).then(img => {
    const cv = recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT);
    const src = Texture.from(cv).source;
    src.scaleMode = 'linear';
    /* No mipmaps: matches gearSheets.js -- the body is drawn minified, and mip
       averaging erodes thin features (hands) toward transparent + bleeds across
       gutter-less frame seams, causing flicker/holes while running. */
    src.autoGenerateMipmaps = false;
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
/** Preload the recolored body for the current combo across all base dirs for
 *  stand + jog, so an UNARMOURED player (or any moment the body shows) never
 *  flashes the default-skin frame when first turning/jogging in a direction.
 *  Resolves immediately for the default combo (base sheets are used as-is). */
export function preloadBodyAll() {
  return Promise.all([import('./traits/shirtCatalog.js'), import('./traits/shirtColorCatalog.js')])
    .then(([sc, scc]) => {
      const shirtId = sc.getShirt(), colorId = scc.getShirtColor();
      const shirtT = scc.shirtFill(shirtId, colorId);
      const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
      const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
      if (!skinT && !pantsT && !shoesT && !shirtT) return; /* default combo: nothing to bake */
      const shKey = shirtT ? (shirtId + '-' + colorId) : 'none';
      const tasks = [];
      for (const pose of ['stand', 'jog']) {
        for (const dir of SOURCE_DIRS) {
          const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '/' + shKey + '|' + pose + '/' + dir;
          if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, skinT, pantsT, shoesT, shirtT));
        }
      }
      return Promise.all(tasks);
    })
    .catch(() => {});
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
