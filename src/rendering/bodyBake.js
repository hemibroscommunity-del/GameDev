/* ═══ v2.3.4930: THE PAGE'S SIDE OF THE BODY BAKE'S WORKER ═══
 *
 * playerSkins.js buildBodySheet hands its bake here (bodyBakeWorker.js runs
 * the very same steps on another core) and gets back the packed sheet as an
 * image, decoded off the page's thread (`img.decode()`), with its cells: all
 * the page does is make the texture.  That image is what the page's own bake
 * ends as anyway (gearSheets.js keepPackedAsImage: a packed sheet is kept as
 * a PNG of itself, keepAsImage.js), so what is drawn, and what survives a
 * black screen's rebuild, is the same.
 *
 * Off, and the page bakes as before:
 *   - behind a loading screen (loadingGate.js worldReady): the bakes the
 *     loading screen waits for are done soonest on the page;
 *   - `?bodyworker=0` (one tab, to compare);
 *   - no Worker, OffscreenCanvas or createImageBitmap;
 *   - an address that asks for one of the bake's old ways (`?garmentspecks=0`,
 *     `?pickwood=0`, `?toolsolid=0`, `?bakeread=0`): those switches are read
 *     where there is a window, and the worker has none;
 *   - a QA probe that reads the page's bake (`__btGridProbe`, `__btInkProbe`,
 *     `__btTrimVerify`), checked at each bake.  (`__btProbe`, which every QA
 *     page sets, is the stand-ins' own: buildBodySheet's bake never reads it.)
 * A job the worker could not do (it failed to start, the file did not load,
 * any error, no answer in 20 s) answers null, and the caller bakes that sheet on the page as
 * before, with its own retries.
 *
 * QA: window.__btBodyWorker() (what it did), and
 * window.__btBodyWorkerCompare(jobs) (the same sheets baked both ways, byte
 * by byte: mp-bodyworker). */
import { noteMade } from '../debug/madeLog.js';
import { worldReady } from '../ui/loadingGate.js';

const _OFF = (() => {
  try {
    const q = (typeof location !== 'undefined' && location.search) || '';
    if (/[?&]bodyworker=0(&|$)/.test(q)) return 'address';
    if (/[?&](garmentspecks=0|pickwood=0|toolsolid=(0|off|false)|bakeread=0)(&|$)/.test(q)) return 'old-bake';
  } catch (e) { /* on */ }
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return 'no-worker';
  return null;
})();

const _stats = { off: _OFF, asked: 0, done: 0, failed: 0, inlineProbe: 0, loading: 0, ms: 0, pageMs: 0, lastWhy: null };
let _w = null, _dead = false, _seq = 0;
const _pending = new Map();

function _worker() {
  if (_w || _dead) return _w;
  try { _w = new Worker(new URL('./bodyBakeWorker.js', import.meta.url), { type: 'module' }); } catch (e) { _w = null; _dead = true; return null; }
  _w.onmessage = (ev) => {
    const m = ev.data || {};
    const p = _pending.get(m.id);
    if (!p) return;
    _pending.delete(m.id);
    p(m);
  };
  /* a worker that dies (a script that failed to load, an error at the top):
     every job waiting on it, and every later one, bakes on the page */
  _w.onerror = () => {
    _dead = true;
    try { _w.terminate(); } catch (e) { /* gone */ }
    _w = null;
    for (const [id, p] of _pending) { _pending.delete(id); p({ ok: false, why: 'worker died' }); }
  };
  return _w;
}

/** Bake on the worker now?  Checked at each bake (the QA probes are set by a
 *  test at any time). */
