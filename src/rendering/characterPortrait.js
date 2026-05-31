/* Character portrait compositor.
 *
 * Builds a south-facing standing portrait of the player from the current
 * cosmetic selections (skin tone, hair style + color, facial hair,
 * headwear) by compositing the same sprite layers the in-game renderer
 * uses, with the SAME crown-anchored placement math (body-tops.json crown
 * + per-trait meta anchors / nudges / scale).  Output is an HTMLCanvasElement
 * the caller can show directly (login live-preview) or read as a data URL
 * (top-right profile picture).
 *
 * It mirrors entityRenderer._placeTrait for the single (pose=stand,
 * dir=south, frame=0, mirror=false) case -- see that function for the
 * authoritative version.  Skin recolor reuses playerSkins' tone + method;
 * hair recolor tints every opaque hair pixel by brightness ratio (the hair
 * sheet is hair-only, so no region isolation is needed).
 */

import { skinTarget, pantsTarget, shoesTarget, recolorBodyToCanvas } from './playerSkins.js';
import { SPRITE_VERSION } from './playerSprites.js';

const FRAME = 256;
const DEFAULT_LIT_LUM = 149;            // default lit-skin luminance (see playerSkins)
const TRAIT_VER = '2.3.389';            // cache-bust for body-tops.json (matches entityRenderer)

/* ── tiny async caches ── */
const _imgCache = new Map();            // url -> Promise<HTMLImageElement>
const _metaCache = new Map();           // 'cat/id' -> Promise<meta|null>
let _bodyTopsPromise = null;

function loadImage(url) {
  if (_imgCache.has(url)) return _imgCache.get(url);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
  _imgCache.set(url, p);
  return p;
}

function loadMeta(cat, id) {
  const key = cat + '/' + id;
  if (_metaCache.has(key)) return _metaCache.get(key);
  const p = fetch(`/sprites/traits/${cat}/${id}/meta.json?v=${TRAIT_VER}`)
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  _metaCache.set(key, p);
  return p;
}

function loadBodyTops() {
  if (!_bodyTopsPromise) {
    _bodyTopsPromise = fetch(`/sprites/player/body-tops.json?v=${TRAIT_VER}`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _bodyTopsPromise;
}

/* ── recolor helpers (return a 256-canvas) ──
   Body (skin + pants + shoes) reuses playerSkins.recolorBodyToCanvas so the
   preview matches the in-game recolor exactly. */
export function recolorHairToCanvas(img, hairColor) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (!hairColor) return cv;
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  /* reference = ~75th-percentile luminance of the hair's own opaque pixels,
     so the chosen color lands on the lit strands and shadows scale down. */
  let sum = 0, n = 0, maxL = 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l; n++; if (l > maxL) maxL = l;
    }
  }
  const ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
  const tr = hairColor[0], tg = hairColor[1], tb = hairColor[2];
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

/* Place one trait sprite (already recolored if needed) onto ctx using the
   stand/<dir> meta math.  Mirrors entityRenderer._placeTrait. */
function placeTrait(ctx, traitImg, meta, crown, dir) {
  if (!traitImg || !meta || !meta.fullFrame || !meta.anchors || !meta.anchors[dir]) return;
  const anchor = meta.anchors[dir];
  const cn = (meta.crownNudge && meta.crownNudge[dir]) || [0, 0];
  const pn = (meta.poseNudge && meta.poseNudge.stand && meta.poseNudge.stand[dir]) || [0, 0];
  const sc = (meta.scale && meta.scale[dir]) || 1;
  const sbp = (meta.scaleByPose && meta.scaleByPose.stand && meta.scaleByPose.stand[dir]) || 1;
  const dscale = sc * sbp;
  const tx = crown[0] + cn[0] + pn[0];
  const ty = crown[1] + cn[1] + pn[1];
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.translate(tx, ty);
  ctx.scale(dscale, dscale);
  ctx.drawImage(traitImg, -anchor[0], -anchor[1]);
  ctx.restore();
}

/* Render one trait to its own native FRAME canvas (used for hair so it can
   be mask-clipped before compositing). */
function renderTraitCanvas(traitImg, meta, crown, dir) {
  const cv = document.createElement('canvas');
  cv.width = FRAME; cv.height = FRAME;
  placeTrait(cv.getContext('2d'), traitImg, meta, crown, dir);
  return cv;
}

/** Composite the portrait into `canvas` (sized to FRAME).  Layers, in
 *  order: skin-recolored body, hair (recolored), facial hair, headwear.
 *  Unknown / 'none' / 'default' selections are skipped.  Resolves when the
 *  draw completes (after async asset loads).  Safe to call repeatedly. */
