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
 *
 * ═══ v2.3.2328: THE PARAGRAPH ABOVE WAS A CLAIM, NOT A CHECK ═══
 * Until now nothing verified it, and this workflow had NEVER RUN -- there is no
 * "lossless WebP sprite copies" commit anywhere in the history.  So no twin in
 * the repo had been minted here; they were committed by hand, most of them by
 * tools/webp_convert.mjs, and 423 of the PNGs a cold load actually fetches had
 * no twin at all.
 *
 * Measured with tools/qa/qa-webp-lossless.mjs, TWO of the 118 twins that
 * existed were genuinely not their PNG: public/sprites/npc/mayor-bro.webp
 * (58 px, worst channel 152) and public/sprites/player/bow-south-weapon.webp
 * (3,721 px, worst 97).  Small, but the client PREFERS the .webp, so those were
 * the pixels players saw.
 *
 * Two is also a correction.  The first pass of that harness compared the files
 * through a <canvas> and reported 78 of 118 drifting at up to 255 -- all of it
 * an artefact of the canvas's premultiplied backing store mangling partially
 * transparent pixels, not a property of the files.  See docs/TRAPS.md section
 * 53; the short version is that a measurement of image fidelity must not go
 * near a 2D canvas.
 *
 * Which is exactly why this script now PROVES each twin rather than asserting
 * it, and does so with sharp's straight-alpha raw decode: every file is decoded
 * back and compared pixel for pixel, and one that differs, or that is not
 * actually smaller, is deleted rather than shipped.
 */
import { readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
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

/* Raw RGBA of a file, straight from the decoder -- no canvas, no premultiply.
   `ensureAlpha` so a PNG stored without an alpha channel still compares against
   a WebP that has one. */
const raw = (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

/* Exact comparison, with one deliberate exemption: a fully transparent pixel's
   RGB is undefined once alpha is 0, and encoders are free to rewrite it.  Alpha
   itself is never exempt -- the masked-body bake reads alpha edges. */
function diffPixels(a, b) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { dim: true };
  const x = a.data, y = b.data;
  let rgb = 0, alpha = 0, max = 0;
  for (let i = 0; i < x.length; i += 4) {
    const da = Math.abs(x[i + 3] - y[i + 3]);
    if (da) { alpha++; max = Math.max(max, da); }
    if (x[i + 3] === 0 && y[i + 3] === 0) continue;
    const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
    if (d) { rgb++; max = Math.max(max, d); }
  }
  return { rgb, alpha, max };
}

let n = 0, kept = 0, pngTotal = 0, webpTotal = 0, rejected = 0;
for (const [rel, webpOpts] of ROOTS) {
  const root = join(REPO, rel);
  if (!existsSync(root)) { console.log('skip (missing):', rel); continue; }
  for (const png of walkPng(root)) {
    const webp = png.replace(/\.png$/i, '.webp');
    const pngSize = statSync(png).size;
    n++;
    await sharp(png).webp(webpOpts).toFile(webp);
    const webpSize = statSync(webp).size;
    const name = png.replace(REPO + '/', '');

    /* PROVE it, then decide. A twin that is not byte-for-byte the same picture
       is worse than no twin at all: the client prefers .webp, so shipping a
       drifted one silently replaces the artist's art everywhere. */
    const d = diffPixels(await raw(png), await raw(webp));
    if (d.dim) {
      unlinkSync(webp); rejected++;
      console.log(`REJECT ${name}: webp decoded at a different size`);
      continue;
    }
    if (d.rgb || d.alpha) {
      unlinkSync(webp); rejected++;
      console.log(`REJECT ${name}: NOT lossless — ${d.rgb} rgb px, ${d.alpha} alpha px, worst channel ${d.max}`);
      continue;
    }
    if (webpSize >= pngSize) {
      unlinkSync(webp); rejected++;
      console.log(`REJECT ${name}: webp ${(webpSize / 1024).toFixed(0)}KB is not smaller than png ${(pngSize / 1024).toFixed(0)}KB`);
      continue;
    }
    kept++; pngTotal += pngSize; webpTotal += webpSize;
    console.log(`${name}: ${(pngSize / 1024).toFixed(0)}KB -> ${(webpSize / 1024).toFixed(0)}KB`);
  }
}
console.log(`\n${kept}/${n} converted (${rejected} rejected): ${(pngTotal / 1048576).toFixed(2)}MB PNG -> ${(webpTotal / 1048576).toFixed(2)}MB WebP ` +
  `(saved ${((pngTotal - webpTotal) / 1048576).toFixed(2)}MB, ${pngTotal ? Math.round((1 - webpTotal / pngTotal) * 100) : 0}%)`);

/* A rejection is information, not a failure: the PNG still serves and the client
   falls back to it. But if EVERY file is rejected, sharp or the options are
   broken and the run should not pass silently. */
if (n > 0 && kept === 0) { console.error('\nevery file was rejected — check sharp/lossless options'); process.exit(1); }
