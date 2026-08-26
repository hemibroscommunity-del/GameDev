import { ART_W, ART_H, artInkAt } from './playerArt.js';

/* ═══ v2.3.1948: DRAWING TOOLS ═══
 *
 * Owner: "Can you include any drawing tools like lines, shapes, eraser, fill?"
 *
 * Pure grid geometry — which CELLS a gesture covers.  Nothing here touches the
 * store, the DOM or a colour: a tool answers "these cells", and the panel
 * decides what to paint them and when to commit.  That split is what lets the
 * same function drive both the live preview under your finger and the commit on
 * release, so what you saw is exactly what you get.
 *
 * ── WHY EVERY TOOL WORKS WITH THE ERASER TOO ──
 * The eraser is not a tool here, it is palette index 0 — the checkerboard
 * swatch, which has been in the panel since v2.3.1938.  Keeping it a COLOUR
 * rather than a sixth tool means it composes with all five: an erase-line, an
 * erase-box, a bucket that clears a region.  Making it a tool would have taken
 * that away and added nothing.
 *
 * All four shape helpers are inclusive of both endpoints and clamp nothing —
 * the caller clamps the pointer to the grid, so a cell outside it cannot arise.
 */

/** Bresenham, so a slow diagonal drag produces one clean unbroken run. */
export function lineCells(x0, y0, x1, y1) {
  const out = [];
  let x = x0 | 0, y = y0 | 0;
  const ex = x1 | 0, ey = y1 | 0;
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x, y]);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}

/** The OUTLINE of the box the drag spans.  Outline rather than solid on
 *  purpose: a solid box is one bucket-fill away, and an outline you cannot
 *  un-fill. */
export function rectCells(x0, y0, x1, y1) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
  const ay = Math.min(y0, y1), by = Math.max(y0, y1);
  const out = [];
  for (let x = ax; x <= bx; x++) { out.push([x, ay]); if (by !== ay) out.push([x, by]); }
  for (let y = ay + 1; y < by; y++) { out.push([ax, y]); if (bx !== ax) out.push([bx, y]); }
  return out;
}

/** The outline of the ellipse inscribed in the drag's box.
 *
 *  Sampled per column AND per row rather than by the classic integer midpoint
 *  algorithm: on a 16-cell grid that one leaves gaps where the arc runs shallow,
 *  and a broken outline cannot be bucket-filled — which is how you make a SOLID
 *  circle here.  Scanning both axes closes them.
 *
 *  Cell (x,y) is the unit square [x,x+1) x [y,y+1), so its centre is at x+0.5;
 *  the box's centre and radii are stated in those continuous coordinates. */
export function ellipseCells(x0, y0, x1, y1) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
  const ay = Math.min(y0, y1), by = Math.max(y0, y1);
  const cx = (ax + bx + 1) / 2, cy = (ay + by + 1) / 2;
  const rx = (bx - ax + 1) / 2, ry = (by - ay + 1) / 2;
  const seen = new Uint8Array(ART_W * ART_H);
  const out = [];
  const put = (x, y) => {
    if (x < ax || x > bx || y < ay || y > by) return;
    const k = y * ART_W + x;
    if (seen[k]) return;
    seen[k] = 1; out.push([x, y]);
  };
  for (let x = ax; x <= bx; x++) {
    const t = 1 - ((x + 0.5 - cx) / rx) ** 2;
    if (t < 0) continue;
    const dy = ry * Math.sqrt(t);
    put(x, Math.floor(cy - dy));
    put(x, Math.ceil(cy + dy) - 1);
  }
  for (let y = ay; y <= by; y++) {
    const t = 1 - ((y + 0.5 - cy) / ry) ** 2;
    if (t < 0) continue;
    const dx = rx * Math.sqrt(t);
    put(Math.floor(cx - dx), y);
    put(Math.ceil(cx + dx) - 1, y);
  }
  return out;
}

/** Every cell reachable from (x,y) through cells that RENDER the same as it —
 *  the paint bucket.
 *
 *  Four-connected, because eight-connected leaks diagonally through the corner
 *  of a hand-drawn outline, which on a 16-cell grid is most outlines.
 *
 *  The frontier is a growable array with a read cursor rather than recursion:
 *  256 cells is small, but a recursive fill on a fully-flooded grid is 256 deep
 *  and this runs on a phone. */
export function fillCells(art, x, y) {
  if (x < 0 || y < 0 || x >= ART_W || y >= ART_H) return [];
  const from = artInkAt(art, x, y);
  const seen = new Uint8Array(ART_W * ART_H);
  const out = [];
  const stack = [[x, y]];
  seen[y * ART_W + x] = 1;
  for (let i = 0; i < stack.length; i++) {
    const cx = stack[i][0], cy = stack[i][1];
    out.push([cx, cy]);
    const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (let k = 0; k < 4; k++) {
      const nx = nb[k][0], ny = nb[k][1];
      if (nx < 0 || ny < 0 || nx >= ART_W || ny >= ART_H) continue;
      const idx = ny * ART_W + nx;
      if (seen[idx]) continue;
      if (artInkAt(art, nx, ny) !== from) continue;
      seen[idx] = 1;
      stack.push([nx, ny]);
    }
  }
  return out;
}

/* ── brush size ──
   Owner: "I mean like a small eraser for erasing areas.  Can you also include
   different brush size options?"  Those are one control, not two: the eraser is
   palette index 0, so a 3-wide eraser IS a 3-wide brush painting nothing.  One
   size setting therefore widens the pen, the line, the box and the circle, and
   widens the eraser for free because the eraser is a colour. */
export const BRUSH_SIZES = [1, 2, 3];

