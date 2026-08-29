/* THE MAGNIFIER DRAWS A LENS, NOT A LINE ACROSS THE MAP (v2.3.2137)
 *
 * Owner: "On the worldview there shouldn't be two line guiding character
 * where to go.  Just keep the beaded line get rid of straight line for quest
 * guide."
 *
 * There WERE two lines, and the second was never a quest guide.  The World
 * View magnifier (v2.3.2124) finishes with a highlight arc:
 *
 *     gfx.arc(x, y, rr - 5, PI*1.05, PI*1.45);  gfx.stroke(...)
 *
 * `arc()` continues the CURRENT path.  With no point set it began at the
 * path's origin, so that stroke drew the highlight AND a straight segment
 * reaching it from world (0,0) -- the map's top-left corner.  Across a 32x32
 * vista that is a hairline most of the way over the World View, ending
 * exactly on the lens ring: it reads as a second guide pointing off past
 * town.  A `moveTo` to the arc's own start point is the whole fix.
 *
 * ═══ WHY THIS TEST IS GEOMETRY AND NOT PIXELS ═══
 * Three weaker approaches were tried and are recorded so nobody re-walks
 * them:
 *   - A scene-graph scan finds nothing: the lens had no node of its own, it
 *     was shapes inside the shared overlayGfx.
 *   - A moveTo/lineTo probe finds nothing either -- `arc` builds that
 *     connecting segment itself and never calls lineTo.
 *   - A with/without FRAME DIFF (the technique mp-portalbeam uses for the
 *     beams) cannot separate it here.  The World View animates enough --
 *     water, portal pulses, the lens's own breath -- that ~27% of the frame
 *     changes between any two shots.  Measured on this very bug: the metric
 *     read 245 with the stray segment and 242 without.  No separation.
 *
 * So v2.3.2137 gave the lens its OWN Graphics.  A disc's bounds are the disc,
 * and the question becomes one number that cannot flake: is what the lens
 * drew the size of the glass, or does it reach the map's corner?
 */
import * as H from './harness.mjs';

const TILE = 32;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Glass', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);

  /* Out to the World View — the only zone that declares a playerLens. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(2000);
  const exit = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null;
  });
  if (!exit) {
    rec.skip('the magnifier draws a lens, not a line', 'no exit table');
    await P.ctx.close().catch(() => {}); return;
  }
  await P.page.evaluate(({ px, py }) => {
    const S = window._gameState.current; S.player.x = px; S.player.y = py;
  }, { px: exit.tx * TILE + 16, py: exit.ty * TILE + 16 });
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(2200);

  const zone = await H.readState(P, (S) => S.currentZone);
  if (zone !== 'worldview') {
    rec.skip('the magnifier draws a lens, not a line', `stuck in ${zone}`);
    await P.ctx.close().catch(() => {}); return;
  }
  const lens = await P.page.evaluate(() => ((window.__btZones || {}).worldview || {}).playerLens || null);
  rec.ok('the World View declares a magnifier (guard)', !!lens, { zone, lens });

  /* Stand well away from the map's top-left corner, so a segment reaching it
     has a long way to go and cannot be mistaken for the glass. */
  const at = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const Z = (window.__btZones || {}).worldview;
    if (Z) { S.player.x = Z.w * 32 * 0.62; S.player.y = Z.h * 32 * 0.62; }
    return { x: Math.round(S.player.x), y: Math.round(S.player.y) };
  });
  await P.page.waitForTimeout(1400);

  const b = await P.page.evaluate(() => (window.__btLensBounds ? window.__btLensBounds() : null));
  console.log('    lens bounds: ' + JSON.stringify(b) + '  player: ' + JSON.stringify(at));

  if (!b) {
    rec.skip('the magnifier draws a lens, not a line', 'no lens bounds published');
    await P.ctx.close().catch(() => {}); return;
  }
  rec.ok('the magnifier actually draws something', b.w > 0 && b.h > 0, b);

  /* ═══ THE CLAIM ═══
     The glass is r=58 in the World View's config, breathing +/-3%, so what it
     draws is ~120 world px across.  200 is generous for the rim's stroke.
     The stray segment ran from the glass to world (0,0) with the player at
     ~635,635 — so with the bug these came back near 700, not near 120. */
  const R = (lens && typeof lens.r === 'number') ? lens.r : 58;
  const ceiling = Math.max(200, R * 3);
  rec.ok('...and what it draws is the size of the glass, not a line across the map',
    b.w < ceiling && b.h < ceiling,
    { w: b.w, h: b.h, ceiling, lensR: R, note: 'the stray arc segment measured ~700 here' });

  /* Named separately because it is the exact shape of the bug: the segment
     reached world (0,0), so the lens's own bounds started at the map corner
     while the player stood two-thirds of the way across it. */
  rec.ok('...and it does not reach back to the map corner',
    b.x > 60 && b.y > 60, { x: b.x, y: b.y, player: at });

  /* The frame this is all about, kept beside the other scenario shots: one
     guide on the World View, the beaded road, and a glass that is a glass. */
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/wvlens.png' });

  await P.ctx.close().catch(() => {});
}
