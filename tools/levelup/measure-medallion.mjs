/* v2.3.2591: measure the level-up burst's medallion circle, per frame.
 *
 * The strip is 2172x724 and 2172/8 = 271.5, so there is NO integer grid to
 * slice on -- and the frames are not merely half-a-pixel off a grid, they are
 * genuinely irregular (content midpoints drift up to ~100px from where a
 * regular grid would put them).  So nothing here assumes a cell width: the
 * frame cuts come from the minima of the alpha column profile, and the circle
 * comes from the pixels.
 *
 * The circle wanted is the CREAM GLOWING VOID at the medallion's centre --
 * the deliberate empty space the skill icon is anchored into.  Detecting it by
 * "largest bright blob" fails on f0 and f4, where the white rays cross the
 * disc and the blob leaks out along them (f4's blob measures 296x333 for a
 * disc of radius ~54).  So: seed on the blob, then cast rays and take the
 * MEDIAN edge distance over 360 angles.  A ray leak is a thin spike in a
 * minority of angles, and a median does not care about those.
 */
import { decodePng } from '../png_raw.mjs';

const SRC = process.argv[2] || 'public/sprites/fx/levelup-burst-v1.png';
const { width: W, height: H, data } = decodePng(SRC);
const idx = (x, y) => (y * W + x) * 4;

/* ── frame cuts: minima of the alpha column profile ───────────────────── */
const colSum = new Float64Array(W);
for (let x = 0; x < W; x++) { let s = 0; for (let y = 0; y < H; y++) s += data[idx(x, y) + 3]; colSum[x] = s; }
const N = 8, nominal = W / N;
export const CUTS = [0];
for (let k = 1; k < N; k++) {
  const c = Math.round(k * nominal), lo = Math.max(1, c - 140), hi = Math.min(W - 1, c + 140);
  let best = lo, bv = Infinity;
  for (let x = lo; x <= hi; x++) if (colSum[x] < bv) { bv = colSum[x]; best = x; }
  CUTS.push(best);
}
CUTS.push(W);

/* ── the cream core test ──────────────────────────────────────────────── */
function isCore(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const i = idx(x, y);
  if (data[i + 3] < 200) return false;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (0.299 * r + 0.587 * g + 0.114 * b < 228) return false;
  if (b < 150) return false;      /* the gold ring is low-blue */
  if (r - b > 90) return false;
  return true;
}

/* Seed on the DEEPEST core pixel, not the blob centroid.  A blob that has
 * leaked along the rays (f4 measures 296x333 for a disc of radius ~54) has a
 * centroid nowhere near the disc, but the disc is still by far the fattest
 * part of the shape -- so a distance transform's maximum lands in it.
 * Two-pass chamfer, which is exact enough at this scale. */
function seed(x0, x1) {
  const w = x1 - x0;
  const D = new Float64Array(w * H);
  const BIG = 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) D[y * w + x] = isCore(x0 + x, y) ? BIG : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (D[i] === 0) continue;
    let v = BIG;
    if (y > 0) v = Math.min(v, D[i - w] + 1);
    if (x > 0) v = Math.min(v, D[i - 1] + 1);
    if (y > 0 && x > 0) v = Math.min(v, D[i - w - 1] + 1.4142);
    if (y > 0 && x < w - 1) v = Math.min(v, D[i - w + 1] + 1.4142);
    D[i] = Math.min(D[i], v);
  }
  let best = { n: 0, cx: x0 + w / 2, cy: H / 2 };
  for (let y = H - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (D[i] === 0) continue;
    let v = D[i];
    if (y < H - 1) v = Math.min(v, D[i + w] + 1);
    if (x < w - 1) v = Math.min(v, D[i + 1] + 1);
    if (y < H - 1 && x < w - 1) v = Math.min(v, D[i + w + 1] + 1.4142);
    if (y < H - 1 && x > 0) v = Math.min(v, D[i + w - 1] + 1.4142);
    D[i] = v;
    if (v > best.n) best = { n: v, cx: x0 + x, cy: y };
  }
  return best;
}

/* distance from (cx,cy) to the core edge along `ang`, tolerating 2px holes */
function edge(cx, cy, ang, max) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let gap = 0, last = 0;
  for (let r = 1; r <= max; r += 0.5) {
    if (isCore(Math.round(cx + dx * r), Math.round(cy + dy * r))) { last = r; gap = 0; }
    else if (++gap > 4) break;
  }
  return last;
}
const median = (a) => { const s = a.slice().sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function measure() {
  const out = [];
  for (let f = 0; f < N; f++) {
    const x0 = CUTS[f], x1 = CUTS[f + 1];
    let { cx, cy } = seed(x0, x1);
    let rad = 0, radii = [];
    for (let pass = 0; pass < 6; pass++) {
      radii = [];
      for (let a = 0; a < 360; a++) radii.push(edge(cx, cy, a * Math.PI / 180, 260));
      rad = median(radii);
      /* refit the centre from the edge points that agree with the median --
         the leaked rays are excluded, so the fit follows the disc. */
      let sx = 0, sy = 0, n = 0;
      for (let a = 0; a < 360; a++) {
        const r = radii[a];
        if (r < rad * 0.72 || r > rad * 1.28) continue;
        sx += cx + Math.cos(a * Math.PI / 180) * r; sy += cy + Math.sin(a * Math.PI / 180) * r; n++;
      }
      if (n > 40) { const ncx = sx / n, ncy = sy / n; const d = Math.hypot(ncx - cx, ncy - cy); cx = ncx; cy = ncy; if (d < 0.25) break; }
      else break;
    }
    const kept = radii.filter((r) => r >= rad * 0.72 && r <= rad * 1.28);
    /* tight content bbox inside the cut, so the sprite rect carries no dead
       margin and the medallion offset is expressed against real art */
    let bx0 = 1e9, bx1 = -1, by0 = 1e9, by1 = -1;
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
      if (data[idx(x, y) + 3] <= 10) continue;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
      if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    out.push({
      frame: f, cutX0: x0, cutX1: x1,
      sx: bx0, sy: by0, sw: bx1 - bx0 + 1, sh: by1 - by0 + 1,
      cx: +cx.toFixed(2), cy: +cy.toFixed(2), r: +rad.toFixed(2),
      ox: +(cx - bx0).toFixed(2), oy: +(cy - by0).toFixed(2),
      agree: kept.length, spread: +(Math.max(...kept) - Math.min(...kept)).toFixed(1),
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = measure();
  console.log(`strip ${W}x${H}   cuts: ${CUTS.join(', ')}`);
  console.log('frame  cut[x0,x1)   content rect (x,y,w,h)     circle centre (abs)    radius  rays  spread');
  for (const r of rows) {
    console.log(
      `  ${r.frame}    [${String(r.cutX0).padStart(4)},${String(r.cutX1).padStart(4)})   ` +
      `(${String(r.sx).padStart(4)},${String(r.sy).padStart(3)},${String(r.sw).padStart(4)},${String(r.sh).padStart(4)})   ` +
      `(${r.cx.toFixed(1).padStart(7)}, ${r.cy.toFixed(1).padStart(6)})   ${r.r.toFixed(1).padStart(6)}   ` +
      `${String(r.agree).padStart(3)}/360   ${r.spread.toFixed(1)}`);
  }
  if (process.argv.includes('--json')) console.log('\n' + JSON.stringify(rows, null, 2));
}
