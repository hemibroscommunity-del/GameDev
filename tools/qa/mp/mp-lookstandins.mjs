/* ═══ v2.3.3757: THE STAND-INS FROM THE NUMBERS -- THE ORACLE ═══
 *
 * The sword's swing, the bow's draw and the shield block draw "stand-in"
 * sheets (the body, the torso over the jog's legs, the legs), recoloured per
 * look by the old path; the look palette keeps them once as colour numbers
 * (lookSets/standin.js, public/sprites/look/standin/; docs/specs/look-palette.md).
 *
 *   1. on by default: the set loaded behind the loading screen, its 21 sheets;
 *   2. THE ORACLE: six looks, every frame of every stand-in sheet drawn the
 *      old way (the stand-ins' own bake and crop) and from the numbers,
 *      through the sharp read: no texel past the 8-bit cut's bar (16 levels;
 *      a sheet kept 16-bit is exact), at 1:1 and at the swing's own size
 *      (about half: these strips are drawn minified);
 *   3. your own stand-in strips are look frames (no bake), and with the
 *      palette atlas FULL (M3's review: a crowd fight) still drawn, the old
 *      way, once; the next look, the atlas free again, from the numbers.
 *
 *   node tools/qa/mp/run.mjs lookstandins        (after npm run build)
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const BAR = 16;
const STANDIN_SHEETS = 21;
const LOOKS = [['ebony', 'red', 'white'], ['green', 'pink', 'blue'], ['alabaster', 'default', 'default'],
  ['default', 'navy', 'tan'], ['honey', 'teal', 'black'], ['default', 'default', 'default']];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'standins', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookprobe' });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    const st = await P.page.evaluate(() => window.__btLookPalette());
    console.log(`    the switch: ${JSON.stringify(st)}`);
    rec.ok(`by default the stand-ins are colour numbers too: sets ${st.sets}, ${st.sheets} sheets (${st.sheetMB} MB), rowsFull ${st.rowsFull}`,
      st.on === true && (st.sets || []).includes('standin') && st.sheets >= 20 + STANDIN_SHEETS && !st.loadError, st);

    for (const scale of [1, 0.5]) {
      const t0 = Date.now();
      const r = await P.page.evaluate(([looks, scale, bar]) => window.__btLookOracle.compareStandIns({ looks, scale, bar }), [LOOKS, scale, BAR]);
      let frames = 0, drawn = 0, over = 0, worst = 0, sum = 0, at = null;
      for (const x of r) {
        frames += x.frames; drawn += x.drawn; over += x.over; sum += x.mean * x.drawn;
        if (x.worst > worst) { worst = x.worst; at = x.look + ' ' + x.worstAt; }
        console.log(`    ${scale}x ${x.look.padEnd(28)} ${x.frames} frames, ${x.drawn} px, mean ${x.mean}, worst ${x.worst} (${x.worstAt}), ${x.over} over ${BAR}`);
      }
      const mean = +(sum / Math.max(1, drawn)).toFixed(2);
      console.log(`    (${Math.round((Date.now() - t0) / 1000)} s)`);
      rec.ok(`THE ORACLE at ${scale}x: ${LOOKS.length} looks, ${frames} stand-in frames, ${drawn} px drawn both ways: worst ${worst} (${at}), mean ${mean}, ${over} past ${BAR}`,
        frames >= LOOKS.length * 100 && over === 0, { frames, drawn, worst, mean, over });
    }
    const before = await P.page.evaluate(() => window.__btLookPalette());
    console.log(`    the atlas: ${before.rows} rows held, ${before.looksMade} made, rowsFull ${before.rowsFull}`);
    rec.ok(`the atlas, before it is filled on purpose: rowsFull ${before.rowsFull}`, before.rowsFull === 0, before);
    /* 4. M3's review: the atlas FULL (a crowd fight), your look new -- every
       stand-in strip still has a body (the old bake, once), and with the atlas
       free again the next look is drawn from the numbers */
    const s0 = await P.page.evaluate(() => window.__btStandInStrips());
    rec.ok(`your stand-in strips from the numbers: ${s0.strips.filter((x) => x.look).length} of ${s0.strips.length}`,
      s0.strips.length >= 10 && s0.strips.every((x) => x.drawn && x.look), s0);
    /* in one step: rows an idle look gives back between steps (its 30 s
       sweep runs as anything is drawn) would let the new look in */
    await P.page.evaluate(() => window.__btLookOracle.fillAtlas());
    const { filled, s1, lp1 } = await P.page.evaluate(async () => {
      const filled = await window.__btLookOracle.fillAtlas();
      window.__btSetSkin('purple');
      return { filled, s1: window.__btStandInStrips(), lp1: window.__btLookPalette() };
    });
    console.log(`    the atlas filled (${filled} rows), a new look: ${JSON.stringify(s1.strips.map((x) => x.url + (x.drawn ? (x.look ? ':look' : ':bake') : ':NONE')))}, ${s1.fallbacks} fallbacks, rowsFull ${lp1.rowsFull}`);
    rec.ok(`the atlas full: every stand-in strip still drawn, the old way (${s1.strips.filter((x) => x.drawn && !x.look).length} of ${s1.strips.length}, ${s1.fallbacks} fallbacks, rowsFull ${lp1.rowsFull})`,
      s1.strips.length === s0.strips.length && s1.strips.every((x) => x.drawn && !x.look) && s1.fallbacks >= s1.strips.length && lp1.rowsFull > 0, { s1, lp1 });
    await P.page.evaluate(() => window.__btLookOracle.freeAtlas());
    await P.page.evaluate(() => window.__btSetSkin('ebony'));
    await P.page.waitForTimeout(1500);
    const s2 = await P.page.evaluate(() => window.__btStandInStrips());
    rec.ok(`the atlas free again, the next look: from the numbers (${s2.strips.filter((x) => x.look).length} of ${s2.strips.length})`,
      s2.strips.every((x) => x.drawn && x.look), s2);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
