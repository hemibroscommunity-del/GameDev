/* ═══ v2.3.2931: PIXEL HELPERS FOR THE WORLD BUILDER ═══
 *
 * Plain RGBA buffers ({ w, h, data: Uint8ClampedArray }) and pure JS, so the
 * same code runs in the builder page and in the Node tests, and gives the
 * same answer in both.  In particular the resampler is our own rather than
 * canvas drawImage: a browser's smoothing differs between engines, and a
 * square fused on the owner's phone must match the same square re-fused on
 * a desktop during a rebuild.
 */

export function makeImg(w, h) { return { w, h, data: new Uint8ClampedArray(w * h * 4) }; }

export function cloneImg(img) { return { w: img.w, h: img.h, data: new Uint8ClampedArray(img.data) }; }

/* Triangle-filter taps whose width grows with the downscale factor, so a
   1254 -> 1024 shrink averages every source pixel instead of skipping some
   (the aliasing a plain bilinear shrink gives).  Upscaling degrades to
   ordinary bilinear. */
function taps(srcLen, outLen) {
  const scale = srcLen / outLen, support = Math.max(1, scale);
  const idx = [], wts = [];
  for (let i = 0; i < outLen; i++) {
    const c = (i + 0.5) * scale - 0.5;
    const lo = Math.max(0, Math.ceil(c - support)), hi = Math.min(srcLen - 1, Math.floor(c + support));
    const ii = [], ww = [];
    let sum = 0;
    for (let t = lo; t <= hi; t++) {
      const w = 1 - Math.abs(t - c) / support;
      if (w > 0) { ii.push(t); ww.push(w); sum += w; }
    }
    if (!ii.length) { ii.push(Math.min(srcLen - 1, Math.max(0, Math.round(c)))); ww.push(1); sum = 1; }
    idx.push(Int32Array.from(ii));
    wts.push(Float32Array.from(ww.map((w) => w / sum)));
  }
  return { idx, wts };
}

export function resample(src, outW, outH) {
  if (src.w === outW && src.h === outH) return cloneImg(src);
  const tx = taps(src.w, outW), ty = taps(src.h, outH);
  const mid = new Float32Array(outW * src.h * 4);
  const sd = src.data;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < outW; x++) {
      const ii = tx.idx[x], ww = tx.wts[x];
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < ii.length; k++) {
        const o = (y * src.w + ii[k]) * 4, w = ww[k];
        r += sd[o] * w; g += sd[o + 1] * w; b += sd[o + 2] * w; a += sd[o + 3] * w;
      }
      const m = (y * outW + x) * 4;
      mid[m] = r; mid[m + 1] = g; mid[m + 2] = b; mid[m + 3] = a;
    }
  }
  const out = makeImg(outW, outH);
  const od = out.data;
  for (let y = 0; y < outH; y++) {
    const ii = ty.idx[y], ww = ty.wts[y];
    for (let x = 0; x < outW; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < ii.length; k++) {
        const m = (ii[k] * outW + x) * 4, w = ww[k];
        r += mid[m] * w; g += mid[m + 1] * w; b += mid[m + 2] * w; a += mid[m + 3] * w;
      }
      const o = (y * outW + x) * 4;
      od[o] = r; od[o + 1] = g; od[o + 2] = b; od[o + 3] = a;
    }
  }
  return out;
}

/* ChatGPT sometimes answers a square template with a non-square picture.
   Take the centred square rather than squashing it. */
export function centreSquare(img) {
  if (img.w === img.h) return img;
  const s = Math.min(img.w, img.h);
  return crop(img, Math.floor((img.w - s) / 2), Math.floor((img.h - s) / 2), s, s);
}

export function crop(img, x0, y0, w, h) {
  const out = makeImg(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= img.h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= img.w) continue;
      const s = (sy * img.w + sx) * 4, o = (y * w + x) * 4;
      out.data[o] = img.data[s]; out.data[o + 1] = img.data[s + 1]; out.data[o + 2] = img.data[s + 2]; out.data[o + 3] = img.data[s + 3];
    }
  }
  return out;
}

