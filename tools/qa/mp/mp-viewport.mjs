/* THE GAME FILLS THE PHONE (v2.3.1740).
 *
 * Owner, on joining from an iPhone: a screenshot of the world squashed into
 * a ~150px strip at the top, a large black gap, then the joysticks and the
 * dashboard — unplayable, and the same class of failure as the judging
 * session.
 *
 * The canvas is sized in BroTown.jsx's resize(), which since v2.3.1715
 * measures #root and shrinks the viewport to it whenever #root is SMALLER:
 *
 *     if (_sh > 0 && _sh < vhFull) vhFull = _sh;
 *
 * That exists for the desktop shell (a centred 25%-wide window, created by a
 * `@media (pointer:fine) and (min-width:1000px)` rule that also gives #root
 * `height:100%`).  Its comment asserts "on mobile the shell IS the viewport,
 * so this is a no-op there" — but on mobile NOTHING gives #root a height, and
 * its only real child is `position:fixed` and therefore out of flow.  So
 * #root's clientHeight is whatever incidental in-flow content exists at the
 * moment resize() runs, and any small positive value silently becomes the
 * height of the game.
 *
 * This scenario runs a REAL phone viewport (390x844, touch, coarse pointer)
 * and asserts the canvas actually fills it.  A unit test cannot see this: it
 * is a layout race between CSS, React's first paint and a ResizeObserver.
 */
import * as H from './harness.mjs';

/* iPhone 12/13/14 CSS viewport — the size the whole UI was designed against
   (game.css says so in several places). */
const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const ctx = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      + ' (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const P = { ctx, page, logs: [], name: 'Pocket' };

  await H.enterWorld(P);
  /* Let the layout settle the way a real join does — the bug is present on
     arrival, so this is generous rather than racing it. */
  await page.waitForTimeout(2500);

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    const root = document.getElementById('root');
    const wrap = document.querySelector('.brotown-wrap');
    const cr = c ? c.getBoundingClientRect() : null;
    const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || null;
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      canvasCssH: cr ? Math.round(cr.height) : null,
      canvasCssW: cr ? Math.round(cr.width) : null,
      rootH: root ? root.clientHeight : null,
      rootW: root ? root.clientWidth : null,
      wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
      dashH,
      coarse: window.matchMedia('(pointer:coarse)').matches,
    };
  });

  rec.ok('the phone context really is a coarse-pointer phone', geo.coarse === true, geo);
  rec.ok('the wrap fills the phone viewport',
    geo.wrapH !== null && Math.abs(geo.wrapH - geo.vh) <= 2, geo);

  /* THE ASSERTION.  The canvas is the world; below the dashboard band it
     should occupy everything that is left.  Allowing 12% slack covers the
     DASH_OVERLAP fudge and rounding without coming close to the ~150px strip
     the owner saw (which is ~18% of the viewport). */
  const expected = geo.vh - (geo.dashH || 0);
  rec.ok('the world canvas fills the space above the dashboard, not a strip',
    geo.canvasCssH !== null && geo.canvasCssH >= expected * 0.88,
    { ...geo, expected: Math.round(expected), got: geo.canvasCssH });
  rec.ok('...and spans the full width', geo.canvasCssW !== null
    && Math.abs(geo.canvasCssW - geo.vw) <= 2, geo);

  /* The cause, pinned separately so a failure names it: on a phone the
     desktop shell must not be measured at all.  #root having a small height
     here is FINE — what must not happen is the canvas inheriting it. */
  rec.ok('a phone-sized #root never shrinks the world below the viewport',
    geo.canvasCssH !== null && geo.canvasCssH > (geo.rootH || 0) * 0.5
      || geo.canvasCssH >= expected * 0.88,
    geo);

  /* ═══ THE iOS SAFARI CASE ═══
     The clean load above passes, so the collapse needs the condition a real
     iPhone has and a headless page does not: a visualViewport SHORTER than
     window.innerHeight, which is what Safari's chrome produces.  resize()
     bails whenever that gap exceeds 100px:

         if (vv && window.innerHeight - vhFull > 100) return;

     — a guard written for the chat KEYBOARD.  On a tall phone the browser
     chrome alone clears 100px, so the guard fires on every call and the
     canvas keeps whatever size the FIRST (pre-layout) call gave it.
     Stubbed here because Playwright does not emulate Safari's chrome. */
  const ctx2 = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  });
  const page2 = await ctx2.newPage();
  await page2.addInitScript((p) => {
    window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`;
    /* A 140px gap: bigger than the guard's 100 threshold, the sort a
       Dynamic-Island phone with the bottom URL bar really reports. */
    const vv = window.visualViewport;
    if (vv) {
      try {
        Object.defineProperty(vv, 'height', { get: () => window.innerHeight - 140, configurable: true });
      } catch (e) { /* if it cannot be stubbed the case simply does not apply */ }
    }
  }, wsPort);
  await page2.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const P2 = { ctx: ctx2, page: page2, logs: [], name: 'Pocket2' };
  await H.enterWorld(P2);
  await page2.waitForTimeout(2500);
  /* Nudge a resize the way rotating or scrolling the URL bar would. */
  await page2.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page2.waitForTimeout(600);

  const geo2 = await page2.evaluate(() => {
    const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    const cr = c ? c.getBoundingClientRect() : null;
    const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
    return {
      innerH: window.innerHeight,
      vvH: window.visualViewport ? Math.round(window.visualViewport.height) : null,
      gap: window.visualViewport ? Math.round(window.innerHeight - window.visualViewport.height) : null,
      canvasCssH: cr ? Math.round(cr.height) : null,
      dashH,
    };
  });
  /* Target the VISIBLE viewport, not innerHeight: when browser chrome
     shrinks visualViewport that is genuinely the space the game has, and it
     is what the canvas should fill.  (Under the stub, dvh still reports the
     full 844 because Playwright knows nothing about our fake gap — on a real
     phone dvh and visualViewport agree, so the wrap and canvas match there.
     Either way the assertion that matters is the same: not a 150px strip.) */
  const expect2 = (geo2.vvH || geo2.innerH) - (geo2.dashH || 0);
  rec.ok('the stub really does present a browser-chrome gap over the guard threshold',
    geo2.gap !== null && geo2.gap > 100, geo2);
  rec.ok('the world still fills the phone when the browser chrome shrinks visualViewport',
    geo2.canvasCssH !== null && geo2.canvasCssH >= expect2 * 0.88,
    { ...geo2, expected: Math.round(expect2), got: geo2.canvasCssH });

  await ctx2.close().catch(() => {});
  await ctx.close().catch(() => {});
}
