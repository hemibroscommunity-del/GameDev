/* THE WORLD VIEW FIGURE IS SMALL AGAIN, AND THE GLASS IS ON HIM (v2.3.2141)
 *
 * Owner: "Change the character back to tiny on worldview and center them
 * inside the magnifying glass (that'll be enough)."
 *
 * v2.3.2124 read "the character is too small on the World View" as "make him
 * bigger" and took the local player off the vista's perspective curve
 * (playerLens.scale = 0.9).  That is the sentence's first half undone here:
 * the curve is back, so your own figure shrinks with distance exactly as
 * every peer does, and what is left of the magnifier is the RING -- a
 * findable marker that costs the map none of its depth.
 *
 * The second half is the one that is easy to skip and is most of the work.
 * The glass used to be lifted onto the figure by a flat -26px, which is only
 * ever right at one figure size; with the curve back he is 0.69 of full size
 * at the plateau and 0.12 out toward the rim, and an unscaled lift would hang
 * the glass a whole body above a speck.  So the lift is in figure units,
 * multiplied by the scale he is really drawn at.
 *
 * ═══ WHAT THIS MEASURES, AND WHY IT IS NOT PIXELS ═══
 * Two probes the renderer already publishes, read on the same frames:
 *   __btPlayerDrawn() -- the figure the renderer drew: its foot anchor, the
 *     body's own size, and the CONTAINER scale (added at v2.3.2124 precisely
 *     because its absence had cost two wrong measurements).
 *   __btLensBounds() -- the lens's own Graphics bounds (v2.3.2137), which for
 *     a disc are the disc, hence its centre.
 * The figure's visual middle is derived HERE from the drawn body's own size
 * and the sheet's frame rows, not from the zone's cyUnits -- otherwise this
 * would be the config checking itself, and a wrong constant would sail
 * through.  That derivation is the assertion.
 *
 * Three distances, because the whole bug class is "correct at one size".
 */
import * as H from './harness.mjs';

const TILE = 32;
/* The body cell is 256px tall with the figure standing in rows 23..223 --
   entityRenderer's NPC_FRAME_TOP_Y / NPC_FRAME_FEET_Y, the same numbers the
   name plate is spaced by.  So the visual middle sits (223-23)/2 cell-px above
   the feet, i.e. this fraction of the drawn body's height. */
const MID_FRAC = ((223 - 23) / 2) / 256;

