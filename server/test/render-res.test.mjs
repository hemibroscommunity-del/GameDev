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
 *   7. v2.3.6503 (card PH PR 4), A PHONE DRAWS AT 1.5 (the owner: "1.5 looks
 *      fine nothing below that"): an iPhone at 1.5, sideways and the biggest
 *      too; the same ratio and the same soft mark as `?res=1.5` (the picture
 *      the owner saw); never lower by the pixel rungs; an explicit `?res=`
 *      replaces it; `?phoneres=0` the screen's own (the old look, §2 and §6's
 *      phones); a tablet and a computer untouched; one number (PHONE_RES).
 *   Break proof (7, tried 2026-11-24): renderDpr's `else if (phone) r = Math.min(r, PHONE_RES);`
 *   taken out -> FAIL 7a, 7b, 7c; the floor (`Math.min(r, floor)` as `0`) -> FAIL 7c (1.06).
 *   Break proof (6, tried 2026-11-14): renderDpr's `if (f < 1) r *= Math.sqrt(f);`
 *   taken out -> FAIL 6a, 6b, 6c; the onKnob's `followRenderer(res);` taken out -> FAIL 6c.
 *   v2.3.5225 (the gatekeeper's sitting 12): the change is carried out at the
 *   top of the next frame (beforeDraw), never inside the frame that moved the
 *   rung; the knob's listener running it at once -> FAIL 6c (`early`).
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
const BUDGET_REF = (VIEW_CAP.REF_W * 2) * (VIEW_CAP.REF_H * 2);   /* a phone's, at the reference zoom */
const SCREEN_REF = 1920 * 1080;                                   /* anything else's, at the reference zoom */
/* v2.3.6580: the default view is 0.79, closer than the 0.77 the reference was
   measured at, so the budget (the same pixels a game px) is (0.77 / 0.79)^2 of it */
const K0 = (VIEW_CAP.VIEW_OUT_REF / VIEW_CAP.VIEW_OUT_DEFAULT) ** 2;
const BUDGET = BUDGET_REF * K0;   /* a phone's, at the default view */
const SCREEN = SCREEN_REF * K0;   /* anything else's, at the default view */

/* ── 1. the budget, from the constants ────────────────────────────────── */
page(1, '');
check('1a. the art\'s px mirror bible.js (PIXEL.gamePxPerArtPx)', GAME_PX_PER_ART_PX === PIXEL.gamePxPerArtPx, [GAME_PX_PER_ART_PX, PIXEL.gamePxPerArtPx]);
check('1b. a phone\'s budget is the view cap\'s reference at 2 px a game px: ~4.52 million', Math.abs(pixelBudget(true) - BUDGET) < 1 && Math.abs(BUDGET_REF - 4.522e6) < 1e3, pixelBudget(true));
/* break proof: REF_W 850 -> 900 in viewCap.js turns 1b red */
check('1c. anything else\'s is a 1920 x 1080 screen\'s: ~2.07 million', Math.abs(pixelBudget(false) - SCREEN) < 1 && SCREEN_BUDGET_W * SCREEN_BUDGET_H === SCREEN_REF, pixelBudget(false));
check('1d. ...and a computer\'s page uses it (the class kept with the size)', Math.abs((noteCanvasCss(100, 100), pixelBudget()) - SCREEN) < 1);
/* v2.3.6581: the owner's pick written out as numbers, so no constant read from the
   same file can move with the thing it checks.  The default is 0.79 ("Ok I like 0.79",
   v2.3.6580) and the budget is the reference's x (0.77 / 0.79)^2: a phone's
   4.522 million -> 4.296 million, a computer's 2.074 million -> 1.970 million.
   Break proofs: VIEW_OUT_DEFAULT 0.79 -> 0.77 in viewCap.js, or renderRes.js
   viewOut() reading VIEW_OUT_REF again (the factor dropped), turns 1g red. */
check('1g. the default view is the owner\'s 0.79, and the budget follows it: a phone\'s 4.296 million, a computer\'s 1.970 million',
  VIEW_CAP.VIEW_OUT_DEFAULT === 0.79 && VIEW_CAP.VIEW_OUT_REF === 0.77
    && Math.abs(pixelBudget(true) - 4.2963e6) < 2e3 && Math.abs(pixelBudget(false) - 1.9696e6) < 2e3, [pixelBudget(true), pixelBudget(false)]);
page(1, '?zoom=0.5');
check('1e. ?zoom=0.5 grows both as the view cap\'s reference (0.77 / 0.5 each way)',
  Math.abs(pixelBudget(true) - BUDGET_REF * (0.77 / 0.5) ** 2) < 1 && Math.abs(pixelBudget(false) - SCREEN_REF * (0.77 / 0.5) ** 2) < 1, [pixelBudget(true), pixelBudget(false)]);
page(1, '?zoom=9');
check('1f. ?zoom= is clamped as worldViewport clamps it (1.5)', Math.abs(pixelBudget(true) - BUDGET_REF * (0.77 / 1.5) ** 2) < 1, pixelBudget(true));

/* ── 2. the screens ──────────────────────────────────────────────────── */
{
  const UNTOUCHED = [
    ['an iPhone, 390 x 844 at 3', 3, 390, 844, PHONE(390, 844)],
    ['an iPhone sideways, 844 x 390 at 3', 3, 844, 390, PHONE(390, 844)],
    ['the biggest iPhone, 440 x 956 at 3 (3.8 million)', 3, 440, 956, PHONE(440, 956)],
    ['a 1920 x 1080 laptop at 1 (its canvas under the window)', 1, 1920, 920, undefined],
  ];
  for (const [tag, d, w, h, dev] of UNTOUCHED) {
    page(d, dev ? '?phoneres=0' : '', w, h, dev);   /* v2.3.6503: a phone's own budget, the old look (§7 the 1.5) */
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
  check('2d. a small window on a big touch screen is not a phone (the screen, not the window)', Math.abs(pixelBudget() - SCREEN) < 1);
  page(3, '', 390, 844, { sw: 390, sh: 844, fine: true });
  check('2e. a phone-sized screen with a mouse is not a phone', Math.abs(pixelBudget() - SCREEN) < 1);
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
page(3, '?a=1&pixbudget=1e6&phoneres=0', 390, 844, PHONE(390, 844));   /* v2.3.6503: the old look (§7 the 1.5) */
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
  const { runBeforeDraw } = await import(srcUrl('game/framePacer.js'));
  /* v2.3.5225 (the gatekeeper's sitting 12): the pixels are an axis of their own, and the knob's change is carried
     out at the top of the next frame (beforeDraw): a rung, then the loop's next frame */
  const at = (n) => AXES.pixels.findIndex((r) => r.knob === 'pixels' && r.to === n) + 1;
  const P1 = at(1), P2 = at(2);
  const rung = (p) => { setRung(0, 0, p); runBeforeDraw(); };
  const resizes = [];
  window.dispatchEvent = (e) => { resizes.push(e && e.type); };
  /* a phone under its budget: the screen's own pixels, then a quarter fewer, then half */
  page(3, '?phoneres=0', 390, 844, PHONE(390, 844));   /* v2.3.6503: the old look (§7 the 1.5) */
  rung(0);
  const row = px(390, 844);
  rung(P1);
  const q = px(390, 844);
  rung(P2);
  const h = px(390, 844);
  check(`6a. a phone under its budget (its own ${Math.round(row)} px): the first pixel rung draws a quarter fewer (${Math.round(q)}), the second half (${Math.round(h)})`,
    knobAt('full', 'pixels', ladderRung()) === 0.5 && Math.abs(q - row * 0.75) < 1 && Math.abs(h - row * 0.5) < 1 && row === 390 * 844 * 9, { row, q, h });
  /* a computer held to its budget: a quarter, then half, of the BUDGET's pixels */
  page(2, '', 2560, 1440);
  rung(0);
  const brow = px(2560, 1440);
  rung(P1);
  const bq = px(2560, 1440);
  check(`6b. a computer held to its budget (${Math.round(brow)} px): the first pixel rung, a quarter of those fewer (${Math.round(bq)})`,
    Math.abs(brow - SCREEN) < 1 && Math.abs(bq - SCREEN * 0.75) < 1, { brow, bq });
  rung(0);
  /* the four callers agree after a rung moves: told as the speed test's ratio is */
  const canvas = { width: 0, height: 0 }, pixi = { width: 0, height: 0 };
  const resize = (w, hh) => { noteCanvasCss(w, hh); const d = renderDpr(); const tw = Math.round(w * d), th = Math.round(hh * d); if (canvas.width === tw && canvas.height === th) return false; canvas.width = tw; canvas.height = th; return true; };
  const frameResizes = () => { const d = renderDpr(); const cw = canvas.width / d, ch = canvas.height / d; const r = Math.abs(pixi.width - cw) > 0.5 || Math.abs(pixi.height - ch) > 0.5; if (r) { pixi.width = cw; pixi.height = ch; } return r; };
  const bad = [];
  for (const [w, hh, d, dev] of [[390, 806, 3, PHONE(390, 844)], [1920, 920, 1, null], [2560, 1300, 2, null]]) {
    page(d, dev ? '?phoneres=0' : '', w, hh, dev || undefined);   /* v2.3.6503: the old look (§7 the 1.5) */
    rung(0);
    resize(w, hh); frameResizes();
    resizes.length = 0;
    setRung(0, 0, P1);                    /* the governor's step, behind a veil */
    const early = resizes.includes('resize');   /* not inside the frame that moved the rung */
    runBeforeDraw();                          /* the next frame's top */
    const told = !early && resizes.includes('resize');
    const followed = Math.abs(R.resolution - renderDpr()) < 1e-9;
    resize(w, hh); frameResizes();        /* BroTown's resize(), told; the next frame takes the size */
    const again = frameResizes() || resize(w, hh);
    if (early || !told || !followed || again || Math.abs(canvas.width / renderDpr() - w) > 0.5 / renderDpr() + 1e-9) bad.push({ w, hh, d, early, told, followed, again, res: R.resolution, dpr: renderDpr() });
    rung(0);
    if (Math.abs(R.resolution - d) > 1e-9 && !(w === 2560)) bad.push({ back: R.resolution, d });
  }
  check('6c. after a pixel rung moves the four still agree: at the top of the next frame (never inside the one that moved it: v2.3.5225) the renderer follows, resize() is told, and the frame after asks for no resize', bad.length === 0, bad);
  /* back at the row: as before */
  page(2, '', 2560, 1440);
  rung(P2); rung(0);
  check('6d. back at the lane\'s row, every pixel the budget allows, as before the ladder', Math.abs(px(2560, 1440) - SCREEN) < 1);
  /* ?ladderpix=0 */
  page(3, '?ladderpix=0&phoneres=0', 390, 844, PHONE(390, 844));   /* v2.3.6503: the old look (§7 the 1.5) */
  rung(P2);
  check('6e. `?ladderpix=0`: every pixel at any rung', Math.abs(px(390, 844) - 390 * 844 * 9) < 1);
  rung(0);
  const rr = readFileSync(join(src, 'game/renderRes.js'), 'utf8');
  check('6f. the pixels are read through the lanes\' one reader (laneKnob(\'pixels\')), told by onKnob', /laneKnob\('pixels'\)/.test(rr) && /onKnob\('pixels', /.test(rr));
}

/* ── 7. v2.3.6503 (card PH PR 4): a phone draws at 1.5 ──────────────── */
{
  const { PHONE_RES } = RR;
  const { setRung, AXES } = await import(srcUrl('game/drawLanes.js'));
  const { runBeforeDraw } = await import(srcUrl('game/framePacer.js'));
  const soft = () => !!(globalThis.document && document.documentElement.attrs && 'data-res-soft' in document.documentElement.attrs);
  const hadDoc = globalThis.document;
  globalThis.document = { documentElement: { attrs: {}, setAttribute(k) { this.attrs[k] = ''; }, removeAttribute(k) { delete this.attrs[k]; } } };
  const look = (dpr, search, w, h, dev) => { page(dpr, search, w, h, dev); setRenderResLive(0); return { dpr: renderDpr(), soft: soft(), lowered: renderResLowered() }; };
  const phones = [[390, 844, PHONE(390, 844)], [844, 390, PHONE(390, 844)], [440, 956, PHONE(440, 956)]].map(([w, h, d]) => look(3, '', w, h, d));
  check('7a. an iPhone draws at 1.5 canvas pixels a CSS pixel (a quarter of its own 3\'s), upright, sideways and the biggest: one number, PHONE_RES',
    PHONE_RES === 1.5 && phones.every((x) => x.dpr === 1.5 && x.lowered), phones);
  const res15 = look(3, '?res=1.5&phoneres=0', 390, 844, PHONE(390, 844));
  const def = look(3, '', 390, 844, PHONE(390, 844));
  check('7b. ...the very picture `?res=1.5` showed the owner: the same ratio, stretched smoothly up the same way ([data-res-soft])',
    def.dpr === res15.dpr && def.soft && res15.soft, { def, res15 });
  const at = (n) => AXES.pixels.findIndex((r) => r.knob === 'pixels' && r.to === n) + 1;
  page(3, '', 390, 844, PHONE(390, 844));
  setRung(0, 0, at(2)); runBeforeDraw();
  const deep = renderDpr();
  setRung(0, 0, 0); runBeforeDraw();
  check('7c. never lower: the ladder\'s deepest pixel rung keeps a phone at 1.5 ("nothing below that")', deep === 1.5, deep);
  const asked = [look(3, '?res=3', 390, 844, PHONE(390, 844)), look(3, '?res=2', 390, 844, PHONE(390, 844)), look(3, '?phoneres=0', 390, 844, PHONE(390, 844))];
  check('7d. an explicit `?res=` replaces it (3, 2), and `?phoneres=0` is the screen\'s own: the old look, unsoftened',
    asked[0].dpr === 3 && !asked[0].soft && asked[1].dpr === 2 && asked[2].dpr === 3 && !asked[2].soft, asked);
  const others = [look(2, '', 1194, 834, TABLET(1194, 834)), look(1, '', 1920, 920, undefined), look(2, '', 1440, 900, undefined)];
  check('7e. a tablet and a computer as before (their budgets, never PHONE_RES)', others[0].dpr !== 1.5 && others[1].dpr === 1 && others[2].dpr !== 1.5, others);
  const lowP = look(1, '', 390, 844, PHONE(390, 844));
  check('7f. a phone whose screen is below 1.5 keeps its own', lowP.dpr === 1 && !lowP.lowered, lowP);
  globalThis.document = hadDoc;
}

/* ── 8 (v2.3.6641, card PAD part 4): the world's width as told, and who hears it move ── */
{
  const { canvasCssW, watchCanvasCssW } = RR;
  page(3, '', 0, 0, PHONE(844, 390));
  const heard = [];
  const off = watchCanvasCssW((w) => heard.push(w));
  const before = canvasCssW();
  noteCanvasCss(752, 342);             /* sideways, the band folded: the world between two bars */
  noteCanvasCss(752, 300);             /* the height alone moved: the width did not */
  noteCanvasCss(528, 240);             /* the band open: narrower */
  const now = canvasCssW();
  off();
  noteCanvasCss(752, 342);             /* no longer watching */
  check('8a. the width as resize() told it (0 before), never measured', before === 0 && now === 528 && canvasCssW() === 752, { before, now });
  check('8b. a watcher hears each change of the WIDTH once, not of the height alone, and nothing once it stops', JSON.stringify(heard) === '[752,528]', heard);
  const boom = watchCanvasCssW(() => { throw new Error('a watcher\'s own'); });
  const late = [];
  const off2 = watchCanvasCssW((w) => late.push(w));
  let threw = false;
  try { noteCanvasCss(600, 300); } catch (e) { threw = true; }
  boom(); off2();
  check('8c. a watcher that throws stops neither the size nor the next watcher', !threw && canvasCssW() === 600 && late[0] === 600, { threw, late });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all render-res checks passed');
