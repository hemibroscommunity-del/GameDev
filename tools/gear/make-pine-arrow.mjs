/* Turn the owner's pine-arrow art into the shipping projectile texture.
 *
 *   node tools/gear/make-pine-arrow.mjs
 *
 * Owner: "You can use this art for the pine arrow."
 *
 * The source is a 2172x724 export with the arrow floating in it at ~1676x421
 * and a lot of transparent margin, which is not something to ship: the
 * projectile is drawn about 18 world px long, so 99.9% of that file would be
 * empty texture memory on a phone.  This crops to the artwork and downscales
 * to 64x16, which is roughly 1:1 with how big it lands on a retina screen.
 *
 * NEAREST would be wrong here.  The export is a smooth resample of pixel art
 * (380k of its pixels carry partial alpha, and run-lengths along the shaft
 * are mostly 1), so there is no clean pixel grid left to preserve — sampling
 * it hard just picks arbitrary sub-pixels.  A filtered downscale of an
 * already-filtered image is the honest option.
 *
 * The renderer takes the HEAD off a buried arrow (v2.3.1765, owner: "the
 * arrowhead should be stuck in the material"), so it needs to know where the
 * head starts.  That is measured here rather than eyeballed — scan in from
 * the right for the first column whose opaque pixels are green rather than
 * neutral steel — and printed, so the constant in effectsRenderer has a
 * provenance instead of being a number someone liked.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = 'tools/gear/src-art/arrow-pine.png';
const OUT = path.join(ROOT, 'public/sprites/projectiles/arrow-pine.png');
const OUT_W = 64, OUT_H = 16;

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__arrow = (src, ow, oh) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res({ error: 'load failed' });
  img.onload = () => {
    const W = img.width, H = img.height;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const p = c.getImageData(0, 0, W, H).data;

    /* bbox of the artwork */
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (p[(y * W + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

    /* where the steel head begins: scan in from the right for the first
       column whose opaque, non-outline pixels are GREEN rather than neutral */
    let headX = x1;
    for (let x = x1; x >= x0; x--) {
      let neutral = 0, green = 0;
      for (let y = y0; y <= y1; y++) {
        const q = (y * W + x) * 4;
        if (p[q + 3] < 80) continue;
        const r = p[q], g = p[q + 1], b = p[q + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 70) continue;                  /* black outline */
        if (g > r + 18 && g > b + 18) green++;
        else if (mx - mn < 40) neutral++;
      }
      if (green > neutral && green > 0) { headX = x; break; }
    }
    const headFrac = (headX - x0) / (bw - 1);

    /* crop + downscale, filtered (see the header note on NEAREST) */
    const out = document.createElement('canvas');
    out.width = ow; out.height = oh;
    const oc = out.getContext('2d');
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(cv, x0, y0, bw, bh, 0, 0, ow, oh);
    res({ x0, y0, bw, bh, headFrac, png: out.toDataURL('image/png') });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__a.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4287, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4287/__a.html');
const got = await page.evaluate(([s, w, h]) => window.__arrow(s, w, h), ['/' + SRC, OUT_W, OUT_H]);
if (got.error) { console.error('FAILED:', got.error); await browser.close(); srv.close(); process.exit(1); }

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(got.png.split(',')[1], 'base64'));
console.log(`  source artwork at (${got.x0},${got.y0}) ${got.bw}x${got.bh}`);
console.log(`  wrote sprites/projectiles/arrow-pine.png  ${OUT_W}x${OUT_H}`);
console.log(`  STEEL HEAD starts at ${(got.headFrac * 100).toFixed(1)}% of the length`);
console.log(`  -> ARROW_PINE.headFrac in effectsRenderer.js should be ${got.headFrac.toFixed(3)}`);
await browser.close();
srv.close();
