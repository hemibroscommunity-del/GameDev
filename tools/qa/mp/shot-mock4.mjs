/* THE FOUR-EQUAL-WIDTH MOCKUP, PHOTOGRAPHED AND MEASURED (v2.3.2596).
 *
 * Owner: "I want to see a mockup of what all of the 3 combat skills and shared
 * stats column look like expanded but sharing equal width ... icons about 3x as
 * large ... plus button 50% wider ... font size of each skill a bit."
 *
 * Captures the SAME character, with the SAME seeded points, at the SAME
 * viewport, three times: the screen as it ships, then ?mock4=a (the ask taken
 * literally) and ?mock4=b (the ask with the cell re-cut).  The mode is read
 * from the query string per render, so the three frames differ by one string
 * and nothing else — no reload, no second character, no second data set.
 *
 * It also MEASURES, because "about 3x" is a number and a screenshot is not:
 * column width, cell box, icon box, [+] box, font sizes, and — the question
 * that actually decides this — whether anything overflows its cell or gets
 * ellipsised.
 *
 *   node tools/qa/mp/shot-mock4.mjs
 */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

const seed = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current; const R = S && S.rpg;
  if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; R.prog3.shared = 3; }
  if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true, prog3shared: true });
});

/* Flip the flag and force ONE re-render.  prog3MockMode() reads
   location.search at render time, so replaceState alone changes nothing until
   React runs again; tapping a lane header is the cheapest guaranteed
   re-render, and under the flag the open-set it toggles is ignored anyway. */
const laneOpen = (P, k) => P.page.evaluate((key) => {
  const el = document.querySelector(`[data-prog3-lane="${key}"]`);
  return !!el && el.getAttribute('aria-expanded') === 'true';
}, k);

const tapLane = (P, k) => P.page.evaluate((key) => {
  const el = document.querySelector(`[data-prog3-lane="${key}"]`);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new PointerEvent('pointerup', o));
  return true;
}, k);

const setMode = async (P, mode, landscape) => {
  await P.page.evaluate((m) => {
    history.replaceState({}, '', m === 'off' ? location.pathname : `${location.pathname}?mock4=${m}`);
  }, mode);
  await tapLane(P, 'bow');
  await P.page.waitForTimeout(420);
  /* ═══ THE TAP IS ONLY A RE-RENDER IN PORTRAIT ═══
     Under the flag the portrait screen ignores the open-set entirely, so the
     tap above costs nothing there.  SIDEWAYS the accordion is still live and
     the flag is never read, so that same tap really does open and close lanes
     — and three frames that differ by which lane is open would read as three
     different layouts when the layout is in fact untouched.  So landscape is
     put back to one known state (Melee open, nothing else) after every flip,
     and the three landscape frames are then a like-for-like. */
  if (landscape) {
    for (const k of ['bow', 'staff', 'shared']) {
      if (await laneOpen(P, k)) { await tapLane(P, k); await P.page.waitForTimeout(260); }
    }
    if (!(await laneOpen(P, 'sword'))) { await tapLane(P, 'sword'); await P.page.waitForTimeout(320); }
  }
};

/* What the frame actually contains, in pixels, straight off the DOM. */
const measure = (P) => P.page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const out = { cols: [], cell: null, icon: null, plus: null, title: null, value: null, skillFont: null, clipped: [], ellipsised: [] };
  document.querySelectorAll('[data-prog3-col]').forEach((c) => {
    out.cols.push({ key: c.getAttribute('data-prog3-col'), w: +c.getBoundingClientRect().width.toFixed(2), cells: c.children.length });
  });
  const lane = document.querySelector('[data-prog3-lane]');
  if (lane) {
    const sp = lane.querySelector('span:not([aria-label])') || [...lane.querySelectorAll('span')].pop();
    if (sp) out.skillFont = getComputedStyle(sp).fontSize;
  }
  /* The first cell of the first OPEN column — the one every number below is of. */
  const col = document.querySelector('[data-prog3-col]');
  const cell = col && col.children[0];
  if (cell) {
    out.cell = r(cell);
    const img = cell.querySelector('img');
    if (img) out.icon = r(img);
    const plus = cell.querySelector('[data-prog3-plus]');
    if (plus) out.plus = r(plus);
    const spans = [...cell.querySelectorAll('span')];
    if (spans[0]) { out.title = { text: spans[0].textContent, font: getComputedStyle(spans[0]).fontSize }; }
    const val = spans.find((s) => /[0-9]/.test(s.textContent) && s !== spans[0]);
    if (val) out.value = { text: val.textContent, font: getComputedStyle(val).fontSize };
  }
  /* OVERFLOW + ELLIPSIS, across every cell of every open column. */
  document.querySelectorAll('[data-prog3-col] > [role="button"]').forEach((c, i) => {
    const cb = c.getBoundingClientRect();
    c.querySelectorAll('img, span, button').forEach((k) => {
      const kb = k.getBoundingClientRect();
      const over = Math.max(0, (kb.bottom - cb.bottom), (cb.top - kb.top), (kb.right - cb.right), (cb.left - kb.left));
      if (over > 0.6) out.clipped.push({ cell: i, tag: k.tagName.toLowerCase(), by: +over.toFixed(1) });
    });
    /* FRACTIONAL, not scrollWidth/clientWidth: those are integers, and a
       46.50px box holding 46.64px of text reports 47 vs 47 — no overflow —
       while the screen shows "POW...".  That false negative survived two
       passes here.  A Range measures what the glyphs actually occupy. */
    c.querySelectorAll('span, div').forEach((k) => {
      const cs = getComputedStyle(k);
      if (cs.textOverflow !== 'ellipsis' || !k.firstChild) return;
      const rng = document.createRange();
      rng.selectNodeContents(k);
      const textW = rng.getBoundingClientRect().width;
      const boxW = k.getBoundingClientRect().width
        - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      if (textW - boxW > 0.05) {
        out.ellipsised.push({ cell: i, text: k.textContent.slice(0, 14), by: +(textW - boxW).toFixed(2) });
      }
    });
  });
  return out;
});

