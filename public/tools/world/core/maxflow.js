/* ═══ v2.3.2931: MIN-CUT ON A PIXEL GRID (Boykov–Kolmogorov max-flow) ═══
 *
 * Where a new square overlaps finished pixels, some pixels MUST stay old (the
 * ones touching finished art outside the square) and some MUST become new
 * (the ones touching the part only the new square covers).  Everything in
 * between may go either way, and the best seam is the cheapest set of pixel
 * boundaries separating the two groups, where a boundary costs how different
 * old and new are either side of it.  That is exactly a minimum s-t cut on the
 * pixel grid -- "Graphcut Textures" (Kwatra et al., SIGGRAPH 2003) -- and it
 * handles every overlap shape the grid produces (one band, an L, a corner
 * block only a diagonal neighbour painted, a ring) with no special cases.
 *
 * The max-flow is Boykov & Kolmogorov (PAMI 2004), the standard for grid
 * graphs: two search trees grow from the terminals, meet, push flow along the
 * path, and repair themselves by adoption.  Integer capacities throughout, so
 * "saturated" is exact.
 *
 *   w, h        grid size
 *   node[i]     1 if pixel i takes part (others are walls)
 *   term[i]     +INF: must be SOURCE side (old); -INF: must be SINK side
 *               (new); 0: free
 *   capR[i]     capacity of the edge i <-> i+1   (both directions)
 *   capD[i]     capacity of the edge i <-> i+w   (both directions)
 * Returns Uint8Array side[]: 1 = source side (old), 0 = sink side (new).
 */
export const INF = 1e9;

