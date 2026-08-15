/* Measure an FX sheet before processing it: does it have real alpha, or is
 * the "background" painted black/white?  Guessing this wrong is how a glow
 * sheet ships as a black square over the game.
 *
 * Uses the pinned Chromium (Playwright) because it is the only image decoder
 * in this sandbox — no PIL, no sharp, no ImageMagick.
 *
 * Run: node tools/qa/mp/inspect-sheets.mjs <file...>
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: inspect-sheets.mjs <png...>'); process.exit(2); }

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();

for (const f of files) {
  const b64 = readFileSync(f).toString('base64');
  const out = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let transparent = 0, opaque = 0, nearBlack = 0, nearWhite = 0;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    const OPAQUE_T = 8;      /* alpha above this counts as content */
    const LUMA_T = 18;       /* and so does luminance, for a black-backed sheet */
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const a = d[i + 3];
        const luma = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (a === 0) transparent++; else if (a === 255) opaque++;
        if (a > 200 && luma < 12) nearBlack++;
        if (a > 200 && luma > 243) nearWhite++;
        /* content = visible AND not the painted background */
        const isContent = a > OPAQUE_T && luma > LUMA_T;
        if (isContent) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const total = c.width * c.height;
    const corner = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    return {
      w: c.width, h: c.height,
      pctTransparent: +(100 * transparent / total).toFixed(1),
      pctFullyOpaque: +(100 * opaque / total).toFixed(1),
      pctNearBlackOpaque: +(100 * nearBlack / total).toFixed(1),
      pctNearWhiteOpaque: +(100 * nearWhite / total).toFixed(1),
      corners: { tl: corner(0, 0), tr: corner(c.width - 1, 0), bl: corner(0, c.height - 1) },
      contentBox: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    };
  }, `data:image/png;base64,${b64}`);
  console.log(f.split('/').pop());
  console.log('  ', JSON.stringify(out));
}

await browser.close();
