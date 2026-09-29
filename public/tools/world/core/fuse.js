/* ═══ v2.3.2931: FUSING ONE CHATGPT SQUARE INTO THE WORLD ═══
 *
 * ChatGPT is asked to keep the finished strips of its template exactly as
 * they are.  It never quite does: it redraws the whole picture, so the kept
 * strips come back a few pixels shifted, a touch zoomed, a shade warmer, and
 * with every blade of grass re-invented.  Pasting the square down as-is would
 * put a hard line at every border.  So, in order:
 *
 *   1. ALIGN   find the small zoom + shift that best lines the picture's kept
 *              strips up with the real finished pixels (a masked normalised
 *              cross-correlation, searched coarse-to-fine on a 3-level
 *              pyramid).
 *   2. COLOUR  match its colour to the finished pixels, channel by channel,
 *              measured over the strips it was meant to keep.
 *   3. SEAM    across the whole overlap, find the cheapest line separating
 *              "must stay old" from "must become new", where crossing a pixel
 *              costs how much old and new differ there -- a minimum graph cut
 *              ("Graphcut Textures", Kwatra et al. 2003) -- so the join runs
 *              round a tree rather than through it.
 *   4. BLEND   feather across that path and write the square.
 *
 * Two layers take part.  SQUARES is everything fused so far; the WORLD view is
 * squares with the anchor paintings (the town) laid on top.  Alignment and
 * colour are measured against the world view -- that is what the template
 * showed ChatGPT -- but seams are only cut against squares: under an anchor
 * the square is written whole, and the painting's own feathered edge makes
 * that join.
 */
import { luma, blurField, half, warpAffine, warpValid, makeImg } from './image.js';
import { gridMinCut, INF } from './maxflow.js';

/* ── 1. ALIGN ── */

function levelSamples(a, wt, w, h, stride) {
  const xs = [], ys = [], vs = [];
  for (let y = 1; y < h - 1; y += stride) for (let x = 1; x < w - 1; x += stride) {
    const i = y * w + x;
    if (wt[i] >= 0.99) { xs.push(x); ys.push(y); vs.push(a[i]); }
  }
  let m = 0;
  for (const v of vs) m += v;
  m /= Math.max(1, vs.length);
  let va = 0;
  for (let k = 0; k < vs.length; k++) { vs[k] -= m; va += vs[k] * vs[k]; }
  return { xs: Int32Array.from(xs), ys: Int32Array.from(ys), vs: Float32Array.from(vs), va, n: vs.length };
}

function nccAt(smp, b, w, h, s, dx, dy) {
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  let sb = 0, sbb = 0, sab = 0;
  const n = smp.n;
  for (let k = 0; k < n; k++) {
    const px = cx + (smp.xs[k] - cx - dx) / s, py = cy + (smp.ys[k] - cy - dy) / s;
    const x0 = Math.floor(px), y0 = Math.floor(py);
    let v;
    if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) {
      v = b[Math.min(h - 1, Math.max(0, Math.round(py))) * w + Math.min(w - 1, Math.max(0, Math.round(px)))];
    } else {
      const fx = px - x0, fy = py - y0, i = y0 * w + x0;
      v = (b[i] * (1 - fx) + b[i + 1] * fx) * (1 - fy) + (b[i + w] * (1 - fx) + b[i + w + 1] * fx) * fy;
    }
    sb += v; sbb += v * v; sab += smp.vs[k] * v;
  }
  const vb = sbb - (sb * sb) / n;
  if (vb <= 1e-9 || smp.va <= 1e-9) return -1;
  return sab / Math.sqrt(smp.va * vb);
}

/* A shift or zoom has to EARN its keep in the COARSE search: in a band of
   plain grass many offsets correlate about equally, and without a small
   preference for "no change" the global search wanders off on noise.  The
   finer levels only refine inside the basin the coarse level chose, and get
   NO such preference: there it biased the answer -- with one known edge,
   zoom and shift look alike, and a pull toward zoom 1 was paid for with a
   wrong shift (F9 in tools/qa/world-page.mjs, 0.9909 against a true 0.9881). */
