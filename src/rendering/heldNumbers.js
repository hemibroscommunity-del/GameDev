/* ═══ v2.3.3699: A MONSTER'S PICTURE HELD ONCE, ITS COLOURS AS NUMBERS ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game. Getting that to run as low as possible
 * without sacrificing performance is the goal", and that night: "Keep running
 * tests through the night on memory fixes/improvements".
 *
 * A monster's strips (zoneTextures.js loadTrackedStrip: every pose of the fire
 * goblin, the mummy, the skeleton, the snowman, the rock monster, the fishman)
 * are cut to their art and packed onto a canvas, and once drawn each is held
 * twice: the canvas in the page, and its copy on the graphics chip, which is
 * what is drawn.  At a Flame Fields fight that is 22 MB of the page
 * (mp-battlemem's ledger, every picture counted once), the most of any one
 * kind after the walking gear sheets.  keepOnGpuOnly (gpuOnly.js) cannot just
 * empty them, for two reasons:
 *   - two things read a monster's picture back on the CPU: a hit's chips
 *     (hitMaterialFx.js bakeChips) and an arrow stuck in it (arrowPin.js
 *     frameData);
 *   - a black screen's rebuilt renderer uploads them again from their
 *     canvases: the monster modules keep their strips for the page and reuse
 *     them across rebuilds (pixiRenderer.js, v2.3.778).  Emptied, every
 *     monster would be drawn blank after a rebuild.
 *
 * But nearly all of their art is drawn on 256 colours or fewer (palette PNGs).
 * So once a strip has been DRAWN its canvas is read once into its COLOUR
 * NUMBERS -- a byte a pixel, each pixel its colour's place in the strip's own
 * list of at most 256 colours, the colours exactly as the canvas gives them
 * back -- and then emptied (keepOnGpuOnly): the picture is on the chip, and
 * the page keeps a quarter of what it kept.
 *   - The two readers read the numbers (readSourceRect, the same pixels the
 *     canvas would have given them).
 *   - A renderer that has not got the picture -- a rebuild's, or Pixi's own
 *     collector having let it go -- has the canvas filled again from the
 *     numbers the moment it uploads it (GlTextureSystem.onSourceUpdate,
 *     patched once a page: installHeldRefill), and it is emptied again once
 *     drawn.
 *   - A strip on more colours (the snowman's throws: tens of thousands) keeps
 *     its canvas, as before; so does one never drawn.
 *
 * Nothing drawn changes: the chip's copy is uploaded from the canvas as
 * before.  The reading is done by the effects renderer's sweep (every 500 ms,
 * gpuOnly.js's), a few milliseconds at most a sweep, never while a strip is
 * still waiting to be drawn.
 *
 * `?held=0` keeps every canvas; so do `?gpucopies` and QA's __btTrimVerify
 * (gpuOnly.js keepCopies).  QA: window.__btHeld(). */
import { keepOnGpuOnly, gpuCopiesKept } from './gpuOnly.js';

const MAX_COLOURS = 256;
const SWEEP_BUDGET_MS = 6;   /* the most one sweep spends reading canvases */

const _off = (() => {
  try { return typeof location !== 'undefined' && /[?&]held=0\b/.test(location.search || ''); } catch (e) { return false; }
})();

/* waiting to be drawn, then read and emptied */
const _pending = new Set();
let _held = 0;          /* canvases emptied, their numbers kept */
let _heldBytes = 0;     /* what those canvases held (4 bytes a pixel) */
let _numberBytes = 0;   /* what their numbers hold (1 a pixel) */
let _many = 0;          /* strips on more than 256 colours: kept as canvases */
let _refills = 0;       /* canvases filled again for a renderer that had not got them */
let _reads = 0;         /* readSourceRect answered from the numbers (the chips, a stuck arrow) */
const _readsBy = Object.create(null);   /* ...by who asked ('chips', 'pin') */
let _installed = false;

export function heldOff() { return _off; }

