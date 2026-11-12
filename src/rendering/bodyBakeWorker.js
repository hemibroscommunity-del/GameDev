/* ═══ v2.3.4930: ANOTHER PLAYER'S LOOK, BAKED OFF THE PAGE ═══
 *
 * The crowd tour (docs/specs/held-sweep.md "The crowd tour", station a-ink):
 * a player with a tattoo or a trouser print beside you, each pose and facing
 * they showed for the first time was a body sheet recoloured ON THE PAGE,
 * 114 to 720 ms each, a dozen in the first 20 s; the fish sheet of every look
 * that fishes in a shirt or armour, 92 to 198 ms (b-fish).  The look palette
 * (look-palette.md) cannot draw those from its numbers: a drawing's ink is
 * shaded by the body under it and an eye style's erase samples the face, both
 * in the look's own colours.  So the bake stays exactly what it was, and runs
 * HERE, on another core: the page asks (bodyBake.js) and gets back a PNG of
 * the packed sheet and its cells, and only makes the texture.
 *
 * The steps are the page's own functions, not copies:
 *   1. the sheet's file, the one the page would load (the lossless .webp twin
 *      when there is one: look-palette.md, "bake from what the game reads");
 *   2. bodyRecolor.js bakeBodyFull (the recolour, the drawings, the eye
 *      style, the rod's pine) -- playerSkins.js buildBodySheet calls it too;
 *   3. spriteScale.js bakeDisplayCanvas and, for jog-northeast,
 *      stripDetachedComponents (buildBodySheet's next two lines);
 *   4. trimPack.js packTrimmedCore (gearSheets.js packTrimmed's steps).
 * Every canvas is a CPU OffscreenCanvas (workerCanvas.js, imported first).
 *
 * The head sheets an armoured player shows (`<pose>-<dir>-head`, the face
 * over a knight's figure and a pickup's crouch: playerSkins.js
 * _buildPickupHeadSheet), recoloured per look the same way (28 to 164 ms a
 * sheet as an armoured player circled you), come here too: bodyRecolor.js
 * bakeHeadFull, then the same pack.
 *
 * And a peer's stand-ins with drawings (their sword and bow bodies, torso
 * strips and jog legs: effectsRenderer.js _remoteBodyFramesFor and
 * _remoteSheetFramesFor), which were recoloured INSIDE the frame the first
 * time they swung (up to 564 ms in the crowd tour's a-ink): type 'standin'.
 *
 * A job: { id, type: 'body' | 'head' | 'standin', urls: [first, fallback], job:
 * bakeBodyFull's or bakeHeadFull's, fw, fh, raw }
 * The reply: { id, ok, png (Blob), W, H, cells | null, frames, ms } or
 * { id, ok: false, why } ('load: ...' when the file did not load).  `raw` (QA, bodyBake.js __btBodyWorkerCompare): the
 * packed canvas's bytes as well, to compare with the page's bake. */
import './workerCanvas.js';
import { bakeBodyFull, bakeHeadFull, recolorBodyToCanvas, FRAME_W } from './bodyRecolor.js';
import { bakeDisplayCanvas, stripDetachedComponents } from './spriteScale.js';
import { packTrimmedCore } from './trimPack.js';

async function loadBitmap(urls) {
  let last = null;
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) { last = 'http ' + r.status; continue; }
      return await createImageBitmap(await r.blob());
    } catch (e) { last = String(e && e.message || e); }
  }
  throw new Error('load: ' + (last || '?'));
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  if (m.type !== 'body' && m.type !== 'head' && m.type !== 'standin') return;
  const t0 = performance.now();
  let bm = null;
  try {
    bm = await loadBitmap(m.urls);
    const tLoad = performance.now();
    const j = m.job;
    let full, cv, frames;
    if (m.type === 'standin') {
      /* effectsRenderer.js _remoteBodyFramesFor / _remoteSheetFramesFor's
         recolour (a peer's sword or bow body, torso strip or jog legs, with
         their drawings), then _sliceStandIn's pack */
      full = recolorBodyToCanvas(bm, j.skinT, j.pantsT, j.shoesT, null, j.fh, null, null, j.art, j.fw,
        undefined, undefined, undefined, j.legsUnder || undefined, j.torso ? true : undefined);
      cv = full;
      frames = Math.max(1, Math.round(cv.width / m.fw));
    } else if (m.type === 'head') {
      /* _buildPickupHeadSheet's steps: the bake halves it itself */
      full = null;
      cv = bakeHeadFull(bm, j);
      frames = Math.max(1, Math.floor(cv.width / m.fw));
    } else {
      full = bakeBodyFull(bm, j);
      /* buildBodySheet's own lines after the recolour */
      frames = Math.max(1, Math.floor(full.width / FRAME_W));
      cv = bakeDisplayCanvas(full, bm.height || 0);
      if (j.pose === 'jog' && j.dir === 'northeast') cv = stripDetachedComponents(cv, frames);
    }
    const tBake = performance.now();
    const tDisp = tBake;
    const packed = packTrimmedCore(cv, m.fw, m.fh, frames);
    const tPack = performance.now();
    const out = packed ? packed.canvas : cv;
    let raw = null;
    if (m.raw) raw = out.getContext('2d').getImageData(0, 0, out.width, out.height).data.buffer;
    const png = await out.convertToBlob({ type: 'image/png' });
    const reply = { id: m.id, ok: true, png, W: out.width, H: out.height, cells: packed ? packed.cells : null,
      frames, ms: performance.now() - t0, raw,
      t: { load: tLoad - t0, bake: tBake - tLoad, pack: tPack - tDisp, png: performance.now() - tPack } };
    /* the canvases are this job's alone: handed back now (Safari holds their
       backing stores against a total until a collection) */
    try { if (full) { full.width = 0; full.height = 0; } } catch (e) { /* ok */ }
    try { if (cv !== full) { cv.width = 0; cv.height = 0; } } catch (e) { /* ok */ }
    try { if (out !== cv) { out.width = 0; out.height = 0; } } catch (e) { /* ok */ }
    self.postMessage(reply, raw ? [raw] : []);
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, why: String(e && e.message || e) });
  } finally {
    try { if (bm && bm.close) bm.close(); } catch (e) { /* ok */ }
  }
};
