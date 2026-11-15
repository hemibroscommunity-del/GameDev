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

/* ═══ v2.3.5236 (card O PR 14b): THE OTHER PROGRAMS' PICTURES AND ANSWERS ═══
   Each worked here on the CPU from the program's own lines, at inputs where
   every term the CPU cannot follow to the bit is multiplied away (said at
   each).  Pure: server/test/self-test.test.mjs holds each against the
   lines it copies. */
const N = SELF_SIZE;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const byte = (v) => Math.round(clamp01(v) * 255);
/** A picture of these four colours, by the known picture's numbers. */
export function selfPicture(pal) {
  const idx = selfIdx();
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < idx.length; i++) for (let c = 0; c < 4; c++) out[i * 4 + c] = pal[idx[i] * 4 + c];
  return out;
}

/* ── THE SHARP READ (sharpPixels.js SHARP_SAMPLE_GLSL; the one program's
   too): an 8 x 8 picture drawn twice its size.  Magnified exactly 2x the
   sharp read lands every pixel on a texel's middle (f is 1 on even pixels,
   0 on odd: base + f is k + 0.5 for both pixels of texel k), so the answer
   is each texel twice each way; the plain smooth read blends a quarter of
   the neighbour into every pixel.  The texture is smooth (linear), as a
   figure's are. ── */
export const SHARP_SRC = 8;
export function selfSharpRgba() {
  const n = SHARP_SRC;
  const out = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const k = (((x * 3) >> 1) + ((y * 5) >> 1) + (x >= n / 2 ? 1 : 0)) & 3;
    for (let c = 0; c < 4; c++) out[(y * n + x) * 4 + c] = SELF_PAL[k * 4 + c];
  }
  return out;
}
export function selfSharpWant() {
  const src = selfSharpRgba(), n = SHARP_SRC;
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let c = 0; c < 4; c++) out[(y * N + x) * 4 + c] = src[((y >> 1) * n + (x >> 1)) * 4 + c];
  return out;
}

/* ── THE SHINE (lightfx/sheenLift.js SHEEN_LIFT; the sheen batcher's and
   the look program's shine): the sun's side 0 (the lift's `side` exactly
   0.5), no figure frame (uFig.z 0), a white tint -- what is left is a
   function of each pixel's colour: its highlight (`hi`, a smoothstep of its
   brightness) lifting each channel toward the ceiling, rolled off.  Four
   colours, chosen where the lift is still steep (near the ceiling it
   saturates, and a moved line would not show): dark (no lift), and three
   that the highlight's start, its end and the ceiling each move past the
   allowance (12, 9 and 7 levels of 255).  The sun-side weight cannot show
   with the sun at 0: the shine's lines are checked as text against these
   (SHEEN_LINES, self-test.test.mjs §5). ── */
export const SELF_SHEEN = Object.freeze({ r: 1.0, g: 0.95, b: 0.9, k: 1 });
export const SELF_SHEEN_PAL = Object.freeze([
  40, 60, 90, 255,
  190, 185, 40, 255,
  230, 215, 90, 255,
  255, 255, 166, 255,
]);
/* the shine's numbers this copies (sheenLift.js: the highlight's smoothstep;
   sheenBatch.js SHEEN_CEIL; the side's weight) */
export const SHEEN_LINES = Object.freeze({ e0: 0.55, e1: 0.96, ceil: 0.92, w: 0.35 });
/* one pixel lifted: its straight colour after SHEEN_LIFT, and `hi` (the
   art's highlight mask, which the glint's grade reads too) */
function liftPixel(c, a, sh, L) {
  const U = [sh.r, sh.g, sh.b];
  const art = c.map((v) => clamp01(v / a / 1));
  const hi = smooth(L.e0, L.e1, 0.299 * art[0] + 0.587 * art[1] + 0.114 * art[2]);
  const s = sh.k * hi * (L.w + (1 - L.w) * 0.5);
  const col = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    let v = c[k] / a;
    const head = Math.max(U[k] * L.ceil - v, 0);
    v += head * (1 - Math.exp(-(U[k] * s) / Math.max(head, 0.001)));
    col[k] = Math.min(v, 1);
  }
  return { col, hi };
}
/** SHEEN_LIFT on one premultiplied RGBA picture (bytes), the sun's side 0,
 *  no figure frame, a white tint; bytes out.  `L`: the shine's numbers (a
 *  test moves one to see the answer can tell). */
