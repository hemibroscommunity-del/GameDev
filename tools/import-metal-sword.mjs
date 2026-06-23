/* One-off: import the owner's metal greatsword art (5 facings, flat white-bg
   RGB ~1254² each) into the game's held-weapon sprites.

   Per facing: flood-fill the white background + drop shadow from the corners
   (the sword's dark outline blocks the flood, so the silver blade interior is
   preserved), tight-crop, box-downscale to height 200 (matching the current
   sprites), and write an RGBA PNG to public/sprites/weapons/swords/greatsword-<dir>.png.

   The held weapon is auto-scaled to height 48 and pinned by a per-facing grip
   anchor (handles.json, pixel coords -> normalized anchor in entityRenderer).
   We re-express each EXISTING hand-tuned anchor as a fraction of the OLD sprite
   and re-apply it to the NEW image's dimensions, so the grip lands in roughly
   the same spot; fine-tune handles.json by eye on the preview if needed.

   Dependency-free (Node zlib only).  Run: node tools/import-metal-sword.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

/* ── PNG decode (8-bit, non-interlaced; RGB/RGBA) ── */
function decodePNG(buf) {
  let pos = 8, W = 0, H = 0, ct = 6; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const t = buf.toString('ascii', pos + 4, pos + 8);
    const d = buf.subarray(pos + 8, pos + 8 + len);
    if (t === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const spp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1;
  const stride = W * spp; const u = Buffer.alloc(H * stride); let rp = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const v = raw[rp++];
      const a = x >= spp ? u[y * stride + x - spp] : 0;
      const b = y > 0 ? u[(y - 1) * stride + x] : 0;
      const c = (x >= spp && y > 0) ? u[(y - 1) * stride + x - spp] : 0;
      let val;
      if (f === 0) val = v; else if (f === 1) val = v + a; else if (f === 2) val = v + b;
      else if (f === 3) val = v + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); val = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      u[y * stride + x] = val & 0xff;
    }
  }
  // expand to RGBA
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    let r, g, b, a = 255;
    if (ct === 6) { r = u[i * 4]; g = u[i * 4 + 1]; b = u[i * 4 + 2]; a = u[i * 4 + 3]; }
    else if (ct === 2) { r = u[i * 3]; g = u[i * 3 + 1]; b = u[i * 3 + 2]; }
    else { r = g = b = u[i * spp]; if (ct === 4) a = u[i * spp + 1]; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = a;
  }
  return { W, H, data: out };
}

/* ── PNG encode (RGBA, filter 0) ── */
function crc32(b) { let c = ~0; for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(W, H, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = W * 4; const raw = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ── background cutout: flood the light bg+shadow from the corners; the dark
      outline (min channel < OUTLINE) blocks it, so the blade interior stays. ── */
const LIGHT = 150;   // a pixel this light is "background-ish" and floodable
function cutout(img) {
  const { W, H, data } = img;
  const floodable = (i) => Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= LIGHT;
  const ext = new Uint8Array(W * H); const st = [];
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) { const i = y * W + x; if (!ext[i] && floodable(i)) { ext[i] = 1; st.push(i); } } };
  push(0, 0); push(W - 1, 0); push(0, H - 1); push(W - 1, H - 1);
  while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
  for (let i = 0; i < W * H; i++) if (ext[i]) data[i * 4 + 3] = 0;
  return img;
}

function bbox(img) {
  const { W, H, data } = img; let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

/* Box-average downscale of a sub-rectangle to target height (premultiplied so
   transparent edges don't drag dark fringe into the blade). */
function cropResize(img, box, outH) {
  const { W, data } = img;
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const outW = Math.max(1, Math.round(bw * outH / bh));
  const out = Buffer.alloc(outW * outH * 4);
  for (let oy = 0; oy < outH; oy++) for (let ox = 0; ox < outW; ox++) {
    const sx0 = box.x0 + Math.floor(ox * bw / outW), sx1 = box.x0 + Math.max(Math.floor((ox + 1) * bw / outW), Math.floor(ox * bw / outW) + 1);
    const sy0 = box.y0 + Math.floor(oy * bh / outH), sy1 = box.y0 + Math.max(Math.floor((oy + 1) * bh / outH), Math.floor(oy * bh / outH) + 1);
    let ar = 0, ag = 0, ab = 0, aa = 0, n = 0;
    for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
      const i = (sy * W + sx) * 4, a = data[i + 3] / 255;
      ar += data[i] * a; ag += data[i + 1] * a; ab += data[i + 2] * a; aa += a; n++;
    }
    const di = (oy * outW + ox) * 4;
    if (aa > 0) { out[di] = Math.round(ar / aa); out[di + 1] = Math.round(ag / aa); out[di + 2] = Math.round(ab / aa); out[di + 3] = Math.round(255 * aa / n); }
    else { out[di + 3] = 0; }
  }
  return { W: outW, H: outH, data: out };
}

/* Dilate visible colour outward into the transparent margin (alpha stays 0) so
   bilinear downscaling never samples the black RGB left under transparent pixels. */
