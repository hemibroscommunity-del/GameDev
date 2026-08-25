/* v2.3.1906: look at a sprite sheet, magnified. Chromium is the only image
   decoder in this sandbox (no PIL), so viewing art means rendering it.
   usage: node tools/dev/view-sheet.mjs <png> [frame] [zoom] [out.png] */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [, , src, frameArg = "0", zoomArg = "4", outArg, fwArg] = process.argv;
if (!src) { console.error('usage: view-sheet.mjs <png> [frame] [zoom] [out]'); process.exit(1); }
const frame = Number(frameArg), zoom = Number(zoomArg), FW = Number(fwArg || 256);
const out = outArg || `/tmp/sheet-${path.basename(src, '.png')}-f${frame}.png`;
const b64 = fs.readFileSync(src).toString('base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
await page.setContent(`<body style="margin:0;background:#20222a">
<canvas id=c></canvas>
<script>
window.__ready = new Promise((res) => {
  const im = new Image();
  im.onload = () => {
    const FW = ${FW}, F = ${frame}, Z = ${zoom};
    const c = document.getElementById('c');
    const fw = Math.min(FW, im.width - F * FW), fh = im.height;
    c.width = fw * Z; c.height = fh * Z;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#20222a'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, F * FW, 0, fw, fh, 0, 0, fw * Z, fh * Z);
    res({ w: im.width, h: im.height, frames: Math.round(im.width / FW) });
  };
  im.src = 'data:image/png;base64,${b64}';
});
</script></body>`);
const info = await page.evaluate(() => window.__ready);
console.log(`${src}  ${info.w}x${info.h}  frames=${info.frames}  -> ${out}`);
await page.locator('#c').screenshot({ path: out });
await browser.close();
