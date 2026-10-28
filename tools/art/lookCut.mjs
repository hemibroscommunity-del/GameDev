/* ═══ v2.3.3753 / v2.3.3750: A SHEET'S COLOURS CUT TO 255, PER ROLE (the look palette's 8-bit form) ═══
 *
 * The owner: "You can go ahead and reduce it. I won't notice at all from
 * anything at 256."  ONE PURE FUNCTION for every bake (role-bake.mjs, the
 * bodies; head-bake.mjs, the head pieces), passed into a bake's Chromium page
 * as source (`cutPerRole.toString()`): it refers to nothing outside itself.
 *
 *   keys   Map: (role * 2^32 + RGBA as one 32-bit number) -> how many pixels
 *   cap    colours at most (255: number 0 is see-through)
 *   opts   { roles, refScale, bar }: the set's roleDefs (role r is roles[r - 1])
 *          and its refScale, so a retinted role is measured as the retint
 *          shows it; `bar` the worst colour allowed, in levels (16)
 * Returns null when the sheet already fits, else { remap: Map old key -> new
 * key, keys: Map new key -> pixels, quant: { from, to, meanMoved, worstMoved,
 * over } } -- `over`: the worst colour is past the bar (the caller keeps that
 * sheet exact, 16 bits).
 *
 * v2.3.3753 (P4) made P0's cut this module: per role, a share of the 255 as
 * its share of the colours, median cut by pixel count, each box its mean --
 * 1-3 levels off on the common colours, 40-146 on the rare ones.
 *
 * v2.3.3750 (P1): BOUNDED BY ITS WORST COLOUR, NOT ITS COMMON ONES.
 *   - A colour's error is what a look can show of it, PREMULTIPLIED as the
 *     screen shows it (an edge's colour counts for its alpha): its RGBA (a
 *     look that leaves the role as drawn, and every kept pixel), and for a
 *     retinted role the retint's output at ANY target (below).
 *   - All the entries are one pool across the roles (no colour crosses from
 *     one role to another): each step splits the box, of any role, whose worst
 *     colour is furthest from its entry, at the middle of the axis that error
 *     lies on; an entry is the middle of its box (the minimax point), then its
 *     pixels' mean wherever that keeps the box 1.5 levels under the bar (the
 *     bar is the worst; the mean is what most of the figure shows).
 *   - meanMoved: the straight RGB a pixel moved on average; worstMoved: the
 *     bar's measure.
 */
