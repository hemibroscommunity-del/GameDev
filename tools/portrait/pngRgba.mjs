/* ═══ v2.3.3957: A PNG READ AS RGBA, AND AN RGB ONE WRITTEN (node, no packages) ═══
 *
 * The hemi portrait's tools and test read the collection's trait layers
 * (assets/portrait-source/hemi-bros/*.png, RGBA as PIL wrote them) and the
 * townsfolk's busts fixture, with nothing installed: node's zlib and the
 * repo's own crc32.  8 bits a channel, not interlaced, colour types 0, 2, 3,
 * 4 and 6, every row filter undone -- enough for the files these read; any
 * other kind throws rather than reading wrong pixels.
 */
import zlib from 'node:zlib';
import { crc32 } from '../../public/tools/world/core/zip.js';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** bytes of a PNG -> { w, h, data: Uint8Array RGBA } */
export function readPngRgba(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) throw new Error('not a PNG');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 8, w = 0, h = 0, depth = 0, type = 0, inter = 0, plte = null, trns = null;
  const idat = [];
  while (o < b.length) {
    const len = dv.getUint32(o), t = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
    const d = b.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = dv.getUint32(o + 8); h = dv.getUint32(o + 12); depth = d[8]; type = d[9]; inter = d[12]; }
    else if (t === 'PLTE') plte = d;
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    o += 12 + len;
  }
  const ch = CHANNELS[type];
  if (depth !== 8 || !ch || inter) throw new Error(`PNG kind not read here: depth ${depth}, type ${type}, interlace ${inter}`);
  const raw = zlib.inflateSync(Buffer.concat(idat.map((x) => Buffer.from(x))));
  const stride = w * ch, px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[row + x - ch] : 0, up = y ? px[prev + x] : 0, ul = (y && x >= ch) ? px[prev + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : ul);
      } else if (f !== 0) throw new Error('bad PNG row filter ' + f);
      px[row + x] = v & 255;
    }
  }
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * ch, d = i * 4;
    if (type === 6) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = px[s + 3]; }
    else if (type === 2) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = 255; }
    else if (type === 0) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = 255; }
    else if (type === 4) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = px[s + 1]; }
    else {
      const k = px[s];
      data[d] = plte[k * 3]; data[d + 1] = plte[k * 3 + 1]; data[d + 2] = plte[k * 3 + 2];
      data[d + 3] = trns && k < trns.length ? trns[k] : 255;
    }
  }
  return { w, h, data };
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** RGB(A) pixels (w x h, 4 bytes a pixel; alpha dropped) -> bytes of an RGB PNG, lossless */
export function writePngRgb(rgba, w, h) {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (w * 3 + 1) + 1 + x * 3;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 2;
  const parts = [new Uint8Array(SIG), chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(zlib.deflateSync(raw, { level: 9 }))), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, q) => s + q.length, 0));
  let o = 0;
  for (const q of parts) { out.set(q, o); o += q.length; }
  return out;
}
