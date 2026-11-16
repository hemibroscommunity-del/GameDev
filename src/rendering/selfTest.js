/* ═══ v2.3.5234: THE SELF-TEST AT THE DOOR (card O PR 14a; grand plan step 1.7) ═══
 *
 * The game's own drawing programs (drawLanes.js PROGRAMS) are checked to LINK
 * behind the loading screen, each in its own warm-up.  A program can link and
 * still draw wrong on one chip -- the one program lost a bro's legs on the
 * owner's iPhone in four facings (TRAPS §225, §260), and nothing on the page
 * could tell.  So each program, where it is warmed, also DRAWS A KNOWN PICTURE
 * into a small texture and reads it back once; the answer is worked on the
 * CPU from the same numbers (its colour numbers and its palette: no art
 * picture is read back).  Pixels are compared, never a time ("No timing a
 * program's build to decide a lane": the grand plan, part 8).
 *
 *   - A program that draws the wrong picture FALLS BACK ALONE, to its way of
 *     today (the one program to the three; the colour numbers to whole
 *     colours; ...), and the load goes on: a self-test never stops it.
 *   - It DRAWS where each program is warmed today, as the renderer is made,
 *     behind the loading screen; the picture is copied into a pixel buffer
 *     behind a fence as it is drawn, and TAKEN at the top of a later frame
 *     (framePacer.js beforeDraw) once the fence has passed, the fence asked
 *     without waiting: the page is never held for it, where a read straight
 *     after the draw waited on everything queued before it (on this box's
 *     software renderer 114 to 198 ms; 2.7 s at the top of a loading frame).
 *     Until its verdict a program is used as it was; the loading screen's
 *     group (selfTestReady) waits for every verdict.
 *   - The texture is destroyed as soon as it is copied (the memory law).
 *   - The report's `self` names each program that failed, once a sitting
 *     (debug/report.js; the worker has known it since card O's PR 1).
 *   - `?selftest=fail:<name>[,<name>...]` (a lever: QA, mp-selftest) makes a
 *     program fail its test, to see its fallback drawn and the others untouched;
 *     `?selftest=0` runs none (the off-ramp, and the measure of its time).
 *
 * Card O PR 14 is three PRs (the planning session's word, 2026-11-14): 14a
 * (this) the frame, the one program and the colour numbers; 14b the look
 * palette, the sharp pixels, the sheen batch and the shadows' pre-pass; 14c
 * the clip, the fill and the glint.  A program not yet tested has no row
 * in the probe and is never in `self`.  Spec: docs/specs/self-test.md.
 */
/* Imports only the pacer's top-of-a-frame queue and the page's reader of its
   switches, neither reaching pixi.js (node tests it, and the field report
   reads its failures); the render texture's class is handed in by the
   program's file (selfDraw). */
import { beforeDraw } from '../game/framePacer.js';
import { swValue } from '../game/switches.js';   /* v2.3.5234: `?selftest`, through the page's one reader (card T, v2.3.5306) */

/* the known picture: 16 x 16 colour numbers 0..3 in a pattern that tells a
   row from a column and a half from a half (a sampler reading the wrong
   texel, a flipped row or a swapped channel each draws a different picture) */
export const SELF_SIZE = 16;
/* four opaque colours (premultiplied and straight are the same at alpha 255) */
export const SELF_PAL = Object.freeze([
  0x20, 0x40, 0x60, 0xff,
  0xe0, 0x30, 0x10, 0xff,
  0x10, 0xc0, 0x50, 0xff,
  0xf0, 0xe0, 0xa0, 0xff,
]);
/** The picture's colour numbers (a new array each call: a caller may keep it). */
export function selfIdx() {
  const n = SELF_SIZE;
  const idx = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) idx[y * n + x] = (((x * 3) >> 2) + ((y * 5) >> 2) + (x >= n / 2 ? 1 : 0)) & 3;
  return idx;
}
/** The palette as bytes (makePaletteSource's `rgba`). */
export function selfPalBytes() { return new Uint8Array(SELF_PAL); }
/** THE ANSWER: the picture recoloured on the CPU, RGBA, rows top-down. */
export function selfRgba() {
  const idx = selfIdx();
  const out = new Uint8Array(idx.length * 4);
  for (let i = 0; i < idx.length; i++) for (let c = 0; c < 4; c++) out[i * 4 + c] = SELF_PAL[idx[i] * 4 + c];
  return out;
}

/* ── the lever: ?selftest=fail:<name>[,<name>...] ── */
let _forced = null;
/* the address's `selftest`, as the search string the two readers below take:
   read through the page's one reader of its switches (src/game/switches.js,
   card T's v2.3.5306; tools/guards/switch-reader.test.mjs) */
function _search() {
  try { const v = swValue('selftest'); return v == null ? '' : '?selftest=' + v; } catch (e) { return ''; }
}
/** The programs the address makes fail (QA), from a search string. */
export function selfForcedFrom(search) {
  const m = /(?:^|[?&])selftest=fail:([a-z,]+)(?:&|$)/.exec(typeof search === 'string' ? search : '');
  return m ? m[1].split(',').filter(Boolean) : [];
}
/** v2.3.5234: `?selftest=0` (or off, false): no self-test on this page (an
 *  off-ramp, and the measure of the loading screen's added time). */
