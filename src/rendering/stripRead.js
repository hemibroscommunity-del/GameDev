/* ═══ v2.3.4470: A STRIP READ OFF THE PAGE'S THREAD (the page's side) ═══
 *
 * stripPack.js has the why.  This asks the reader's worker (png8Worker.js,
 * the one the Wheel's object sheets and the farm's pictures are read on) for
 * a monster strip's numbers, already cropped and packed:
 *
 *   readStrip(url, fw, fh, n) -> Promise<{ w, h, idx, pal, cells, n, fileW,
 *                                fileH } | null>
 *
 * null: no worker here, the file is not a 256-colour PNG, or it would not
 * read -- the caller then unpacks it on the page, as before
 * (zoneTextures.js).  ONE strip at a time is asked for: a strip's unpacked
 * bytes are held on the worker's side while it is read (up to 2 MB a strip,
 * and a look is fourteen), and a phone's memory counts the worker's.  The
 * worker is let go a few seconds after its last strip.
 *
 * `?stripworker=0`: every strip is unpacked on the page (the old way, for one
 * tab).  Probe: window.__btStripRead().
 */
const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
const _off = /(^|[?&])stripworker=(0|off|false)(&|$)/.test(_q);
const IDLE_MS = 4000;
const READ_MS = 20000;      /* a strip not back in this long is unpacked on the page */

let _w = null, _seq = 0, _idle = 0, _dead = false;
const _wait = new Map();
const _stats = { asked: 0, read: 0, failed: 0, ms: 0, last: '' };

/** Are strips read this way here? */
export function stripReadOn() { return !_off && !_dead && typeof Worker !== 'undefined'; }

function stop() {
  if (_idle) { clearTimeout(_idle); _idle = 0; }
  if (_w) { try { _w.terminate(); } catch (e) { /* gone */ } _w = null; }
  for (const done of _wait.values()) done(null);
  _wait.clear();
}
function worker() {
  if (_w) return _w;
  try { _w = new Worker(new URL('./png8Worker.js', import.meta.url), { type: 'module' }); } catch (e) { _w = null; _dead = true; return null; }
  _w.onmessage = (ev) => {
    const m = ev.data || {};
    const done = _wait.get(m.id);
    if (!done) return;
    _wait.delete(m.id);
    done(m);
  };
  /* a worker that will not start or run: the page's way from here on */
  _w.onerror = () => { _dead = true; stop(); };
  return _w;
}
function ask(msg) {
  const w = worker();
  if (!w) return Promise.resolve(null);
  if (_idle) { clearTimeout(_idle); _idle = 0; }
  const id = ++_seq;
  return new Promise((resolve) => {
    const t = setTimeout(() => { if (_wait.delete(id)) resolve(null); }, READ_MS);
    _wait.set(id, (m) => { clearTimeout(t); resolve(m); });
    try { w.postMessage({ id, ...msg }); } catch (e) { clearTimeout(t); _wait.delete(id); resolve(null); }
  });
}

/* one at a time */
let _line = Promise.resolve();
export function readStrip(url, fw, fh, n) {
  if (!stripReadOn()) return Promise.resolve(null);
  _stats.asked++;
  const job = async () => {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
    const m = await ask({ strip: String(url), fw, fh, n: n || 0 });
    if (!_wait.size) { if (_idle) clearTimeout(_idle); _idle = setTimeout(() => { _idle = 0; if (!_wait.size) stop(); }, IDLE_MS); }
    if (!m || !m.ok || !m.idx || !m.pal) { _stats.failed++; _stats.last = (m && m.error) || 'no answer'; return null; }
    _stats.read++;
    _stats.ms += (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    return m;
  };
  const p = _line.then(job, job);
  _line = p.then(() => {}, () => {});
  return p;
}

if (typeof window !== 'undefined') window.__btStripRead = () => ({ on: stripReadOn(), off: _off, dead: _dead, ..._stats, ms: Math.round(_stats.ms) });
