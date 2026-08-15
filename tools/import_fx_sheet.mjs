/* Import an owner FX sheet into the repo's 8x256 strip contract.
 *
 * The repo's effect strips (EFFECT_BURSTS, GESTURE_TOOLS, SWORD_SLASH) are all
 * "N equal cells across one row", and effectsRenderer slices them with
 * `Math.floor(width / 8)`.  Owner art does not arrive that way: the sheets are
 * whatever the generator produced (2172x724 for the stun/whirl pair), with a
 * lot of empty margin and a width that is not a multiple of 8 — which makes
 * the naive slice drift a few px by the last frame and wastes most of the
 * texture on transparency.
 *
 * This normalises one sheet to 2048x256 (8 cells of 256), which is exactly the
 * contract the existing loaders expect.
 *
 * THE CROP IS GLOBAL, NOT PER-FRAME.  Every cell is cut from the same source
 * rows with the same scale, so motion between frames is preserved.  Fitting
 * each frame to its own bounding box would centre a ring that is supposed to
 * be orbiting, and the animation would jitter in place instead of spinning.
 *
 * Chromium is the only image decoder in this sandbox (no PIL / sharp /
 * ImageMagick), so Playwright does the pixel work.
 *
 * Run: node tools/import_fx_sheet.mjs <src.png> <dest.png> [frames]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [src, dest, framesArg] = process.argv.slice(2);
if (!src || !dest) { console.error('usage: import_fx_sheet.mjs <src.png> <dest.png> [frames]'); process.exit(2); }
const FRAMES = Number(framesArg) || 8;
const CELL = 256;

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();

const b64 = readFileSync(src).toString('base64');
const result = await page.evaluate(async ({ dataUrl, FRAMES, CELL }) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const sc = document.createElement('canvas');
  sc.width = img.width; sc.height = img.height;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);
  const d = sctx.getImageData(0, 0, sc.width, sc.height).data;

  /* Content rows: any pixel with real alpha.  These sheets carry true
     transparency (verified with inspect-sheets.mjs), so alpha alone is the
     right test — no luminance keying, which would eat the dark core of the
     whirlpool. */
  let minY = sc.height, maxY = -1;
  for (let y = 0; y < sc.height; y++) {
    for (let x = 0; x < sc.width; x++) {
      if (d[(y * sc.width + x) * 4 + 3] > 8) { if (y < minY) minY = y; if (y > maxY) maxY = y; break; }
    }
  }
  if (maxY < 0) return { error: 'sheet is fully transparent' };
  /* Pad so a soft glow edge is not clipped by the crop. */
  const pad = Math.round((maxY - minY + 1) * 0.10);
  const cropY = Math.max(0, minY - pad);
  const cropH = Math.min(sc.height - cropY, (maxY - minY + 1) + pad * 2);

  const cellW = sc.width / FRAMES;   /* fractional on purpose — see header */
  const out = document.createElement('canvas');
  out.width = CELL * FRAMES; out.height = CELL;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  /* "contain" fit, identical for every cell. */
  const scale = Math.min(CELL / cellW, CELL / cropH);
  const dw = cellW * scale, dh = cropH * scale;
  const offX = (CELL - dw) / 2, offY = (CELL - dh) / 2;
  for (let i = 0; i < FRAMES; i++) {
    octx.drawImage(sc, i * cellW, cropY, cellW, cropH, i * CELL + offX, offY, dw, dh);
  }
  return {
    dataUrl: out.toDataURL('image/png'),
    srcW: sc.width, srcH: sc.height, cropY, cropH, cellW: +cellW.toFixed(1),
    scale: +scale.toFixed(3), outW: out.width, outH: out.height,
  };
}, { dataUrl: `data:image/png;base64,${b64}`, FRAMES, CELL });

await browser.close();
if (result.error) { console.error(result.error); process.exit(1); }

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, Buffer.from(result.dataUrl.split(',')[1], 'base64'));
console.log(`${src.split('/').pop()} -> ${dest}`);
console.log(`  src ${result.srcW}x${result.srcH}  crop y=${result.cropY} h=${result.cropH}`
  + `  cell ${result.cellW}  scale ${result.scale}  out ${result.outW}x${result.outH}`);
