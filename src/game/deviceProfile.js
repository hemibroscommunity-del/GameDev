/* ═══ v2.3.4804: THE DEVICE PROFILE -- ONE PLACE ANSWERS "WHAT IS THIS MACHINE?" ═══
 *
 * The owner, 2026-11-11, on the plan ("keep going on the architectural plan"):
 * the game asks what kind of device it is on in many places, and the answers
 * were each written where they were needed.  "Is there a mouse?" was asked in
 * sixteen places, each with its own guard (some `window.matchMedia &&`, some
 * `typeof matchMedia === 'function'`, some in a try, some not, two keeping
 * their own MediaQueryList); "is this a computer's window?" in three, with
 * the query written out in each; "is this an iPhone?" twice, copied by hand,
 * and a third time differently on the Speed test.  A device answer that two
 * places can give differently is a lane nobody chose.
 *
 * So the questions live here, each asked one way, and every place reads them:
 *
 *   fineInput()      a mouse or trackpad is the main pointer -- `(pointer:fine)`,
 *                    the house test for a computer: the "click" words
 *                    (deskWords.js), the keys, the hints.  Read LIVE: a laptop
 *                    with a touch screen can switch.
 *   computerFrame()  a computer's window with room -- `(pointer:fine) and
 *                    (min-width:1000px)`, game.css's computer rule: the layout
 *                    (deskWide.js, the canvas's shell).
 *   onIOS()          an iPhone or iPad, an iPad asking for the desktop site
 *                    included (it says "Macintosh" but has touch points).
 *   phoneScreen()    v2.3.5140: a phone, not a tablet or a computer -- no
 *                    mouse, and the SCREEN's short side under PHONE_SHORT_MAX
 *                    CSS px (the biggest phones are ~440, the smallest iPad
 *                    744): the pixel budget's class (renderRes.js).
 *   deviceProfile()  all of it, plus the look palette's choice
 *                    (lookPaletteChoice.js) and the screen's pixel ratio, in
 *                    one object: what the Speed test's card names, so one
 *                    screenshot from any device says which lanes it is in.
 *
 * STEP 1 (this version): NOTHING CHANGES.  Each place asks the same question
 * it asked before, the same way; only where the answer comes from moved.  The
 * two answers that can disagree -- a narrow computer window has a mouse
 * (fineInput) but not a computer's frame (computerFrame) -- still disagree as
 * they did; deciding what such a window should get is the owner's question
 * (a touchscreen laptop, an iPad with a trackpad, a small window), listed in
 * docs/specs/device-profile.md.
 *
 * No imports but the look palette's pure choice (and, v2.3.5221, the lanes'
 * table, which has none), so node can test it
 * (server/test/device-profile.test.mjs).
 */
import { lookPaletteChoice, onWindows, onMac } from './lookPaletteChoice.js';
/* v2.3.5221: the lanes (card O): the class picks a lane, so it is handed to
   drawLanes.js from here, the one file that asks the device anything (that
   file has no imports: node tests it) */
import { useDevClass } from './drawLanes.js';

/* the two media questions, written once (game.css carries the same two in
   its @media rules; device-profile.test holds them to it) */
export const FINE_QUERY = '(pointer:fine)';
export const COMPUTER_FRAME_QUERY = '(pointer:fine) and (min-width:1000px)';

const _mq = Object.create(null);
function mediaMatches(q) {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    /* one MediaQueryList a query, kept: its `matches` is live */
    const m = _mq[q] || (_mq[q] = window.matchMedia(q));
    return !!(m && m.matches);
  } catch (e) {
    return false;
  }
}

/** A mouse or trackpad is the main pointer (`(pointer:fine)`): a computer, for
 *  the words, keys and hints.  Live. */
export function fineInput() {
  return mediaMatches(FINE_QUERY);
}

/** A computer's window with room (`(pointer:fine) and (min-width:1000px)`):
 *  game.css's computer rule, for the layout.  Live. */
export function computerFrame() {
  return mediaMatches(COMPUTER_FRAME_QUERY);
}

/** An iPhone or iPad (an iPad asking for the desktop site says "MacIntel"
 *  but has touch points).  The arguments are for the tests; the page's own
 *  navigator by default. */
export function onIOS(ua, platform, touchPoints) {
  let u = ua, p = platform, t = touchPoints;
  if (u === undefined && typeof navigator !== 'undefined') {
    u = navigator.userAgent; p = navigator.platform; t = navigator.maxTouchPoints;
  }
  return /iPad|iPhone|iPod/.test(typeof u === 'string' ? u : '')
    || (p === 'MacIntel' && Number(t) > 1);
}

/* v2.3.5140: the short side of a phone's screen is under this (CSS px) */
export const PHONE_SHORT_MAX = 600;

/** v2.3.5140: a phone -- touch, and a screen whose short side is under
 *  PHONE_SHORT_MAX.  The SCREEN, never the window (a small computer window is
 *  not a phone).  The arguments are for the tests; the page's own by default. */
