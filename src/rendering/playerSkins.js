/* Player skin-tone recolor + selection store.
 *
 * The player sheets are shirtless, so the "skin" is the face, neck, arms
 * AND bare torso -- all warm tan pixels.  To retint to another tone we
 * recolor only those warm pixels and PRESERVE the shading: each skin pixel
 * keeps its brightness RATIO versus the default lit skin, and the chosen
 * tone is applied at that ratio.  So lit areas land on the target tone and
 * shaded areas stay proportionally darker -- same hue, relative shading
 * (exactly the "darker shade of the same hue in shadow" idea).
 *
 * Non-skin pixels are left untouched: green pants (G>=R), gray boots
 * (R~=G~=B), and the near-black outline (too dark) all fail the warm test.
 *
 * Recolor happens once per skin on a canvas, producing a per-skin texture
 * manifest mirroring playerSprites' layout, cached in _skinManifests.  The
 * renderer calls getSkinnedFrame(skinId, ...) which falls back to the
 * default sheets while a skin is still baking (or for the default skin).
 * Per-skin caching means remote players each render their own tone.
 */

import { Rectangle, Texture } from 'pixi.js';
import { getFrame, SPRITE_VERSION } from './playerSprites.js';

/* ── Catalog ──
 * `target` is the LIT skin color for that tone (the in-sun base).  null =
 * default sheets, no recolor.  `swatch` is the picker dot color. */
export const SKIN_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#cd864b', target: null },
  { id: 'pale',    name: 'Pale',    swatch: '#f0cdaa', target: [240, 205, 170] },
  { id: 'tan',     name: 'Tan',     swatch: '#c88c50', target: [200, 140, 80] },
  { id: 'olive',   name: 'Olive',   swatch: '#b18a5e', target: [178, 138, 94] },
  { id: 'brown',   name: 'Brown',   swatch: '#9b6941', target: [155, 105, 65] },
  { id: 'deep',    name: 'Deep',    swatch: '#6e4b32', target: [112, 76, 50] },
  { id: 'ebony',   name: 'Ebony',   swatch: '#50382a', target: [82, 56, 39] },
];

export function skinTarget(id) {
  const e = SKIN_CATALOG.find(s => s.id === id);
  return (e && e.target) || null;
}

/* ── Selection store (localStorage) ── */
const STORAGE_KEY = 'bt-skin';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected skin id ('default' = original sheets). */
export function getSkin() { return _active; }

/** Set + persist the active skin.  Pre-bakes the manifest so the swap is
 *  ready by the next frame, and notifies listeners.  No-op if unchanged. */
export function setSkin(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  if (id && id !== 'default' && _skinManifests[id] === undefined) buildSkinManifest(id);
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onSkinChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── Recolor pipeline ── */
const FRAME_W = 256;
const FRAME_H = 256;
/* Luminance of the default lit skin (205,134,75), measured from the
   sheets.  Recolor scales the target tone by lum(pixel)/this. */
const DEFAULT_LIT_LUM = 149;
const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSES = ['stand', 'jog', 'hit', 'pickup', 'attack'];

/* skinId -> manifest { stand:{dir:[Texture]}, ... } | 'loading' | null(default) */
const _skinManifests = {};

function isSkinPixel(r, g, b, a) {
  /* warm tan: opaque, R>G>=B, clear R-B spread, bright enough to exclude
     the dark outline, AND a real R-G gap.  The R-G gate (skin ~40-70,
     green-pant highlights <20) keeps the green pants from speckling in the
     darker tones.  Matches lit skin through shadowed skin. */
  return a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
}

function recolorToCanvas(img, target) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const tr = target[0], tg = target[1], tb = target[2];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (isSkinPixel(r, g, b, a)) {
      const k = (0.299 * r + 0.587 * g + 0.114 * b) / DEFAULT_LIT_LUM;
      d[i]     = Math.min(255, Math.round(tr * k));
      d[i + 1] = Math.min(255, Math.round(tg * k));
      d[i + 2] = Math.min(255, Math.round(tb * k));
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

function buildSkinManifest(skinId) {
  const target = skinTarget(skinId);
  if (!target) { _skinManifests[skinId] = null; return Promise.resolve(); }
  _skinManifests[skinId] = 'loading';
  const man = { stand: {}, jog: {}, hit: {}, pickup: {}, attack: {} };
  const tasks = [];
  for (const pose of POSES) {
    for (const dir of SOURCE_DIRS) {
      if (pose === 'pickup' && dir !== 'south') continue;
      tasks.push((async () => {
        try {
          const img = await loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`);
          const cv = recolorToCanvas(img, target);
          const src = Texture.from(cv).source;
          src.scaleMode = 'linear';
          src.autoGenerateMipmaps = true;
          const frames = Math.max(1, Math.floor(cv.width / FRAME_W));
          const out = [];
          for (let i = 0; i < frames; i++) {
            out.push(new Texture({ source: src, frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H) }));
          }
          man[pose][dir] = out;
        } catch (e) { /* sheet missing -- getSkinnedFrame falls back */ }
      })());
    }
  }
  return Promise.all(tasks).then(() => { _skinManifests[skinId] = man; });
}

/** Recolored frame for (skinId, pose, dir, frameIdx).  Falls back to the
 *  default sheets for the default skin or while a skin is still baking, so
 *  the player is never invisible.  Mirroring is handled by the caller
 *  (scale.x), same as getFrame. */
export function getSkinnedFrame(skinId, pose, dir, frameIdx) {
  if (!skinId || skinId === 'default' || !skinTarget(skinId)) return getFrame(pose, dir, frameIdx);
  const man = _skinManifests[skinId];
  if (man === undefined) { buildSkinManifest(skinId); return getFrame(pose, dir, frameIdx); }
  if (man === 'loading' || !man) return getFrame(pose, dir, frameIdx);
  const set = man[pose] && man[pose][dir];
  if (!set || set.length === 0) return getFrame(pose, dir, frameIdx);
  const safeIdx = ((frameIdx % set.length) + set.length) % set.length;
  return set[safeIdx];
}
