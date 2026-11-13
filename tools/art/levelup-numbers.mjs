#!/usr/bin/env node
/* ═══ v2.3.5004: THE LEVEL-UP BURST ON 256 COLOURS, AS COLOUR NUMBERS, ONE FILE A FRAME ═══
 *
 *   node tools/art/levelup-numbers.mjs          writes public/sprites/fx/levelup-burst-v1-f0..f7.p256.png
 *   node tools/art/levelup-numbers.mjs --check  makes them again in memory: fails if a file on disk differs
 *
 * Needs python3 with Pillow (it reads the strip) and Node 18 or later.
 *
 * WHY (docs/specs/pictures-256.md §7): the burst is drawn by the page, and the
 * loading screen held the whole 2172 x 724 strip decoded for the session:
 * 6.29 MB.  The game now holds only the eight frames' rects as colour numbers
 * (878,722 px, a byte each: 0.88 MB) and turns a frame into colours on a
 * small canvas as it comes up (src/rendering/levelUpBurstNumbers.js).
 *
 * HOW:
 *   - the strip is read as players are shown it: decoded by libwebp (Pillow's
 *     WebP is libwebp, the browsers' decoder).  Not ffmpeg: its own WebP
 *     decoder turns the colours out differently (measured: up to 110 levels
 *     on a channel, about 2 on average);
 *   - the WHOLE strip is put on 256 colours by the game's reducer
 *     (public/tools/style/quant256.js reduce256: OKLab, solid kept solid and
 *     soft kept soft, no dithering, the same answer every time) -- the cut the
 *     owner saw on the before / after sheet and said yes to (2026-11-12);
 *   - each frame's rect (LEVELUP_FRAMES in src/data/levelUpBurst.js, imported,
 *     never retyped) is cut from those numbers and written as a palette PNG
 *     with each colour's own alpha (png8.js encodeIndexedPng), the same 256
 *     colours in all eight;
 *   - every file is read back through the game's own reader
 *     (src/rendering/png8Decode.js) and must give exactly the numbers and
 *     colours written, or nothing is written.
 *
 * It prints how far the shown pixels moved (premultiplied, as the screen shows
 * them, in levels of 255): the mean, the worst and how many past 16, the
 * armour's bar (§8).  A different libwebp may decode the strip a level apart,
 * and `--check` would then say so: re-make the files and look again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { reduce256 } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';
import { decodePng8 } from '../../src/rendering/png8Decode.js';
import { LEVELUP_FRAMES, LEVELUP_STRIP_W, LEVELUP_STRIP_H, LEVELUP_NUMBER_SRCS } from '../../src/data/levelUpBurst.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STRIP = path.join(REPO, 'public/sprites/fx/levelup-burst-v1.webp');
const CHECK = process.argv.includes('--check');
const fileOf = (i) => path.join(REPO, 'public', LEVELUP_NUMBER_SRCS[i].replace(/\?.*$/, ''));

/* the strip's RGBA, straight alpha, as libwebp decodes it */
function readStrip() {
  const py = 'import sys\nfrom PIL import Image\nsys.stdout.buffer.write(Image.open(sys.argv[1]).convert("RGBA").tobytes())';
  const raw = execFileSync('python3', ['-I', '-c', py, STRIP], { maxBuffer: 1 << 26 });
  const W = LEVELUP_STRIP_W, H = LEVELUP_STRIP_H;
  if (raw.length !== W * H * 4) throw new Error(`the strip read ${raw.length} bytes for ${W} x ${H}`);
  return { W, H, d: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

const { W, H, d } = readStrip();
const t0 = Date.now();
const r = reduce256(d, W, H);
console.log(`the strip on ${r.n} colours (reduce256, ${Date.now() - t0} ms); mean OKLab move ${r.err.toFixed(4)}`);

/* the colours, and how far each shown pixel of the eight rects moved */
let worst = 0, sum = 0, shown = 0, past16 = 0, px = 0;
const files = [];
for (let i = 0; i < LEVELUP_FRAMES.length; i++) {
  const { sx, sy, sw, sh } = LEVELUP_FRAMES[i];
  if (sx < 0 || sy < 0 || sx + sw > W || sy + sh > H) throw new Error(`frame ${i} is outside the strip`);
  const idx = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) idx.set(r.idx.subarray((sy + y) * W + sx, (sy + y) * W + sx + sw), y * sw);
  px += sw * sh;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const o = ((sy + y) * W + sx + x) * 4, k = idx[y * sw + x] * 4;
      const a0 = d[o + 3], a1 = r.pal[k + 3];
      if (!a0 && !a1) continue;
      let e = Math.abs(a0 - a1);
      for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(d[o + c] * a0 / 255 - r.pal[k + c] * a1 / 255));
      if (e > worst) worst = e;
      sum += e; shown++; if (e > 16) past16++;
    }
  }
  files.push({ i, sw, sh, idx });
}
console.log(`the eight frames: ${px} px (${(px / 1e6).toFixed(2)} MB of numbers; the strip decoded: ${(W * H * 4 / 1e6).toFixed(2)} MB)`);
console.log(`moved, premultiplied, levels of 255, over ${shown} shown px: mean ${(sum / shown).toFixed(2)}, worst ${worst.toFixed(1)}, `
  + `past 16: ${past16} (${(past16 / shown * 100).toFixed(1)}%)`);

const inflate = async (z) => new Uint8Array(inflateSync(z));
let bad = 0, bytes = 0;
for (const f of files) {
  const out = await encodeIndexedPng(f.idx, r.pal, f.sw, f.sh);
  if (!out) throw new Error('no CompressionStream: Node 18 or later');
  /* read back through the game's reader: the same numbers and colours */
  const same = async (b) => {
    const p = await decodePng8(b, inflate, 1);
    if (!p || p.w !== f.sw || p.h !== f.sh || p.n !== r.n) return false;
    for (let q = 0; q < f.idx.length; q++) if (p.idx[q] !== f.idx[q]) return false;
    for (let c = 0; c < r.n; c++) {
      if (p.rgb[c * 3] !== r.pal[c * 4] || p.rgb[c * 3 + 1] !== r.pal[c * 4 + 1] || p.rgb[c * 3 + 2] !== r.pal[c * 4 + 2] || p.alpha[c] !== r.pal[c * 4 + 3]) return false;
    }
    return true;
  };
  const rel = path.relative(REPO, fileOf(f.i));
  if (!(await same(out))) throw new Error(`${rel}: does not read back exactly; nothing written`);
  if (CHECK) {
    const ok = fs.existsSync(fileOf(f.i)) && await same(new Uint8Array(fs.readFileSync(fileOf(f.i))));
    if (!ok) { bad++; console.log(`  DIFFERS  ${rel}`); }
    continue;
  }
  files[f.i].out = out;
  bytes += out.length;
}
if (CHECK) {
  if (bad) { console.log(`levelup-numbers --check: ${bad} of 8 files differ: node tools/art/levelup-numbers.mjs`); process.exit(1); }
  console.log('levelup-numbers --check: the 8 files are the strip\'s frames on its 256 colours, number for number');
} else {
  for (const f of files) { fs.writeFileSync(fileOf(f.i), f.out); console.log(`  ${path.relative(REPO, fileOf(f.i))}  ${f.sw} x ${f.sh}  ${f.out.length} bytes`); }
  console.log(`8 files, ${bytes} bytes (the strip's file: ${fs.statSync(STRIP).size})`);
}
