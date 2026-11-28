/* ═══ v2.3.6784: GEAR'S GEOMETRY: THE BAG'S SQUARES, ITS WHOLE ROWS, AND THE BODY'S CELLS (card UI3-menus, readings 5 and 7) ═══
 *
 * Moved here from dash/GearPanels.jsx (finish.md part 5, rule 5: a rule is a
 * module with a suite; GearPanels imports it and still exports
 * gearPanelsGeometry).  Pure, no import: tools/guards/gear-geometry.test.mjs
 * tests what it does over W 300 to 900 and H 100 to 420.
 *
 * The owner, 2026-11-26, 19:35 UTC: "the inventory slots don't fit neatly on
 * the new menu the third row gets cut off."  The cause: the bag's square was
 * sized from the panel's WIDTH alone and the scroller was the whole body, so
 * the last row drawn was cut wherever the height happened to fall.  Now the
 * height says how many WHOLE rows there are (`rows`), and the scroller is
 * exactly those rows tall (`bagH`); what is left of the body is space under
 * the grid, never a part of a row.  Three rows wherever three fit at 44 px;
 * a square is never under 44 (the finger's floor: going under is the owner's
 * call).
 *
 * And part 4, "Gear": "shrink their headers": the label row 30 -> 24 px, its
 * 6 px going to the cells.
 *
 * v2.3.6845 (card UI4 PR 6, `?v17gear`, src/game/v17Gear.js): `opts.v17` mends
 * what mp-v17fit found: the sideways Equipped row its TRUE width (sideRowW:
 * the groups' padding was not counted, the Gem cell cut at 667 x 375); an
 * upright panel too short for the body under its label row draws the body
 * without it (`wornHead`), one too narrow for "Inventory" beside the filter
 * and the gold drops the word (`invTitle`; both only on a 320 phone); and the
 * bag takes as many whole columns as its panel holds (wholeCols: a computer's
 * 840; every phone's answer is today's).  No `opts`: the geometry of the day
 * before, to the pixel.
 */
import { sideRowW, sideCell, invTitleFits, wornHeadFits, wholeCols } from './v17Gear.js';

export const GEAR_GAP = 4;         /* between the two panels */
export const GEAR_PAD = 4;         /* inside a panel */
export const GEAR_HEAD = 24;       /* the label row (v2.3.6784: was 30): its controls 24 px tall, their touch reaching 44 (.u2-hit) */
export const GEAR_MIN = 44;        /* no cell under the finger's floor */
export const GEAR_G = 3;           /* between the bag's squares: a packed, regular grid */
export const GEAR_BODY_G = 6;      /* between the body's cells: wider, so the shape reads apart from the grid */
export const GEAR_SHORT_HEAD = 52; /* sideways: the filter and the coins stacked at the bag's left (no label row in a 63 px page) */
const BAG_MAX = 64;                /* the bag's square at most (the width-fit size's cap) */

/* the most WHOLE rows of `cell` (with the gap between them) that fit in `room`: floor, never round or ceil */
export function wholeRows(room, cell, gap) {
  return Math.max(1, Math.floor((room + gap) / (cell + gap)));
}

/** The geometry: the bag's squares and its whole rows, and the body's cells, upright or in one sideways row. */
export function gearPanelsGeometry(W, H, opts) {
  const v17 = !!(opts && opts.v17);
  const MIN = GEAR_MIN, G = GEAR_G, PAD = GEAR_PAD;
  const short = H > 0 && H - GEAR_HEAD - 2 * PAD < 2 * MIN + G;
  if (short) {
    /* sideways: the Equipped row is nine cells in three groups; the bag takes the rest, one row of squares
       as tall as the page lets them be, the scroller exactly its whole rows tall */
    const cell0 = Math.max(MIN, Math.min(56, H - 2 * PAD));
    /* v2.3.6845: the row and two bag squares share the width (the 667 x 375 phone's Gem cell was cut) */
    const cell = v17 ? sideCell(W, cell0, PAD, GEAR_GAP, MIN) : cell0;
    const eqW = v17 ? sideRowW(cell, PAD) : 9 * cell + 6 * 2 + 2 * GEAR_BODY_G * 2 + 2 * PAD;
    const invW = Math.max(2 * cell + 2 * PAD, W - GEAR_GAP - eqW);
    const cols = Math.max(1, Math.floor((invW - 2 * PAD - (GEAR_SHORT_HEAD + G) + G) / (cell + G)));
    const rows = wholeRows(H - 2 * PAD, cell, G);
    const bagH = rows * cell + (rows - 1) * G;
    return { short, W, H, cell, bagCell: cell, cols, rows, bagH, below: H - 2 * PAD, invW, eqW, bodyCell: cell, torsoW: cell, wornHead: false, invTitle: false };
  }
  const pw = Math.floor((W - GEAR_GAP) / 2);
  const inner = pw - 2 * PAD;
  const below = H - GEAR_HEAD - 2 * PAD;
  const cols = Math.floor((inner + G) / (MIN + G)) >= 3 ? 3 : 2;
  const widthCell = Math.max(MIN, Math.min(BAG_MAX, Math.floor((inner - (cols - 1) * G) / cols)));
  /* v2.3.6784 (reading 7): the height has its say.  Where three rows of 44 fit, at least three: the square
     shrinks from its width-fit size toward 44 until the third row is whole.  Where they cannot, two whole rows,
     the square the smaller of its width-fit size and what the height allows. */
  let bagCell;
  if (below >= 3 * MIN + 2 * G) bagCell = Math.max(MIN, Math.min(widthCell, Math.floor((below - 2 * G) / 3)));
  else bagCell = Math.max(MIN, Math.min(widthCell, Math.floor((below - G) / 2)));
  const rows = wholeRows(below, bagCell, G);
  const bagH = rows * bagCell + (rows - 1) * G;
  /* v2.3.6845: the Equipped label row only where the body's three rows fit under it (else the body takes it) */
  const wornHead = !v17 || wornHeadFits(below, MIN, G);
  const bodyBelow = wornHead ? below : H - 2 * PAD;
  const bodyCell = Math.max(MIN, Math.min(56, Math.floor((bodyBelow - 2 * GEAR_BODY_G) / 3), Math.floor((inner - 2 * GEAR_BODY_G) / 3.25)));
  const torsoW = Math.min(Math.floor(bodyCell * 1.25), inner - 2 * bodyCell - 2 * GEAR_BODY_G);
  const bagCols = v17 ? wholeCols(inner, bagCell, G, cols) : cols;
  return { short, W, H, invW: pw, eqW: pw, cols: bagCols, bagCell, rows, bagH, below, bodyCell, torsoW: Math.max(bodyCell, torsoW),
    wornHead, invTitle: !v17 || invTitleFits(inner, opts.coins) };
}
