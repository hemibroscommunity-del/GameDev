#!/usr/bin/env node
/* ═══ v2.3.3124: THE OWNER'S FARM PICTURES, INTO THE GAME ═══
 *
 *   node tools/world/add-farm-art.mjs <sheet>=<picture> [...] [--out public/world/farm] [--dry]
 *
 *   sheets:  crops-a  carrot, potato, pumpkin, cabbage        (4 x 4: sprout, young, nearly grown, ripe)
 *            crops-b  wheat, corn, tomato, strawberry
 *            crops-c  firebloom, rock vine, cloudpetal, frostberry
 *            crops-d  thunder pepper, dewmelon, gloomcap, heartroot
 *            beds     four beds (dug, watered, fertilized, both), the plot marker,
 *                     the coin sign, the scarecrow, the compost bin, the tool rack,
 *                     the wheelbarrow, the seed sacks
 *            barn     the Barn
 *
 * The owner made these in ChatGPT from the prompts of 2026-10-06 (docs/art/
 * FARM-ART-PROMPTS.md "The farm you walk on") and sent them in chat.  A
 * picture becomes game art by the Object Studio's own steps alone
 * (public/tools/style/process.js), run here in a headless Chromium on a page
 * of its own -- nothing of the owner's browser touched:
 *
 *   - the flat magenta cut away (keyOut, with its despill and its holes);
 *   - the sheet's objects found BY COUNT (objectsIn) and read like a page,
 *     row by row (the studio's readingOrder);
 *   - ONE SCALE A SHEET, so a crop's four stages keep the sizes ChatGPT drew
 *     them at against each other: a crop sheet's cell is a bed's width
 *     (BED_GAME), the beds sheet's beds are, and the Barn is a town
 *     building's width (BUILDING_GAME, the Feed & Seed's 386);
 *   - shrunk smoothly, never blown up smoothly (resize), at 2 picture px a
 *     game px (bible.js PIXEL.gamePxPerArtPx);
 *   - ONE SET OF 64 COLOURS A SHEET (ownPalette, as the studio gives a set
 *     its colours), every px hardened onto it (hardenAndMap), then trimmed;
 *   - written as see-through palette PNGs (world/core/png8.js `clear`), one
 *     a sprite, with public/world/farm/manifest.json saying each one's size
 *     in game px and where it stands (`foot`: a plant's or a prop's base; a
 *     bed's middle).
 *
 * A sheet whose count does not come out is refused whole, never guessed at.
 * `--dry` writes everything to a scratch folder instead, for a look first.
 * The owner's original pictures are NOT kept in the repo (as the ground's and
 * the objects' are not): run it again from them to re-cut.
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

/* A bed is a little narrower than a person is tall (106 game px): five in a
   row with paths between still fit an upright phone's view of the farm. */
export const BED_GAME = 100;
/* The Barn as wide as the town's buildings are made (the Object Studio's
   PLOT_W, the Feed & Seed's 386 game px). */
export const BUILDING_GAME = 386;

const CROP_STAGES = ['sprout', 'young', 'grown', 'ripe'];
const cropRows = (ids) => ids.map((id) => CROP_STAGES.map((s) => `${id}-${s}`));
export const FARM_SHEETS = {
  'crops-a': { rows: cropRows(['carrot', 'potato', 'pumpkin', 'cabbage']), scale: 'cell', kind: 'crop' },
  'crops-b': { rows: cropRows(['wheat', 'corn', 'tomato', 'strawberry']), scale: 'cell', kind: 'crop' },
  'crops-c': { rows: cropRows(['firebloom', 'rock_vine', 'cloudpetal', 'frostberry']), scale: 'cell', kind: 'crop' },
  'crops-d': { rows: cropRows(['thunder_pepper', 'dewmelon', 'gloomcap', 'heartroot']), scale: 'cell', kind: 'crop' },
  beds: {
    rows: [
      ['bed-dug', 'bed-wet', 'bed-fed', 'bed-wetfed'],
      ['plot', 'sale-sign', 'scarecrow', 'compost-bin'],
      ['tool-rack', 'wheelbarrow', 'seed-sacks'],
    ],
    scale: 'beds', kind: 'prop',
  },
  barn: { rows: [['barn']], scale: 'building', kind: 'building' },
};
/* flat things lie on the ground: they stand at their middle, not their base */
const FLAT = new Set(['bed-dug', 'bed-wet', 'bed-fed', 'bed-wetfed', 'plot']);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

