/* ═══ THE BODY FROM ONE SHEET OF COLOUR NUMBERS, EVERY LOOK A ROW (v2.3.3716) ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  The old way
 * bakes a recoloured copy of the body's sheets for every look on screen
 * (playerSkins.js recolorBodyToCanvas); `?lookpalette` draws the stand and jog
 * frames from ONE sheet of colour numbers per facing and a row of the look's
 * colours instead (rendering/lookPalette.js, docs/specs/look-palette.md) --
 * on by default (the owner's word), `?lookpalette=0` the old way.
 *
 * THE ORACLE -- the switch must change nothing anyone can see:
 *   1. 24 looks (skin x trousers x boots, the ghost audit's green / pink / blue
 *      among them, half with an eye colour): every stand and jog frame in all
 *      eight facings (the three flipped ones flipped, as the game draws them),
 *      drawn the old way and the new, 1:1, through the sharp read the body is
 *      drawn with, compared texel for texel (premultiplied): identical, or at
 *      most 1 level of 255 on a channel.
 *   2. the same at a phone's 2.6 device pixels a texel (1 level, as 1:1) and
 *      at a computer's 0.8 (the chip's mip chain and its blend, emulated: 3
 *      levels on under 5% of the pixels -- the chip rounds its LOD and
 *      weights its own way), on four looks.
 *   3. on by default and off with `?lookpalette=0`; the local player's own
 *      body is drawn from the numbers once given a look.
 *   4. a phone with nothing in its address: on, and a body in the alien's
 *      purple under a top hat drawn from the numbers, the hat on it.
 * THE MEMORY -- 1, 5 and 20 different looks put on the chip, both ways, on two
 * phones (one `?lookpalette=0&lookprobe`, the old path with the same probe; one
 * `?lookpalette=1`, the default with the probe): the GPU's textures, the 2D canvases, the asset cache, the
 * page's buffers and heap, each look's every stand and jog frame drawn once.
 *
 *   node tools/qa/mp/run.mjs lookpalette        (after npm run build)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const OUT = join(process.cwd(), 'tools/qa/mp/out');
const PHONE = { width: 390, height: 844 };

/* the oracle's 24: skin x trousers x boots, an eye colour on every other one */
const SKINS = ['green', 'alabaster', 'ebony', 'default'];
const PANTS = ['pink', 'red', 'default'];
const SHOES = ['blue', 'white'];
const ORACLE = [];
for (const s of SKINS) for (const p of PANTS) for (const b of SHOES) ORACLE.push([s, p, b, ORACLE.length % 2 ? 'blue' : 'default']);
/* the memory's 20, all different */
const MEM_SKINS = ['ebony', 'alabaster', 'green', 'honey', 'deep', 'rosy', 'olive', 'purple', 'blue', 'snow'];
const MEM_PANTS = ['red', 'navy', 'white', 'teal', 'yellow'];
const MEM = [];
for (let i = 0; MEM.length < 20; i++) MEM.push([MEM_SKINS[i % 10], MEM_PANTS[(i + Math.floor(i / 10)) % 5], i % 2 ? 'tan' : 'black', 'default']);
if (new Set(MEM.map((L) => L.join('/'))).size !== MEM.length) throw new Error('mp-lookpalette: the 20 memory looks are not all different');

async function inWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
}

