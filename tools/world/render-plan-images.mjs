/* ═══ v2.3.2931: THE PLAN, AS PICTURES FOR PEOPLE ═══
 *
 * Renders the pictures docs/WORLD-BIBLE.md shows, from the live plan, so
 * they cannot drift from it:
 *
 *   docs/world/wheel-plan.png    (v2.3.2936) the Wheel: every spoke by its
 *                                element's colour, its tiers banded, the
 *                                levels at its camps, and the gate at its tip
 *   docs/world/island-plan.png   the World Builder's map in Plan view -- the
 *                                whole island with every land square's name
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
      .replace('General Store', 'General\nStore').replace('Auction House', 'Auction\nHouse')
      .replace('Land Office', 'Land\nOffice').replace('Guild Hall', 'Guild\nHall').replace('Gem Works', 'Gem\nWorks').replace('Town Hall', 'Town\nHall');
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
    const { cellName, parseCell } = await import('/tools/world/core/grid.js');
    const mid = parseCell(S.plan.centre);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = mid.c + dc, r = mid.r + dr;
      const x = X(c * g.P + g.O / 2) + 30, y = Y(r * g.P + g.O / 2) + 16;
      if (x > 0 && y > 0 && x < OUTPX && y < OUTPX) label(cellName(c, r), x, y, 15, '#fff', 'rgba(0,0,0,0.55)');
    }
    const blob = await c.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return 'data:image/png;base64,' + btoa(s);
  });

  const wheel = await page.evaluate(async () => {
    const { renderOverview } = await import('/tools/world/core/layout.js');
    const { spokePoint } = await import('/tools/world/core/wheel.js');
    const { S } = window.__world;
    const bp = S.bp, W = bp.wheel, g = S.g, plan = S.plan;
    /* the plan's colours, every other tier a shade darker so the one-zone
       steps can be counted */
    const px = renderOverview(plan, bp, S.table);
    const ground = bp.classIds.indexOf('ground'), obstacle = bp.classIds.indexOf('obstacle');
    for (let i = 0; i < bp.w * bp.h; i++) {
      const t = bp.tier[i];
      if (!t || (bp.cls[i] !== ground && bp.cls[i] !== obstacle) || t % 2) continue;
      px[i * 4] *= 0.86; px[i * 4 + 1] *= 0.86; px[i * 4 + 2] *= 0.86;
    }
    const OUTPX = 1500, TOP = 70, FOOT = 190;
    const c = new OffscreenCanvas(OUTPX, OUTPX + TOP + FOOT), ctx = c.getContext('2d');
    ctx.fillStyle = '#10263f'; ctx.fillRect(0, 0, c.width, c.height);
    const base = new OffscreenCanvas(bp.w, bp.h);
    base.getContext('2d').putImageData(new ImageData(px, bp.w, bp.h), 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(base, 0, TOP, OUTPX, OUTPX);
    const k = OUTPX / (bp.w * bp.scale);
    const P = (p) => [(g.cx + p[0] * g.P - bp.x0) * k, TOP + (g.cy + p[1] * g.P - bp.y0) * k];
    const text = (t, x, y, size, color = '#fff', align = 'center', weight = 700) => {
      ctx.font = `${weight} ${size}px system-ui,-apple-system,sans-serif`;
      ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineJoin = 'round';
      ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
    };
    const realm = { shadow: ['Dark Sanctum', '#c9b6ff'], radiant: ['Light Summit', '#ffe98a'] };
    for (const s of W.spokes) {
      const rd = plan.regions[s.id];
      /* the levels at the camps */
      for (const t of plan.wheel.camps) {
        const [x, y] = P(spokePoint(s, W.tierMid(t), -0.62));
        text(String(W.levels(t)[1]), x, y, 19);
      }
      /* the gate and where it leads: past the tip, or under it for the two
         spokes that run to the picture's edges */
      const flat = s.uy === 0;
      const [gx0, gy0] = P(spokePoint(s, flat ? W.gateR - 0.35 : W.gateR + 1.05));
      const gx = Math.min(OUTPX - 105, Math.max(105, gx0)), gy = gy0 + (flat ? 70 : 0);
      const [nm, col] = realm[rd.realm];
      text(`→ ${nm}`, gx, gy + 13, 16, col);
      text(rd.gate.name.replace(/^the /, ''), gx, gy - 9, 15, '#fff', 'center', 600);
      /* the spoke's name and element, halfway out */
      const [nx, ny] = P(spokePoint(s, W.tierMid(9.5), 1.85));
      text(`${rd.name}`, nx, ny - 11, 22, '#fff');
      text(`${rd.element[0].toUpperCase() + rd.element.slice(1)}`, nx, ny + 12, 17, '#f3d9a2', 'center', 600);
    }
    const [bx, by] = P([0, -2.95]);
    text('Brotown', bx, by, 20);
    text('the Wheel: a spoke of land for every element', 30, 36, 30, '#fff', 'left');
    const lines = [
      'Each band along a spoke is one tier: one zone of walking (1,024 game px) and five levels, 16 tiers from level 1 at the commons to 80 at the tip.',
      'Numbers mark the camps (waystations) at levels 20, 40, 60 and 80. The rings are the passes that join neighbouring spokes at levels 20 and 60.',
      'Every tip holds a keystone gate to an endgame realm, levels 80–100: the Dark Sanctum from the compass points, the Light Summit from the diagonals.',
      'Between the spokes is sea. Brotown and its commons at the hub are safe. About 490 zones of land; the town to a gate is about two minutes at a run.',
    ];
    lines.forEach((t, i) => text(t, 30, TOP + OUTPX + 36 + i * 36, 17, '#dfe7ef', 'left', 500));
    const blob = await c.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < u.length; i += 32768) bin += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return 'data:image/png;base64,' + btoa(bin);
  });

  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, url] of [['wheel-plan.png', wheel], ['island-plan.png', island], ['brotown-plan.png', town]]) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`wrote docs/world/${name} (${Math.round(buf.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
  server.close();
}