export function gridMinCut(w, h, node, term, capR, capD) {
  const n = w * h;
  /* residual capacity out of i in direction d: 0 right, 1 down, 2 left, 3 up */
  const cap = new Int32Array(n * 4);
  for (let i = 0; i < n; i++) {
    if (!node[i]) continue;
    const x = i % w;
    if (x + 1 < w && node[i + 1]) { cap[i * 4] = capR[i]; cap[(i + 1) * 4 + 2] = capR[i]; }
    if (i + w < n && node[i + w]) { cap[i * 4 + 1] = capD[i]; cap[(i + w) * 4 + 3] = capD[i]; }
  }
  const tr = new Float64Array(n);           /* terminal residual: + from source, - to sink */
  for (let i = 0; i < n; i++) if (node[i]) tr[i] = term[i];

  const FREE = 0, S = 1, T = 2, TERM = 4, NONE = -1;
  const tree = new Uint8Array(n), parent = new Int8Array(n).fill(NONE);
  const ts = new Int32Array(n), dist = new Int32Array(n);
  const nbr = (i, d) => {
    const x = i % w;
    if (d === 0) return x + 1 < w ? i + 1 : -1;
    if (d === 1) return i + w < n ? i + w : -1;
    if (d === 2) return x > 0 ? i - 1 : -1;
    return i - w >= 0 ? i - w : -1;
  };
  const opp = (d) => (d + 2) & 3;

  let queue = new Int32Array(Math.max(16, n * 2)), qh = 0, qt = 0;
  const inQ = new Uint8Array(n);
  const push = (i) => {
    if (inQ[i]) return;
    inQ[i] = 1;
    if (qt >= queue.length) {
      const live = queue.subarray(qh, qt);
      const nq = new Int32Array(Math.max(queue.length, live.length * 2 + 16));
      nq.set(live); queue = nq; qt -= qh; qh = 0;
    }
    queue[qt++] = i;
  };
  let orphans = [];

  for (let i = 0; i < n; i++) {
    if (!node[i] || tr[i] === 0) continue;
    tree[i] = tr[i] > 0 ? S : T;
    parent[i] = TERM; ts[i] = 0; dist[i] = 1;
    push(i);
  }

  let TIME = 0;
  const capTo = (a, d) => cap[a * 4 + d];

  function augment(p, dq, q) {
    /* p in S, q in T, edge p -> q in direction dq */
    let b = capTo(p, dq);
    for (let i = p; parent[i] !== TERM;) {
      const d = parent[i], j = nbr(i, d);
      b = Math.min(b, capTo(j, opp(d)));
      i = j;
      if (parent[i] === TERM) { b = Math.min(b, tr[i]); break; }
    }
    if (parent[p] === TERM) b = Math.min(b, tr[p]);
    for (let i = q; parent[i] !== TERM;) {
      const d = parent[i], j = nbr(i, d);
      b = Math.min(b, capTo(i, d));
      i = j;
      if (parent[i] === TERM) { b = Math.min(b, -tr[i]); break; }
    }
    if (parent[q] === TERM) b = Math.min(b, -tr[q]);

    cap[p * 4 + dq] -= b; cap[q * 4 + opp(dq)] += b;
    let i = p;
    while (parent[i] !== TERM) {
      const d = parent[i], j = nbr(i, d);
      cap[j * 4 + opp(d)] -= b; cap[i * 4 + d] += b;
      if (cap[j * 4 + opp(d)] === 0) { parent[i] = NONE; orphans.push(i); }
      i = j;
    }
    tr[i] -= b;
    if (tr[i] === 0) { parent[i] = NONE; orphans.push(i); }
    i = q;
    while (parent[i] !== TERM) {
      const d = parent[i], j = nbr(i, d);
      cap[i * 4 + d] -= b; cap[j * 4 + opp(d)] += b;
      if (cap[i * 4 + d] === 0) { parent[i] = NONE; orphans.push(i); }
      i = j;
    }
    tr[i] += b;
    if (tr[i] === 0) { parent[i] = NONE; orphans.push(i); }
  }

  function adopt() {
    while (orphans.length) {
      const p = orphans.pop();
      const tp = tree[p];
      let bestD = -1, best = Infinity;
      for (let d = 0; d < 4; d++) {
        const q = nbr(p, d);
        if (q < 0 || tree[q] !== tp || !node[q]) continue;
        const c = tp === S ? capTo(q, opp(d)) : capTo(p, d);
        if (c <= 0) continue;
        /* does q still reach a terminal? */
        let j = q, k = 0, ok = true;
        for (;;) {
          if (ts[j] === TIME) { k += dist[j]; break; }
          const pj = parent[j];
          if (pj === TERM) { ts[j] = TIME; dist[j] = 1; k += 1; break; }
          if (pj === NONE) { ok = false; break; }
          k++; j = nbr(j, pj);
        }
        if (!ok) continue;
        if (k < best) { best = k; bestD = d; }
        /* stamp the path so later checks stop early */
        let jj = q, kk = k;
        while (ts[jj] !== TIME) { ts[jj] = TIME; dist[jj] = kk--; jj = nbr(jj, parent[jj]); }
      }
      if (bestD >= 0) {
        parent[p] = bestD; ts[p] = TIME; dist[p] = best + 1;
      } else {
        for (let d = 0; d < 4; d++) {
          const q = nbr(p, d);
          if (q < 0 || tree[q] !== tp || !node[q]) continue;
          const c = tp === S ? capTo(q, opp(d)) : capTo(p, d);
          if (c > 0) push(q);
          if (parent[q] === opp(d)) { parent[q] = NONE; orphans.push(q); }
        }
        tree[p] = FREE;
      }
    }
  }

  for (;;) {
    let found = false, fp = -1, fd = -1, fq = -1;
    while (qh < qt) {
      const p = queue[qh];
      if (!tree[p]) { qh++; inQ[p] = 0; continue; }
      for (let d = 0; d < 4; d++) {
        const q = nbr(p, d);
        if (q < 0 || !node[q]) continue;
        const c = tree[p] === S ? capTo(p, d) : capTo(q, opp(d));
        if (c <= 0) continue;
        if (!tree[q]) {
          tree[q] = tree[p]; parent[q] = opp(d); ts[q] = ts[p]; dist[q] = dist[p] + 1; push(q);
        } else if (tree[q] !== tree[p]) {
          found = true;
          if (tree[p] === S) { fp = p; fd = d; fq = q; } else { fp = q; fd = opp(d); fq = p; }
          break;
        }
      }
      if (found) break;
      qh++; inQ[p] = 0;
    }
    if (!found) break;
    TIME++;
    augment(fp, fd, fq);
    adopt();
  }

  const side = new Uint8Array(n);
  for (let i = 0; i < n; i++) side[i] = tree[i] === S ? 1 : 0;
  return side;
}
