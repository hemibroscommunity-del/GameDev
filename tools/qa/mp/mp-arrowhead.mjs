/* AN ARROW LOSES ITS HEAD WHEN IT ARRIVES, NOT WHEN IT IS SPENT (v2.3.1879).
 *
 * Owner: "the arrowhead is missing mid flight.  It should only get stuck in
 * the monster without the arrowhead."
 *
 * A bow arrow passes through three states, and only the last two are arrival:
 *
 *   flying   — under way.  Head.
 *   planting — SPENT: it reached the screen edge or its 675px range and is
 *              arcing ~26px down through open air before it lands
 *              (projectiles.js).  It is airborne for that whole drop, in
 *              plain view, stuck in nothing.  Head.
 *   planted  — landed, held ~2s.  No head, which is the v2.3.1765 ask
 *              ("the arrowhead should be stuck in the material").
 *              `stuckIn` — the bow special embedded in a monster, v2.3.1426 —
 *              is the same case.
 *
 * v2.3.1765 gated the head on `_stuckPose`, which is all THREE, because for
 * the motion trail and the aim-bend those three really do behave alike.  So a
 * spent arrow fell out of the sky with its tip cut off, and that is the "mid
 * flight" the owner saw: photographed before the fix, a headless green shaft
 * hanging in the middle of the ground texture.
 *
 * The middle case is the whole point of this file, so all three are asserted:
 * the two on either side of it are what say the fix is SURGICAL rather than
 * "heads are back on everything".  Run against the pre-fix build, exactly one
 * of these three fails.
 *
 * Read through arrowProbe rather than off the screen, for v2.3.1765's reason:
 * a pixel search cannot tell a buried head from an arrow that was never drawn,
 * and that is the distinction this is about.  (The reverse blindness is real
 * too and is covered elsewhere — a counter cannot see a head that the ART
 * buried, which is what tools/qa/qa-arrow-art.mjs exists for after v2.3.1876.)
 *
 * The arrow is injected rather than fired: what is under test is the draw, not
 * a bow's decision to shoot.  It is re-injected on an interval because the
 * tick reaps an injected arrow within a few hundred ms.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Fletcher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* mp-proj's fixture — every field the tick reads is set EXPLICITLY.  An
     absent `_isStaffProj` defaults the arrow into the magic-bolt branch and
     draws no arrow at all, which cost mp-proj a round of "the probe reports
     zero arrows"; an absent `_renderX` is nulled by the tick and skipped. */
  const pin = (mode) => P.page.evaluate((m) => {
    try { clearInterval(window.__pin); } catch (e) {}
    window.__pin = setInterval(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return;
      const px = S.player.x + 46, py = S.player.y - 34;
      const a = {
        x: px, y: py, _renderX: px, _renderY: py,
        ang: 0, life: 60, dist: 46, _released: true,
        planted: false, planting: false, stuckIn: false, plantedAt: Date.now(),
        _plantX: px, _plantY: py, _plantStartY: py,
        _isStaffProj: false, isSpecial: false, ice: false,
      };
      if (m === 'planting') { a.planting = true; a._fallVy = 0; }
      if (m === 'planted') { a.planted = true; }
      S.arrows = [a];
    }, 16);
  }, mode);

  const read = async (mode) => {
    await pin(mode);
    await P.page.waitForTimeout(700);
    return P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.arrowProbe
      ? window._pixiRenderer.arrowProbe() : null));
  };

  const flying = await read('flying');
  /* GUARD: if nothing is being painted, every head assertion below is
     vacuously satisfiable by an empty projectile layer. */
  rec.ok('the fixture actually paints an arrow (guard)', !!flying && flying.arrows > 0, flying);
  if (!flying || !flying.arrows) { await P.ctx.close().catch(() => {}); return; }

  rec.ok('an arrow in flight keeps its head', flying.heads > 0, flying);

  const falling = await read('planting');
  rec.ok('a SPENT arrow still falling through the air keeps its head',
    !!falling && falling.arrows > 0 && falling.heads > 0, falling);

  const landed = await read('planted');
  rec.ok('...and only a LANDED arrow loses it', !!landed && landed.arrows > 0 && landed.heads === 0, landed);

  await P.page.evaluate(() => { try { clearInterval(window.__pin); } catch (e) {} });
  /* ── v2.3.1915: A SPENT ARROW DRAWS UNDER THE PLAYER ──
     Owner: "For arrows on the ground make the character in the layer in front
     of them."

     Asserted on the LAYER each pool hangs off, not on pixels: at this size a
     screenshot cannot tell an arrow behind the boots from one in front, and
     the layer is the fact the fix turns on. WORLD_LAYER_NAMES is ordered, so
     "below the player" is checkable as an index rather than trusted. */
  const order = await P.page.evaluate(() => (window.__btLayerOrder || null));
  const inAir = await read('flying');
  rec.ok('an arrow in FLIGHT is still drawn above the player',
    !!inAir && inAir.ground === 0, inAir);
  const landed2 = await read('planted');
  console.log('    planted: ' + JSON.stringify(landed2));
  rec.ok('a PLANTED arrow is drawn from the ground pool',
    !!landed2 && landed2.ground > 0, landed2);
  rec.ok('...and that pool hangs off a layer BELOW the player',
    !!order && !!landed2 && order.indexOf(landed2.groundLayer) >= 0
      && order.indexOf(landed2.groundLayer) < order.indexOf('player'),
    { order, landed: landed2 });
  rec.ok('...while the flying pool stays above it',
    !!order && !!landed2 && order.indexOf(landed2.flyingLayer) > order.indexOf('player'),
    { order, landed: landed2 });

  await P.ctx.close().catch(() => {});
}
