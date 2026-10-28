/* ═══ THE HEAD PIECES FROM ONE SHEET OF NUMBERS, A COLOUR A ROW ENTRY (v2.3.3753) ═══
 *
 * Phase 2 of the look palette, lane P4 (docs/specs/look-palette.md "Head
 * pieces"): a hair, hat, beard, pair of glasses or eye style in a colour is
 * drawn from the piece's ONE sheet of colour numbers (the set 'heads',
 * tools/art/head-bake.mjs) and a palette row, instead of a recoloured copy a
 * colour (traits/*ColorCatalog.js).  On by default; `?lookpalette=0` the old way.
 *
 * THE ORACLE -- the switch must change nothing anyone can see:
 *   1. 8 hair colours on every recolourable hair, 8 hat colours on 6 hats,
 *      2 on every other hat, the beard in all 7, every pair of glasses and
 *      every eye style in 3: every facing, the three flipped ones flipped as
 *      the game draws them, drawn the old way (the catalog's copy) and from
 *      the numbers, 1:1, through the sharp read, compared texel for texel
 *      (premultiplied): identical, or 1 level of 255 at most.
 *   2. the same at a phone's 2.6 device pixels a texel (1 level) and at a
 *      computer's 0.8 (the mip chain, emulated: 3 levels on under 5%).
 *   3. on by default, the 59 pieces loaded, the program built; the rows the
 *      looks hold, and none refused (rowsFull 0).
 *   4. the local player in pink hair under a red top hat, a white beard and
 *      blue thug-life glasses: each piece drawn from the numbers.
 *   5. the memory: 12 hats in 12 colours put on the chip both ways.
 *
 *   node tools/qa/mp/run.mjs lookheads        (after npm run build)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'tools/qa/mp/out');
const PHONE = { width: 390, height: 844 };

const HAIRS = ['wavy', 'split-hair', 'dirty-blonde', 'slick-back-hair', 'afro', 'blonde-hair', 'flat-top'];
const HAIR_COLORS = ['black', 'brown', 'auburn', 'blonde', 'gray', 'red', 'pink', 'white'];
const HATS6 = ['crown', 'top-hat', 'kermit-hat', 'sombrero', 'wizard-hat', 'spartan-helmet'];
const HAT_COLORS = ['red', 'orange', 'green', 'blue', 'purple', 'pink', 'black', 'white'];
const BEARD_COLORS = ['black', 'brown', 'auburn', 'blonde', 'gray', 'red', 'white'];
const EYEWEAR = ['golden-glasses', 'golden-monocle', 'thug-life', 'eye-patch', 'goggles', 'laser-glasses', 'white-glass'];
const EYESTYLES = ['sleepy', 'demon', 'one-eye', 'wtf', 'alien'];

async function inWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const report = {};
  const P = await H.newPlayer(browser, { name: 'heads', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookprobe' });
  const said = [];
  P.page.on('console', (m) => { if (m.type() === 'error') said.push(m.text().slice(0, 300)); });
  try {
    const ok = await inWheel(P);
    rec.ok('the phone is in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    /* 3. on, the pieces in */
    const st = await P.page.evaluate(() => ({ lp: window.__btLookPalette(), hl: window.__btHeadLook(), probe: !!window.__btHeadOracle }));
    console.log(`    the switch: ${JSON.stringify(st)}`);
    rec.ok(`by default the head pieces are colour numbers: ${st.hl.pieces} pieces, sets ${JSON.stringify(st.lp.sets)}, on ${st.lp.on}, ok ${st.lp.ok}`,
      st.lp.on === true && st.lp.ok === true && st.hl.loaded && st.hl.pieces === 59 && st.lp.sets.indexOf('heads') >= 0 && st.probe && !st.lp.loadError, st);
    const allHats = await P.page.evaluate(() => fetch('/sprites/look/heads/roles.json').then((r) => r.json()).then((m) => Object.keys(m.sheets)));
    const items = [];
    for (const h of HAIRS) for (const c of HAIR_COLORS) items.push(['hair', h, c]);
    for (const h of HATS6) for (const c of HAT_COLORS) items.push(['headwear', h, c]);
    for (const s of allHats) if (s.startsWith('headwear-') && HATS6.indexOf(s.slice(9)) < 0) for (const c of ['teal', 'gray']) items.push(['headwear', s.slice(9), c]);
    for (const c of BEARD_COLORS) items.push(['facialhair', 'beard', c]);
    for (const e of EYEWEAR) for (const c of ['red', 'blue', 'white']) items.push(['eyewear', e, c]);
    for (const e of EYESTYLES) for (const c of ['green', 'red', 'ice']) items.push(['eyestyle', e, c]);

    if (process.env.LH_DEBUG) {
      for (const [scale, sharp, sq] of [[2.6, true, true], [2.6, false, true], [0.8, true, true], [2.6, true, false]]) {
        const r = await P.page.evaluate(([s, sh, q]) => window.__btHeadOracle.compare({ items: [['headwear', 'top-hat', 'red']], scale: s, sharp: sh, sameQuad: q, cols: 6 }), [scale, sharp, sq]);
        console.log(`    DEBUG ${scale} sharp ${sharp} sameQuad ${sq}: ${r[0].drawn} px, ${r[0].differ} over 1, worst ${r[0].worst} ${JSON.stringify(r[0].bad.slice(0, 2))}`);
      }
      return;
    }
    /* 1. the oracle, 1:1 */
    const t0 = Date.now();
    const res = [];
    for (let i = 0; i < items.length; i += 8) res.push(...await P.page.evaluate((its) => window.__btHeadOracle.compare({ items: its, scale: 1 }), items.slice(i, i + 8)));
    report.oracle = res;
    let facings = 0, drawn = 0, differ = 0, worst = 0;
    const notDrawn = res.filter((r) => !r.old || !r.look || r.missingNew || r.missingOld);
    for (const r of res) {
      facings += r.facings; drawn += r.drawn; differ += r.differ; worst = Math.max(worst, r.worst);
      if (r.differ || !r.look) console.log(`    ${r.item.padEnd(34)} ${r.facings} facings, ${r.drawn} px, ${r.differ} over 1, worst ${r.worst} ${JSON.stringify(r.hist)} ${JSON.stringify(r.bad.slice(0, 2))}`);
    }
    console.log(`    the oracle: ${res.length} pieces-in-a-colour, ${facings} facings, ${drawn} px, ${differ} over 1, worst ${worst} (${Math.round((Date.now() - t0) / 1000)} s)`);
    rec.ok(`THE ORACLE: ${res.length} pieces in a colour, ${facings} facings (flips included), ${drawn} px drawn both ways: ${differ} px more than 1 level apart (worst ${worst})`,
      res.length === items.length && !notDrawn.length && differ === 0 && drawn > 100000, { facings, drawn, differ, worst, notDrawn: notDrawn.map((r) => r.item) });

    /* 2. a phone's zoom and a computer's */
    report.wide = {};
    const sample = [['hair', 'afro', 'pink'], ['hair', 'wavy', 'blonde'], ['headwear', 'top-hat', 'red'], ['headwear', 'crown', 'blue'],
      ['facialhair', 'beard', 'white'], ['eyewear', 'thug-life', 'blue'], ['eyestyle', 'one-eye', 'red'], ['eyestyle', 'sleepy', 'green']];
    for (const scale of [2.6, 0.8]) {
      const r = await P.page.evaluate(([its, s]) => window.__btHeadOracle.compare({ items: its, scale: s, cols: 6 }), [sample, scale]);
      report.wide[scale] = r;
      const d = r.reduce((a, x) => a + x.differ, 0), px = r.reduce((a, x) => a + x.drawn, 0), w = Math.max(...r.map((x) => x.worst));
      const hist = {};
      for (const x of r) for (const [k, v] of Object.entries(x.hist)) hist[k] = (hist[k] || 0) + v;
      console.log(`    at ${scale}x: ${px} px, ${d} more than 1 apart, worst ${w} ${JSON.stringify(hist)}`);
      rec.ok(`at ${scale} screen pixels a texel (the sharp read${scale < 1 ? ', the mip chain' : ''}): ${d} of ${px} px more than 1 level apart, worst ${w}`,
        r.every((x) => x.look && x.old) && (scale > 1 ? w <= 1 : (w <= 3 && d < 0.05 * px)), { d, px, w, hist });
    }

    /* for the record (no line): through the old copy's whole 128 frame, the
       quads' corners land on other fractions of a pixel, and the rasterizer's
       sub-pixel snap moves an edge's one-pixel blend (geometry, not colour:
       look-heads.md "Where it is not exact") */
    {
      const r = await P.page.evaluate((its) => window.__btHeadOracle.compare({ items: its, scale: 2.6, cols: 6, sameQuad: false }), sample.slice(0, 3));
      report.wholeFrame = r;
      console.log(`    (for the record) at 2.6x through the whole 128 frame: ${r.reduce((a, x) => a + x.differ, 0)} of ${r.reduce((a, x) => a + x.drawn, 0)} px more than 1 apart, worst ${Math.max(...r.map((x) => x.worst))}`);
    }

    /* 4. the local player */
    await P.page.evaluate(() => {
      window.__btSetHair('afro'); window.__btSetHairColor('pink');
      window.__btSetHeadwear('top-hat'); window.__btSetHatColor('red');
      window.__btSetFacialHair('beard');
      if (window.__btSetFacialHairColor) window.__btSetFacialHairColor('white');
      window.__btSetEyewear('thug-life'); window.__btEyewearColor.set('blue');
    });
    await P.page.waitForTimeout(3000);
    const self = await P.page.evaluate(() => (window.__btSelfSprites() || []).map((s) => s.name + ' ' + s.url));
    const look = self.filter((s) => /bt-look:heads\//.test(s));
    console.log(`    the local player: ${JSON.stringify(self)}`);
    rec.ok(`the local player's pink afro, red top hat, white beard and blue thug-life are drawn from the numbers (${look.length}: ${JSON.stringify(look)})`,
      ['hair-afro', 'headwear-top-hat', 'facialhair-beard', 'eyewear-thug-life'].every((k) => look.some((s) => s.indexOf(k) >= 0)), self);
    await P.page.screenshot({ path: join(OUT, 'lookheads-local.png') });

    /* 5. the memory: 12 hats, 12 colours, put on the chip both ways */
    const HATS12 = ['crown', 'top-hat', 'kermit-hat', 'sombrero', 'wizard-hat', 'spartan-helmet', 'fedora', 'beanie', 'red-cap', 'cowboy-hat', 'shark-hat', 'safety-helmet'];
    const COL12 = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'black', 'white', 'gray', 'red'];
    const mem = HATS12.map((h, i) => ['headwear', h, COL12[(i + 3) % 12]]);
    report.memory = {
      old: await P.page.evaluate((its) => window.__btHeadOracle.draw({ items: its, way: 'old' }), mem),
    };
    report.memory.new = await P.page.evaluate((its) => window.__btHeadOracle.draw({ items: its, way: 'new' }), mem);
    console.log(`    12 hats in a colour each: the old way's copies ${JSON.stringify(report.memory.old)}; the numbers (all 59 pieces, every colour) ${st.lp.sheetMB} MB`);
    rec.ok(`12 coloured hats: the old way holds their own copies (${report.memory.old.gpuMB} MB on the chip); the numbers hold every piece in every colour, once`,
      report.memory.old.gpuMB > 2, report.memory);

    const end = await P.page.evaluate(() => window.__btLookPalette());
    report.rows = { looks: end.looks, rows: end.rows, rowsFull: end.rowsFull };
    console.log(`    the palette rows: ${JSON.stringify(report.rows)}`);
    rec.ok(`the looks' rows: ${end.rows} held, rowsFull ${end.rowsFull}`, end.rowsFull === 0, end);
  } finally {
    if (said.length) console.log('    the page said: ' + said.slice(0, 12).join('\n      '));
    writeFileSync(join(OUT, 'lookheads.json'), JSON.stringify(report, null, 1));
    await P.ctx.close().catch(() => {});
  }
}
