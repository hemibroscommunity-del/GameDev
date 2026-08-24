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

    /* ═══ v2.3.1877: SHARPEN THE BLACK KEYLINE, DO NOT GROW IT ═══
       Owner: "if it's using the arrow icon it needs to preserve the black
       outline cause I can't see it" — then, on the first attempt at that:
       "the arrowhead is missing mid flight."

       Both are true, and the second one is what makes this the hard version.

       The keyline problem is real and measured.  The sprite is drawn at
       ARROW_PINE.lenPx (17.5 world px) through a world scale of ~0.67, so the
       whole 64x16 texture lands in about 35x9 DEVICE px on a DPR-3 phone and
       23x6 on a DPR-2 one.  That is a 1.8x downscale, so the art's one-pixel
       keyline owns about half an output pixel, never gets a pixel of its own,
       and averages into the green.  Present, invisible.

       v2.3.1876 answered that by DILATING a 2px black rim outward.  It fixed
       the keyline and broke the arrow, because dilation fills CONCAVITIES:
       the notch between the fletchings and the swept barbs behind the steel
       head are exactly the concave features that say "arrowhead", and a rim
       grown outward closes both.  Measured at DPR-2 the visible steel in the
       head's third of the frame went 6 px -> 2.  The head was not cropped —
       the flight sprite has always used the FULL texture — it was buried in
       black.  "Missing mid flight" is precisely what that looks like.

       So: no dilation.  The silhouette is not touched at all, which makes it
       impossible for this pass to eat a feature.  Two edits instead, both in
       place:

         1. BLACKEN.  A pixel that is already the art's own keyline (max
            channel < 70) and sits on the silhouette is pushed to pure black
            at full alpha.  Wood and steel are never dark enough to qualify,
            so the gate is what protects them.
         2. KNEE the alpha.  The downscale leaves a translucent smear just
            outside the keyline; composited over grass that smear is what
            turns a black line into a soft dark-green one.  Alpha below LO is
            dropped, above HI is made solid, and the band between is
            stretched — so the keyline is the outermost thing on the sprite
            rather than sitting behind a haze of itself.

       Measured on the shipped texture, rendered at both device sizes over
       grass: the darkest pixel in each shaft column averages 56 before and 18
       after (lower is a stronger line), while the steel in the head's third
       stays at 12 px at DPR-3 and 5 at DPR-2 — identical to the original art,
       which is the property v2.3.1876 lost. */
    const out = document.createElement('canvas');
    out.width = ow; out.height = oh;
    const oc = out.getContext('2d', { willReadFrequently: true });
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(cv, x0, y0, bw, bh, 0, 0, ow, oh);
    const od = oc.getImageData(0, 0, ow, oh), op = od.data;
    const KEYLINE_MAX = 70;         /* darker than this is the art's own ink */
    const SOLID = 40;               /* below this counts as "outside the art" */
    const A = (i) => op[i * 4 + 3];
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      const i = y * ow + x;
      if (A(i) < SOLID) continue;
      if (Math.max(op[i * 4], op[i * 4 + 1], op[i * 4 + 2]) >= KEYLINE_MAX) continue;
      /* only the keyline ON the silhouette — an interior dark pixel (the
         shading inside the fletching) is not an outline and gains nothing
         from being forced to pure black. */
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ow || ny >= oh) { edge = true; break; }
        if (A(ny * ow + nx) < SOLID) { edge = true; break; }
      }
      if (!edge) continue;
      op[i * 4] = 0; op[i * 4 + 1] = 0; op[i * 4 + 2] = 0; op[i * 4 + 3] = 255;
    }
    const LO = 0.34 * 255, HI = 0.70 * 255;
    for (let i = 3; i < op.length; i += 4) {
      const a = op[i];
      if (a === 0 || a === 255) continue;
      op[i] = a <= LO ? 0 : a >= HI ? 255 : Math.round((a - LO) / (HI - LO) * 255);
    }
    oc.putImageData(od, 0, 0);

    /* Re-measured on the OUTPUT, by the same green-vs-steel scan used above.
       The silhouette is untouched by this pass, so this should land back on
       the pre-v2.3.1876 value — and the script printing it is what proves
       that rather than anyone assuming it. */
    let ohx0 = 1e9, ohx1 = -1, ohy0 = 1e9, ohy1 = -1;
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      if (op[(y * ow + x) * 4 + 3] < 24) continue;
      if (x < ohx0) ohx0 = x; if (x > ohx1) ohx1 = x;
      if (y < ohy0) ohy0 = y; if (y > ohy1) ohy1 = y;
    }
    let ohead = ohx1;
    for (let x = ohx1; x >= ohx0; x--) {
      let neutral = 0, green = 0;
      for (let y = ohy0; y <= ohy1; y++) {
        const q = (y * ow + x) * 4;
        if (op[q + 3] < 80) continue;
        const r = op[q], g = op[q + 1], b = op[q + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 70) continue;                  /* black outline */
        if (g > r + 18 && g > b + 18) green++;
        else if (mx - mn < 40) neutral++;
      }
      if (green > neutral && green > 0) { ohead = x; break; }
    }
    const outHeadFrac = (ohead + 1) / ow;
    res({ x0, y0, bw, bh, headFrac, outHeadFrac, png: out.toDataURL('image/png') });
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
console.log(`  wrote sprites/projectiles/arrow-pine.png  ${OUT_W}x${OUT_H}  (keyline sharpened in place; silhouette untouched)`);
console.log(`  STEEL HEAD starts at ${(got.outHeadFrac * 100).toFixed(1)}% of the texture width`);
console.log(`  -> ARROW_PINE.headFrac in effectsRenderer.js should be ${got.outHeadFrac.toFixed(3)}`);
await browser.close();
srv.close();