/** A canvas's colour numbers -- { w, h, idx, pal } with idx a byte a pixel and
 *  pal its colours as the canvas reads them back (RGBA bytes packed in one
 *  32-bit number each, pal[0] see-through) -- or null when it has more than
 *  256 colours or cannot be read. */
export function numbersOf(cv) {
  const w = (cv && cv.width) | 0, h = (cv && cv.height) | 0;
  if (!w || !h) return null;
  let d;
  try { d = cv.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
  return numbersOfPixels(d, w, h);
}

/** The same from RGBA bytes (a canvas's getImageData), so the rule can be
 *  checked without a canvas (server/test/held-numbers.test.mjs). */
export function numbersOfPixels(d, w, h) {
  const n = w * h;
  if (!d || d.length < n * 4) return null;
  const px = new Uint32Array(d.buffer, d.byteOffset, n);
  const idx = new Uint8Array(n);
  /* a small open table: a colour -> its place + 1 (0 = empty slot) */
  const keys = new Uint32Array(1024);
  const vals = new Uint16Array(1024);
  const pal = new Uint32Array(MAX_COLOURS);
  let count = 1;   /* place 0 is see-through: every pixel of alpha 0 reads back 0,0,0,0 */
  let lastK = 0, lastI = 0;
  for (let i = 0; i < n; i++) {
    const k = px[i];
    if (k === lastK) { idx[i] = lastI; continue; }
    let ci = 0;
    if (k !== 0) {
      let s = Math.imul(k, 0x9E3779B1) >>> 22;
      for (;;) {
        const v = vals[s];
        if (v === 0) {
          if (count >= MAX_COLOURS) return null;
          pal[count] = k; keys[s] = k; vals[s] = count + 1; ci = count++;
          break;
        }
        if (keys[s] === k) { ci = v - 1; break; }
        s = (s + 1) & 1023;
      }
    }
    idx[i] = ci; lastK = k; lastI = ci;
  }
  return { w, h, idx, pal: pal.slice(0, count) };
}

/** RGBA bytes of a rectangle of the numbers (clamped to them), as the canvas
 *  would have read back: a Uint8ClampedArray of sw * sh * 4. */
export function pixelsOfNumbers(nums, sx, sy, sw, sh) {
  const out = new Uint8ClampedArray(sw * sh * 4);
  const o32 = new Uint32Array(out.buffer);
  const { w, h, idx, pal } = nums;
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy);
  const x1 = Math.min(w, sx + sw), y1 = Math.min(h, sy + sh);
  for (let y = y0; y < y1; y++) {
    const row = y * w, orow = (y - sy) * sw - sx;
    for (let x = x0; x < x1; x++) o32[orow + x] = pal[idx[row + x]];
  }
  return out;
}

/** Draw a rectangle of `source`'s picture onto `ctx` at (dx, dy), 1:1 --
 *  what ctx.drawImage(source.resource, sx, sy, sw, sh, dx, dy, sw, sh) did --
 *  from its canvas, or from its numbers once the canvas has gone.  For the
 *  readers that draw into an empty scratch canvas (putImageData replaces
 *  rather than blends).  Returns false when there is nothing to read.  `who`
 *  names the reader for the probe's count. */
export function readSourceRect(ctx, source, sx, sy, sw, sh, dx, dy, who) {
  const res = source && source.resource;
  sx = Math.round(sx); sy = Math.round(sy); sw = Math.round(sw); sh = Math.round(sh);
  if (!(sw > 0) || !(sh > 0)) return false;
  if (res && res.width > 0) { ctx.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh); return true; }
  const nums = source && source._btNumbers;
  if (!nums || typeof ImageData === 'undefined') return false;
  ctx.putImageData(new ImageData(pixelsOfNumbers(nums, sx, sy, sw, sh), sw, sh), Math.round(dx), Math.round(dy));
  _reads++;
  const k = who || 'other';
  _readsBy[k] = (_readsBy[k] || 0) + 1;
  return true;
}