const penal = (s, dx, dy, lvl) => (lvl < 2 ? 0 : 0.0006 * (Math.abs(dx) + Math.abs(dy)) * (1 << lvl) + 0.8 * Math.abs(s - 1));

export function align(world, known, gen, opts = {}) {
  const w = world.w, h = world.h;
  let knownN = 0;
  for (let i = 0; i < known.length; i++) if (known[i] >= 0.99) knownN++;
  if (knownN < w * h * 0.01) return { s: 1, dx: 0, dy: 0, ncc: null, used: 0 };

  /* the world only where it is really there; ChatGPT's picture everywhere */
  const la0 = blurField(luma(world), w, h, 1), lb0 = blurField(luma(gen), w, h, 1);
  const l1 = half(la0, w, h, known), l2 = half(l1.f, l1.w, l1.h, l1.wt);
  const b1 = half(lb0, w, h), b2 = half(b1.f, b1.w, b1.h);

  const range = opts.range || 8;                 /* level-2 px = +-32 full px */
  const scales = opts.scales || [0.97, 0.985, 1, 1.015, 1.03];

  /* level 2: global search */
  let best = { s: 1, dx: 0, dy: 0, score: -Infinity, ncc: -1 };
  const sm2 = levelSamples(l2.f, l2.wt, l2.w, l2.h, 2);
  if (sm2.n < 30) return { s: 1, dx: 0, dy: 0, ncc: null, used: 0 };
  for (const s of scales) for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
    const c = nccAt(sm2, b2.f, l2.w, l2.h, s, dx, dy);
    const score = c - penal(s, dx, dy, 2);
    if (score > best.score) best = { s, dx, dy, score, ncc: c };
  }
  /* level 1: refine zoom and shift together.  They have to move together:
     when only one edge of the square is known, a little zoom and a little
     shift look alike along that edge, and a zoom left 0.3% off is silently
     "fixed" by the shift -- the known edge lines up and the far side of the
     square drifts 3 px (measured, tools/qa/world-page.mjs). */
  const sm1 = levelSamples(l1.f, l1.wt, l1.w, l1.h, 2);
  let b1best = { ...best, dx: best.dx * 2, dy: best.dy * 2, score: -Infinity };
  for (let k = -3; k <= 3; k++) {
    const s = best.s + k * 0.0025;
    for (let dy = best.dy * 2 - 2; dy <= best.dy * 2 + 2; dy++) for (let dx = best.dx * 2 - 2; dx <= best.dx * 2 + 2; dx++) {
      const c = nccAt(sm1, b1.f, l1.w, l1.h, s, dx, dy);
      const score = c - penal(s, dx, dy, 1);
      if (score > b1best.score) b1best = { s, dx, dy, score, ncc: c };
    }
  }
  /* level 0: the same at full resolution with a finer zoom step, then a
     sub-pixel parabola through the neighbouring scores on every axis */
  const kn0 = new Float32Array(known.length);
  for (let i = 0; i < known.length; i++) kn0[i] = known[i];
  const sm0 = levelSamples(la0, kn0, w, h, 3);
  const SS = 0.0008;
  let b0 = { ...b1best, dx: b1best.dx * 2, dy: b1best.dy * 2, score: -Infinity, k: 0 };
  const grid = new Map();
  for (let k = -2; k <= 2; k++) {
    const s = b1best.s + k * SS;
    for (let dy = b1best.dy * 2 - 2; dy <= b1best.dy * 2 + 2; dy++) for (let dx = b1best.dx * 2 - 2; dx <= b1best.dx * 2 + 2; dx++) {
      const c = nccAt(sm0, lb0, w, h, s, dx, dy);
      grid.set(k + ',' + dx + ',' + dy, c);
      const score = c - penal(s, dx, dy, 0);
      if (score > b0.score) b0 = { s, dx, dy, score, ncc: c, k };
    }
  }
  const para = (m, c0, p) => { const d = m - 2 * c0 + p; return d < 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (m - p) / d)) : 0; };
  const g = (k, x, y) => grid.get(k + ',' + x + ',' + y);
  const around = (a, b) => (a != null && b != null ? para(a, b0.ncc, b) : 0);
  const sdx = around(g(b0.k, b0.dx - 1, b0.dy), g(b0.k, b0.dx + 1, b0.dy));
  const sdy = around(g(b0.k, b0.dx, b0.dy - 1), g(b0.k, b0.dx, b0.dy + 1));
  const sk = around(g(b0.k - 1, b0.dx, b0.dy), g(b0.k + 1, b0.dx, b0.dy));
  return { s: b0.s + sk * SS, dx: b0.dx + sdx, dy: b0.dy + sdy, ncc: b0.ncc, used: sm0.n };
}

