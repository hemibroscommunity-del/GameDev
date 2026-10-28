/* ═══ v2.3.3753: A SHEET'S COLOURS CUT TO 255, PER ROLE (the look palette's 8-bit form) ═══
 *
 * The owner: "You can go ahead and reduce it. I won't notice at all from
 * anything at 256."  role-bake.mjs's own cut (v2.3.3737), as ONE PURE
 * FUNCTION, so a bake that runs it in its Chromium page can pass it there as
 * source (`cutPerRole.toString()`): head-bake.mjs does.  It refers to nothing
 * outside itself.
 *
 *   keys   Map: (role * 2^32 + RGBA as one 32-bit number) -> how many pixels
 *   cap    colours at most (255: number 0 is see-through)
 * Returns null when the sheet already fits, else { remap: Map old key -> new
 * key, keys: Map new key -> pixels, quant: { from, to, meanMoved, worstMoved } }.
 *
 * Each role's share of the 255 is its share of the colours (at least one),
 * so no colour crosses from one role to another; inside a role, a median cut
 * over its colours weighted by how many pixels use each, each box its
 * pixels' mean (straight RGBA).
 */
export function cutPerRole(keys, cap) {
  if (keys.size <= cap) return null;
  const byRole = new Map();
  for (const [k, n] of keys) { const r = Math.floor(k / 4294967296); if (!byRole.has(r)) byRole.set(r, []); byRole.get(r).push([k, n]); }
  const total = keys.size;
  const budget = new Map();
  let left = cap;
  for (const [r, list] of byRole) { const b = Math.max(1, Math.floor(cap * list.length / total)); budget.set(r, b); left -= b; }
  while (left > 0) {
    let best = -1, bestR = null;
    for (const [r, list] of byRole) { const v = list.length / budget.get(r); if (v > best && budget.get(r) < list.length) { best = v; bestR = r; } }
    if (bestR === null) break;
    budget.set(bestR, budget.get(bestR) + 1); left--;
  }
  while (left < 0) {
    let bestR = null, bb = 1;
    for (const [r, b] of budget) if (b > bb) { bb = b; bestR = r; }
    if (bestR === null) break;
    budget.set(bestR, budget.get(bestR) - 1); left++;
  }
  const ch = (k, c) => { const v = k % 4294967296; return c === 0 ? (v >>> 24) & 255 : c === 1 ? (v >>> 16) & 255 : c === 2 ? (v >>> 8) & 255 : v & 255; };
  const remap = new Map();
  let moved = 0, worst = 0, pix = 0;
  for (const [r, list] of byRole) {
    let boxes = [list];
    while (boxes.length < budget.get(r)) {
      let bi = -1, bc = 0, bw = -1;
      boxes.forEach((bx, i) => {
        if (bx.length < 2) return;
        for (let c = 0; c < 4; c++) {
          let lo = 255, hi = 0;
          for (const [k] of bx) { const v = ch(k, c); if (v < lo) lo = v; if (v > hi) hi = v; }
          const wgt = (hi - lo) * Math.sqrt(bx.reduce((a, e) => a + e[1], 0));
          if (wgt > bw) { bw = wgt; bi = i; bc = c; }
        }
      });
      if (bi < 0 || bw <= 0) break;
      const bx = boxes[bi].slice().sort((a, b) => ch(a[0], bc) - ch(b[0], bc));
      const half = bx.reduce((a, e) => a + e[1], 0) / 2;
      let acc = 0, cut = 1;
      for (let i = 0; i < bx.length - 1; i++) { acc += bx[i][1]; if (acc >= half) { cut = i + 1; break; } cut = i + 1; }
      boxes.splice(bi, 1, bx.slice(0, cut), bx.slice(cut));
    }
    for (const bx of boxes) {
      let n = 0; const m = [0, 0, 0, 0];
      for (const [k, c] of bx) { n += c; for (let q = 0; q < 4; q++) m[q] += ch(k, q) * c; }
      const rep = m.map((v) => Math.round(v / n));
      const key = r * 4294967296 + ((rep[0] << 24) >>> 0) + (rep[1] << 16) + (rep[2] << 8) + rep[3];
      for (const [k, c] of bx) {
        remap.set(k, key);
        let dm = 0; for (let q = 0; q < 4; q++) dm = Math.max(dm, Math.abs(ch(k, q) - rep[q]));
        moved += dm * c; pix += c; if (dm > worst) worst = dm;
      }
    }
  }
  const merged = new Map();
  for (const [k, n] of keys) { const q = remap.get(k); merged.set(q, (merged.get(q) || 0) + n); }
  return { remap, keys: merged, quant: { from: total, to: merged.size, meanMoved: +(moved / Math.max(1, pix)).toFixed(2), worstMoved: worst } };
}
