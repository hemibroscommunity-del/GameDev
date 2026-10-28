#!/usr/bin/env node
/* ═══ v2.3.3728: THE EXISTING PICTURES ON 256 COLOURS, ONCE ═══
 *
 *   node tools/art/reduce256.mjs            every picture in SCOPE
 *   node tools/art/reduce256.mjs --dry      say what it would do
 *   node tools/art/reduce256.mjs --sheet    and the before | after sheet of
 *                                           the hardest (docs/specs/pictures-256-sheet.png)
 *
 * The owner, 2026-10-28: "You can go ahead and reduce it. I won't notice at all
 * from anything at 256" (docs/specs/pictures-256.md).  New art comes out of the
 * Object Studio on 256 colours (public/tools/style/process.js reduceColours);
 * this does the same, once, to the pictures already in the game.
 *
 * Each picture in SCOPE on more than 256 colours is read exactly as its file
 * holds it (ffmpeg: every pixel's own RGBA, no colour management), put on 256
 * colours by public/tools/style/quant256.js (OKLab, solid kept solid and soft
 * kept soft, no dithering), and written BESIDE the original as a palette PNG
 * with each colour's own alpha: `name.webp` -> `name.p256.png`.  The original
 * stays: the game reads the twin only with `?p256=1` (off by default, measured
 * in the spec) -- the originals go once the owner has tried it.  Every twin is read back (ffmpeg again) and must give exactly the
 * colours written, or the run stops.
 *
 * src/data/p256Files.js (GENERATED: never by hand) lists every twin: the
 * address the game asks for -> the twin's, its size, the original's colours
 * and how far its pixels moved (quant256's err, OKLab).  A picture already on
 * 256 or fewer is not twinned (the game reads it as it is).
 *
 * SCOPE: the effects drawn in the world (sprites/fx, sprites/effects) and the
 * gathering tools' strips (sprites/tools).  Not the character sheets (body,
 * clothes, armour, head pieces: their own method), not the pictures the page
 * draws with <img> or CSS (a browser keeps every picture at four bytes a
 * pixel whatever its colours: levelup-burst, the zone banners, the coin flip),
 * not a picture something reads back on the CPU until its readers are moved.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reduce256, toRgba } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(REPO, 'public');
const DRY = process.argv.includes('--dry');
const SHEET = process.argv.includes('--sheet');

/* the folders, and the files in them that stay as they are */
const SCOPE = [
  { dir: 'sprites/fx', skip: /^(levelup-burst|zonebanner-|coinflip-)/ },
  { dir: 'sprites/effects', skip: null },
  { dir: 'sprites/tools', skip: null },
];

function readRgba(file) {
  const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  const [w, h] = dims;
  if (raw.length !== w * h * 4) throw new Error(`${file}: read ${raw.length} bytes for ${w}x${h}`);
  return { w, h, d: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}
function colourCount(d) {
  const s = new Set();
  for (let i = 0; i < d.length; i += 4) s.add(d[i + 3] ? ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0 : 0);
  return s.size;
}
const twinOf = (rel) => rel.replace(/\.(png|webp)$/i, '.p256.png');

const out = {};
const hard = [];
for (const s of SCOPE) {
  const dir = path.join(PUB, s.dir);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(png|webp)$/i.test(f) || /\.p256\.png$/i.test(f) || (s.skip && s.skip.test(f))) continue;
    const rel = `/${s.dir}/${f}`;
    const { w, h, d } = readRgba(path.join(PUB, rel));
    const colours = colourCount(d);
    if (colours <= 256) { console.log(`  as it is  ${rel} (${colours} colours)`); continue; }
    const t0 = Date.now();
    const r = reduce256(d, w, h);
    const twin = twinOf(rel);
    const bytes = await encodeIndexedPng(r.idx, r.pal, w, h);
    if (!bytes) throw new Error('no CompressionStream: Node 18 or later');
    if (!DRY) {
      fs.writeFileSync(path.join(PUB, twin), bytes);
      /* read back: exactly the colours written */
      const back = readRgba(path.join(PUB, twin));
      const want = toRgba(r.idx, r.pal);
      for (let i = 0; i < want.length; i++) {
        if (back.d[i] !== want[i] && !(want[(i & ~3) + 3] === 0 && back.d[(i & ~3) + 3] === 0)) {
          throw new Error(`${twin}: reads back differently at byte ${i} (${back.d[i]} for ${want[i]})`);
        }
      }
    }
    out[rel] = { twin, w, h, colours, n: r.n, err: +r.err.toFixed(4) };
    hard.push({ rel, twin, w, h, colours, err: r.err, d, r });
    console.log(`  256       ${rel} ${w}x${h}: ${colours} colours -> ${r.n}, moved ${r.err.toFixed(4)} (OKLab), `
      + `${Math.round(fs.statSync(path.join(PUB, rel)).size / 1024)} KB -> ${Math.round(bytes.length / 1024)} KB, ${Date.now() - t0} ms`);
  }
}