/* ── 2. COLOUR ── */

export function colourMatch(world, known, gen, valid) {
  const n = world.w * world.h;
  const sw = [0, 0, 0], sww = [0, 0, 0], sg = [0, 0, 0], sgg = [0, 0, 0];
  let m = 0;
  for (let i = 0; i < n; i += 2) {
    if (known[i] < 0.99 || (valid && !valid[i])) continue;
    m++;
    for (let c = 0; c < 3; c++) {
      const a = world.data[i * 4 + c], b = gen.data[i * 4 + c];
      sw[c] += a; sww[c] += a * a; sg[c] += b; sgg[c] += b * b;
    }
  }
  if (m < n * 0.005) return { gain: [1, 1, 1], bias: [0, 0, 0], used: m };
  const gain = [], bias = [];
  for (let c = 0; c < 3; c++) {
    const mw = sw[c] / m, mg = sg[c] / m;
    const vw = Math.max(1, sww[c] / m - mw * mw), vg = Math.max(1, sgg[c] / m - mg * mg);
    const k = Math.max(0.8, Math.min(1.25, Math.sqrt(vw / vg)));
    gain.push(k);
    bias.push(Math.max(-40, Math.min(40, mw - k * mg)));
  }
  return { gain, bias, used: m };
}

export function applyColour(img, col) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * col.gain[0] + col.bias[0];
    d[i + 1] = d[i + 1] * col.gain[1] + col.bias[1];
    d[i + 2] = d[i + 2] * col.gain[2] + col.bias[2];
  }
  return img;
}

/* ── 3. SEAM ──
   One minimum cut over the whole overlap (maxflow.js explains why a cut and
   not a per-side path: corner blocks, L shapes and open edges all fall out of
   the same constraints with no special cases).  Runs at 1/`R` resolution -- the cut lands on a 2 px grid at R = 2, well
   inside the feather -- because a full-resolution ring of four 256 px bands
   is a million nodes.

   Constraints:
     - an old pixel on the square's border whose neighbour just OUTSIDE the
       square is painted must stay old (that outside pixel will not change,
       so this is what keeps the square continuous with it);
     - an old pixel touching a pixel with no old (the part only the new
       square covers) must become new;
     - a pixel the alignment smeared must stay old.
   Edge cost between neighbours = how different old and new are at both,
   so the cut runs where the two pictures agree. */
