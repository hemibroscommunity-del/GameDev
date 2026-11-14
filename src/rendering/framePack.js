/* ═══ v2.3.5257: A MONSTER STRIP'S COLOUR NUMBERS, KEPT DEFLATED A FRAME AT A TIME ═══
 *
 * Card P's backlog, the fire goblin (8.1 MB held at the memory check's fight:
 * 2.6 on the graphics chip, 5.5 of colour numbers in the page).  A monster's
 * strip comes in through the strip door as colour numbers (zoneTextures.js
 * loadTrackedStrip; picsNumbers.js keeps them as the source's resource, a
 * byte a pixel, and as `_btNumbers` for the CPU's readers), and once the
 * chip has the strip those page bytes are read by three things only: a
 * hit's chips (hitMaterialFx.js), a stuck arrow (arrowPin.js), and a lost
 * chip's rebuild -- each one FRAME, when it is hit or an arrow is in it.
 *
 * The planning session's road A' (measured on the fire goblin's 137 frames:
 * 4.81 MB of numbers, 1.41 deflated a frame at a time; road C, the readers'
 * needs worked out on the worker, came out at 9.61 MB for the pins alone):
 *   - once the chip has drawn a strip, its numbers are cut into pieces --
 *     each frame, and what lies outside the frames in bands of rows of at
 *     most 64 KB -- a slice at a time, deflated on the strip reader's worker
 *     (stripRead.js deflateOnWorker; on the page, a piece a task, where there
 *     is none), and each piece checked to come back byte for byte, through
 *     the page's own inflater, as the very numbers it was cut from (on the
 *     worker, with the pieces it was handed; on the page a few a slice);
 *     only then is the page's copy let go (`resource` emptied,
 *     `_btNumbers` dropped).  One strip at a time (the sweep, mp-heldsweep's
 *     lands: making every piece and stream at once held the page 116 ms);
 *   - a reader asking for a frame (heldNumbers.js readSourceRect,
 *     paletteDraw.js paletteRegionRGBA) gets it unpacked at once
 *     (inflateRaw.js, about a third of a ms for a whole 256 px frame), through
 *     a small cache: CACHE_FRAMES frames or CACHE_BYTES, the least recently
 *     used out (the memory law's cap) -- the same bytes, so the chips and the
 *     pins are exactly today's; past UNPACK_MS in a task a stuck arrow's
 *     frame waits for the next one (the worst hit, spread);
 *   - the strip is unpacked whole before any chip is sent it again: a lost
 *     chip's rebuild (picsOnce.js restoreAllPictures waits for it, behind its
 *     veil, a strip and a slice at a time), or a second renderer drawing it
 *     (paletteTex.js's upload asks `__btFPUnpack`), and packed again once the
 *     chip has it.
 * A strip not drawn yet keeps its numbers until it is (unpacking a whole
 * strip at its first upload would be the frame's work).  Anything that does
 * not come back exactly is declined and kept as it is.
 * `?framepack=0`: as before, the numbers kept.  Probe: window.__btFramePack().
 */
import { inflateRawSync } from './inflateRaw.js';
import { deflateOnWorker } from './stripRead.js';   /* the reader's worker deflates the pieces off the page's thread */

const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
export const FRAME_PACK = !/(^|[?&])framepack=(0|off|false)(&|$)/.test(_q) && typeof CompressionStream !== 'undefined' && typeof Blob !== 'undefined';
/* the unpacked frames kept for the readers: a hit reads the frame it hit,
   an arrow the frames its monster shows while it is in it */
export const CACHE_FRAMES = 12;
export const CACHE_BYTES = 1 << 20;
/* a task's unpacking for the readers, at most (the planning session: the
   worst hit -- several arrows landing on different frames at once, on a slow
   phone -- stays within the page's 12 ms line, or the unpacking is spread
   over frames): past it a stuck arrow's frame is unpacked in the next task,
   its arrow placed unpinned for that frame (arrowPin.js asks every frame, as
   it does before a frame has pixels).  A hit's chips are never put off: they
   are cut once a strip and kept (hitMaterialFx.js chipsFor). */
export const UNPACK_MS = 4;
let _budget = UNPACK_MS;
/** QA (server/test/inflate-raw.test.mjs): the spread tried at another budget. */
export function setUnpackBudget(ms) { _budget = ms > 0 ? ms : UNPACK_MS; }

