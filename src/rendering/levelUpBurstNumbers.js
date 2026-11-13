/* ═══ v2.3.5004: THE LEVEL-UP BURST FROM ITS COLOUR NUMBERS ═══
 *
 * docs/specs/pictures-256.md §7a.  The burst is the page's own overlay (z 70,
 * over the HUD's HTML: LevelUpBurst.jsx), and the loading screen held its
 * 2172 x 724 strip decoded for the session -- 6.29 MB, four bytes a pixel
 * whatever its colours.  Now the eight frames' rects are 256-colour palette
 * PNGs (public/sprites/fx/levelup-burst-v1-f0..f7.p256.png, made by
 * tools/art/levelup-numbers.mjs; the owner's yes on 2026-11-12), and:
 *
 * BETWEEN BURSTS the page holds them PACKED: the eight files as Blobs (398 KB,
 * fetched behind the loading screen: the preloading law), whose bytes the
 * browser keeps outside the page's heap; and frames 0 and 1 opened as colour
 * numbers (a byte a pixel, 89 KB), so a burst's first 140 ms never wait.
 * The eight opened would be 0.89 MB of the page's buffers, held for the
 * session: the memory check's tightest line (22 MB) failed by 0.3 with them
 * (v2.3.5004's first cut).
 *
 * AS A BURST STARTS (the first render that draws it), frames 2-7 are opened
 * on the reader's worker (stripRead.js readPaletteBlob, png8Worker.js: off
 * the page's thread) from the Blobs, all at once; frame 2 is wanted 140 ms
 * in.  A frame not back yet is drawn when it comes (the canvas keeps the
 * frame before).  When the last burst stops drawing, frames 2-7 and the
 * shared ImageData are let go.
 *
 * THE DRAW, as a frame comes up (eight times a burst, never one a tick): its
 * numbers turned into colours on a canvas the size of the largest frame, in
 * the art's own pixels, which the page scales by k exactly as it scaled the
 * strip (`image-rendering: auto`).  THE PAGE'S ONE THREAD (CLAUDE.md,
 * held-budget.mjs): the largest frame is 359 x 645 = 231,555 px, one table
 * look-up a pixel and one putImageData of 0.93 MB, no read back, no resample
 * (0.2-1.9 ms in node; `maxMs` below is the rig's number) -- well under the
 * 12 ms line, so it is done in place.
 *
 * THE LOAD goes through loadSetLater's door (a 20 s time limit, then asked
 * again later in retryLooks.js's rounds; server/test/picture-door.test.mjs).
 * The strip instead, warmed behind the loading screen as before
 * (levelUpBurstPreload.js): `?burstnumbers=0`, no reader's worker
 * (`?stripworker=0`, a worker that will not start), no DecompressionStream
 * (iOS before 16.4), or a first load that failed.
 */
import { loadSetLater } from './loadSetLater.js';
import { readPaletteBlob, stripReadOn } from './stripRead.js';
import { LEVELUP_NUMBER_SRCS, LEVELUP_BURST_NUMBERS, LEVELUP_MAX_W, LEVELUP_MAX_H } from '../data/levelUpBurst.js';

const N = LEVELUP_NUMBER_SRCS.length;
const KEEP = 2;                          /* frames opened for the session: 0 and 1 (the first 140 ms) */
const _files = Object.create(null);      /* '0'..'7' -> a Blob: the frame's palette PNG, packed */
const _frames = Object.create(null);     /* i -> { w, h, stride, idx (a byte a pixel), pal (256 ImageData words) } */
const _opening = Object.create(null);    /* i -> its read on the worker, in flight */
const _listeners = new Set();
let _set = null;
let _first = null;
const _stats = { draws: 0, lastMs: 0, maxMs: 0, opened: 0, openMs: 0, openAt: 0 };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* an ImageData's pixels as 32-bit words: r, g, b, a in memory order */
const LITTLE = (() => { try { return new Uint8Array(new Uint32Array([1]).buffer)[0] === 1; } catch (e) { return true; } })();

/* a frame's numbers from the worker -> what is kept: its numbers, and its
   colours as the words an ImageData holds (straight alpha, as putImageData
   takes them and as the strip's <img> was decoded) */
function keep(p) {
  if (!p || !p.idx || p.stride < p.w) return null;
  const pal = new Uint32Array(256);
  for (let c = 0; c < p.n; c++) {
    const r = p.rgb[c * 3], g = p.rgb[c * 3 + 1], b = p.rgb[c * 3 + 2], a = p.alpha[c];
    pal[c] = LITTLE ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  }
  return { w: p.w, h: p.h, stride: p.stride, idx: p.idx, pal };
}

/* frame i opened on the worker, once (a read in flight is shared); a frame
   past KEEP that comes back after the last burst ended is not kept */
function open(i) {
  if (_frames[i]) return Promise.resolve(true);
  if (_opening[i]) return _opening[i];
  const blob = _files[i];
  if (!blob) return Promise.resolve(false);
  _opening[i] = readPaletteBlob(blob).then((m) => {
    delete _opening[i];
    const f = keep(m);
    if (!f || (i >= KEEP && !_users)) return !!f;
    _frames[i] = f;
    if (i >= KEEP && levelUpNumbersAllOpen() && _stats.openAt) { _stats.openMs = now() - _stats.openAt; _stats.openAt = 0; }
    for (const fn of Array.from(_listeners)) { try { fn(i); } catch (e) { /* its own */ } }
    return true;
  }, () => { delete _opening[i]; return false; });
  return _opening[i];
}

