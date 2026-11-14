/* ═══ v2.3.5140: THE PIXEL BUDGET (src/game/renderRes.js) ═══
 *
 * A canvas never has more pixels than its budget.  A PHONE's: the view cap's
 * reference area (850 x 1330 game px, viewCap.js) at the art's 2 px a game px
 * each way, ~4.52 million.  ANYTHING ELSE's (a tablet, a computer): a
 * 1920 x 1080 screen's, ~2.07 million (the owner: "decrease it much
 * further").  docs/specs/pixel-budget.md.  Checked:
 *   1. the budgets are read from the constants (VIEW_CAP, bible.js's art px,
 *      1920 x 1080), and grow with ?zoom= as the view cap's reference does;
 *   2. the screens: an iPhone (and the biggest one) untouched; a 1920 x 1080
 *      laptop at 1 untouched; an 11-inch iPad, a 12.9-inch iPad, a 2560 x 1440
 *      screen at 1.5 and at 1, and a 5K one lowered to 2.07 million; a phone
 *      is told by its screen and its pointer, never by its window;
 *   3. the lowest of the screen's, ?res=, the speed test's and the budget's;
 *      ?pixbudget=0 off; ?pixbudget=<pixels> sets it; no budget until the
 *      canvas's size is told;
 *   4. the four callers agree after a resize: the canvas BroTown's resize()
 *      gives, read back by pixiRenderer's and worldViewport's arithmetic,
 *      asks for no resize the next frame; the renderer's resolution follows;
 *   5. renderRes.js's ?zoom= reading is worldViewport's VIEW_OUT;
 *   6. v2.3.5225 (card O PR 5), THE LADDER'S PIXELS: a pixel rung takes a
 *      quarter, then half, of the pixels ACTUALLY DRAWN (the planning
 *      session's (b)) -- a phone under its budget and a computer held to it
 *      alike; the four callers still agree after a rung moves (it is told
 *      like the speed test's ratio: the renderer, the soft look, a resize),
 *      and back at the row all is as before; `?ladderpix=0` keeps every
 *      pixel at any rung.
 *   Break proof (6, tried 2026-11-14): renderDpr's `if (f < 1) r *= Math.sqrt(f);`
 *   taken out -> FAIL 6a, 6b, 6c; the onKnob's `followRenderer(res);` taken out -> FAIL 6c.
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

/* the stand-in page: a screen ratio, a screen, a pointer, an address, a renderer */
const R = { resolution: 1 };
const PTR = { fine: true };
globalThis.window = {
  devicePixelRatio: 1, screen: { width: 1920, height: 1080 },
  matchMedia: (q) => ({ get matches() { return /pointer:fine/.test(q) ? PTR.fine : false; } }),
  _pixiRenderer: { app: { renderer: R } }, dispatchEvent() {},
};
globalThis.location = { search: '' };
window.location = globalThis.location;   /* worldViewport reads window.location, renderRes location: one address */
globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };

const RR = await import(srcUrl('game/renderRes.js'));
const { renderDpr, noteCanvasCss, pixelBudget, setRenderResLive, renderResLowered, GAME_PX_PER_ART_PX, SCREEN_BUDGET_W, SCREEN_BUDGET_H, _resetRenderRes } = RR;
const { VIEW_CAP } = await import(srcUrl('game/viewCap.js'));
const { PIXEL } = await import(pathToFileURL(join(here, '../../public/tools/style/bible.js')).href);

/** a fresh page: the screen's ratio, its address, the canvas's CSS size;
 *  `dev` the screen (CSS px) and whether it has a mouse (a computer by default) */
function page(dpr, search, w, h, dev) {
  _resetRenderRes();
  const d = dev || { sw: 1920, sh: 1080, fine: true };
  window.screen = { width: d.sw, height: d.sh };
  PTR.fine = d.fine;
  window.devicePixelRatio = dpr;
  location.search = search || '';
  R.resolution = dpr;
  if (w) noteCanvasCss(w, h);
}
const PHONE = (sw, sh) => ({ sw, sh, fine: false });
const TABLET = (sw, sh) => ({ sw, sh, fine: false });
const px = (w, h) => w * h * renderDpr() * renderDpr();
const BUDGET = (VIEW_CAP.REF_W * 2) * (VIEW_CAP.REF_H * 2);   /* a phone's */
const SCREEN = 1920 * 1080;                                   /* anything else's */

