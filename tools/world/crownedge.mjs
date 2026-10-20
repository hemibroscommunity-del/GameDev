/* v2.3.3511: the crown's lower edge, measured off a finished tree picture --
   zero dependencies, so tools/world/add-tree-art.mjs (which writes it into
   src/data/treeArt.js) and server/test/land-auras.test.mjs (which holds the
   data to the pictures) read the same arithmetic. */
/* ═══ v2.3.3511: THE CROWN'S LOWER EDGE ═══
   The owner, of the Water Caves' trees after a playtest: "water looks like
   sweating" -- the drips were born INSIDE the crown, a third to three
   quarters of the way down the picture, slid a little way and faded where
   they were (src/rendering/landAuras.js).  A drip forms where a leaf ends and
   falls from there to the ground, so the game needs to know where each tree's
   crown ends, column by column: the pine's lowest boughs, the willow's frond
   tips, the maple's leaves.  Measured off the finished picture:
     - the CROWN'S END ROW: down from the picture's widest row, the first of
       four rows in a row no wider than the trunk (1.6x its width, or 12% of
       the picture) -- below it is trunk, roots and the grass at its foot;
     - each column clear of the trunk (its half-width and 30% more): its
       lowest solid px at or above that row (two rows of slack);
     - a sample every CROWN_STEP picture px across (3 game px: a drop hangs
       where the leaves end, not a few px off it), each the median of its
       columns', 0 where under half of them have crown (the trunk's middle).
   Picture rows, as `foot` is. */
export const CROWN_STEP = 6;
export function crownEdge(d, w, h, foot, trunk) {
  const solid = (x, y) => d[(y * w + x) * 4 + 3] > 24;
  const ext = new Int32Array(h);
  let widest = 0;
  for (let y = 0; y < h; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (solid(x, y)) { if (a < 0) a = x; b = x; }
    ext[y] = a < 0 ? 0 : b - a + 1;
    if (ext[y] > ext[widest]) widest = y;
  }
  const narrow = Math.max(trunk * 2 * 1.6, w * 0.12);
  let end = h - 1;
  for (let y = widest; y < h - 3; y++) {
    if (ext[y] <= narrow && ext[y + 1] <= narrow && ext[y + 2] <= narrow && ext[y + 3] <= narrow) { end = y; break; }
  }
  const pad = Math.max(4, Math.round(trunk * 0.3));
  const col = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    if (Math.abs(x - foot[0]) <= trunk + pad) continue;
    for (let y = Math.min(h - 1, end + 2); y >= 0; y--) if (solid(x, y)) { col[x] = y; break; }
  }
  const out = [];
  const K = Math.max(1, Math.ceil(w / CROWN_STEP));
  for (let i = 0; i < K; i++) {
    const a = Math.round((i * w) / K), b = Math.round(((i + 1) * w) / K);
    const v = [];
    for (let x = a; x < b; x++) if (col[x] >= 0) v.push(col[x]);
    if (v.length * 2 < b - a) { out.push(0); continue; }
    v.sort((p, q) => p - q);
    out.push(v[v.length >> 1]);
  }
  return out;
}