export function cutPerRole(keys, cap, opts) {
  if (keys.size <= cap) return null;
  const o = opts || {};
  const roles = o.roles || [];
  const RS = o.refScale || 1;
  const CUT_BAR = o.bar != null ? o.bar : 16;
  const total = keys.size;
  const ch = (k, c) => { const v = k % 4294967296; return c === 0 ? (v >>> 24) & 255 : c === 1 ? (v >>> 16) & 255 : c === 2 ? (v >>> 8) & 255 : v & 255; };
  /* the axes a colour is measured on: r, g, b, a, and (retinted roles) its
     luminance scaled by what the retint makes of it */
  const lumScale = (r) => {
    const ro = r ? roles[r - 1] : null;
    const lead = ro && !ro.ref && ro.under ? roles[ro.under - 1] : ro;   /* an iris with no eye picked is its under role's retint */
    return lead && lead.ref ? 255 / (lead.ref / RS) : 0;
  };
  /* every axis PREMULTIPLIED, as the screen shows it (a see-through edge's
     colour counts for its alpha): r, g, b, a, and the retint's luminance
     u = lum / ref on a scale where one step is the most ANY target can show
     of it: 255 u up to 1, then 255 (1 + ln u) -- min(255, T u) moves at
     most 255 |u - v| below the clamp and 255 (1 - v / u) past it, and the
     logarithm's step is never smaller.  (Measured first at a white target
     only, the clamp hid the error: a skin entry 16 levels off at T 255 was
     34 at a darker target.) */
  const h = (u) => (u <= 1 ? u : 1 + Math.log(u));
  const axesOf = (r, g, b, a, s) => [r * a / 255, g * a / 255, b * a / 255, a,
    s ? 255 * h((0.299 * r + 0.587 * g + 0.114 * b) * s / 255) * a / 255 : 0];
  const axes = (k, s) => axesOf(ch(k, 0), ch(k, 1), ch(k, 2), ch(k, 3), s);
  const mkBox = (role, list) => {
    const s = lumScale(role);
    const pts = list.map(([k, n]) => [k, n, axes(k, s)]);
    const lo = [Infinity, Infinity, Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
    for (const [, , a] of pts) for (let q = 0; q < 5; q++) { if (a[q] < lo[q]) lo[q] = a[q]; if (a[q] > hi[q]) hi[q] = a[q]; }
    /* the minimax entry: the middle of the premultiplied box, made straight
       again -- and its error, the worst colour's distance on any axis */
    const am = Math.max(1, Math.round((lo[3] + hi[3]) / 2));
    const rep = [0, 1, 2].map((q) => Math.min(255, Math.round(((lo[q] + hi[q]) / 2) * 255 / am))).concat([am]);
    const ra = axesOf(rep[0], rep[1], rep[2], rep[3], s);
    let err = 0, axis = 0;
    for (const [, , a] of pts) for (let q = 0; q < (s ? 5 : 4); q++) { const e = Math.abs(a[q] - ra[q]); if (e > err) { err = e; axis = q; } }
    return { role, pts, lo, hi, rep, err, axis };
  };
  const byRole = new Map();
  for (const [k, n] of keys) { const r = Math.floor(k / 4294967296); if (!byRole.has(r)) byRole.set(r, []); byRole.get(r).push([k, n]); }
  const boxes = [];
  for (const [r, list] of byRole) boxes.push(mkBox(r, list));
  while (boxes.length < cap) {
    let bi = -1;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].pts.length > 1 && (bi < 0 || boxes[i].err > boxes[bi].err)) bi = i;
    if (bi < 0 || boxes[bi].err < 0.5) break;
    const bx = boxes[bi];
    /* split at the middle of the widest axis (the one its error lies on, or
       the widest when that one cannot part it) */
    let q = bx.axis;
    if (bx.hi[q] - bx.lo[q] <= 0) { let w = -1; for (let a = 0; a < 5; a++) if (bx.hi[a] - bx.lo[a] > w) { w = bx.hi[a] - bx.lo[a]; q = a; } }
    const mid = (bx.lo[q] + bx.hi[q]) / 2;
    const A = [], B = [];
    for (const p of bx.pts) (p[2][q] <= mid ? A : B).push([p[0], p[1]]);
    if (!A.length || !B.length) break;
    boxes.splice(bi, 1, mkBox(bx.role, A), mkBox(bx.role, B));
  }
  /* then each entry moved to its pixels' weighted mean wherever that keeps
     the box's worst colour under the bar: the bar is the worst, the mean is
     what most of the figure shows (measured: jog-east 7.1 -> see the spec) */
  for (const bx of boxes) {
    if (bx.pts.length < 2) continue;
    const s = lumScale(bx.role);
    let n = 0; const m = [0, 0, 0, 0];
    for (const [, c, a] of bx.pts) { n += c; for (let q = 0; q < 4; q++) m[q] += a[q] * c; }
    const am = Math.max(1, Math.round(m[3] / n));
    const rep = [0, 1, 2].map((q) => Math.min(255, Math.round((m[q] / n) * 255 / am))).concat([am]);
    const ra = axesOf(rep[0], rep[1], rep[2], rep[3], s);
    let err = 0;
    for (const [, , a] of bx.pts) for (let q = 0; q < (s ? 5 : 4); q++) err = Math.max(err, Math.abs(a[q] - ra[q]));
    if (err <= Math.max(CUT_BAR - 1.5, bx.err)) { bx.rep = rep; bx.err = err; }   /* 1.5 short of the bar: the canvas rounds */
  }
  const remap = new Map();
  let moved = 0, pix = 0, worst = 0;
  for (const bx of boxes) {
    const key = bx.role * 4294967296 + ((bx.rep[0] << 24) >>> 0) + (bx.rep[1] << 16) + (bx.rep[2] << 8) + bx.rep[3];
    for (const [k, n] of bx.pts) remap.set(k, key);
    if (bx.err > worst) worst = bx.err;
    for (const [k, n, a] of bx.pts) {
      let e = 0; for (let q = 0; q < 3; q++) e = Math.max(e, Math.abs(ch(k, q) - bx.rep[q]));
      moved += e * n; pix += n;
    }
  }
  const merged = new Map();
  for (const [k, n] of keys) { const qk = remap.get(k); merged.set(qk, (merged.get(qk) || 0) + n); }
  /* worstMoved: the worst colour's error on its worst axis, the retint's
     magnified luminance included -- the number the bar is held to */
  return { remap, keys: merged, quant: { from: total, to: merged.size, meanMoved: +(moved / Math.max(1, pix)).toFixed(2), worstMoved: +worst.toFixed(1), over: worst > CUT_BAR } };
}