/* ── 1. the budget, from the constants ────────────────────────────────── */
page(1, '');
check('1a. the art\'s px mirror bible.js (PIXEL.gamePxPerArtPx)', GAME_PX_PER_ART_PX === PIXEL.gamePxPerArtPx, [GAME_PX_PER_ART_PX, PIXEL.gamePxPerArtPx]);
check('1b. a phone\'s budget is the view cap\'s reference at 2 px a game px: ~4.52 million', pixelBudget(true) === BUDGET && Math.abs(BUDGET - 4.522e6) < 1e3, pixelBudget(true));
/* break proof: REF_W 850 -> 900 in viewCap.js turns 1b red */
check('1c. anything else\'s is a 1920 x 1080 screen\'s: ~2.07 million', pixelBudget(false) === SCREEN && SCREEN_BUDGET_W * SCREEN_BUDGET_H === SCREEN, pixelBudget(false));
check('1d. ...and a computer\'s page uses it (the class kept with the size)', (noteCanvasCss(100, 100), pixelBudget()) === SCREEN);
page(1, '?zoom=0.5');
check('1e. ?zoom=0.5 grows both as the view cap\'s reference (0.77 / 0.5 each way)',
  Math.abs(pixelBudget(true) - BUDGET * (0.77 / 0.5) ** 2) < 1 && Math.abs(pixelBudget(false) - SCREEN * (0.77 / 0.5) ** 2) < 1, [pixelBudget(true), pixelBudget(false)]);
page(1, '?zoom=9');
check('1f. ?zoom= is clamped as worldViewport clamps it (1.5)', Math.abs(pixelBudget(true) - BUDGET * (0.77 / 1.5) ** 2) < 1, pixelBudget(true));

/* ── 2. the screens ──────────────────────────────────────────────────── */
{
  const UNTOUCHED = [
    ['an iPhone, 390 x 844 at 3', 3, 390, 844, PHONE(390, 844)],
    ['an iPhone sideways, 844 x 390 at 3', 3, 844, 390, PHONE(390, 844)],
    ['the biggest iPhone, 440 x 956 at 3 (3.8 million)', 3, 440, 956, PHONE(440, 956)],
    ['a 1920 x 1080 laptop at 1 (its canvas under the window)', 1, 1920, 920, undefined],
  ];
  for (const [tag, d, w, h, dev] of UNTOUCHED) {
    page(d, '', w, h, dev);
    check('2a. untouched: ' + tag, renderDpr() === d && !renderResLowered(), { dpr: renderDpr(), px: px(w, h) });
  }
  const LOWERED = [
    ['an 11-inch iPad, 820 x 1180 at 2 (3.9 million)', 2, 820, 1180, TABLET(820, 1180)],
    ['a 12.9-inch iPad, 1024 x 1366 at 2 (5.6 million)', 2, 1024, 1366, TABLET(1024, 1366)],
    ['a 2560 x 1440 screen at 1.5 (8.3 million)', 1.5, 2560, 1440, { sw: 2560, sh: 1440, fine: true }],
    ['a 2560 x 1440 screen at 1 (3.7 million: below one canvas px a CSS px)', 1, 2560, 1440, { sw: 2560, sh: 1440, fine: true }],
    ['a 5K screen, 2560 x 1440 at 2 (14.7 million)', 2, 2560, 1440, { sw: 2560, sh: 1440, fine: true }],
  ];
  for (const [tag, d, w, h, dev] of LOWERED) {
    page(d, '', w, h, dev);
    check('2b. lowered to a 1920 x 1080 screen\'s: ' + tag,
      renderDpr() < d && renderResLowered() && Math.abs(px(w, h) - SCREEN) < 1,
      { dpr: renderDpr(), px: px(w, h), before: w * h * d * d });
  }
  /* break proof: SCREEN_BUDGET_W 1920 -> 2560 turns 2b red */
  check('2c. the canvas\'s size is read, not the window\'s (1830 x 920 at 1 is under 2.07 million)', (page(1, '', 1830, 920), renderDpr() === 1));
  page(2, '', 390, 300, { sw: 1920, sh: 1080, fine: false });
  check('2d. a small window on a big touch screen is not a phone (the screen, not the window)', pixelBudget() === SCREEN);
  page(3, '', 390, 844, { sw: 390, sh: 844, fine: true });
  check('2e. a phone-sized screen with a mouse is not a phone', pixelBudget() === SCREEN);
}