/* out(q) = src(p), p = c + (q - c - d) / s: scale by s about the centre,
   then shift by d.  Bilinear, edges clamped (a shifted picture smears its
   last row into the gap rather than leaving a hole -- the gap is always on
   a side a later neighbour's overlap will paint over). */
export function warpAffine(src, s, dx, dy) {
  if (s === 1 && dx === 0 && dy === 0) return cloneImg(src);
  const w = src.w, h = src.h, out = makeImg(w, h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2, sd = src.data, od = out.data;
  for (let y = 0; y < h; y++) {
    const py = cy + (y - cy - dy) / s;
    const y0 = Math.floor(py), fy = py - y0;
    const ya = Math.min(h - 1, Math.max(0, y0)), yb = Math.min(h - 1, Math.max(0, y0 + 1));
    for (let x = 0; x < w; x++) {
      const px = cx + (x - cx - dx) / s;
      const x0 = Math.floor(px), fx = px - x0;
      const xa = Math.min(w - 1, Math.max(0, x0)), xb = Math.min(w - 1, Math.max(0, x0 + 1));
      const o00 = (ya * w + xa) * 4, o10 = (ya * w + xb) * 4, o01 = (yb * w + xa) * 4, o11 = (yb * w + xb) * 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      const o = (y * w + x) * 4;
      for (let ch = 0; ch < 4; ch++) od[o + ch] = sd[o00 + ch] * w00 + sd[o10 + ch] * w10 + sd[o01 + ch] * w01 + sd[o11 + ch] * w11;
    }
  }
  return out;
}

/* 1 where warpAffine(…, s, dx, dy) sampled INSIDE the source, 0 where it
   had to smear an edge row in.  The fuser never lets a smeared pixel replace
   a finished one. */
export function warpValid(w, h, s, dx, dy) {
  const out = new Uint8Array(w * h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    const py = cy + (y - cy - dy) / s;
    const oky = py >= 0 && py <= h - 1;
    for (let x = 0; x < w; x++) {
      const px = cx + (x - cx - dx) / s;
      out[y * w + x] = oky && px >= 0 && px <= w - 1 ? 1 : 0;
    }
  }
  return out;
}

/* Rec. 601 luma in 0..1 as a float field. */
export function luma(img) {
  const n = img.w * img.h, out = new Float32Array(n), d = img.data;
  for (let i = 0; i < n; i++) out[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
  return out;
}

/* In-place separable box blur of a float field, edges replicated. */
export function blurField(f, w, h, r) {
  if (r <= 0) return f;
  const tmp = new Float32Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let d = -r; d <= r; d++) s += f[row + Math.min(w - 1, Math.max(0, d))];
    for (let x = 0; x < w; x++) {
      tmp[x] = s / (2 * r + 1);
      s += f[row + Math.min(w - 1, x + r + 1)] - f[row + Math.max(0, x - r)];
    }
    f.set(tmp.subarray(0, w), row);
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let d = -r; d <= r; d++) s += f[Math.min(h - 1, Math.max(0, d)) * w + x];
    for (let y = 0; y < h; y++) {
      tmp[y] = s / (2 * r + 1);
      s += f[Math.min(h - 1, y + r + 1) * w + x] - f[Math.max(0, y - r) * w + x];
    }
    for (let y = 0; y < h; y++) f[y * w + x] = tmp[y];
  }
  return f;
}

/* Halve a float field (2x2 mean).  With a weight field, averages only the
   weighted samples -- a masked pyramid, so unknown pixels never bleed into
   known ones as the levels shrink. */
export function half(f, w, h, wt) {
  const W = w >> 1, H = h >> 1;
  const out = new Float32Array(W * H), ow = wt ? new Float32Array(W * H) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (2 * y) * w + 2 * x, j = i + w;
    if (wt) {
      const a = wt[i], b = wt[i + 1], c = wt[j], d = wt[j + 1], s = a + b + c + d;
      out[y * W + x] = s > 0 ? (f[i] * a + f[i + 1] * b + f[j] * c + f[j + 1] * d) / s : 0;
      ow[y * W + x] = s / 4;
    } else {
      out[y * W + x] = (f[i] + f[i + 1] + f[j] + f[j + 1]) / 4;
    }
  }
  return { f: out, w: W, h: H, wt: ow };
}
