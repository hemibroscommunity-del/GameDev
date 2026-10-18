#!/usr/bin/env node
/* ═══ v2.3.3343: THE OWNER'S FIVE TREES, ONE A WOOD ═══
 *
 *   node tools/world/add-tree-art.mjs trees-a=<picture> trees-b=<picture> [--dry]
 *
 *   sheets:  trees-a  pine, softwood (a willow), hardwood (a gnarled old tree)
 *            trees-b  cedar, maple
 *
 * The owner, 2026-10-18, of the resources: each tier one tree in every land,
 * "the log art (in terms of color to represent the type of wood) would need to
 * be the same across all 8 lands", and the land shown by effects drawn in code
 * ("add effects to a pine tree to make it look like it belongs in that
 * elemental zone but the wood logs stay the same").  So a wood's tree is one
 * picture everywhere: its shape and its SIZE say the tier, its bark the colour
 * of its log icon (docs/art/log-icons-key.png), small by town and huge at the
 * far end.  The two pictures are ChatGPT's, from the prompts of that day
 * (docs/ART-WISHLIST.md "Trees, one a wood"); the originals are kept in
 * assets/prop-source/trees/ so this can be run again.
 *
 * A picture becomes game art by the Object Studio's own steps alone
 * (public/tools/style/process.js), run in a headless Chromium as
 * add-farm-art.mjs does:
 *   - the flat magenta cut away (keyOut);
 *   - the sheet's trees found BY COUNT (objectsIn), read left to right;
 *   - EACH TREE ITS OWN HEIGHT (TREES' `gameH`, a person being 106 game px:
 *     1.5, 2, 2.5, 3 and 4 people), always shrunk, never blown up, at 2
 *     picture px a game px (bible.js PIXEL.gamePxPerArtPx);
 *   - one set of 64 colours a SHEET (ownPalette), every px hardened onto it;
 *   - trimmed, and written as see-through palette PNGs (core/png8.js).
 *
 * Measured off each finished picture, for src/data/treeArt.js (GENERATED):
 *   `foot`  where the tree meets the ground: its trunk's middle, at its lowest
 *           solid row;
 *   `trunk` the trunk's half-width, read just above the roots' flare -- the
 *           part a player cannot walk through, and what the lumberjack stands
 *           beside.
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
/* Each wood's tree: its gathering tier (the node's gatherLvl), the file, and
   its height in game px.  The order is the sheet's, left to right. */