export async function drawCharacterPortrait(canvas, opts) {
  if (!canvas) return;
  const { skin, pants, shoes, hair, hairColor, facialHair, facialHairColor, headwear, hatColor } = opts || {};
  canvas.width = FRAME; canvas.height = FRAME;
  const ctx = canvas.getContext('2d');

  /* Preview/profile angle: southwest 3/4 view (per user request). */
  const DIR = 'southwest';
  const bodyTops = await loadBodyTops();
  const crown = (bodyTops && bodyTops[`stand-${DIR}-0`]) || [FRAME / 2, 33];

  /* Load everything in parallel, then draw in order. */
  const bodyImg = await loadImage(`/sprites/player/stand-${DIR}.png?v=${SPRITE_VERSION}`);

  const wantHair = hair && hair !== 'none';
  const wantFh = facialHair && facialHair !== 'none';
  const wantHw = headwear && headwear !== 'none';

  const [hairImg, hairMeta, fhImg, fhMeta, hwImg, hwMeta, maskImg] = await Promise.all([
    wantHair ? loadImage(`/sprites/traits/hair/${hair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantHair ? loadMeta('hair', hair) : null,
    wantFh ? loadImage(`/sprites/traits/facialhair/${facialHair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantFh ? loadMeta('facialhair', facialHair) : null,
    wantHw ? loadImage(`/sprites/traits/headwear/${headwear}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantHw ? loadMeta('headwear', headwear) : null,
    /* hat's hair-clip mask (downward-filled helmet silhouette) -- present
       only for hats with clipsHair; 404 -> null -> no clipping. */
    wantHw ? loadImage(`/sprites/traits/headwear/${headwear}/hairmask/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
  ]);

  ctx.clearRect(0, 0, FRAME, FRAME);
  /* Zoom the whole figure ~12% (centered high so the head/hat stays in
     frame and the boots reach the bottom) to fill the preview window
     better -- the raw sheet leaves wide empty margins. */
  ctx.save();
  const Z = 1.12, ZCX = FRAME / 2, ZCY = 64;
  ctx.translate(ZCX, ZCY);
  ctx.scale(Z, Z);
  ctx.translate(-ZCX, -ZCY);
  ctx.drawImage(recolorBodyToCanvas(bodyImg, skinTarget(skin), pantsTarget(pants), shoesTarget(shoes)), 0, 0);
  if (hairImg && hairMeta) {
    /* Render hair to its own canvas so it can be clipped to the hat's
       silhouette mask (same as the in-game _clipHairToHat) before
       compositing -- keeps long hair from poking out the top/sides of a
       helmet while the forehead hair under the brim still shows. */
    const hairCv = renderTraitCanvas(recolorHairToCanvas(hairImg, hairColor), hairMeta, crown, DIR);
    if (hwImg && hwMeta && hwMeta.clipsHair && maskImg) {
      const maskCv = renderTraitCanvas(maskImg, hwMeta, crown, DIR);
      const hctx = hairCv.getContext('2d');
      hctx.globalCompositeOperation = 'destination-in';
      hctx.drawImage(maskCv, 0, 0);
    }
    ctx.drawImage(hairCv, 0, 0);
  }
  if (fhImg && fhMeta) placeTrait(ctx, facialHairColor ? recolorHairToCanvas(fhImg, facialHairColor) : fhImg, fhMeta, crown, DIR);
  if (hwImg && hwMeta) placeTrait(ctx, hatColor ? recolorHairToCanvas(hwImg, hatColor) : hwImg, hwMeta, crown, DIR);
  ctx.restore();
}

/* Head-and-shoulders crop box (in the zoomed 256 output) for the profile
   picture -- centered on the face, tall enough to clear a top-hat. */
const HEAD_CROP = { x: 80, y: 4, s: 96 };

/** Convenience: render a portrait to a fresh canvas and return its PNG data
 *  URL.  `headshot` returns a square head-and-shoulders crop (for the
 *  top-right profile picture); otherwise the full figure.  Returns '' on
 *  failure. */
export async function portraitDataUrl(opts, headshot) {
  try {
    const cv = document.createElement('canvas');
    await drawCharacterPortrait(cv, opts);
    if (!headshot) return cv.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = HEAD_CROP.s; out.height = HEAD_CROP.s;
    out.getContext('2d').drawImage(cv, HEAD_CROP.x, HEAD_CROP.y, HEAD_CROP.s, HEAD_CROP.s, 0, 0, HEAD_CROP.s, HEAD_CROP.s);
    return out.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}
