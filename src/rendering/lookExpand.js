/* ═══ v2.3.3752: A LOOK'S FRAME COLOURED ON THE CPU, AS THE CHIP COLOURS IT ═══
 *
 * The armoured body (lookArmour.js) is drawn from the shared colour numbers
 * like the bare one, but WHICH of its texels show under the armour is decided
 * by the masked bake (maskedBake.js), which reads the body's real colours (its
 * skin, trousers and boots are judged by colour).  So the bake's worker colours
 * the frame itself from the same numbers, here: lookPalette.js's shader,
 * line for line -- the header (buildSheet), entry() and the stand's 2x2 box --
 * in JavaScript.  No imports: node can test it.
 *
 *   const s = lookSheetParse(bytes, w, rows, bits)   the sheet as the chip has it
 *   lookFrameRGBA(s, cell, row) -> Uint8ClampedArray, cell.w x cell.h,
 *     straight (unpremultiplied) as getImageData would give the old path's
 *     display canvas; `row` the look's 256 x 4 row bytes.
 */
const MAX_ROLES = 15;

export function lookSheetParse(bytes, w, rows, bits) {
  const bpt = bits === 8 ? 1 : 2;
  const b0 = bytes[(rows - 1) * w * bpt];
  const byteAt = (x, y) => bytes[(y * w + x) * bpt];
  const num = (x, y) => (bpt === 1 ? bytes[y * w + x] : bytes[(y * w + x) * 2] + 256 * bytes[(y * w + x) * 2 + 1]);
  const hdr = (i) => {
    if (bpt === 2) return num(i % w, rows - 1 - Math.floor(i / w));
    const p = i * 2, q = p + 1;
    return byteAt(p % w, rows - 1 - Math.floor(p / w)) + 256 * byteAt(q % w, rows - 1 - Math.floor(q / w));
  };
  const ds = b0 >= 128 ? b0 - 128 : b0;
  const s = { bytes, w, rows, bits, bpt, ds, n: hdr(1), t0: hdr(2), nr: hdr(4), ends: [], roE: [0], roF: [0], roU: [0], num };
  for (let r = 0; r < 16; r++) s.ends.push(hdr(5 + r));
  for (let r = 0; r < MAX_ROLES; r++) { s.roE.push(hdr(21 + 3 * r)); s.roF.push(hdr(22 + 3 * r)); s.roU.push(hdr(23 + 3 * r)); }
  s.refScale = Math.max(1, hdr(66));   /* the refs in 1/refScale's (v2.3.3737) */
  s.dw = w / ds; s.dh = s.n / ds;
  return s;
}

/* entry k in this look, premultiplied 0..255 (the shader's entry()) */
function entry(s, k, row, out) {
  if (k === 0) { out[0] = out[1] = out[2] = out[3] = 0; return; }
  let r, g, b, a;
  const B = s.bytes, W = s.w;
  if (s.bits === 8) {
    const t = 4 * k;
    const at = (u) => B[(s.t0 + Math.floor(u / W)) * W + (u % W)];
    r = at(t); g = at(t + 1); b = at(t + 2); a = at(t + 3);
  } else {
    const t = 2 * k;
    const o = ((s.t0 + Math.floor(t / W)) * W + (t % W)) * 2;
    r = B[o]; g = B[o + 1]; b = B[o + 2]; a = B[o + 3];
  }
  let role = 0;
  for (let q = 0; q < 15; q++) if (k >= s.ends[q]) role = q + 1;
  if (role > 0 && role <= s.nr) {
    let e = s.roE[role], ref = s.roF[role];
    if (!(row[e * 4 + 3] > 127)) {
      const u = s.roU[role];
      e = u > 0 ? s.roE[u] : -1; ref = u > 0 ? s.roF[u] : 0;
    }
    if (e >= 0 && row[e * 4 + 3] > 127) {
      const T0 = row[e * 4], T1 = row[e * 4 + 1], T2 = row[e * 4 + 2];
      if (ref <= 0) { r = T0; g = T1; b = T2; } else {
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / (ref / s.refScale);
        r = Math.min(255, Math.floor(T0 * lum + 0.5)); g = Math.min(255, Math.floor(T1 * lum + 0.5)); b = Math.min(255, Math.floor(T2 * lum + 0.5));
      }
    }
  }
  out[0] = Math.floor(r * a / 255 + 0.5); out[1] = Math.floor(g * a / 255 + 0.5); out[2] = Math.floor(b * a / 255 + 0.5); out[3] = a;
}