export function phoneScreen(screenW, screenH, fine) {
  let w = screenW, h = screenH, f = fine;
  if (w === undefined) {
    try {
      const sc = typeof window !== 'undefined' && window.screen;
      w = sc ? sc.width : 0; h = sc ? sc.height : 0;
    } catch (e) { w = 0; h = 0; }
  }
  if (f === undefined) f = fineInput();
  const short = Math.min(Number(w) || 0, Number(h) || 0);
  return !f && short > 0 && short < PHONE_SHORT_MAX;
}

/** Everything this file knows about the machine, in one object (the Speed
 *  test's card; QA). */
export function deviceProfile() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const ua = nav ? nav.userAgent : '';
  const plat = nav && nav.userAgentData ? nav.userAgentData.platform : undefined;
  const touch = nav ? nav.maxTouchPoints : 0;
  let search = '';
  try { search = typeof window !== 'undefined' ? window.location.search || '' : ''; } catch (e) { search = ''; }
  const palette = lookPaletteChoice(search, ua, plat, touch);
  return {
    input: fineInput() ? 'mouse' : 'touch',
    computerFrame: computerFrame(),
    ios: onIOS(),
    phone: phoneScreen(),   /* v2.3.5140 */
    windows: onWindows(ua, plat),
    mac: onMac(ua, plat, touch),
    palette: palette.on ? 'on' : 'off (' + palette.why + ')',
    dpr: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  };
}

/* ═══ v2.3.5121: THE DEVICE CLASS (docs/SHAPES.md part 6; the grand plan's 2.1) ═══
 *
 * The field report (step 1.1) adds a phone's smoothness into the day's bins
 * by CELL, and a cell's first part is what the device can do: its class.
 * Facts only, read from the device: what WebGL the page got and what its chip
 * takes, whether it draws in software, the pixels, the screen's rate, the
 * pointer, the processor's threads.  NEVER a system's or a browser's name,
 * the chip's name, a model, or anything timed (a cold phone behind the
 * loading screen always answers "fast"; timing the look palette's build was
 * the Windows freeze).  The renderer's name is read once, for `soft` alone,
 * and is never kept or returned.
 *
 * Each fact is one of a short list (DEV_CLASS), so the class has a KEY: its
 * values in DEV_CLASS's order, joined with '-'.  It is coarse on purpose: a
 * finer one makes cells that never reach the 20 reports a cell is read at.
 *
 *   gl      1, 2             the WebGL the game's renderer got
 *   soft    0, 1             it draws in software (the chip's name against
 *                            SOFT_GL, paletteTex.js's own list)
 *   maxTex  2048 ... 16384   the largest picture side, the power of two at or
 *                            under it (2048 or less: 2048)
 *   prec    16, 32           the bits a program keeps at middle precision
 *                            (the vanishing body on four facings, TRAPS)
 *   units   8, 16, 32        pictures one batch can hold, at or under
 *   mp      1 ... 12         megapixels the screen asks for: the renderer's
 *                            own size in CSS px times the SCREEN's ratio, not
 *                            the lowered one (renderRes.js), the first of the
 *                            list at or over (over 12: 12)
 *   dpr     1 ... 4          device px to a CSS px, the nearest
 *   hz      30 ... 144       the screen's rate, the pacer's (framePacer.js
 *                            read().hz), the nearest within 4; 'other' when
 *                            it is none of them or not yet known
 *   fill    'none'           a coarse timed fill: NOT RUN.  Nothing is timed
 *                            at the start (the value list keeps its words for
 *                            card O, step 2.1)
 *   input   mouse, touch     fineInput()
 *   frame   0, 1             computerFrame()
 *   cores   2, 4, 8, 16      the threads the browser tells, at or under
 *                            (none told: 2)
 *
 * Built here, by card A (the report cannot wait for the lanes); card O builds
 * `drawLane` from it (step 2.1).  `device` on the wire is the login's device
 * id: the class is never sent under that name.  Nothing measures the page:
 * the size is the renderer's own numbers, the rest the chip's constants,
 * asked once a drawing context (a WeakMap).
 */
export const DEV_CLASS = Object.freeze({
  gl: Object.freeze([1, 2]),
  soft: Object.freeze([0, 1]),
  maxTex: Object.freeze([2048, 4096, 8192, 16384]),
  prec: Object.freeze([16, 32]),
  units: Object.freeze([8, 16, 32]),
  mp: Object.freeze([1, 2, 3, 4, 6, 9, 12]),
  dpr: Object.freeze([1, 1.5, 2, 3, 4]),
  hz: Object.freeze([30, 60, 90, 120, 144, 'other']),
  fill: Object.freeze(['fast', 'mid', 'slow', 'none']),
  input: Object.freeze(['mouse', 'touch']),
  frame: Object.freeze([0, 1]),
  cores: Object.freeze([2, 4, 8, 16]),
});
export const DEV_CLASS_FIELDS = Object.freeze(Object.keys(DEV_CLASS));

/* a software renderer, by the chip's name: paletteTex.js SOFTWARE_GL's own
   list, written the same (device-profile.test §7 holds the two equal) */
