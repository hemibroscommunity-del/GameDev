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

/* Player + gear sheets -> LOSSLESS WebP (exact pixels: the recolor classifies
   skin/pants/shoes by exact RGB and the masked-body bake keys on alpha edges, so
   a lossy re-encode would corrupt them).  These are flat pixel art with lots of
   transparency, so lossless WebP is ~41-54% smaller than PNG.
   NOTE: monsters were tried and REVERTED -- their detailed strips don't compress
   (lossless saved ~8%, and lossy q90 came out LARGER than the PNG), so converting
   them made the download worse. Keep them as PNG. */
const ROOTS = [
  ['public/sprites/player', { lossless: true, effort: 6 }],
  ['public/sprites/gear',   { lossless: true, effort: 6 }],
];
const REPO = process.env.GITHUB_WORKSPACE || process.cwd();

function* walkPng(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkPng(p);
    else if (extname(e.name).toLowerCase() === '.png') yield p;
  }
}

let n = 0, pngTotal = 0, webpTotal = 0;
for (const [rel, webpOpts] of ROOTS) {
  const root = join(REPO, rel);
  if (!existsSync(root)) { console.log('skip (missing):', rel); continue; }
  for (const png of walkPng(root)) {
    const webp = png.replace(/\.png$/i, '.webp');
    const pngSize = statSync(png).size;
    await sharp(png).webp(webpOpts).toFile(webp);
    const webpSize = statSync(webp).size;
    n++; pngTotal += pngSize; webpTotal += webpSize;
    console.log(`${png.replace(REPO + '/', '')}: ${(pngSize / 1024).toFixed(0)}KB -> ${(webpSize / 1024).toFixed(0)}KB`);
  }
}
console.log(`\n${n} files: ${(pngTotal / 1048576).toFixed(2)}MB PNG -> ${(webpTotal / 1048576).toFixed(2)}MB WebP ` +
  `(saved ${((pngTotal - webpTotal) / 1048576).toFixed(2)}MB, ${pngTotal ? Math.round((1 - webpTotal / pngTotal) * 100) : 0}%)`);
