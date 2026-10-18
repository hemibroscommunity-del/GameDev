#!/usr/bin/env node
/* ═══ v2.3.3345: THE OWNER'S FIVE ORE ROCKS, ONE A METAL ═══
 *
 *   node tools/world/add-ore-art.mjs ore=<picture> [--dry]
 *
 *   sheet:  ore  copper, iron, black steel, titanium, obsidian (left to right)
 *
 * The owner, 2026-10-18, of the resources: every tier in every land, the same
 * picture everywhere, its SIZE saying the tier ("the beginner tier scale up in
 * physical size to the final tier where you have huge fish, ore, and trees at
 * the end").  After the five trees (add-tree-art.mjs) they sent the rocks: one
 * ChatGPT picture on flat green, five rock piles growing left to right, each
 * veined in its ore's colours -- copper orange and verdigris, iron rust, black
 * steel's deep blue, titanium's pale steel, obsidian's purple glass.  The
 * original is kept in assets/prop-source/ore/ so this can be run again.
 *
 * A picture becomes game art by the Object Studio's own steps alone
 * (public/tools/style/process.js), run in a headless Chromium as
 * add-tree-art.mjs does:
 *   - the flat green cut away (keyOut finds the background on its own);
 *   - the sheet's rocks found BY COUNT (objectsIn), read left to right;
 *   - EACH ROCK ITS OWN HEIGHT (ORE's `gameH`, a person being 106 game px),
 *     always shrunk, never blown up, at 2 picture px a game px (bible.js
 *     PIXEL.gamePxPerArtPx);
 *   - one set of 64 colours for the sheet (ownPalette), every px hardened
 *     onto it;
 *   - trimmed, and written as see-through palette PNGs (core/png8.js).
 *
 * Measured off each finished picture, for src/data/oreArt.js (GENERATED):
 *   `foot`  where the rock meets the ground: the middle of its lowest rows'
 *           solid run, at its lowest solid row;
 *   `body`  the rock's own outline as a box in picture px, [left, top, right,
 *           bottom] -- trimmed, so the picture's own edges.
 * A sheet whose count does not come out is refused whole, never guessed at.
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

/* A person is 106 game px tall (bible.js PIXEL.personGamePx). */
const PERSON = 106;
/* Each metal's rock: its gathering tier (the node's gatherLvl), the file, and
   its height in game px.  The order is the sheet's, left to right. */
