/* ═══ v2.3.5140: THE PIXEL BUDGET (src/game/renderRes.js) ═══
 *
 * A canvas never has more pixels than the art can fill: the view cap's
 * reference area (850 x 1330 game px, viewCap.js) at the art's 2 px a game px
 * each way, ~4.52 million.  docs/specs/pixel-budget.md.  Checked:
 *   1. the budget is read from the constants (VIEW_CAP, bible.js's art px),
 *      and grows with ?zoom= as the view cap's reference does;
 *   2. the screens the card names: an iPhone, a 1920 x 1080 laptop and an
 *      11-inch iPad untouched; a 12.9-inch iPad, a 2560 x 1440 screen at 1.5
 *      and a 5K one lowered to the budget;
 *   3. the lowest of the screen's, ?res=, the speed test's and the budget's;
 *      ?pixbudget=0 off; no budget until the canvas's size is told;
 *   4. the four callers agree after a resize: the canvas BroTown's resize()
 *      gives, read back by pixiRenderer's and worldViewport's arithmetic,
 *      asks for no resize the next frame; the renderer's resolution follows;
 *   5. renderRes.js's ?zoom= reading is worldViewport's VIEW_OUT.
 * Imported with a stand-in window (no Vite): its merge deploys the worker
 * (TRAPS §277), as any new file in server/test/ does.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../src');
const srcUrl = (p) => pathToFileURL(join(src, p)).href;

/* the stand-in page: a screen ratio, an address, a renderer */
const R = { resolution: 1 };
globalThis.window = { devicePixelRatio: 1, _pixiRenderer: { app: { renderer: R } }, dispatchEvent() {} };
globalThis.location = { search: '' };
window.location = globalThis.location;   /* worldViewport reads window.location, renderRes location: one address */
globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };

const RR = await import(srcUrl('game/renderRes.js'));
const { renderDpr, noteCanvasCss, pixelBudget, setRenderResLive, renderResLowered, GAME_PX_PER_ART_PX, _resetRenderRes } = RR;
const { VIEW_CAP } = await import(srcUrl('game/viewCap.js'));
const { PIXEL } = await import(pathToFileURL(join(here, '../../public/tools/style/bible.js')).href);

/** a fresh page: the screen's ratio, its address, the canvas's CSS size */
function page(dpr, search, w, h) {
  _resetRenderRes();
  window.devicePixelRatio = dpr;
  location.search = search || '';
  R.resolution = dpr;
  if (w) noteCanvasCss(w, h);
}
const px = (w, h) => w * h * renderDpr() * renderDpr();
const BUDGET = (VIEW_CAP.REF_W * 2) * (VIEW_CAP.REF_H * 2);

/* ── 1. the budget, from the constants ────────────────────────────────── */
page(1, '');
check('1a. the art\'s px mirror bible.js (PIXEL.gamePxPerArtPx)', GAME_PX_PER_ART_PX === PIXEL.gamePxPerArtPx, [GAME_PX_PER_ART_PX, PIXEL.gamePxPerArtPx]);
check('1b. the budget is the view cap\'s reference at 2 px a game px: ~4.52 million', pixelBudget() === BUDGET && Math.abs(BUDGET - 4.522e6) < 1e3, pixelBudget());
/* break proof: REF_W 850 -> 900 in viewCap.js turns 1b red */
page(1, '?zoom=0.5');
check('1c. ?zoom=0.5 grows the reference as the view cap\'s (0.77 / 0.5 each way)',
  Math.abs(pixelBudget() - BUDGET * (0.77 / 0.5) ** 2) < 1, pixelBudget());
page(1, '?zoom=9');
check('1d. ?zoom= is clamped as worldViewport clamps it (1.5)', Math.abs(pixelBudget() - BUDGET * (0.77 / 1.5) ** 2) < 1, pixelBudget());

/* ── 2. the screens the card names ────────────────────────────────────── */
{
  const UNTOUCHED = [
    ['an iPhone, 390 x 844 at 3', 3, 390, 844],
    ['a 1920 x 1080 laptop at 1', 1, 1920, 1080],
    ['an 11-inch iPad, 820 x 1180 at 2 (3.9 million)', 2, 820, 1180],
  ];
  for (const [tag, d, w, h] of UNTOUCHED) {
    page(d, '', w, h);
    check('2a. untouched: ' + tag, renderDpr() === d && !renderResLowered(), { dpr: renderDpr(), px: px(w, h) });
  }
  const LOWERED = [
    ['a 12.9-inch iPad, 1024 x 1366 at 2 (5.6 million)', 2, 1024, 1366],
    ['a 2560 x 1440 screen at 1.5 (8.3 million)', 1.5, 2560, 1440],
    ['a 5K screen, 2560 x 1440 at 2 (14.7 million)', 2, 2560, 1440],
  ];
  for (const [tag, d, w, h] of LOWERED) {
    page(d, '', w, h);
    check('2b. lowered to the budget: ' + tag,
      renderDpr() < d && renderResLowered() && Math.abs(px(w, h) - BUDGET) < 1,
      { dpr: renderDpr(), px: px(w, h), before: w * h * d * d });
  }
  /* the band takes part of a computer's window: the canvas's size, not the window's */
  page(1.5, '', 1830, 1080 - 160);
  check('2c. the canvas\'s size is read, not the window\'s (1830 x 920 at 1.5 is 3.8 million: untouched)', renderDpr() === 1.5);
}

