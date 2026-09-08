/* v2.3.2356: a raw RGBA PNG reader/writer with NO canvas anywhere.
 *
 * TRAPS §53: a 2D canvas backing store is premultiplied, so drawImage +
 * getImageData cannot round-trip any pixel with partial alpha -- which on a
 * sprite sheet is very nearly the whole silhouette.  Every earlier tool that
 * touched art through a canvas (tools/webp_convert.mjs) destroyed exactly the
 * pixels the recolour and the outline care about.  sharp is the repo's node-side
 * answer, but it is not installed in every environment this runs in, and a
 * downscale that has to be provably exact should not depend on a native
 * codec's kernel choice either.  So: inflate the IDAT, unfilter, work on the
 * bytes, deflate them back.
 *
 * 8-bit RGBA (colour type 6), non-interlaced only -- which is every sprite
 * sheet in public/sprites.  It throws rather than guess on anything else.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

let TBL = null;
function crc32(buf) {
  if (!TBL) {
    TBL = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      TBL[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Decode a PNG file to { width, height, data } with `data` straight RGBA. */
export function decodePng(path) {
  const b = fs.readFileSync(path);
  let off = 8;
  const idat = [];
  let w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  while (off + 8 <= b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || ctype !== 6 || interlace !== 0) {
    throw new Error(`${path}: need 8-bit RGBA non-interlaced, got depth ${depth} colour ${ctype} interlace ${interlace}`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const bb = prev ? prev[x] : 0;
      const c = (prev && x >= bpp) ? prev[x - bpp] : 0;
      let v = line[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += bb;
      else if (ft === 3) v += ((a + bb) >> 1);
      else if (ft === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { width: w, height: h, data: out };
}

/** Write straight-RGBA bytes back out as a PNG. */
export function encodePng(path, w, h, data) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 1;                 // filter 1 (Sub): cheap, and sprite rows compress well under it
    const src = data.subarray(y * stride, (y + 1) * stride);
    const dst = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) dst[x] = (src[x] - (x >= 4 ? src[x - 4] : 0)) & 0xff;
  }
  const z = zlib.deflateSync(raw, { level: 9 });
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  const chunk = (type, payload) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(payload.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, payload])));
    parts.push(len, t, payload, crc);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  chunk('IHDR', ihdr); chunk('IDAT', z); chunk('IEND', Buffer.alloc(0));
  fs.writeFileSync(path, Buffer.concat(parts));
}
