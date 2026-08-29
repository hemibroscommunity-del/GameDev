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

  /* ═══ v2.3.2124 -> v2.3.2141: THE MAGNIFIER, AND THEN ONLY ITS RING ═══
     Owner, first: "there was a fair point about the character being too small
     in worldview.  Maybe it can show character full size but through a
     'magnifying glass'."  Owner, after living with it: "Change the character
     back to tiny on worldview and center them inside the magnifying glass
     (that'll be enough)."

     THIS BLOCK USED TO ASSERT THE OPPOSITE and it was right to, then: the
     lens carried `scale: 0.9`, which took the local player off the curve
     entirely, and the two claims here were "the figure holds ONE size right
     out to the rim" and "at a size you can actually see (rim > 0.5)".  Both
     are now false by decision, not by regression -- a figure at 90% on a map
     drawn to look miles away read as un-shrunk rather than as magnified, and
     it flattened the depth at the one spot the eye always is.  What survives
     is the RING, which answers "where am I" without touching the perspective.

     So the claim inverts: your figure is back on the curve, exactly like
     every peer.  Kept here rather than deleted because this scenario is where
     "is the character too small outside town" is answered, and the honest
     answer on the World View is now "yes, deliberately, and there is a ring
     around him instead".  mp-wvglass owns the rest of it -- that the glass is
     centred on him at every distance, and that it does not shrink with him. */
  const lens = await P.page.evaluate(() => ((window.__btZones || {}).worldview || {}).playerLens || null);
  console.log('    lens: ' + JSON.stringify(lens));
  rec.ok('the World View still declares a ring for the local player', !!lens, lens);
  rec.ok('...that no longer freezes his size (v2.3.2141 removed playerLens.scale)',
    !!lens && lens.scale === undefined, lens);
  if (drawnHub.every((d) => d.scale != null)) {
    const rim = drawnHub[drawnHub.length - 1].scale;
    const mid = drawnHub[0].scale;
    /* The curve's whole behaviour is to fall away with distance, and the
       figure is on it again -- which is the assertion that would have caught
       the v2.3.2124 opt-out had it existed then. */
    rec.ok('...so your figure shrinks with distance again, like every peer',
      mid > rim * 1.5, drawnHub);
    /* And it really does reach the speck the curve promises out at the rim.
       The measured value out here is ~0.12 (the curve's 0.0955 at this
       distance, times the 1.25 size mult, times this bro's build); 0.2 leaves
       room for a taller build without letting through anything that is still
       holding him up -- the value being excluded is the 1.125 the frozen lens
       used to force, which is nearly ten times this. */
    rec.ok('...all the way down to a speck at the rim, as the vista intends',
      rim < 0.2, { rim, curveFar: 0.03, frozenLensWas: 1.125 });
  } else {
    rec.skip('the figure is back on the perspective curve', 'no scale published');
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
