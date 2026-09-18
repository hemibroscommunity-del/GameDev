/* IMPORT A BUILDING SPRITE THE OWNER SENT  (v2.3.2628).
 *
 *   node tools/import-building-art.mjs <in.png> <out.png> [--h=512] [--report]
 *
 * The owner sends building art as a big square canvas with the building
 * floating in a transparent margin (1254x1254 is the usual export).  Three
 * things have to happen before it can sit in public/sprites/props beside the
 * rest of the family, and each of them has been got wrong here before:
 *
 * 1. TRIM TO THE ALPHA BBOX.  worldProps places a prop by its worldH and a
 *    bottom-centre anchor, so a sprite with 200px of empty canvas under it
 *    floats 200px above the ground and reads as the wrong size.  Every
 *    building already in the family is trimmed; a new one that is not would
 *    be the odd one out in a way that is hard to diagnose from the picture.
 *
 * 2. RESIZE PREMULTIPLIED.  Averaging straight RGBA lets transparent black
 *    bleed into every antialiased edge and leaves a dark halo round the
 *    roofline (the note in worldProps' auction-house entry, v2.3.2626).  So
 *    the RGB average is weighted by alpha and the result un-premultiplied.
 *
 * 3. ENCODE WITH ADAPTIVE ROW FILTERS.  tools/png.mjs writes filter None on
 *    every row, which on painted art costs more bytes than the source it
 *    started from -- putting a 2.4MB painting through tools/resize_png.mjs
 *    produced 3.3MB (v2.3.2627, the auction-house interior).  Per-row filter
 *    selection by the spec's own minimum-sum-of-absolute-differences
 *    heuristic gets it back under the source.
 *
 * --report prints the trim box, the scale and the before/after bytes without
 * writing anything, which is how a size is chosen before it is committed.
 */
import zlib from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { decode } from './png.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const [SRC, OUT] = args.filter((a) => !a.startsWith('--'));
const TARGET_H = +arg('h', '512');
const REPORT = args.includes('--report');
if (!SRC) { console.error('usage: node tools/import-building-art.mjs <in.png> <out.png> [--h=512] [--report]'); process.exit(1); }

const src = decode(readFileSync(SRC));
const { width: sw, height: sh, data: sd } = src;

/* 1. the alpha bbox.  Threshold 8, matching tools/qa/art/*: a soft edge still
      counts as art, a stray 1-alpha pixel does not. */
let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
  if (sd[(y * sw + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
if (x1 < 0) { console.error(SRC + ': fully transparent'); process.exit(1); }
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

const scale = Math.min(1, TARGET_H / bh);
const dw = Math.max(1, Math.round(bw * scale)), dh = Math.max(1, Math.round(bh * scale));

if (REPORT) {
  console.log(JSON.stringify({ src: [sw, sh], bbox: { x0, y0, x1, y1, w: bw, h: bh }, out: [dw, dh], scale: +scale.toFixed(4), srcKB: +(readFileSync(SRC).length / 1024).toFixed(0) }, null, 1));
  if (!OUT) process.exit(0);
}

/* 2. the premultiplied box downscale. */
const rgba = new Uint8Array(dw * dh * 4);
for (let dy = 0; dy < dh; dy++) {
  const sy0 = y0 + Math.floor((dy * bh) / dh), sy1 = y0 + Math.max(Math.floor((dy * bh) / dh) + 1, Math.floor(((dy + 1) * bh) / dh));
  for (let dx = 0; dx < dw; dx++) {
    const sx0 = x0 + Math.floor((dx * bw) / dw), sx1 = x0 + Math.max(Math.floor((dx * bw) / dw) + 1, Math.floor(((dx + 1) * bw) / dw));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      const i = (y * sw + x) * 4, A = sd[i + 3];
      r += sd[i] * A; g += sd[i + 1] * A; b += sd[i + 2] * A; a += A; n++;
    }
    const o = (dy * dw + dx) * 4;
    const A = a / n;
    rgba[o + 3] = Math.round(A);
    /* un-premultiply; a fully transparent cell keeps colour 0 and never
       contributes to anything drawn. */
    if (a > 0) { rgba[o] = Math.round(r / a); rgba[o + 1] = Math.round(g / a); rgba[o + 2] = Math.round(b / a); }
  }
}

/* 3. the encode. */
const BPP = 4, stride = dw * BPP;
const out = Buffer.alloc((stride + 1) * dh);
const prev = new Uint8Array(stride), cur = new Uint8Array(stride);
const cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
for (let y = 0; y < dh; y++) {
  cur.set(rgba.subarray(y * stride, (y + 1) * stride));
  for (let x = 0; x < stride; x++) {
    const a = x >= BPP ? cur[x - BPP] : 0, b = prev[x], c = x >= BPP ? prev[x - BPP] : 0;
    cand[0][x] = cur[x];
    cand[1][x] = (cur[x] - a) & 255;
    cand[2][x] = (cur[x] - b) & 255;
    cand[3][x] = (cur[x] - ((a + b) >> 1)) & 255;
    cand[4][x] = (cur[x] - paeth(a, b, c)) & 255;
  }
  let best = 0, bestScore = Infinity;
  for (let f = 0; f < 5; f++) {
    let s = 0; for (let x = 0; x < stride; x++) { const v = cand[f][x]; s += v < 128 ? v : 256 - v; }
    if (s < bestScore) { bestScore = s; best = f; }
  }
  out[y * (stride + 1)] = best;
  Buffer.from(cand[best]).copy(out, y * (stride + 1) + 1);
  prev.set(cur);
}
const TBL = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(dw, 0); ihdr.writeUInt32BE(dh, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(out, { level: 9, memLevel: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`${SRC} ${sw}x${sh} -> bbox ${bw}x${bh} -> ${dw}x${dh}, ${(png.length / 1024).toFixed(0)} KB -> ${OUT}`);
