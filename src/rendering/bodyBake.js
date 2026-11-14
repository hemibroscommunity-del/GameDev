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
 * before, with its own retries.  v2.3.5040: those 20 s are time the page was
 * there and running (a phone behind its lock screen runs nothing, and its
 * worker sleeps with it), and a worker let go is started again when the page
 * next comes back (_back, below).
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

const _stats = { off: _OFF, asked: 0, done: 0, failed: 0, inlineProbe: 0, loading: 0, stalled: 0, restarts: 0, beats: 0, dropped: 0, ms: 0, pageMs: 0, lastWhy: null,   /* v2.3.5040: + restarts (the page's returns that gave a let-go worker its start back) */
  shirt: { asked: 0, done: 0 } };   /* v2.3.5014: a drawn shirt's jobs (gearSheets.js), counted apart for mp-bodyworker 5 */
let _dead = false, _seq = 0, _started = 0;
/* ═══ TWO WORKERS, AND A WATCH THAT TELLS A DEAD ONE FROM A BUSY ONE ═══
   The first crowd tour with one worker and a 20 s limit a JOB: a-ink's
   drawn players queued dozens of sheets, b-fish's jobs waited behind them past
   the limit, and the page baked them itself (344 ms holds).  A queue is not a
   failure.  So a job has no limit of its own; a WORKER does: one that has
   answered nothing for WORKER_MS while it has work is let go of, and its jobs
   (and every later one, if none is left) bake on the page.  Two workers where
   the device has the cores (a phone has six), so one drawn player's dozen
   sheets do not hold up the next player's.
   v2.3.5013: "answered nothing" counts a job's beat between its steps
   (bodyBakeWorker.js), and a worker runs its jobs in turn: four fish sheets
   started at once answered only together, 19 to 25 s after the ask, and the
   watch let two busy workers go (the crowd tour's h-eight: 208 to 288 ms
   holds as the page baked what they had). */
const POOL = (() => { try { return Math.max(1, Math.min(2, ((navigator && navigator.hardwareConcurrency) || 2) - 2)); } catch (e) { return 1; } })();
const _pool = [];   /* { w, pending: Map(id -> res), quiet: ms } */
const _pending = { get size() { let n = 0; for (const s of _pool) n += s.pending.size; return n; } };
let _watchT = null;
/* ═══ v2.3.5040: THE WATCH COUNTS ONLY TIME THE PAGE WAS THERE, AND A WORKER LET GO IS STARTED AGAIN WHEN THE PAGE COMES BACK ═══
   The grand plan's review (docs/GRAND-PLAN.md 3.1): the watch compared the
   wall's clock with a worker's last sign (`now - slot.sign > WORKER_MS`).  A
   phone behind its lock screen runs nothing, and its workers sleep with the
   page; back after 20 s or more with a job waiting, the watch's first tick
   read every worker as silent that long and let them all go, and a worker let
   go was never started again (`_dead`): every sheet from then on was baked on
   the page (114 to 720 ms each: held-budget.mjs body-bake) for the rest of
   the sitting.  mp-bodyworker 6a, before: 2 of 2 let go at the wake.
   Now:
     - a worker's silence is counted by the watch's own ticks (`slot.quiet`),
       a tick adding the time since the last one only while the page is
       visible, and never more than two ticks' worth: a page that did not run
       for a minute (a lock with no visibility event: an iPhone does not always
       send one, mp-comeback 5; a laptop's lid) heard nothing from anyone, and
       that minute is not its worker's silence;
     - a worker let go is started again once each time the page comes back
       (visible again, or out of Safari's parked-page cache): `_back` gives
       each empty slot its one start back, and the next bake that needs a
       worker starts it, as the first was.  One that is truly broken costs a
       start a return, never a loop.
   WORKER_MS is unchanged (20 s), and what it means: one step of one job
   silent for 20 s the page was there to see. */
const WATCH_MS = 2000;
let _watchAt = 0;
const _pageShown = () => { try { return typeof document === 'undefined' || document.visibilityState !== 'hidden'; } catch (e) { return true; } };

