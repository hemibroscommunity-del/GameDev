/* ═══ v2.3.2931: THE PLAN, AS PICTURES FOR PEOPLE ═══
 *
 * Renders the two pictures docs/WORLD-BIBLE.md shows, from the live plan, so
 * they cannot drift from it:
 *
 *   docs/world/island-plan.png   the World Builder's map in Plan view -- the
 *                                whole island with every square's name
 *   docs/world/brotown-plan.png  Brotown close up, every plot labelled with
 *                                the building it is kept for
 *
 * Runs the real builder page in Chromium over a local static server (text
 * needs a browser; the repo has no image library).  Re-run after changing
 * public/tools/world/plan.js:
 *
 *   node tools/world/render-plan-images.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const OUT = path.join(REPO, 'docs/world');
const PUB = path.join(REPO, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(PUB, p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', (e) => console.error('page error:', e));
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/world/`);
  await page.waitForFunction(() => window.__world && window.__world.S.project, null, { timeout: 60000 });
  await page.evaluate(() => window.__world.ready.then(() => true));
  await page.click('[data-view="plan"]');

  const island = await page.evaluate(() => document.getElementById('map').toDataURL('image/png'));

  const town = await page.evaluate(async () => {
    const { renderSketch } = await import('/tools/world/core/layout.js');
    const { S } = window.__world;
    const g = S.g, R = 1300, OUTPX = 1300;
    const rect = { x: g.cx - R, y: g.cy - R, w: 2 * R, h: 2 * R };
    const px = renderSketch(S.plan, S.bp, rect, OUTPX, OUTPX, S.table);
    const c = new OffscreenCanvas(OUTPX, OUTPX), ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(px, OUTPX, OUTPX), 0, 0);
    const k = OUTPX / rect.w, X = (x) => (x - rect.x) * k, Y = (y) => (y - rect.y) * k;
    /* the squares' middles (what the builder's map outlines) */
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
    for (let q = g.c0; q <= g.c1 + 1; q++) { const x = X(q * g.P + g.O / 2); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, OUTPX); ctx.stroke(); }
    for (let q = g.r0; q <= g.r1 + 1; q++) { const y = Y(q * g.P + g.O / 2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(OUTPX, y); ctx.stroke(); }
    ctx.setLineDash([]);
    const label = (text, x, y, size, color = '#2b2118', bg = null) => {
      ctx.font = `700 ${size}px system-ui,-apple-system,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = String(text).split('\n');
      if (bg) {
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12, h = lines.length * size * 1.15 + 8;
        ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - h / 2, w, h);
      }
      ctx.fillStyle = color;
      lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * size * 1.15));
    };
    const wrap = (name) => name.replace(' & ', ' &\n').replace("Sheriff's Office", "Sheriff's\nOffice").replace('Gambling Den', 'Gambling\nDen')
      .replace('General Store', 'General\nStore').replace('Auction House', 'Auction\nHouse').replace('Assay Office', 'Assay\nOffice')
      .replace('Land Office', 'Land\nOffice').replace('Guild Hall', 'Guild\nHall').replace('Gem Cutter', 'Gem\nCutter').replace('Town Hall', 'Town\nHall');
    for (const l of S.bp.lots) {
      const x = X((l.x0 + l.x1) / 2), y = Y((l.y0 + l.y1) / 2);
      if (x < 0 || y < 0 || x > OUTPX || y > OUTPX) continue;
      label(wrap(l.name.replace(/^the /, '')), x, y, 15);
    }
    for (const [name, dx, dy] of [['North Gate', 0, -1], ['South Gate', 0, 1], ['West Gate', -1, 0], ['East Gate', 1, 0]]) {
      label(name, X(g.cx + dx * (S.plan.town.gate + 70)), Y(g.cy + dy * (S.plan.town.gate + 70)), 16, '#fff', 'rgba(0,0,0,0.55)');
    }
    label('Main Street', X(g.cx), Y(g.cy - 420 - 200), 14, '#fff', 'rgba(0,0,0,0.45)');
    label('Market Row', X(g.cx + 420 + 250), Y(g.cy), 14, '#fff', 'rgba(0,0,0,0.45)');
    for (const r of [[12, 12], [11, 11], [13, 13], [11, 12], [12, 11], [13, 12], [12, 13], [11, 13], [13, 11]]) {
      const x = X(r[0] * g.P + g.O / 2) + 30, y = Y(r[1] * g.P + g.O / 2) + 16;
      if (x > 0 && y > 0 && x < OUTPX && y < OUTPX) label(String.fromCharCode(65 + r[0]) + (r[1] + 1), x, y, 15, '#fff', 'rgba(0,0,0,0.55)');
    }
    const blob = await c.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return 'data:image/png;base64,' + btoa(s);
  });

  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, url] of [['island-plan.png', island], ['brotown-plan.png', town]]) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`wrote docs/world/${name} (${Math.round(buf.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
  server.close();
}
