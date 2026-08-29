/* LANDSCAPE GROUNDWORK: THE VIEW RULE SWITCHES AXES, PORTRAIT DOES NOT MOVE
 * (v2.3.2151)
 *
 * Owner: "Landscape would be an optional view.  You can play in portrait or
 * landscape."
 *
 * This scenario guards the two halves of that sentence in the order they
 * matter:
 *
 * ═══ 1. PORTRAIT IS PINNED, at three device classes ═══
 * Portrait is the primary platform and every landscape change must be inert
 * there.  These are not tolerance assertions — they are the exact numbers the
 * shipped arithmetic produces today (bandFootprint == the old barHeight/fold
 * path, worldViewport's portrait branch byte-identical), so ANY drift is a
 * regression this file names before a player does.  Three widths because the
 * geometry is width-driven: a bug that spares 390 can still bite 375 or 430.
 *
 * ═══ 2. LANDSCAPE GETS THE HEIGHT-AXIS RULE ═══
 * Until the landscape dashboard ships, a landscape phone still carries the
 * portrait band, the canvas is ~143px tall, and the new rule bottoms out at
 * MIN_SCALE 0.5 — view ~1688x286.  The assertion is deliberately about the
 * RULE, not the interim numbers: H must come from cssH/scale with the scale
 * floored at 0.5, and the visible AREA must not exceed portrait's (fairness:
 * nobody buys spotting range by rotating).  When the 48px landscape band
 * lands, the same assertions hold with scale .742 and view 1138x480 — this
 * file will not need to change.
 *
 * ═══ 3. THE HARNESS DEFAULT STAYS PORTRAIT ═══
 * The QA default viewport is 1000x780 — window-landscape.  It trips the
 * desktop shell, whose play area is aspect-locked to a portrait phone, so
 * the CANVAS (the thing worldViewport reads) is portrait.  If this ever
 * flips, every scenario that relies on the default viewport starts running
 * a different game; assert it here so the flip is loud.
 */
import * as H from './harness.mjs';

const geom = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const cs = getComputedStyle(document.documentElement);
  return {
    canvasW: Math.round(r.width), canvasH: Math.round(r.height),
    dashH: parseInt(cs.getPropertyValue('--dash-h')) || 0,
    colsH: parseInt(cs.getPropertyValue('--cols-h')) || 0,
    viewW: Math.round(S._viewW || 0), viewH: Math.round(S._viewH || 0),
    scale: +(S._worldScaleX || 0).toFixed(4),
    orient: document.documentElement.getAttribute('data-orient'),
  };
});

/* The portrait pins: {viewport} -> the numbers resize() must produce.
   dashH from bandFootprint(vw,vh,false); canvas = vh - dashH + 14. */
const PORTRAIT_PINS = [
  { vp: { width: 390, height: 844 }, dashH: 243, canvasH: 615 },
  { vp: { width: 375, height: 812 }, dashH: 239, canvasH: 587 },
  { vp: { width: 430, height: 932 }, dashH: 257, canvasH: 689 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. the portrait pins ── */
  for (const pin of PORTRAIT_PINS) {
    const P = await H.newPlayer(browser, {
      name: 'Pin' + pin.vp.width, wsPort, webPort, touch: true, viewport: pin.vp,
    });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    const g = await geom(P);
    console.log(`    portrait ${pin.vp.width}x${pin.vp.height}: ${JSON.stringify(g)}`);
    rec.ok(`portrait ${pin.vp.width}w: the band is exactly ${pin.dashH}px`,
      g.dashH === pin.dashH, g);
    rec.ok(`...the canvas is exactly ${pin.vp.width}x${pin.canvasH}`,
      g.canvasW === pin.vp.width && g.canvasH === pin.canvasH, g);
    rec.ok('...the world view is 585 wide (the portrait reference, unmoved)',
      g.viewW === 585, g);
    rec.ok('...and the shell is stamped portrait', g.orient === 'portrait', g);
    await P.ctx.close().catch(() => {});
  }

  /* ── 2. landscape runs the height-axis rule ── */
  const L = await H.newPlayer(browser, {
    name: 'Wide', wsPort, webPort, touch: true, viewport: { width: 844, height: 390 },
  });
  await H.enterWorld(L);
  await L.page.waitForTimeout(2500);
  const g = await geom(L);
  console.log('    landscape 844x390: ' + JSON.stringify(g));
  rec.ok('landscape: the shell is stamped landscape', g.orient === 'landscape', g);
  /* The rule, not the interim numbers: scale = max(0.5, canvasH/480). */
  const wantScale = Math.max(0.5, g.canvasH / 480);
  rec.ok('...the scale follows max(0.5, canvasH/480)',
    Math.abs(g.scale - wantScale) < 0.005, { got: g.scale, want: +wantScale.toFixed(4) });
  rec.ok('...so the view derives from the SHORT axis, not the long one',
    Math.abs(g.viewH - Math.round(g.canvasH / g.scale)) <= 1
      && Math.abs(g.viewW - Math.round(g.canvasW / g.scale)) <= 1, g);
  /* Fairness: rotating must never buy MORE world than the portrait
     reference sees (585 x ~922 = ~539K px^2 at the 390x844 target). */
  const portraitArea = 585 * 922;
  rec.ok('...and the visible AREA does not exceed portrait\'s (no spotting advantage)',
    g.viewW * g.viewH <= portraitArea * 1.05,
    { area: g.viewW * g.viewH, portraitArea });
  await L.ctx.close().catch(() => {});

  /* ── 3. the harness default resolves portrait ── */
  const D = await H.newPlayer(browser, { name: 'Deft', wsPort, webPort });
  await H.enterWorld(D);
  await D.page.waitForTimeout(2500);
  const gd = await geom(D);
  console.log('    default 1000x780: ' + JSON.stringify(gd));
  rec.ok('the QA default viewport still resolves to a PORTRAIT canvas',
    gd.canvasH > gd.canvasW && gd.orient === 'portrait' && gd.viewW === 585, gd);
  await D.ctx.close().catch(() => {});
}
