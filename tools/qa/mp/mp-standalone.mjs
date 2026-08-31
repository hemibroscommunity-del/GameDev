/* ═══ v2.3.2178: THE INSTALLED WEB APP, WHICH NOTHING TESTED ═══
 *
 * Owner, with a screenshot of the game added to the iPhone home screen:
 * "In web app view the dashboard buttons float off the dashboard."  And,
 * sideways: "in landscape the combat skills are still getting clipped at
 * the bottom (regardless of rotation left or rotation right)."
 *
 * Both are the same missing state.  A browser tab has NO home-indicator
 * inset; an installed launch has ~34px in portrait and ~21px sideways, and
 * that inset is load-bearing geometry -- the band's height, the row offsets
 * inside it, the landscape dock's anchor and the room panels reserve for it
 * all move with it.  Every scenario in this harness ran at zero, so every
 * one of them agreed the screens were fine while the owner was looking at
 * two broken ones.  This is the second time a device-only state has hidden
 * a bug from a green suite (the first: v2.3.2177, iOS reporting symmetric
 * safe-area insets sideways, which no test simulated either).
 *
 * ═══ HOW A HEADLESS BROWSER PRETENDS TO BE INSTALLED ═══
 * env() cannot be set from script, so this drives the one element that
 * MEASURES it: #bt-sab-probe, whose paddings BroTown's resize() reads
 * (v2.3.2163 built it precisely because JS cannot read env()).  v2.3.2178
 * made every consumer read the --sab stamp resize() writes rather than
 * calling env() for itself -- one measured number, one path -- so overriding
 * the probe now moves the whole layout exactly as an install does.  That
 * change is what makes this file possible at all.
 */
import * as H from './harness.mjs';

/* iOS's real insets: ~34px under a portrait home indicator, ~21px sideways. */
const SAB_PORTRAIT = 34;
const SAB_LANDSCAPE = 21;

const install = (P, px) => P.page.evaluate(async (v) => {
  let st = document.getElementById('bt-fake-home');
  if (!st) { st = document.createElement('style'); st.id = 'bt-fake-home'; document.head.appendChild(st); }
  st.textContent = v > 0 ? `#bt-sab-probe{padding-bottom:${v}px!important}` : '';
  window.dispatchEvent(new Event('resize'));
  await new Promise((r) => setTimeout(r, 700));
}, px);

