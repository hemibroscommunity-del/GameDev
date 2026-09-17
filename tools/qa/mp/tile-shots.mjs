/* Tile several out/*.png into one contact strip (Chromium canvas — this box
   has no ImageMagick).  node tools/qa/mp/tile-shots.mjs <out-name> <cols> <name...> */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = `${REPO}/tools/qa/mp/out`;
const [name, colsRaw, ...names] = process.argv.slice(2);
const cols = +colsRaw || 3;
const srcs = names.map((n) => `data:image/png;base64,${readFileSync(`${OUT}/${n}.png`).toString('base64')}`);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const data = await page.evaluate(async ({ srcs, cols }) => {
  const imgs = await Promise.all(srcs.map((s) => new Promise((r, j) => {
    const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s;
  })));
  const w = Math.max(...imgs.map((i) => i.width)), h = Math.max(...imgs.map((i) => i.height)), G = 4;
  const rows = Math.ceil(imgs.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * w + (cols - 1) * G; cv.height = rows * h + (rows - 1) * G;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#0d1518'; cx.fillRect(0, 0, cv.width, cv.height);
  imgs.forEach((im, k) => cx.drawImage(im, (k % cols) * (w + G), Math.floor(k / cols) * (h + G)));
  return cv.toDataURL('image/png');
}, { srcs, cols });
writeFileSync(`${OUT}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log(`${name}.png  ${names.length} frames, ${cols} cols`);
