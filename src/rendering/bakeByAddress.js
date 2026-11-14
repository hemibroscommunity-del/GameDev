/* ═══ v2.3.5043: A FRAME OF A SHEET THAT IS AN IMAGE GOES AS ITS ADDRESS ═══
 *
 * held-budget.mjs `masked-bake`: what the page still did for an armour bake
 * (entityRenderer.js _runBake, _runLookBake) was cut each input out of its
 * sheet (createImageBitmap(res, x, y, w, h)): 5 to 15 ms a bake, the body, the
 * belt and each worn piece back to back, as another player's armour came on
 * screen (the crowd tour's c-armour stations, d-prints and h-eight; 32.7 ms
 * once at the main tour's `armour`).  Every such sheet measured was an image
 * of a packed sheet at a blob: address (gearSheets.js keepPackedAsImage), so
 * the page now sends the address and the rectangle ({ url, sx, sy, ... }) and
 * the worker fetches and decodes the sheet itself, keeps a few
 * (maskedBakeWorker.js sheetOf), and draws the rectangle where it drew the cut
 * frame.  The bake draws every input with smoothing off, so a rectangle of the
 * whole sheet gives the very texels the cut did (`window.__btBakeUrlCheck =
 * true`: the page cuts as well, and the worker compares the two, input by
 * input: __btBakeWorker().byUrl).  A canvas, or an address the worker could
 * not read (it answers `urlFail`), is cut here as before, and that address is
 * not tried again.  `?bakeurl=0`: every input cut here, as before.
 *
 * v2.3.5043, after the gatekeeper's sitting 4 (docs/plan/census/review-z4.md,
 * #1700): this lived in entityRenderer.js, and moved here to keep that file
 * under its line (tools/guards/four-lines).  And an address the worker was
 * still READING when it was let go as stuck (entityRenderer.js
 * _bakeWorkerWatch, 6 s on one job) is refused: a stuck kill answers no
 * `urlFail`, so an address it hung on was sent again to the next worker, and
 * the next.  The page keeps each job's addresses until the worker says they
 * are read (`urlsRead`, maskedBakeWorker.js) or answers; only those still
 * being read are refused (bakeWorkerStuck).  Not every address of a stuck
 * job: on this QA box the worker is let go as stuck about 3 times a minute
 * beside two armoured players, past its reads, and refusing those would send
 * every input back to being cut on the page.
 */
import { gearInput } from './gearNumbers.js';   /* v2.3.5000: the bakes read the armour's numbers */

const OFF = (() => { try { return typeof location !== 'undefined' && /[?&]bakeurl=0\b/.test(location.search || ''); } catch (e) { return false; } })();
const _refused = new Set();
/* keptMB: the sheets the worker holds (its last reply; mp-membudget cannot see a worker's bitmaps) */
const _stats = { sent: 0, cut: 0, refused: 0, retried: 0, stuck: 0, checked: 0, same: 0, differ: 0, lastDiffer: null, keptMB: 0, keptMaxMB: 0 };

function _refuse(urls) {
  for (const u of urls) if (_refused.size < 1024) _refused.add(u);
  _stats.refused += urls.length;
}

const _reading = new Map();   /* job id -> the addresses its worker has not said it read */

/** The bitmaps a job (`id`) hands over: each input's own, and (QA) the page's
 *  cut beside an address.  The addresses it sends are kept until read. */
export function bakeTransfer(list, id) {
  const out = [], urls = [];
  for (const x of list) { if (!x) continue; if (x.bm) out.push(x.bm); if (x.qaBm) out.push(x.qaBm); if (x.url) urls.push(x.url); }
  if (urls.length && id) { if (_reading.size >= 64) _reading.clear(); _reading.set(id, urls); }
  return out;
}
/** The worker read job `id`'s addresses (its `urlsRead`) */
export function bakeUrlsRead(id) { _reading.delete(id); }
/** The worker let go as stuck: what it was still reading is refused */
export function bakeWorkerStuck() {
  for (const urls of _reading.values()) { _refuse(urls); _stats.stuck++; }
  _reading.clear();
}

/** The worker's word on the addresses: its QA comparisons counted; true when
 *  one could not be read and the job is to run again with every such input
 *  cut here (once: the address is refused from now on). */
export function bakeUrlAnswer(reply, job) {
  if (reply && reply.id) _reading.delete(reply.id);
  if (reply && typeof reply.kept === 'number') {
    _stats.keptMB = Math.round(reply.kept / 104857.6) / 10;
    if (_stats.keptMB > _stats.keptMaxMB) _stats.keptMaxMB = _stats.keptMB;
  }
  if (reply && reply.qa) {
    for (const q of reply.qa) { _stats.checked++; if (q.same) _stats.same++; else { _stats.differ++; _stats.lastDiffer = q; } }
  }
  if (!reply || !reply.urlFail || !reply.urlFail.length || job._cutAgain) return false;
  _refuse(reply.urlFail);
  _stats.retried++;
  job._cutAgain = true;
  return true;
}

/** One input of a bake: a frame of the armour's numbers is named, an image at
 *  an address goes as the address, anything else is cut here.
 *  -> Promise<input | null> */
export function frameInput(tex) {
  /* v2.3.5000: a frame of the walking armour's colour numbers is named, not
     copied: the worker has its sheet (_sendGearSheets) and expands the cell */
  const gi = gearInput(tex);
  if (gi) return Promise.resolve(gi);
  const f = tex && tex.frame, o = tex && (tex.orig || tex.frame);
  const res = tex && tex.source && tex.source.resource;
  if (!f || !o || !res || !(f.width > 0) || !(f.height > 0)) return Promise.resolve(null);
  const t = tex.trim;
  const url = (!OFF && typeof HTMLImageElement !== 'undefined' && res instanceof HTMLImageElement) ? (res.currentSrc || res.src || '') : '';
  if (url && !_refused.has(url)) {
    _stats.sent++;
    const inp = { url, sx: f.x, sy: f.y, tx: t ? t.x : 0, ty: t ? t.y : 0, fw: f.width, fh: f.height, ow: o.width, oh: o.height };
    let qa = false;
    try { qa = typeof window !== 'undefined' && window.__btBakeUrlCheck === true; } catch (e) { qa = false; }
    if (!qa) return Promise.resolve(inp);
    /* QA: the page's own cut too, for the worker to compare */
    let pq;
    try { pq = createImageBitmap(res, f.x, f.y, f.width, f.height); } catch (e) { return Promise.resolve(inp); }
    return pq.then((qaBm) => ({ ...inp, qaBm }), () => inp);
  }
  _stats.cut++;
  let p;
  try { p = createImageBitmap(res, f.x, f.y, f.width, f.height); } catch (e) { return Promise.resolve(null); }
  return p.then((bm) => ({
    bm, tx: t ? t.x : 0, ty: t ? t.y : 0, fw: f.width, fh: f.height, ow: o.width, oh: o.height,
  }), () => null);
}

/** __btBakeWorker().byUrl */
export function bakeUrlProbe() {
  return { ..._stats, refusedN: _refused.size, off: OFF };
}
