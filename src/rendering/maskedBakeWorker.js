/* ═══ v2.3.2874: THE MASKED-BODY BAKE, OFF THE MAIN THREAD ═══
 *
 * Owner: "whenever I put on a piece of armor like legs or torso the game
 * would noticeably stutter".  The background prewarm (entityRenderer
 * prewarmMaskedBodyFrames / prewarmAltWornSets) bakes ~120-220 frames per
 * armour set; on the main thread each bake is a frame the game does not get.
 * Here the same pixel code (maskedBake.js) runs on another core, and the main
 * thread only crops and stores the result (_storeBake).
 *
 * A job carries every input as a whole-frame ImageBitmap, drawn on the main
 * thread from the live (possibly cropped) texture at its own size -- an exact
 * copy -- so `drawImage(bitmap, x, y, 256, 256)` here is the same nearest 2x
 * the inline bake's drawGearFrame does.  The reply is the 256 composite
 * already through bakeDisplayCanvas's exact-texel branch (DISPLAY_DS 2: every
 * second texel), which is the only branch the caller sends here.
 *
 * The fish pose's rod mask (toolRecolor) arrives once as a `{ type: 'rod' }`
 * message and is asked with fishRodAt's own arithmetic.
 *
 * ═══ v2.3.2904: LESS FOR THE MAIN THREAD TO DO, BOTH ENDS ═══
 *
 * Owner: "The game still drops in frame rate when you first wear a piece of
 * armor when running the game on my phone (iPhone 14 pro max)."  The render
 * path now sends its own misses here too (entityRenderer _localMaskedFrame),
 * so every millisecond a job costs the main thread is a millisecond of the
 * frames right after an equip.  Two costs moved over:
 *   - IN: an input is no longer redrawn into a whole-frame scratch canvas
 *     first.  It arrives as the crop it already is -- a bitmap of the texture's
 *     `frame` rectangle, cut straight from its sheet -- with its trim and orig,
 *     and is placed here with drawGearFrame's own arithmetic (gearSheets.js).
 *     A scratch canvas and a 2D context per input per bake are gone from the
 *     main thread.
 *   - OUT: the crop (entityRenderer _cropBakedFrame, i.e. gearSheets
 *     packTrimmed for one frame: a read-back of the whole frame, a scan, a
 *     second canvas) happens here, and the reply carries the cropped pixels
 *     and where they sit.  The main thread copies them into one canvas the
 *     size of the art.
 * The pixels drawn are the same, frame for frame (tools/qa/qa-bake-ident.mjs
 * fingerprints every baked frame drawn back from its crop). */
import { bakeMaskedCanvas } from './maskedBake.js';

const mk = (w, h) => new OffscreenCanvas(w, h);
let rod = null;   /* toolRecolor's { frames, fw, fh, w, mask } -- see fishRodAt there */
const rodAt = (i, u, v) => {
  const f = ((i % rod.frames) + rod.frames) % rod.frames;
  const x = Math.min(rod.w - 1, Math.floor(f * rod.fw + Math.max(0, Math.min(0.9999, u)) * rod.fw));
  const y = Math.min(rod.fh - 1, Math.floor(Math.max(0, Math.min(0.9999, v)) * rod.fh));
  return rod.mask[y * rod.w + x] === 1;
};
/* v2.3.2904: an input is { bm, tx, ty, fw, fh, ow, oh } -- the texture's frame
   pixels, where they sit in the whole frame (trim; 0,0 for an uncropped
   frame) and the whole frame's size (orig).  Drawn as gearSheets.drawGearFrame
   draws a cropped frame: scaled by the whole frame, placed at its trim. */
const drawer = (inp) => (inp && inp.bm ? (c, x, y, w, h) => {
  const sx = w / inp.ow, sy = h / inp.oh;
  c.drawImage(inp.bm, 0, 0, inp.fw, inp.fh, x + inp.tx * sx, y + inp.ty * sy, inp.fw * sx, inp.fh * sy);
} : null);