const EMPTY = new Uint8Array(0);
const _want = new Set();     /* strips made, waiting for the chip */
const _packed = new Set();
const _cache = new Map();    /* 'uid:x,y' -> a frame's numbers (Uint8Array, w x h) */
let _cacheBytes = 0;
const _st = { wanted: 0, packed: 0, packedMB: 0, packedKB: 0, declined: 0, unpacked: 0, reads: 0, hits: 0, misses: 0, failed: 0, readMsMax: 0, readMsSum: 0, deferred: 0, warmed: 0, taskMsMax: 0, onWorker: 0 };
let _spent = 0, _spentReset = false;   /* this task's unpacking, ms */
const _warm = [];                      /* [source, frame] put off to the next task */
let _warming = false;

/** The frames of a strip just made of colour numbers (zoneTextures.js): to be
 *  packed once the chip has it.  `rects` are its frames' rectangles, in the
 *  source's pixels. */
export function wantFramePack(src, rects) {
  if (!FRAME_PACK || !src || !src._btNumbers || !src._btPal || !rects || !rects.length) return;
  src.__btCells = rects.map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }));
  _want.add(src);
  _st.wanted++;
  try {
    src.once('destroy', () => { _want.delete(src); _packed.delete(src); _dropCache(src); const i = _line.indexOf(src); if (i >= 0) _line.splice(i, 1); });
  } catch (e) { /* a source that cannot tell its end is dropped when found destroyed */ }
}

const _nextTask = () => new Promise((res) => setTimeout(res, 0));
const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const SLICE_MS = 2;   /* a slice's work before the page has its turn: one more piece at most past it (the sweep's line is 12 ms) */
function _cellBytes(idx, st, c) {
  const out = new Uint8Array(c.w * c.h);
  for (let y = 0; y < c.h; y++) {
    const o = (c.y + y) * st + c.x;
    out.set(idx.subarray(o, o + c.w), y * c.w);
  }
  return out;
}
/* a frame's bytes, row by row, against its place in the strip's numbers */
function _sameCell(u, idx, st, c) {
  for (let y = 0, k = 0; y < c.h; y++) {
    const o = (c.y + y) * st + c.x;
    for (let x = 0; x < c.w; x++, k++) if (u[k] !== idx[o + x]) return false;
  }
  return true;
}
const _same = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  let i = 0;
  /* four bytes at a time where both are aligned */
  if (!(a.byteOffset & 3) && !(b.byteOffset & 3)) {
    const n = a.length >> 2, a4 = new Uint32Array(a.buffer, a.byteOffset, n), b4 = new Uint32Array(b.buffer, b.byteOffset, n);
    for (let k = 0; k < n; k++) if (a4[k] !== b4[k]) return false;
    i = n << 2;
  }
  for (; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};
/* what lies outside the frames (the rows' padding out to the stride,
   picsNumbers.js, and whatever the packer left between cells) is kept too,
   in bands of rows of at most BAND bytes with the frames' places zeroed --
   nearly nothing deflated, and each small enough to check in a slice */
const BAND = 1 << 16;
function _bands(st, h) {
  const rows = Math.max(1, Math.floor(BAND / st)), out = [];
  for (let y0 = 0; y0 < h; y0 += rows) out.push({ y0, y1: Math.min(h, y0 + rows) });
  return out;
}
/* a band of the strip's numbers with its frames' places zeroed */
function _bandBytes(idx, st, b, cells) {
  const out = idx.slice(b.y0 * st, b.y1 * st);
  for (const c of cells) {
    const ya = Math.max(b.y0, c.y), yb = Math.min(b.y1, c.y + c.h);
    for (let y = ya; y < yb; y++) out.fill(0, (y - b.y0) * st + c.x, (y - b.y0) * st + c.x + c.w);
  }
  return out;
}
/* the strip's whole numbers from its pieces */
function _rebuild(F) {
  const out = new Uint8Array(F.st * F.h);
  for (const b of F.bands) {
    const u = inflateRawSync(b.z, (b.y1 - b.y0) * F.st);
    if (!u) return null;
    out.set(u, b.y0 * F.st);
  }
  for (const c of F.cells) {
    const u = inflateRawSync(c.z, c.w * c.h);
    if (!u) return null;
    for (let y = 0; y < c.h; y++) out.set(u.subarray(y * c.w, (y + 1) * c.w), (c.y + y) * F.st + c.x);
  }
  return out;
}

