/* THE CONTROLS TUTORIAL SHOWS EVERY STEP IT CLAIMS TO (v2.3.1803).
 *
 * ControlsTutorial.jsx measures its targets off the live DOM and DROPS any
 * step whose anchors do not resolve — a deliberate v2.3.1205 choice, so that
 * a HUD change degrades to fewer callouts instead of wrong ones.  It is the
 * right default and it has exactly one failure mode: a step can go missing
 * and nothing says so.  Two had.
 *
 * Found while picking selectors for the questline coach (v2.3.1796): the Bag
 * step listed [data-tut="dash-bag"] and .bt-dashboard-nav-button, and NEITHER
 * is in the DOM — nothing passes BottomDashboard's `tut` prop, and the nav
 * moved to .bt-navrail.  The Toolbar step listed [data-tut="dash-more"] with
 * no fallback at all.  So the five-step tour had been running as three.
 *
 * This file is the thing that was missing: it asserts the COUNT and the KEYS,
 * so the next HUD move that orphans a step fails here instead of quietly
 * shortening the tour.
 */
import * as H from './harness.mjs';

const open = async (P) => {
  await P.page.evaluate(() => window.__btCtlTut && window.__btCtlTut.open());
  await P.page.waitForTimeout(800);
};

const survey = (P) => P.page.evaluate(() => ({
  steps: (window.__btCtlTutSteps && window.__btCtlTutSteps()) || null,
  rail: Array.from(document.querySelectorAll('.bt-navrail [aria-label]'))
    .map((n) => n.getAttribute('aria-label')),
}));

export async function run({ browser, wsPort, webPort, rec }) {
  /* A touch viewport: two of the five steps ring joysticks, which are
     display:none under (pointer:fine).  On a desktop context they would be
     legitimately dropped and this file would be asserting the wrong number. */
  const P = await H.newPlayer(browser, {
    name: 'Rookie', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  await open(P);
  const s = await survey(P);
  rec.ok('the tutorial exposes its steps for inspection (guard)', !!(s.steps && s.steps.all), s);
  if (!s.steps) { await P.ctx.close().catch(() => {}); return; }

  /* EVERY step is declared for a reason; none of them is optional on a phone. */
  rec.ok('every declared step survives measurement — none is silently dropped',
    s.steps.live.length === s.steps.all.length,
    { live: s.steps.live, all: s.steps.all, dropped: s.steps.dropped });

  /* Named, so a future drop says WHICH — "4 of 5" would send the next reader
     hunting through the registry. */
  for (const key of s.steps.all) {
    rec.ok(`the "${key}" step has a live anchor`, s.steps.live.includes(key),
      { key, dropped: s.steps.dropped });
  }

  /* THE TWO THAT WERE BROKEN, pinned against the DOM they actually point at
     now.  Without this, someone "tidying" the selectors back to the old names
     would pass the count check above only until the next HUD move. */
  rec.ok('the nav rail is what holds the destinations (guard)',
    s.rail.length > 0, s.rail);
  rec.ok('...and the Bag step rings something really in it',
    !!(s.steps.rects && s.steps.rects.dashboard && s.steps.rects.dashboard.width > 8),
    s.steps.rects && s.steps.rects.dashboard);
  rec.ok('...as does the Toolbar step',
    !!(s.steps.rects && s.steps.rects.toolbar && s.steps.rects.toolbar.width > 8),
    s.steps.rects && s.steps.rects.toolbar);

  await P.page.screenshot({ path: 'tools/qa/mp/out/ctltut.png' });
  await P.ctx.close().catch(() => {});
}
