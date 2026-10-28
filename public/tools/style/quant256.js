/* ═══ v2.3.3728: A PICTURE ON 256 COLOURS OR FEWER ═══
 *
 * The owner, 2026-10-28, of a picture's colours: "You can go ahead and reduce
 * it. I won't notice at all from anything at 256", and as a standing rule:
 * "everything converted using this more efficient method as standard
 * protocol (art, audio, animations, etc)".  A picture on 256 colours or fewer
 * is drawn by the game as colour numbers, one byte a pixel where it was four
 * (src/rendering/paletteTex.js); docs/specs/pictures-256.md.
 *
 * reduce256(rgba, w, h) gives the picture back on at most 256 colours, as a
 * palette and a number for every pixel:
 *   - a picture already on 256 or fewer comes back EXACTLY as it was;
 *   - a fully see-through pixel stays fully see-through (number 0), and a
 *     fully solid one stays fully solid: the solid pixels and the soft ones
 *     (a glow's edge, an anti-aliased rim) get colours of their own, so a
 *     solid body never turns faintly see-through nor a glow solid;
 *   - colours are compared in OKLab, where equal distances look equally
 *     different, so the colours go where the eye tells them apart; a soft
 *     pixel's colour counts by how much of it shows (its alpha);
 *   - no dithering: a dithered frame shimmers when it animates.  Every pixel
 *     takes its nearest colour.
 * The colours are found by splitting the picture's own colours (counted, so a
 * colour on many pixels pulls harder) where they spread most, then refined
 * (k-means, a few rounds).  Deterministic: the same picture, the same answer.
 *
 * Pure: no DOM, no imports.  The Object Studio's pipeline (process.js
 * `reduceColours`) and the one-time tool for the existing files
 * (tools/art/reduce256.mjs) run the same code; server/test/quant256.test.mjs
 * holds it to its promises.
 */

const MAX = 256;
const COARSE_OVER = 40000;   /* colours past which the split works on rounded ones */

/* sRGB 0-255 -> linear, once */
const LIN = new Float64Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

/* OKLab (Björn Ottosson's), L about 0..1 */
export function oklab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}
function toSrgbByte(x) {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}
export function fromOklab(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [
    toSrgbByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgbByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgbByte(-0.0041960771 * l - 0.7034226162 * m + 1.7076651957 * s),
  ];
}

/* how far apart two colours look: OKLab, alpha as a fourth axis (a glow's
   fade is a difference the eye sees as clearly as a hue's) */
const ALPHA_W = 0.6;

/* the picture's own colours, counted: { keys (RGBA as one number), n } --
   fully see-through pixels are left out (they are number 0) */
function histogram(d) {
  const counts = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const k = ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return counts;
}

/* one set of colours, split from the group's points where they spread the
   most (the box with the largest weighted spread, cut at its weighted
   middle), then refined.  `pts`: [{ v: [L, a, b, A], w, key }] */
