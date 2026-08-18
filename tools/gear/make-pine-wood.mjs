/* Repaint the bow and staff art as PINE (v2.3.1763).
 *
 *   node tools/gear/make-pine-wood.mjs
 *
 * Owner: "I also want the first wood tier for staffs and bows to be pine.  Can
 * you recolor the bow and staff lighter to look like pine?"
 *
 * This is NOT the material-tint pipeline, and it cannot be: a Pixi tint
 * MULTIPLIES, so it can only darken, and the ask is for LIGHTER wood.  The art
 * itself has to change — so it changes here, once, reproducibly, rather than by
 * hand in an image editor.
 *
 * The sources live in tools/gear/src-art (outside public/, so they do not ship)
 * precisely so this is re-runnable: reading the SHIPPED file and writing back
 * over it would compound the curve every run, and nobody would notice until the
 * bow was bone white.
 *
 * The transform, on wood pixels only:
 *   - lift toward white with a screen curve (this is the "lighter"),
 *   - pull the hue toward pine's pale yellow-tan by lifting green a little
 *     harder than red and blue,
 *   - leave the near-black keyline alone, or the art loses its outline and
 *     starts to look like a sticker.
 * The bowstring and any metal fittings are near-neutral and very light, so the
 * saturation gate below leaves them where they are.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/gear/src-art');
const PUB = path.join(ROOT, 'public');

/* src (under tools/gear/src-art) -> destination (under public) */
const FILES = [
  ['bows/Bow2.webp', 'sprites/weapons/bows/Bow2.png'],
  ['bows/bow-south.webp', 'sprites/weapons/bows/bow-south.png'],
  ['bows/bow-southwest.webp', 'sprites/weapons/bows/bow-southwest.png'],
  ['bows/bow-east.webp', 'sprites/weapons/bows/bow-east.png'],
  ['bows/bow-northeast.webp', 'sprites/weapons/bows/bow-northeast.png'],
  ['bows/bow-north.webp', 'sprites/weapons/bows/bow-north.png'],
  ['staffs/Wizard Staff2.webp', 'sprites/weapons/staffs/Wizard Staff2.png'],
  ['icons/bow.webp', 'icons/items/bow.png'],
  ['icons/staff.webp', 'icons/items/staff.png'],
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__pine = (src) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res(null);
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height); const p = d.data;
    /* screen toward white by LIFT, then warm toward pine */
    const LIFT = 0.42;                 /* how far each channel travels to 255 */
    const WARM = [1.00, 1.03, 0.90];   /* pine reads yellow-tan, not pink */
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      /* keyline: near-black and near-neutral -> the outline, leave it */
      if (mx < 60 && mx - mn < 24) continue;
      const lift = (c0, k) => {
        const up = c0 + (255 - c0) * LIFT;
        return Math.max(0, Math.min(255, Math.round(up * k)));
      };
      p[i] = lift(r, WARM[0]);
      p[i + 1] = lift(g, WARM[1]);
      p[i + 2] = lift(b, WARM[2]);
    }
    c.putImageData(d, 0, 0);
    res({ w: cv.width, h: cv.height, png: cv.toDataURL('image/png') });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__pine.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(SRC, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4272, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4272/__pine.html');

let wrote = 0;
for (const [src, dest] of FILES) {
  const got = await page.evaluate((s) => window.__pine(s), '/' + src);
  if (!got) { console.log(`  MISSING SOURCE  ${src}`); continue; }
  const out = path.join(PUB, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(got.png.split(',')[1], 'base64'));
  console.log(`  wrote ${dest}  (${got.w}x${got.h})`);
  wrote++;
}
console.log(`${wrote} file(s) written from tools/gear/src-art`);
await browser.close();
srv.close();
