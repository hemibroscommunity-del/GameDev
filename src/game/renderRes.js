/* ═══ v2.3.3339: HOW MANY CANVAS PIXELS A CSS PIXEL ═══
 *
 * The owner, 2026-10-18: "Not so sure about the performance. The framerate is
 * definitely not totally smooth. It appears to be around 30fps to 40ish fps".
 *
 * The game draws at the screen's full pixel ratio -- three canvas pixels a
 * CSS pixel each way on an iPhone, nine to the CSS pixel, about 2.9 million a
 * frame on the owner's phone with the dashboard folded -- and every pixel
 * costs the graphics chip each pass that touches it.  Whether that is what
 * holds the frame rate down can only be seen on the phone itself, so this is
 * the one place the canvas's pixel ratio is read, and it can be lowered:
 *
 *   ?res=2       (or 2.5, 1.5 ...) for the page: never above the screen's own;
 *   the speed test (game/speedTest.js) lowers it for a few seconds, live, and
 *   puts it back.
 *
 * Lowered, the canvas is drawn smoothly up to the screen ([data-res-soft] in
 * game.css): a 1.5x nearest-neighbour stretch would double every other pixel,
 * the uneven "gritty" look the owner has turned down before.  Nothing else
 * changes: the world is the same size on screen (worldViewport reads this),
 * text keeps rasterising at the screen's own ratio.
 *
 * The four places that turn the canvas's pixels into CSS pixels must agree, or
 * the canvas is resized every frame to the wrong size: BroTown's resize(),
 * pixiApp's init, pixiRenderer.update and worldViewport -- all call this.
 *
 * ═══ v2.3.5140: THE PIXEL BUDGET -- NO MORE PIXELS THAN THE ART CAN FILL ═══
 *
 * The owner, 2026-11-09: "It's just unoptimized for desktop."  A computer drew
 * at its screen's own ratio: 1.9 million canvas pixels at 1920 x 1080, ~8.3
 * million at 2560 x 1440 at 150%, ~14.7 million on a 5K screen, against the
 * 2.9 million of the iPhone the frame-rate work was measured on
 * (STATE-MACHINES A2, point 1).  But every screen sees the same AREA of world
 * (the view cap, viewCap.js: 850 x 1330 game px), and the art has 2 px a game
 * px (bible.js PIXEL.gamePxPerArtPx 0.5), so past (850 x 2) x (1330 x 2), ~4.52
 * million, a canvas is finer than any picture in it: pixels the chip pays for
 * in every pass and nobody can see.  So the ratio is also held to the one at
 * which the canvas's CSS pixels times the ratio squared meet that budget.
 *
 *   - Read from the constants (VIEW_CAP, the art's px), never a number of its
 *     own; at ?zoom=k the reference grows as the view cap's does (0.77 / k).
 *   - Every phone is under it (the owner's iPhone ~2.9M, an 11-inch iPad
 *     3.9M): untouched.  A 12.9-inch iPad (5.6M) and big computer screens are
 *     lowered, stretched smoothly up ([data-res-soft]), as ?res= is.
 *   - THE CANVAS'S CSS SIZE, NEVER THE WINDOW'S (TRAPS §214: on a computer the
 *     band takes part of the window).  BroTown's resize() tells this file the
 *     size it is about to give the canvas (noteCanvasCss), in one line before
 *     it reads renderDpr(); every call reads that one kept value and never
 *     measures the page (the four callers above must agree, and pixiRenderer
 *     asks inside a frame).  Until it is told, no budget (0 x 0).
 *   - A size that moves the ratio moves the renderer's resolution with it, as
 *     the speed test's does, or Pixi and resize() would size the canvas at two
 *     ratios and fight every frame.
 *   - On by default; `?pixbudget=0` turns it off for one screen (the memory
 *     law's form).  docs/specs/pixel-budget.md; server/test/render-res.test.mjs.
 */

import { VIEW_CAP } from './viewCap.js';   /* v2.3.5140: the reference area of world (no imports: node reads it too) */

/* v2.3.5140: game px per picture px (public/tools/style/bible.js
   PIXEL.gamePxPerArtPx; render-res.test holds the two together) */
export const GAME_PX_PER_ART_PX = 0.5;

let _url = null;    /* the page's ?res=, read once; 0 = none */
let _live = 0;      /* the speed test's, for a few seconds; 0 = none */
let _cssW = 0;      /* v2.3.5140: the canvas's CSS size, as resize() last gave it; 0 = not told */
let _cssH = 0;
let _budgetOn = null; /* v2.3.5140: ?pixbudget=0 off, read once */
let _viewOut = null;  /* v2.3.5140: ?zoom=, read once, as worldViewport's VIEW_OUT */