export function seamGraphCut(oldImg, newImg, hasOld, valid, ring, N, R = 2) {
  const h = N / R, n = h * h;
  const oldH = new Float32Array(n * 3), newH = new Float32Array(n * 3);
  const cntOld = new Uint8Array(n), cntValid = new Uint8Array(n);
  const od = oldImg.data, nd = newImg.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, j = ((y / R) | 0) * h + ((x / R) | 0);
    if (hasOld[i]) cntOld[j]++;
    if (valid[i]) cntValid[j]++;
    for (let c = 0; c < 3; c++) { oldH[j * 3 + c] += od[i * 4 + c]; newH[j * 3 + c] += nd[i * 4 + c]; }
  }
  const RR = R * R;
  const node = new Uint8Array(n), noOld = new Uint8Array(n), bad = new Uint8Array(n), d = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    node[j] = cntOld[j] === RR ? 1 : 0;
    noOld[j] = cntOld[j] === 0 ? 1 : 0;
    bad[j] = cntValid[j] < RR ? 1 : 0;
    d[j] = bad[j] ? 1 : (Math.abs(oldH[j * 3] - newH[j * 3]) + Math.abs(oldH[j * 3 + 1] - newH[j * 3 + 1]) + Math.abs(oldH[j * 3 + 2] - newH[j * 3 + 2])) / (765 * RR);
  }
  const ringH = (arr, u) => { if (!arr) return 0; for (let k = 0; k < R; k++) if (arr[u * R + k]) return 1; return 0; };
  const term = new Float64Array(n), capR = new Int32Array(n), capD = new Int32Array(n);
  let any = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
    const j = y * h + x;
    if (!node[j]) continue;
    any = true;
    let src = bad[j] === 1;
    if (!src && ring) {
      if ((y === 0 && ringH(ring.top, x)) || (y === h - 1 && ringH(ring.bottom, x)) ||
          (x === 0 && ringH(ring.left, y)) || (x === h - 1 && ringH(ring.right, y))) src = true;
    }
    let snk = false;
    if (!src) {
      if ((x > 0 && noOld[j - 1]) || (x < h - 1 && noOld[j + 1]) || (y > 0 && noOld[j - h]) || (y < h - 1 && noOld[j + h])) snk = true;
    }
    term[j] = src ? INF : snk ? -INF : 0;
    if (x < h - 1 && node[j + 1]) capR[j] = Math.round(1000 * (d[j] + d[j + 1])) + 2;
    if (y < h - 1 && node[j + h]) capD[j] = Math.round(1000 * (d[j] + d[j + h])) + 2;
  }
  const keepOld = any ? gridMinCut(h, h, node, term, capR, capD) : new Uint8Array(n);

  /* the cut's own cost: every boundary between an old-side and a new-side
     pixel, including where kept-old meets the new-only area */
  let cost = 0, edges = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
    const j = y * h + x;
    if (!node[j] || !keepOld[j]) continue;
    const nb = [x < h - 1 ? j + 1 : -1, x > 0 ? j - 1 : -1, y < h - 1 ? j + h : -1, y > 0 ? j - h : -1];
    for (const k of nb) {
      if (k < 0) continue;
      if ((node[k] && !keepOld[k]) || noOld[k]) { cost += node[k] ? (d[j] + d[k]) / 2 : d[j]; edges++; }
    }
  }
  const newMask = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (!hasOld[i]) { newMask[i] = 1; continue; }
    const j = ((y / R) | 0) * h + ((x / R) | 0);
    newMask[i] = node[j] && keepOld[j] ? 0 : (valid[i] ? 1 : 0);
  }
  return { newMask, cost: edges ? cost / edges : 0, edges: edges * R };
}

/* ── 4. THE WHOLE FUSE ──
   world   : N x N RGBA, squares + anchors over this square (alpha 0 = nothing)
   squares : N x N RGBA, the squares layer only (alpha 0 = never painted)
   gen     : N x N RGBA, ChatGPT's picture already resampled to N x N
   ring    : { top, right, bottom, left } Uint8Array(N) -- 1 where the pixel
             just OUTSIDE the square is painted (those edges must stay
             continuous); the overlap's shape comes from `squares` itself
   Returns the new squares-layer pixels for the square and everything the
   builder shows about how it went. */
