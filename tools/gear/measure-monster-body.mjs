/* Measure what a monster sprite actually DRAWS, in world pixels.
 *
 *   node tools/gear/measure-monster-body.mjs
 *
 * Every hit radius in projectiles.js claims to be "the measured body", and
 * two of them carry the arithmetic in a comment (the slime's
 * `48 * 0.75 * 1.5 / 2 = 27`).  Nothing re-measured them, so a re-cut sheet
 * moves the art and leaves the number behind -- which is how the slime's
 * anchor drifted for 700 versions (v2.3.1824) and how its shadow ended up in
 * the road (v2.3.1704).  TRAPS #21: look at the crop, do not trust the loose
 * classifier that was right once.
 *
 * WHAT IT PRINTS, per sheet: the opaque bounding box of every frame, the
 * WIDEST frame (a slime squashes and stretches through its idle loop, so one
 * frame is not the body), and that width converted to world px through the
 * two scales the renderer applies -- liveScalePx / FRAME_W, then
 * MONSTER_SIZE_MULT.  The half of that is the honest hit radius.
 *
 * Decoded in a real browser for the same reason make-pine-arrow.mjs is: this
 * sandbox has no image library, and the browser's decoder is the one the game
 * itself will use.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* frameW/H and the draw scales are the renderer's own, quoted with their
   source so a change there shows up as a disagreement here. */
const SHEETS = [
  { name: 'slime idle',  url: 'public/sprites/monsters/slime-idle-v5.png',
    frameW: 128, frameH: 128, liveScalePx: 96, sizeMult: 1.5 },
  { name: 'slime hit',   url: 'public/sprites/monsters/slime-hit-v1.png',
    frameW: 128, frameH: 128, liveScalePx: 96, sizeMult: 1.5 },
  { name: 'slime shoot', url: 'public/sprites/monsters/slime-shoot-v2.png',
    frameW: 128, frameH: 128, liveScalePx: 96, sizeMult: 1.5 },
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__measure = (src, fw, fh) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res({ error: 'load failed: ' + src });
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const p = c.getImageData(0, 0, img.width, img.height).data;
    const W = img.width, H = img.height;
    const n = Math.max(1, Math.floor(W / fw));
    const frames = [];
    for (let k = 0; k < n; k++) {
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < Math.min(fh, H); y++) {
        for (let x = k * fw; x < (k + 1) * fw && x < W; x++) {
          if (p[(y * W + x) * 4 + 3] < 24) continue;
          const lx = x - k * fw;
          if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      frames.push(x1 < 0 ? null : { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    res({ W, H, n, frames });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__m.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4291, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4291/__m.html');

for (const sh of SHEETS) {
  const got = await page.evaluate(([s, fw, fh]) => window.__measure(s, fw, fh),
    ['/' + sh.url, sh.frameW, sh.frameH]);
  if (got.error) { console.log(`${sh.name}: ${got.error}`); continue; }
  const live = got.frames.filter(Boolean);
  const widest = live.reduce((a, b) => (b.w > a.w ? b : a), live[0]);
  const tallest = live.reduce((a, b) => (b.h > a.h ? b : a), live[0]);
  const k = (sh.liveScalePx / sh.frameW) * sh.sizeMult;
  console.log(`\n${sh.name}  (${got.n} frames of ${sh.frameW}x${sh.frameH})`);
  console.log(`  widest frame: ${widest.w} frame-px  ->  ${(widest.w * k).toFixed(1)} world px wide`
    + `  ->  HALF-WIDTH ${(widest.w * k / 2).toFixed(1)}`);
  console.log(`  tallest frame: ${tallest.h} frame-px  ->  ${(tallest.h * k).toFixed(1)} world px tall`);
  const ws = live.map((f) => f.w);
  console.log(`  per-frame widths: min ${Math.min(...ws)}  median ${ws.slice().sort((a, b) => a - b)[ws.length >> 1]}  max ${Math.max(...ws)}`);
  console.log(`  scale: liveScalePx/frameW ${(sh.liveScalePx / sh.frameW).toFixed(4)} x sizeMult ${sh.sizeMult} = ${k.toFixed(4)}`);
}

await browser.close();
srv.close();
