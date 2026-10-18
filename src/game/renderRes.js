/* ═══ v2.3.3334: HOW MANY CANVAS PIXELS A CSS PIXEL ═══
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
 */

let _url = null;    /* the page's ?res=, read once; 0 = none */
let _live = 0;      /* the speed test's, for a few seconds; 0 = none */

function deviceRatio() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
}

function urlRes() {
  if (_url !== null) return _url;
  _url = 0;
  try {
    const m = /[?&]res=([0-9]+(?:\.[0-9]+)?)\b/.exec((typeof location !== 'undefined' && location.search) || '');
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 1 && v <= 4) _url = v;
    }
  } catch (e) { /* none */ }
  return _url;
}

/** The canvas's pixels per CSS px: the screen's own, unless lowered. */
export function renderDpr() {
  const dev = deviceRatio();
  const cap = _live || urlRes();
  return cap ? Math.min(dev, cap) : dev;
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

/** The speed test: lower it now (r), or put it back (0).  The renderer's own
 *  resolution resizes the canvas; the game's resize() is told so the two agree
 *  (it reads renderDpr too). */
export function setRenderResLive(r) {
  _live = r > 0 ? r : 0;
  const res = renderDpr();
  try {
    const R = typeof window !== 'undefined' && window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
    if (R && Math.abs(R.resolution - res) > 1e-6) R.resolution = res;
  } catch (e) { /* the next resize settles it */ }
  markSoft();
  try { window.dispatchEvent(new Event('resize')); } catch (e) { /* none */ }
  return res;
}