function cluster(pts, n, rounds) {
  if (!pts.length || n <= 0) return [];
  if (pts.length <= n) return pts.map((p) => p.v.slice());
  const stat = (b) => {
    let W = 0; const m = [0, 0, 0, 0];
    for (const p of b) { W += p.w; for (let c = 0; c < 4; c++) m[c] += p.w * p.v[c]; }
    for (let c = 0; c < 4; c++) m[c] /= W || 1;
    let sse = 0, best = 0, axis = 0;
    const vs = [0, 0, 0, 0];
    for (const p of b) for (let c = 0; c < 4; c++) { const d = p.v[c] - m[c]; vs[c] += p.w * d * d; }
    for (let c = 0; c < 4; c++) { sse += vs[c]; if (vs[c] > best) { best = vs[c]; axis = c; } }
    return { b, m, sse, axis };
  };
  const boxes = [stat(pts)];
  while (boxes.length < n) {
    let bi = -1, top = 0;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].b.length > 1 && boxes[i].sse > top) { top = boxes[i].sse; bi = i; }
    if (bi < 0) break;
    const { b, axis } = boxes[bi];
    b.sort((p, q) => p.v[axis] - q.v[axis] || p.key - q.key);
    let W = 0; for (const p of b) W += p.w;
    let acc = 0, cut = 1;
    for (let i = 0; i < b.length - 1; i++) { acc += b[i].w; if (acc >= W / 2) { cut = i + 1; break; } }
    boxes.splice(bi, 1, stat(b.slice(0, cut)), stat(b.slice(cut)));
  }
  let cents = boxes.map((x) => x.m);
  /* k-means: every point to its nearest centre, every centre to its points' mean */
  for (let r = 0; r < rounds; r++) {
    const sum = cents.map(() => [0, 0, 0, 0, 0]);
    for (const p of pts) {
      const j = nearest(cents, p.v);
      const s = sum[j];
      for (let c = 0; c < 4; c++) s[c] += p.w * p.v[c];
      s[4] += p.w;
    }
    let moved = false;
    cents = cents.map((c0, j) => {
      const s = sum[j];
      if (!s[4]) return c0;
      const c1 = [s[0] / s[4], s[1] / s[4], s[2] / s[4], s[3] / s[4]];
      if (Math.abs(c1[0] - c0[0]) + Math.abs(c1[1] - c0[1]) + Math.abs(c1[2] - c0[2]) + Math.abs(c1[3] - c0[3]) > 1e-5) moved = true;
      return c1;
    });
    if (!moved) break;
  }
  return cents;
}
function dist(u, v) {
  const a = u[0] - v[0], b = u[1] - v[1], c = u[2] - v[2], d = (u[3] - v[3]) * ALPHA_W;
  return a * a + b * b + c * c + d * d;
}
function nearest(cents, v) {
  let bj = 0, bd = Infinity;
  for (let j = 0; j < cents.length; j++) { const dd = dist(cents[j], v); if (dd < bd) { bd = dd; bj = j; } }
  return bj;
}

/**
 * The picture on `max` colours or fewer (256 at most).
 * Returns { idx: Uint8Array (a number a pixel), pal: Uint8Array (RGBA, 4 a
 * colour, straight alpha; colour 0 is fully see-through), n (colours used),
 * exact (true when the picture already fitted and is unchanged), err (the mean
 * OKLab distance a shown pixel moved, alpha-weighted) }.
 */