function _kill(slot, why) {
  try { slot.w.terminate(); } catch (e) { /* gone */ }
  const i = _pool.indexOf(slot);
  if (i >= 0) _pool.splice(i, 1);
  slot.dead = true;
  if (!slot.heard) _unheard++;   /* v2.3.5049: never heard from: not started again at a return (_back) */
  for (const [id, p] of slot.pending) { slot.pending.delete(id); p({ ok: false, why }); }
  if (!_pool.length) _dead = true;
  _pump();   /* v2.3.5014: the line goes to the worker left, or (none) to the page */
}
function _watch() {
  if (_watchT) return;
  _watchAt = Date.now();
  _watchT = setInterval(() => {
    const now = Date.now();
    /* v2.3.5040: what this tick may count (the note above) */
    const dt = _pageShown() ? Math.min(Math.max(0, now - _watchAt), 2 * WATCH_MS) : 0;
    _watchAt = now;
    for (const slot of _pool.slice()) {
      if (!slot.pending.size) continue;
      slot.quiet += dt;
      if (slot.quiet > WORKER_MS) { _stats.stalled++; _kill(slot, 'stalled'); }
    }
    if (!_pool.length) { clearInterval(_watchT); _watchT = null; }
  }, WATCH_MS);
}
/* v2.3.5040: the page is back.  Each worker let go since (stalled, died, or
   never started) may be started once more; the time away is no tick's.
   ═══ v2.3.5049: ...BUT NOT ONE THAT NEVER RAN HERE ═══
   The gatekeeper's sitting 1 (#1668): a worker that hangs from its start (a
   device where it cannot run) was started again at every return, and every
   return then showed plain looks for the 20 s the watch waits before letting
   it go.  A worker let go WITHOUT ever being heard from (no answer, no beat:
   `slot.heard`) is counted (`_unheard`) and its slot is not started again;
   one that ran here and was let go (stalled under a load, or ended while the
   page was away) is, as before.  `_unheard` is never more than the pool:
   with every slot spent that way, the page bakes for the rest of the sitting,
   as it does where there is no worker. */
let _unheard = 0;
function _back() {
  _watchAt = Date.now();
  if (_OFF) return;
  const spent = _pool.length + Math.min(_unheard, POOL);
  if (_started <= spent && !(_dead && spent < POOL)) return;   /* nothing let go that ran here: every slot spent on one that never did stays spent, and the page bakes */
  _stats.restarts++;
  _started = spent;
  _dead = false;
  _pump();   /* a line waiting on the one worker left goes to the new one too */
}
if (!_OFF && typeof document !== 'undefined' && typeof window !== 'undefined') {
  try {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') _back(); });
    window.addEventListener('pageshow', (e) => { if (e && e.persisted) _back(); });
  } catch (e) { /* nothing to hear: as before, a worker let go stays gone */ }
}
function _start() {
  let w;
  try { w = new Worker(new URL('./bodyBakeWorker.js', import.meta.url), { type: 'module' }); } catch (e) { return null; }
  const slot = { w, pending: new Map(), quiet: 0, dead: false, heard: false };
  w.onmessage = (ev) => {
    const m = ev.data || {};
    slot.quiet = 0;   /* v2.3.5040: heard from (was a wall-clock stamp, `sign`) */
    slot.heard = true;   /* v2.3.5049: it runs here (_back) */
    /* v2.3.5013: a job's beat between its steps (bodyBakeWorker.js): alive,
       nothing to hand back */
    if (m.beat) { _stats.beats++; return; }
    const p = slot.pending.get(m.id);
    if (!p) return;
    slot.pending.delete(m.id);
    p(m);
    _pump();   /* v2.3.5014: free: the next job in line */
  };
  /* a worker that dies (a script that failed to load, an error at the top):
     its jobs bake on the page, and every later one if none is left */
  w.onerror = () => _kill(slot, 'worker died');
  _pool.push(slot);
  _watch();
  return slot;
}
/* v2.3.5014: a worker with nothing in hand, started as needed; null when
   every worker is busy (or none is left: _dead) */
function _worker() {
  if (_dead) return null;
  for (const s of _pool) if (!s.pending.size) return s;
  /* a worker let go of is not started again until the page next comes back
     (v2.3.5040, _back): till then its slot bakes on the page */
  if (_started < POOL) {
    _started++;
    const s = _start();
    if (s) return s;
    if (!_pool.length) { _dead = true; return null; }
  }
  return null;
}
/* ═══ v2.3.5014: THE LINE IS KEPT ON THE PAGE, AND A JOB NO LONGER WANTED IS DROPPED ═══
   The crowd tour's d-prints, with drawn shirts moved to the worker: ten
   players in ten drawings, and gearSheets.js keeps eight drawings baked
   (MAX_ART_KEYS), so a sheet still waiting for the worker was let go of and
   asked for again as its player came back on screen: 40 sheets asked for 230
   times in 25 s, every ask a job posted, and the worker, working through
   them in turn (v2.3.5013), had done 6 when the station ended.  Now each
   worker is handed one job at a time and the rest wait here, in the order
   asked; a job whose caller said how to tell it is still wanted (`wanted`)
   and is not, when its turn comes, is dropped unbaked (resolved
   `{ dropped }`: its caller had already let go of it). */