export function selfTestOnFrom(search) {
  return !/(?:^|[?&])selftest=(0|off|false)(?:&|$)/.test(typeof search === 'string' ? search : '');
}
let _on = null;
export function selfTestOn() {
  if (_on === null) _on = selfTestOnFrom(_search());
  return _on;
}
function forced(name) {
  if (_forced === null) _forced = selfForcedFrom(_search());
  return _forced.includes(name);
}

/* ── the results: name -> { result: 'pass' | 'fail' | 'forced' | 'unread' | 'skipped', why, ms, off } ── */
const _res = Object.create(null);
let _ms = 0;
const _draws = [];   /* each program's ms: [name, drawn and copied, taken at the top of later frames, frames waited] (the probe's: where the time goes) */
/** Two pictures the same, within `tol` a channel (a chip may round a colour
 *  by one); the number of pixels that differ. */
export function selfDiff(got, want, tol = 2) {
  if (!got || !want || got.length !== want.length) return Infinity;
  let off = 0;
  for (let i = 0; i < want.length; i += 4) {
    if (Math.abs(got[i] - want[i]) > tol || Math.abs(got[i + 1] - want[i + 1]) > tol || Math.abs(got[i + 2] - want[i + 2]) > tol
      || Math.abs(got[i + 3] - want[i + 3]) > tol) off++;
  }
  return off;
}
/** A program's test: its drawn picture against the answer.  True if it
 *  passes (and the address does not make it fail); the caller falls back
 *  alone on false.  Never throws.
 *  NOTHING READ BACK (`got` null: the picture not made, or its copy never
 *  done) is `unread` and true: the program is kept as today and never named
 *  in `self`.  Only a picture read and wrong falls a program back: a read
 *  that fails says nothing of the program, and the colour numbers' way back,
 *  whole colours, costs an iPhone's memory (the memory law). */
export function selfCheck(name, got, want, ms = 0) {
  let off = Infinity;
  try { off = selfDiff(got, want); } catch (e) { off = Infinity; }
  const f = forced(name);
  if (!got && !f) {
    _res[name] = { result: 'unread', why: 'nothing read back: the program kept as today', ms: Math.round(ms * 100) / 100, off: null };
    _ms += ms;
    return true;
  }
  const pass = off === 0 && !f;
  _res[name] = { result: f ? 'forced' : pass ? 'pass' : 'fail', why: f ? 'the address (?selftest=fail)' : pass ? null : (got ? off + ' of ' + (want.length / 4) + ' pixels wrong' : 'nothing read back'), ms: Math.round(ms * 100) / 100, off: off === Infinity ? null : off };
  _ms += ms;
  return pass;
}
/** A program not tested here (switched off, not built on this device): said, never in `self`. */
export function selfSkip(name, why) {
  if (!_res[name]) _res[name] = { result: 'skipped', why: String(why || ''), ms: 0, off: null };
}
/** The programs that failed their test (forced included): the report's `self`. */
export function selfFailures() {
  return Object.keys(_res).filter((k) => _res[k].result === 'fail' || _res[k].result === 'forced').sort();
}
/** Every result so far, and the ms the tests took (the loading screen's added time). */
export function selfResults() {
  const out = Object.create(null);
  for (const k of Object.keys(_res)) out[k] = { ..._res[k] };
  return { results: out, failed: selfFailures(), ms: Math.round(_ms * 100) / 100, draws: _draws.map((d) => d.slice()) };
}

/** Draw `node` into a 16 x 16 texture with `renderer` (not read here):
 *  the texture, or null.  `RT` is Pixi's RenderTexture (the caller's
 *  import); the node is the caller's.  The texture goes to selfQueue (read at
 *  the top of the next frame, then destroyed) or to selfDrop. */