/* ═══ v2.3.2904: THE CROP, FOR ONE FRAME ═══
   gearSheets.packTrimmed with n = 1, which is all _cropBakedFrame ever asked
   of it -- KEEP IN STEP with it.  The frame's painted box, grown by PAD and
   snapped out to ALIGN (mip levels 1-3 average the same texels they did
   uncropped); a crop that would keep more than 0.9 of the frame is declined
   (null: store the frame whole); an empty frame keeps one blank ALIGN cell.
   With one cell both of packTrimmed's layouts put it at 0,0 in a canvas its
   own size, which is the canvas returned here. */
const TRIM_PAD = 4, TRIM_ALIGN = 8;
function cropFrame(dc, dctx) {
  const fw = dc.width, fh = dc.height;
  const data = dctx.getImageData(0, 0, fw, fh).data;
  const snapDn = (v) => Math.max(0, Math.floor(v / TRIM_ALIGN) * TRIM_ALIGN);
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
  for (let y = 0; y < fh; y++) {
    const row = y * fw;
    for (let x = 0; x < fw; x++) {
      if (data[(row + x) * 4 + 3] !== 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  let tx, ty, w, h;
  const blank = x1 < 0;
  if (blank) {
    tx = 0; ty = 0; w = TRIM_ALIGN; h = TRIM_ALIGN;
  } else {
    tx = snapDn(x0 - TRIM_PAD); ty = snapDn(y0 - TRIM_PAD);
    w = Math.min(fw, Math.ceil((x1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - tx;
    h = Math.min(fh, Math.ceil((y1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - ty;
  }
  if (w * h > 0.9 * fw * fh) return null;
  const cc = new OffscreenCanvas(w, h);
  const cctx = cc.getContext('2d');
  cctx.imageSmoothingEnabled = false;   /* 1:1 copies; never resample */
  if (!blank) cctx.drawImage(dc, tx, ty, w, h, 0, 0, w, h);
  return { cc, cell: { tx, ty, w, h, fw, fh } };
}

self.onmessage = (e) => {
  const j = e.data || {};
  if (j.type === 'rod') { rod = j.rod || null; return; }
  const reply = { id: j.id, bitmap: null, cell: null, beltPending: false, raw: false, err: null };
  const transfer = [];
  try {
    const r = bakeMaskedCanvas({
      mk,
      body: drawer(j.body),
      worn: (j.worn || []).map((w) => ({ k: w.k, draw: drawer(w.inp) })),
      dilate: j.dilate,
      poseInfo: j.poseInfo,
      belt: () => drawer(j.belt),
      fishRod: rod ? { has: () => true, at: rodAt } : null,
    });
    if (!r) {
      reply.raw = true;   /* body had no pixels yet: the caller draws the raw body, uncached */
    } else {
      const ds = j.ds || 2;
      const w = Math.max(1, Math.round(r.cv.width / ds)), h = Math.max(1, Math.round(r.cv.height / ds));
      const dc = new OffscreenCanvas(w, h);
      const dctx = dc.getContext('2d');
      dctx.imageSmoothingEnabled = false;   /* nearest: exact texel picks, as bakeDisplayCanvas */
      dctx.drawImage(r.cv, 0, 0, w, h);
      /* v2.3.2904: cropped here (see cropFrame); a declined crop sends the
         frame whole, as before, with no cell */
      let crop = null;
      if (j.crop) { try { crop = cropFrame(dc, dctx); } catch (e2) { crop = null; } }
      if (crop) { reply.bitmap = crop.cc.transferToImageBitmap(); reply.cell = crop.cell; }
      else reply.bitmap = dc.transferToImageBitmap();
      reply.beltPending = !!r.beltPending;
      transfer.push(reply.bitmap);
    }
  } catch (err) {
    reply.err = String((err && err.message) || err);
  }
  for (const inp of [j.body, j.belt, ...((j.worn || []).map((w) => w.inp))]) {
    try { if (inp && inp.bm && inp.bm.close) inp.bm.close(); } catch (e2) { /* already closed */ }
  }
  self.postMessage(reply, transfer);
};
