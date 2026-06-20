/* One-off: slice the owner's two combined category-icon strips into 7 individual
   transparent, cream-recolored PNGs for the character-creation tabs.
   image1: hat,hair,beard,skin,pants,shoes  ·  image2 cell 5: shirt.
   Dependency-free (Node zlib only). Run: node tools/slice-cc-icons.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import zlib from 'node:zlib';

/* ── minimal PNG decode (8-bit, non-interlaced; RGB/RGBA/palette/gray) ── */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let pos = 8, width = 0, height = 0, bitDepth = 8, colorType = 6;
  const idat = []; let palette = null, trns = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit supported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const spp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * spp;
  const unfiltered = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const v = raw[rp++];
      const a = x >= spp ? unfiltered[y * stride + x - spp] : 0;
      const b = y > 0 ? unfiltered[(y - 1) * stride + x] : 0;
      const c = (x >= spp && y > 0) ? unfiltered[(y - 1) * stride + x - spp] : 0;
      let val;
      if (f === 0) val = v; else if (f === 1) val = v + a; else if (f === 2) val = v + b;
      else if (f === 3) val = v + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); val = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      unfiltered[y * stride + x] = val & 0xff;
    }
  }
  // expand to RGBA
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    let r, g, b, a = 255;
    if (colorType === 6) { r = unfiltered[i * 4]; g = unfiltered[i * 4 + 1]; b = unfiltered[i * 4 + 2]; a = unfiltered[i * 4 + 3]; }
    else if (colorType === 2) { r = unfiltered[i * 3]; g = unfiltered[i * 3 + 1]; b = unfiltered[i * 3 + 2]; }
    else if (colorType === 3) { const idx = unfiltered[i]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]; if (trns && idx < trns.length) a = trns[idx]; }
    else { r = g = b = unfiltered[i * spp]; if (colorType === 4) a = unfiltered[i * spp + 1]; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = a;
  }
  return { width, height, data: out };
}

/* ── minimal PNG encode (RGBA, filter 0) ── */
function crc32(buf) {
  let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4; const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ── ink detection + cell segmentation ── */
function inkiness(d, i) { // 0..255 how dark+opaque the pixel is
  const a = d[i + 3]; if (a < 30) return 0;
  const bright = (d[i] + d[i + 1] + d[i + 2]) / 3;
  return Math.max(0, Math.round((255 - bright) * (a / 255)));
}
function segmentCells(img, expected) {
  const { width: W, height: H, data } = img;
  const colInk = new Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (inkiness(data, (y * W + x) * 4) > 40) colInk[x]++;
  // group consecutive inked columns into runs (gaps = empty columns)
  const runs = []; let s = -1;
  for (let x = 0; x <= W; x++) { const on = x < W && colInk[x] > 0; if (on && s < 0) s = x; else if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; } }
  runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const cells = runs.slice(0, expected).sort((a, b) => a[0] - b[0]);
  return cells.map(([x0, x1]) => {
    let y0 = H, y1 = 0;
    for (let x = x0; x <= x1; x++) for (let y = 0; y < H; y++) if (inkiness(data, (y * W + x) * 4) > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, x1, y0, y1 };
  });
}
function cropSquareFill(img, box, pad = 10) {
  /* Solid WHITE-FILL glyph (silhouette) with interior detail kept dark, from the
     owner's outline line-art: flood-fill the exterior, paint everything else
     white, then re-darken interior detail lines (ink not touching the exterior
     -> seams/eyes/bands) so the fill reads like the mockup. */
  const WHITE = [0xff, 0xff, 0xff], DARK = [0x24, 0x1b, 0x3a], INK_T = 90;
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const side = Math.max(bw, bh) + pad * 2;
  const ox = Math.floor((side - bw) / 2), oy = Math.floor((side - bh) / 2);
  const ink = new Uint8Array(side * side);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++)
    ink[(oy + y) * side + (ox + x)] = inkiness(img.data, ((box.y0 + y) * img.width + (box.x0 + x)) * 4);
  // flood-fill the exterior (background, low ink) from the 4 corners
  const ext = new Uint8Array(side * side); const stack = [];
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < side && y < side) { const i = y * side + x; if (!ext[i] && ink[i] < INK_T) { ext[i] = 1; stack.push(i); } } };
  push(0, 0); push(side - 1, 0); push(0, side - 1); push(side - 1, side - 1);
  while (stack.length) { const i = stack.pop(), x = i % side, y = (i / side) | 0; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
  const isExt = (x, y) => (x >= 0 && y >= 0 && x < side && y < side) ? ext[y * side + x] : 1;
  const out = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const i = y * side + x, di = i * 4;
    if (ext[i]) { out[di + 3] = 0; continue; }                 // exterior -> transparent
    const interiorDetail = ink[i] >= INK_T && !(isExt(x - 1, y) || isExt(x + 1, y) || isExt(x, y - 1) || isExt(x, y + 1));
    const c = interiorDetail ? DARK : WHITE;                   // detail dark, silhouette white
    out[di] = c[0]; out[di + 1] = c[1]; out[di + 2] = c[2]; out[di + 3] = 255;
  }
  return { side, out };
}

