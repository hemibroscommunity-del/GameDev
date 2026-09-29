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
 *                 (the same per-axis cross-fade as tools/world/bake-trial-world.mjs)
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

/* ── seamless ── one axis at a time (see the bake's note on why). */
export function seamless(src) {
  const w = src.width, h = src.height;
  const pass = (s, axis) => {
    const out = mk(w, h), og = out.getContext('2d');
    og.drawImage(s, 0, 0);
    const cp = mk(w, h), cg = cp.getContext('2d');
    const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
    if (axis === 'x') { cg.drawImage(s, -hw, 0); cg.drawImage(s, w - hw, 0); }
    else { cg.drawImage(s, 0, -hh); cg.drawImage(s, 0, h - hh); }
    const m = mk(w, h), mg = m.getContext('2d');
    const img = mg.createImageData(w, h);
    const n = axis === 'x' ? w : h, r = n / 4;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const q = axis === 'x' ? x : y;
      const e = Math.min(q, n - 1 - q);
      const v = e >= r ? 0 : 1 - e / r;
      img.data[(y * w + x) * 4 + 3] = Math.round(255 * v * v * (3 - 2 * v));
    }
    mg.putImageData(img, 0, 0);
    cg.globalCompositeOperation = 'destination-in';
    cg.drawImage(m, 0, 0);
    og.drawImage(cp, 0, 0);
    return out;
  };
  return pass(pass(src, 'x'), 'y');
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
   in the look, so ground and objects end up sharing one set of colours. */
export function buildPalette(canvases, n) {
  const samples = [];
  for (const c of canvases) {
    if (!c) continue;
    const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    const px = c.width * c.height;
    const step = Math.max(1, Math.floor(px / 24000));
    for (let p = 0; p < px; p += step) {
      const i = p * 4;
      if (d[i + 3] >= 128) samples.push([d[i], d[i + 1], d[i + 2]]);
    }
  }
  if (!samples.length || n < 2) return [];
  const boxes = [samples];
  while (boxes.length < n) {
    let bi = -1, bestRange = -1, bestCh = 0;
    for (let k = 0; k < boxes.length; k++) {
      const b = boxes[k];
      if (b.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0;
        for (const s of b) { if (s[ch] < lo) lo = s[ch]; if (s[ch] > hi) hi = s[ch]; }
        if (hi - lo > bestRange) { bestRange = hi - lo; bi = k; bestCh = ch; }
      }
    }
    if (bi < 0 || bestRange <= 0) break;
    const b = boxes[bi];
    b.sort((u, v) => u[bestCh] - v[bestCh]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.map((b) => {
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
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  const near = pal && pal.length ? nearestIn(pal) : null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    if (near) { const p = near(d[i], d[i + 1], d[i + 2]); d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; }
  }
  if (near) despeckle(d, c.width, c.height);
  g.putImageData(img, 0, 0);
  return c;
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
