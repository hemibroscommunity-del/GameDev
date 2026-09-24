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
 * message and is asked with fishRodAt's own arithmetic. */
import { bakeMaskedCanvas } from './maskedBake.js';

const mk = (w, h) => new OffscreenCanvas(w, h);
let rod = null;   /* toolRecolor's { frames, fw, fh, w, mask } -- see fishRodAt there */
const rodAt = (i, u, v) => {
  const f = ((i % rod.frames) + rod.frames) % rod.frames;
  const x = Math.min(rod.w - 1, Math.floor(f * rod.fw + Math.max(0, Math.min(0.9999, u)) * rod.fw));
  const y = Math.min(rod.fh - 1, Math.floor(Math.max(0, Math.min(0.9999, v)) * rod.fh));
  return rod.mask[y * rod.w + x] === 1;
};
const drawer = (bm) => (bm ? (c, x, y, w, h) => c.drawImage(bm, x, y, w, h) : null);

self.onmessage = (e) => {
  const j = e.data || {};
  if (j.type === 'rod') { rod = j.rod || null; return; }
  const reply = { id: j.id, bitmap: null, beltPending: false, raw: false, err: null };
  const transfer = [];
  try {
    const r = bakeMaskedCanvas({
      mk,
      body: drawer(j.body),
      worn: (j.worn || []).map((w) => ({ k: w.k, draw: drawer(w.bm) })),
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
      reply.bitmap = dc.transferToImageBitmap();
      reply.beltPending = !!r.beltPending;
      transfer.push(reply.bitmap);
    }
  } catch (err) {
    reply.err = String((err && err.message) || err);
  }
  for (const bm of [j.body, j.belt, ...((j.worn || []).map((w) => w.bm))]) {
    try { if (bm && bm.close) bm.close(); } catch (e2) { /* already closed */ }
  }
  self.postMessage(reply, transfer);
};
