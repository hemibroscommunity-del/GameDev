/* v2.3.1534: recoloured copies of the shared slime sheets.
 *
 * WHY THIS EXISTS RATHER THAN A TINT
 * ----------------------------------
 * Slime variants (mossSlime, mireWisp) are reskins: they render the SAME
 * sheets as a plain fodder slime and set `tint` on the sprite.  Pixi's tint is
 * MULTIPLICATIVE -- the drawn pixel is texture x tint -- so it can only ever
 * subtract light.  The slime art is saturated green (median hue 113 deg,
 * sat 0.56), which means the green channel is the bright one and the blue
 * channel is nearly empty.  Multiplying that by a blue gives a murky dark
 * teal, not a blue slime: measured on the real sheet, tinting by 0x3a7ad0
 * lands at mean RGB (32,94,72) -- still green-dominant.  No choice of tint
 * value fixes it, because you cannot multiply your way into a channel the
 * source does not have (owner asked for blue slimes and was "curious the
 * quality of recoloring on monsters" -- this is the answer: tint can darken a
 * green slime, it cannot recolour one).
 *
 * So the recolour is done the way the character traits already do it
 * (recolorHairToCanvas, characterPortrait.js): a BRIGHTNESS-RATIO retint.
 * Every opaque pixel is rewritten as target x (its luminance / a reference
 * luminance), so the art's own shading, highlights and dark outline survive
 * as light and dark versions of the new colour instead of being crushed.
 * Measured on the same sheet that lands at a clean blue with the dome
 * highlight and the rim shadow both intact.
 *
 * COST
 * ----
 * A recoloured colour costs one extra copy of the sheets it recolours
 * (~4MB of texture for the full set).  That is why this is per-zone: it is
 * built from preloadZoneAssets(zoneId) for the zones whose variants ask for
 * it, and only for the colours they ask for -- not on the global gate.
 * Repeat calls for the same colour are the same promise.
 */

import { Rectangle, Texture } from 'pixi.js';

const FRAME_W = 128;
const FRAME_H = 128;

/* Same URLs as slimeSprites.js.  Kept as a local list rather than imported
   because this module needs the raw IMAGE (to read pixels), not the Texture
   the loader there produces. */
const SHEET_URLS = {
  idle:       '/sprites/monsters/slime-idle-v5.png',
  shoot:      '/sprites/monsters/slime-shoot-v2.png',
  hit:        '/sprites/monsters/slime-hit-v1.png',
  death:      '/sprites/monsters/slime-death-v10.png',
  remnants:   '/sprites/monsters/slime-remnants-v1.png',
  projectile: '/sprites/monsters/slime-projectile-v1.png',
};

/* key 'r,g,b' -> { promise, frames: { state: [Texture, ...] } } */
const _cache = new Map();

function keyOf(rgb) {
  return rgb ? rgb[0] + ',' + rgb[1] + ',' + rgb[2] : '';
}

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* The retint itself.  Identical in spirit to recolorHairToCanvas: reference =
   the sheet's own mean opaque luminance (x1.15 so the mid-tones land ON the
   target rather than washed past it), then every pixel becomes target scaled
   by how bright it was.  One reference for the WHOLE sheet, not per frame, so
   the colour cannot drift between animation frames. */
function retintToCanvas(img, rgb) {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  let sum = 0, n = 0, maxL = 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l; n++; if (l > maxL) maxL = l;
    }
  }
  const ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
  const tr = rgb[0], tg = rgb[1], tb = rgb[2];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
      d[i] = Math.min(255, Math.round(tr * k));
      d[i + 1] = Math.min(255, Math.round(tg * k));
      d[i + 2] = Math.min(255, Math.round(tb * k));
    }
  }
  ctx.putImageData(data, 0, 0);
  return cv;
}

/** Build (once) the recoloured sheet set for `rgb`.  Returns a promise that
 *  resolves when every sheet is sliced, so preloadZoneAssets can await it and
 *  no slime is ever seen in the wrong colour. */
export function loadSlimeRecolor(rgb) {
  const key = keyOf(rgb);
  if (!key) return Promise.resolve();
  const hit = _cache.get(key);
  if (hit) return hit.promise;
  const entry = { promise: null, frames: Object.create(null) };
  entry.promise = Promise.all(Object.keys(SHEET_URLS).map(async (state) => {
    try {
      const img = await loadImg(SHEET_URLS[state]);
      const cv = retintToCanvas(img, rgb);
      const base = Texture.from(cv);
      const count = Math.max(1, Math.floor((cv.width || 0) / FRAME_W));
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push(new Texture({
          source: base.source,
          frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
        }));
      }
      entry.frames[state] = list;
    } catch (e) {
      /* sheet missing / canvas blocked -- callers fall back to the base
         sheet + tint, which is what shipped before this module existed */
    }
  })).then(() => {});
  _cache.set(key, entry);
  return entry.promise;
}

/** True once `state` is sliced for this colour.  Callers use this to decide
 *  between the recoloured frame and the plain sheet, so a not-yet-built
 *  colour degrades to the old look instead of to nothing. */
export function hasRecoloredState(rgb, state) {
  const e = _cache.get(keyOf(rgb));
  return !!(e && e.frames[state] && e.frames[state].length);
}

/** Recoloured frame Texture, or null if this colour/state isn't built. */
export function getRecoloredFrame(rgb, state, frameIdx) {
  const e = _cache.get(keyOf(rgb));
  const list = e && e.frames[state];
  if (!list || !list.length) return null;
  const len = list.length;
  return list[((frameIdx % len) + len) % len];
}