export function fuseSquare({ world, squares, gen, ring, feather = 12, alignRange, seamScale = 2 }) {
  const N = world.w, n = N * N;
  const known = new Float32Array(n);
  for (let i = 0; i < n; i++) known[i] = world.data[i * 4 + 3] / 255;
  const hasOld = new Uint8Array(n);
  for (let i = 0; i < n; i++) hasOld[i] = squares.data[i * 4 + 3] > 127 ? 1 : 0;

  const T = align(world, known, gen, { range: alignRange });
  const moved = warpAffine(gen, T.s, T.dx, T.dy);
  const valid = warpValid(N, N, T.s, T.dx, T.dy);
  const col = colourMatch(world, known, moved, valid);
  applyColour(moved, col);

  /* where the picture was supposed to repeat finished pixels, how far off
     it is after alignment + colour (0 = identical, 1 = opposite) */
  let bandDiff = 0, bandN = 0;
  for (let i = 0; i < n; i += 3) {
    if (known[i] < 0.99 || !valid[i]) continue;
    const o = i * 4;
    bandDiff += (Math.abs(world.data[o] - moved.data[o]) + Math.abs(world.data[o + 1] - moved.data[o + 1]) + Math.abs(world.data[o + 2] - moved.data[o + 2])) / 765;
    bandN++;
  }
  bandDiff = bandN ? bandDiff / bandN : 0;

  const cut = seamGraphCut(squares, moved, hasOld, valid, ring, N, seamScale);
  const newMask = cut.newMask;
  const seamCost = cut.cost, seamPts = cut.edges;

  /* feather the cut, then pin: no old pixel -> new, whatever the blur says;
     a smeared new pixel never replaces an old one */
  const alpha = blurField(new Float32Array(newMask), N, N, Math.max(1, feather >> 1));
  blurField(alpha, N, N, Math.max(1, feather >> 1));
  for (let i = 0; i < n; i++) {
    if (!hasOld[i]) alpha[i] = 1;
    else if (!valid[i]) alpha[i] = 0;
  }

  const out = makeImg(N, N);
  const od = out.data, sd = squares.data, md = moved.data;
  for (let i = 0; i < n; i++) {
    const o = i * 4, a = alpha[i];
    od[o] = md[o] * a + sd[o] * (1 - a);
    od[o + 1] = md[o + 1] * a + sd[o + 1] * (1 - a);
    od[o + 2] = md[o + 2] * a + sd[o + 2] * (1 - a);
    od[o + 3] = 255;
  }

  return {
    out, alpha, newMask,
    transform: { s: T.s, dx: T.dx, dy: T.dy, ncc: T.ncc },
    colour: col, seamCost, bandDiff, seamLength: seamPts,
    rating: rate(T.ncc, seamCost, seamPts),
  };
}

/* How the fuse went, in words the owner can act on.  Thresholds calibrated
   on real zone paintings cut into overlapping squares and damaged the way a
   regenerated picture is (tools/world/test-world-core.mjs keeps the cases):
     exact copy                  ncc 1.00  seam 0.007
     re-rendered fine texture    ncc 0.97  seam 0.027
     + shapes moved 6 px         ncc 0.92  seam 0.032
     + shapes moved 15-30 px     ncc 0.83  seam 0.05
     strong colour cast          ncc 0.99  seam 0.022   (colour match absorbs it)
     a different picture         ncc 0.41  seam 0.15
   ncc is how well the kept strips line up after alignment; seam is the mean
   old/new difference along the cut the fuser chose. */
export function rate(ncc, seamCost, seamPts) {
  if (!seamPts && ncc == null) return { grade: 'first', text: 'Nothing to join yet — this square starts its own patch.' };
  if (ncc != null && ncc < 0.55) return { grade: 'bad', text: 'ChatGPT did not keep the finished edges — the picture does not line up with its neighbours. Try again.' };
  if (seamCost < 0.04) return { grade: 'great', text: 'Seamless.' };
  if (seamCost < 0.07) return { grade: 'ok', text: 'Joins well — look along the edges to be sure.' };
  if (seamCost < 0.11) return { grade: 'visible', text: 'The join may show. Look closely; try again if it bothers you.' };
  return { grade: 'bad', text: 'The join will show. Try again.' };
}