const _line = [];   /* { msg, transfer, res, wanted } */
function _pump() {
  while (_line.length) {
    const slot = _worker();
    if (!slot) {
      if (!_dead) return;   /* all busy: an answer pumps again */
      const q = _line.shift();   /* none left: the page's, as before */
      q.res({ ok: false, why: 'no worker' });
      continue;
    }
    const q = _line.shift();
    let want = true;
    try { want = !q.wanted || !!q.wanted(); } catch (e) { want = true; }
    if (!want) { _stats.dropped++; q.res({ ok: false, why: 'dropped', dropped: true }); continue; }
    const id = ++_seq;
    slot.quiet = 0;   /* idle until now: its clock starts with this job */
    slot.pending.set(id, q.res);
    try { slot.w.postMessage({ ...q.msg, id }, q.transfer || []); } catch (e) { slot.pending.delete(id); q.res({ ok: false, why: 'post' }); }
  }
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
   of (the watch above); its jobs are the page's, with their own retries.
   v2.3.5013: a beat counts, so this is one STEP of one job silent this long
   (the longest measured, a fish sheet's recolour on this box: 5.6 s).
   v2.3.5040: of time the page was visible and running (the watch's ticks) */
const WORKER_MS = 20000;
function _ask(msg, transfer, wanted) {
  if (_dead) return Promise.resolve({ ok: false, why: 'no worker' });
  return new Promise((res) => { _line.push({ msg, transfer, res, wanted }); _pump(); });   /* v2.3.5014: through the line */
}

/** Bake one sheet on the worker: `type` 'body' (bodyRecolor.js bakeBodyFull)
 *  or 'head' (bakeHeadFull), or (v2.3.5014) 'shirt' (a drawn shirt: gearBake.js).  `urls`: the file first, then its fallback
 *  (webpImage.js spriteUrls).  Resolves { img, url, W, H, cells | null,
 *  frames } once the image is decoded; false when the FILE did not load (the
 *  v2.3.5014: `wanted`, optional: asked when the job's turn comes; false and
 *  it is dropped unbaked, resolving { dropped: true } (only for a caller
 *  that passed `wanted`).
 *  caller's own retries take over: the page asks again, as it did); null for
 *  anything else (the caller bakes it on the page). */
export function bakeOnWorker(type, urls, job, fw, fh, wanted) {
  _stats.asked++;
  if (type === 'shirt') _stats.shirt.asked++;
  return _ask({ type, urls: urls.map(_abs), job, fw, fh }, null, wanted).then((m) => {
    /* v2.3.5014: no longer wanted when its turn came: { dropped }, never
       null (null sends the caller to the page's bake) */
    if (m && m.dropped) return { dropped: true };
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
      if (type === 'shirt') _stats.shirt.done++;
      /* v2.3.5014: + a gear sheet's frame (fw, fh), its width before the pack and the file it read (a drawn shirt: gearSheets.js) */
      return { img, url, W: m.W, H: m.H, cells: m.cells, frames: m.frames, ms: m.ms, fw: m.fw, fh: m.fh, fullW: m.fullW, src: m.src };
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
  window.__btBodyWorker = () => ({ ..._stats, shirt: { ..._stats.shirt }, dead: _dead, unheard: _unheard, pending: _pending.size, waiting: _line.length, workers: _pool.length, pool: POOL });
  /* QA (mp-bodyworker): bake each { urls, job, fw, fh } on the worker and
     hand back its packed bytes, for the caller to compare with the page's */
  window.__btBodyWorkerBytes = (urls, job, fw, fh, type) => _ask({ type: type || 'body', urls: urls.map(_abs), job, fw, fh, raw: true })
    .then((m) => (m && m.ok ? { W: m.W, H: m.H, cells: m.cells, frames: m.frames, ms: m.ms, t: m.t, raw: new Uint8Array(m.raw) } : { why: m && m.why }));
}
