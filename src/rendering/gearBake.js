/* ═══ v2.3.5014: A GEAR SHEET'S PIXELS, ON THE PAGE OR ON THE BODY BAKE'S WORKER ═══
 *
 * gearSheets.js _buildSheet's first steps, moved here verbatim with their
 * notes so the body bake's worker (bodyBakeWorker.js, type 'shirt') runs the
 * very same code: the sheet restored to its frame (gearSheetCanvas) and a
 * drawn shirt dressed (dressShirtSheet: colour, pattern and print,
 * playerDecal.js composeShirt).
 *
 * Why the worker: the crowd tour's d-prints (docs/specs/held-sweep.md, held-
 * budget.mjs `gear-sheet`): a drawn shirt was composed ON THE PAGE for each
 * player who wears one, the first time each pose was drawn, 121 to 192 ms
 * each, 8 to 13 times as ten players in drawn shirts swung, rolled and mined
 * beside you.  No window or Pixi here: every canvas is
 * `document.createElement('canvas')`, which the worker answers with a CPU
 * OffscreenCanvas (workerCanvas.js). */
import { composeShirt } from './playerDecal.js';   /* v2.3.1938 drawn shirts; v2.3.1941 colour + pattern + print, in one place */
import { upscaleToFrameHeight, antialiasUpscaledCanvas, downscaleByFactor, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1110 upscale; v2.3.1341 AA; v2.3.1408 fullset display-downscale */

const FRAME_W = 256;
const FRAME_H = 256;
/* v2.3.3696: the poses whose shirt print and pattern are anchored on the hem
   and the torso (composeShirt `frameW`), not each frame's chest box */
const STABLE_PRINT_POSES = new Set(['mine']);

/** A gear sheet's file (an Image, or the worker's ImageBitmap) restored to
 *  the frame it is drawn at: { img, fw, fh }. */
export function gearSheetCanvas(rawImg, slot) {
  /* restore a downscaled-on-disk gear sheet to the 256px frame (no-op for any
     native >=256 sheet, so the variable-height combat poses are untouched) */
  const rawH = rawImg.naturalHeight || rawImg.height || 0;
  /* v2.3.1120: gear stays at the FULL 256 frame (NOT display-downscaled like the
     body).  Gear is also consumed by the combat swing/bowshot stand-ins
     (effectsRenderer) at 256, so downscaling it here would shrink the legs there;
     instead the MAIN renderer's _placeGear divides the body transform by
     DISPLAY_DS to render this 256 gear at the right size over the smaller body.
     v2.3.1341 (owner: the chain belt / armor edges SHIMMER while jogging): the
     v2.3.1237 anti-alias cure was only ever applied to the BODY sheets, so
     128px-on-disk gear rendered with raw nearest-upscale stair-steps that
     crawl sub-pixel in motion.  antialiasUpscaledCanvas is the SAME resample,
     but size-preserving — the 256 contract above still holds (unlike
     bakeDisplayCanvas, which would shrink gear if DISPLAY_DS ever went back
     to 2).  Native >=256 sheets pass through untouched. */
  /* v2.3.1408 (DISPLAY_DS=2): the FULLSET figure sheets are display-
     downscaled like the body, NOT kept at the 256 gear contract.  The
     figure texture is assigned directly onto the body sprite
     (entityRenderer _fullsetFrame -> spriteBody.texture), whose
     transform expects display-sized frames — this is exactly why the
     figure path used to be guarded to DISPLAY_DS === 1.  Storing the
     fullset at display size makes the figure a drop-in body frame at
     any DS, so the guards lift and the painted knight stays on the
     figure path.  Overlay/combat gear sheets keep the full-256
     contract (the note above still holds for them).  fw/fh track the
     scaled frame for slicing. */
  /* v2.3.1434 (frost OOM report: "crashed after harvesting different
     resources over a short period"): the exact-texel treatment extends
     from the fullset figures to EVERY gear sheet that ships at the
     display size on disk (jog/stand/pickup/fish steel sheets are all
     128px-tall art; the "full 256" was always a nearest-neighbour
     pixel-double of these texels).  Storing them raw at 128 removes
     ~60MB of resident upscale canvases at DS=2 with the artist's
     exact pixels — the same owner-approved recipe as v2.3.1412 —
     and halves the lazy fish/mine harvest-pose loads that stacked
     the frost-zone peak back to the iOS kill line.  Consumers are
     size-agnostic: the masked bake stretch-draws by source rect, and
     _placeGear (entityRenderer) now normalizes by the texture's own
     frame width.  Sheets shipping any OTHER height (bowshot/cook/
     chop combat stand-in strips, 256-native art) keep the full-256
     contract unchanged. */
  const _fsDs = (slot === 'fullset' || (DISPLAY_DS > 1 && rawH === FRAME_H / DISPLAY_DS)) ? DISPLAY_DS : 1;
  let img;
  if (_fsDs > 1 && rawH === FRAME_H / _fsDs) {
    /* v2.3.1412 (owner: "the half res texture looks soft — it's a very
       simple armor sprite, maybe it can be compressed differently").
       The steel figure sheets ship 128px ON DISK — the 256 "full res"
       was always a nearest-neighbour 2x pixel-double of these texels.
       The v2.3.1408 pipeline (NN-upscale 128->256, anti-alias, Lanczos
       back down to 128) double-resampled the art into mush.  When the
       on-disk height already IS the display size, slice the RAW image
       untouched: the texture is the artist's exact pixels, same memory,
       no resampling anywhere. */
    img = rawImg;
  } else {
    img = antialiasUpscaledCanvas(upscaleToFrameHeight(rawImg, FRAME_H), rawH);
    if (_fsDs > 1) img = downscaleByFactor(img, _fsDs);
  }
  const fw = FRAME_W / _fsDs, fh = FRAME_H / _fsDs;
  return { img, fw, fh };
}

/** A drawn shirt's sheet: colour, pattern and print baked into a copy. */
export function dressShirtSheet(img, fw, fh, pose, stampArt) {
  /* v2.3.1938: the player's drawing, stamped into the sheet itself.  Baked
     here rather than drawn as a second sprite because the decal has to follow
     the torso through ~20 pose sheets x 5 facings x up to 26 frames — as part
     of the sheet it inherits every transform the shirt already gets, and the
     renderer keeps treating the shirt as one texture. */
  /* v2.3.1941: and the shirt COLOUR and PATTERN with it.  The colour used to
     be a multiplicative sprite tint applied to the finished texture, which
     multiplied the print too (a drawing on a black shirt came out black) and
     made a pattern impossible: a pattern is colour, and colour times a dark
     shirt is nothing.  composeShirt does tint -> pattern -> print in that
     order and the draw site uses no tint on the result. */
  /* v2.3.3696: the MINER's print and pattern stay on his chest -- anchored
     on the hem and the torso's middle (playerDecal torsoAnchors), the way a
     stand-in's strip is, since the mining swing raises the pickaxe over his
     head and the sleeve with it: placed by each frame's own chest box, the
     print jumped 10 px and changed size through the swing (the owner: "the
     shirt while mining still moves around a lot. It would be better to have
     it move less").  `frameW` turns the anchors on (STABLE_PRINT_POSES);
     the walking and standing sheets keep their own placement. */
  return composeShirt(img, fh, STABLE_PRINT_POSES.has(pose) ? { ...stampArt, frameW: fw } : stampArt);
}

/** v2.3.5014: a stand-in's shirt strip dressed (effectsRenderer.js
 *  _dressedShirtFrame's steps, moved here verbatim so the worker runs them
 *  too): the strip's frame width read off the art (`fw`, or a twin's own
 *  frame count), the one frame a pinned strip draws cut out first, then
 *  composeShirt with the strip's own `frameW`.  `opts`: composeShirt's (the
 *  pattern's cell already scaled for the pose).  Returns { cv, w, H, n }. */
export function dressShirtStrip(img, fw, twinFrames, one, opts) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const n0 = twinFrames || Math.max(1, Math.round(W / fw));
  const w = twinFrames ? Math.round(W / n0) : fw;
  /* the one frame a pinned strip draws, cut out first: the cook's 24
     garments are 23 nobody sees */
  let srcImg = img, n = n0;
  if (one != null && one < n0) {
    const c = document.createElement('canvas');
    c.width = w; c.height = H;
    c.getContext('2d').drawImage(img, one * w, 0, w, H, 0, 0, w, H);
    srcImg = c; n = 1;
  }
  const cv = composeShirt(srcImg, H, { ...opts, frameW: w });
  if (srcImg !== img) { srcImg.width = 0; srcImg.height = 0; }
  return { cv, w, H, n };
}
