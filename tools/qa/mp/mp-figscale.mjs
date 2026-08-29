/* IS THE CHARACTER SMALLER OUTSIDE TOWN? (probe)
 *
 * Tee, after the demo: "The charter is too small when he leaves town to
 * complete a mission; someone with visual impairment might struggle with it."
 *
 * The renderer says that should be impossible: worldContainer.scale is
 * `cssW / viewW`, and viewW is `cssW * WORLD_ZOOM` with WORLD_ZOOM a single
 * constant (data/constants.js), so the world scale is 1/1.5 everywhere and
 * does not know which zone it is in.  Either the report is about something
 * else -- the character reading small against open ground where town gives it
 * buildings and NPCs for scale -- or there is a clamp doing something the
 * constant does not describe.
 *
 * So: measure the DRAWN FIGURE in town and in a spoke at the same viewport,
 * on the same character, and compare.  H.figureBox reads the sprite off the
 * canvas, which is the only measurement that answers what a player sees.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

const scale = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return {
    zone: S.currentZone,
    sx: S._worldScaleX || null,
    sy: S._worldScaleY || null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Yardstick', wsPort, webPort, touch: true,
    viewport: { width: 390, height: 844 }, dpr: 2,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const inTown = await scale(P);
  const boxTown = await H.figureBox(P).catch(() => null);
  console.log('    town: ' + JSON.stringify({ ...inTown, box: boxTown }));
  rec.ok('the figure can be measured in town (guard)',
    !!boxTown && boxTown.height > 0, boxTown);

  /* Out to a spoke, through the real trail-heads. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      for (const q of ['tut_1', 'tut_2', 'tut_3']) {
        S.channel.send({ type: 'quest_accept', payload: { questId: q } });
      }
    }
  });
  await P.page.waitForTimeout(2200);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'sky') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the figure is the same size outside town', 'no exit tables');
    await P.ctx.close().catch(() => {});
    return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  const onHub = await scale(P);
  const boxHub = await H.figureBox(P).catch(() => null);
  console.log('    worldview: ' + JSON.stringify({ ...onHub, box: boxHub }));

  /* ═══ THE RENDERER'S OWN REPORT, NOT A CANVAS CROP ═══
     figureBox finds the figure by looking at pixels, which is the right tool
     for "is he drawn" and the wrong one for "how big did you draw him": on a
     vista map the sprite can be a handful of pixels and the crop latches onto
     something else.  __btPlayerDrawn is what the renderer actually put on the
     screen, and ZONES.worldview carries playerScale {near .55, far .03} --
     a deliberate shrink to sell the vista's depth (v2.3.859) -- so this is
     the number Tee's report is about.  Sampled at the centre AND out toward
     the rim, because the whole point of the curve is that it varies. */
  const drawnHub = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const Z = (window.__btZones || {}).worldview;
    const out = [];
    const at = (fx, fy, tag) => {
      S.player.x = Z.w * 32 * fx; S.player.y = Z.h * 32 * fy;
      return { tag, fx, fy };
    };
    return new Promise((res) => {
      const spots = [[0.5, 0.5, 'centre'], [0.72, 0.28, 'toward a spoke'], [0.9, 0.1, 'near the rim']];
      let i = 0;
      const step = () => {
        if (i >= spots.length) return res(out);
        const s = spots[i];
        const m = at(s[0], s[1], s[2]);
        setTimeout(() => {
          const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
          out.push({ ...m, scale: d && d.scale != null ? +d.scale.toFixed(3) : null });
          i++; step();
        }, 450);
      };
      step();
    });
  });
  console.log('    worldview player scale: ' + JSON.stringify(drawnHub));

  /* ═══ v2.3.2124: THE MAGNIFYING GLASS ═══
     Owner: "there was a fair point about the character being too small in
     worldview.  Maybe it can show character full size but through a
     'magnifying glass'."

     The World View shrinks your own figure to sell the vista's depth --
     playerScale {near .55, far .03, curve .6}, so 55% at the plateau and 3%
     out at the rim.  That is what Tee reported and what an earlier pass of
     this scenario missed, because it measured with figureBox (a canvas crop,
     which latched onto something else) and with __btPlayerDrawn's width (the
     BODY sprite's scale, not the container the shrink is applied to).  The
     container scale is published now and is the thing asserted.

     The claim: with a lens declared, YOUR figure renders at the lens scale
     everywhere on the map -- flat, not falling away with distance. */
  const lens = await P.page.evaluate(() => ((window.__btZones || {}).worldview || {}).playerLens || null);
  console.log('    lens: ' + JSON.stringify(lens));
  rec.ok('the World View declares a magnifier for the local player', !!lens, lens);
  if (lens && drawnHub.every((d) => d.scale != null)) {
    /* NOT compared against lens.scale directly: the container scale is the
       lens times PLAYER_SIZE_MULT times this bro's own build height, so the
       config number is one factor of three and asserting equality with it
       would be asserting the other two are 1.  What the feature promises is
       the two things below. */
    const rim = drawnHub[drawnHub.length - 1].scale;
    const mid = drawnHub[0].scale;
    /* 1. FLAT.  The curve's whole behaviour is to fall away with distance;
          the lens's whole behaviour is not to. */
    rec.ok('...and the figure holds one size right out to the rim',
      Math.abs(mid - rim) < 0.02, drawnHub);
    /* 2. READABLE.  The curve reached 0.03 at the rim -- a speck.  Any value
          near that means the lens is not being read, whatever the config
          says. */
    rec.ok('...at a size you can actually see (the curve gave 0.03 out here)',
      rim > 0.5, { rim, curveWouldBe: 0.03 });
  } else {
    rec.skip('the magnifier holds the figure at a readable size', 'no scale published');
  }


  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'sky',
    { timeout: 30000, label: 'Wind Dunes' }).catch(() => {});
  await P.page.waitForTimeout(1500);
  const inSpoke = await scale(P);
  const boxSpoke = await H.figureBox(P).catch(() => null);
  console.log('    dunes: ' + JSON.stringify({ ...inSpoke, box: boxSpoke }));

  /* THE CLAIM, stated as a comparison rather than an absolute: nobody can say
     what "too small" is in pixels, but "smaller out there than in town" is a
     fact with an answer. */
  rec.ok('the world scale is the same in town and outside it',
    inTown.sx && inSpoke.sx && Math.abs(inTown.sx - inSpoke.sx) < 0.001,
    { town: inTown.sx, dunes: inSpoke.sx, hub: onHub.sx });

  if (boxTown && boxSpoke && boxTown.height > 0 && boxSpoke.height > 0) {
    const ratio = boxSpoke.height / boxTown.height;
    console.log('    drawn height town -> dunes: ' + boxTown.height + ' -> ' + boxSpoke.height
      + '  (x' + ratio.toFixed(3) + ')');
    rec.ok('...and the drawn figure is the same height in both',
      ratio > 0.9 && ratio < 1.1, { town: boxTown.height, dunes: boxSpoke.height, ratio });
  } else {
    rec.skip('the drawn figure is the same height in both',
      'could not read the figure in one of the zones');
  }

  /* How big is it, in the units the complaint is about?  Recorded rather than
     asserted -- "too small" is the owner's call, and this is the number that
     call would be made against. */
  if (boxTown) {
    const css = await P.page.evaluate(() => window.devicePixelRatio || 1);
    console.log('    figure height: ' + (boxTown.height / css).toFixed(1) + ' CSS px on a 390x844 phone'
      + ' (canvas px ' + boxTown.height + ', dpr ' + css + ')');
  }

  await P.ctx.close().catch(() => {});
}