async function main() {
  const args = process.argv.slice(2);
  const outArg = args.indexOf('--out');
  const OUT = path.resolve(outArg >= 0 ? args[outArg + 1] : path.join(REPO, 'public/world/farm'));
  const DRY = args.includes('--dry');
  const jobs = [];
  for (const a of args) {
    const m = /^([a-z-]+)=(.+)$/.exec(a);
    if (!m) continue;
    if (!FARM_SHEETS[m[1]]) { console.error(`no sheet "${m[1]}" (${Object.keys(FARM_SHEETS).join(', ')})`); process.exit(2); }
    jobs.push({ sheet: m[1], file: path.resolve(m[2]) });
  }
  if (!jobs.length) {
    console.error('usage: node tools/world/add-farm-art.mjs <sheet>=<picture> [...] [--out dir] [--dry]');
    process.exit(2);
  }

  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const PUB = path.join(REPO, 'public');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__farm-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>farm art</body>'); }
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const made = [];
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/__farm-art.html`);
    for (const j of jobs) {
      const spec = FARM_SHEETS[j.sheet];
      const b64 = fs.readFileSync(j.file).toString('base64');
      const got = await page.evaluate(async ({ b64, spec, BED_GAME, BUILDING_GAME, flat }) => {
        const P = await import('/tools/style/process.js');
        const { PIXEL } = await import('/tools/style/bible.js');
        const { encodePalettePng } = await import('/tools/world/core/png8.js');
        const PX = 1 / PIXEL.gamePxPerArtPx;
        const OWN = PIXEL.ownColours || 64;
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const src = await P.blobToCanvas(blob, 4096);
        const { canvas: cut } = P.keyOut(src);
        const want = spec.rows.flat().length;
        let boxes;
        if (want === 1) {
          /* one object: its biggest part and the loose bits round it (the studio's own way) */
          const parts = P.partsOf(cut);
          const big = Math.max(...parts.map((p) => p.n));
          const keep = parts.filter((p) => p.n >= big * 0.08);
          const x0 = Math.min(...keep.map((p) => p.x)), y0 = Math.min(...keep.map((p) => p.y));
          const x1 = Math.max(...keep.map((p) => p.x + p.w)), y1 = Math.max(...keep.map((p) => p.y + p.h));
          boxes = [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0, plain: true }];
        } else {
          const found = P.objectsIn(cut, want, { minArea: 0, relMin: 0.002 });
          if (found.boxes.length !== want) return { err: `found ${found.boxes.length} objects, the sheet has ${want}` };
          boxes = found.boxes.map((b) => ({ ...b, found }));
        }
        /* rows read like a page (the Object Studio's readingOrder) */
        const rows = [];
        for (const p of [...boxes].sort((a, b) => a.y - b.y)) {
          let best = null, bestO = 0;
          for (const r of rows) {
            const o = Math.min(p.y + p.h, r.y1) - Math.max(p.y, r.y0);
            if (o > bestO) { bestO = o; best = r; }
          }
          if (best && bestO >= 0.4 * Math.min(p.h, best.y1 - best.y0)) {
            best.items.push(p); best.y0 = Math.min(best.y0, p.y); best.y1 = Math.max(best.y1, p.y + p.h);
          } else rows.push({ y0: p.y, y1: p.y + p.h, items: [p] });
        }
        rows.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
        for (const r of rows) r.items.sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
        const shape = rows.map((r) => r.items.length).join(',');
        const wantShape = spec.rows.map((r) => r.length).join(',');
        if (shape !== wantShape) return { err: `rows of ${shape}, the sheet asks for ${wantShape}` };
        const pieces = rows.flatMap((r) => r.items).map((b) => (b.plain ? P.cropTo(cut, b) : P.cropObject(cut, b.found, b)));
        /* one scale for the whole sheet */
        let k;
        if (spec.scale === 'cell') k = (BED_GAME * PX) / (src.width / 4);
        else if (spec.scale === 'beds') {
          const ws = pieces.slice(0, 4).map((c) => c.width).sort((a, b) => a - b);
          k = (BED_GAME * PX) / ((ws[1] + ws[2]) / 2);
        } else k = (BUILDING_GAME * PX) / pieces[0].width;
        const outs = pieces.map((p) => P.resize(p, Math.max(1, Math.round(p.width * k)), Math.max(1, Math.round(p.height * k)), k < 1));
        /* one set of colours for the sheet */
        const all = P.mk(Math.max(...outs.map((c) => c.width)), outs.reduce((s, c) => s + c.height, 0));
        const ag = all.getContext('2d', { willReadFrequently: true });
        let y = 0;
        for (const c of outs) { ag.drawImage(c, 0, y); y += c.height; }
        const pal = P.ownPalette(ag.getImageData(0, 0, all.width, all.height).data, all.width, all.height, OWN);
        const names = spec.rows.flat();
        const res = [];
        for (let i = 0; i < outs.length; i++) {
          P.hardenAndMap(outs[i], pal);
          const t = P.trim(outs[i]) || outs[i];
          const d = t.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, t.width, t.height).data;
          const png = await encodePalettePng(d, t.width, t.height, { clear: true });
          if (!png) return { err: `${names[i]} would not pack as a palette PNG` };
          let s = '';
          for (let q = 0; q < png.length; q += 0x8000) s += String.fromCharCode.apply(null, png.subarray(q, q + 0x8000));
          /* its base: the lowest row with something in it, under the middle of what is there */
          let bottom = t.height - 1;
          const solid = (x, yy) => d[(yy * t.width + x) * 4 + 3] > 24;
          outer: for (; bottom > 0; bottom--) for (let x = 0; x < t.width; x++) if (solid(x, bottom)) break outer;
          res.push({ name: names[i], w: t.width, h: t.height, png: btoa(s), flat: flat.includes(names[i]), bottom });
        }
        return { k, colours: pal.length, res };
      }, { b64, spec, BED_GAME, BUILDING_GAME, flat: [...FLAT] });
      if (errs.length) throw new Error('the page threw: ' + errs[0]);
      if (got.err) throw new Error(`${j.sheet}: ${got.err}`);
      console.log(`  ${j.sheet}: ${got.res.length} sprites, scale ${got.k.toFixed(3)}, ${got.colours} colours`);
      for (const r of got.res) made.push({ sheet: j.sheet, kind: FARM_SHEETS[j.sheet].kind, ...r });
    }
  } finally {
    await browser.close();
    server.close();
  }

  const target = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'farm-art-')) : OUT;
  fs.mkdirSync(target, { recursive: true });
  const manPath = path.join(OUT, 'manifest.json');
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { tool: 'add-farm-art', version: 1, gamePxPerArtPx: 0.5, bedGame: BED_GAME, sprites: {} };
  man.made = new Date().toISOString();
  let bytes = 0;
  for (const m of made) {
    const data = Buffer.from(m.png, 'base64');
    bytes += data.length;
    fs.writeFileSync(path.join(target, `${m.name}.png`), data);
    man.sprites[m.name] = {
      sheet: m.sheet, kind: m.kind, w: m.w, h: m.h,
      gameW: m.w / 2, gameH: m.h / 2,
      /* where it stands, in its own picture px */
      foot: m.flat ? [Math.round(m.w / 2), Math.round(m.h / 2)] : [Math.round(m.w / 2), m.bottom + 1],
    };
  }
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(man, null, 1) + '\n');
  /* the client's copy: what it needs to lay a picture out before it loads,
     and the address's ?v= (a new run is a new address) */
  const names = Object.keys(man.sprites).sort();
  const rows = names.map((n) => { const q = man.sprites[n]; return `  ${JSON.stringify(n)}: { w: ${q.w}, h: ${q.h}, foot: [${q.foot[0]}, ${q.foot[1]}] },`; });
  const js = `/* v2.3.3124: GENERATED by tools/world/add-farm-art.mjs -- do not edit by
   hand; run the tool again.  The owner's farm pictures (public/world/farm/),
   each one's size in picture px (2 a game px) and where it stands (\`foot\`:
   a plant's or a prop's base, a bed's middle).  docs/specs/farm-walk.md. */
export const FARM_ART_V = ${JSON.stringify(man.made)};
export const FARM_ART_BED_GAME = ${man.bedGame};
export const FARM_ART = {
${rows.join('\n')}
};
`;
  const jsPath = DRY ? path.join(target, 'farmArt.js') : path.join(REPO, 'src/data/farmArt.js');
  fs.writeFileSync(jsPath, js);
  console.log(`wrote ${made.length} sprites, ${(bytes / 1024).toFixed(0)} KB, to ${path.relative(REPO, target) || target}, and ${path.relative(REPO, jsPath)}`);
}
