/* ═══ v2.3.2957: PALETTE PNGs FOR THE GAME ═══
 *
 * The owner, 2026-10-01, with every swatch made: "It's 279mb in the zip file.
 * Isn't that way too much for GitHub? And the game in general?"  A finished
 * tile is already on the 128-colour palette, but a canvas can only save it as
 * full colour, four bytes a pixel.  Saved as palette numbers instead -- one
 * byte a pixel, the colours listed once (a PNG's colour type 3) -- the same
 * pixels take about half the bytes (the owner's square 0.96 MB -> 0.41, the
 * yards 0.50 -> 0.20), and every browser reads it back as the same colours.
 *
 * Each row is stored unfiltered, as the PNG spec advises for palette
 * pictures: trying the four filters on every row saved nothing on the owner's
 * tiles.  The bytes are deflated by the browser's own CompressionStream.
 * Where there is none, or the picture has more than 256 colours or any
 * see-through pixel, the answer is null and the caller keeps its full-colour
 * PNG -- never a wrong picture.
 */
import { crc32 } from './zip.js';

const SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/* one PNG chunk: length, type, data, and the CRC of type + data */
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/* The picture's colours, in the order they first appear, and each pixel's
   number among them; null past 256 colours or at any pixel not fully opaque. */
export function paletteOf(rgba, n) {
  const seen = new Map(), idx = new Uint8Array(n), pal = [];
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    if (rgba[o + 3] !== 255) return null;
    const key = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    let k = seen.get(key);
    if (k === undefined) {
      if (seen.size === 256) return null;
      k = seen.size;
      seen.set(key, k);
      pal.push(rgba[o], rgba[o + 1], rgba[o + 2]);
    }
    idx[i] = k;
  }
  return { pal: new Uint8Array(pal), idx };
}

async function deflate(u8) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* rgba (w x h, 4 bytes a pixel) -> the bytes of a palette PNG, or null */
export async function encodePalettePng(rgba, w, h) {
  const p = paletteOf(rgba, w * h);
  if (!p) return null;
  /* each row: filter 0 (none), then its w palette numbers */
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) raw.set(p.idx.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  const z = await deflate(raw);
  if (!z) return null;
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8;   /* 8 bits a palette number */
  ihdr[9] = 3;   /* colour type 3: palette */
  const parts = [SIG, chunk('IHDR', ihdr), chunk('PLTE', p.pal), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, q) => s + q.length, 0));
  let o = 0;
  for (const q of parts) { out.set(q, o); o += q.length; }
  return out;
}
