#!/usr/bin/env node
/* ═══ v2.3.3784: THE DASHBOARD BUTTON'S BAG, WITH ITS THREE FIGHTS ═══
 *
 *   node tools/ui/make-dash-bag-icon.mjs [--dry]
 *
 *   reads   public/icons/ui/nav-inventory.webp (the sack), combat-melee.webp,
 *           combat-bow.webp, combat-magic.webp (the three combat skills)
 *   writes  public/icons/ui/nav-dashboard.png (256 x 256, a palette PNG)
 *
 * The owner, 2026-10-29: "Instead of the bar graphs for the dashboard button
 * that brings up the inventory slots and 3 primary combat skills I actually
 * think a bag icon mini combat icons would be better."  The button
 * (BottomDashboard.jsx RAIL_ITEMS 'dashboard') opens the bag's slots and the
 * three combat cards, so its picture is the sack, large, with the sword, the
 * bow and the staff small across its lower front.
 *
 * Made from the art the game already has, by the Object Studio's own steps
 * (public/tools/style/process.js: trim, resize) in a headless Chromium as
 * tools/ui/add-coin-art.mjs runs them, then:
 *   - each mini given a dark outline (its own shape grown OUTLINE_PX in
 *     OUTLINE_INK) so it still reads at the button's smallest, ~30 px;
 *   - the three set side by side, overlapping a little, their feet on the
 *     sack's lower front;
 *   - 256 colours at most (the owner's standard; add-coin-art.mjs quantise,
 *     a median cut that keeps the soft edges), written as a palette PNG. */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { quantise, palettePng } from './add-coin-art.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

const SIZE = 256;
const BAG_PX = 214;          /* the sack, its longer side, a little high */
const MINI_PX = 124;         /* each combat picture, its longer side: big enough to read at ~30 px */
const MINI_Y = 248;          /* the minis' feet, from the top */
const MINI_XS = [60, 128, 196];   /* their middles: sword, bow, staff */
const OUTLINE_PX = 7;
const OUTLINE_INK = '#1a120c';
const SOURCES = ['nav-inventory', 'combat-melee', 'combat-bow', 'combat-magic'];

async function main() {
  const DRY = process.argv.includes('--dry');
  const PUB = path.join(REPO, 'public');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__bag.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>bag</body>'); }
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let got;
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/__bag.html`);
    got = await page.evaluate(async (o) => {
      const P = await import('/tools/style/process.js');
      const load = async (n) => P.blobToCanvas(await (await fetch('/icons/ui/' + n + '.webp')).blob(), 1024);
      const fit = (c, px) => {
        const t = P.trim(c, 8) || c;
        const k = Math.min(1, px / Math.max(t.width, t.height));
        return k < 1 ? P.resize(t, t.width * k, t.height * k, true) : t;
      };
      const [bagSrc, ...minis] = await Promise.all(o.SOURCES.map(load));
      const out = P.mk(o.SIZE, o.SIZE), g = out.getContext('2d');
      const bag = fit(bagSrc, o.BAG_PX);
      g.drawImage(bag, Math.round((o.SIZE - bag.width) / 2), 2);
      /* each mini: its outline (the shape, inked, stamped round a circle),
         then itself */
      minis.forEach((m, i) => {
        const s = fit(m, o.MINI_PX);
        const ink = P.mk(s.width, s.height), ig = ink.getContext('2d');
        ig.drawImage(s, 0, 0);
        ig.globalCompositeOperation = 'source-in';
        ig.fillStyle = o.OUTLINE_INK;
        ig.fillRect(0, 0, s.width, s.height);
        const x = Math.round(o.MINI_XS[i] - s.width / 2), y = Math.round(o.MINI_Y - s.height);
        for (let a = 0; a < 24; a++) {
          const t = (a / 24) * Math.PI * 2;
          for (const r of [o.OUTLINE_PX * 0.5, o.OUTLINE_PX]) g.drawImage(ink, x + Math.cos(t) * r, y + Math.sin(t) * r);
        }
        g.drawImage(s, x, y);
      });
      const d = g.getImageData(0, 0, o.SIZE, o.SIZE).data;
      let bin = '';
      for (let q = 0; q < d.length; q += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(q, q + 0x8000));
      return { rgba: btoa(bin) };
    }, { SOURCES, SIZE, BAG_PX, MINI_PX, MINI_Y, MINI_XS, OUTLINE_PX, OUTLINE_INK });
    if (errs.length) throw new Error('the page threw: ' + errs[0]);
  } finally {
    await browser.close();
    server.close();
  }
  const rgba = new Uint8Array(Buffer.from(got.rgba, 'base64'));
  const { pal, idx } = quantise(rgba, 256);
  const png = palettePng(idx, pal, SIZE, SIZE);
  const OUT = DRY ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bag-icon-')), 'nav-dashboard.png') : path.join(REPO, 'public/icons/ui/nav-dashboard.png');
  fs.writeFileSync(OUT, png);
  console.log(`  ${path.relative(REPO, OUT) || OUT}: ${SIZE} x ${SIZE}, ${pal.length / 4} colours, ${(png.length / 1024).toFixed(1)} KB`);
}

/* last, so the imports above are ready */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