export const ORE_SHEETS = {
  ore: [
    { lvl: 1, name: 'copper', gameH: 58 },
    { lvl: 6, name: 'iron', gameH: 68 },
    { lvl: 11, name: 'blacksteel', gameH: 80 },
    { lvl: 16, name: 'titanium', gameH: 94 },
    { lvl: 21, name: 'obsidian', gameH: 112 },
  ],
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

async function main() {
  const args = process.argv.slice(2);
  const DRY = args.includes('--dry');
  const jobs = [];
  for (const a of args) {
    const m = /^([a-z-]+)=(.+)$/.exec(a);
    if (!m) continue;
    if (!ORE_SHEETS[m[1]]) { console.error(`no sheet "${m[1]}" (${Object.keys(ORE_SHEETS).join(', ')})`); process.exit(2); }
    jobs.push({ sheet: m[1], file: path.resolve(m[2]) });
  }
  if (jobs.length !== Object.keys(ORE_SHEETS).length) {
    console.error('usage: node tools/world/add-ore-art.mjs ore=<picture> [--dry]');
    process.exit(2);
  }

  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const PUB = path.join(REPO, 'public');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__ore-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>ore art</body>'); }
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
    await page.goto(`http://127.0.0.1:${server.address().port}/__ore-art.html`);
    for (const j of jobs) {
      const rocks = ORE_SHEETS[j.sheet];
      const b64 = fs.readFileSync(j.file).toString('base64');
      const got = await page.evaluate(async ({ b64, rocks }) => {
        const P = await import('/tools/style/process.js');
        const { PIXEL } = await import('/tools/style/bible.js');
        const { encodePalettePng } = await import('/tools/world/core/png8.js');
        const PX = 1 / PIXEL.gamePxPerArtPx;
        const OWN = PIXEL.ownColours || 64;
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const src = await P.blobToCanvas(blob, 4096);
        const { canvas: cut } = P.keyOut(src);
        const found = P.objectsIn(cut, rocks.length, { minArea: 0, relMin: 0.002 });
        if (found.boxes.length !== rocks.length) return { err: `found ${found.boxes.length} rocks, the sheet has ${rocks.length}` };
        /* one row, read left to right */
        const boxes = [...found.boxes].sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
        const pieces = boxes.map((b) => P.cropObject(cut, found, b));
        const outs = [];
        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          const k = (rocks[i].gameH * PX) / p.height;
          if (k > 1) return { err: `${rocks[i].name} is drawn ${p.height} px tall, smaller than the ${rocks[i].gameH * PX} it is shown at: it would be blown up` };
          outs.push(P.resize(p, Math.max(1, Math.round(p.width * k)), Math.max(1, Math.round(p.height * k)), true));
        }
        /* one set of colours for the sheet */
        const all = P.mk(Math.max(...outs.map((c) => c.width)), outs.reduce((s, c) => s + c.height, 0));
        const ag = all.getContext('2d', { willReadFrequently: true });
        let y = 0;
        for (const c of outs) { ag.drawImage(c, 0, y); y += c.height; }
        const pal = P.ownPalette(ag.getImageData(0, 0, all.width, all.height).data, all.width, all.height, OWN);
        const res = [];
        for (let i = 0; i < outs.length; i++) {
          P.hardenAndMap(outs[i], pal);
          const t = P.trim(outs[i]) || outs[i];
          const w = t.width, h = t.height;
          const d = t.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
          const solid = (x, yy) => d[(yy * w + x) * 4 + 3] > 24;
          let bottom = h - 1;
          outer: for (; bottom > 0; bottom--) for (let x = 0; x < w; x++) if (solid(x, bottom)) break outer;
          /* the foot: the middle of the solid run over the rock's lowest
             tenth, row by row, the middle value kept */
          const mids = [];
          for (let yy = bottom - Math.max(1, Math.round(h * 0.1)); yy <= bottom; yy++) {
            if (yy < 0) continue;
            let l = -1, r = -1;
            for (let x = 0; x < w; x++) if (solid(x, yy)) { if (l < 0) l = x; r = x; }
            if (l >= 0) mids.push((l + r) / 2);
          }
          const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };
          const footX = Math.round(mids.length ? med(mids) : w / 2);
          const png = await encodePalettePng(d, w, h, { clear: true });
          if (!png) return { err: `${rocks[i].name} would not pack as a palette PNG` };
          let s = '';
          for (let q = 0; q < png.length; q += 0x8000) s += String.fromCharCode.apply(null, png.subarray(q, q + 0x8000));
          res.push({ w, h, png: btoa(s), foot: [footX, bottom + 1] });
        }
        return { colours: pal.length, res };
      }, { b64, rocks });
      if (errs.length) throw new Error('the page threw: ' + errs[0]);
      if (got.err) throw new Error(`${j.sheet}: ${got.err}`);
      console.log(`  ${j.sheet}: ${got.res.length} rocks, ${got.colours} colours`);
      got.res.forEach((r, i) => made.push({ ...rocks[i], ...r }));
    }
  } finally {
    await browser.close();
    server.close();
  }

  made.sort((a, b) => a.lvl - b.lvl);
  const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'ore-art-')) : path.join(REPO, 'public/sprites/ore');
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0, decoded = 0;
  for (const m of made) {
    const data = Buffer.from(m.png, 'base64');
    bytes += data.length;
    decoded += m.w * m.h * 4;
    fs.writeFileSync(path.join(OUT, `ore-${m.name}.png`), data);
    console.log(`  ore-${m.name}.png  ${m.w} x ${m.h} px (${(m.w / 2).toFixed(0)} x ${(m.h / 2).toFixed(0)} game px), foot ${m.foot}, ${(data.length / 1024).toFixed(0)} KB`);
  }
  const stamp = new Date().toISOString();
  const rows = made.map((m) => `  ${m.lvl}: { name: ${JSON.stringify(m.name)}, url: '/sprites/ore/ore-${m.name}.png', w: ${m.w}, h: ${m.h}, foot: [${m.foot[0]}, ${m.foot[1]}] },`);
  const js = `/* v2.3.3345: GENERATED by tools/world/add-ore-art.mjs -- do not edit by
   hand; run the tool again from assets/prop-source/ore/.  The owner's five
   ore rocks, one a metal (docs/specs/tier-ore.md), keyed by the gathering
   tier that grows it (a node's gatherLvl): each picture's size in picture px
   (2 a game px, trimmed to the rock) and \`foot\` where it meets the ground
   (the middle of its lowest rows, at its lowest row). */
export const ORE_ART_V = ${JSON.stringify(stamp)};
export const ORE_ART = {
${rows.join('\n')}
};
`;
  const jsPath = DRY ? path.join(OUT, 'oreArt.js') : path.join(REPO, 'src/data/oreArt.js');
  fs.writeFileSync(jsPath, js);
  console.log(`wrote ${made.length} rocks, ${(bytes / 1024).toFixed(0)} KB on disk, ${(decoded / 1048576).toFixed(1)} MB decoded, to ${path.relative(REPO, OUT) || OUT}, and ${path.relative(REPO, jsPath) || jsPath}`);
}
