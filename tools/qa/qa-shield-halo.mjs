/* ═══ QA: the shield art must not grow a grey halo back (v2.3.1875) ═══
 *
 *   node tools/qa/qa-shield-halo.mjs      (exit 0 = clean, 1 = halo found)
 *
 * Owner: "There's very slight grayish pixels around the shield (pine shield).
 * I noticed them in the southwest idle version of the character that shows in
 * the dashboard's blown up character view."
 *
 * The cause was baked into the pixels, not the renderer: the source art
 * carried a one-pixel ring of mid grey OUTSIDE its dark keyline — the remains
 * of the original artwork's antialias against whatever background it was cut
 * from — and the pine screen curve then lifted that ring from ~93 to ~187.
 * tools/gear/make-pine-wood.mjs peels it (the DEHALO block).
 *
 * This exists because that peel is a FLAG on three entries in that script's
 * FILES table.  Drop the flag, re-run the pipeline, and the halo comes back
 * silently in art nobody diffs — the shipped PNG would still look right in a
 * thumbnail.  So the property is asserted directly on the bytes instead.
 *
 * The property: every pixel on the shield's silhouette is either the dark
 * keyline or genuinely saturated wood.  A NEUTRAL pixel at mid or high
 * luminance on the silhouette is the halo, and there is no legitimate one —
 * measured across all three views before the fix, the edge held 59 dark + 53
 * halo (3q), 76 + 18 (side), 127 + 1 (front), with no light and no saturated
 * edge pixels at all.
 *
 * Chromium is the only image decoder in this sandbox, so it does the reading.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'public');

const VIEWS = ['wood-shield-3q', 'wood-shield-front', 'wood-shield-side'];
/* Deliberately NOT the same saturation threshold the peel uses, and the
   difference is the point: the peel runs on the SOURCE art, before the pine
   curve, where the halo is a flat grey at saturation 9-11.  This guard reads
   the SHIPPED art, after the curve's WARM multiply has pushed that same ring
   up to saturation 23-43.  Reusing the peel's 30 here scored only 9 of the 53
   halo pixels on the pre-fix 3q view — enough to fail, but it would have let
   a partial regression through.
   Measured on the shipped bytes, the two populations do not overlap: halo
   tops out at 43, and the lowest genuinely-saturated wood edge pixel is 60.
   52 sits in that gap. */
const HALO_LUM = 60, HALO_SAT = 52;
/* A couple of stragglers would be noise, not a regression; the real thing
   shows up in the dozens.  Anything above this fails. */
const TOLERANCE = 4;

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__halo = (src, lum, sat) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res(null);
  img.onload = () => {
    const W = img.width, H = img.height;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, W, H).data;
    const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[(y * W + x) * 4 + 3];
    let edge = 0; const bad = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (A(x - 1, y) && A(x + 1, y) && A(x, y - 1) && A(x, y + 1)) continue;
      edge++;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx >= lum && mx - mn < sat && bad.push({ x, y, rgb: [r, g, b] }) > 400) return;
    }
    res({ W, H, edge, bad });
  };
  img.src = src;
});
</script></body>`;

const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__halo.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(PUB, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4298, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4298/__halo.html');

let failed = 0;
for (const v of VIEWS) {
  const url = `/sprites/shields/${v}.png`;
  const r = await page.evaluate(([s, l, t]) => window.__halo(s, l, t), [url, HALO_LUM, HALO_SAT]);
  if (!r) { console.log(`  MISSING  ${url}`); failed++; continue; }
  const n = r.bad.length;
  const ok = n <= TOLERANCE;
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${v}.png  ${r.W}x${r.H}  ${r.edge} silhouette px, ${n} neutral/bright (halo) — limit ${TOLERANCE}`);
  if (!ok) {
    for (const p of r.bad.slice(0, 8)) console.log(`         (${p.x},${p.y}) rgb=${p.rgb}`);
    if (n > 8) console.log(`         ...and ${n - 8} more`);
  }
}

await browser.close();
srv.close();
if (failed) {
  console.error(`\nshield halo guard FAILED on ${failed} view(s).`);
  console.error('Re-run `node tools/gear/make-pine-wood.mjs` with the dehalo flag on the shield entries.');
  process.exit(1);
}
console.log('\nshield halo guard: clean');