/* the strips the chip has drawn, packed ONE AT A TIME (a strip's pieces are
   about its own size while they are made) */
const _line = [];
let _lineBusy = false;
function _queue(src) {
  if (_line.indexOf(src) < 0) _line.push(src);
  if (!_lineBusy) { _lineBusy = true; _runLine(); }
}
async function _runLine() {
  while (_line.length) {
    const src = _line.shift();
    try { await _pack(src); } catch (e) { _st.failed++; }
  }
  _lineBusy = false;
}

/* the pieces deflated: on the reader's worker (stripRead.js, handed over),
   where each is checked too -- { zs, checked: true } -- else here, a piece a
   task, to be checked here -- { zs }; { no: true } a piece that will not
   come back; or null */
async function _deflateAll(pieces) {
  const w = await deflateOnWorker(pieces);
  if (w && w.no) return { no: true };
  if (w && w.zs) { _st.onWorker++; return { zs: w.zs, checked: true }; }
  if (pieces.some((u) => u.buffer.byteLength === 0)) return null;   /* handed over and lost */
  const zs = [];
  for (const u of pieces) {
    const s = new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    zs.push(new Uint8Array(await new Response(s).arrayBuffer()));
    await _nextTask();
  }
  return { zs };
}

async function _pack(src) {
  const nums = src._btNumbers;
  if (!nums || !src._btPal || src.__btFP || src.__btFPNo || src.destroyed) return;
  const gone = () => src.destroyed || src._btNumbers !== nums || src.resource !== nums.idx;
  const no = () => { src.__btFPNo = true; _st.declined++; };
  const idx = nums.idx, st = nums.w, h = nums.h;
  /* each frame once (a strip may show one frame twice), inside the strip; a
     frame of no pixels has nothing to keep */
  const byKey = new Map();
  for (const c of src.__btCells || []) {
    if (!(c.w > 0 && c.h > 0)) continue;
    if (!(c.x >= 0 && c.y >= 0 && c.x + c.w <= st && c.y + c.h <= h)) { no(); return; }
    byKey.set(c.x + ',' + c.y + ',' + c.w + ',' + c.h, c);
  }
  if (!byKey.size) { no(); return; }
  const list = [...byKey.values()], bands = _bands(st, h);
  /* the pieces, made a slice at a time */
  const pieces = [];
  let t0 = _now();
  for (let i = 0; i < list.length + bands.length; i++) {
    pieces.push(i < list.length ? _cellBytes(idx, st, list[i]) : _bandBytes(idx, st, bands[i - list.length], list));
    if (_now() - t0 > SLICE_MS) { await _nextTask(); if (gone()) return; t0 = _now(); }
  }
  const d = await _deflateAll(pieces);
  if (d && d.no) { no(); return; }
  const zs = d && d.zs;
  if (!zs || zs.length !== pieces.length) { _st.failed++; return; }
  if (gone()) return;
  /* each back through the page's own inflater as the very numbers it was
     cut from, or not packed: done on the worker with the pieces it was
     handed; here (no worker), a few a slice */
  const cells = [], bandsZ = [];
  let bytes = 0;
  t0 = _now();
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    if (i < list.length) {
      const c = list[i];
      if (!d.checked) { const u = inflateRawSync(z, c.w * c.h); if (!u || !_sameCell(u, idx, st, c)) { no(); return; } }
      cells.push({ x: c.x, y: c.y, w: c.w, h: c.h, z });
    } else {
      const b = bands[i - list.length];
      if (!d.checked && !_same(inflateRawSync(z, (b.y1 - b.y0) * st), _bandBytes(idx, st, b, list))) { no(); return; }
      bandsZ.push({ y0: b.y0, y1: b.y1, z });
    }
    bytes += z.length;
    if (!d.checked && _now() - t0 > SLICE_MS) { await _nextTask(); if (gone()) return; t0 = _now(); }
  }
  if (gone()) return;
  /* every frame and every band checked: together they are the strip */
  src.__btFP = { cells, bands: bandsZ, st, h, pal: nums.pal, bytes };
  /* QA (mp-framepack's own check): the numbers as they were, kept to compare */
  if (typeof window !== 'undefined' && window.__btFramePackVerify === true) src.__btFPOrig = idx;
  src.resource = EMPTY;
  src._btNumbers = null;
  try { if (src.options) src.options.resource = null; } catch (e) { /* frozen */ }
  src.__btFPUnpack = unpackFrames;   /* paletteTex.js's upload, before any chip is sent it again */
  src.__btFPRead = packedFrame;      /* heldNumbers.js readSourceRect (it imports nothing) */
  _packed.add(src);
  _st.packed++;
  _st.packedMB = +(_st.packedMB + idx.length / 1048576).toFixed(2);
  _st.packedKB += Math.round(bytes / 1024);
}

