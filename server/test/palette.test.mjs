/* Pictures kept as colour numbers (v2.3.3190).
 *
 * The Wheel's ground pieces and object sheets are kept on the graphics chip
 * as one byte a pixel -- each pixel's colour's number -- and coloured as they
 * are drawn (src/rendering/paletteTex.js).  These are the two pure halves of
 * that, without a browser:
 *
 *   1. src/rendering/png8Decode.js reads a palette PNG as its numbers: every
 *      one of the game's object sheets (public/world/objects/*.png) read back,
 *      number by number and through its colours, is the picture the repo's own
 *      PNG reader (tools/world/png.mjs) makes of it -- every pixel of every
 *      sheet; its rows padded to 4 bytes repeat each row's last number; all
 *      five PNG row filters are undone; anything not an 8-bit palette PNG is
 *      refused (the game then loads it as a picture, as before);
 *   2. public/tools/world/core/piecePalette.js turns a ground piece's colours
 *      into numbers and back exactly, pads its rows the same way, and refuses
 *      a piece of more than 256 colours (which then goes as colours);
 *   3. (v2.3.3464) the farm's: its ground's palette twin, public/maps/
 *      farm_v2.png, is every pixel the picture its bake stamped, as the WebP
 *      the game names is (tools/world/farm_ground_stamp.json); every one of
 *      the owner's farm pictures reads as numbers, exactly; and the sheets it
 *      borrows have pages that do (src/rendering/paletteLoad.js).
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng8, readPng8Chunks } from '../../src/rendering/png8Decode.js';
import { piecePalette } from '../../public/tools/world/core/piecePalette.js';
import { decodePNG } from '../../tools/world/png.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}
const inflate = async (z) => new Uint8Array(zlib.inflateSync(Buffer.from(z)));

/* ── 1. the object sheets ── */
console.log('palette PNGs read as their numbers');
const OBJ = path.join(REPO, 'public/world/objects');
const sheets = fs.readdirSync(OBJ).filter((f) => f.endsWith('.png')).sort();
let pixels = 0, wrong = 0, padWrong = 0, refused = 0;
const bad = [];
for (const f of sheets) {
  const bytes = fs.readFileSync(path.join(OBJ, f));
  const ref = decodePNG(bytes);
  const d = await decodePng8(new Uint8Array(bytes), inflate, 4);
  if (!d) { refused++; bad.push(f); continue; }
  if (d.w !== ref.width || d.h !== ref.height || d.stride !== ((d.w + 3) & ~3)) { wrong++; bad.push(f + ' size'); continue; }
  let off = 0;
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const k = d.idx[y * d.stride + x], o = (y * d.w + x) * 4;
      const r = d.rgb[k * 3], g = d.rgb[k * 3 + 1], b = d.rgb[k * 3 + 2], a = d.alpha[k];
      pixels++;
      /* (a see-through pixel's colour is anything: both readers agree it is see-through) */
      if (a !== ref.data[o + 3] || (a && (r !== ref.data[o] || g !== ref.data[o + 1] || b !== ref.data[o + 2]))) off++;
    }
    for (let x = d.w; x < d.stride; x++) if (d.idx[y * d.stride + x] !== d.idx[y * d.stride + d.w - 1]) padWrong++;
  }
  if (off) { wrong++; bad.push(`${f}: ${off} px`); }
}
ok(`all ${sheets.length} object sheets read as numbers, ${(pixels / 1e6).toFixed(1)} M pixels, every one the colour the repo's PNG reader gives it`,
  sheets.length >= 40 && !refused && !wrong, bad.slice(0, 6));
ok('...each row padded to 4 bytes with copies of its last number (the picture\'s edge, as a texture clamps it)', padWrong === 0, padWrong);

/* every row filter, on a made-up palette picture: each row filtered its own
   way (the writer uses only the first; a PNG from anything else may not) */
