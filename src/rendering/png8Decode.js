/* ═══ v2.3.3190: A PALETTE PNG READ AS ITS COLOUR NUMBERS ═══
 *
 * The Wheel's object sheets are palette PNGs (public/tools/world/core/png8.js,
 * tools/world/repack-objects.mjs): one byte a pixel, the colour's number, and
 * the colours listed once.  A browser that loads one as a picture unpacks it
 * to four bytes a pixel -- in the page and again on the graphics chip.  Read
 * here instead as the numbers themselves, the chip can keep the page at one
 * byte a pixel and look the colour up as it draws (paletteTex.js).
 *
 * decodePng8(bytes, inflate, align) -> { w, h, stride, idx, rgb, alpha, n } or
 * null.  `idx` holds the numbers, `stride` bytes a row -- w rounded up to a
 * multiple of `align` (4 for a WebGL texture; the extra on the right repeats
 * each row's last pixel, so a texture made from it reads at its right edge
 * what the picture's own edge reads); `rgb` the colours,
 * three bytes each; `alpha` each colour's alpha (the tRNS chunk, 255 for any
 * it does not list); `n` how many colours.  `inflate(Uint8Array) ->
 * Promise<Uint8Array>` unpacks the image data (zlib): the browser's
 * DecompressionStream by default, Node's zlib in the tests.
 *
 * Only 8 bits a pixel, colour type 3 (palette), not interlaced -- the only
 * kind the sheets are (every one of the 41, measured); anything else is null
 * and the caller loads the file as a picture, as before.  All five row
 * filters are undone, though the writer uses only the first.
 *
 * No Pixi, no DOM: Node-tested (tools/world/test-world-core.mjs).
 */

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export async function browserInflate(z) {
  if (typeof DecompressionStream === 'undefined' || typeof Blob === 'undefined' || typeof Response === 'undefined') return null;
  const stream = new Blob([z]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

/* the chunks: IHDR, PLTE, tRNS, and every IDAT joined */
export function readPng8Chunks(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 33) return null;
  for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) return null;
  let o = 8, ihdr = null, plte = null, trns = null;
  const idat = [];
  let idatLen = 0;
  while (o + 12 <= b.length) {
    const len = u32(b, o);
    const type = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
    const s = o + 8, e = s + len;
    if (e + 4 > b.length) return null;
    if (type === 'IHDR') ihdr = b.subarray(s, e);
    else if (type === 'PLTE') plte = b.subarray(s, e);
    else if (type === 'tRNS') trns = b.subarray(s, e);
    else if (type === 'IDAT') { idat.push(b.subarray(s, e)); idatLen += len; }
    else if (type === 'IEND') break;
    o = e + 4;
  }
  if (!ihdr || ihdr.length < 13 || !plte || !idat.length) return null;
  const w = u32(ihdr, 0), h = u32(ihdr, 4);
  const depth = ihdr[8], colour = ihdr[9], interlace = ihdr[12];
  if (depth !== 8 || colour !== 3 || interlace !== 0 || !w || !h) return null;
  const n = Math.floor(plte.length / 3);
  if (n < 1 || n > 256) return null;
  const z = new Uint8Array(idatLen);
  let p = 0;
  for (const part of idat) { z.set(part, p); p += part.length; }
  return { w, h, plte, trns, n, z };
}

/* undo the row filters, into `out` (stride bytes a row) */
function unfilter(raw, w, h, out, stride) {
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)];
    const src = y * (w + 1) + 1, dst = y * stride, up = dst - stride;
    if (f === 0) {
      out.set(raw.subarray(src, src + w), dst);
    } else if (f === 1) {
      for (let x = 0; x < w; x++) out[dst + x] = (raw[src + x] + (x > 0 ? out[dst + x - 1] : 0)) & 255;
    } else if (f === 2) {
      for (let x = 0; x < w; x++) out[dst + x] = (raw[src + x] + (y > 0 ? out[up + x] : 0)) & 255;
    } else if (f === 3) {
      for (let x = 0; x < w; x++) {
        const a = x > 0 ? out[dst + x - 1] : 0, c = y > 0 ? out[up + x] : 0;
        out[dst + x] = (raw[src + x] + ((a + c) >> 1)) & 255;
      }
    } else if (f === 4) {
      for (let x = 0; x < w; x++) {
        const a = x > 0 ? out[dst + x - 1] : 0, b = y > 0 ? out[up + x] : 0, c = (x > 0 && y > 0) ? out[up + x - 1] : 0;
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        out[dst + x] = (raw[src + x] + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c))) & 255;
      }
    } else return false;
    /* the padding repeats the row's last pixel (clamp-to-edge, as the
       picture's own right edge reads) */
    if (stride > w) out.fill(out[dst + w - 1], dst + w, dst + stride);
  }
  return true;
}

export async function decodePng8(bytes, inflate = browserInflate, align = 1) {
  const c = readPng8Chunks(bytes);
  if (!c) return null;
  const { w, h, plte, trns, n } = c;
  let raw;
  try { raw = await inflate(c.z); } catch (e) { return null; }
  if (!raw || raw.length < (w + 1) * h) return null;
  const al = Math.max(1, align | 0);
  const st = Math.ceil(w / al) * al;
  const idx = new Uint8Array(st * h);
  if (!unfilter(raw, w, h, idx, st)) return null;
  /* (a number past the colours listed reads see-through black: the palette's
     unused entries are zero -- the sheets' writer never makes one) */
  const alpha = new Uint8Array(n).fill(255);
  if (trns) for (let i = 0; i < Math.min(n, trns.length); i++) alpha[i] = trns[i];
  return { w, h, stride: st, idx, rgb: plte.subarray(0, n * 3), alpha, n };
}
