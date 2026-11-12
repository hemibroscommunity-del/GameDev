/* ═══ v2.3.4930: THE STRIP PACKER'S CANVAS STEPS, WITH NO PIXI ═══
 * gearSheets.js packTrimmed, moved here verbatim (it calls this and adds the
 * page's witness, canvasWitness.js), so the body bake's worker
 * (bodyBakeWorker.js) packs a sheet by the very same steps: its canvases are
 * `document.createElement('canvas')`, a CPU OffscreenCanvas there
 * (workerCanvas.js).  The rules are trimRules.js's. */
import { trimScanCell, trimCellOf, trimLayout } from './trimRules.js';

export function packTrimmedCore(img, fw, fh, n) {
  const W = img.width | 0, H = img.height | 0;
  if (!n) n = Math.max(1, Math.floor(W / fw));
  if (!W || !H || H < fh || fw !== Math.round(fw) || fh !== Math.round(fh) || n * fw > W) return null;
  let rd = null, data;
  try {
    rd = document.createElement('canvas'); rd.width = W; rd.height = fh;
    const rctx = rd.getContext('2d', { willReadFrequently: true });
    rctx.drawImage(img, 0, 0);
    data = rctx.getImageData(0, 0, W, fh).data;
  } catch (e) {
    if (rd) { rd.width = 0; rd.height = 0; }
    return null;
  }
  const cells = [];
  /* v2.3.3574: the first solid pixel the scan meets (alpha 128 and up), the
     picture's witness once packed (canvasWitness.js) */
  let wi = -1, wx = 0, wy = 0;
  for (let i = 0; i < n; i++) {
    const b = trimScanCell(data, W, i * fw, fw, fh);
    if (wi < 0 && b.sx >= 0) { wi = i; wx = b.sx; wy = b.sy; }
    cells.push(trimCellOf(b, fw, fh));
  }
  const L = trimLayout(cells, fw, fh, n);
  if (!L) { rd.width = 0; rd.height = 0; return null; }
  const cv = document.createElement('canvas');
  cv.width = L.W; cv.height = L.H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;   /* 1:1 copies; never resample */
  for (let i = 0; i < n; i++) {
    const c = cells[i];
    if (!c.blank) ctx.drawImage(rd, i * fw + c.tx, c.ty, c.w, c.h, c.ax, c.ay, c.w, c.h);
  }
  /* Safari holds canvas backing stores against a hard total until GC gets to
     them; zeroing hands the full-size scratch copy back now. */
  rd.width = 0; rd.height = 0;
  /* the first solid pixel, for the page's witness (gearSheets.js packTrimmed) */
  return { canvas: cv, cells, witness: wi >= 0 ? [cells[wi].ax + wx - cells[wi].tx, cells[wi].ay + wy - cells[wi].ty] : null };
}
