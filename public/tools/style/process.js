/* ═══ v2.3.2934: THE STYLE LAB'S PICTURE PIPELINE ═══
 *
 * What happens to a ChatGPT picture before the lab draws it -- and, if a
 * pixel look wins, what the game's asset pipeline will do to every picture
 * (docs/WORLD-ARCHITECTURE.md, "The art pipeline"):
 *
 *   keyOut        the flat magenta background becomes transparent, and the
 *                 magenta fringe is taken back out of the edge pixels
 *   splitObjects  a sheet of several objects becomes one picture each
 *   seamless      a ground tile is made to repeat without a visible edge
 *                 (v2.3.2953: by a hard cut where the picture's two ends
 *                 look alike, no longer the cross-fade the trial bake uses)
 *   snap          reduced to a pixel grid (game px per art pixel) with hard
 *                 edges, then mapped onto ONE palette shared by the whole look,
 *                 with stray single pixels cleaned up (v2.3.2935, despeckle)
 *
 * The snap is the point of the exercise.  ChatGPT's "pixel art" has no fixed
 * grid and a few hundred colours; snapped, every picture of a look sits on the
 * bro's grid in the same colours, whichever chat it came from.
 *
 * Plain DOM canvases rather than OffscreenCanvas: the target is iPhone Safari.
 */

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });

/* The picture, capped so a phone never holds a 4K upload at full size. */
export async function blobToCanvas(blob, maxSide = 1600) {
  const bm = await createImageBitmap(blob);
  const k = Math.min(1, maxSide / Math.max(bm.width, bm.height));
  const c = mk(bm.width * k, bm.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bm, 0, 0, c.width, c.height);
  if (bm.close) bm.close();
  return c;
}

