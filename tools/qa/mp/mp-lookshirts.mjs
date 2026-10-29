/* ═══ v2.3.3751: THE TEE FROM THE LOOK PALETTE -- ITS ORACLE AND ITS MEMORY ═══
 *
 * The look palette's shirt part (docs/specs/look-palette.md, "Shirts"): the
 * tee's stand and jog sheets kept once as colour numbers, its tint, pattern
 * and print painted from the look's row as it is drawn (lookShirt.js,
 * lookShirtFrame.js), where the old path baked a copy of every sheet per
 * patterned or printed tee (gearSheets.getShirtLookFrame).
 *
 * THE ORACLE -- the switch must change nothing anyone can see:
 *   1. 6 shirt colours (white among them) x 4 dressings (plain -- never drawn
 *      from the numbers, the shared sheet and its tint, as always -- a pattern, a
 *      print front and back, a print over a pattern): every stand and jog frame
 *      in all eight facings (the flipped three flipped, their print and tile
 *      pre-flipped), drawn the old way and the new, 1:1, through the sharp
 *      read, compared texel for texel (premultiplied): at most 1 level of 255.
 *   2. a phone's 2.6 device pixels a texel (1 level) and a computer's 0.8 (the
 *      mip chain: 3 levels on under 5% of the pixels), on four looks.
 *   3. the local player in a printed, patterned tee: drawn from the numbers.
 *   4. v2.3.3790: `off_lookshirt` (the Test panel's Memory savers row) takes
 *      that tee off the numbers live, and back.
 * THE MEMORY -- 1, 5 and 20 dressed tees on the chip, both ways.
 * Every check reports the palette atlas's rows used and rowsFull (0).
 *
 *   node tools/qa/mp/run.mjs lookshirts        (after npm run build)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const OUT = join(process.cwd(), 'tools/qa/mp/out');
const PHONE = { width: 390, height: 844 };

/* two drawings: a smiley-ish block in four colours, and a diagonal with the
   palette's last colour ('f') */
const ART_A = (() => { let s = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (x > 3 && x < 12 && y > 3 && y < 12) ? '1238'[(x + y) % 4] : (y === 13 && x > 4 && x < 11 ? 'b' : '0'); return s; })();
const ART_B = (() => { let s = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += x === y ? 'f' : (x + 2 * y) % 7 === 0 ? '6' : (x < 4 ? '3' : '0'); return s; })();
const TINTS = [null, [200, 48, 44], [36, 38, 44], [240, 220, 110], [70, 130, 210], [120, 200, 120]];
const DRESS = [
  {},
  { pattern: 'stripe-v:9' },
  { front: ART_A, back: ART_B },
  { front: ART_B, back: ART_A, pattern: 'check:5' },
];
const ORACLE = [];
TINTS.forEach((tint, i) => DRESS.forEach((d, j) => ORACLE.push({ tint, ...d, pattern: d.pattern ? d.pattern.replace(/\d+$/, (n) => String(1 + (Number(n) + i) % 15)) : null })));
/* the memory's 20 dressed tees, all different */
const PATS = ['stripe-v', 'stripe-h', 'check', 'dots', 'diag', 'grid', 'chevron', 'camo', 'diamond'];
const MEM = [];
for (let i = 0; MEM.length < 20; i++) MEM.push({ tint: TINTS[i % 6], pattern: PATS[i % 9] + ':' + (1 + i % 15), front: i % 3 ? ART_A : null, back: i % 4 ? null : ART_B });

async function inWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
}
const rows = (P) => P.page.evaluate(() => { const s = window.__btLookPalette(); return { rows: s.rows, rowsFull: s.rowsFull, looks: s.looks }; });
const pick = (s) => ({ gpu: s.gpu, canvases: s.canvasMB, artCache: s.cache, buffers: s.buffersMB, heap: s.heapMB });

