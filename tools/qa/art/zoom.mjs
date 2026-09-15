/* MAGNIFY A REGION OF A SPRITE SHEET (v2.3.2510).
 *
 * The standing rule for art in this repo is docs/TRAPS.md §21: it is decided on
 * a render and never by eye at game size or on a number alone.  A pixel-art eye
 * is four pixels across; there is no looking at it without a magnifier, and the
 * only image decoder in this sandbox is Chromium (CLAUDE.md -- no PIL, no
 * sharp), so this is the magnifier.
 *
 *   node tools/qa/art/zoom.mjs FILE --scale=20 [--frame=N --frameW=130]
 *                                   [--crop=x,y,w,h] [--out=PATH]
 *
 * With --frame the file is treated as a horizontal strip and --crop is relative
 * to that frame; without it, to the whole image.  Nearest-neighbour throughout:
 * a smoothed blow-up of pixel art is a picture of the smoothing.
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename } from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file || !existsSync(file)) { console.error('usage: zoom.mjs FILE [--scale=20] [--frame=N --frameW=W] [--crop=x,y,w,h] [--out=PATH]'); process.exit(2); }
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const SCALE = +arg('scale', '20');
const FRAME = arg('frame', null) === null ? null : +arg('frame', '0');
const FRAMEW = arg('frameW', null) === null ? null : +arg('frameW', '0');
const CROP = arg('crop', null);
const OUT = arg('out', `/tmp/zoom-${basename(file).replace(/\.\w+$/, '')}.png`);

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const out = await page.evaluate(async (o) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = o.url; });
  const fw = o.frameW || (o.frame !== null ? img.height : img.width);
  const ox = (o.frame !== null) ? o.frame * fw : 0;
  let [cx, cy, cw, ch] = o.crop ? o.crop.split(',').map(Number) : [0, 0, fw, img.height];
  const cv = document.createElement('canvas');
  cv.width = cw * o.scale; cv.height = ch * o.scale;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  /* a checkerboard, so transparent and black are not the same picture */
  const S = Math.max(4, o.scale);
  for (let y = 0; y < cv.height; y += S) {
    for (let x = 0; x < cv.width; x += S) {
      g.fillStyle = (((x / S) + (y / S)) % 2) ? '#22303c' : '#1a2530';
      g.fillRect(x, y, S, S);
    }
  }
  g.drawImage(img, ox + cx, cy, cw, ch, 0, 0, cv.width, cv.height);
  return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height, imgW: img.width, imgH: img.height, fw };
}, { url: `data:image/png;base64,${readFileSync(file).toString('base64')}`,
     scale: SCALE, frame: FRAME, frameW: FRAMEW, crop: CROP });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(out.url.split(',')[1], 'base64'));
console.log(`${file}: ${out.imgW}x${out.imgH}, frame width ${out.fw} -> ${OUT} (${out.w}x${out.h})`);
await browser.close();