export function copy(src) {
  const c = mk(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/* ── keyOut ──
   Not a plain colour-distance key: a pixel half magenta and half leaf green is
   FAR from magenta, so a distance key keeps it whole and every object wears a
   purple rim (tools/qa/style-lab.mjs caught exactly that).  Instead:
     1. background = close to the border's colour;
     2. the edge band = the pixels within 2 px of background;
     3. each edge pixel's alpha is how far it sits from the background toward
        the object's own colour just inside it (the mean of solid pixels in a
        9 x 9 window), and its colour is un-mixed from the background with
        that alpha -- so a dark outline anti-aliased into magenta comes back
        dark, and a green leaf edge comes back green. */
export function keyOut(src) {
  const c = copy(src);
  const w = c.width, h = c.height, g = ctx2d(c);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  /* a picture that already has real transparency is left as it is */
  let clear = 0, n = 0;
  for (let i = 3; i < d.length; i += 4 * 97) { n++; if (d[i] < 250) clear++; }
  if (n && clear / n > 0.05) return { canvas: c, keyed: false };
  /* the background is the commonest colour round the border */
  const counts = new Map();
  let best = -1, bestN = 0;
  const bucket = (i) => ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
  const border = [];
  for (let x = 0; x < w; x += 2) border.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y += 2) border.push(0, y, w - 1, y);
  for (let k = 0; k < border.length; k += 2) {
    const b = bucket((border[k + 1] * w + border[k]) * 4);
    const m = (counts.get(b) || 0) + 1;
    counts.set(b, m);
    if (m > bestN) { bestN = m; best = b; }
  }
  let br = 0, bgc = 0, bb = 0, bn = 0;
  for (let k = 0; k < border.length; k += 2) {
    const i = (border[k + 1] * w + border[k]) * 4;
    if (bucket(i) === best) { br += d[i]; bgc += d[i + 1]; bb += d[i + 2]; bn++; }
  }
  br /= bn; bgc /= bn; bb /= bn;
  const N = w * h, T0 = 60, R = 2, WIN = R + 2;
  const bgm = new Uint8Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const dr = d[i] - br, dg = d[i + 1] - bgc, db = d[i + 2] - bb;
    if (dr * dr + dg * dg + db * db < T0 * T0) bgm[p] = 1;
  }
  /* within R px of background: a separable max filter */
  const tmp = new Uint8Array(N), near = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let u = Math.max(0, x - R); u <= Math.min(w - 1, x + R) && !v; u++) v = bgm[y * w + u];
    tmp[y * w + x] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let t = Math.max(0, y - R); t <= Math.min(h - 1, y + R) && !v; t++) v = tmp[t * w + x];
    near[y * w + x] = v;
  }
  const out = new Uint8ClampedArray(d);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (bgm[p]) { out[i + 3] = 0; continue; }
    if (!near[p]) continue;
    const x = p % w, y = (p / w) | 0;
    let fr = 0, fg = 0, fb = 0, fn = 0;
    for (let t = Math.max(0, y - WIN); t <= Math.min(h - 1, y + WIN); t++) {
      for (let u = Math.max(0, x - WIN); u <= Math.min(w - 1, x + WIN); u++) {
        const q = t * w + u;
        if (near[q]) continue;
        const j = q * 4;
        fr += d[j]; fg += d[j + 1]; fb += d[j + 2]; fn++;
      }
    }
    let a;
    if (fn) {
      fr /= fn; fg /= fn; fb /= fn;
      const vr = fr - br, vg = fg - bgc, vb = fb - bb;
      const ur = d[i] - br, ug = d[i + 1] - bgc, ub = d[i + 2] - bb;
      const vv = vr * vr + vg * vg + vb * vb;
      a = vv > 1 ? (ur * vr + ug * vg + ub * vb) / vv : 1;
    } else {
      /* a sliver with no solid inside (a twig, a thin post): fall back to how
         far it is from the background */
      const dist = Math.sqrt((d[i] - br) ** 2 + (d[i + 1] - bgc) ** 2 + (d[i + 2] - bb) ** 2);
      a = (dist - T0) / 120;
    }
    a = Math.max(0, Math.min(1, a));
    if (a < 0.03) { out[i + 3] = 0; continue; }
    if (a < 0.97) {
      let r = (d[i] - br * (1 - a)) / a, gg = (d[i + 1] - bgc * (1 - a)) / a, bl = (d[i + 2] - bb * (1 - a)) / a;
      /* whatever spill is left: an edge pixel never keeps the key's colour */
      const spill = Math.min(r, bl) - gg;
      if (br > 150 && bb > 150 && bgc < 110 && spill > 50) { r -= spill - 50; bl -= spill - 50; }
      out[i] = r; out[i + 1] = gg; out[i + 2] = bl;
    }
    out[i + 3] = Math.round(a * 255);
  }
  img.data.set(out);
  g.putImageData(img, 0, 0);
  return { canvas: c, keyed: true, background: [Math.round(br), Math.round(bgc), Math.round(bb)] };
}

/* The box round everything more than faintly opaque. */
export function trim(src, alphaMin = 24) {
  const w = src.width, h = src.height;
  const d = ctx2d(src).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > alphaMin) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const c = mk(x1 - x0 + 1, y1 - y0 + 1);
  c.getContext('2d').drawImage(src, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

/* ── splitObjects ──
   Coarse occupancy grid, dilated so a canopy and its trunk (or a sign and its
   post) stay one object, then connected parts, largest `want`, left to right. */
export function splitObjects(src, want = 4) {
  const w = src.width, h = src.height;
  const d = ctx2d(src).getImageData(0, 0, w, h).data;
  const cell = Math.max(1, Math.round(Math.max(w, h) / 320));
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const occ = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y += 1) {
    const row = ((y / cell) | 0) * gw;
    for (let x = 0; x < w; x += 1) if (d[(y * w + x) * 4 + 3] > 96) occ[row + ((x / cell) | 0)] = 1;
  }
  const R = 3;
  const dil = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!occ[y * gw + x]) continue;
    for (let v = Math.max(0, y - R); v <= Math.min(gh - 1, y + R); v++)
      for (let u = Math.max(0, x - R); u <= Math.min(gw - 1, x + R); u++) dil[v * gw + u] = 1;
  }
  const lab = new Int32Array(gw * gh).fill(-1);
  const parts = [];
  const stack = [];
  for (let s = 0; s < gw * gh; s++) {
    if (!dil[s] || lab[s] >= 0) continue;
    const id = parts.length;
    const p = { x0: gw, y0: gh, x1: -1, y1: -1, n: 0 };
    lab[s] = id; stack.push(s);
    while (stack.length) {
      const q = stack.pop();
      const qx = q % gw, qy = (q / gw) | 0;
      if (occ[q]) {
        p.n++;
        if (qx < p.x0) p.x0 = qx; if (qx > p.x1) p.x1 = qx;
        if (qy < p.y0) p.y0 = qy; if (qy > p.y1) p.y1 = qy;
      }
      const nb = [q - 1, q + 1, q - gw, q + gw];
      for (let k = 0; k < 4; k++) {
        const r = nb[k];
        if (r < 0 || r >= gw * gh) continue;
        if ((k === 0 && qx === 0) || (k === 1 && qx === gw - 1)) continue;
        if (dil[r] && lab[r] < 0) { lab[r] = id; stack.push(r); }
      }
    }
    if (p.n) parts.push(p);
  }
  if (!parts.length) return [];
  const biggest = Math.max(...parts.map((p) => p.n));
  const kept = parts.filter((p) => p.n >= biggest * 0.03).sort((a, b) => b.n - a.n).slice(0, want);
  kept.sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
  const out = [];
  for (const p of kept) {
    const x = p.x0 * cell, y = p.y0 * cell;
    const cw = Math.min(w - x, (p.x1 - p.x0 + 1) * cell), ch = Math.min(h - y, (p.y1 - p.y0 + 1) * cell);
    const c = mk(cw, ch);
    c.getContext('2d').drawImage(src, x, y, cw, ch, 0, 0, cw, ch);
    const t = trim(c);
    if (t) out.push(t);
  }
  return out;
}