export function reduce256(d, w, h, opts = {}) {
  const max = Math.max(2, Math.min(MAX, opts.max || MAX));
  const rounds = opts.rounds == null ? 6 : opts.rounds;
  const counts = histogram(d);
  const idx = new Uint8Array(w * h);
  const keys = [...counts.keys()].sort((a, b) => a - b);
  /* already fits: every colour its own number, exactly */
  if (keys.length <= max - 1) {
    const pal = new Uint8Array((keys.length + 1) * 4);
    const at = new Map();
    keys.forEach((k, i) => {
      at.set(k, i + 1);
      pal[(i + 1) * 4] = k >>> 24; pal[(i + 1) * 4 + 1] = (k >>> 16) & 255; pal[(i + 1) * 4 + 2] = (k >>> 8) & 255; pal[(i + 1) * 4 + 3] = k & 255;
    });
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (d[i + 3] === 0) continue;
      idx[p] = at.get(((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0);
    }
    return { idx, pal, n: keys.length + 1, exact: true, err: 0 };
  }
  /* the points: solid ones and soft ones apart.  A picture on very many
     colours (a smooth glow: tens of thousands) is split on its colours
     rounded to 6 bits a channel (each the mean of what it gathers), and every
     exact colour still goes to its own nearest at the end */
  const coarse = keys.length > COARSE_OVER;
  const pt = (k) => {
    const r = k >>> 24, g = (k >>> 16) & 255, b = (k >>> 8) & 255, a = k & 255;
    const lab = oklab(r, g, b);
    return [lab[0], lab[1], lab[2], a / 255];
  };
  const groups = new Map();
  for (const k of keys) {
    const a = k & 255;
    const g = coarse ? (((k & 0xFCFCFC00) >>> 0) | (a === 255 ? 255 : (a & 0xFC) | 1)) >>> 0 : k;
    const n = counts.get(k);
    /* a soft pixel's colour counts by how much of it shows */
    const wt = n * (a === 255 ? 1 : Math.max(0.05, a / 255));
    let e = groups.get(g);
    if (!e) { e = { v: [0, 0, 0, 0], w: 0, key: g, solid: a === 255 }; groups.set(g, e); }
    const v = pt(k);
    for (let c = 0; c < 4; c++) e.v[c] += wt * v[c];
    e.w += wt;
  }
  const solid = [], soft = [];
  let wSolid = 0, wSoft = 0;
  for (const e of groups.values()) {
    for (let c = 0; c < 4; c++) e.v[c] /= e.w;
    if (e.solid) { solid.push(e); wSolid += e.w; } else { soft.push(e); wSoft += e.w; }
  }
  /* the 255 numbers shared between the two by their weight -- each at least
     a few where it has any points, never more than it has points */
  const room = max - 1;
  let nSoft = soft.length ? Math.round(room * wSoft / (wSoft + wSolid)) : 0;
  if (soft.length) nSoft = Math.max(Math.min(soft.length, 8), nSoft);
  if (solid.length) nSoft = Math.min(nSoft, room - Math.min(solid.length, 8));
  nSoft = Math.min(nSoft, soft.length);
  let nSolid = Math.min(solid.length, room - nSoft);
  /* numbers one side cannot use go to the other */
  nSoft = Math.min(soft.length, room - nSolid);
  const cSolid = cluster(solid, nSolid, rounds).map((c) => { c[3] = 1; return c; });
  const cSoft = cluster(soft, nSoft, rounds);
  const cents = cSolid.concat(cSoft);
  const pal = new Uint8Array((cents.length + 1) * 4);
  cents.forEach((c, j) => {
    const rgb = fromOklab(c[0], c[1], c[2]);
    pal[(j + 1) * 4] = rgb[0]; pal[(j + 1) * 4 + 1] = rgb[1]; pal[(j + 1) * 4 + 2] = rgb[2];
    /* solid stays solid; a soft colour never rounds to solid or to nothing */
    pal[(j + 1) * 4 + 3] = j < cSolid.length ? 255 : Math.max(1, Math.min(254, Math.round(c[3] * 255)));
  });
  /* each colour of the picture to its nearest, solid to solid and soft to soft */
  const map = new Map();
  let errSum = 0, errW = 0;
  for (const k of keys) {
    const a = k & 255, v = pt(k);
    const wt = counts.get(k) * (a === 255 ? 1 : Math.max(0.05, a / 255));
    const set = a === 255 ? cSolid : cSoft;
    const j = nearest(set, v);
    map.set(k, (a === 255 ? 0 : cSolid.length) + j + 1);
    errSum += wt * Math.sqrt(dist(set[j], v)); errW += wt;
  }
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (d[i + 3] === 0) continue;
    idx[p] = map.get(((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0);
  }
  return { idx, pal, n: cents.length + 1, exact: false, err: errW ? errSum / errW : 0 };
}

/** The numbers and colours back as RGBA (straight alpha), for a canvas or a
 *  comparison. */
export function toRgba(idx, pal) {
  const out = new Uint8ClampedArray(idx.length * 4);
  for (let p = 0; p < idx.length; p++) {
    const k = idx[p] * 4;
    out[p * 4] = pal[k]; out[p * 4 + 1] = pal[k + 1]; out[p * 4 + 2] = pal[k + 2]; out[p * 4 + 3] = pal[k + 3];
  }
  return out;
}
