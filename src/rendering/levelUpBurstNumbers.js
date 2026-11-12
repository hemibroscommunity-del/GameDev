/* ═══ v2.3.5004: THE LEVEL-UP BURST FROM ITS COLOUR NUMBERS ═══
 *
 * docs/specs/pictures-256.md §7.  The burst is the page's own overlay (z 70,
 * over the HUD's HTML: LevelUpBurst.jsx), and the loading screen held its
 * 2172 x 724 strip decoded for the session -- 6.29 MB, four bytes a pixel
 * whatever its colours.  Now it holds the eight frames' rects as COLOUR
 * NUMBERS: a byte a pixel and 256 colours, 0.88 MB in the page's heap, read
 * behind the loading screen (the preloading law) from
 * public/sprites/fx/levelup-burst-v1-f0..f7.p256.png (made by
 * tools/art/levelup-numbers.mjs: the strip on 256 colours, the owner's yes on
 * 2026-11-12).
 *
 * As a frame comes up, the burst turns that frame's numbers into colours on
 * a canvas the size of the largest frame, in the art's own pixels, and the
 * page scales the canvas exactly as it scaled the strip (k a pixel,
 * `image-rendering: auto`): eight draws a burst, never one a frame.  When the
 * burst ends the canvas is emptied (its width 0), and the one ImageData the
 * bursts on screen share is let go with the last of them.
 *
 * THE PAGE'S ONE THREAD (CLAUDE.md, held-budget.mjs): a draw is the largest
 * frame at most, 359 x 645 = 231,555 px -- one table look-up a pixel into a
 * 32-bit word and one putImageData of 0.93 MB, no read back, no resample
 * (0.4 ms for the look-ups on this box; `drawMs` below is the rig's number).
 * Well under the 12 ms line, so it is done in place: on a worker it would
 * have to come back as a picture, decoded at four bytes a pixel again.
 *
 * THE LOAD goes through loadSetLater's door (a 20 s time limit, then asked
 * again later in retryLooks.js's rounds; server/test/picture-door.test.mjs).
 * The numbers are unpacked with the browser's DecompressionStream (png8Decode
 * .js); a browser without one (iOS before 16.4), `?burstnumbers=0`, or a first
 * load that failed: the strip, warmed behind the loading screen as before
 * (levelUpBurstPreload.js).
 */
import { loadSetLater } from './loadSetLater.js';
import { decodePng8 } from './png8Decode.js';
import { LEVELUP_NUMBER_SRCS, LEVELUP_BURST_NUMBERS, LEVELUP_MAX_W, LEVELUP_MAX_H } from '../data/levelUpBurst.js';

const _frames = Object.create(null);   /* '0'..'7' -> { w, h, idx (a byte a pixel, w a row), pal (256 ImageData words) } */
let _set = null;
let _first = null;
const _stats = { draws: 0, lastMs: 0, maxMs: 0 };

/* an ImageData's pixels as 32-bit words: r, g, b, a in memory order */
const LITTLE = (() => { try { return new Uint8Array(new Uint32Array([1]).buffer)[0] === 1; } catch (e) { return true; } })();

/* a frame's palette PNG, read -> what is kept: its numbers, and its colours
   as the words an ImageData holds (straight alpha, as putImageData takes them
   and as the strip's <img> was decoded) */
function keep(p) {
  if (!p || p.stride !== p.w) return null;
  const pal = new Uint32Array(256);
  for (let c = 0; c < p.n; c++) {
    const r = p.rgb[c * 3], g = p.rgb[c * 3 + 1], b = p.rgb[c * 3 + 2], a = p.alpha[c];
    pal[c] = LITTLE ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  }
  return { w: p.w, h: p.h, idx: p.idx, pal };
}

/** Is the burst drawn from its numbers on this page? (the switch, and a browser that can unpack them) */
export function levelUpNumbersWanted() {
  return LEVELUP_BURST_NUMBERS && typeof DecompressionStream !== 'undefined' && typeof fetch === 'function';
}

/** The loading screen's load: resolves true once all eight frames are in,
 *  false if one is not after its first try (never throws). */
export function loadLevelUpNumbers() {
  if (!levelUpNumbersWanted()) return Promise.resolve(false);
  if (!_set) {
    const files = Object.create(null);
    LEVELUP_NUMBER_SRCS.forEach((u, i) => { files[i] = u; });
    _set = loadSetLater({
      files,
      into: _frames,
      load: (u) => fetch(u)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((b) => (b ? decodePng8(new Uint8Array(b)) : null))
        .then(keep),
    });
    _first = _set.start().then(levelUpNumbersReady, () => false);
  }
  return _first;
}

/** All eight frames in? */
export function levelUpNumbersReady() {
  for (let i = 0; i < LEVELUP_NUMBER_SRCS.length; i++) if (!_frames[i]) return false;
  return true;
}

/** A burst drawn from the strip because a frame was missing asks again for it
 *  (only once its later round has come: loadSetLater's ensure). */
export function ensureLevelUpNumbers() { if (_set) _set.ensure(); }

/* the one ImageData the bursts on screen share (two at most), the size of
   the largest frame: let go when the last of them ends */
let _scratch = null;
let _users = 0;
/** A burst that draws from the numbers holds this while it is on screen;
 *  the function it returns lets go. */
export function levelUpNumbersUse() {
  _users++;
  let done = false;
  return () => { if (done) return; done = true; _users = Math.max(0, _users - 1); if (!_users) _scratch = null; };
}

/** Frame `i` into `canvas` (made LEVELUP_MAX_W x LEVELUP_MAX_H here, the
 *  frame at its top left, the rest see-through).  False if it cannot be. */
export function drawLevelUpFrame(canvas, i) {
  const f = _frames[i];
  if (!f || !canvas) return false;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (canvas.width !== LEVELUP_MAX_W) canvas.width = LEVELUP_MAX_W;
  if (canvas.height !== LEVELUP_MAX_H) canvas.height = LEVELUP_MAX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const W = LEVELUP_MAX_W;
  if (!_scratch) _scratch = ctx.createImageData(LEVELUP_MAX_W, LEVELUP_MAX_H);
  const out = new Uint32Array(_scratch.data.buffer);
  out.fill(0);
  const { w, h, idx, pal } = f;
  for (let y = 0; y < h; y++) {
    const o = y * W, s = y * w;
    for (let x = 0; x < w; x++) out[o + x] = pal[idx[s + x]];
  }
  ctx.putImageData(_scratch, 0, 0);
  const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  _stats.draws++; _stats.lastMs = ms; if (ms > _stats.maxMs) _stats.maxMs = ms;
  return true;
}

/** An emptied canvas holds nothing (the burst's end, or a burst gone). */
export function emptyLevelUpCanvas(canvas) {
  if (!canvas) return;
  try { canvas.width = 0; canvas.height = 0; } catch (e) { /* gone */ }
}

/** For the rigs (window.__btLevelUpWarm.numbers): what is held, and the draws' cost. */
export function levelUpNumbersStats() {
  let frames = 0, bytes = 0;
  for (let i = 0; i < LEVELUP_NUMBER_SRCS.length; i++) {
    const f = _frames[i];
    if (f) { frames++; bytes += f.idx.length + f.pal.byteLength; }
  }
  return {
    wanted: levelUpNumbersWanted(), ready: levelUpNumbersReady(), frames, bytes,
    scratch: !!_scratch, users: _users,
    draws: _stats.draws, lastMs: Math.round(_stats.lastMs * 100) / 100, maxMs: Math.round(_stats.maxMs * 100) / 100,
  };
}