/** The canvas filled again from its numbers, for a renderer that is about to
 *  upload it; it waits to be emptied again once drawn.  True when filled. */
export function refillFromNumbers(source) {
  const nums = source && source._btNumbers;
  const cv = source && source.resource;
  if (!nums || !cv || typeof cv.getContext !== 'function' || cv.width > 0 || typeof ImageData === 'undefined') return false;
  cv.width = nums.w; cv.height = nums.h;
  cv.getContext('2d').putImageData(new ImageData(pixelsOfNumbers(nums, 0, 0, nums.w, nums.h), nums.w, nums.h), 0, 0);
  _refills++;
  _pending.add(source);
  return true;
}

/** loadTrackedStrip: this strip's canvas is to be read into numbers and
 *  emptied once it has been drawn. */
export function holdOnceDrawn(source) {
  if (_off || !source || source.destroyed) return;
  _pending.add(source);
}

/** Let go of a source the loader is destroying (zoneTextures _releaseCrops). */
export function forgetHeld(source) {
  if (!source) return;
  _pending.delete(source);
  if (source._btNumbers) { _numberBytes -= source._btNumbers.idx.length; source._btNumbers = null; }
}

/** The sweep (effectsRenderer.update, every GPU_WAIT_MS): every strip this
 *  renderer has drawn is read into its numbers and its canvas emptied, a few
 *  milliseconds' worth a call.  Returns how many canvases it emptied. */
export function emptyHeldOnceDrawn(renderer) {
  if (!_pending.size || !renderer) return 0;
  if (_off || gpuCopiesKept()) { _pending.clear(); return 0; }
  /* not on a lost context: the rebuild 2.5 s on uploads them again */
  try {
    const gl = renderer.gl;
    if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) return 0;
  } catch (e) { return 0; }
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  let n = 0;
  for (const src of _pending) {
    const cv = src && src.resource;
    if (!src || src.destroyed || !cv || typeof cv.getContext !== 'function' || !(cv.width > 0)) { _pending.delete(src); continue; }
    /* drawn: Pixi made this renderer's copy as it first bound it */
    if (!(src._gpuData && src._gpuData[renderer.uid])) continue;
    _pending.delete(src);
    const bytes = cv.width * cv.height * 4;
    if (!src._btNumbers) {
      const nums = numbersOf(cv);
      if (!nums) { _many++; continue; }   /* more than 256 colours: it keeps its canvas */
      src._btNumbers = nums;
      _numberBytes += nums.idx.length;
    }
    if (keepOnGpuOnly(renderer, src)) { n++; _held++; _heldBytes += bytes; }
    if (typeof performance !== 'undefined' && performance.now() - t0 > SWEEP_BUDGET_MS) break;
  }
  return n;
}

/** Once a page, before the first renderer: a picture held as numbers is put
 *  back on its canvas whenever a renderer uploads it (its first upload to a
 *  rebuilt renderer, or Pixi's collector having let it go).  `GlTextureSystem`
 *  is Pixi's (pixiApp.js passes it: this module imports nothing of Pixi's, so
 *  its rules run in node, server/test/held-numbers.test.mjs). */
export function installHeldRefill(GlTextureSystem) {
  if (_installed || _off) return;
  const proto = GlTextureSystem && GlTextureSystem.prototype;
  if (!proto || typeof proto.onSourceUpdate !== 'function') return;
  const upload = proto.onSourceUpdate;
  proto.onSourceUpdate = function (source) {
    if (source && source._btNumbers) { try { refillFromNumbers(source); } catch (e) { /* uploaded as it is */ } }
    return upload.call(this, source);
  };
  _installed = true;
}

if (typeof window !== 'undefined') {
  window.__btHeld = () => ({
    off: _off, installed: _installed, pending: _pending.size,
    held: _held, heldMb: +(_heldBytes / 1048576).toFixed(2),
    numbersMb: +(_numberBytes / 1048576).toFixed(2),
    many: _many, refills: _refills, reads: _reads, readsBy: { ..._readsBy },
  });
}