/* The POINTS PANEL alone, cropped.  A full phone frame is 85% game world, and
   the thing being decided is 200px tall at the bottom of it — so the strips the
   PR leads with are cut to the panel, and the full frames are kept beside them
   for anyone who wants the whole screen. */
const cropPanel = async (P, path, landscape) => {
  const box = await P.page.evaluate((land) => {
    const el = land ? document.querySelector('.bt-land-sheet')
      : document.querySelector('[data-prog3-points]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - 4), y: Math.max(0, r.top - 4),
      width: Math.min(r.width + 8, innerWidth), height: Math.min(r.height + 8, innerHeight - r.top + 4) };
  }, landscape);
  if (!box || box.height < 20) return false;
  await P.page.screenshot({ path, clip: box });
  return true;
};

const report = [];

async function shoot(browser, wsPort, webPort, label, vp, landscape, who) {
  /* A plain alphanumeric name: the creator's name field rejects digits and
     dashes, and a refused name leaves the Create button off-viewport, which
     reads as an enterWorld timeout rather than as the validation error it is. */
  /* ═══ THE CHARACTER IS ALWAYS CREATED IN PORTRAIT ═══
     The creator's Play button sits below the fold in a 390px-tall viewport, so
     a landscape context times out in enterWorld and the failure reads as a
     broken door rather than as a creator that does not fit sideways.  Create
     portrait, then rotate — which is also what a real player does. */
  const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
    viewport: landscape ? { width: 390, height: 844 } : vp, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);
  if (landscape) {
    await P.page.setViewportSize(vp);
    /* Rotation closes the sheet (v2.3.2157), so everything below re-opens it. */
    await P.page.waitForTimeout(1200);
  }
  await seed(P);
  /* Sideways there is no `.bt-navrail` — the destinations live in the
     dashboard column — so landscape asks the panel bus for the Character
     destination directly (id 'hero', BottomDashboard.jsx:492).  Portrait
     still goes through the rail a player taps. */
  if (landscape) {
    await P.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('hero'));
    await P.page.waitForTimeout(900);
  } else {
    await H.openDest(P, 'Character');
    await P.page.waitForTimeout(600);
  }
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(800);

  /* BEFORE: the shipped screen at the most it can show — one weapon plus
     Shared, which v2.3.2594 caps it at.  That is the fair comparison to
     "all four open", not the resting strips. */
  if (!landscape) await H.openPointCols(P, ['sword', 'shared']);
  else {
    for (const k of ['bow', 'staff', 'shared']) {
      if (await laneOpen(P, k)) { await tapLane(P, k); await P.page.waitForTimeout(260); }
    }
    if (!(await laneOpen(P, 'sword'))) { await tapLane(P, 'sword'); await P.page.waitForTimeout(320); }
  }
  await P.page.screenshot({ path: `${OUT}/mock4-${label}-before.png` });
  await cropPanel(P, `${OUT}/crop-${label}-before.png`, landscape);
  report.push({ shot: `${label}-before`, mode: 'off (ships today)', ...(await measure(P)) });

  for (const m of ['a', 'b']) {
    await setMode(P, m, landscape);
    await P.page.screenshot({ path: `${OUT}/mock4-${label}-${m}.png` });
    await cropPanel(P, `${OUT}/crop-${label}-${m}.png`, landscape);
    report.push({ shot: `${label}-${m}`, mode: m, ...(await measure(P)) });
  }
  await P.ctx.close();
  console.log(`  ${label}: 3 frames`);
}

const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS);
const web = await H.serveDist(WEB);
/* The sandbox ships chromium-1194; this repo's playwright pin wants 1223 and
   `playwright install` is blocked here.  The preinstalled build drives the
   same CDP surface these captures need, so it is named explicitly rather than
   downloaded. */
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  for (const [label, vp, land, who] of [
    ['390-portrait', { width: 390, height: 844 }, false, 'Mockaa'],
    ['360-portrait', { width: 360, height: 800 }, false, 'Mockbb'],
    ['390-landscape', { width: 844, height: 390 }, true, 'Mockcc'],
    ['360-landscape', { width: 800, height: 360 }, true, 'Mockdd'],
  ]) {
    await shoot(browser, WS, WEB, label, vp, land, who);
  }
} finally {
  await browser.close();
  await H.stopWorker(worker);
  web.close && web.close();
  writeFileSync(`${OUT}/mock4-measurements.json`, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${OUT}/mock4-measurements.json`);
}
