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
import { getHatRef } from './traits/hatColorCatalog.js'; /* v2.3.1109: shared per-hat recolour reference (call-time use; cyclic import is safe) */
import { upscaleToFrameHeight } from './spriteScale.js'; /* v2.3.1110: restore downscaled shirt sheet to 256 frame */

const FRAME = 256;
const DEFAULT_LIT_LUM = 149;            // default lit-skin luminance (see playerSkins)
const TRAIT_VER = '2.3.531';            // cache-bust for body-tops.json (matches entityRenderer)

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
export function recolorHairToCanvas(img, hairColor, refOverride) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (!hairColor) return cv;
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  /* reference = ~mean luminance of the hair's own opaque pixels, so the chosen
     color lands on the lit strands and shadows scale down (keeping the near-
     black outline dark, consistent with the rest of the character's outline).
     NOTE: this collapses very dark sprites (the long-hair sheet is ~88% pure
     black) into a black band when given a light color -- that style restricts
     its color picker to dark options for this reason (see BroTown hair colors).
     v2.3.1109: refOverride lets the caller pass ONE shared reference for all of
     a multi-direction trait (e.g. a hat across its 5 facings) so the recoloured
     tone is identical per angle instead of drifting with each sheet's own
     outline-vs-fabric pixel mix. */
  let ref = refOverride;
  if (!ref) {
    let sum = 0, n = 0, maxL = 1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += l; n++; if (l > maxL) maxL = l;
      }
    }
    ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
  }
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
  const { skin, pants, shoes, hair, hairColor, facialHair, facialHairColor, headwear, hatColor, shirt, shirtColor, dir } = opts || {};
  /* v2.3.715: composite OFFSCREEN and blit at the end.  This used to set
     canvas.width up front, which blanks the visible canvas synchronously --
     then the awaits below yield at least a frame, so every rotation /
     selection change flashed blank even with all assets cached.  The old
     frame now stays up until the new one is ready.  `__pseq` drops stale
     async draws that would land out of order during rapid rotation. */
  const seq = (canvas.__pseq = (canvas.__pseq || 0) + 1);
  const work = document.createElement('canvas');
  work.width = FRAME; work.height = FRAME;
  const ctx = work.getContext('2d');

  /* Preview angle -- any of the 8 compass directions (default southwest 3/4).
     The 3 mirrored views (west / northwest / southeast) reuse the opposite
     base sprite and flip the whole composite horizontally. */
  const _DMAP = { east: ['east', false], west: ['east', true], north: ['north', false],
    south: ['south', false], northeast: ['northeast', false], northwest: ['northeast', true],
    southwest: ['southwest', false], southeast: ['southwest', true] };
  const _dm = _DMAP[dir] || _DMAP.southwest;
  const DIR = _dm[0], _mirror = _dm[1];
  const wantHair = hair && hair !== 'none';
  const wantFh = facialHair && facialHair !== 'none';
  const wantHw = headwear && headwear !== 'none';
  const wantShirt = shirt && shirt !== 'none';

  /* Fire EVERY fetch concurrently.  This used to be three sequential await
     stages (body-tops -> body sprite -> traits), so on a cold load the preview
     sat blank-white for ~3 network round-trips; now it's one.  All loads are
     cached after the first draw, so later redraws/rotations are instant. */
  const [bodyTops, bodyImg, shirtImg, hairImg, hairMeta, fhImg, fhMeta, hwImg, hwMeta, maskImg, hatRef] = await Promise.all([
    loadBodyTops(),
    loadImage(`/sprites/player/stand-${DIR}.png?v=${SPRITE_VERSION}`),
    /* v2.3.757: the LAYERED shirt sheet (white-base, tinted below) -- the
       baked torso-retint shirt is retired, so the preview composites the
       same layer the game renders. */
    wantShirt ? loadImage(`/sprites/gear/shirt/tshirt/stand-${DIR}.png?v=2.3.760`).catch(() => null) : null,
    wantHair ? loadImage(`/sprites/traits/hair/${hair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantHair ? loadMeta('hair', hair) : null,
    wantFh ? loadImage(`/sprites/traits/facialhair/${facialHair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantFh ? loadMeta('facialhair', facialHair) : null,
    wantHw ? loadImage(`/sprites/traits/headwear/${headwear}/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    wantHw ? loadMeta('headwear', headwear) : null,
    /* hat's hair-clip mask (downward-filled helmet silhouette) -- present
       only for hats with clipsHair; 404 -> null -> no clipping. */
    wantHw ? loadImage(`/sprites/traits/headwear/${headwear}/hairmask/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    /* v2.3.1109: one shared recolour reference across the hat's facings so the
       preview's hat shade is identical per angle AND matches the in-game hat. */
    (wantHw && hatColor) ? getHatRef(headwear).catch(() => 0) : 0,
  ]);
  const crown = (bodyTops && bodyTops[`stand-${DIR}-0`]) || [FRAME / 2, 33];

  ctx.clearRect(0, 0, FRAME, FRAME);
  /* Zoom the figure to fill the preview window, then shift it DOWN a touch.
     The southwest sprite sits higher in the frame (crown ~y21 vs south's
     ~y33), so a tall top-hat clipped the top -- a modest zoom (1.06) plus a
     10px downward offset gives the hat headroom while the boots still show. */
  ctx.save();
  /* Per-direction zoom tweaks so every angle reads at a consistent size:
     the southwest source frames ~10% large (shrink it + its mirror SE), and
     south / north read a touch small (bump 5%). */
  const _DIRZOOM = { southwest: 0.9, south: 1.05, north: 1.05 };
  const Z = 1.06 * (_DIRZOOM[DIR] || 1), ZCX = FRAME / 2, ZCY = 64, YOFF = 10;
  if (_mirror) { ctx.translate(FRAME, 0); ctx.scale(-1, 1); }
  ctx.translate(0, YOFF);
  ctx.translate(ZCX, ZCY);
  ctx.scale(Z, Z);
  ctx.translate(-ZCX, -ZCY);
  /* v2.3.1283: OPT-IN ground shadow (login preview passes groundShadow;
     portraitDataUrl/headshot exports don't, so they stay clean) — a soft
     3/4-squashed contact ellipse painted FIRST so every figure layer
     composites over it.  Lives inside the zoom/mirror transform, so it
     tracks the boots at every angle and flips with the mirrored views
     for free.  The per-direction foot line mirrors the v2.3.744 finding
     (SW/E source frames sit higher in their 256 box).  Alpha/squash
     follow the in-game blob-shadow recipe (entityRenderer: black
     ellipse, ry≈0.35×rx). */
  if (opts && opts.groundShadow) {
    const _FOOT_Y = { south: 202, north: 202, east: 203, northeast: 206, southwest: 214 };
    const fy = _FOOT_Y[DIR] || 205;
    const g = ctx.createRadialGradient(FRAME / 2, fy, 2, FRAME / 2, fy, 40);
    g.addColorStop(0, 'rgba(0,0,0,0.30)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    /* squash the radial circle into the platform's 3/4 ellipse */
    ctx.translate(FRAME / 2, fy);
    ctx.scale(1, 0.34);
    ctx.translate(-FRAME / 2, -fy);
    ctx.fillStyle = g;
    ctx.fillRect(FRAME / 2 - 44, fy - 44, 88, 88);
    ctx.restore();
  }
  /* v2.3.757: the body always draws SHIRTLESS (baked shirt retired); the
     shirt is the layered white-base sheet tinted to the picked color and
     composited on top -- exactly what the game renders.  Null color = white
     tee (matches the in-game default tint). */
  ctx.drawImage(recolorBodyToCanvas(bodyImg, skinTarget(skin), pantsTarget(pants), shoesTarget(shoes), null, FRAME), 0, 0);
  if (shirtImg) {
    /* v2.3.1110: restore a downscaled-on-disk shirt sheet to the 256px frame
       (these drawImage calls read a 256x256 source rect). No-op at native. */
    const shirtUp = upscaleToFrameHeight(shirtImg, FRAME);
    let layer = shirtUp;
    if (shirtColor) {
      const sc = document.createElement('canvas');
      sc.width = FRAME; sc.height = FRAME;
      const sctx = sc.getContext('2d');
      sctx.drawImage(shirtUp, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      sctx.globalCompositeOperation = 'multiply';
      sctx.fillStyle = `rgb(${shirtColor[0]},${shirtColor[1]},${shirtColor[2]})`;
      sctx.fillRect(0, 0, FRAME, FRAME);
      sctx.globalCompositeOperation = 'destination-in';
      sctx.drawImage(shirtUp, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      layer = sc;
    }
    ctx.drawImage(layer, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
  }
  /* Beard BELOW hair so hair strands lay over the beard (per user -- the NW
     view had the beard covering the hair). */
  if (fhImg && fhMeta) placeTrait(ctx, facialHairColor ? recolorHairToCanvas(fhImg, facialHairColor) : fhImg, fhMeta, crown, DIR);
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
  if (hwImg && hwMeta) placeTrait(ctx, hatColor ? recolorHairToCanvas(hwImg, hatColor, hatRef) : hwImg, hwMeta, crown, DIR);
  ctx.restore();
  if (canvas.__pseq !== seq) return;   /* a newer draw superseded this one */
  canvas.width = FRAME; canvas.height = FRAME;
  canvas.getContext('2d').drawImage(work, 0, 0);
}

/** v2.3.715: fire-and-forget warm of every preview angle's sprites for the
 *  current selections, so the login rotate buttons / drag-to-rotate never
 *  wait on the network.  The promise caches above make the subsequent draws
 *  hit memory; expected misses (e.g. hairmask 404s) are harmless. */
export function prewarmPortraitDirs(opts) {
  const { hair, facialHair, headwear } = opts || {};
  loadBodyTops();
  for (const DIR of ['east', 'north', 'south', 'northeast', 'southwest']) {
    loadImage(`/sprites/player/stand-${DIR}.png?v=${SPRITE_VERSION}`).catch(() => {});
    if (hair && hair !== 'none') loadImage(`/sprites/traits/hair/${hair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => {});
    if (facialHair && facialHair !== 'none') loadImage(`/sprites/traits/facialhair/${facialHair}/${DIR}.png?v=${TRAIT_VER}`).catch(() => {});
    if (headwear && headwear !== 'none') {
      loadImage(`/sprites/traits/headwear/${headwear}/${DIR}.png?v=${TRAIT_VER}`).catch(() => {});
      loadImage(`/sprites/traits/headwear/${headwear}/hairmask/${DIR}.png?v=${TRAIT_VER}`).catch(() => {});
    }
  }
}

/* Head-and-shoulders crop box (in the zoomed 256 output) for the profile
   picture -- centered on the face, tall enough to clear a top-hat. */
const HEAD_CROP = { x: 80, y: 16, s: 96 };

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