export function selfDraw(renderer, node, RT) {
  let rt = null;
  try {
    rt = RT.create({ width: SELF_SIZE, height: SELF_SIZE, resolution: 1 });
    renderer.render({ container: node, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    return rt;
  } catch (e) {
    try { if (rt) rt.destroy(true); } catch (e2) { /* gone */ }
    return null;
  }
}
/** Destroy what selfDraw made (a program not judged: it did not link). */
export function selfDrop(rts) {
  for (const rt of [].concat(rts || [])) { try { if (rt) rt.destroy(true); } catch (e) { /* gone */ } }
}

/* ── the read, without holding the page (v2.3.5234) ──
   A read straight after the draw (Pixi's extract) waits for everything the
   chip has queued: 114 to 198 ms on this box's software renderer, and 2.7 s
   at the top of a loading frame there.  So each picture is copied into a
   WebGL 2 pixel buffer behind a fence as it is drawn, which costs the page
   nothing, and the fence is asked at the top of each later frame (beforeDraw;
   or 500 ms on with no frame) without waiting: once it has passed, the
   pixels are taken from the buffer and judged. */
const BYTES = SELF_SIZE * SELF_SIZE * 4;
function _startRead(renderer, rt) {
  const gl = renderer && renderer.gl;
  if (!gl || typeof gl.fenceSync !== 'function' || !rt) return null;
  let buf = null;
  const was = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  try {
    const target = renderer.renderTarget.getRenderTarget(rt);
    const glrt = renderer.renderTarget.getGpuRenderTarget(target);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, BYTES, gl.STREAM_READ);
    gl.bindFramebuffer(gl.FRAMEBUFFER, glrt.resolveTargetFramebuffer);
    gl.readPixels(0, 0, SELF_SIZE, SELF_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    return { gl, buf, fence };
  } catch (e) {
    try { if (buf) gl.deleteBuffer(buf); } catch (e2) { /* gone */ }
    return null;
  } finally {
    try { gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.bindFramebuffer(gl.FRAMEBUFFER, was); } catch (e) { /* Pixi binds its own next */ }
  }
}
/* the pixels if the copy is done ('wait' if not yet; null if it failed) */
function _takeRead(job) {
  if (!job) return null;
  const gl = job.gl;
  try {
    const st = gl.clientWaitSync(job.fence, 0, 0);
    if (st === gl.TIMEOUT_EXPIRED) return 'wait';
    if (st === gl.WAIT_FAILED) throw new Error('wait failed');
    const out = new Uint8Array(BYTES);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, job.buf);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, out);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    return out;
  } catch (e) {
    return null;
  }
}
function _endRead(job) {
  if (!job) return;
  try { job.gl.deleteSync(job.fence); } catch (e) { /* gone */ }
  try { job.gl.deleteBuffer(job.buf); } catch (e) { /* gone */ }
}

/* the programs waiting for their verdict */
const _pending = [];
let _queued = false;
let _allDone = null, _resolveAll = null;
const MAX_TRIES = 120;   /* frames (or half-seconds) a copy may take before the program is `unread` (kept as today) */
function _poll() {
  _queued = false;
  for (let i = _pending.length - 1; i >= 0; i--) {
    const p = _pending[i];
    const t0 = performance.now();
    p.tries++;
    let done = true, got;
    for (let k = 0; k < p.jobs.length; k++) {
      if (p.got[k] !== undefined) continue;
      const r = _takeRead(p.jobs[k]);
      if (r === 'wait' && p.tries < MAX_TRIES) { done = false; continue; }
      p.got[k] = r === 'wait' ? null : r;
    }
    p.readMs += performance.now() - t0;
    if (!done) continue;
    _pending.splice(i, 1);
    /* every picture the program drew must be right: a wrong one is its
       answer; else, any not read back, unread (kept as today); else a pass */
    const read = p.got.filter(Boolean);
    const wrong = read.find((px) => selfDiff(px, p.want) !== 0);
    got = wrong || (read.length && read.length === p.got.length ? read[0] : null);
    for (const j of p.jobs) _endRead(j);
    _draws.push([p.name, Math.round(p.drawMs * 10) / 10, Math.round(p.readMs * 10) / 10, p.tries]);
    if (!selfCheck(p.name, got, p.want, p.drawMs + p.readMs)) { try { p.onFail(); } catch (e) { /* falls back as it can */ } }
  }
  if (_pending.length) { _queued = true; beforeDraw(_poll); return; }
  if (_resolveAll) { const r = _resolveAll; _resolveAll = null; _allDone = null; r(selfResults()); }
}
/** A program's drawn pictures (selfDraw's textures, each held to `want`):
 *  copied now behind a fence (the textures destroyed), judged at the top of
 *  a later frame once the copy is done; `onFail()` falls it back alone.
 *  `drawMs`: the draw's time. */
export function selfQueue(name, renderer, rts, want, onFail, drawMs = 0) {
  const t0 = performance.now();
  const list = [].concat(rts || []);
  const jobs = list.map((rt) => _startRead(renderer, rt));
  selfDrop(list);
  _pending.push({ name, jobs, got: jobs.map((j) => (j ? undefined : null)), want, onFail: typeof onFail === 'function' ? onFail : () => {},
    drawMs: drawMs + (performance.now() - t0), readMs: 0, tries: 0 });
  if (!_queued) { _queued = true; beforeDraw(_poll); }
}

/** v2.3.5234 (the gatekeeper's sitting 20): this program's pictures wait for
 *  their verdict (paletteTex.js paletteDecided: what loads in that window
 *  waits with them). */
export function selfPending(name) {
  for (const p of _pending) if (p.name === name) return true;
  return false;
}

/** The loading screen's group (preloadAnimations.js): every verdict in
 *  (the reads at the top of a frame), for loadTimes and QA. */
export function selfTestReady() {
  if (!_pending.length) return Promise.resolve(selfResults());
  if (!_allDone) _allDone = new Promise((res) => { _resolveAll = res; });
  return _allDone;
}

/* QA: what the self-test found (mp-selftest) */
if (typeof window !== 'undefined') window.__btSelfTest = () => selfResults();