export function sheenLiftCpu(rgba, sh = SELF_SHEEN, L = SHEEN_LINES) {
  return glintCpu(rgba, sh, null, L);
}
/* ── v2.3.5237 (14c) THE GLINT (lightfx/glint.js FRAG, the metal's filter):
   its sweep's strength 0 (the band's term is multiplied away), no figure
   frame, the sun's side 0, a white tint -- the shine is SHEEN_LIFT's, as the
   sheen batcher's -- and, given a grade (one colour, no prism, one half), its
   highlights lit in the grade's colour: mixed toward the grade at the lifted
   colour's brightness (x 1.3 + 0.2), by hi x 0.6 x its strength.  An opaque
   picture never reaches the glow round the art (only where alpha < 1). ── */
export const SELF_GRADE = Object.freeze([0.2, 0.55, 1.0, 1.0]);   /* a rare piece's blue, at full strength */
export function glintCpu(rgba, sh = SELF_SHEEN, grade = null, L = SHEEN_LINES) {
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    if (!(a > 0)) continue;
    const { col, hi } = liftPixel([rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255], a, sh, L);
    if (grade && grade[3] > 0) {
      const l = 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2];
      const t = hi * 0.6 * grade[3];
      for (let k = 0; k < 3; k++) { const lit = grade[k] * clamp01(l * 1.3 + 0.2); col[k] = col[k] + (lit - col[k]) * t; }
    }
    for (let k = 0; k < 3; k++) out[i + k] = byte(col[k] * a);
    out[i + 3] = byte(a);
  }
  return out;
}

/* ── v2.3.5237 (14c) THE FILL (fillBatch.js fillBitGl, the whirlwind's
   one-colour monster): each pixel's brightness lifted to a grey (0.5 + 0.8
   x luma, at most 1), its alpha kept, then the template's tint over it.  Its
   own colours gone: a picture's colours wrong would still show (the grey
   is their luma). ── */
export const SELF_FILL_TINT_BYTES = Object.freeze([255, 153, 38]);   /* amber, as the whirlwind's: the sprite's tint goes to the chip as bytes */
export const SELF_FILL_TINT = Object.freeze(SELF_FILL_TINT_BYTES.map((v) => v / 255));
export function selfFillWant(rgba = selfRgba(), tint = SELF_FILL_TINT) {
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    const c = a > 0 ? [rgba[i] / 255 / a, rgba[i + 1] / 255 / a, rgba[i + 2] / 255 / a] : [0, 0, 0];
    const g = clamp01(0.5 + 0.8 * (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]));
    for (let k = 0; k < 3; k++) out[i + k] = byte(g * a * tint[k]);
    out[i + 3] = byte(a);
  }
  return out;
}
export function selfSheenRgba() { return selfPicture(SELF_SHEEN_PAL); }
export function selfSheenWant() { return sheenLiftCpu(selfSheenRgba()); }

/* ── THE SHADOWS' SHADE (lightfx/shadows.js FRAG, the pre-pass's quad):
   the pieces' picture read at five points -- the texel and its four
   neighbours a soft step away -- uShift 0 and uSoft 1, so each read is a
   texel's middle (the edge's held by the texture's clamp); the alpha
   blended .36 / .16 x 4, capped at 1, times uAlpha, in uColor. ── */
export const SELF_SHADE = Object.freeze({ alpha: 0.8, color: Object.freeze([0.2, 0.4, 0.6]), soft: 1 });
const SHADE_A = [0, 85, 170, 255];
/** The pieces' picture: its alpha by the known numbers (premultiplied: no colour). */
export function selfShadeRgba() {
  const idx = selfIdx();
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < idx.length; i++) out[i * 4 + 3] = SHADE_A[idx[i]];
  return out;
}
export function selfShadeWant(sh = SELF_SHADE) {
  const src = selfShadeRgba();
  const A = (x, y) => src[(Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))) * 4 + 3] / 255;
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let a = A(x, y) * 0.36 + (A(x + 1, y) + A(x - 1, y) + A(x, y + 1) + A(x, y - 1)) * 0.16;
    a = Math.min(a, 1) * sh.alpha;
    const o = (y * N + x) * 4;
    out[o] = byte(sh.color[0] * a); out[o + 1] = byte(sh.color[1] * a); out[o + 2] = byte(sh.color[2] * a); out[o + 3] = byte(a);
  }
  return out;
}

