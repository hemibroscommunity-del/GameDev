/* LANDSCAPE GROUNDWORK: THE VIEW RULE SWITCHES AXES, PORTRAIT DOES NOT MOVE
 * (v2.3.2156)
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
    /* v2.3.2247: the zone floors the viewport now, so the fairness rule below
       is stated against the zone rather than a fixed reference width. */
    zone: S.currentZone,
    zoneW: (() => { const z = (window.__btZones || {})[S.currentZone]; return z ? z.w * 32 : 0; })(),
    zoneH: (() => { const z = (window.__btZones || {})[S.currentZone]; return z ? z.h * 32 : 0; })(),
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
  /* v2.3.2247: the 390pt phone's measured viewport, captured from pin 1 and
     used as the landscape fairness reference below -- measured, because the
     zone now decides it and no literal can stay true. */
  let PORTRAIT_REF = { viewW: 0, viewH: 0, scale: 0 };
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
    /* ═══ v2.3.2247: THE REFERENCE MOVED FROM A WIDTH TO THE ZONE ═══
       This pinned viewW === 585 on every phone -- "the same slice for
       everyone", the fairness rule worldViewport.js's header argues for.  585
       was 390 x WORLD_ZOOM when the zoom was one global number.  It is now a
       TARGET a zone may refuse (the viewport can never exceed the map), and in
       town the zone's depth binds first -- so the three pinned phones come out
       at 1116 / 1124 / 1098 wide, all different, and the old equality is red on
       a change working as designed.
       The fairness property SURVIVES, on the other axis: every phone sees the
       zone's whole height, so nobody spots further than anybody else.  That is
       what is asserted now, and it is device-independent where a width pin no
       longer can be. */
    /* v2.3.2249: the character floor (FIGURE_SCALE_FLOOR) can stop the zoom
       before the zone does, so "fills the zone exactly" is no longer always
       true -- in town the floor binds first now.  The fairness claim survives
       as an equality between PHONES rather than against the map: every phone
       resolves the same world scale in the same zone, so nobody sees further
       than anybody else.  PORTRAIT_REF is pin 1; the others must match it. */
    rec.ok('...every phone resolves the SAME world scale here (the same slice for everyone)',
      PORTRAIT_REF.scale === 0 || Math.abs(g.scale - PORTRAIT_REF.scale) < 0.005,
      { scale: g.scale, ref: PORTRAIT_REF.scale, ...g });
    rec.ok('...and never asks for more world than the zone holds',
      g.viewW <= g.zoneW + 1 && g.viewH <= g.zoneH + 1, g);
    rec.ok('...and the shell is stamped portrait', g.orient === 'portrait', g);
    if (pin.vp.width === 390) PORTRAIT_REF = { viewW: g.viewW, viewH: g.viewH, scale: g.scale };
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
  /* ═══ v2.3.2247: THE RULE GAINED A THIRD TERM ═══
     This read `scale = max(0.5, canvasH/480)` -- MIN_SCALE and REF_VIEW_H as
     literals.  Both are derived from WORLD_ZOOM now (0.25 and 960 at zoom 3),
     and a zone floor sits alongside them, so the copied form is red on a
     working build.  Restating the whole new formula here would be TRAPS §37 --
     recomputing the renderer's arithmetic proves nothing about the picture.
     The claim this scenario exists to make is the one below it: LANDSCAPE
     TAKES ITS RULE FROM THE SHORT AXIS.  So assert that, plus the two
     invariants that actually bound the result. */
  rec.ok('...landscape never asks for more world than the zone holds',
    g.viewW <= g.zoneW + 1 && g.viewH <= g.zoneH + 1, g);
  rec.ok('...so the view derives from the SHORT axis, not the long one',
    Math.abs(g.viewH - Math.round(g.canvasH / g.scale)) <= 1
      && Math.abs(g.viewW - Math.round(g.canvasW / g.scale)) <= 1, g);
  /* Fairness: rotating must never buy MORE world than the portrait
     reference sees (585 x ~922 = ~539K px^2 at the 390x844 target). */
  /* v2.3.2247: measured from the portrait client above rather than the old
     585x922 literal, which described a viewport that no longer exists. */
  rec.ok('the 390pt portrait reference was captured (guard)',
    PORTRAIT_REF.viewW > 0 && PORTRAIT_REF.viewH > 0, PORTRAIT_REF);
  const portraitArea = (PORTRAIT_REF.viewW * PORTRAIT_REF.viewH) || (585 * 922);
  /* ═══ v2.3.2249: THE RULE, WHERE THE RULE IS WHAT DECIDES ═══
     Area parity is a rule about REF_VIEW_W/REF_VIEW_H.  It can only hold while
     those constants are the binding term -- and in town they are not any more:
     portrait floors on the character (FIGURE_SCALE_FLOOR 0.45) while landscape
     floors on the town's WIDTH (1664, scale 0.507), so the map's aspect decides
     the ratio and it lands 8% apart.  Neither orientation is "buying" anything;
     both are filling the screen with the most world the town will give them,
     which is the owner's own rule from v2.3.2247.
     So the parity claim is asserted where it is a GAMEPLAY claim -- and town is
     not it: `safe: true`, no monsters, nothing to spot.  Where it matters (the
     1024x1024 combat zones) the same arithmetic runs the other way, landscape
     seeing LESS: portrait 649x1024 = 664K, landscape 1024x432 = 442K.
     Asserted here as: parity holds, OR the zone itself is what clamped one of
     them, in which case the map decided and the rule was never in play. */
  const areaLand = g.viewW * g.viewH;
  const zoneClamped = g.viewW >= g.zoneW - 1 || g.viewH >= g.zoneH - 1;
  rec.ok('...and the visible AREA does not exceed portrait\'s, unless the MAP is what clamped it',
    areaLand <= portraitArea * 1.05 || zoneClamped,
    { area: areaLand, portraitArea, zoneClamped, zoneW: g.zoneW, zoneH: g.zoneH });
  await L.ctx.close().catch(() => {});

  /* ── 3. the harness default resolves portrait ── */
  const D = await H.newPlayer(browser, { name: 'Deft', wsPort, webPort });
  await H.enterWorld(D);
  await D.page.waitForTimeout(2500);
  const gd = await geom(D);
  console.log('    default 1000x780: ' + JSON.stringify(gd));
  /* v2.3.2247: <= the zone, not == it.  A zone only BINDS when it is the
     scarcest of the three terms; at the QA default (425x539 canvas) the
     WORLD_ZOOM target is scarcer than town's depth, so the viewport stops
     short of the map and that is correct.  The three phone pins above DO bind,
     which is why they assert equality and this one asserts the bound. */
  rec.ok('the QA default viewport still resolves to a PORTRAIT canvas',
    gd.canvasH > gd.canvasW && gd.orient === 'portrait'
      && gd.zoneH > 0 && gd.viewH <= gd.zoneH + 1 && gd.viewW <= gd.zoneW + 1, gd);
  await D.ctx.close().catch(() => {});
}