const drawn = (P) => P.page.evaluate(() => (window.__btPlayerDrawn ? window.__btPlayerDrawn() : null));
const lens = (P) => P.page.evaluate(() => (window.__btLensBounds ? window.__btLensBounds() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Speck', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);

  /* Town first, as the control: this is the size the World View is being
     compared against, and reading it from the same probe means "tiny" is a
     comparison rather than a number somebody typed. */
  const inTown = await drawn(P);
  rec.ok('the figure can be measured in town (guard)',
    !!inTown && inTown.scale > 0 && inTown.height > 0, inTown);

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
    rec.skip('the World View figure is small again', 'no exit table');
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
    rec.skip('the World View figure is small again', `stuck in ${zone}`);
    await P.ctx.close().catch(() => {}); return;
  }

  /* The zone must no longer freeze the local figure at a size of its own --
     that key is what "back to tiny" removes, and a scenario that only
     measured the figure would pass on a config that still carried it if the
     curve happened to land near the frozen value. */
  const cfg = await P.page.evaluate(() => ((window.__btZones || {}).worldview || {}).playerLens || null);
  rec.ok('the World View still declares a glass', !!cfg && cfg.r > 0, cfg);
  rec.ok('...but no longer freezes the figure at a size of its own',
    !!cfg && cfg.scale === undefined,
    { playerLens: cfg, note: 'playerLens.scale = 0.9 was the v2.3.2124 opt-out of the perspective curve' });
  rec.ok('...and its lift is in figure units, so it can scale with him',
    !!cfg && typeof cfg.cyUnits === 'number' && cfg.cyUnits < 0, cfg);

  const seen = [];
  /* Three points out from the map's centre: the plateau, mid-vista, and well
     out toward the rim where the curve bottoms out. */
  for (const f of [0.5, 0.62, 0.9]) {
    await P.page.evaluate((ff) => {
      const S = window._gameState.current;
      const Z = (window.__btZones || {}).worldview;
      if (Z) { S.player.x = Z.w * 32 * ff; S.player.y = Z.h * 32 * ff; }
    }, f);
    await P.page.waitForTimeout(800);
    const d = await drawn(P);
    const b = await lens(P);
    if (!d || !b) { seen.push({ f, d, b }); continue; }
    const midY = d.footY - d.height * d.scale * MID_FRAC;   /* the figure's own middle */
    seen.push({ f, scale: +d.scale.toFixed(3), footY: Math.round(d.footY),
      figureMid: Math.round(midY), lensCy: b.cy, off: Math.round(b.cy - midY),
      lensW: b.w, drawnH: Math.round(d.height * d.scale) });
  }
  console.log('    ' + JSON.stringify(seen));
  rec.ok('the figure and the glass can both be measured at every distance (guard)',
    seen.length === 3 && seen.every((s) => typeof s.off === 'number'), seen);

  /* ═══ BACK TO TINY ═══
     The curve runs 0.55 at the plateau to 0.03 at the rim (times the 1.25
     size mult), so every one of these must be well under the town figure --
     and the frozen 0.9 x 1.25 = 1.125 the lens used to force is ABOVE the
     town reading, which is what made him look un-shrunk. */
  const townScale = inTown ? inTown.scale : 0;
  rec.ok('your figure is smaller on the World View than in town, at every distance',
    seen.every((s) => s.scale > 0 && s.scale < townScale * 0.75),
    { townScale, seen: seen.map((s) => s.scale) });
  /* ...and it keeps SHRINKING with distance, which is the vista's depth
     itself.  A figure that is merely small but constant would pass the line
     above while the curve was still being overridden by a smaller constant. */
  rec.ok('...and it keeps shrinking the further out you stand',
    seen[0].scale > seen[1].scale && seen[1].scale > seen[2].scale,
    seen.map((s) => s.scale));

  /* ═══ CENTERED IN THE GLASS ═══
     The tolerance is in FIGURE terms, not pixels: within a tenth of the
     figure's own drawn height at each distance.  A fixed pixel tolerance
     would be meaninglessly tight on the 14px speck and meaninglessly loose on
     the 79px plateau figure, and the bug being pinned is exactly a lift that
     did not scale.  The old flat -26 measures ~15px high on the plateau and
     ~20px high at the rim, where the whole figure is 14px tall. */
  for (const s of seen) {
    const tol = Math.max(4, s.drawnH * 0.1);
    rec.ok(`the glass is centred on the figure at ${Math.round(s.f * 100)}% out`,
      Math.abs(s.off) <= tol, { ...s, tol: Math.round(tol) });
  }

  /* ═══ THE RING DOES NOT SHRINK WITH HIM ═══
     This is the half of the feature that survives from v2.3.2124: at the rim
     the figure is a dozen pixels and the ring is still ~120 across, which is
     what keeps "where am I" answerable there.  A glass that shrank with the
     curve would vanish exactly where it is needed most. */
  const widths = seen.map((s) => s.lensW);
  rec.ok('the glass itself stays full size while the figure shrinks',
    widths.every((w) => w > 100 && w < 140), { widths, figureHeights: seen.map((s) => s.drawnH) });

  /* A shot of the thing itself, cropped ON the glass rather than on the
     screen: the World View's camera clamps at the map edge and the dashboard
     owns the bottom half, so a full-frame shot of a 14px figure inside a
     120px ring is a picture of the UI.  The crop is derived from the same
     camera transform figureBox uses. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const Z = (window.__btZones || {}).worldview;
    if (Z) { S.player.x = Z.w * 32 * 0.62; S.player.y = Z.h * 32 * 0.62; }
  });
  await P.page.waitForTimeout(900);
  const clip = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    const cx = r.left + (S.player.x - S.camera.x) * sx;
    const cy = r.top + (S.player.y - S.camera.y) * sy;
    const half = 110;
    return { x: Math.max(0, Math.round(cx - half)), y: Math.max(0, Math.round(cy - half)),
      width: half * 2, height: half * 2 };
  });
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/wvglass.png', clip });
  await P.ctx.close().catch(() => {});
}
