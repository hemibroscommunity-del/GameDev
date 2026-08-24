/* ═══ QA: the arrow keeps its head AND gains a black outline (v2.3.1877) ═══
 *
 *   node tools/qa/qa-arrow-art.mjs      (exit 0 = ok, 1 = regressed)
 *
 * This exists because the test that should have caught the v2.3.1876
 * regression could not, and it is worth being precise about why.
 *
 * mp-proj asserts "an arrow in flight is drawn, WITH ITS HEAD" through
 * arrowProbe, which counts _arrowHeadsDrawn — a tally of what the draw call
 * CHOSE.  That was the right instrument for v2.3.1765, where the question was
 * whether the renderer picked the headless texture.  It is blind to the
 * question here: v2.3.1876 handed the flight sprite the full texture, tally
 * intact, and buried the arrowhead in black inside the ART.  The counter said
 * yes while the player saw no head.  Owner: "the arrowhead is missing mid
 * flight."
 *
 * So this asserts on PIXELS, and on the two properties the owner named, at
 * the size the arrow is actually drawn:
 *
 *   1. THE HEAD IS THERE.  The sprite is ARROW_PINE.lenPx (17.5 world px)
 *      wide through a world scale of ~0.67, so it lands in ~35 device px on a
 *      DPR-3 phone and ~23 on a DPR-2 one.  Rendered at those two widths over
 *      grass, the head's third of the frame must still hold bright neutral
 *      (steel) pixels.  Baselines measured on the art the owner approved: 12
 *      at 35px, 6 at 23px.  v2.3.1876 scored 9 and 2.
 *
 *   2. THE OUTLINE IS BLACK.  Darkest pixel per column across the shaft,
 *      averaged.  Lower is a stronger line.  The original art scores 43 at
 *      35px — a soft dark green, which is the "I can't see it" the owner
 *      reported; the sharpened keyline scores 0.
 *
 * Chromium is the only image decoder in this sandbox, so it does the reading.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = '/public/sprites/projectiles/arrow-pine.png';

/* width in device px, min steel px in the head third, max shaft darkness.
   The steel floors are the approved art's own scores, so this fails on any
   loss rather than on some fraction of one; the darkness ceilings sit between
   the original (76 / 43) and the sharpened line (64 / 0), so the guard also
   fails if a future pass quietly gives the outline back. */
const CASES = [
  { px: 23, minSteel: 6, maxShaftDark: 70, label: 'DPR-2 phone' },
  { px: 35, minSteel: 12, maxShaftDark: 20, label: 'DPR-3 phone' },
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
const ld = (s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
window.__arrowArt = async (src, w) => {
  const im = await ld(src);
  const h = Math.round(w * im.height / im.width);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  /* over GRASS, because that is what the arrow flies across and a black line
     on a white page proves nothing about a black line on green. */
  x.fillStyle = '#4e7a3a'; x.fillRect(0, 0, w, h);
  x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let steel = 0;
  for (let y = 0; y < h; y++) for (let px = Math.floor(w * 0.66); px < w; px++) {
    const i = (y * w + px) * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 120 && mx - mn < 45) steel++;
  }
  let dark = 0, cols = 0;
  for (let px = Math.floor(w * 0.35); px < Math.floor(w * 0.62); px++) {
    let mn = 999;
    for (let y = 0; y < h; y++) {
      const i = (y * w + px) * 4;
      const v = Math.max(d[i], d[i + 1], d[i + 2]);
      if (v < mn) mn = v;
    }
    if (mn < 999) { dark += mn; cols++; }
  }
  return { w, h, steel, shaftDark: +(dark / Math.max(1, cols)).toFixed(1) };
};
</script></body>`;

const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__arrow.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4313, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4313/__arrow.html');

let failed = 0;
for (const c of CASES) {
  const r = await page.evaluate(([s, w]) => window.__arrowArt(s, w), [ART, c.px]);
  const headOk = r.steel >= c.minSteel;
  const lineOk = r.shaftDark <= c.maxShaftDark;
  if (!headOk) failed++;
  if (!lineOk) failed++;
  console.log(`  ${c.label} (${r.w}x${r.h})`);
  console.log(`    ${headOk ? 'ok  ' : 'FAIL'} arrowhead visible: ${r.steel} steel px (need >= ${c.minSteel})`);
  console.log(`    ${lineOk ? 'ok  ' : 'FAIL'} outline is black:  shaft darkest ${r.shaftDark} (need <= ${c.maxShaftDark})`);
}

await browser.close();
srv.close();
if (failed) {
  console.error(`\narrow art guard FAILED (${failed} check(s)).`);
  console.error('Re-run `node tools/gear/make-pine-arrow.mjs`. If a pass there grows the');
  console.error('silhouette, it will fill the fletching notch and the barbs behind the head —');
  console.error('that is what buried the arrowhead at v2.3.1876.');
  process.exit(1);
}
console.log('\narrow art guard: head intact, outline black');
