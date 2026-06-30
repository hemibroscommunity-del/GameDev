#!/usr/bin/env node
/* v2.3.1122: convert sprite-sheet PNGs to LOSSLESS WebP for smaller downloads.
 *
 * Lossless keeps every pixel EXACT, which matters because the runtime recolor
 * classifies skin/pants/shoes by exact RGB (playerSkins._isSkin etc.) and the
 * masked-body bake keys on alpha edges -- a lossy re-encode would shift those
 * and break recolor/masking.  The original .png is kept alongside as a fallback;
 * the client loaders (webpImage.loadWebpOrPng) request .webp first and fall back
 * to .png, so this is safe whether or not a given file got converted.
 *
 * Runs on CI (.github/workflows/optimize-assets.yml) because the dev sandbox has
 * no image tooling (sharp/cwebp absent, npm registry blocked).
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

/* Trees whose loaders go through the WebP-aware helpers (loadWebpOrPng /
   loadTextureWebpOrPng). v2.3.1122: player + gear + monsters. */
const ROOTS = ['public/sprites/player', 'public/sprites/gear', 'public/sprites/monsters'];
const REPO = process.env.GITHUB_WORKSPACE || process.cwd();

function* walkPng(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkPng(p);
    else if (extname(e.name).toLowerCase() === '.png') yield p;
  }
}

let n = 0, pngTotal = 0, webpTotal = 0;
for (const rel of ROOTS) {
  const root = join(REPO, rel);
  if (!existsSync(root)) { console.log('skip (missing):', rel); continue; }
  for (const png of walkPng(root)) {
    const webp = png.replace(/\.png$/i, '.webp');
    const pngSize = statSync(png).size;
    await sharp(png).webp({ lossless: true, effort: 6 }).toFile(webp);
    const webpSize = statSync(webp).size;
    n++; pngTotal += pngSize; webpTotal += webpSize;
    console.log(`${png.replace(REPO + '/', '')}: ${(pngSize / 1024).toFixed(0)}KB -> ${(webpSize / 1024).toFixed(0)}KB`);
  }
}
console.log(`\n${n} files: ${(pngTotal / 1048576).toFixed(2)}MB PNG -> ${(webpTotal / 1048576).toFixed(2)}MB WebP ` +
  `(saved ${((pngTotal - webpTotal) / 1048576).toFixed(2)}MB, ${pngTotal ? Math.round((1 - webpTotal / pngTotal) * 100) : 0}%)`);