function alphaBleed(buf, w, h, iters) {
  const has = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (buf[i * 4 + 3] > 8) has[i] = 1;
  for (let it = 0; it < iters; it++) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (has[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const jj = ny * w + nx; if (has[jj]) { r += buf[jj * 4]; g += buf[jj * 4 + 1]; b += buf[jj * 4 + 2]; n++; }
      }
      if (n) { buf[i * 4] = Math.round(r / n); buf[i * 4 + 1] = Math.round(g / n); buf[i * 4 + 2] = Math.round(b / n); add.push(i); }
    }
    for (const i of add) has[i] = 1;
    if (!add.length) break;
  }
}

const U = '/root/.claude/uploads/645f2769-9752-5084-8246-3d550d10a284';
/* user order: south, southwest, east, northeast, north */
const JOBS = [
  { dir: 'south',     file: '02bbd0de-8DC250354ACD4AD19E444A74DCFE07E1.png', old: { w: 117, h: 200, hx: 87, hy: 24 } },
  { dir: 'southwest', file: 'ff595eb1-36ACE6C7B1B94C9892BBB2FD371DC3FC.png', old: { w: 116, h: 200, hx: 86, hy: 24 } },
  { dir: 'east',      file: '77ebce0d-494B894CC0414D498A6CD64810900D2B.png', old: { w: 172, h: 200, hx: 29, hy: 24 } },
  { dir: 'northeast', file: '0be3afac-74B4846C7B1C408D963946055C3EA43C.png', old: { w: 133, h: 200, hx: 30, hy: 23 } },
  { dir: 'north',     file: '41dd3ca8-A8FFB9F461D9438D8C292B7AE6A93F5F.png', old: { w: 103, h: 200, hx: 25, hy: 21 } },
];
const OUT_H = 200;
const outDir = 'public/sprites/weapons/swords';
const handles = {};
const sprites = [];
for (const j of JOBS) {
  const img = cutout(decodePNG(readFileSync(`${U}/${j.file}`)));
  const box = bbox(img);
  const r = cropResize(img, box, OUT_H);
  alphaBleed(r.data, r.W, r.H, 14);   // v2.3.1043: bleed sword colour into the
  // transparent margin so the held sword's hard downscale (200->48) doesn't
  // sample the black-under-transparent RGB into a dark fringe on the blade.
  writeFileSync(`${outDir}/greatsword-${j.dir}.png`, encodePNG(r.W, r.H, r.data));
  // re-express the old normalized grip anchor in the NEW image's pixels.
  const nx = Math.round((j.old.hx / j.old.w) * r.W);
  const ny = Math.round((j.old.hy / j.old.h) * r.H);
  handles[`greatsword-${j.dir}`] = [nx, ny];
  sprites.push({ dir: j.dir, ...r, hx: nx, hy: ny });
  console.log(`greatsword-${j.dir}: ${r.W}x${r.H}  grip[${nx},${ny}]  (src box ${box.x1 - box.x0 + 1}x${box.y1 - box.y0 + 1})`);
}
console.log('\nhandles.json values:');
for (const k of Object.keys(handles)) console.log(`  "${k}": [${handles[k][0]}, ${handles[k][1]}],`);

/* Debug composite: the 5 facings on a magenta band (so any leftover white halo
   or a leaked/erased blade is obvious), each with a red dot at its grip anchor. */
{
  const pad = 8;
  const sprites2 = sprites;
  let totalW = pad, maxH = 0;
  for (const s of sprites2) { totalW += s.W + pad; if (s.H > maxH) maxH = s.H; }
  const CW = totalW, CH = maxH + 2 * pad;
  const canvas = Buffer.alloc(CW * CH * 4);
  for (let i = 0; i < CW * CH; i++) { canvas[i * 4] = 0xff; canvas[i * 4 + 1] = 0x00; canvas[i * 4 + 2] = 0xff; canvas[i * 4 + 3] = 255; }
  let cx = pad;
  for (const s of sprites2) {
    const oy = pad;
    for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) {
      const si = (y * s.W + x) * 4, a = s.data[si + 3] / 255; if (a <= 0) continue;
      const di = ((oy + y) * CW + (cx + x)) * 4;
      canvas[di] = Math.round(s.data[si] * a + canvas[di] * (1 - a));
      canvas[di + 1] = Math.round(s.data[si + 1] * a + canvas[di + 1] * (1 - a));
      canvas[di + 2] = Math.round(s.data[si + 2] * a + canvas[di + 2] * (1 - a));
    }
    // grip marker
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const gx = cx + s.hx + dx, gy = pad + s.hy + dy;
      if (gx >= 0 && gy >= 0 && gx < CW && gy < CH) { const di = (gy * CW + gx) * 4; canvas[di] = 0; canvas[di + 1] = 255; canvas[di + 2] = 0; }
    }
    cx += s.W + pad;
  }
  writeFileSync('/tmp/metal-sword-preview.png', encodePNG(CW, CH, canvas));
}
console.log('\nwrote 5 sprites + /tmp/metal-sword-preview.png');