/** The cells one brush dab of `size` covers, centred on (x,y).
 *  An even size has no true centre cell, so it leans down-right by half — the
 *  same convention every pixel editor uses, and the one that keeps a 2-brush
 *  from feeling like it lags the finger. */
export function brushCells(x, y, size) {
  const n = Math.max(1, Math.min(9, size | 0));
  if (n === 1) return [[x, y]];
  const lo = -((n - 1) >> 1), hi = n >> 1;
  const out = [];
  for (let dy = lo; dy <= hi; dy++) {
    for (let dx = lo; dx <= hi; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < ART_W && ny < ART_H) out.push([nx, ny]);
    }
  }
  return out;
}

/** Widen a set of cells by the brush, with no cell listed twice. */
export function expandCells(cells, size) {
  if (!size || size <= 1) return cells;
  const seen = new Uint8Array(ART_W * ART_H);
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const dab = brushCells(cells[i][0], cells[i][1], size);
    for (let k = 0; k < dab.length; k++) {
      const idx = dab[k][1] * ART_W + dab[k][0];
      if (seen[idx]) continue;
      seen[idx] = 1; out.push(dab[k]);
    }
  }
  return out;
}

/* ── letters ──
 *
 * Owner: "And perhaps letters you can place?"
 *
 * WHY 5x7 AND NOT THE USUAL TINY 3x5.  The grid is 16 cells, so a 3x5 font
 * would fit four letters across instead of two — but the grid is not what
 * anybody reads.  The print lands in about 30x18 real pixels of shirt, so a
 * 3-cell-wide letter arrives about five pixels wide and is a smudge.  At 5x7 it
 * arrives about nine, which is the smallest that still reads as a letter.  Two
 * across, three at a squeeze, which is initials and short words — the thing
 * people actually put on a shirt.
 *
 * Rows are written out as bits so the glyph is legible in the source: what you
 * see in this table is what lands on the shirt.
 */
export const LETTER_W = 5;
export const LETTER_H = 7;
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00110 00100 00000 00100',
};
/* Spelled out rather than Object.keys(FONT): a JS object puts integer-like
   keys FIRST regardless of insertion order, so the alphabet strip opened on
   0-9 and you had to scroll past ten digits to reach A.  Letters are what
   people came for. */
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?'.split('');

/** The cells a glyph covers when placed CENTRED on (x,y).
 *  Centred rather than corner-anchored because you aim a stamp at where you
 *  want the letter, not at where its top-left corner would be.  Cells that fall
 *  off the grid are dropped, so a letter placed at the edge clips instead of
 *  wrapping to the far side. */
export function letterCells(ch, x, y) {
  const g = FONT[ch];
  if (!g) return [];
  const rows = g.split(' ');
  const ox = x - ((LETTER_W - 1) >> 1);
  const oy = y - ((LETTER_H - 1) >> 1);
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] !== '1') continue;
      const nx = ox + c, ny = oy + r;
      if (nx >= 0 && ny >= 0 && nx < ART_W && ny < ART_H) out.push([nx, ny]);
    }
  }
  return out;
}

/* ── mirror ──
   v2.3.1949: symmetry, which is what most face and chest designs actually want
   and what is hardest to do by hand on a grid this small.  It is a modifier on
   the CELLS, not on the tools, so one implementation covers all six: pen, line,
   box, circle, fill and letters.  Applied last, after the brush, so a wide
   stroke mirrors at its full width.  A cell on the centre column of an
   even-width grid maps to its own neighbour rather than to itself, which is
   correct — there is no centre CELL in 16, only a centre EDGE. */
export function mirrorCells(cells, on) {
  if (!on) return cells;
  const seen = new Uint8Array(ART_W * ART_H);
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const x = cells[i][0], y = cells[i][1];
    for (const nx of [x, ART_W - 1 - x]) {
      if (nx < 0 || nx >= ART_W) continue;
      const idx = y * ART_W + nx;
      if (seen[idx]) continue;
      seen[idx] = 1; out.push([nx, y]);
    }
  }
  return out;
}

/* ── the toolbar ──
   `drag` says whether the tool previews a shape while the finger is down (line,
   box, circle) or paints as it goes (pen) or fires once on touch (fill) or
   picks up what is already there (select, v2.3.1967).  The panel reads only
   this flag, so adding a seventh tool is a table entry. */
export const TOOLS = [
  { id: 'pen', name: 'Pen', drag: 'paint', brush: true },
  { id: 'line', name: 'Line', drag: 'shape', brush: true },
  { id: 'rect', name: 'Box', drag: 'shape', brush: true },
  { id: 'ellipse', name: 'Circle', drag: 'shape', brush: true },
  { id: 'fill', name: 'Fill', drag: 'once', brush: false },
  { id: 'letter', name: 'Letters', drag: 'once', brush: false },
  /* v2.3.1967 (owner: "add a hand shape to tap the existing shape to reselect
     and edit it").  `drag: 'pick'` is the only value that does not paint: it
     picks up something already on the grid, which is possible at all because a
     canvas is an ordered op list now (artOps.js) rather than a flat string.
     LAST rather than first, unlike the arrow in a desktop editor: the first six
     make marks and this one manages the marks you already made, and putting it
     first would move the pen out from under a thumb that has learned where it
     is. */
  { id: 'select', name: 'Select', drag: 'pick', brush: false },
];
export function toolById(id) { return TOOLS.find((t) => t.id === id) || TOOLS[0]; }

/** The cells a SHAPE tool covers for a drag from (x0,y0) to (x1,y1). */
export function shapeCells(tool, x0, y0, x1, y1) {
  if (tool === 'line') return lineCells(x0, y0, x1, y1);
  if (tool === 'rect') return rectCells(x0, y0, x1, y1);
  if (tool === 'ellipse') return ellipseCells(x0, y0, x1, y1);
  return [[x1, y1]];
}