/** Is the burst drawn from its numbers on this page? (the switch, the
 *  reader's worker, and a browser that can unpack the files) */
export function levelUpNumbersWanted() {
  return LEVELUP_BURST_NUMBERS && stripReadOn() && typeof DecompressionStream !== 'undefined' && typeof fetch === 'function';
}

/** The loading screen's load: the eight files held packed, frames 0 and 1
 *  opened (which also proves the worker's way works here).  Resolves true
 *  when the burst can be drawn from the numbers (never throws). */
export function loadLevelUpNumbers() {
  if (!levelUpNumbersWanted()) return Promise.resolve(false);
  if (!_set) {
    const files = Object.create(null);
    LEVELUP_NUMBER_SRCS.forEach((u, i) => { files[i] = u; });
    _set = loadSetLater({
      files,
      into: _files,
      load: (u) => fetch(u).then((res) => (res.ok ? res.blob() : null)).then((b) => (b && b.size ? b : null)),
    });
    _first = _set.start()
      .then(() => Promise.all(Array.from({ length: KEEP }, (_, i) => open(i))))
      .then(levelUpNumbersReady, () => false);
  }
  return _first;
}

/** Can a burst start from the numbers now? (the eight files, frames 0 and 1 open) */
export function levelUpNumbersReady() {
  for (let i = 0; i < N; i++) if (!_files[i]) return false;
  for (let i = 0; i < KEEP; i++) if (!_frames[i]) return false;
  return true;
}
function levelUpNumbersAllOpen() {
  for (let i = 0; i < N; i++) if (!_frames[i]) return false;
  return true;
}

/** A burst drawn from the strip because a file was missing asks again for it
 *  (only once its later round has come: loadSetLater's ensure). */
export function ensureLevelUpNumbers() { if (_set) _set.ensure(); }

/** Told when a frame is opened (a burst waiting for it draws then). */
export function onLevelUpNumbers(fn) {
  if (typeof fn !== 'function') return () => {};
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/* the bursts drawing now (two at most): while any is, frames 2-7 are open
   and the one ImageData they share is kept */
let _scratch = null;
let _users = 0;
/** A burst holds this while it DRAWS (from its first render to the one where
 *  it is over, LevelUpBurst.jsx); the function it returns lets go.  The
 *  first hold opens frames 2-7 on the worker.  What the last one held goes a
 *  microtask after it lets go, so a burst starting in the same commit as
 *  another ends (a level-up just as one finishes) takes it over. */
export function levelUpNumbersUse() {
  _users++;
  if (_users === 1 && !levelUpNumbersAllOpen()) {
    _stats.opened++;
    _stats.openAt = now();
    for (let i = KEEP; i < N; i++) open(i);
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    _users = Math.max(0, _users - 1);
    if (!_users) {
      Promise.resolve().then(() => {
        if (_users) return;
        _scratch = null;
        for (let i = KEEP; i < N; i++) delete _frames[i];
      });
    }
  };
}

/** Frame `i` into `canvas` (made LEVELUP_MAX_W x LEVELUP_MAX_H here, the
 *  frame at its top left, the rest see-through).  False if it cannot be yet
 *  (the frame not opened): the canvas keeps what it had. */
export function drawLevelUpFrame(canvas, i) {
  const f = _frames[i];
  if (!f || !canvas) return false;
  const t0 = now();
  if (canvas.width !== LEVELUP_MAX_W) canvas.width = LEVELUP_MAX_W;
  if (canvas.height !== LEVELUP_MAX_H) canvas.height = LEVELUP_MAX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const W = LEVELUP_MAX_W;
  if (!_scratch) _scratch = ctx.createImageData(LEVELUP_MAX_W, LEVELUP_MAX_H);
  const out = new Uint32Array(_scratch.data.buffer);
  out.fill(0);
  const { w, h, stride, idx, pal } = f;
  for (let y = 0; y < h; y++) {
    const o = y * W, s = y * stride;
    for (let x = 0; x < w; x++) out[o + x] = pal[idx[s + x]];
  }
  ctx.putImageData(_scratch, 0, 0);
  try { canvas.setAttribute('data-frame', String(i)); } catch (e) { /* the rig's mark only */ }
  const ms = now() - t0;
  _stats.draws++; _stats.lastMs = ms; if (ms > _stats.maxMs) _stats.maxMs = ms;
  return true;
}

/** An emptied canvas holds nothing (the burst's end, or a burst gone). */
export function emptyLevelUpCanvas(canvas) {
  if (!canvas) return;
  try { canvas.width = 0; canvas.height = 0; } catch (e) { /* gone */ }
}

/** For the rigs (window.__btLevelUpWarm.numbers): what is held -- the files
 *  packed (Blobs: outside the page's heap), the frames open (the page's
 *  buffers) -- and what the draws and the openings cost. */
export function levelUpNumbersStats() {
  let files = 0, fileBytes = 0, frames = 0, bytes = 0;
  for (let i = 0; i < N; i++) {
    if (_files[i]) { files++; fileBytes += _files[i].size || 0; }
    const f = _frames[i];
    if (f) { frames++; bytes += f.idx.length + f.pal.byteLength; }
  }
  return {
    wanted: levelUpNumbersWanted(), ready: levelUpNumbersReady(), files, fileBytes, frames, bytes,
    opening: Object.keys(_opening).length, scratch: !!_scratch, users: _users,
    draws: _stats.draws, lastMs: Math.round(_stats.lastMs * 100) / 100, maxMs: Math.round(_stats.maxMs * 100) / 100,
    opened: _stats.opened, openMs: Math.round(_stats.openMs),
  };
}