/* ── THE MOVING WATER (wheelWater.js FRAG, and its colour-numbers twin) at
   strength 0: the swell, the web, the sparkles, the crests, the surf, the
   flow's streaks and the caps are each multiplied by it (or by min(k,
   1.25)), so what is left is the piece's colour, read at the texel's middle,
   times how wet the field says it is there (wet = smoothstep(0.3, 0.9,
   field.r x 10.625)), premultiplied -- and nothing where it is dry.  The
   field is still open sea (green 255, no flow); its wetness by a pattern of
   its own, so a field read at the wrong place shows. ── */
export const SELF_WET = Object.freeze([0, 10, 17, 24]);   /* field.r: 0, 0.42, 0.71 and 1.0 game px from the shore */
export function selfWaterField() {
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4;
    out[o] = SELF_WET[((x + 2 * y) >> 2) & 3]; out[o + 1] = 255; out[o + 2] = 128; out[o + 3] = 128;
  }
  return out;
}
/** The answer over a piece (straight RGBA bytes: the plain program reads
 *  its rgb, the twin its palette's). */
export function selfWaterWant(piece) {
  const f = selfWaterField();
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const wet = smooth(0.3, 0.9, (f[i * 4] / 255) * 10.625);
    if (!(wet > 0)) continue;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = byte((piece[i * 4 + c] / 255) * wet);
    out[i * 4 + 3] = byte(wet);
  }
  return out;
}

/* ── THE LOOK PROGRAM (lookPalette.js fragSource): a sheet of its own, 16 x
   16 numbers at 8 bits, drawn at its size (no scale, no mip, no armour's
   mask, a body's kind).  Numbers 1 and 2 are no role: their own colours
   from the sheet's table.  3 and 4 are role 1, recoloured by the look's row
   (recol: the row's colour at the pixel's brightness over the role's ref,
   rounded and capped), so the sheet's header, its table, its roles and the
   row of the colours' atlas are all read.  Without a row (none free) 3 and
   4 are their own colours too. ── */
export const SELF_LOOK = Object.freeze({
  table: Object.freeze([[0, 0, 0, 0], [30, 60, 200, 255], [220, 200, 40, 255], [150, 150, 150, 255], [100, 120, 80, 255]]),
  ref: 150, entry: 1, T: Object.freeze([200, 110, 60]), ends: Object.freeze([3, 5]),
});
/** The sheet's manifest row and roles (lookUnpack.js lookSheetSpec's input). */
export function selfLookManifest() {
  return { m: { w: N, h: N, tableRows: Math.ceil((SELF_LOOK.table.length * 2) / N), entries: SELF_LOOK.table.length, bits: 8, ds: 1, mip: false, ends: SELF_LOOK.ends.slice(), refScale: 1, kind: 'body' },
    roles: [{ entry: SELF_LOOK.entry, ref: SELF_LOOK.ref, under: 0 }] };
}
/** The sheet's picture as its PNG would hold it (W x (n + table rows),
 *  opaque): the numbers in red, the table two pixels an entry. */
