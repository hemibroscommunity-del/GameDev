/* Recolour an ITEM ICON with the same brightness-ratio retint the in-world
 * monster sheets use (v2.3.1703).
 *
 * Owner: "the slime remnants for inventory thumbnail are still green, it needs
 * to be recoloured blue."  The Verdant Wilds slime went blue in v2.3.1534 via
 * src/rendering/monsterRecolor.js, which rebuilds its SHEETS at runtime — the
 * bag thumbnail is a separate authored .webp and nothing recoloured it, so the
 * pile you pick up was blue and the pile in your bag was green.
 *
 * The algorithm here is a deliberate copy of retintToCanvas() in
 * monsterRecolor.js, NOT a fresh idea: same reference luminance (mean opaque
 * luminance x1.15), same per-pixel target x (luminance / reference).  If that
 * one is ever retuned, retune this the same way or the icon and the monster
 * drift apart again — which is the whole bug.
 *
 * webp in, webp out, decoded and encoded by the Chromium that already ships
 * for the QA harness (there is no image codec in this repo's deps, and one
 * icon is not worth earning a native dependency — same call as the PNG
 * decoder in tools/qa/mp/harness.mjs).
 *
 *   node tools/recolor_item_icon.mjs <in.webp> <out.webp> <r,g,b>
 */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const [, , inPath, outPath, rgbArg] = process.argv;
if (!inPath || !outPath || !rgbArg) {
  console.error('usage: node tools/recolor_item_icon.mjs <in> <out> <r,g,b>');
  process.exit(2);
}
const rgb = rgbArg.split(',').map((n) => parseInt(n, 10));
if (rgb.length !== 3 || rgb.some((n) => !Number.isFinite(n))) {
  console.error(`bad colour "${rgbArg}" — want r,g,b`);
  process.exit(2);
}

const srcB64 = (await readFile(inPath)).toString('base64');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--disable-gpu', '--no-sandbox'],
});
const page = await browser.newPage();
const out = await page.evaluate(async ({ b64, target }) => {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('decode failed'));
    img.src = 'data:image/webp;base64,' + b64;
  });
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  /* --- verbatim from monsterRecolor.js retintToCanvas --- */
  let sum = 0, n = 0, maxL = 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l; n++; if (l > maxL) maxL = l;
    }
  }
  const ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
  const [tr, tg, tb] = target;
  let before = [0, 0, 0], after = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      before[0] += d[i]; before[1] += d[i + 1]; before[2] += d[i + 2];
      const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
      d[i] = Math.min(255, Math.round(tr * k));
      d[i + 1] = Math.min(255, Math.round(tg * k));
      d[i + 2] = Math.min(255, Math.round(tb * k));
      after[0] += d[i]; after[1] += d[i + 1]; after[2] += d[i + 2];
    }
  }
  ctx.putImageData(data, 0, 0);
  return {
    url: cv.toDataURL('image/webp', 0.95),
    w: cv.width, h: cv.height, opaque: n,
    meanBefore: before.map((v) => Math.round(v / Math.max(1, n))),
    meanAfter: after.map((v) => Math.round(v / Math.max(1, n))),
  };
}, { b64: srcB64, target: rgb });
await browser.close();

if (!out.url.startsWith('data:image/webp')) {
  console.error('Chromium did not encode webp; got ' + out.url.slice(0, 32));
  process.exit(1);
}
await writeFile(outPath, Buffer.from(out.url.split(',')[1], 'base64'));
console.log(`${inPath} -> ${outPath}  ${out.w}x${out.h}, ${out.opaque} opaque px`);
console.log(`  mean opaque RGB  ${out.meanBefore.join(',')}  ->  ${out.meanAfter.join(',')}`);