const portraitGeom = (P) => P.page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const band = document.querySelector('.bt-dashboard');
  const nav = document.querySelector('[data-nav]');
  const canvas = document.querySelector('canvas');
  if (!band || !nav || !canvas) return { err: 'band/nav/canvas missing' };
  const b = band.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const c = canvas.getBoundingClientRect();
  /* Every absolutely-positioned row inside the band. */
  const rows = [...band.children].filter((e) => getComputedStyle(e).position === 'absolute');
  return {
    sab: parseInt(cs.getPropertyValue('--sab')) || 0,
    dashH: parseInt(cs.getPropertyValue('--dash-h')) || 0,
    bandTop: Math.round(b.top), bandBottom: Math.round(b.bottom), bandH: Math.round(b.height),
    navTop: Math.round(n.top), navBottom: Math.round(n.bottom),
    canvasBottom: Math.round(c.bottom),
    vh: window.innerHeight,
    /* How far the highest row pokes out ABOVE the band it belongs to. */
    aboveBand: rows.length
      ? Math.round(Math.max(0, ...rows.map((e) => b.top - e.getBoundingClientRect().top)))
      : 0,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── PORTRAIT: the band has to grow by the indicator, not lose rows over it ── */
  const P = await H.newPlayer(browser, {
    name: 'Installed', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const tab = await portraitGeom(P);
  rec.ok('in a browser tab the band reports no home-indicator inset',
    !tab.err && tab.sab === 0, tab);
  rec.ok('...and every row of the band is inside the band',
    !tab.err && tab.aboveBand === 0, tab);

  await install(P, SAB_PORTRAIT);
  const app = await portraitGeom(P);
  rec.ok('installed, the measured inset reaches the layout as --sab',
    !app.err && app.sab === SAB_PORTRAIT, app);
  /* ═══ THE BUG THE OWNER PHOTOGRAPHED ═══
     The band painted `height:var(--dash-h)` with `padding-bottom:<inset>`
     while its rows were positioned from the bottom WITH that inset added --
     so the identity row's top sat one whole inset above the band, and the
     nav buttons appeared to float on the world.  --dash-h now carries the
     inset (bandFootprint), so the band grows instead of the rows escaping. */
  rec.ok('...the band grows by exactly the indicator, rather than keeping its old height',
    !app.err && app.dashH === tab.dashH + SAB_PORTRAIT, { was: tab.dashH, now: app.dashH });
  rec.ok('...and NO row floats above the band (the "buttons float off the dashboard" bug)',
    !app.err && app.aboveBand === 0, app);
  rec.ok('...the nav buttons sit inside the band, top and bottom',
    !app.err && app.navTop >= app.bandTop && app.navBottom <= app.bandBottom, app);
  /* The world must give the height back, or the band would cover it. */
  rec.ok('...and the world shortens by the same amount, so nothing is covered',
    !app.err && app.canvasBottom === tab.canvasBottom - SAB_PORTRAIT,
    { was: tab.canvasBottom, now: app.canvasBottom });

  /* Taking the install away must restore the tab layout exactly. */
  await install(P, 0);
  const back = await portraitGeom(P);
  rec.ok('...and a browser tab is byte-identical again once the inset is gone',
    !back.err && back.dashH === tab.dashH && back.aboveBand === 0
      && back.canvasBottom === tab.canvasBottom, { tab, back });
  await P.ctx.close().catch(() => {});

  /* ── LANDSCAPE: the dock must not climb onto the panel's content ── */
  const L = await H.newPlayer(browser, {
    name: 'InstalledL', wsPort, webPort, viewport: { width: 844, height: 390 },
    touch: true, dpr: 2, guest: true,
  });
  await H.enterWorld(L);
  await L.page.waitForTimeout(1200);
  await L.page.evaluate(() => window.__broDashPanelBus.open('dashboard'));
  await L.page.waitForTimeout(900);

  const landGeom = (P2) => P2.page.evaluate(() => {
    const sheet = document.querySelector('.bt-land-sheet');
    const dock = document.querySelector('.bt-land-navdock');
    if (!sheet || !dock) return { err: 'sheet/dock missing' };
    const d = dock.getBoundingClientRect();
    /* Anything with its own ink inside the panel that the dock now covers.
       Leaf elements only: a container spanning the whole sheet is not
       "covered", its text is what matters. */
    const covered = [...sheet.querySelectorAll('*')].filter((e) => {
      if (e === dock || dock.contains(e) || e.contains(dock)) return false;
      if (e.children.length) return false;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      return r.bottom > d.top + 1 && r.top < d.bottom;
    });
    return {
      sab: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0,
      dockTop: Math.round(d.top), dockBottom: Math.round(d.bottom), dockH: Math.round(d.height),
      vh: window.innerHeight,
      covered: covered.length,
      sample: covered.slice(0, 4).map((e) => ((e.textContent || '').trim() || e.tagName).slice(0, 16)),
    };
  });

  const lTab = await landGeom(L);
  rec.ok('sideways in a tab, nothing in the panel sits behind the nav dock',
    !lTab.err && lTab.covered === 0, lTab);

  await install(L, SAB_LANDSCAPE);
  const lApp = await landGeom(L);
  /* ═══ THE SECOND BUG THE OWNER PHOTOGRAPHED ═══
     The dock was anchored at `bottom:<inset>`, so installing the app lifted
     it 21px INTO the panel and it covered the three combat cards -- "the
     combat skills are still getting clipped at the bottom".  Owner's own
     fix: "the dashboard buttons can go down some to make more room".  The
     dock now gives most of the inset back (landDockFootprint), and the
     panel reserves the dock's real box rather than a second copy of its
     height. */
  rec.ok('installed sideways, the dock still clears the home indicator',
    !lApp.err && lApp.dockBottom < lApp.vh, lApp);
  /* It cannot stay exactly where a tab puts it -- it still keeps clearance
     from the indicator, so it rises a little.  The point is that it gives
     MOST of the inset back rather than spending all 21px climbing into the
     panel, which is what covered the cards.  Written as "the rise is well
     under the inset" so it states the owner's ask ("go down some") rather
     than pinning today's exact sink. */
  const rise = !lApp.err && !lTab.err ? lTab.dockTop - lApp.dockTop : null;
  rec.ok('...and it gives most of the indicator back instead of climbing onto the panel',
    rise !== null && rise >= 0 && rise <= SAB_LANDSCAPE - 10,
    { tabTop: lTab.dockTop, appTop: lApp.dockTop, rise, inset: SAB_LANDSCAPE });
  rec.ok('...so the combat cards are NOT behind the buttons any more',
    !lApp.err && lApp.covered === 0, lApp);

  await install(L, 0);
  const lBack = await landGeom(L);
  rec.ok('...and sideways in a tab is unchanged once the inset is gone',
    !lBack.err && lBack.covered === 0 && lBack.dockTop === lTab.dockTop, { lTab, lBack });

  await L.ctx.close().catch(() => {});
}