export function selfLookPicture() {
  const { m } = selfLookManifest();
  const idx = selfIdx();
  const px = new Uint8Array(N * (N + m.tableRows) * 4).fill(255);
  for (let i = 0; i < idx.length; i++) { px[i * 4] = idx[i] + 1; px[i * 4 + 1] = 0; px[i * 4 + 2] = 0; }
  SELF_LOOK.table.forEach((t, e) => {
    const s = (N * N + 2 * e) * 4;
    px[s] = t[0]; px[s + 1] = t[1]; px[s + 4] = t[2]; px[s + 5] = t[3];
  });
  return px;
}
export function selfLookWant(withRow = true) {
  const idx = selfIdx();
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < idx.length; i++) {
    const k = idx[i] + 1;
    const c = SELF_LOOK.table[k];
    let rgb = [c[0], c[1], c[2]];
    if (withRow && k >= SELF_LOOK.ends[0] && k < SELF_LOOK.ends[1]) {
      const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / SELF_LOOK.ref;
      rgb = SELF_LOOK.T.map((t) => Math.min(255, Math.floor(t * lum + 0.5)));
    }
    for (let ch = 0; ch < 3; ch++) out[i * 4 + ch] = Math.floor((rgb[ch] * c[3]) / 255 + 0.5);
    out[i * 4 + 3] = c[3];
  }
  return out;
}
/** The look's row (lookPalette.js lookRow's form): the role's entry. */
export function selfLookRow() {
  const rgba = new Uint8Array(256 * 4);
  rgba.set([SELF_LOOK.T[0], SELF_LOOK.T[1], SELF_LOOK.T[2], 255], SELF_LOOK.entry * 4);
  return rgba;
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
export function selfCheck(name, got, want, ms = 0, tol = 2) {
  let off = Infinity;
  try { off = selfDiff(got, want, tol); } catch (e) { off = Infinity; }
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
    /* every picture the program drew must be right (each held to its own
       answer, v2.3.5236): a wrong one is its answer; else, any not read
       back, unread (kept as today); else a pass */
    let wrong = -1, unread = false;
    for (let k = 0; k < p.got.length; k++) {
      if (!p.got[k]) unread = true;
      else if (selfDiff(p.got[k], p.wants[k], p.tols[k]) !== 0) { wrong = k; break; }
    }
    const at = wrong >= 0 ? wrong : 0;
    got = wrong >= 0 ? p.got[wrong] : (unread ? null : p.got[0]);
    for (const j of p.jobs) _endRead(j);
    _draws.push([p.name, Math.round(p.drawMs * 10) / 10, Math.round(p.readMs * 10) / 10, p.tries]);
    if (!selfCheck(p.name, got, p.wants[at], p.drawMs + p.readMs, p.tols[at])) { try { p.onFail(); } catch (e) { /* falls back as it can */ } }
  }
  /* (a fallback above may have queued a test of its own -- the one
     program's queues the sharp batcher's -- and with it this poll) */
  if (_pending.length) { if (!_queued) { _queued = true; beforeDraw(_poll); } return; }
  if (_resolveAll) { const r = _resolveAll; _resolveAll = null; _allDone = null; r(selfResults()); }
}
/** A program's drawn pictures (selfDraw's textures, each held to `want`):
 *  copied now behind a fence (the textures destroyed), judged at the top of
 *  a later frame once the copy is done; `onFail()` falls it back alone.
 *  `drawMs`: the draw's time.
 *  v2.3.5236 (14b): `want` is one answer for every picture, or a list of
 *  them, one a picture (in `rts`' order); an answer may be `{ want, tol }`,
 *  a channel allowed to round by `tol` (2 unless said: a program that works
 *  a curve at a phone's half precision, the shine, is allowed 4). */
export function selfQueue(name, renderer, rts, want, onFail, drawMs = 0) {
  const t0 = performance.now();
  const list = [].concat(rts || []);
  const each = Array.isArray(want) && want.length === list.length && want.every((w) => w && (w.want || ArrayBuffer.isView(w))) ? want : list.map(() => want);
  const wants = each.map((w) => (w && w.want ? w.want : w));
  const tols = each.map((w) => (w && w.want && Number.isFinite(w.tol) ? w.tol : 2));
  const jobs = list.map((rt) => _startRead(renderer, rt));
  selfDrop(list);
  _pending.push({ name, jobs, got: jobs.map((j) => (j ? undefined : null)), wants, tols, onFail: typeof onFail === 'function' ? onFail : () => {},
    drawMs: drawMs + (performance.now() - t0), readMs: 0, tries: 0 });
  if (!_queued) { _queued = true; beforeDraw(_poll); }
}

/** v2.3.5234 (the gatekeeper's sitting 20): this program's pictures wait for
 *  their verdict (paletteTex.js paletteDecided: what loads in that window
 *  waits with them; v2.3.5236: the look's choices too, lookPalette.js
 *  lookSheenState, TRAPS §340). */
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