/* ── seamless ── v2.3.2953: by an OVERLAP CUT, not a cross-fade.
   Until now the picture was laid over itself shifted half a tile, faded in
   across the outer quarter each way (the trial bake's way) -- so three
   quarters of every tile was two pictures at once.  On the owner's own
   square, yard and blend pictures (2026-09-30) every stone there came out
   see-through, the ground between was the low-contrast mush that averaging
   two textures makes (docs/TRAPS.md, the town seam: the cure is an
   irregular hard cut), and the middle of the picture showed twice in every
   tile.  Now the tile repeats every n - ov px: the picture's last ov
   columns are laid over its first ov, the two meeting along the cheapest
   path down that strip -- where they already look alike, which runs round
   the stones, not through them -- so the tile's right side runs on into
   its left through the picture's own pixels.  Then the rows the same way,
   that path closing on itself round the tile.  Every pixel is one of the
   picture's own, none is shown twice, and the tile comes out ov smaller
   (the callers resize it).  The overlap is whichever of 12-20% of the
   picture joins best -- ChatGPT's pictures carry a pixel grid of their own,
   and some overlaps line it up across the join better than others. */
export function seamless(src) {
  const w = src.width, h = src.height;
  const r = seamlessPixels(ctx2d(src).getImageData(0, 0, w, h).data, w, h);
  const out = mk(r.w, r.h);
  out.getContext('2d').putImageData(new ImageData(r.data, r.w, r.h), 0, 0);
  return out;
}

/* The same on RGBA pixels (no canvas, so Node can test it):
   { data, w, h, overlap } */
export function seamlessPixels(data, w, h, overlap = 0) {
  const n = Math.min(w, h);
  const ov = overlap || bestOverlap(data, w, h, Math.max(4, Math.round(n * 0.12)), Math.max(4, Math.round(n * 0.2)));
  const a = overlapCut(data, w, h, true, ov);
  const b = overlapCut(a.data, a.w, a.h, false, ov);
  return { data: b.data, w: b.w, h: b.h, overlap: ov };
}

/* how unlike two pixels are (brightness counting most) */
const unlike = (d, i, j) => {
  const r = d[i] - d[j], g = d[i + 1] - d[j + 1], b = d[i + 2] - d[j + 2];
  return r * r * 0.3 + g * g * 0.59 + b * b * 0.11;
};

/* One axis: the picture made to repeat every W - ov px along it (x when
   `alongX`, else y).  u runs along that axis, v across it; the cut is one u
   per v, in [1, ov - 2] -- the tile's first pixel must be the picture's end
   laid over (it runs on from the tile's last), its pixel ov - 1 the
   picture's start going on.  The rows' pass (the second) closes the path on
   itself, so the tile still repeats along x. */