/* ── 3. the lowest of four; the switch; not told yet ──────────────────── */
page(2, '?res=1.05', 1024, 1366, TABLET(1024, 1366));
check('3a. ?res= under the budget wins', renderDpr() === 1.05);
page(2, '', 2560, 1440);
setRenderResLive(0.5 + 0.5);
check('3b. the speed test under the budget wins, and goes back to the budget', (page(2, '', 1024, 1366, TABLET(1024, 1366)), setRenderResLive(1), renderDpr() === 1) && (setRenderResLive(0), Math.abs(px(1024, 1366) - SCREEN) < 1));
page(2, '?pixbudget=0', 1024, 1366);
check('3c. ?pixbudget=0 turns it off for one screen', renderDpr() === 2);
page(2, '?a=1&pixbudget=0&b=2', 2560, 1440);
check('3d. ...wherever it sits in the address', renderDpr() === 2);
page(2, '?pixbudget=01', 2560, 1440);
check('3e. only the exact word turns it off', renderDpr() < 2);
page(2, '');
check('3f. no budget until the canvas\'s size is told (the first resize tells it)', renderDpr() === 2);
page(2, '?pixbudget=3000000', 2560, 1440);
check('3g. ?pixbudget=<pixels> sets the budget for one screen', Math.abs(px(2560, 1440) - 3e6) < 1, px(2560, 1440));
page(3, '?a=1&pixbudget=1e6', 390, 844, PHONE(390, 844));
check('3h. ...on a phone too, written 1e6', Math.abs(px(390, 844) - 1e6) < 1, px(390, 844));
page(2, '?pixbudget=50', 2560, 1440);
check('3i. a count under 100000 is ignored (the class\'s budget)', Math.abs(px(2560, 1440) - SCREEN) < 1);
page(2, '?pixbudget=abc', 2560, 1440);
check('3j. a word that is not a count is ignored', Math.abs(px(2560, 1440) - SCREEN) < 1);

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
    if (again || resizedAgain || Math.abs(cssFromVp - w) > 0.5 / renderDpr() + 1e-9 ||   /* a canvas px is 1 / dpr CSS px: below 1 the rounding is wider */
        Math.abs(R.resolution - renderDpr()) > 1e-9 || !(vp.W > 0)) {
      bad.push({ w, h, d, again, resizedAgain, cssFromVp, res: R.resolution, dpr: renderDpr() });
    }
  }
  check('4a. after a resize the four agree: no resize the next frame, nor the next resize()', bad.length === 0, bad);
  /* a live resize across the budget's edge: the renderer's resolution follows */
  page(2, '', 700, 700);
  const before = R.resolution;
  resize(2560, 1300);
  check('4b. a resize past the budget moves the renderer\'s resolution with it', before === 2 && Math.abs(R.resolution - renderDpr()) < 1e-9 && R.resolution < 2, { before, after: R.resolution });
  resize(900, 500);
  check('4c. ...and back under it, back to the screen\'s', R.resolution === 2 && renderDpr() === 2);
  /* the class is kept with the size: a touch laptop's mouse going away between
     two callers in one frame does not move the ratio */
  page(1, '', 2560, 1300, { sw: 390, sh: 844, fine: true });
  const r0 = renderDpr();
  PTR.fine = false;
  check('4d. the class is kept with the size: the pointer changing mid-frame moves no ratio', renderDpr() === r0 && r0 < 1);
  resize(2560, 1300);
  check('4e. ...and the next resize() takes the new class, the renderer with it', renderDpr() === 1 && R.resolution === 1);
  /* break proof: drop `followRenderer(res)` from noteCanvasCss and 4b is red */
}

/* ── 5. one ?zoom= reading ────────────────────────────────────────────── */
{
  const bad = [];
  for (const z of ['', '?zoom=0.5', '?zoom=1', '?zoom=0.1', '?zoom=7', '?zoom=x', '?a=1&zoom=0.64']) {
    const WV = await worldViewport(z);
    page(1, z, 100, 100, PHONE(390, 844));
    const k = VIEW_CAP.VIEW_OUT_REF / WV.VIEW_OUT;
    const want = (VIEW_CAP.REF_W * k * 2) * (VIEW_CAP.REF_H * k * 2);
    if (Math.abs(pixelBudget() - want) > 1e-6) bad.push({ z, VIEW_OUT: WV.VIEW_OUT, budget: pixelBudget(), want });
  }
  check('5a. renderRes reads ?zoom= as worldViewport\'s VIEW_OUT does', bad.length === 0, bad);
}

