/* Box-downscale a PNG to a max long-side dimension (preserving aspect), in
 * place.  RGBA, alpha-weighted RGB averaging so transparent edges don't bleed
 * dark halos.  Built on the in-repo dependency-free tools/png.mjs (no sharp /
 * Pillow needed).  Used to shrink oversized trait thumbnails that render in a
 * tiny tile.
 *
 *   node tools/resize_png.mjs <png> <maxPx>
 */
import { decode, encode } from './png.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , path, maxArg] = process.argv;
if (!path) { console.error('usage: node tools/resize_png.mjs <png> <maxPx>'); process.exit(1); }
const MAX = parseInt(maxArg, 10) || 128;

const src = decode(readFileSync(path));
const { width: sw, height: sh, data: sd } = src;
const scale = Math.min(1, MAX / Math.max(sw, sh));
if (scale >= 1) { console.log(`skip ${path}: already <= ${MAX}px (${sw}x${sh})`); process.exit(0); }

const dw = Math.max(1, Math.round(sw * scale));
const dh = Math.max(1, Math.round(sh * scale));
const dd = new Uint8Array(dw * dh * 4);

for (let dy = 0; dy < dh; dy++) {
  const sy0 = Math.floor((dy * sh) / dh);
  const sy1 = Math.max(sy0 + 1, Math.floor(((dy + 1) * sh) / dh));
  for (let dx = 0; dx < dw; dx++) {
    const sx0 = Math.floor((dx * sw) / dw);
    const sx1 = Math.max(sx0 + 1, Math.floor(((dx + 1) * sw) / dw));
    let r = 0, g = 0, b = 0, a = 0, aw = 0, n = 0;
    for (let y = sy0; y < sy1; y++) {
      for (let x = sx0; x < sx1; x++) {
        const i = (y * sw + x) * 4;
        const al = sd[i + 3];
        r += sd[i] * al; g += sd[i + 1] * al; b += sd[i + 2] * al;
        aw += al; a += al; n++;
      }
    }
    const di = (dy * dw + dx) * 4;
    if (aw > 0) { dd[di] = Math.round(r / aw); dd[di + 1] = Math.round(g / aw); dd[di + 2] = Math.round(b / aw); }
    dd[di + 3] = Math.round(a / n);
  }
}

writeFileSync(path, encode({ width: dw, height: dh, data: dd }));
console.log(`resized ${path}: ${sw}x${sh} -> ${dw}x${dh}`);
