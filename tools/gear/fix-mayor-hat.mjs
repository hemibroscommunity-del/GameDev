/* Take the grey rim off Mayor Bro's top hat (v2.3.1829).
 *
 *   node tools/gear/fix-mayor-hat.mjs          # write
 *   BT_DRY=1 node tools/gear/fix-mayor-hat.mjs # report only, touch nothing
 *
 * Owner: "Mayor bro has slight gray artifact around his black top hat can you
 * remove that."
 *
 * WHAT IT ACTUALLY IS, measured before changing anything.  It is NOT an alpha
 * matte: both sprites are fully binary alpha (zero semi-transparent pixels),
 * so there is no fringe to un-premultiply.  It is a 1px band of neutral dark
 * grey PAINTED along the hat's outer edge — down the right side of the crown,
 * across the top of both brim wings and round the brim's ends — where every
 * other edge in the sprite is outlined near-black.  At 96px source blown up
 * to a ~250px portrait that band lands at ~2.6 screen px, which is exactly
 * the "slight" grey the owner is seeing.
 *
 * THE RULE, and why it is this one.  Only grey that sits on the SILHOUETTE
 * is touched: a pixel qualifies when it is neutral (max-min small), in the
 * dark-to-mid band, inside the hat's rows, and within one pixel of
 * transparency.  That is "around the hat" literally, and it leaves the hat's
 * interior shading alone — the crown carries a deliberate lighter face on its
 * left, and flattening that would be repainting the art rather than cleaning
 * an edge.  His grey HAIR is neutral too, which is why the row bound matters:
 * without it the same rule would eat the hair's outline.
 *
 * Recoloured to the hat's own outline black rather than made transparent:
 * the silhouette keeps its shape, and the edge then matches the black
 * keyline the rest of the sprite already uses.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DRY = !!process.env.BT_DRY;

/* src (under tools/gear/src-art) -> dest (under public), and the LAST row of
   the hat.  Measured per sprite: the head crop is 96px with the brim ending
   at row 37; the full figure is 256px and its hat ends at row 62.  Anything
   below is face, hair or coat and must not be touched. */
const FILES = [
  ['npc/mayor-bro-head.webp', 'sprites/npc/mayor-bro-head.webp', 40],
  ['npc/mayor-bro.webp', 'sprites/npc/mayor-bro.webp', 66],
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__fix = (src, hatBottom) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res({ error: 'load failed' });
  img.onload = () => {
    const W = img.width, H = img.height;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, W, H);
    const p = d.data;
    const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : p[(y * W + x) * 4 + 3];

    /* THE TWO BANDS, measured off the shipped art before anything changed:
         the hat's own keyline sits at max-channel 56-64,
         the grey rim the owner is reporting sits at 67-89.
       They do not overlap, so the split is a stated number with a provenance
       rather than a statistic squeezed out of a handful of pixels — the two
       earlier attempts at deriving it (darkest pixel, then modal RGB) both
       landed on near-black because the outline is dithered across a dozen
       near-identical tones and no single one is common.  If the art is ever
       redrawn these numbers must be re-measured; the dry run prints what it
       would touch so that is a two-second check, not a leap. */
    const KEYLINE_MAX = 65;   /* the hat's real outline, left alone */
    const FLOOR = 66;         /* at or above this, on the silhouette, is the rim */
    const CEIL = 215;         /* above this is a highlight, not the rim */

    const onSil = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (A(x + dx, y + dy) < 40) return true;
      }
      return false;
    };

    /* The tone to paint the rim: the MEDIAN of the hat's genuine keyline
       pixels.  Median rather than mode because the keyline is dithered, and
       rather than the darkest because that is pure black on a sprite whose
       outline is not — a black line round a grey-black hat is a different
       artifact, not a fix. */
    const keys = [];
    for (let y = 0; y < Math.min(H, hatBottom); y++) for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4;
      if (p[q + 3] < 200) continue;
      const r = p[q], g = p[q + 1], b = p[q + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn > 26 || mx > KEYLINE_MAX || mx < 30) continue;
      if (!onSil(x, y)) continue;
      keys.push([r, g, b, mx]);
    }
    if (keys.length < 8) return res({ error: 'too few keyline pixels (' + keys.length + ') to trust a median' });
    keys.sort((u, v) => u[3] - v[3]);
    const ink = keys[keys.length >> 1].slice(0, 3);
    const inkL = Math.max(ink[0], ink[1], ink[2]);
    const inkN = keys.length;

    const changed = [];
    for (let y = 0; y < Math.min(H, hatBottom); y++) for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4;
      if (p[q + 3] < 200) continue;
      const r = p[q], g = p[q + 1], b = p[q + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      /* neutral, and lighter than the ink but not a highlight or the red band */
      if (mx - mn > 26) continue;
      if (mx < FLOOR || mx > CEIL) continue;
      if (!onSil(x, y)) continue;
      changed.push({ x, y, was: [r, g, b] });
      p[q] = ink[0]; p[q + 1] = ink[1]; p[q + 2] = ink[2];
    }
    c.putImageData(d, 0, 0);
    /* WebP so the shipped filename and every reference to it stay put —
       Chromium encodes it, unlike the sandbox's other tooling.

       QUALITY 1, WHICH IS LOSSLESS, and that is not a nicety.  The default
       (0.92) re-encoded this 96px sprite with 3445 pixels changed — 2369 of
       them OUTSIDE the hat, on his face, hair and chain, with a max channel
       shift of 142.  Fixing 54 pixels of rim by smearing the other 2369 is a
       worse bug than the one being fixed, and it would have shipped
       invisibly: measured with a source-vs-output pixel diff, not by eye.
       Lossless costs ~1.4KB on this file. */
    const webp = cv.toDataURL('image/webp', 1);
    res({ W, H, ink, inkL, inkN, floor: FLOOR, changed: changed.length, sample: changed.slice(0, 6),
      webp, isWebp: webp.indexOf('data:image/webp') === 0 });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__h.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4294, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4294/__h.html');

let wrote = 0;
for (const [src, dest, hatBottom] of FILES) {
  const got = await page.evaluate(([s, hb]) => window.__fix(s, hb),
    ['/tools/gear/src-art/' + src, hatBottom]);
  if (got.error) { console.log(`  FAILED ${src}: ${got.error}`); continue; }
  console.log(`  ${src}  ${got.W}x${got.H}  keyline=rgb(${got.ink}) x${got.inkN}  floor=${got.floor}  rim recoloured: ${got.changed}px`);
  if (got.sample.length) console.log(`     e.g. ${got.sample.map((s) => `(${s.x},${s.y}) rgb(${s.was})`).join('  ')}`);
  if (!got.isWebp) { console.log('  FAILED: this browser did not encode WebP — refusing to write a mislabelled file'); continue; }
  if (DRY) { console.log('     (dry run — not written)'); continue; }
  const out = path.join(ROOT, 'public', dest);
  fs.writeFileSync(out, Buffer.from(got.webp.split(',')[1], 'base64'));
  console.log(`     wrote ${dest}`);
  wrote++;
}
console.log(DRY ? 'dry run complete' : `${wrote} file(s) written`);
await browser.close();
srv.close();