export function bodyWorkerWanted() {
  if (_OFF || _dead) return false;
  /* behind a loading screen (the first one, a zone's veil) the page bakes, as
     it always has: that is what the loading screen is for, and the bakes it
     waits for (your own look, the townsfolk's) are done soonest on the page.
     Measured here (mp-bodyworker): baked on the worker while this box's one
     page also starts the world, 53 of 62 sheets were still waiting when the
     loading screen went.  In play (another player walks up), the worker. */
  if (!worldReady()) { _stats.loading++; return false; }
  try {
    if (typeof window !== 'undefined' && (window.__btGridProbe || window.__btInkProbe || window.__btTrimVerify)) {
      _stats.inlineProbe++;
      return false;
    }
  } catch (e) { /* on */ }
  return true;
}

/* the file the page would load (webpImage.js loadWebpOrPng's order), as
   whole addresses: a worker resolves a relative one against its own script */
function _abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

/* a job not answered in this long is the page's: it bakes the sheet itself,
   with its own retries and later rounds (a late answer is dropped) */
const WORKER_MS = 20000;
function _ask(msg, transfer) {
  const w = _worker();
  if (!w) return Promise.resolve({ ok: false, why: 'no worker' });
  const id = ++_seq;
  return new Promise((res) => {
    const t = setTimeout(() => { if (_pending.delete(id)) res({ ok: false, why: 'timeout' }); }, WORKER_MS);
    _pending.set(id, (m) => { clearTimeout(t); res(m); });
    try { w.postMessage({ ...msg, id }, transfer || []); } catch (e) { clearTimeout(t); _pending.delete(id); res({ ok: false, why: 'post' }); }
  });
}

/** Bake one sheet on the worker: `type` 'body' (bodyRecolor.js bakeBodyFull)
 *  or 'head' (bakeHeadFull).  `urls`: the file first, then its fallback
 *  (webpImage.js spriteUrls).  Resolves { img, url, W, H, cells | null,
 *  frames } once the image is decoded; false when the FILE did not load (the
 *  caller's own retries take over: the page asks again, as it did); null for
 *  anything else (the caller bakes it on the page). */
export function bakeOnWorker(type, urls, job, fw, fh) {
  _stats.asked++;
  return _ask({ type, urls: urls.map(_abs), job, fw, fh }).then((m) => {
    if (!m || !m.ok || !m.png) {
      _stats.failed++; _stats.lastWhy = (m && m.why) || 'no answer';
      return (m && /^load: /.test(m.why || '')) ? false : null;
    }
    _stats.ms += m.ms || 0;
    let url = null;
    try { url = URL.createObjectURL(m.png); } catch (e) { _stats.failed++; return null; }
    const img = new Image();
    img.src = url;
    /* decoded here, off the page's thread, so the first draw's upload does
       not decode it in the frame */
    return img.decode().then(() => {
      if (img.naturalWidth !== m.W || img.naturalHeight !== m.H) throw new Error('size');
      _stats.done++;
      return { img, url, W: m.W, H: m.H, cells: m.cells, frames: m.frames, ms: m.ms };
    }).catch(() => {
      try { URL.revokeObjectURL(url); } catch (e) { /* gone */ }
      _stats.failed++; _stats.lastWhy = 'decode';
      return null;
    });
  });
}

/** The page's part of a worker bake, for the frame meter: the texture made
 *  from the image (playerSkins.js). */
export function noteWorkerSheet(label, pageMs) {
  _stats.pageMs += pageMs;
  noteMade(label, pageMs, label);
}

if (typeof window !== 'undefined') {
  window.__btBodyWorker = () => ({ ..._stats, dead: _dead, pending: _pending.size });
  /* QA (mp-bodyworker): bake each { urls, job, fw, fh } on the worker and
     hand back its packed bytes, for the caller to compare with the page's */
  window.__btBodyWorkerBytes = (urls, job, fw, fh, type) => _ask({ type: type || 'body', urls: urls.map(_abs), job, fw, fh, raw: true })
    .then((m) => (m && m.ok ? { W: m.W, H: m.H, cells: m.cells, frames: m.frames, ms: m.ms, t: m.t, raw: new Uint8Array(m.raw) } : { why: m && m.why }));
}