const js = `/* GENERATED by tools/art/reduce256.mjs (v2.3.3728) -- never by hand.
 * Every picture the game reads on 256 colours from its twin beside it
 * (docs/specs/pictures-256.md): the address the game asks for (no query) ->
 * the twin's, its size, the original's colours, the colours used and how far
 * its pixels moved (OKLab, alpha-weighted mean). */
export const P256_FILES = Object.freeze(${JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ')});
`;
if (!DRY) fs.writeFileSync(path.join(REPO, 'src/data/p256Files.js'), js);
console.log(`${Object.keys(out).length} twinned${DRY ? ' (dry)' : ''}`);

/* the owner's glance: before | after, the six with the most colours, each on a
   checker (see-through shows) and on black (a glow's fade shows) */
if (SHEET && hard.length) {
  const pick = hard.sort((a, b) => b.colours - a.colours).slice(0, 6);
  const scale = (p) => Math.min(1, 900 / p.w, 300 / p.h);
  const rows = pick.map((p) => {
    const k = scale(p);
    return { p, W: Math.max(1, Math.round(p.w * k)), H: Math.max(1, Math.round(p.h * k)) };
  });
  const GAP = 8;
  const SW = Math.max(...rows.map((r) => r.W)) * 2 + GAP * 3;
  const SH = rows.reduce((s, r) => s + r.H * 2 + GAP * 2, GAP);
  const sheet = new Uint8Array(SW * SH * 4);
  const put = (x, y, rgba, bg) => {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    const o = (y * SW + x) * 4, a = rgba[3] / 255;
    sheet[o] = Math.round(rgba[0] * a + bg[0] * (1 - a));
    sheet[o + 1] = Math.round(rgba[1] * a + bg[1] * (1 - a));
    sheet[o + 2] = Math.round(rgba[2] * a + bg[2] * (1 - a));
    sheet[o + 3] = 255;
  };
  let y0 = GAP;
  for (const { p, W, H } of rows) {
    const after = toRgba(p.r.idx, p.r.pal);
    for (const [band, dark] of [[0, false], [1, true]]) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = Math.min(p.w - 1, Math.floor(x * p.w / W)), sy = Math.min(p.h - 1, Math.floor(y * p.h / H));
        const i = (sy * p.w + sx) * 4;
        const bg = dark ? [0, 0, 0] : (((x >> 3) + (y >> 3)) & 1 ? [200, 200, 200] : [255, 255, 255]);
        put(GAP + x, y0 + band * (H + GAP) + y, p.d.subarray(i, i + 4), bg);
        put(GAP * 2 + W + x, y0 + band * (H + GAP) + y, after.subarray(i, i + 4), bg);
      }
    }
    y0 += H * 2 + GAP * 2;
  }
  /* written as a plain RGBA PNG (zlib) */
  const zlib = await import('node:zlib');
  const raw = Buffer.alloc((SW * 4 + 1) * SH);
  for (let y = 0; y < SH; y++) Buffer.from(sheet.buffer, y * SW * 4, SW * 4).copy(raw, y * (SW * 4 + 1) + 1);
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(t, 4, 'latin1'); data.copy(b, 8);
    b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SW, 0); ihdr.writeUInt32BE(SH, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  const where = path.join(REPO, 'docs/specs/pictures-256-sheet.png');
  fs.writeFileSync(where, png);
  console.log(`the sheet: ${path.relative(REPO, where)} (${pick.map((p) => path.basename(p.rel)).join(', ')})`);
}
