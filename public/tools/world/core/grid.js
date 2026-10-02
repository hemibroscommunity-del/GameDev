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
 * south -- because "redo M13" is something a person can say.
 *
 * ── THE FRAME AND THE ACTIVE AREA (growth) ──
 * Owner: "how would I expand the game later if I needed more room?"  Names
 * and pixel positions are fixed by a FRAME (`plan.grid`, 25 x 25) that is
 * much bigger than the island; only the ACTIVE area inside it
 * (`plan.active`, G7 to S19 today) is painted.  Growing the world means
 * widening the active area -- in any direction, by any amount: every square
 * already painted keeps its name and its place, and the new squares simply
 * appear beside it.  (Naming from the active area instead would rename
 * every square the day it grew -- A1 would become C3 and every stored
 * picture would point at the wrong place.)
 *
 * The world centre is the middle of ONE square (`plan.centre`, M13), not
 * the middle of the frame: every plan position is measured from it, so
 * even the frame can grow later (toward the south and east -- columns
 * before A would rename everything) without moving anything.  Pinning it
 * to a square's middle also keeps the town square out of the overlap
 * bands, where four seams would cut through the most looked-at spot in the
 * game.
 */

export function gridInfo(plan) {
  const cols = plan.grid.cols, rows = plan.grid.rows;
  const N = plan.square.px, O = plan.square.overlap, P = N - O;
  let c0 = 0, r0 = 0, c1 = cols - 1, r1 = rows - 1;
  if (plan.active) {
    const a = parseCell(plan.active.from), b = parseCell(plan.active.to);
    if (!a || !b) throw new Error('plan.active needs square names, e.g. { from: "G7", to: "S19" }');
    c0 = Math.max(0, Math.min(a.c, b.c)); r0 = Math.max(0, Math.min(a.r, b.r));
    c1 = Math.min(cols - 1, Math.max(a.c, b.c)); r1 = Math.min(rows - 1, Math.max(a.r, b.r));
  }
  const W = cols * P + O, H = rows * P + O;
  const mid = plan.centre ? parseCell(plan.centre) : null;
  return {
    cols, rows, N, O, P, W, H,
    /* the active area: inclusive square bounds and its art-px rectangle */
    c0, r0, c1, r1, ac: c1 - c0 + 1, ar: r1 - r0 + 1,
    ax: c0 * P, ay: r0 * P, AW: (c1 - c0 + 1) * P + O, AH: (r1 - r0 + 1) * P + O,
    /* the world centre -- every position in the plan is measured from here */
    cx: mid ? mid.c * P + N / 2 : W / 2, cy: mid ? mid.r * P + N / 2 : H / 2,
  };
}

/* A plan position in SQUARES from the world centre (east +x, south +y) to art px. */
export function toArt(g, sx, sy) { return [g.cx + sx * g.P, g.cy + sy * g.P]; }

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
export function inActive(g, c, r) { return c >= g.c0 && c <= g.c1 && r >= g.r0 && r <= g.r1; }

/* Art-px rectangle a square covers (frame coordinates). */
export function cellRect(g, c, r) { return { x: c * g.P, y: r * g.P, w: g.N, h: g.N }; }

/* The square whose MIDDLE holds art point (x, y): each square owns the
   P x P block centred on it, so the overlap bands split evenly between the
   two squares that share them.  What a tap on the map means. */
export function cellAt(g, x, y) {
  return { c: Math.floor((x - g.O / 2) / g.P), r: Math.floor((y - g.O / 2) / g.P) };
}

/* The squares of the ACTIVE area -- the ones there are to paint. */
export function allCells(g) {
  const out = [];
  for (let r = g.r0; r <= g.r1; r++) for (let c = g.c0; c <= g.c1; c++) out.push({ c, r, id: cellName(c, r) });
  return out;
}

/* The four squares that share an overlap BAND with (c, r), and the four that
   only share a corner.  Squares outside the active area are omitted. */
export const SIDES = ['top', 'right', 'bottom', 'left'];
const SIDE_D = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
const CORNER_D = { topLeft: [-1, -1], topRight: [1, -1], bottomLeft: [-1, 1], bottomRight: [1, 1] };

export function neighbours(g, c, r) {
  const sides = {}, corners = {};
  for (const k of SIDES) {
    const [dc, dr] = SIDE_D[k];
    if (inActive(g, c + dc, r + dr)) sides[k] = cellName(c + dc, r + dr);
  }
  for (const k of Object.keys(CORNER_D)) {
    const [dc, dr] = CORNER_D[k];
    if (inActive(g, c + dc, r + dr)) corners[k] = cellName(c + dc, r + dr);
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
    if (inActive(g, c + dc, r + dr)) out.push(cellName(c + dc, r + dr));
  }
  return out;
}
