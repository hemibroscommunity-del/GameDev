/* ═══ v2.3.4961: THE HEAD SHEETS FROM THE NUMBERS -- THE ORACLE ═══
 *
 * The head an armoured figure draws over its armour (the jog, the hit taken,
 * mining, the pickup) is kept once as colour numbers (lookSets/bodyheads.js,
 * public/sprites/look/bodyheads/), a skin a row, instead of a recoloured copy for
 * every skin (playerSkins.js getPickupHeadFrame, _headLookFrames).
 *
 *   1. on by default: the set loaded behind the loading screen, 11 sheets;
 *   2. THE ORACLE: five skins (the default among them), every frame of every
 *      head sheet drawn the old way (bodyRecolor.js bakeHeadFull and the
 *      pack, the steps the page and the worker take) and from the numbers,
 *      through the sharp read: the same frame count, no texel past the 8-bit
 *      cut's bar (16 levels), at 1:1 and at half size;
 *   3. your own heads are drawn from the numbers and none is baked (the old
 *      path baked ten behind the loading screen); `?headlook=0`: all baked,
 *      as before.
 *
 *   node tools/qa/mp/run.mjs headlook        (after npm run build)
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const BAR = 16;
const SHEETS = 11;
const LOOKS = [['default'], ['ebony'], ['alabaster'], ['honey'], ['green']];

async function inWorld(P, rec, label) {
  await H.enterWorld(P);
  const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label }).catch(() => null);
  rec.ok(`${label} (guard)`, !!ok, ok);
  return !!ok;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'headlook', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookprobe' });
  try {
    if (!(await inWorld(P, rec, 'in the Wheel'))) return;
    const st = await P.page.evaluate(() => window.__btLookPalette());
    rec.ok(`by default the head sheets are colour numbers: sets ${st.sets}, ${st.sheets} sheets (${st.sheetMB} MB)`,
      st.on === true && (st.sets || []).includes('bodyheads') && !st.loadError, st);
    for (const scale of [1, 0.5]) {
      const t0 = Date.now();
      const r = await P.page.evaluate(([looks, scale, bar]) => window.__btLookOracle.compareHeads({ looks, scale, bar }), [LOOKS, scale, BAR]);
      let frames = 0, drawn = 0, over = 0, worst = 0, sum = 0, at = null, counts = true;
      for (const x of r) {
        frames += x.frames; drawn += x.drawn; over += x.over; sum += x.mean * x.drawn;
        if (x.sameCounts !== x.sheets || x.sheets !== SHEETS) counts = false;
        if (x.worst > worst) { worst = x.worst; at = x.look + ' ' + x.worstAt; }
        console.log(`    ${scale}x ${x.look.padEnd(10)} ${x.sameCounts}/${x.sheets} sheets of the same length, ${x.frames} frames, ${x.drawn} px, mean ${x.mean}, worst ${x.worst} (${x.worstAt}), ${x.over} over ${BAR}`);
      }
      const mean = +(sum / Math.max(1, drawn)).toFixed(2);
      console.log(`    (${Math.round((Date.now() - t0) / 1000)} s)`);
      rec.ok(`THE ORACLE at ${scale}x: ${LOOKS.length} skins, ${frames} head frames, ${drawn} px drawn both ways: worst ${worst} (${at}), mean ${mean}, ${over} past ${BAR}`,
        counts && frames >= LOOKS.length * 150 && over === 0, { frames, drawn, worst, mean, over, counts });
    }
    for (const skin of ['default', 'ebony']) {
      await P.page.evaluate((s) => window.__btSetSkin(s), skin);
      await P.page.waitForTimeout(1500);
      const h = await P.page.evaluate(() => window.__btHeadSheets());
      console.log(`    ${skin}: ${JSON.stringify(h)}`);
      rec.ok(`your own heads (${skin} skin) are drawn from the numbers: ${h.look.filter((x) => /:look$/.test(x)).length} of ${h.look.length}`,
        !h.off && h.look.length === SHEETS && h.look.every((x) => /:look$/.test(x)), h);
    }
    const h0 = await P.page.evaluate(() => window.__btHeadSheets());
    rec.ok(`...and no head sheet was baked for them (${h0.baked} held; the old path bakes ten behind the loading screen)`, h0.baked === 0, h0);
  } finally {
    await P.ctx.close().catch(() => {});
  }
  /* the off-ramp: as before */
  const Q = await H.newPlayer(browser, { name: 'headlook0', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'headlook=0' });
  try {
    if (!(await inWorld(Q, rec, 'in the Wheel with ?headlook=0'))) return;
    let h = null;
    for (let i = 0; i < 40; i++) {
      h = await Q.page.evaluate(() => window.__btHeadSheets());
      if (h.look.every((x) => /:bake$/.test(x))) break;
      await Q.page.waitForTimeout(500);
    }
    rec.ok(`?headlook=0: every head baked as before (${h.look.filter((x) => /:bake$/.test(x)).length} of ${h.look.length}, ${h.baked} held)`,
      h.off && h.look.every((x) => /:bake$/.test(x)) && h.baked >= 10, h);
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