const pick = (s) => ({ gpu: s.gpu, canvases: s.canvasMB, artCache: s.cache, buffers: s.buffersMB, heap: s.heapMB });
async function memoryTrip(P, browser, way, rec) {
  const m = await memSampler(P, browser);
  await P.page.waitForTimeout(4000);
  const rows = [{ looks: 0, ...pick(await m.sample(way + ' 0')) }];
  let drawn = 0;
  for (const n of [1, 5, 20]) {
    /* the new looks drawn, then every look so far drawn again: "on screen"
       is drawn lately (Pixi lets go of a texture not drawn for 60 s, and the
       old way's bakes take that long to make) */
    await P.page.evaluate(([looks, w]) => window.__btLookOracle.draw({ looks, way: w }), [MEM.slice(drawn, n), way]);
    const r = await P.page.evaluate(([looks, w]) => window.__btLookOracle.draw({ looks, way: w }), [MEM.slice(0, n), way]);
    drawn = n;
    rows.push({ looks: n, frames: r.done.reduce((a, x) => a + x.frames, 0), body: { gpu: r.gpuMB, images: r.imagesMB, textures: r.textures },
      ...pick(await m.sample(way + ' ' + n)) });
  }
  console.log(`    ${way}: ` + rows.map((r) => `${r.looks} looks: gpu ${r.gpu}, canvases ${r.canvases}, artCache ${r.artCache}, buffers ${r.buffers}, heap ${r.heap}`
    + (r.body ? ` (the body's own: ${r.body.textures} textures, ${r.body.gpu} MB on the chip, ${r.body.images} MB of decoded images)` : '')).join(' | '));
  rec.ok(`${way} way: all 20 looks drawn (${rows[3].frames} frames)`, rows[3].frames > 0, rows);
  return rows;
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const report = { oracle: null, wide: null, memory: {} };

  /* ── the old way's memory (the same probe, no switch) ── */
  if (process.env.LP_NEW_ONLY) report.memory.old = null;
  else {
  const A = await H.newPlayer(browser, { name: 'oldlooks', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=0&lookprobe', init: MEM_INIT });
  try {
    const oa = await inWheel(A);
    rec.ok('the old-way phone is in the Wheel (guard)', !!oa, oa);
    if (!oa) return;
    const st = await A.page.evaluate(() => (window.__btLookPalette ? window.__btLookPalette() : null));
    rec.ok(`with ?lookpalette=0 nothing is drawn from the numbers: ${JSON.stringify(st && { wanted: st.wanted, on: st.on, sheets: st.sheets })}`,
      !!st && st.wanted === false && st.on === false && st.sheets === 0, st);
    report.memory.old = await memoryTrip(A, browser, 'old', rec);
  } finally {
    await A.ctx.close().catch(() => {});
  }
  }

  /* ── the new way: its memory, then the oracle ── */
  const B = await H.newPlayer(browser, { name: 'looks', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=1', init: MEM_INIT });
  const loads = [];
  B.page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /bt-crash|lookpal/i.test(t)) loads.push(t.slice(0, 300)); });
  B.page.on('framenavigated', (f) => { if (f === B.page.mainFrame()) loads.push('navigated ' + f.url().slice(-80)); });
  try {
    const ob = await inWheel(B);
    rec.ok('the switched phone is in the Wheel (guard)', !!ob, ob);
    if (!ob) return;
    const st = await B.page.evaluate(() => window.__btLookPalette());
    console.log(`    the switch: ${JSON.stringify(st)}`);
    rec.ok(`by default the 10 stand and jog sheets are colour numbers (${st.sheetMB} MB) and the program built: on ${st.on}, ok ${st.ok}`,
      st.on === true && st.ok === true && st.sheets === 10 && !st.loadError && !st.linkError, st);
    report.memory.new = await memoryTrip(B, browser, 'new', rec);
    const o = report.memory.old, n = report.memory.new;
    if (o && n) {
      for (const i of [1, 2, 3]) {
        const dO = { gpu: o[i].gpu - o[0].gpu, canvases: o[i].canvases - o[0].canvases, artCache: o[i].artCache - o[0].artCache };
        const dN = { gpu: n[i].gpu - n[0].gpu, canvases: n[i].canvases - n[0].canvases, artCache: n[i].artCache - n[0].artCache };
        const f = (v) => v.toFixed(1);
        console.log(`    ${o[i].looks} looks: the old way holds +${f(dO.gpu)} MB on the chip, +${f(dO.canvases)} of canvases, +${f(dO.artCache)} of art; the new +${f(dN.gpu)}, +${f(dN.canvases)}, +${f(dN.artCache)}`);
      }
      for (const i of [1, 2, 3]) {
        console.log(`    ${o[i].looks} looks, the body's own textures: the old way ${o[i].body.gpu} MB on the chip + ${o[i].body.images} MB of decoded images; the new ${n[i].body.gpu} MB + ${n[i].body.images}`);
      }
      rec.ok(`20 looks: the body's textures hold ${n[3].body.gpu} MB on the chip the new way, ${o[3].body.gpu} MB the old (and ${o[3].body.images} MB of decoded images the old way keeps beside them)`,
        n[3].body.gpu < 4 && o[3].body.gpu > 20 * 4, { o, n });
    }

    /* 1. the oracle, 1:1 */
    const t0 = Date.now();
    const res = [];
    for (let i = 0; i < ORACLE.length; i += 4) {
      res.push(...await B.page.evaluate((looks) => window.__btLookOracle.compare({ looks, scale: 1 }), ORACLE.slice(i, i + 4)));
    }
    report.oracle = res;
    let frames = 0, worst = 0, differ = 0, drawn = 0;
    for (const r of res) {
      frames += r.frames; drawn += r.drawn; differ += r.differ; worst = Math.max(worst, r.worst);
      console.log(`    ${r.look.padEnd(32)} ${r.frames} frames${r.baked ? '' : ' (NOT ALL BAKED)'}, ${r.drawn} px drawn, ${r.differ} over 1, worst ${r.worst} ${JSON.stringify(r.hist)}${r.bad.length ? ' e.g. ' + JSON.stringify(r.bad.slice(0, 2)) : ''}`);
    }
    rec.ok(`THE ORACLE: 24 looks, ${frames} stand and jog frames in all eight facings, ${drawn} px drawn both ways: ${differ} px more than 1 level apart (worst ${worst})`,
      res.length === 24 && res.every((r) => r.baked && r.frames >= 150) && differ === 0, { frames, drawn, differ, worst });
    console.log(`    (the oracle took ${Math.round((Date.now() - t0) / 1000)} s)`);

    /* 2. a phone's zoom and a computer's */
    report.wide = {};
    for (const scale of [2.6, 0.8]) {
      await B.page.evaluate((s) => { window.__lpScale = s; }, scale);
      const r = await B.page.evaluate((looks) => window.__btLookOracle.compare({ looks, scale: window.__lpScale, frames: 2, cols: 12 }),
        [ORACLE[0], ORACLE[7], ORACLE[13], ORACLE[22]]);
      report.wide[scale] = r;
      const d = r.reduce((a, x) => a + x.differ, 0), px = r.reduce((a, x) => a + x.drawn, 0), w = Math.max(...r.map((x) => x.worst));
      const hist = {};
      for (const x of r) for (const [k, v] of Object.entries(x.hist)) hist[k] = (hist[k] || 0) + v;
      console.log(`    at ${scale}x: ${px} px drawn, ${d} more than 1 level apart, worst ${w} ${JSON.stringify(hist)}${r[0].bad.length ? ' e.g. ' + JSON.stringify(r[0].bad.slice(0, 2)) : ''}`);
      /* magnified (a phone) the chip's own bilinear read, done in the
         shader: 1 level, as 1:1.  Minified (a computer) the mip chain and the
         blend between its levels, whose LOD and weights the chip rounds its
         own way: held to 3 levels on under 5% of the pixels */
      rec.ok(`at ${scale} screen pixels a texel (the sharp read${scale < 1 ? ', the mip chain' : ''}): ${d} of ${px} px more than 1 level apart, worst ${w}`,
        scale > 1 ? w <= 1 : (w <= 3 && d < 0.05 * px), { d, px, w, hist });
    }

    /* 3. the local player's own body, given a look */
    await B.page.evaluate(() => { window.__btSetSkin('ebony'); window.__btSetPants('red'); window.__btSetShoes('white'); });
    await B.page.waitForTimeout(3000);
    const self = await B.page.evaluate(() => (window.__btSelfSprites() || []).filter((s) => /^bt-look:/.test(s.url)));
    const after = await B.page.evaluate(() => window.__btLookPalette());
    rec.ok(`the local player in ebony / red / white is drawn from the numbers: ${JSON.stringify(self)} (${after.looks} looks held)`,
      self.length >= 1, { self, after });
    await B.page.screenshot({ path: join(OUT, 'lookpalette-local.png') });
  } finally {
    if (loads.length) console.log('    page B said: ' + loads.slice(0, 20).join('\n      '));
    writeFileSync(join(OUT, 'lookpalette.json'), JSON.stringify(report, null, 1));
    await B.ctx.close().catch(() => {});
  }

  /* ── 4. the DEFAULT page (no address switch at all): on, and a body in the
     alien's purple under a top hat drawn from the numbers, the hat on it ── */
  const C = await H.newPlayer(browser, { name: 'deflook', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  try {
    const oc = await inWheel(C);
    rec.ok('the default phone is in the Wheel (guard)', !!oc, oc);
    if (!oc) return;
    const st = await C.page.evaluate(() => window.__btLookPalette());
    rec.ok(`with nothing in the address the look palette is on: on ${st.on}, ok ${st.ok}, ${st.sheets} sheets`, st.on === true && st.ok === true && st.sheets === 10, st);
    await C.page.evaluate(() => { window.__btSetSkin('purple'); window.__btSetHeadwear('top-hat'); });
    await C.page.waitForTimeout(4000);
    const self = await C.page.evaluate(() => window.__btSelfSprites() || []);
    const body = self.filter((x) => /^bt-look:/.test(x.url));
    const hat = self.filter((x) => /top-hat|headwear/i.test(x.url + ' ' + x.name));
    console.log(`    the default page, purple under a top hat: body ${JSON.stringify(body)}; hat ${JSON.stringify(hat)}`);
    rec.ok(`the default page: the purple body is drawn from the numbers (${body.length}) and the top hat is on it (${hat.length})`, body.length >= 1 && hat.length >= 1, { self });
    await C.page.screenshot({ path: join(OUT, 'lookpalette-default-purple-hat.png') });
  } finally {
    await C.ctx.close().catch(() => {});
  }
}
