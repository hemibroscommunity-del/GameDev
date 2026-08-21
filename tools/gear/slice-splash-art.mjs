/* Cut the owner's title-screen art sheet into shippable PNGs (v2.3.1823).
 *
 *   node tools/gear/slice-splash-art.mjs
 *
 * Owner: "Do this improvement for the splash screen" + a single sheet
 * carrying the whole set — logo, BRO TOWN banner, two dividers, both
 * buttons WITH their labels painted in, a loose key, the note plate, and a
 * pile of glow/mote effects.  Then: "I had that art already attached."
 *
 * The sheet is one image on a BLACK ground, so it cannot ship as-is: every
 * piece would arrive in its own black box.  This turns it into transparent
 * PNGs, once, reproducibly — the same reasoning as make-pine-wood.mjs, and
 * for the same reason the source lives under tools/gear/src-art (outside
 * public/) rather than being read back out of public/ and re-keyed on every
 * run until it erodes.
 *
 * IT DOES NOT KEY ANYTHING, and that is the point.  The sheet LOOKS like
 * artwork on a black ground, but that black is the viewer compositing an
 * alpha channel the file already has: of 1.57M pixels only 319 are fully
 * opaque and 392k are fully transparent.  The first version of this script
 * treated the black as background and rebuilt the alpha by flood fill — and
 * produced a red rim along the top of the login plate and the logo, because
 * the sheet stores garbage RGB under its transparent pixels (a run of
 * (255,0,0) at alpha 1 above the button) and rebuilding the alpha promoted
 * that invisible garbage to fully opaque red.  So: crop, keep the alpha the
 * artist exported, and zero the colour of what is already invisible so no
 * later resize or filter can resurrect it.
 *
 * Rects were read off the sheet and are asserted by tools/qa/splash-slices
 * rendering every output; if the sheet is ever re-exported at a different
 * size the SHEET_W/H guard below fails loudly rather than cutting garbage.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHEET = 'tools/gear/src-art/splash/title-sheet.png';
const OUT = path.join(ROOT, 'public/ui/welcome/title');
/* The sheet these rects were measured against.  A different export is a
   different set of coordinates, and cutting anyway would produce plausible
   nonsense — the failure mode this repo keeps re-learning. */
const SHEET_W = 1150, SHEET_H = 1368;

/* name, x, y, w, h.  Generous margins on the glowing pieces: the glow IS
   part of the asset, and cropping it tight is what makes a painted button
   look like a sticker. */
const SLICES = [
  ['logo',         0,   0,  700, 452],
  ['banner',     691, 138,  452,  79],
  ['divider',    708, 242,  414,  78],
  ['divider-sm', 762, 345,  305,  95],
  /* The two plates are cut so their SOLID cores land at the same fraction of
     the slice (94%) and dead-centred horizontally.  Without that they render
     at different widths and ~8px out of line under one CSS width, because
     the sheet gives each plate a different glow margin — measured, not
     guessed: tools/qa/mp/mp-titlescreen.mjs asserts it. */
  ['btn-login',    5, 448,  815, 259],
  ['btn-create',   8, 707,  799, 212],
  ['note',        96, 922,  634, 132],
  ['key',        867, 476,  210, 264],
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__cut = (src, rects, sheetW, sheetH) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res({ error: 'load failed' });
  img.onload = () => {
    if (img.width !== sheetW || img.height !== sheetH) {
      return res({ error: 'sheet is ' + img.width + 'x' + img.height + ', expected ' + sheetW + 'x' + sheetH });
    }
    const out = [];
    for (const [name, x, y, w, h] of rects) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, x, y, w, h, 0, 0, w, h);
      const d = c.getImageData(0, 0, w, h);
      const p = d.data;
      /* Scrub the colour out of anything invisible.  Alpha is untouched —
         this only stops a transparent pixel's stored RGB from bleeding back
         when the browser filters the image on the way to the screen. */
      let solid = 0, scrubbed = 0;
      for (let k = 0; k < w * h; k++) {
        const i2 = k * 4;
        const a = p[i2 + 3];
        if (a >= 250) solid++;
        if (a <= 8) {
          if (p[i2] || p[i2 + 1] || p[i2 + 2]) scrubbed++;
          p[i2] = 0; p[i2 + 1] = 0; p[i2 + 2] = 0;
        }
      }
      c.putImageData(d, 0, 0);
      out.push({ name, w, h, solid, scrubbed, png: cv.toDataURL('image/png') });
    }
    res({ out });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__cut.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4281, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4281/__cut.html');

const got = await page.evaluate(
  ([s, r, w, h]) => window.__cut(s, r, w, h),
  ['/' + SHEET, SLICES, SHEET_W, SHEET_H],
);
if (got.error) {
  console.error('FAILED:', got.error);
  await browser.close(); srv.close();
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
for (const s of got.out) {
  const file = path.join(OUT, s.name + '.png');
  fs.writeFileSync(file, Buffer.from(s.png.split(',')[1], 'base64'));
  console.log(`  wrote ui/welcome/title/${s.name}.png  ${s.w}x${s.h}  opaque=${s.solid}px  scrubbed=${s.scrubbed}px`);
}
console.log(`${got.out.length} slice(s) written`);
await browser.close();
srv.close();