export const TREE_SHEETS = {
  'trees-a': [
    { lvl: 1, name: 'pine', gameH: Math.round(PERSON * 1.5) },
    { lvl: 6, name: 'softwood', gameH: Math.round(PERSON * 2) },
    { lvl: 11, name: 'hardwood', gameH: Math.round(PERSON * 2.5) },
  ],
  'trees-b': [
    { lvl: 16, name: 'cedar', gameH: Math.round(PERSON * 3) },
    { lvl: 21, name: 'maple', gameH: Math.round(PERSON * 4) },
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
    if (!TREE_SHEETS[m[1]]) { console.error(`no sheet "${m[1]}" (${Object.keys(TREE_SHEETS).join(', ')})`); process.exit(2); }
    jobs.push({ sheet: m[1], file: path.resolve(m[2]) });
  }
  if (jobs.length !== Object.keys(TREE_SHEETS).length) {
    console.error('usage: node tools/world/add-tree-art.mjs trees-a=<picture> trees-b=<picture> [--dry]');
    process.exit(2);
  }

  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const PUB = path.join(REPO, 'public');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__tree-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>tree art</body>'); }
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
    await page.goto(`http://127.0.0.1:${server.address().port}/__tree-art.html`);
    for (const j of jobs) {
      const trees = TREE_SHEETS[j.sheet];
      const b64 = fs.readFileSync(j.file).toString('base64');
      const got = await page.evaluate(async ({ b64, trees }) => {
        const P = await import('/tools/style/process.js');
        const { PIXEL } = await import('/tools/style/bible.js');
        const { encodePalettePng } = await import('/tools/world/core/png8.js');
        const PX = 1 / PIXEL.gamePxPerArtPx;
        const OWN = PIXEL.ownColours || 64;
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const src = await P.blobToCanvas(blob, 4096);
        const { canvas: cut } = P.keyOut(src);
        const found = P.objectsIn(cut, trees.length, { minArea: 0, relMin: 0.002 });
        if (found.boxes.length !== trees.length) return { err: `found ${found.boxes.length} trees, the sheet has ${trees.length}` };
        /* one row, read left to right */
        const boxes = [...found.boxes].sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
        const pieces = boxes.map((b) => P.cropObject(cut, found, b));
        const outs = [];
        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          const k = (trees[i].gameH * PX) / p.height;
          if (k > 1) return { err: `${trees[i].name} is drawn ${p.height} px tall, smaller than the ${trees[i].gameH * PX} it is shown at: it would be blown up` };
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
          /* the trunk: the solid run nearest the middle, read over the rows
             6-12% of the tree's height above its base (over the roots' flare,
             under the lowest leaves), each row's run taken as it is and the
             middle values kept */
          const mids = [], halves = [];
          for (let yy = bottom - Math.round(h * 0.12); yy <= bottom - Math.round(h * 0.06); yy++) {
            if (yy < 0) continue;
            let best = null;
            for (let x = 0; x < w;) {
              if (!solid(x, yy)) { x++; continue; }
              let x1 = x;
              while (x1 + 1 < w && solid(x1 + 1, yy)) x1++;
              const mid = (x + x1) / 2;
              if (!best || Math.abs(mid - w / 2) < Math.abs(best.mid - w / 2)) best = { mid, half: (x1 - x + 1) / 2 };
              x = x1 + 1;
            }
            if (best) { mids.push(best.mid); halves.push(best.half); }
          }
          const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };
          const footX = Math.round(mids.length ? med(mids) : w / 2);
          const trunk = Math.round(halves.length ? med(halves) : w * 0.05);
          const png = await encodePalettePng(d, w, h, { clear: true });
          if (!png) return { err: `${trees[i].name} would not pack as a palette PNG` };
          let s = '';
          for (let q = 0; q < png.length; q += 0x8000) s += String.fromCharCode.apply(null, png.subarray(q, q + 0x8000));
          res.push({ w, h, png: btoa(s), foot: [footX, bottom + 1], trunk });
        }
        return { colours: pal.length, res };
      }, { b64, trees });
      if (errs.length) throw new Error('the page threw: ' + errs[0]);
      if (got.err) throw new Error(`${j.sheet}: ${got.err}`);
      console.log(`  ${j.sheet}: ${got.res.length} trees, ${got.colours} colours`);
      got.res.forEach((r, i) => made.push({ ...trees[i], ...r }));
    }
  } finally {
    await browser.close();
    server.close();
  }

  made.sort((a, b) => a.lvl - b.lvl);
  const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'tree-art-')) : path.join(REPO, 'public/sprites/trees');
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0, decoded = 0;
  for (const m of made) {
    const data = Buffer.from(m.png, 'base64');
    bytes += data.length;
    decoded += m.w * m.h * 4;
    fs.writeFileSync(path.join(OUT, `wood-${m.name}.png`), data);
    console.log(`  wood-${m.name}.png  ${m.w} x ${m.h} px (${(m.w / 2).toFixed(0)} x ${(m.h / 2).toFixed(0)} game px), foot ${m.foot}, trunk +-${m.trunk}, ${(data.length / 1024).toFixed(0)} KB`);
  }
  const stamp = new Date().toISOString();
  const rows = made.map((m) => `  ${m.lvl}: { name: ${JSON.stringify(m.name)}, url: '/sprites/trees/wood-${m.name}.png', w: ${m.w}, h: ${m.h}, foot: [${m.foot[0]}, ${m.foot[1]}], trunk: ${m.trunk} },`);
  const js = `/* v2.3.3343: GENERATED by tools/world/add-tree-art.mjs -- do not edit by
   hand; run the tool again from assets/prop-source/trees/.  The owner's five
   trees, one a wood (docs/specs/tier-trees.md), keyed by the gathering tier
   that grows it (a node's gatherLvl): each picture's size in picture px (2 a
   game px), \`foot\` where it meets the ground (its trunk's middle, at its
   lowest row) and \`trunk\` the trunk's half-width in picture px, read just
   above the roots. */
export const TREE_ART_V = ${JSON.stringify(stamp)};
export const TREE_ART = {
${rows.join('\n')}
};
`;
  const jsPath = DRY ? path.join(OUT, 'treeArt.js') : path.join(REPO, 'src/data/treeArt.js');
  fs.writeFileSync(jsPath, js);
  console.log(`wrote ${made.length} trees, ${(bytes / 1024).toFixed(0)} KB on disk, ${(decoded / 1048576).toFixed(1)} MB decoded, to ${path.relative(REPO, OUT) || OUT}, and ${path.relative(REPO, jsPath) || jsPath}`);
}