function overlapCut(data, w, h, alongX, ov) {
  const W = alongX ? w : h, H = alongX ? h : w, P = W - ov;
  const at = alongX ? (u, v) => (v * w + u) * 4 : (u, v) => (u * w + v) * 4;
  /* the cost of the join at each place in the strip, over a 5 x 5 box: a
     cut beside a stone in one picture and not the other costs as much as
     one through it */
  const e0 = new Float32Array(ov * H), e1 = new Float32Array(ov * H), e = new Float32Array(ov * H);
  for (let v = 0; v < H; v++) for (let u = 0; u < ov; u++) e0[v * ov + u] = unlike(data, at(u, v), at(u + P, v));
  for (let v = 0; v < H; v++) for (let u = 0; u < ov; u++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += e0[v * ov + Math.min(ov - 1, Math.max(0, u + k))];
    e1[v * ov + u] = s;
  }
  for (let v = 0; v < H; v++) for (let u = 0; u < ov; u++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += e1[(alongX ? Math.min(H - 1, Math.max(0, v + k)) : (v + k + H) % H) * ov + u];
    e[v * ov + u] = s;
  }
  const cut = cheapestPath(e, ov, H, 1, ov - 2, !alongX);
  const OW = alongX ? P : w, OH = alongX ? h : P, out = new Uint8ClampedArray(OW * OH * 4);
  for (let v = 0; v < H; v++) for (let u = 0; u < P; u++) {
    const i = (alongX ? v * OW + u : u * OW + v) * 4, j = at(u < cut[v] ? u + P : u, v);
    out[i] = data[j]; out[i + 1] = data[j + 1]; out[i + 2] = data[j + 2]; out[i + 3] = data[j + 3];
  }
  return { data: out, w: OW, h: OH };
}

/* The cheapest path through costs e (n wide, H long), one u in [lo, hi] per
   v, moving at most one a step.  Closed: its last u within one of its first
   -- tried from where the free path starts and ends and from the few
   cheapest places in the first row, keeping the cheapest. */
function cheapestPath(e, n, H, lo, hi, closed) {
  const m = hi - lo + 1;
  const run = (start) => {
    let C = new Float64Array(m), N = new Float64Array(m);
    const from = new Int16Array(m * H);
    for (let k = 0; k < m; k++) C[k] = start < 0 || k === start ? e[lo + k] : Infinity;
    for (let v = 1; v < H; v++) {
      for (let k = 0; k < m; k++) {
        let b = C[k], bk = k;
        if (k > 0 && C[k - 1] < b) { b = C[k - 1]; bk = k - 1; }
        if (k < m - 1 && C[k + 1] < b) { b = C[k + 1]; bk = k + 1; }
        N[k] = b + e[v * n + lo + k];
        from[v * m + k] = bk;
      }
      [C, N] = [N, C];
    }
    let best = Infinity, bk = 0;
    for (let k = 0; k < m; k++) if ((start < 0 || Math.abs(k - start) <= 1) && C[k] < best) { best = C[k]; bk = k; }
    const path = new Int32Array(H);
    for (let v = H - 1; v >= 0; v--) { path[v] = lo + bk; bk = from[v * m + bk]; }
    return { cost: best, path };
  };
  const free = run(-1);
  if (!closed) return free.path;
  const starts = new Set([free.path[0] - lo, free.path[H - 1] - lo]);
  const first = [...Array(m).keys()].sort((a, b) => e[lo + a] - e[lo + b]);
  for (const k of first.slice(0, 6)) starts.add(k);
  let best = null;
  for (const s of starts) { const r = run(s); if (!best || r.cost < best.cost) best = r; }
  return best.path;
}

/* Which overlap in [lo, hi] joins best, both ways: every third one tried
   on every other row and column (the join's cost along its cheapest path,
   unsmoothed), the cheapest kept */
