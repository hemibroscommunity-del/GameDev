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

  /* ═══ v2.3.2284: TAP THE CARD TO GO ON, TAP THE BACKDROP AND NOTHING ═══
     Owner: "allow that tap to proceed (or close) for dialogue window behavior
     too". Both polarities, because the backdrop half is a settled v2.3.1235
     owner correction and the card half must not quietly re-open it. */
  const stepNow = (P) => P.page.evaluate(() => {
    const el = [...document.querySelectorAll('div')]
      .find((d) => d.children.length === 0 && /^Step \d+ of \d+$/.test((d.textContent || '').trim()));
    return el ? Number((el.textContent.match(/Step (\d+)/) || [])[1]) : null;
  });
  const cardBox = (P) => P.page.evaluate(() => {
    const el = [...document.querySelectorAll('div')]
      .find((d) => d.children.length === 0 && /^Step \d+ of \d+$/.test((d.textContent || '').trim()));
    const card = el && el.closest('div[style*="position: absolute"]');
    const r = (card || el).getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 8), t: Math.round(r.top), l: Math.round(r.left) };
  });

  const before = await stepNow(P);
  const cb = await cardBox(P);
  rec.ok('the tour reports which step it is on (guard)', before != null && !!cb, { before, cb });
  if (before != null && cb) {
    await P.page.mouse.click(cb.x, cb.y);
    await P.page.waitForTimeout(350);
    const afterCard = await stepNow(P);
    rec.ok('tapping the coach card advances the step', afterCard === before + 1,
      { before, afterCard });

    /* 60px outside the card's left edge is backdrop -- and the backdrop is
       also where the spotlit control lives, which is why it must stay inert. */
    const bx = Math.max(4, cb.l - 60);
    await P.page.mouse.click(bx, cb.y);
    await P.page.waitForTimeout(350);
    const afterBack = await stepNow(P);
    rec.ok('tapping the dim backdrop does NOT advance or close — the spotlit '
      + 'control is under it', afterBack === afterCard, { afterCard, afterBack });

    /* The assertion that would have caught a missing stopPropagation: without
       it, Back steps back and the card handler immediately steps forward. */
    const tappedBack = await P.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Back');
      if (!b) return false; b.click(); return true;
    });
    await P.page.waitForTimeout(350);
    const afterBackBtn = await stepNow(P);
    rec.ok('Back really steps back — the card tap does not double-fire through it',
      tappedBack && afterBackBtn === afterCard - 1, { tappedBack, afterCard, afterBackBtn });
  }

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