function search() {
  try { return (typeof location !== 'undefined' && location.search) || ''; } catch (e) { return ''; }
}

function budgetOn() {
  if (_budgetOn === null) _budgetOn = !/(?:^|[?&])pixbudget=0(?:&|$)/.test(search());
  return _budgetOn;
}

/* worldViewport.js readViewOut, the same clamp (render-res.test compares them):
   that file imports this one, so it cannot be imported back here */
function viewOut() {
  if (_viewOut !== null) return _viewOut;
  _viewOut = VIEW_CAP.VIEW_OUT_REF;
  try {
    const m = /(?:^|[?&])zoom=([0-9.]+)(?:&|$)/.exec(search());
    const k = m ? Number(m[1]) : NaN;
    if (Number.isFinite(k) && k > 0) _viewOut = Math.max(0.4, Math.min(1.5, k));
  } catch (e) { /* the default */ }
  return _viewOut;
}

/** The budget in canvas pixels: the view cap's reference area at the art's
 *  pixels each way, grown with ?zoom= as the view cap's reference is. */
export function pixelBudget() {
  const k = VIEW_CAP.VIEW_OUT_REF / viewOut();
  const perGame = 1 / GAME_PX_PER_ART_PX;
  return (VIEW_CAP.REF_W * k * perGame) * (VIEW_CAP.REF_H * k * perGame);
}

/** The ratio at which the canvas meets the budget; 0 = no budget (off, or
 *  the canvas's size not told yet). */
function budgetRatio() {
  if (!(_cssW > 0 && _cssH > 0) || !budgetOn()) return 0;
  return Math.sqrt(pixelBudget() / (_cssW * _cssH));
}

function deviceRatio() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
}

function urlRes() {
  if (_url !== null) return _url;
  _url = 0;
  try {
    const m = /[?&]res=([0-9]+(?:\.[0-9]+)?)\b/.exec(search());
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 1 && v <= 4) _url = v;
    }
  } catch (e) { /* none */ }
  return _url;
}

/** The canvas's pixels per CSS px: the screen's own, unless lowered -- the
 *  lowest of the screen's, ?res=, the speed test's and the pixel budget's. */
export function renderDpr() {
  let r = deviceRatio();
  const u = urlRes();
  if (u) r = Math.min(r, u);
  if (_live) r = Math.min(r, _live);
  const b = budgetRatio();
  if (b) r = Math.min(r, b);
  return r;
}

/** Is it lowered below the screen's own? */
export function renderResLowered() {
  return renderDpr() < deviceRatio() - 1e-6;
}

function markSoft() {
  try {
    if (typeof document === 'undefined') return;
    if (renderResLowered()) document.documentElement.setAttribute('data-res-soft', '');
    else document.documentElement.removeAttribute('data-res-soft');
  } catch (e) { /* the look only */ }
}
markSoft();

/* the renderer's own resolution follows a change of ratio, as the speed
   test's does (pixiRenderer.update resizes it from the canvas next frame) */
function followRenderer(res) {
  try {
    const R = typeof window !== 'undefined' && window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
    if (R && Math.abs(R.resolution - res) > 1e-6) R.resolution = res;
  } catch (e) { /* the next resize settles it */ }
}

/** v2.3.5140: BroTown's resize() -- the CSS size it is about to give the
 *  canvas, told before it reads renderDpr().  Never measures the page. */
export function noteCanvasCss(w, h) {
  w = w > 0 ? w : 0; h = h > 0 ? h : 0;
  if (w === _cssW && h === _cssH) return;
  const was = renderDpr();
  _cssW = w; _cssH = h;
  const res = renderDpr();
  if (Math.abs(res - was) > 1e-9) { followRenderer(res); markSoft(); }
}

/** The speed test: lower it now (r), or put it back (0).  The renderer's own
 *  resolution resizes the canvas; the game's resize() is told so the two agree
 *  (it reads renderDpr too). */
export function setRenderResLive(r) {
  _live = r > 0 ? r : 0;
  const res = renderDpr();
  followRenderer(res);
  markSoft();
  try { window.dispatchEvent(new Event('resize')); } catch (e) { /* none */ }
  return res;
}

/** v2.3.5140: for the test only -- forget the kept size and the read address. */
export function _resetRenderRes() {
  _url = null; _live = 0; _cssW = 0; _cssH = 0; _budgetOn = null; _viewOut = null;
}