const U = '/root/.claude/uploads/645f2769-9752-5084-8246-3d550d10a284';
const img1 = decodePNG(readFileSync(U + '/cb0896ef-BFD55E6DD0BD4C8DA14413D256CC09B7.png'));
const img2 = decodePNG(readFileSync(U + '/f48c946c-6D9B8A54DB5B46359E1B71E574D6705A.png'));
const cells1 = segmentCells(img1, 6);
const cells2 = segmentCells(img2, 6);
console.log('img1 cells:', cells1.map((c) => `${c.x1 - c.x0 + 1}x${c.y1 - c.y0 + 1}@${c.x0}`).join('  '));
console.log('img2 cells:', cells2.map((c) => `${c.x1 - c.x0 + 1}x${c.y1 - c.y0 + 1}@${c.x0}`).join('  '));

const map1 = ['hat', 'hair', 'beard', 'skin', 'pants', 'shoes'];
mkdirSync('public/ui/welcome/cat', { recursive: true });
const icons = [];
map1.forEach((key, i) => { const r = cropSquareFill(img1, cells1[i]); writeFileSync(`public/ui/welcome/cat/${key}.png`, encodePNG(r.side, r.side, r.out)); icons.push({ key, ...r }); console.log('wrote', key, r.side + 'px'); });
{ const r = cropSquareFill(img2, cells2[4]); writeFileSync('public/ui/welcome/cat/shirt.png', encodePNG(r.side, r.side, r.out)); icons.splice(4, 0, { key: 'shirt', ...r }); console.log('wrote', 'shirt', r.side + 'px'); }

/* Debug: composite all 7 onto a dark band (matches the tab tone) so the white
   fills are actually visible to review (white is invisible on a white viewer). */
{
  const cell = 64, gap = 6, n = icons.length, W = n * cell + (n + 1) * gap, H = cell + 2 * gap;
  const bg = [0x2a, 0x24, 0x4a], canvas = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { canvas[i * 4] = bg[0]; canvas[i * 4 + 1] = bg[1]; canvas[i * 4 + 2] = bg[2]; canvas[i * 4 + 3] = 255; }
  icons.forEach((ic, k) => {
    const cx = gap + k * (cell + gap), cy = gap;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const sx = Math.floor(x / cell * ic.side), sy = Math.floor(y / cell * ic.side);
      const si = (sy * ic.side + sx) * 4, a = ic.out[si + 3]; if (a < 10) continue;
      const di = ((cy + y) * W + (cx + x)) * 4, af = a / 255;
      canvas[di] = Math.round(ic.out[si] * af + canvas[di] * (1 - af));
      canvas[di + 1] = Math.round(ic.out[si + 1] * af + canvas[di + 1] * (1 - af));
      canvas[di + 2] = Math.round(ic.out[si + 2] * af + canvas[di + 2] * (1 - af));
    }
  });
  writeFileSync('/tmp/cc-icons-preview.png', encodePNG(W, H, canvas));
}
console.log('done');