function png8(w, h, rows, filterOf, { plte, trns } = {}) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    const f = filterOf(y);
    raw[y * (w + 1)] = f;
    for (let x = 0; x < w; x++) {
      const v = rows[y][x];
      const a = x > 0 ? rows[y][x - 1] : 0, b = y > 0 ? rows[y - 1][x] : 0, c = (x > 0 && y > 0) ? rows[y - 1][x - 1] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      raw[y * (w + 1) + 1 + x] = (v - p) & 255;
    }
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
    out.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) : 0, 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte || Buffer.alloc(256 * 3, 7))];
  if (trns) parts.push(chunk('tRNS', trns));
  parts.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  return new Uint8Array(Buffer.concat(parts));
}
{
  const w = 13, h = 10;
  const rows = [];
  for (let y = 0; y < h; y++) { const r = []; for (let x = 0; x < w; x++) r.push((x * 37 + y * 91 + ((x * y) % 7) * 13) & 255); rows.push(r); }
  const d = await decodePng8(png8(w, h, rows, (y) => y % 5), inflate, 4);
  let same = !!d && d.stride === 16;
  if (d) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d.idx[y * 16 + x] !== rows[y][x]) same = false;
  ok('the five row filters (none, sub, up, average, Paeth) undone, row by row', same);
  const t = await decodePng8(png8(4, 2, [[0, 1, 2, 3], [3, 2, 1, 0]], () => 0, { plte: Buffer.alloc(12, 9), trns: Buffer.from([0, 128]) }), inflate, 1);
  ok('a tRNS chunk gives its colours their alpha, and every colour it does not list is solid',
    !!t && t.n === 4 && t.alpha[0] === 0 && t.alpha[1] === 128 && t.alpha[2] === 255 && t.alpha[3] === 255 && t.stride === 4);
}
{
  const swatch = fs.readdirSync(path.join(REPO, 'public/world/ground')).find((f) => /-A\.png$/.test(f));
  const sb = new Uint8Array(fs.readFileSync(path.join(REPO, 'public/world/ground', swatch)));
  const c = readPng8Chunks(sb);
  /* a full-colour PNG is not one of these: the game loads it as a picture */
  const rgba = new Uint8Array(zlibPng(4, 4));
  ok(`a palette PNG of the ground's (${swatch}) reads; a full-colour PNG, or anything that is not a PNG, is refused`,
    !!c && (await decodePng8(rgba, inflate)) === null && (await decodePng8(new Uint8Array([1, 2, 3]), inflate)) === null);
}
function zlibPng(w, h) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8); return out; };
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc((w * 4 + 1) * h))), chunk('IEND', Buffer.alloc(0))]);
}

/* ── 2. a ground piece as numbers ── */
console.log('a ground piece as numbers');
function piece(w, h, colours) {
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const k = (i * 2654435761 >>> 0) % colours;
    d[i * 4] = (k * 13) & 255; d[i * 4 + 1] = (k * 7 + 40) & 255; d[i * 4 + 2] = (k >> 2) & 255; d[i * 4 + 3] = 255;
  }
  return d;
}
{
  const w = 402, h = 402;
  const d = piece(w, h, 244);
  const p = piecePalette(d, w, h);
  let same = !!p && p.stride === 404 && p.n === 244, pad = true;
  if (p) for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = p.idx[y * p.stride + x] * 4, o = (y * w + x) * 4;
      if (p.pal[k] !== d[o] || p.pal[k + 1] !== d[o + 1] || p.pal[k + 2] !== d[o + 2] || p.pal[k + 3] !== d[o + 3]) same = false;
    }
    for (let x = w; x < p.stride; x++) if (p.idx[y * p.stride + x] !== p.idx[y * p.stride + w - 1]) pad = false;
  }
  ok('a 402 x 402 piece of 244 colours (the most a piece had on the walk measured) goes to numbers and back exactly', same);
  ok('...its rows padded to 404 bytes with copies of their last number', pad);
  ok('a piece of 257 colours is refused: it goes as colours, as before', piecePalette(piece(64, 64, 257), 64, 64) === null);
  const one = piecePalette(piece(5, 3, 1), 5, 3);
  ok('...and a piece of one colour is one number, its rows padded to 8 bytes', !!one && one.n === 1 && one.stride === 8 && one.idx.every((v) => v === 0));
  /* a piece that does not start on a 4-byte boundary in its buffer still reads */
  const big = new Uint8Array(4 * 4 * 4 + 1);
  big.set(piece(4, 4, 3), 1);
  const odd = piecePalette(big.subarray(1), 4, 4);
  ok('...and one whose colours start off a 4-byte boundary in their buffer', !!odd && odd.n === 3);
}

