/* ═══ v2.3.3752: ONE MASKED BAKE OF A LOOK DRAWN FROM THE NUMBERS ═══
 *
 * The same steps wherever it runs -- the bake worker (maskedBakeWorker.js), or
 * the page when there is no worker (entityRenderer _runLookBakeInline):
 *   1. the frame coloured from the sheet's numbers in this look (lookExpand.js),
 *   2. the masked bake over it, unchanged (maskedBake.js),
 *   3. its display frame (nearest, as every masked frame is), and
 *   4. what it decided: a bit a display texel, and the residue (lookMaskOf).
 *
 *   lookBake(sheet, job, mk) -> { raw } | { show, residue, counts, beltPending }
 *     sheet  lookSheetParse's
 *     job    { cell, row, worn: [{ k, draw }], belt: draw | null, dilate, poseInfo, ds, fishRod }
 *     mk     (w, h) -> a canvas whose 2D context reads back on the CPU
 */
import { bakeMaskedCanvas } from './maskedBake.js';
import { lookFrameRGBA, lookMaskOf } from './lookExpand.js';

export function lookBake(sheet, job, mk) {
  const c = job.cell;
  const f = lookFrameRGBA(sheet, c, job.row);
  const cv = mk(Math.max(1, c.w), Math.max(1, c.h));
  if (c.w && c.h) cv.getContext('2d', { willReadFrequently: true }).putImageData(new ImageData(f.rgba, c.w, c.h), 0, 0);
  /* drawn as gearSheets.drawGearFrame draws a cropped frame: scaled by the
     whole frame, placed at its trim */
  const body = (g, x, y, w, h) => {
    const sx = w / c.ow, sy = h / c.oh;
    g.drawImage(cv, 0, 0, c.w, c.h, x + c.tx * sx, y + c.ty * sy, c.w * sx, c.h * sy);
  };
  const r = bakeMaskedCanvas({ mk, body, worn: job.worn, dilate: job.dilate, poseInfo: job.poseInfo, belt: () => job.belt, fishRod: job.fishRod || null });
  if (!r) return { raw: true };
  const ds = job.ds || 2;
  const dc = mk(c.ow, c.oh);
  const dctx = dc.getContext('2d', { willReadFrequently: true });
  dctx.imageSmoothingEnabled = false;   /* nearest: exact texel picks, as bakeDisplayCanvas */
  dctx.drawImage(r.cv, 0, 0, Math.round(r.cv.width / ds), Math.round(r.cv.height / ds));
  const out = dctx.getImageData(0, 0, c.ow, c.oh).data;
  if (job.keepDisplay) return { display: dc };   /* QA: the bake's own picture (mp-lookarmour's reference) */
  const m = lookMaskOf(out, c.ow, c.oh, f.pm, c);
  return { show: m.show, residue: m.residue, counts: m.counts, beltPending: !!r.beltPending };
}
