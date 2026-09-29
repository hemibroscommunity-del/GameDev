/* ═══ v2.3.2931: THE SQUARE GRID ═══
 *
 * Every square is `N` art px on a side and overlaps each neighbour by `O`, so
 * square origins sit `P = N - O` apart:
 *
 *        0        P       N    P+N
 *        |--------|-------|
 *        |  A1    |  O    |          A1 covers [0, N)
 *                 |-------|-------|  B1 covers [P, P+N)
 *                     ^ the band A1 and B1 share: the fuser's seam goes here
 *
 * Names are spreadsheet style -- columns A.. west to east, rows 1.. north to
 * south -- because "redo F7" is something a person can say.
 */

export function gridInfo(plan) {
  const cols = plan.grid.cols, rows = plan.grid.rows;
  const N = plan.square.px, O = plan.square.overlap, P = N - O;
  return { cols, rows, N, O, P, W: cols * P + O, H: rows * P + O };
}

export function colLetters(c) {
  let s = '';
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function cellName(c, r) { return colLetters(c) + (r + 1); }

export function parseCell(name) {
  const m = /^([A-Z]+)(\d+)$/.exec(String(name || '').trim().toUpperCase());
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: parseInt(m[2], 10) - 1 };
}

export function inGrid(g, c, r) { return c >= 0 && r >= 0 && c < g.cols && r < g.rows; }

/* Art-px rectangle a square covers. */
export function cellRect(g, c, r) { return { x: c * g.P, y: r * g.P, w: g.N, h: g.N }; }

export function allCells(g) {
  const out = [];
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) out.push({ c, r, id: cellName(c, r) });
  return out;
}

/* The four squares that share an overlap BAND with (c, r), and the four that
   only share a corner.  Off-grid neighbours are omitted. */
export const SIDES = ['top', 'right', 'bottom', 'left'];
const SIDE_D = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
const CORNER_D = { topLeft: [-1, -1], topRight: [1, -1], bottomLeft: [-1, 1], bottomRight: [1, 1] };

export function neighbours(g, c, r) {
  const sides = {}, corners = {};
  for (const k of SIDES) {
    const [dc, dr] = SIDE_D[k];
    if (inGrid(g, c + dc, r + dr)) sides[k] = cellName(c + dc, r + dr);
  }
  for (const k of Object.keys(CORNER_D)) {
    const [dc, dr] = CORNER_D[k];
    if (inGrid(g, c + dc, r + dr)) corners[k] = cellName(c + dc, r + dr);
  }
  return { sides, corners };
}

/* Every square whose rectangle touches (c, r)'s rectangle -- the ones whose
   pixels can land inside it.  With a 25% overlap that is exactly the eight
   around it. */
export function touching(g, c, r) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dc && !dr) continue;
    if (inGrid(g, c + dc, r + dr)) out.push(cellName(c + dc, r + dr));
  }
  return out;
}