/** The strip's numbers back whole (a chip about to be sent it); true when it
 *  holds them.  Packed again once the chip has it. */
export function unpackFrames(src) {
  const F = src && src.__btFP;
  if (!F) return true;
  const idx = _rebuild(F);
  if (!idx) { _st.failed++; return false; }
  _restore(src, F, idx);
  return true;
}
function _restore(src, F, idx) {
  src.resource = idx;
  src._btNumbers = { w: F.st, h: F.h, idx, pal: F.pal };
  src.__btFP = null;
  src.__btFPUnpack = null;
  src.__btFPRead = null;
  _packed.delete(src);
  _dropCache(src);
  _want.add(src);
  _st.unpacked++;
}
/* the same, a piece a slice (a lost chip's rebuild, behind its veil) */
async function _unpackSliced(src) {
  const F = src.__btFP;
  if (!F) return;
  const out = new Uint8Array(F.st * F.h);
  let t0 = _now();
  for (const b of F.bands) {
    const u = inflateRawSync(b.z, (b.y1 - b.y0) * F.st);
    if (!u) { _st.failed++; return; }
    out.set(u, b.y0 * F.st);
    if (_now() - t0 > SLICE_MS) { await _nextTask(); if (src.__btFP !== F) return; t0 = _now(); }
  }
  for (const c of F.cells) {
    const u = inflateRawSync(c.z, c.w * c.h);
    if (!u) { _st.failed++; return; }
    for (let y = 0; y < c.h; y++) out.set(u.subarray(y * c.w, (y + 1) * c.w), (c.y + y) * F.st + c.x);
    if (_now() - t0 > SLICE_MS) { await _nextTask(); if (src.__btFP !== F) return; t0 = _now(); }
  }
  if (src.__btFP === F && !src.destroyed) _restore(src, F, out);
}

function _dropCache(src) {
  const pre = src.uid + ':';
  for (const [k, v] of _cache) if (k.startsWith(pre)) { _cache.delete(k); _cacheBytes -= v.length; }
}

/* a frame unpacked into the readers' cache, its time on this task's count */
function _unpackCell(src, F, c, key) {
  const t0 = _now();
  const b = inflateRawSync(c.z, c.w * c.h);
  const ms = _now() - t0;
  _spent += ms;
  if (_spent > _st.taskMsMax) _st.taskMsMax = +_spent.toFixed(2);
  if (!_spentReset) { _spentReset = true; setTimeout(() => { _spent = 0; _spentReset = false; }, 0); }
  if (!b) { _st.failed++; return null; }
  _st.misses++;
  _st.readMsSum += ms;
  if (ms > _st.readMsMax) _st.readMsMax = ms;
  _cache.set(key, b);
  _cacheBytes += b.length;
  while (_cache.size > 1 && (_cache.size > CACHE_FRAMES || _cacheBytes > CACHE_BYTES)) {
    const k0 = _cache.keys().next().value;
    _cacheBytes -= _cache.get(k0).length;
    _cache.delete(k0);
  }
  return b;
}
/* the frames put off, unpacked a task at a time within UNPACK_MS */
function _warmSome() {
  _warming = false;
  _spent = 0;
  while (_warm.length && _spent < _budget) {
    const [src, c] = _warm.shift();
    const F = src.__btFP;
    if (!F || src.destroyed || F.cells.indexOf(c) < 0) continue;
    const key = src.uid + ':' + c.x + ',' + c.y;
    if (_cache.has(key)) continue;
    if (_unpackCell(src, F, c, key)) _st.warmed++;
  }
  if (_warm.length && !_warming) { _warming = true; setTimeout(_warmSome, 0); }
}

/** For a CPU reader of a packed strip (heldNumbers.js readSourceRect, which
 *  names the reader as `who`; paletteDraw.js paletteRegionRGBA): the frame
 *  holding the rectangle (sx, sy, sw, sh), unpacked, as
 *  { nums: { w, h, idx, pal }, x, y } (its place in the strip), or null -- no
 *  such frame, it will not unpack, or (a stuck arrow, past this task's
 *  UNPACK_MS) not yet: the reader then has nothing to read, as on a frame
 *  it cannot read today. */