function bestOverlap(data, w, h, lo, hi) {
  let best = lo, bestCost = Infinity;
  for (let ov = lo; ov <= hi; ov += 3) {
    let cost = 0;
    for (const alongX of [true, false]) {
      const W = alongX ? w : h, H = alongX ? h : w, P = W - ov;
      const at = alongX ? (u, v) => (v * w + u) * 4 : (u, v) => (u * w + v) * 4;
      const m = Math.floor((ov - 2) / 2);
      let C = new Float64Array(m), N = new Float64Array(m);
      for (let v = 0; v < H; v += 2) {
        for (let k = 0; k < m; k++) {
          const c = unlike(data, at(1 + 2 * k, v), at(1 + 2 * k + P, v));
          N[k] = v === 0 ? c : c + Math.min(C[k], k > 0 ? C[k - 1] : Infinity, k < m - 1 ? C[k + 1] : Infinity);
        }
        [C, N] = [N, C];
      }
      cost += Math.min(...C);
    }
    if (cost < bestCost) { bestCost = cost; best = ov; }
  }
  return best;
}

/* A good-quality shrink: halve while more than twice too big, then the rest. */
export function resize(src, w, h, smooth = true) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  let cur = src;
  if (smooth) {
    while (cur.width > w * 2 && cur.height > h * 2) {
      const half = mk(cur.width / 2, cur.height / 2), hg = half.getContext('2d');
      hg.imageSmoothingQuality = 'high';
      hg.drawImage(cur, 0, 0, half.width, half.height);
      cur = half;
    }
  }
  const c = mk(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = smooth;
  if (smooth) g.imageSmoothingQuality = 'high';
  g.drawImage(cur, 0, 0, w, h);
  return c;
}

/* ── the palette ── median cut over sampled opaque pixels of every picture
   in the look, so ground and objects end up sharing one set of colours.
   v2.3.2937: `perPicture` caps the pixels read from each picture (the
   Ground Studio lowers it when it has a hundred pictures, so the samples
   stay a few MB on a phone rather than a hundred). */
export function buildPalette(canvases, n, perPicture = 24000) {
  const samples = [];
  for (const c of canvases) {
    if (!c) continue;
    const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    const px = c.width * c.height;
    const step = Math.max(1, Math.floor(px / perPicture));
    for (let p = 0; p < px; p += step) {
      const i = p * 4;
      if (d[i + 3] >= 128) samples.push([d[i], d[i + 1], d[i + 2]]);
    }
  }
  return medianCut(samples, n);
}

/* v2.3.2961: a picture's OWN colours, for a ground swatch (bible.js
   PIXEL.ownColours) -- the same median cut, over its own opaque pixels
   only.  Pure, on RGBA: the Ground Studio and the game's worker make the
   same colours from the same pixels.  OWN_SAMPLES pixels at most, evenly
   spread: plenty for 64 colours, and quick on a phone. */
const OWN_SAMPLES = 65536;
export function ownPalette(d, w, h, n, perPicture = OWN_SAMPLES) {
  const samples = [];
  const px = w * h, step = Math.max(1, Math.floor(px / perPicture));
  for (let p = 0; p < px; p += step) {
    const i = p * 4;
    if (d[i + 3] >= 128) samples.push([d[i], d[i + 1], d[i + 2]]);
  }
  return medianCut(samples, n);
}
/* v2.3.2961: the colours a picture already has, as a palette -- null past
   `max` of them (a picture not yet on any palette) */
export function coloursOf(d, max = 256) {
  const seen = new Map(), out = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (seen.has(key)) continue;
    if (out.length === max) return null;
    seen.set(key, out.length);
    out.push([d[i], d[i + 1], d[i + 2]]);
  }
  return out;
}

/* v2.3.2961: each box's widest channel measured once, when it is made --
   not every box again for every cut, which made a swatch's own 64 colours
   cost 155 ms (the Ground Studio makes 96 on every load).  The same cuts in
   the same order: the first box, and its first channel, of the widest
   range wins, as before. */