/* ── 6. the ladder's pixels (v2.3.5225, card O PR 5) ─────────────────── */
{
  const { setRung, ladderRung, AXES, knobAt } = await import(srcUrl('game/drawLanes.js'));
  /* the chip axis's rungs to the first pixel rung, and to the second */
  const at = (n) => AXES.chip.findIndex((r, i) => r.knob === 'pixels' && r.to === n) + 1;
  const P1 = at(1), P2 = at(2);
  const resizes = [];
  window.dispatchEvent = (e) => { resizes.push(e && e.type); };
  /* a phone under its budget: the screen's own pixels, then a quarter fewer, then half */
  page(3, '', 390, 844, PHONE(390, 844));
  setRung(0, 0);
  const row = px(390, 844);
  setRung(0, P1);
  const q = px(390, 844);
  setRung(0, P2);
  const h = px(390, 844);
  check(`6a. a phone under its budget (its own ${Math.round(row)} px): the first pixel rung draws a quarter fewer (${Math.round(q)}), the second half (${Math.round(h)})`,
    knobAt('full', 'pixels', ladderRung()) === 0.5 && Math.abs(q - row * 0.75) < 1 && Math.abs(h - row * 0.5) < 1 && row === 390 * 844 * 9, { row, q, h });
  /* a computer held to its budget: a quarter, then half, of the BUDGET's pixels */
  page(2, '', 2560, 1440);
  setRung(0, 0);
  const brow = px(2560, 1440);
  setRung(0, P1);
  const bq = px(2560, 1440);
  check(`6b. a computer held to its budget (${Math.round(brow)} px): the first pixel rung, a quarter of those fewer (${Math.round(bq)})`,
    Math.abs(brow - SCREEN) < 1 && Math.abs(bq - SCREEN * 0.75) < 1, { brow, bq });
  setRung(0, 0);
  /* the four callers agree after a rung moves: told as the speed test's ratio is */
  const canvas = { width: 0, height: 0 }, pixi = { width: 0, height: 0 };
  const resize = (w, hh) => { noteCanvasCss(w, hh); const d = renderDpr(); const tw = Math.round(w * d), th = Math.round(hh * d); if (canvas.width === tw && canvas.height === th) return false; canvas.width = tw; canvas.height = th; return true; };
  const frameResizes = () => { const d = renderDpr(); const cw = canvas.width / d, ch = canvas.height / d; const r = Math.abs(pixi.width - cw) > 0.5 || Math.abs(pixi.height - ch) > 0.5; if (r) { pixi.width = cw; pixi.height = ch; } return r; };
  const bad = [];
  for (const [w, hh, d, dev] of [[390, 806, 3, PHONE(390, 844)], [1920, 920, 1, null], [2560, 1300, 2, null]]) {
    page(d, '', w, hh, dev || undefined);
    setRung(0, 0);
    resize(w, hh); frameResizes();
    resizes.length = 0;
    setRung(0, P1);                       /* the governor's step, behind a veil */
    const told = resizes.includes('resize');
    const followed = Math.abs(R.resolution - renderDpr()) < 1e-9;
    resize(w, hh); frameResizes();        /* BroTown's resize(), told; the next frame takes the size */
    const again = frameResizes() || resize(w, hh);
    if (!told || !followed || again || Math.abs(canvas.width / renderDpr() - w) > 0.5 / renderDpr() + 1e-9) bad.push({ w, hh, d, told, followed, again, res: R.resolution, dpr: renderDpr() });
    setRung(0, 0);
    if (Math.abs(R.resolution - d) > 1e-9 && !(w === 2560)) bad.push({ back: R.resolution, d });
  }
  check('6c. after a pixel rung moves the four still agree: the renderer follows, resize() is told, and the next frame asks for no resize', bad.length === 0, bad);
  /* back at the row: as before */
  page(2, '', 2560, 1440);
  setRung(0, P2); setRung(0, 0);
  check('6d. back at the lane\'s row, every pixel the budget allows, as before the ladder', Math.abs(px(2560, 1440) - SCREEN) < 1);
  /* ?ladderpix=0 */
  page(3, '?ladderpix=0', 390, 844, PHONE(390, 844));
  setRung(0, P2);
  check('6e. `?ladderpix=0`: every pixel at any rung', Math.abs(px(390, 844) - 390 * 844 * 9) < 1);
  setRung(0, 0);
  const rr = readFileSync(join(src, 'game/renderRes.js'), 'utf8');
  check('6f. the pixels are read through the lanes\' one reader (laneKnob(\'pixels\')), told by onKnob', /laneKnob\('pixels'\)/.test(rr) && /onKnob\('pixels', /.test(rr));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all render-res checks passed');
