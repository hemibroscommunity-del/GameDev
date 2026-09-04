/* v2.3.1534: recoloured copies of a monster's shared sprite sheets.
 * v2.3.1535: generalised from slime-only (owner: "I'll be recoloring other
 * monsters to add variants, not just slimes").  Adding a colour variant of an
 * EXISTING monster is now a data change, not a new module -- see ADDING A
 * FAMILY at the bottom of this header.
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
 * (~4MB of texture for the slime set).  That is why this is per-zone: it is
 * built from preloadZoneAssets(zoneId) for the zones whose variants ask for
 * it, and only for the colours they ask for -- not on the global gate.
 * Repeat calls for the same (family, colour) are the same promise.
 *
 * ADDING A FAMILY
 * ---------------
 * 1. Add its sheet URLs to SHEET_SETS below, keyed by state name.  The state
 *    names are whatever the renderer asks for -- they only have to match the
 *    getRecoloredFrame() calls for that monster.
 * 2. Give the variant in monsterVariants.js a `recolor: [r,g,b]` and a
 *    `recolorFamily: '<key>'`.
 * 3. Make sure the renderer's frame lookup for that monster consults
 *    getRecoloredFrame() first (the slime path in entityRenderer is the
 *    worked example), and that it stops applying the multiplicative `tint`
 *    when a recolour is live -- otherwise the tint multiplies the recolour.
 * Nothing else: preloadZoneAssets already builds any recolour a zone's
 * variants declare, and every frame size is derived from the sheet.
 */

import { Rectangle, Texture } from 'pixi.js';

const FRAME_W = 128;
const FRAME_H = 128;

/* family -> { state: url }.  Kept as local lists rather than imported from
   each sprite loader because this module needs the raw IMAGE (to read
   pixels), not the Textures those loaders produce. */
const SHEET_SETS = {
  slime: {
    idle:       '/sprites/monsters/slime-idle-v5.png',
    shoot:      '/sprites/monsters/slime-shoot-v2.png',
    hit:        '/sprites/monsters/slime-hit-v1.png',
    death:      '/sprites/monsters/slime-death-v10.png',
    remnants:   '/sprites/monsters/slime-remnants-v1.png',
    projectile: '/sprites/monsters/slime-projectile-v1.png',
  },
};

/** The sheet family a variant recolours, or null if it declares no recolour.
 *  `useSlimeSheets` implies the slime family so the existing slime variants
 *  need no extra field. */
export function recolorFamilyOf(variant) {
  if (!variant || !variant.recolor) return null;
  if (variant.recolorFamily) return variant.recolorFamily;
  if (variant.useSlimeSheets) return 'slime';
  return null;
}

/* key 'family|r,g,b' -> { promise, frames: { state: [Texture, ...] } } */
const _cache = new Map();

function keyOf(family, rgb) {
  return (family && rgb) ? family + '|' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] : '';
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

/** Build (once) the recoloured sheet set for (family, rgb).  Returns a promise
 *  that resolves when every sheet is sliced, so preloadZoneAssets can await it
 *  and no monster is ever seen in the wrong colour. */
export function loadMonsterRecolor(family, rgb) {
  const key = keyOf(family, rgb);
  const urls = SHEET_SETS[family];
  if (!key || !urls) return Promise.resolve();
  const hit = _cache.get(key);
  if (hit) return hit.promise;
  const entry = { promise: null, frames: Object.create(null) };
  entry.promise = Promise.all(Object.keys(urls).map(async (state) => {
    try {
      const img = await loadImg(urls[state]);
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

/** True once `state` is sliced for this variant's colour.  Callers use this to
 *  decide between the recoloured frame and the plain sheet, so a not-yet-built
 *  colour degrades to the old look instead of to nothing.  Takes the VARIANT
 *  so call sites don't each have to resolve the family. */
export function hasRecoloredState(variant, state) {
  const fam = recolorFamilyOf(variant);
  const e = fam && _cache.get(keyOf(fam, variant.recolor));
  return !!(e && e.frames[state] && e.frames[state].length);
}

/* ═══ v2.3.2272: A RECOLOUR CAN BE GIVEN BACK ═══
 * Owner: "the game slows down after playing for a while."  Each entry here is
 * a full retinted COPY of a monster's sheets -- canvas-minted, so it is pure
 * new GPU memory rather than a second view of art already resident -- and the
 * cache had no delete in the file at all.  Per-zone loading built one on entry
 * to every zone with a recoloured variant and nothing ever handed it back;
 * mp-texdrift saw it as the ~4.5MB verdant kept after every other zone had
 * returned to its exact baseline.
 * Keyed by (family, colour) rather than by zone, so the caller passes the
 * variant and this resolves the key the same way the two readers above do --
 * there is no reverse index from zone to colour, and inventing one is how the
 * freed set drifts from the loaded set. */
export function freeMonsterRecolor(variant) {
  const fam = recolorFamilyOf(variant);
  const key = fam && keyOf(fam, variant.recolor);
  const e = key && _cache.get(key);
  if (!e) return false;
  _cache.delete(key);
  for (const state in e.frames) {
    const list = e.frames[state];
    /* Frames first without their source, then the source once: every frame in
       a state shares one canvas-backed TextureSource. */
    const src = list && list[0] && list[0].source;
    for (let i = 0; i < (list ? list.length : 0); i++) { try { list[i].destroy(false); } catch (err) { /* gone */ } }
    try { if (src && !src.destroyed) src.destroy(); } catch (err) { /* gone */ }
  }
  return true;
}

/** Recoloured frame Texture for this variant, or null if it isn't built. */
export function getRecoloredFrame(variant, state, frameIdx) {
  const fam = recolorFamilyOf(variant);
  const e = fam && _cache.get(keyOf(fam, variant.recolor));
  const list = e && e.frames[state];
  if (!list || !list.length) return null;
  const len = list.length;
  return list[((frameIdx % len) + len) % len];
}