function medianCut(samples, n) {
  if (!samples.length || n < 2) return [];
  const span = (b) => {
    let range = -1, ch = 0;
    if (b.length >= 2) {
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const s of b) { if (s[c] < lo) lo = s[c]; if (s[c] > hi) hi = s[c]; }
        if (hi - lo > range) { range = hi - lo; ch = c; }
      }
    }
    return { b, range, ch };
  };
  const boxes = [span(samples)];
  while (boxes.length < n) {
    let bi = -1, bestRange = -1, bestCh = 0;
    for (let k = 0; k < boxes.length; k++) if (boxes[k].range > bestRange) { bestRange = boxes[k].range; bi = k; bestCh = boxes[k].ch; }
    if (bi < 0 || bestRange <= 0) break;
    const b = boxes[bi].b;
    b.sort((u, v) => u[bestCh] - v[bestCh]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, span(b.slice(0, mid)), span(b.slice(mid)));
  }
  return boxes.map(({ b }) => {
    let r = 0, g = 0, bl = 0;
    for (const s of b) { r += s[0]; g += s[1]; bl += s[2]; }
    return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
  });
}

export function nearestIn(pal) {
  const cache = new Map();
  return (r, g, b) => {
    const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let c = cache.get(k);
    if (c === undefined) {
      let bd = Infinity;
      for (let j = 0; j < pal.length; j++) {
        const dr = r - pal[j][0], dg = g - pal[j][1], db = b - pal[j][2];
        const dd = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dd < bd) { bd = dd; c = j; }
      }
      cache.set(k, c);
    }
    return pal[c];
  };
}

/* Hard alpha (pixel art has no half-transparent pixels) and, given a
   palette, every colour moved onto it and the stray pixels cleaned up.
   In place. */
export function hardenAndMap(c, pal) {
  const g = ctx2d(c);
  const img = g.getImageData(0, 0, c.width, c.height);
  mapPixels(img.data, c.width, c.height, pal);
  g.putImageData(img, 0, 0);
  return c;
}
/* v2.3.2943: hardenAndMap's pixel half, on raw RGBA -- the game's ground
   worker (world/core/ground-worker.js) runs it on the Ground Studio's own
   tiles, where there is no page canvas, and gets the studio's pixels. */
export function mapPixels(d, w, h, pal) {
  const near = pal && pal.length ? nearestIn(pal) : null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    if (near) { const p = near(d[i], d[i + 1], d[i + 2]); d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; }
  }
  if (near) despeckle(d, w, h);
  return d;
}

/* v2.3.2935: HD pixel rule 5 (docs/WORLD-BIBLE.md §6) -- detail comes in
   clusters of two or more pixels.  Snapping a ChatGPT picture leaves single
   pixels of noise that shimmer when the camera moves.  A pixel that shares
   its colour (or its transparency) with none of its four neighbours, while
   three of them agree, takes theirs.  A 1-px line or outline always shares
   with a neighbour along it, so it stays.  The picture's own border is left
   alone.  In place, on hard-alpha RGBA. */
export function despeckle(d, w, h) {
  const src = new Uint8ClampedArray(d);
  const key = (i) => (src[i + 3] ? ((src[i] << 16) | (src[i + 1] << 8) | src[i + 2]) : -1);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4, me = key(i);
    const a = i - 4, b = i + 4, c = i - w * 4, e = i + w * 4;
    const ka = key(a), kb = key(b), kc = key(c), ke = key(e);
    if (ka === me || kb === me || kc === me || ke === me) continue;
    let from = -1;
    if ((ka === kb) + (ka === kc) + (ka === ke) >= 2) from = a;
    else if (kb === kc && kb === ke) from = b;
    if (from < 0) continue;
    d[i] = src[from]; d[i + 1] = src[from + 1]; d[i + 2] = src[from + 2]; d[i + 3] = src[from + 3];
  }
}

/* The picture as it will sit in the world: `worldW` x `worldH` game px.
   snap > 0 -> one art pixel per `snap` game px, hard alpha, palette.
   snap = 0 -> kept smooth at up to `maxDensity` art px per game px. */
export function snap(src, worldW, worldH, render, pal, maxDensity = 2.5) {
  if (render.snap > 0) {
    const c = resize(src, worldW / render.snap, worldH / render.snap, true);
    hardenAndMap(c, render.palette ? pal : null);
    return c;
  }
  const k = Math.min(1, (worldW * maxDensity) / src.width);
  return k < 1 ? resize(src, src.width * k, src.height * k, true) : src;
}

export function countColours(c) {
  const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
  const set = new Set();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return set.size;
}