async function memoryTrip(P, browser, way, rec) {
  const m = await memSampler(P, browser);
  await P.page.waitForTimeout(3000);
  const out = [{ looks: 0, ...pick(await m.sample(way + ' 0')) }];
  let drawn = 0;
  for (const n of [1, 5, 20]) {
    await P.page.evaluate(([looks, w]) => window.__btShirtOracle.draw({ looks, way: w }), [MEM.slice(drawn, n), way]);
    const r = await P.page.evaluate(([looks, w]) => window.__btShirtOracle.draw({ looks, way: w }), [MEM.slice(0, n), way]);
    drawn = n;
    out.push({ looks: n, frames: r.done.reduce((a, x) => a + x.frames, 0), shirt: { gpu: r.gpuMB, textures: r.textures }, ...pick(await m.sample(way + ' ' + n)) });
  }
  console.log(`    ${way}: ` + out.map((r) => `${r.looks} tees: gpu ${r.gpu}` + (r.shirt ? ` (the tee's own: ${r.shirt.textures} textures, ${r.shirt.gpu} MB)` : '')).join(' | '));
  rec.ok(`${way} way: all 20 dressed tees drawn (${out[3].frames} frames)`, out[3].frames > 0, out);
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  if (process.env.LS_PICTURE) return picture({ browser, wsPort, webPort, rec });
  const report = { oracle: null, wide: null, memory: {} };

  if (!process.env.LS_NEW_ONLY) {
    const A = await H.newPlayer(browser, { name: 'oldtees', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=0&lookprobe', init: MEM_INIT });
    try {
      const oa = await inWheel(A);
      rec.ok('the old-way phone is in the Wheel (guard)', !!oa, oa);
      if (!oa) return;
      report.memory.old = await memoryTrip(A, browser, 'old', rec);
    } finally {
      await A.ctx.close().catch(() => {});
    }
  }

  const B = await H.newPlayer(browser, { name: 'tees', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=1', init: MEM_INIT });
  const said = [];
  B.page.on('console', (m) => { if (m.type() === 'error') said.push(m.text().slice(0, 300)); });
  try {
    const ob = await inWheel(B);
    rec.ok('the new-way phone is in the Wheel (guard)', !!ob, ob);
    if (!ob) return;
    const st = await B.page.evaluate(() => window.__btLookPalette());
    console.log(`    the switch: ${JSON.stringify(st)}`);
    const shirtSheets = await B.page.evaluate(() => (window.__btLookShirt ? window.__btLookShirt() : null));
    rec.ok(`the tee's 10 stand and jog sheets are colour numbers and the program built: ${JSON.stringify(shirtSheets)}, on ${st.on}, ok ${st.ok}`,
      st.on === true && st.ok === true && !st.loadError && !st.linkError && shirtSheets && shirtSheets.sheets === 10, { st, shirtSheets });
    /* 3. the local player in a printed, patterned tee, given a body look */
    await B.page.evaluate(([a, b]) => {
      window.__btSetSkin('ebony'); window.__btSetPants('red');
      window.__btSetArt('shirtFront', a); window.__btSetArt('shirtBack', b); window.__btSetPattern('shirt', 'dots:8');
    }, [ART_A, ART_B]);
    await B.page.waitForTimeout(3000);
    const self = await B.page.evaluate(() => (window.__btSelfSprites() || []).filter((s) => /^bt-look:/.test(s.url)).map((s) => s.name + ' ' + s.url));
    const after = await rows(B);
    rec.ok(`the local player's printed, patterned tee is drawn from the numbers beside the body: ${JSON.stringify(self)}; rows ${after.rows}, rowsFull ${after.rowsFull}`,
      self.some((s) => /bt-look:shirt\//.test(s)) && self.some((s) => /bt-look:(stand|jog)-/.test(s)) && after.rowsFull === 0, { self, after });
    await B.page.screenshot({ path: join(OUT, 'lookshirts-local.png') });

    /* 4. v2.3.3790; v2.3.3826 asked of the function, and run first: the Test
       panel's Memory savers switch, live -- off_lookshirt
       set: the dressed tee is no longer given from the numbers (the old dressed
       bake draws it); cleared: it is again, no reload.  Asked of
       getLookShirtFrame itself, as every figure's _placeGear asks it each frame
       it is drawn (the shirt probe's frames: 0 while off) */
    const fromNumbers = () => B.page.evaluate((a) => window.__btShirtOracle.compare({ looks: [{ tint: [200, 48, 44], pattern: 'dots:8', front: a, back: a }], frames: 1 }), ART_A)
      .then((r) => r[0].frames);
    const waitFrames = async (want) => { let n = -1; for (let i = 0; i < 40; i++) { n = await fromNumbers(); if (want(n)) return n; await B.page.waitForTimeout(250); } return n; };
    const setRes = await H.liveFlag(wsPort, 'off_lookshirt', true);
    const offN = await waitFrames((n) => n === 0);
    const heard = await B.page.evaluate(() => { try { return localStorage.getItem('bt_clientoff'); } catch (e) { return 'x'; } });
    const clrRes = await H.liveFlag(wsPort, 'off_lookshirt', null);
    const onN = await waitFrames((n) => n > 0);
    console.log(`    off_lookshirt set ${JSON.stringify(setRes)} (the phone kept ${JSON.stringify(heard)}): ${offN} frames from the numbers; cleared ${JSON.stringify(clrRes)}: ${onN}`);
    rec.ok(`the Memory savers switch "Printed shirts coloured on the chip", live, no reload: off -> ${offN} dressed frames from the numbers (the old bake draws them); on again -> ${onN}`,
      offN === 0 && onN > 0 && heard === 'lookshirt', { offN, onN, heard });
    if (!process.env.LS_ORACLE_ONLY) report.memory.new = await memoryTrip(B, browser, 'new', rec);
    const o = report.memory.old, n = report.memory.new;
    if (o && n) {
      for (const i of [1, 2, 3]) console.log(`    ${o[i].looks} dressed tees, the tee's own textures: the old way ${o[i].shirt.gpu} MB on the chip; the new ${n[i].shirt.gpu} MB (page gpu +${(o[i].gpu - o[0].gpu).toFixed(1)} vs +${(n[i].gpu - n[0].gpu).toFixed(1)})`);
      rec.ok(`20 dressed tees: the tee's textures hold ${n[3].shirt.gpu} MB on the chip the new way, ${o[3].shirt.gpu} MB the old`, n[3].shirt.gpu < 1 && o[3].shirt.gpu > n[3].shirt.gpu * 5, { o, n });
    }
    rec.ok(`rows after the memory trip: ${JSON.stringify(await rows(B))} (rowsFull 0)`, (await rows(B)).rowsFull === 0);

    /* 1. the oracle, 1:1 (v2.3.3826: after 3 and 4 -- minutes of reading pictures back leave the page's socket
       slow to hear the worker; LS_SWITCH_ONLY: none of it) */
    if (!process.env.LS_SWITCH_ONLY) {
    const t0 = Date.now();
    const res = [];
    for (let i = 0; i < ORACLE.length; i += 4) res.push(...await B.page.evaluate((looks) => window.__btShirtOracle.compare({ looks, scale: 1 }), ORACLE.slice(i, i + 4)));
    report.oracle = res;
    let frames = 0, worst = 0, differ = 0, drawn = 0;
    for (const r of res) {
      frames += r.frames; drawn += r.drawn; differ += r.differ; worst = Math.max(worst, r.worst);
      console.log(`    ${r.look.padEnd(60)} ${r.frames} frames${r.baked ? '' : ' (NOT ALL BAKED)'}, ${r.drawn} px, ${r.differ} over 1, worst ${r.worst} ${JSON.stringify(r.hist)}${r.bad.length ? ' e.g. ' + JSON.stringify(r.bad.slice(0, 2)) : ''}`);
    }
    const rw = await rows(B);
    rec.ok(`THE ORACLE: ${res.length} tees (6 colours x 4 dressings), ${frames} stand and jog frames in all eight facings, ${drawn} px drawn both ways: ${differ} px more than 1 level apart (worst ${worst}); rows ${rw.rows}, rowsFull ${rw.rowsFull}`,
      res.length === 24 && res.every((r) => r.baked && (/"p":null,"f":false/.test(r.look) ? r.frames === 0 : r.frames >= 150)) && differ === 0 && rw.rowsFull === 0, { frames, drawn, differ, worst, rw });
    console.log(`    (the oracle took ${Math.round((Date.now() - t0) / 1000)} s)`);

    /* 2. a phone's zoom and a computer's */
    report.wide = {};
    for (const scale of [2.6, 0.8]) {
      await B.page.evaluate((s) => { window.__lsScale = s; }, scale);
      const r = await B.page.evaluate((looks) => window.__btShirtOracle.compare({ looks, scale: window.__lsScale, frames: 2, cols: 12 }),
        [ORACLE[1], ORACLE[6], ORACLE[11], ORACLE[23]]);
      report.wide[scale] = r;
      const d = r.reduce((a, x) => a + x.differ, 0), px = r.reduce((a, x) => a + x.drawn, 0), w = Math.max(...r.map((x) => x.worst));
      console.log(`    at ${scale}x: ${px} px drawn, ${d} more than 1 level apart, worst ${w}${r[0].bad.length ? ' e.g. ' + JSON.stringify(r[0].bad.slice(0, 2)) : ''}`);
      /* minified, the mip chain and the blend between its levels, which the
         chip rounds its own way (the body: 3 levels on 2.5% of its pixels).
         The tee is mostly edge -- a strip of fabric with an outline -- and the
         rounding lands on edges, so its share is higher (measured 7.1%): held
         to 3 levels on under 10% */
      rec.ok(`at ${scale} screen pixels a texel: ${d} of ${px} px more than 1 level apart, worst ${w}`, scale > 1 ? w <= 1 : (w <= 3 && d < 0.10 * px), { d, px, w });
    }

    }
  } finally {
    if (said.length) console.log('    page said: ' + said.slice(0, 12).join('\n      '));
    writeFileSync(join(OUT, 'lookshirts.json'), JSON.stringify(report, null, 1));
    await B.ctx.close().catch(() => {});
  }
}

/* ── LS_PICTURE=1: a picture for the owner -- the same four shirted looks on
   two phones, the old way (`?lookpalette=0`) and the new, each cropped round
   the player (tools/qa/mp/out/lookshirts-<way>-<n>.png) ── */
const PICTURE = [
  { color: 'red', pattern: 'stripe-v:2', front: ART_A, back: ART_B, skin: 'ebony' },
  { color: 'navy', pattern: 'dots:6', front: null, back: null, skin: 'alabaster' },
  { color: 'yellow', pattern: '', front: ART_B, back: ART_A, skin: 'green' },
  { color: 'white', pattern: 'check:9', front: ART_A, back: null, skin: 'default' },
];
async function picture({ browser, wsPort, webPort, rec }) {
  for (const [way, query] of [['old', 'lookpalette=0'], ['new', 'lookpalette=1']]) {
    const P = await H.newPlayer(browser, { name: 'tee' + way, wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query });
    try {
      const ok = await inWheel(P);
      rec.ok(`${way}: in the Wheel (guard)`, !!ok, ok);
      if (!ok) return;
      for (let i = 0; i < PICTURE.length; i++) {
        const L = PICTURE[i];
        await P.page.evaluate((L) => {
          window.__btSetSkin(L.skin); window.__btSetShirtColor(L.color); window.__btSetPattern('shirt', L.pattern);
          window.__btSetArt('shirtFront', L.front || '0'.repeat(256)); window.__btSetArt('shirtBack', L.back || '0'.repeat(256));
        }, L);
        await P.page.waitForTimeout(4000);
        const self = await P.page.evaluate(() => (window.__btSelfSprites() || []).map((x) => x.name + ' ' + x.url));
        console.log(`    ${way} #${i}: ${self.filter((x) => /Shirt|Body|shadeRef/.test(x)).join(' | ')}`);
        await P.page.screenshot({ path: join(OUT, `lookshirts-${way}-${i}.png`), clip: { x: 115, y: 250, width: 160, height: 220 } });
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
