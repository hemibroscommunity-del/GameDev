/* ═══ v2.3.4400: THE STRIP PACKER'S RULES, APART FROM ITS CANVASES ═══
 *
 * gearSheets.js packTrimmed crops each frame of a strip to its art and packs
 * the crops into one canvas (v2.3.2750, v2.3.2775).  Its rules -- which
 * pixels are a frame's art, how a crop is padded and snapped, how the crops
 * are laid out, when packing is not worth it -- live here, with no canvas
 * and no import, so that:
 *   - packTrimmed, packTrimmedSliced (the same pack a cell at a time) and
 *     stripPack.js (the same pack of a 256-colour file's own numbers, off
 *     the page's thread: v2.3.4470) follow the very same rules and cannot
 *     drift;
 *   - node can test them (server/test/strip-slices.test.mjs).
 * The numbers are gearSheets' own: PAD 4 px round the art, every edge
 * snapped out to ALIGN 8 (the mip-alignment argument there), GAP 8 between
 * crops.
 */
export const TRIM_PAD = 4;
export const TRIM_ALIGN = 8;
export const TRIM_GAP = 8;

/** One fw x fh cell of RGBA `data` (`stride` px a row, the cell's left edge
 *  at x = ox): its art's box (x1 < 0: empty) and the first solid pixel the
 *  scan meets (alpha 128 and up; sx < 0: none). */
export function trimScanCell(data, stride, ox, fw, fh) {
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1, sx = -1, sy = -1;
  for (let y = 0; y < fh; y++) {
    const row = y * stride;
    for (let x = 0; x < fw; x++) {
      const a = data[(row + ox + x) * 4 + 3];
      if (a !== 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (sx < 0 && a >= 128) { sx = x; sy = y; }
      }
    }
  }
  return { x0, y0, x1, y1, sx, sy };
}
/** The same scan of a cell of colour NUMBERS (`idx`, a byte a pixel, `stride`
 *  a row; `alpha[number]` each colour's alpha), for a strip read straight
 *  from its 256-colour file (stripPack.js, v2.3.4470).  A pixel is art where
 *  its colour's alpha is not 0, exactly as trimScanCell reads RGBA bytes. */
export function trimScanCellIdx(idx, stride, ox, fw, fh, alpha) {
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1, sx = -1, sy = -1;
  for (let y = 0; y < fh; y++) {
    const row = y * stride + ox;
    for (let x = 0; x < fw; x++) {
      const a = alpha[idx[row + x]];
      if (a !== 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (sx < 0 && a >= 128) { sx = x; sy = y; }
      }
    }
  }
  return { x0, y0, x1, y1, sx, sy };
}
/** That box as a cell to pack: where its crop sits in the frame, and its size. */
export function trimCellOf(b, fw, fh) {
  const snapDn = (v) => Math.max(0, Math.floor(v / TRIM_ALIGN) * TRIM_ALIGN);
  let tx, ty, w, h;
  if (b.x1 < 0) {
    /* an empty frame still needs a texture: one blank ALIGN cell */
    tx = 0; ty = 0; w = TRIM_ALIGN; h = TRIM_ALIGN;
  } else {
    tx = snapDn(b.x0 - TRIM_PAD); ty = snapDn(b.y0 - TRIM_PAD);
    w = Math.min(fw, Math.ceil((b.x1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - tx;
    h = Math.min(fh, Math.ceil((b.y1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - ty;
  }
  return { ax: 0, ay: 0, tx, ty, w, h, blank: b.x1 < 0 };
}
/** Lays the cells out (their ax, ay) and gives the packed size { W, H } --
 *  or null when packing is not worth it (the art fills its frames). */
export function trimLayout(cells, fw, fh, n) {
  /* v2.3.2775: ONE ROW OR SHELVES, whichever is smaller.  A single row is as
     tall as the tallest crop, so a strip whose crops differ a lot in height
     wastes the band above every short one; shelves (tallest-first rows about
     as wide as the packed area is square, each as tall as its own tallest
     crop) waste the ragged ends of their rows instead.  Measured on the gear
     and stand-in sheets neither wins everywhere, so both are laid out and the
     smaller canvas is kept.  Positions stay multiples of ALIGN (every w and h
     is, for the mipmapped 128/256 sheets) with GAP between crops and between
     rows, so the mip-alignment argument above still holds.  Shelves are capped
     at 4096 wide; a single row is never wider than the strip it came from. */
  const layRow = () => {
    let x = 0, hh = TRIM_ALIGN;
    const pos = cells.map((c) => { const p = [x, 0]; x += c.w + TRIM_GAP; if (c.h > hh) hh = c.h; return p; });
    return { pos, W: Math.max(TRIM_ALIGN, x - TRIM_GAP), H: hh };
  };
  const layShelves = () => {
    let area = 0, widest = TRIM_ALIGN;
    for (const c of cells) { area += (c.w + TRIM_GAP) * (c.h + TRIM_GAP); if (c.w > widest) widest = c.w; }
    const rowW = Math.min(4096, Math.max(widest, Math.ceil(Math.sqrt(area) / TRIM_ALIGN) * TRIM_ALIGN));
    const order = cells.map((c, i) => i).sort((a, b) => cells[b].h - cells[a].h || a - b);
    const pos = new Array(cells.length);
    let cx = 0, cy = 0, shelfH = 0, usedW = TRIM_ALIGN;
    for (const i of order) {
      const c = cells[i];
      if (cx > 0 && cx + c.w > rowW) { cy += shelfH + TRIM_GAP; cx = 0; shelfH = 0; }
      pos[i] = [cx, cy];
      cx += c.w + TRIM_GAP;
      if (c.h > shelfH) shelfH = c.h;
      if (pos[i][0] + c.w > usedW) usedW = pos[i][0] + c.w;
    }
    return { pos, W: usedW, H: Math.max(TRIM_ALIGN, cy + shelfH) };
  };
  const rowL = layRow(), shelfL = layShelves();
  const L = (shelfL.W * shelfL.H < rowL.W * rowL.H) ? shelfL : rowL;
  cells.forEach((c, i) => { c.ax = L.pos[i][0]; c.ay = L.pos[i][1]; });
  /* Not worth it: a sheet whose art genuinely fills its frames (the cook and
     fire stand-ins, measured 99-101%) would come back no smaller, plus the
     cost of the scan.  The caller keeps the plain strip. */
  if (L.W * L.H > 0.9 * n * fw * fh) return null;
  return { W: L.W, H: L.H };
}
