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
 * any error, a worker silent for 20 s with work) answers null, and the caller bakes that sheet on the page as
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

const _stats = { off: _OFF, asked: 0, done: 0, failed: 0, inlineProbe: 0, loading: 0, stalled: 0, ms: 0, pageMs: 0, lastWhy: null };
let _dead = false, _seq = 0, _started = 0;
/* ═══ TWO WORKERS, AND A WATCH THAT TELLS A DEAD ONE FROM A BUSY ONE ═══
   The first crowd tour with one worker and a 20 s limit a JOB: a-ink's
   drawn players queued dozens of sheets, b-fish's jobs waited behind them past
   the limit, and the page baked them itself (344 ms holds).  A queue is not a
   failure.  So a job has no limit of its own; a WORKER does: one that has
   answered nothing for WORKER_MS while it has work is let go of, and its jobs
   (and every later one, if none is left) bake on the page.  Two workers where
   the device has the cores (a phone has six), so one drawn player's dozen
   sheets do not hold up the next player's. */
const POOL = (() => { try { return Math.max(1, Math.min(2, ((navigator && navigator.hardwareConcurrency) || 2) - 2)); } catch (e) { return 1; } })();
const _pool = [];   /* { w, pending: Map(id -> res), sign: ms } */
const _pending = { get size() { let n = 0; for (const s of _pool) n += s.pending.size; return n; } };
let _watchT = null;

function _kill(slot, why) {
  try { slot.w.terminate(); } catch (e) { /* gone */ }
  const i = _pool.indexOf(slot);
  if (i >= 0) _pool.splice(i, 1);
  slot.dead = true;
  for (const [id, p] of slot.pending) { slot.pending.delete(id); p({ ok: false, why }); }
  if (!_pool.length) _dead = true;
}
function _watch() {
  if (_watchT) return;
  _watchT = setInterval(() => {
    const now = Date.now();
    for (const slot of _pool.slice()) if (slot.pending.size && now - slot.sign > WORKER_MS) { _stats.stalled++; _kill(slot, 'stalled'); }
    if (!_pool.length) { clearInterval(_watchT); _watchT = null; }
  }, 2000);
}
function _start() {
  let w;
  try { w = new Worker(new URL('./bodyBakeWorker.js', import.meta.url), { type: 'module' }); } catch (e) { return null; }
  const slot = { w, pending: new Map(), sign: Date.now(), dead: false };
  w.onmessage = (ev) => {
    const m = ev.data || {};
    slot.sign = Date.now();
    const p = slot.pending.get(m.id);
    if (!p) return;
    slot.pending.delete(m.id);
    p(m);
  };
  /* a worker that dies (a script that failed to load, an error at the top):
     its jobs bake on the page, and every later one if none is left */
  w.onerror = () => _kill(slot, 'worker died');
  _pool.push(slot);
  _watch();
  return slot;
}
/* the slot with the least work, started as needed */
function _worker() {
  if (_dead) return null;
  let best = null;
  for (const s of _pool) if (!best || s.pending.size < best.pending.size) best = s;
  /* a worker let go of is not started again: its slot bakes on the page */
  if ((!best || best.pending.size) && _started < POOL) {
    _started++;
    const s = _start();
    if (s) return s;
    if (!_pool.length) { _dead = true; return null; }
  }
  return best;
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

/* a worker that answers nothing for this long while it has work is let go
   of (the watch above); its jobs are the page's, with their own retries */
const WORKER_MS = 20000;
function _ask(msg, transfer) {
  const slot = _worker();
  if (!slot) return Promise.resolve({ ok: false, why: 'no worker' });
  const id = ++_seq;
  return new Promise((res) => {
    if (!slot.pending.size) slot.sign = Date.now();   /* idle until now: its clock starts with this job */
    slot.pending.set(id, res);
    try { slot.w.postMessage({ ...msg, id }, transfer || []); } catch (e) { slot.pending.delete(id); res({ ok: false, why: 'post' }); }
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
  window.__btBodyWorker = () => ({ ..._stats, dead: _dead, pending: _pending.size, workers: _pool.length, pool: POOL });
  /* QA (mp-bodyworker): bake each { urls, job, fw, fh } on the worker and
     hand back its packed bytes, for the caller to compare with the page's */
  window.__btBodyWorkerBytes = (urls, job, fw, fh, type) => _ask({ type: type || 'body', urls: urls.map(_abs), job, fw, fh, raw: true })
    .then((m) => (m && m.ok ? { W: m.W, H: m.H, cells: m.cells, frames: m.frames, ms: m.ms, t: m.t, raw: new Uint8Array(m.raw) } : { why: m && m.why }));
}