export function packedFrame(src, sx, sy, sw, sh, who) {
  const F = src && src.__btFP;
  if (!F) return null;
  _st.reads++;
  let c = null;
  for (const q of F.cells) if (sx >= q.x && sy >= q.y && sx + sw <= q.x + q.w && sy + sh <= q.y + q.h) { c = q; break; }
  if (!c) { _st.failed++; return null; }
  const key = src.uid + ':' + c.x + ',' + c.y;
  let b = _cache.get(key);
  if (b) {
    _cache.delete(key); _cache.set(key, b);   /* least recently used last */
    _st.hits++;
  } else {
    if (who === 'pin' && _spent >= _budget) {
      _st.deferred++;
      if (!_warm.some((w) => w[0] === src && w[1] === c)) _warm.push([src, c]);
      if (!_warming) { _warming = true; setTimeout(_warmSome, 0); }
      return null;
    }
    b = _unpackCell(src, F, c, key);
    if (!b) return null;
  }
  return { nums: { w: c.w, h: c.h, idx: b, pal: F.pal }, x: c.x, y: c.y };
}

/** Every packed strip whole again (a lost chip: its rebuild sends every
 *  texture again; picsOnce.js restoreAllPictures waits for this, behind its
 *  veil), a strip at a time, a slice at a time; the readers' cache with them.
 *  A strip still sent to a chip before its turn is unpacked there and then
 *  (paletteTex.js's upload). */
export async function unpackAllFrames() {
  for (const s of [..._packed]) await _unpackSliced(s);
  return 0;
}

let _timer = 0, _restoring = false;
/** pixiApp.js, beside the effects' pack: once a second, every strip the chip
 *  has drawn is packed. */
export function startFramePack(renderer, canvas, addPictureRestorer) {
  if (!FRAME_PACK) return;
  /* picsOnce.js's rebuild, handed in by pixiApp.js so that this module
     imports nothing of Pixi's (server/test/inflate-raw.test.mjs runs it) */
  if (!_restoring && typeof addPictureRestorer === 'function') { addPictureRestorer(unpackAllFrames); _restoring = true; }
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => {
    try {
      const gl = renderer.gl;
      if (!gl || gl.isContextLost()) return;
      for (const src of _want) {
        if (src.destroyed) { _want.delete(src); continue; }
        if (!(src._gpuData && src._gpuData[renderer.uid])) continue;
        _want.delete(src);
        _queue(src);
      }
    } catch (e) { /* next time */ }
  }, 1000);
}

/** What a packed strip holds in the page: its deflated frames and the rest,
 *  and its frames in the readers' cache (memprobe.mjs counts it as the
 *  strip's numbers, so the census sees what is held, not nothing). */
export function framePackHeld(src) {
  const F = src && src.__btFP;
  if (!F) return 0;
  let n = F.bytes;
  const pre = src.uid + ':';
  for (const [k, v] of _cache) if (k.startsWith(pre)) n += v.length;
  return n;
}

/** QA: a strip's numbers whole, packed or not, leaving it as it is (the
 *  scenarios that compare a strip's numbers: mp-stripgentle, mp-picsonce). */
export function stripNumbersOf(src) {
  if (!src) return null;
  if (src._btNumbers) return src._btNumbers;
  const F = src.__btFP;
  if (!F) return null;
  const idx = _rebuild(F);
  return idx ? { w: F.st, h: F.h, idx, pal: F.pal } : null;
}

/** Probe: window.__btFramePack(). */
export function framePackStats() {
  return { on: FRAME_PACK, ..._st, readMsMax: +_st.readMsMax.toFixed(2), readMsSum: +_st.readMsSum.toFixed(1),
    waiting: _want.size, packedNow: _packed.size, cache: { frames: _cache.size, kb: Math.round(_cacheBytes / 1024), capFrames: CACHE_FRAMES, capKB: CACHE_BYTES / 1024 },
    heldKB: Math.round([..._packed].reduce((a, s) => a + ((s.__btFP && s.__btFP.bytes) || 0), 0) / 1024) };
}

if (typeof window !== 'undefined') {
  window.__btFramePackHeld = framePackHeld;
  window.__btStripNumbers = stripNumbersOf;
  window.__btFramePackFrame = packedFrame;   /* QA: one frame as a reader gets it */
  window.__btFramePack = framePackStats;
}
