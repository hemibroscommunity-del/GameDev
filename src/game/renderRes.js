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
 * TWO BUDGETS, by the device's class (deviceProfile.js phoneScreen):
 *   - A PHONE: the art's budget above.  Every phone is under it (the owner's
 *     iPhone ~2.9M): untouched.  (A third fewer pixels made no difference on
 *     the owner's iPhone: STATE-MACHINES "Smooth on every device".)
 *   - ANYTHING ELSE (a tablet, a computer): a 1920 x 1080 screen's worth,
 *     ~2.07 million, below the art's own 2 px a game px.  The owner, answering
 *     this PR's pictures (2026-11-14): "For your big screen picture budget you
 *     can probably decrease it much further this is a mediocre hd pixel art
 *     game."  The softer picture is accepted; a big screen may draw below one
 *     canvas pixel a CSS pixel.
 *   Both read from constants, never a number of their own, and at ?zoom=k grow
 *   as the view cap's reference does (0.77 / k each way).  A lowered canvas is
 *   stretched smoothly up ([data-res-soft]), as ?res= is.
 *
 *   - THE CANVAS'S CSS SIZE, NEVER THE WINDOW'S (TRAPS §214: on a computer the
 *     band takes part of the window).  BroTown's resize() tells this file the
 *     size it is about to give the canvas (noteCanvasCss), in one line before
 *     it reads renderDpr(); every call reads that one kept value and never
 *     measures the page (the four callers above must agree, and pixiRenderer
 *     asks inside a frame).  Until it is told, no budget (0 x 0).
 *   - THE CLASS IS KEPT WITH THE SIZE: worked out when resize() tells it, not
 *     at each call -- a touch laptop's mouse comes and goes, and a ratio that
 *     moved between two callers in one frame would resize the canvas.
 *   - A size or class that moves the ratio moves the renderer's resolution with
 *     it, as the speed test's does, or Pixi and resize() would size the canvas
 *     at two ratios and fight every frame.
 *   - On by default.  `?pixbudget=0` turns it off for one screen (the memory
 *     law's form); `?pixbudget=<pixels>` (e.g. 3000000, or 3e6) sets the
 *     budget for one screen, whatever its class, so the owner can try a value
 *     without a code change.  docs/specs/pixel-budget.md;
 *     server/test/render-res.test.mjs.
 *
 * ═══ v2.3.5225: THE PIXELS ARE A KNOB OF THE LADDER (card O PR 5) ═══
 *
 * The lanes' table (drawLanes.js, docs/LANES.md) has a `pixels` knob: 1 in
 * every lane's row, and the chip axis's last two rungs take it to 0.75, then
 * 0.5.  It is a share of the pixels ACTUALLY DRAWN -- the lowest of the
 * screen's own, ?res=, the speed test's and the budget above -- so a rung
 * takes a quarter, then half, of them on every device, a phone under its
 * budget included (the planning session's (b), 2026-11-14: a chip-bound phone
 * is the one a rung should help; the owner's iPhone, where a third fewer
 * pixels made no difference, is not chip-bound, so the governor's split never
 * takes it there).  Read through the lanes' one reader, laneKnob('pixels'),
 * and told when it changes (onKnob); the governor (framePacer.js) moves the
 * pixel rungs only behind a veil -- a loading screen, a tab's return -- and
 * this file follows the way the speed test's ratio does (the renderer's
 * resolution, the soft look, a resize so resize() agrees).  `?ladderpix=0`:
 * the pixel rungs off for one screen, every pixel the budget allows.
 */

import { VIEW_CAP } from './viewCap.js';   /* v2.3.5140: the reference area of world (no imports: node reads it too) */
import { phoneScreen } from './deviceProfile.js';   /* v2.3.5140: the budget's class */
import { laneKnob, onKnob } from './drawLanes.js';   /* v2.3.5225: the pixels' knob (card O) */

/* v2.3.5140: game px per picture px (public/tools/style/bible.js
   PIXEL.gamePxPerArtPx; render-res.test holds the two together) */
export const GAME_PX_PER_ART_PX = 0.5;
/* v2.3.5140: a tablet's or a computer's budget at the default zoom: a
   1920 x 1080 screen's worth (the owner: "decrease it much further") */
export const SCREEN_BUDGET_W = 1920;
export const SCREEN_BUDGET_H = 1080;
/* the least ?pixbudget=<pixels> takes (below it, ignored) */
const URL_BUDGET_MIN = 100000;

let _url = null;    /* the page's ?res=, read once; 0 = none */
let _live = 0;      /* the speed test's, for a few seconds; 0 = none */
let _cssW = 0;      /* v2.3.5140: the canvas's CSS size, as resize() last gave it; 0 = not told */
let _cssH = 0;
let _budgetOn = null; /* v2.3.5140: ?pixbudget=0 off, read once */
let _urlBudget = null; /* v2.3.5140: ?pixbudget=<pixels>, read once; 0 = none */
let _phone = false;   /* v2.3.5140: the class, kept with the size (noteCanvasCss) */
let _viewOut = null;  /* v2.3.5140: ?zoom=, read once, as worldViewport's VIEW_OUT */
let _pixF = 1;        /* v2.3.5225: the ladder's share of the pixels drawn (laneKnob('pixels')) */
let _pixOff = null;   /* v2.3.5225: ?ladderpix=0, read once */

function search() {
  try { return (typeof location !== 'undefined' && location.search) || ''; } catch (e) { return ''; }
}

function budgetOn() {
  if (_budgetOn === null) _budgetOn = !/(?:^|[?&])pixbudget=0(?:&|$)/.test(search());
  return _budgetOn;
}

/* ?pixbudget=<pixels>: a count (3000000 or 3e6); 0 = none */
function urlBudget() {
  if (_urlBudget !== null) return _urlBudget;
  _urlBudget = 0;
  try {
    const m = /(?:^|[?&])pixbudget=([0-9]+(?:\.[0-9]+)?(?:e[0-9]+)?)(?:&|$)/i.exec(search());
    const v = m ? Number(m[1]) : NaN;
    if (Number.isFinite(v) && v >= URL_BUDGET_MIN) _urlBudget = v;
  } catch (e) { /* none */ }
  return _urlBudget;
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

/** The budget in canvas pixels for a class (`phone`; by default the one
 *  kept with the canvas's size): ?pixbudget=<pixels> if set; a phone's, the
 *  view cap's reference area at the art's pixels each way; anything else's, a
 *  1920 x 1080 screen's.  Both grow with ?zoom= as the view cap's reference. */
export function pixelBudget(phone) {
  const u = urlBudget();
  if (u) return u;
  const k = VIEW_CAP.VIEW_OUT_REF / viewOut();
  if (!(phone === undefined ? _phone : phone)) return SCREEN_BUDGET_W * SCREEN_BUDGET_H * k * k;
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

/* v2.3.5225: the ladder's pixel rungs, on unless ?ladderpix=0 */
function ladderPixOn() {
  if (_pixOff === null) _pixOff = /(?:^|[?&])ladderpix=(?:0|off|false)(?:&|$)/.test(search());
  return !_pixOff;
}
/* v2.3.5225: the share of the pixels drawn the ladder keeps (1, 0.75, 0.5) */
function pixFactor() {
  return ladderPixOn() ? _pixF : 1;
}
function readPixels() {
  try { const v = Number(laneKnob('pixels')); _pixF = v > 0 && v <= 1 ? v : 1; } catch (e) { _pixF = 1; }
}

/** The canvas's pixels per CSS px: the screen's own, unless lowered -- the
 *  lowest of the screen's, ?res=, the speed test's and the pixel budget's;
 *  v2.3.5225, then the ladder's share of those pixels (each way its root). */
export function renderDpr() {
  let r = deviceRatio();
  const u = urlRes();
  if (u) r = Math.min(r, u);
  if (_live) r = Math.min(r, _live);
  const b = budgetRatio();
  if (b) r = Math.min(r, b);
  const f = pixFactor();
  if (f < 1) r *= Math.sqrt(f);
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
  const phone = phoneScreen();
  if (w === _cssW && h === _cssH && phone === _phone) return;
  const was = renderDpr();
  _cssW = w; _cssH = h; _phone = phone;
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

/* v2.3.5225: the ladder moved the pixels (the governor, behind a veil): the
   renderer and resize() follow, as they follow the speed test's ratio */
readPixels();
try {
  onKnob('pixels', () => {
    const was = renderDpr();
    readPixels();
    const res = renderDpr();
    if (Math.abs(res - was) < 1e-9) return;
    followRenderer(res);
    markSoft();
    try { window.dispatchEvent(new Event('resize')); } catch (e) { /* the next resize settles it */ }
  });
} catch (e) { /* the row's pixels, always */ }

/** v2.3.5140: for the test only -- forget the kept size and the read address. */
export function _resetRenderRes() {
  _url = null; _live = 0; _cssW = 0; _cssH = 0; _budgetOn = null; _viewOut = null; _urlBudget = null; _phone = false;
  _pixOff = null; readPixels();   /* v2.3.5225 */
}