export const SOFT_GL = /swiftshader|llvmpipe|softpipe|software|basic render|\bwarp\b/i;

const _num = (v) => (typeof v === 'number' && isFinite(v) ? v : NaN);
/* the list's value at or under v (under the first: the first) */
const _atOrUnder = (list, v) => { let r = list[0]; for (const x of list) if (v >= x) r = x; return r; };
/* the first of the list at or over v (over the last: the last) */
const _atOrOver = (list, v) => { for (const x of list) if (v <= x) return x; return list[list.length - 1]; };
const _nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Raw facts -> the class: each binned into its list, and its key.  Pure (the
 *  tests'; devClass() hands it what the device says).
 *  f: { gl2, soft, maxTex, precBits, units, w, h, dpr, hz, fine, frame, cores } */
export function classOf(f) {
  const L = DEV_CLASS;
  const dpr = _num(f.dpr) > 0 ? f.dpr : 1;
  const px = (_num(f.w) > 0 ? f.w : 0) * (_num(f.h) > 0 ? f.h : 0) * dpr * dpr;
  const hz = _num(f.hz);
  let hzBin = 'other';
  if (hz > 0) { const n = _nearest(L.hz.slice(0, -1), hz); if (Math.abs(n - hz) <= 4) hzBin = n; }
  const c = {
    gl: f.gl2 ? 2 : 1,
    soft: f.soft ? 1 : 0,
    maxTex: _atOrUnder(L.maxTex, _num(f.maxTex) || 0),
    /* a 16-bit float keeps 10 bits of precision, a 32-bit one 23 */
    prec: _num(f.precBits) >= 23 ? 32 : 16,
    units: _atOrUnder(L.units, _num(f.units) || 0),
    mp: _atOrOver(L.mp, px / 1e6),
    dpr: _nearest(L.dpr, dpr),
    hz: hzBin,
    fill: 'none',
    input: f.fine ? 'mouse' : 'touch',
    frame: f.frame ? 1 : 0,
    cores: _atOrUnder(L.cores, _num(f.cores) || 0),
  };
  c.key = classKey(c);
  return c;
}

/** The class's key: its values in DEV_CLASS's order, joined. */
export function classKey(c) {
  return DEV_CLASS_FIELDS.map((k) => String(c[k])).join('-');
}

/* the chip's constants, asked once a drawing context */
const _chipOf = typeof WeakMap === 'function' ? new WeakMap() : null;
function chipFacts(gl) {
  const kept = _chipOf && _chipOf.get(gl);
  if (kept) return kept;
  let name = '';
  try {
    /* Firefox gives the name as RENDERER; Chrome and Safari answer "WebKit
       WebGL" there and the name through the debug extension (paletteTex.js
       rendererName, the same way) */
    name = String(gl.getParameter(gl.RENDERER) || '');
    if (!name || /^webkit webgl$/i.test(name)) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
  } catch (e) { name = ''; }
  let precBits = 0;
  try { const p = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT); precBits = (p && p.precision) || 0; } catch (e) { precBits = 0; }
  const facts = {
    gl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
    soft: SOFT_GL.test(name),
    maxTex: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
    precBits,
    units: Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) || 0,
  };
  if (_chipOf) _chipOf.set(gl, facts);
  return facts;
}

/** The device class, asked of the device now: the game's renderer (its
 *  context and its own size), the pacer's rate, the pointer, the threads.
 *  null while there is no drawing context, or it is lost (a report waits).
 *  opts (QA, the tests): { renderer, hz } in place of the page's own. */
export function devClass(opts) {
  try {
    const o = opts || {};
    const win = typeof window !== 'undefined' ? window : null;
    const R = o.renderer || (win && win._pixiRenderer && win._pixiRenderer.app && win._pixiRenderer.app.renderer) || null;
    const gl = R && R.gl;
    if (!gl || (typeof gl.isContextLost === 'function' && gl.isContextLost())) return null;
    const chip = chipFacts(gl);
    let hz = o.hz;
    if (hz === undefined) { try { const p = win && win.__btPace && win.__btPace(); hz = p ? p.hz : null; } catch (e) { hz = null; } }
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    return classOf({
      ...chip,
      w: R.screen ? R.screen.width : 0,
      h: R.screen ? R.screen.height : 0,
      dpr: (win && win.devicePixelRatio) || 1,
      hz,
      fine: fineInput(),
      frame: computerFrame(),
      cores: nav ? nav.hardwareConcurrency : 0,
    });
  } catch (e) {
    return null;
  }
}

/* v2.3.5221: the lane is picked from this class (drawLanes.js pickLane):
   handed over once, asked again by the lane at most every few seconds.  It
   asks nothing new of the device */
useDevClass(devClass);

/* QA: the profile, as the page sees it */
if (typeof window !== 'undefined') window.__btDevice = () => deviceProfile();
/* QA (v2.3.5121): the device class, as the report will send it */
if (typeof window !== 'undefined') window.__btDevClass = () => devClass();