/* ── 3. the farm's pictures (v2.3.3464) ── */
console.log("the farm's pictures as numbers");
/* how many pixels of a palette read differ from the repo's PNG reader's */
function offFrom(d, ref) {
  let off = 0;
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const k = d.idx[y * d.stride + x], o = (y * d.w + x) * 4;
      const a = d.alpha[k];
      if (a !== ref.data[o + 3] || (a && (d.rgb[k * 3] !== ref.data[o] || d.rgb[k * 3 + 1] !== ref.data[o + 1] || d.rgb[k * 3 + 2] !== ref.data[o + 2]))) off++;
    }
  }
  return off;
}
{
  /* the ground: the game asks for /maps/farm_v2.webp and, drawing in colour
     numbers, reads /maps/farm_v2.png (src/rendering/paletteLoad.js).  The bake
     (tools/world/bake_farm_ground.py) writes both from one picture, the WebP
     lossless, and stamps them: the WebP must be the one it stamped, and the
     PNG's every pixel the stamped picture's */
  const stamp = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/world/farm_ground_stamp.json'), 'utf8'));
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const webp = fs.readFileSync(path.join(REPO, stamp.webp));
  ok(`the farm's ground (${stamp.webp}) is the picture its bake stamped -- a new one is baked with its palette twin, by bake_farm_ground.py`,
    sha(webp) === stamp.webpSha256, { file: sha(webp), stamp: stamp.webpSha256 });
  const d = await decodePng8(new Uint8Array(fs.readFileSync(path.join(REPO, stamp.png))), inflate, 4);
  let rgb = null, solid = !!d;
  if (d) {
    rgb = Buffer.alloc(d.w * d.h * 3);
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const k = d.idx[y * d.stride + x], o = (y * d.w + x) * 3;
        rgb[o] = d.rgb[k * 3]; rgb[o + 1] = d.rgb[k * 3 + 1]; rgb[o + 2] = d.rgb[k * 3 + 2];
      }
    }
    for (let c = 0; c < d.n; c++) if (d.alpha[c] !== 255) solid = false;
  }
  ok(`...and its palette twin (${stamp.png}) reads as ${d && d.n} colours of numbers, ${stamp.w} x ${stamp.h}, every pixel the stamped picture's`,
    !!d && d.w === stamp.w && d.h === stamp.h && d.n === stamp.colours && sha(rgb) === stamp.rgbSha256,
    d ? { w: d.w, h: d.h, n: d.n, rgb: sha(rgb) } : 'not a palette PNG');
  ok('...solid all over (it is drawn as an opaque picture)', solid);
}
{
  /* the owner's farm pictures, read as they are */
  const FARM = path.join(REPO, 'public/world/farm');
  const pics = fs.readdirSync(FARM).filter((f) => f.endsWith('.png')).sort();
  let refused = 0, off = 0, px = 0;
  const bad = [];
  for (const f of pics) {
    const bytes = fs.readFileSync(path.join(FARM, f));
    const d = await decodePng8(new Uint8Array(bytes), inflate, 4);
    if (!d) { refused++; bad.push(f); continue; }
    const n = offFrom(d, decodePNG(bytes));
    px += d.w * d.h;
    if (n) { off++; bad.push(`${f}: ${n} px`); }
  }
  ok(`all ${pics.length} of the farm's pictures read as numbers, ${(px / 1e6).toFixed(1)} M pixels, every one the colour the repo's PNG reader gives it`,
    pics.length >= 70 && !refused && !off, bad.slice(0, 6));
  /* the sheets it borrows trees and fences from (farmLayout.js 'obj:<atlas>/'):
     their pages are among the sheets read in 1 */
  const layout = fs.readFileSync(path.join(REPO, 'src/data/farmLayout.js'), 'utf8');
  const atlases = [...new Set([...layout.matchAll(/obj:([a-z0-9-]+)\//g)].map((m) => m[1]))].sort();
  const pages = atlases.map((a) => {
    try { return JSON.parse(fs.readFileSync(path.join(OBJ, a + '.json'), 'utf8')).meta.image; } catch (e) { return null; }
  });
  ok(`the ${atlases.length} sheets the farm borrows (${atlases.join(', ')}) each have a page that reads as numbers`,
    atlases.length >= 1 && pages.every((p) => p && sheets.includes(p) && !bad.includes(p)), { atlases, pages });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
