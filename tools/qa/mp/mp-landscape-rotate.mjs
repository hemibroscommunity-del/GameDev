/* ROTATION IS A CLEAN HANDOFF, BOTH WAYS (v2.3.2152)
 *
 * Owner: "Landscape would be an optional view.  You can play in portrait or
 * landscape."  The word doing the work is OR — one session moves between
 * them, live, and each side must arrive intact:
 *
 *  - portrait -> landscape: the band drops to the identity row, the canvas
 *    takes the freed height, the orientation stamp flips.
 *  - landscape (Bag open) -> portrait: the sheet CLOSES on the flip — the
 *    portrait bottom sheet and the landscape side sheet share no geometry,
 *    so there is no defined mid-state to leave a panel in.
 *  - back in portrait, the BAR-height invariant still holds: opening a
 *    destination does NOT resize the canvas.  This is the assertion that
 *    would catch the landscape plumbing leaking into portrait — the sheet
 *    input to bandFootprint must be ignored there.
 *  - and through all of it, the canvas settles: no watchdog warnings (a
 *    resize()/watchdog disagreement heals in a war, twice a second,
 *    forever) and no realloc churn once settled.
 */
import * as H from './harness.mjs';

const geom = (P) => P.page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const cs = getComputedStyle(document.documentElement);
  return {
    canvasW: Math.round(r.width), canvasH: Math.round(r.height),
    backingW: c.width, backingH: c.height,
    dashH: parseInt(cs.getPropertyValue('--dash-h')) || 0,
    orient: document.documentElement.getAttribute('data-orient'),
    mode: (window.__broDashPanelBus && window.__broDashPanelBus.state.mode) || null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Twirl', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 }, dpr: 2,
  });
  /* every watchdog heal announces itself — collect them all */
  const warns = [];
  P.page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().includes('[canvas-watchdog]')) warns.push(m.text());
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const p0 = await geom(P);
  console.log('    portrait: ' + JSON.stringify(p0));
  rec.ok('portrait boots on the portrait numbers (band 243, canvas 390x615)',
    p0.dashH === 243 && p0.canvasW === 390 && p0.canvasH === 615 && p0.orient === 'portrait', p0);

  /* ── ROTATE OUT ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1200);
  const l0 = await geom(P);
  console.log('    landscape: ' + JSON.stringify(l0));
  /* v2.3.2163 (owner: "remove that whole bottom length bar"): sideways
     there is NO band — --dash-h is just the safe-area inset (0 headless)
     and the canvas takes the whole 390. */
  rec.ok('rotating flips the stamp and drops the bar entirely (dash-h 0, canvas 844x390)',
    l0.orient === 'landscape' && l0.dashH === 0 && l0.canvasW === 844 && l0.canvasH === 390, l0);

  /* open the Bag, then rotate back with it open */
  await P.page.evaluate(() => window.__broDashPanelBus.open('bag'));
  await P.page.waitForTimeout(700);
  const lOpen = await geom(P);
  rec.ok('the Bag opens sideways (canvas yields width) — precondition for the flip test',
    lOpen.mode === 'expanded' && lOpen.canvasW < 844, lOpen);

  /* ── ROTATE BACK, SHEET OPEN ── */
  await P.page.setViewportSize({ width: 390, height: 844 });
  await P.page.waitForTimeout(1200);
  const p1 = await geom(P);
  console.log('    back to portrait: ' + JSON.stringify(p1));
  rec.ok('the open sheet CLOSED on the flip (no defined mid-state to keep it in)',
    p1.mode === 'bar', p1);
  rec.ok('...and portrait geometry came back exactly (band 243, canvas 390x615)',
    p1.dashH === 243 && p1.canvasW === 390 && p1.canvasH === 615 && p1.orient === 'portrait', p1);

  /* ── THE INVARIANT DID NOT LEAK ── */
  const before = await geom(P);
  await P.page.evaluate(() => window.__broDashPanelBus.open('bag'));
  await P.page.waitForTimeout(700);
  const during = await geom(P);
  rec.ok('back in portrait, opening a destination does NOT resize the canvas (the BAR-height invariant, unleaked)',
    during.backingW === before.backingW && during.backingH === before.backingH
      && during.dashH === before.dashH, { before, during });
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);

  /* ── SETTLED, NOT AT WAR ──
     A single watchdog heal DURING a rotation is legitimate: setViewportSize
     can land between the resize event and the next paint, and healing that
     within 500ms is the watchdog's whole job (it fired once in exactly that
     window on one run of this scenario, and never on another — a race, not
     a bug).  The failure mode worth pinning is the WAR: resize() and the
     watchdog disagreeing about the formula and re-healing forever.  So the
     rotation's heals are logged for the record, and the assertions are that
     the canvas stops moving and the warnings STOP once the geometry has
     settled. */
  console.log('    rotation heals (informational): ' + JSON.stringify(warns));
  const healsAfterRotations = warns.length;
  const s1 = await geom(P);
  await P.page.waitForTimeout(2600);   /* > 5 watchdog ticks */
  const s2 = await geom(P);
  rec.ok('the canvas is settled — no realloc churn across five watchdog ticks',
    s1.backingW === s2.backingW && s1.backingH === s2.backingH, { s1, s2 });
  rec.ok('and no NEW watchdog heals arrive once settled (a war would fire every 500ms)',
    warns.length === healsAfterRotations,
    { duringRotations: healsAfterRotations, afterSettling: warns.length - healsAfterRotations });
  rec.ok('...with at most one heal across the whole rotation sequence (a race, never a pattern)',
    healsAfterRotations <= 1, warns);

  await P.ctx.close().catch(() => {});
}