/* ── 3. the lowest of four; the switch; not told yet ──────────────────── */
page(2, '?res=1.2', 1024, 1366);
check('3a. ?res= under the budget wins', renderDpr() === 1.2);
page(2, '', 1024, 1366);
setRenderResLive(1);
check('3b. the speed test under the budget wins, and goes back to the budget', renderDpr() === 1 && (setRenderResLive(0), Math.abs(px(1024, 1366) - BUDGET) < 1));
page(2, '?pixbudget=0', 1024, 1366);
check('3c. ?pixbudget=0 turns it off for one screen', renderDpr() === 2);
page(2, '?a=1&pixbudget=0&b=2', 2560, 1440);
check('3d. ...wherever it sits in the address', renderDpr() === 2);
page(2, '?pixbudget=01', 2560, 1440);
check('3e. only the exact word turns it off', renderDpr() < 2);
page(2, '');
check('3f. no budget until the canvas\'s size is told (the first resize tells it)', renderDpr() === 2);

/* ── 4. the four callers agree after a resize ─────────────────────────── */
let worldViewport;
{
  let code = readFileSync(join(src, 'game/worldViewport.js'), 'utf8');
  code = code.replace(/from '@\/([^']+)'/g, (_m, p) => `from '${srcUrl(p)}'`)
    .replace(/from '\.\/([^']+)'/g, (_m, p) => `from '${srcUrl('game/' + p)}'`);
  const dir = mkdtempSync(join(tmpdir(), 'renderres-'));
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  /* one copy a ?zoom=, each read at its import as the page reads it at load */
  worldViewport = async (search) => {
    location.search = search;
    const file = join(dir, 'wv' + Math.random().toString(36).slice(2) + '.mjs');
    writeFileSync(file, code);
    return import(pathToFileURL(file).href);
  };
}
{
  const WV = await worldViewport('');
  /* BroTown's resize(), the lines that size the canvas */
  const canvas = { width: 0, height: 0 };
  function resize(playW, vh) {
    let dpr = renderDpr();
    noteCanvasCss(playW, vh); dpr = renderDpr();
    const tw = Math.round(playW * dpr), th = Math.round(vh * dpr);
    if (canvas.width === tw && canvas.height === th) return false;
    canvas.width = tw; canvas.height = th;
    return true;
  }
  /* pixiRenderer.update: does the next frame resize the renderer? */
  const pixi = { width: 0, height: 0 };
  function frameResizes() {
    const dpr = renderDpr();
    const cssW = canvas.width / dpr, cssH = canvas.height / dpr;
    const r = Math.abs(pixi.width - cssW) > 0.5 || Math.abs(pixi.height - cssH) > 0.5;
    if (r) { pixi.width = cssW; pixi.height = cssH; }
    return r;
  }
  const SIZES = [[1920, 920, 1], [2560, 1280, 1.5], [1024, 1366, 2], [2560, 1300, 2], [390, 806, 3], [5120 / 2, 2700 / 2, 2]];
  const bad = [];
  for (const [w, h, d] of SIZES) {
    page(d, '');
    resize(w, h);
    frameResizes();   /* the first frame takes the new size */
    const again = frameResizes();
    const resizedAgain = resize(w, h);
    const vp = WV.worldViewport(canvas, 'wheel');
    const cssFromVp = canvas.width / renderDpr();
    if (again || resizedAgain || Math.abs(cssFromVp - w) > 0.5 || Math.abs(R.resolution - renderDpr()) > 1e-9 || !(vp.W > 0)) {
      bad.push({ w, h, d, again, resizedAgain, cssFromVp, res: R.resolution, dpr: renderDpr() });
    }
  }
  check('4a. after a resize the four agree: no resize the next frame, nor the next resize()', bad.length === 0, bad);
  /* a live resize across the budget's edge: the renderer's resolution follows */
  page(2, '', 820, 1180);
  const before = R.resolution;
  resize(1024, 1366);
  check('4b. a resize past the budget moves the renderer\'s resolution with it', before === 2 && Math.abs(R.resolution - renderDpr()) < 1e-9 && R.resolution < 2, { before, after: R.resolution });
  resize(820, 1180);
  check('4c. ...and back under it, back to the screen\'s', R.resolution === 2 && renderDpr() === 2);
  /* break proof: drop `followRenderer(res)` from noteCanvasCss and 4b is red */
}

/* ── 5. one ?zoom= reading ────────────────────────────────────────────── */
{
  const bad = [];
  for (const z of ['', '?zoom=0.5', '?zoom=1', '?zoom=0.1', '?zoom=7', '?zoom=x', '?a=1&zoom=0.64']) {
    const WV = await worldViewport(z);
    page(1, z);
    const k = VIEW_CAP.VIEW_OUT_REF / WV.VIEW_OUT;
    const want = (VIEW_CAP.REF_W * k * 2) * (VIEW_CAP.REF_H * k * 2);
    if (Math.abs(pixelBudget() - want) > 1e-6) bad.push({ z, VIEW_OUT: WV.VIEW_OUT, budget: pixelBudget(), want });
  }
  check('5a. renderRes reads ?zoom= as worldViewport\'s VIEW_OUT does', bad.length === 0, bad);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all render-res checks passed');
