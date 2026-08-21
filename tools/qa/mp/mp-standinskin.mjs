/* THE BRO DOES NOT CHANGE COMPLEXION WHEN HE ATTACKS (v2.3.1788).
 *
 * The recolour catalogs give 'default' a target of null — "leave the art as
 * painted".  That is only coherent while every sheet is painted in the SAME
 * palette, and they are not: the walking sheets are a brown tan, the sword
 * stand-in is oranger, the bow stand-in oranger still.  A player who picked a
 * custom skin never saw it, because then a target IS applied and every sheet
 * normalises to it.  Everyone on the default skin changed colour every time
 * they swung.
 *
 * v2.3.1710 had already fixed exactly this for the cook and the fire-lighter
 * (`skinTarget(...) || DEFAULT_SKIN_TARGET`) after the owner reported "has the
 * wrong skin color"; the sword and bow stand-ins never got it.
 *
 * WHY THIS MEASURES THE BAKED SHEET AND NOT THE SCREEN.  A screenshot of the
 * world cannot answer this: the town's cobblestone passes the same warm-tone
 * test the skin classifier uses, so an 80x90 crop containing one bro yields
 * ~51,000 "skin" pixels, and the figure is a rounding error inside its own
 * measurement.  I tried it that way first and got identical numbers before and
 * after the fix.  The baked canvas is the thing that actually changed.
 *
 * MEASURED, mean skin RGB of the baked sheet, default skin:
 *                        before fix        after fix
 *   jog-east-legs        [186,119,70]      [185,121,67]   (the reference; barely moves)
 *   sword-east-body      [207,126,64]      [198,129,72]
 *   bow-east-body        [223,121,57]      [199,130,73]
 * So the bow sheet goes from 36 red-units off the walking palette to 12.
 */
import * as H from './harness.mjs';

/* Per-channel tolerance against the walking reference.  18 sits clear of the
   worst post-fix gap (12) and well under the worst pre-fix one (36), so this
   fails loudly on a regression without flagging the honest pose-to-pose
   lighting spread. */
const TOL = 18;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tone', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);

  const baked = await P.page.evaluate(() => window.__btStandInSkin || null);
  rec.ok('the bake probe reported sheets at all', !!(baked && Object.keys(baked).length),
    { sheets: baked ? Object.keys(baked).length : 0 });
  if (!baked) { await P.ctx.close().catch(() => {}); return; }

  /* The walking reference: the jog-leg sheets, which ARE the body you see when
     you are not attacking. */
  const walking = Object.entries(baked).filter(([k, v]) => /jog-.*-legs/.test(k) && v.n > 0);
  rec.ok('the walking sheets baked, to compare against (guard)', walking.length >= 3,
    { found: walking.map(([k]) => k) });
  if (walking.length < 3) { await P.ctx.close().catch(() => {}); return; }

  const ref = [0, 1, 2].map((c) =>
    Math.round(walking.reduce((a, [, v]) => a + v.rgb[c], 0) / walking.length));
  console.log('    walking reference', JSON.stringify(ref));

  const standIns = Object.entries(baked).filter(([k, v]) => /(sword|bow)-.*-(body|torso)/.test(k) && v.n > 0);
  /* GUARD: the attack sheets really did bake.  Without it, a build where they
     failed to load would pass this file by having nothing to check. */
  rec.ok('the attack stand-in sheets baked (guard)', standIns.length >= 8,
    { found: standIns.length });

  const worst = { name: null, delta: -1 };
  for (const [url, v] of standIns) {
    const name = url.replace('/sprites/player/', '').replace('.png', '');
    const delta = Math.max(...[0, 1, 2].map((c) => Math.abs(v.rgb[c] - ref[c])));
    if (delta > worst.delta) { worst.name = name; worst.delta = delta; }
    rec.ok(`${name}: wears the walking skin`, delta <= TOL,
      { rgb: v.rgb, reference: ref, worstChannelDelta: delta, tolerance: TOL });
  }
  console.log('    worst stand-in', JSON.stringify(worst));

  await P.ctx.close().catch(() => {});
}