/* display texel (x, y) of the sheet, premultiplied (the shader's dispTexel()) */
export function lookDispTexel(s, x, y, row, out) {
  if (s.ds === 1) { entry(s, s.num(x, y), row, out); return; }
  const k0 = s.num(2 * x, 2 * y), k1 = s.num(2 * x + 1, 2 * y), k2 = s.num(2 * x, 2 * y + 1), k3 = s.num(2 * x + 1, 2 * y + 1);
  if (k0 === k1 && k0 === k2 && k0 === k3) { entry(s, k0, row, out); return; }
  let r = 0, g = 0, b = 0, a = 0;
  for (const k of [k0, k1, k2, k3]) { entry(s, k, row, out); r += out[0]; g += out[1]; b += out[2]; a += out[3]; }
  /* the canvas's 'high' halving: the box of the premultiplied bytes, truncated */
  out[0] = Math.floor(r / 4); out[1] = Math.floor(g / 4); out[2] = Math.floor(b / 4); out[3] = Math.floor(a / 4);
}

/** A cell of the sheet in this look: premultiplied (pm) and straight (rgba) bytes, cell.w x cell.h. */
export function lookFrameRGBA(s, cell, row) {
  const n = cell.w * cell.h;
  const pm = new Uint8ClampedArray(n * 4), rgba = new Uint8ClampedArray(n * 4);
  const t = [0, 0, 0, 0];
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      lookDispTexel(s, cell.x + x, cell.y + y, row, t);
      const o = (y * cell.w + x) * 4;
      pm[o] = t[0]; pm[o + 1] = t[1]; pm[o + 2] = t[2]; pm[o + 3] = t[3];
      const a = t[3];
      if (a) { rgba[o] = Math.round(t[0] * 255 / a); rgba[o + 1] = Math.round(t[1] * 255 / a); rgba[o + 2] = Math.round(t[2] * 255 / a); rgba[o + 3] = a; }
    }
  }
  return { pm, rgba };
}

/**
 * What the masked bake decided, per display texel of the whole frame (ow x oh):
 * `out` the bake's display frame (straight, getImageData), `pm` the body's own
 * frame (premultiplied, at the cell's trim).  Returns { show: Uint8Array(cell)
 * 1 = the body's own texel, the residue's box and straight pixels (whatever the
 * bake drew that is not the body: the chain belt, the steel fill, the ghost
 * fist's trousers) or null, and counts }.
 * A texel is the body's own when its alpha is the body's and each premultiplied
 * channel is within TOL of it (the canvas's own rounding across the bake's
 * getImageData/putImageData trips); the shader then draws the body's colour.
 */
export const KEEP_TOL = 2;
export function lookMaskOf(out, ow, oh, pm, cell) {
  const show = new Uint8Array(cell.w * cell.h);
  let x0 = ow, y0 = oh, x1 = -1, y1 = -1;
  const other = new Uint8Array(ow * oh);
  const c = { keep: 0, near: 0, clear: 0, other: 0, maxNear: 0 };
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const o = (y * ow + x) * 4, A = out[o + 3];
      const cx = x - cell.tx, cy = y - cell.ty;
      const inCell = cx >= 0 && cy >= 0 && cx < cell.w && cy < cell.h;
      const q = inCell ? (cy * cell.w + cx) * 4 : -1;
      const a = q >= 0 ? pm[q + 3] : 0;
      if (A === 0) { if (a) c.clear++; continue; }
      if (q >= 0 && A === a) {
        let m = 0;
        for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(Math.round(out[o + k] * A / 255) - pm[q + k]));
        if (m <= KEEP_TOL) {
          show[cy * cell.w + cx] = 1;
          if (m) { c.near++; if (m > c.maxNear) c.maxNear = m; } else c.keep++;
          continue;
        }
      }
      other[y * ow + x] = 1; c.other++;
      if (!a) c.otherNew = (c.otherNew || 0) + 1; else if (A !== a) c.otherAlpha = (c.otherAlpha || 0) + 1; else c.otherColour = (c.otherColour || 0) + 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  let residue = null;
  if (x1 >= 0) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = (y + y0) * ow + x + x0;
      if (!other[p]) continue;
      px.set(out.subarray(p * 4, p * 4 + 4), (y * w + x) * 4);
    }
    residue = { x: x0, y: y0, w, h, px };
  }
  return { show, residue, counts: c };
}
