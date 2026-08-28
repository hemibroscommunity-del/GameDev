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
