/* ═══ v2.3.4460: WHERE A PICTURE MEETS THE GROUND, FROM ITS OWN NUMBERS ═══
 *
 * A low thing in the world casts its shadow column by column from where each
 * column of its picture meets the ground (wheelObjects.js wheelObjectCasters,
 * v2.3.3028).  That line was read on the PAGE as each object page came in:
 * the page's file decoded a second time as a picture, every frame scaled
 * down onto a 128-column canvas and read back (propGround.js readArtBottoms)
 * -- and the whole-game sweep (tools/qa/mp/mp-heldsweep.mjs) found it the
 * most frequent thing to hold the page on a ride: 64 holds on one tour, up
 * to 39 ms each, 571 ms in all.
 *
 * The page's file is 256 colours and the reader's worker already has it as
 * numbers (png8Worker.js).  This reads the same line from those numbers, with
 * no canvas and no import, on the worker.  The canvas's reading IS the look
 * the game has (a building's long shadow starts where it says), so this does
 * what the canvas did, by its own arithmetic: the frame scaled to up to COLS
 * columns by up to 2 x COLS rows, each scaled pixel's alpha the blend of the
 * four pixels round its middle (a browser's plain smoothing), and per column
 * the lowest row whose alpha is SOLID or more -- as a fraction of the frame's
 * height from its top, -1 for a column with nothing solid.
 *
 * ONE READING FOR EVERY BROWSER.  The canvas's reading was never one thing:
 * each browser scales a picture its own way (Chromium halves it with Skia's
 * filters, then blends with coarse weights; Safari does its own), so a
 * column that half covers the EDGE of a post or a wall fell on one side of it
 * or the other by the browser, and the shadow's edge with it.  This rule is
 * the same arithmetic everywhere.  Against Chromium's own canvas on the
 * town's pages (mp-pagebases, 20,661 columns of 173 frames): 4.8% of columns
 * differ at all, 0.56% by more than a row, and all but 4 of those are edge
 * columns -- the worker reads what the page read one or two columns along.
 *
 * Two other rules were tried against the page's own reading and turned down:
 * the average of each scaled pixel's whole box differs three times as often
 * (13.9% of columns; it loses a thin foot, a signpost's post read from its
 * board), and "the lowest solid pixel of all" reads a building from the soft
 * edge of the shadow painted under it (the Town Hall 44 px lower), which
 * would move its long shadow on the ground.
 */
export const BOTTOM_COLS = 128;
export const BOTTOM_SOLID = 128;

/** `idx` the page's numbers (`stride` a row), `alpha[number]` each colour's
 *  alpha; the frame at (fx, fy), fw x fh pixels.  A Float32Array, one a
 *  column. */
export function bottomsOfNumbers(idx, stride, alpha, fx, fy, fw, fh) {
  fw = Math.round(fw); fh = Math.round(fh);
  if (!(fw > 0) || !(fh > 0)) return null;
  const W = Math.max(1, Math.min(BOTTOM_COLS, fw));
  const H = Math.max(1, Math.min(BOTTOM_COLS * 2, Math.round((fh / fw) * W)));
  const out = new Float32Array(W);
  const kx = fw / W, ky = fh / H;
  for (let x = 0; x < W; x++) {
    const sx = (x + 0.5) * kx - 0.5;
    let xa = Math.floor(sx);
    const tx = sx - xa;
    let xb = xa + 1;
    if (xa < 0) xa = 0; if (xb > fw - 1) xb = fw - 1; if (xa > fw - 1) xa = fw - 1;
    let at = -1;
    for (let y = H - 1; y >= 0; y--) {
      const sy = (y + 0.5) * ky - 0.5;
      let ya = Math.floor(sy);
      const ty = sy - ya;
      let yb = ya + 1;
      if (ya < 0) ya = 0; if (yb > fh - 1) yb = fh - 1; if (ya > fh - 1) ya = fh - 1;
      const ra = (fy + ya) * stride + fx, rb = (fy + yb) * stride + fx;
      const top = alpha[idx[ra + xa]] * (1 - tx) + alpha[idx[ra + xb]] * tx;
      const bot = alpha[idx[rb + xa]] * (1 - tx) + alpha[idx[rb + xb]] * tx;
      if (top * (1 - ty) + bot * ty >= BOTTOM_SOLID) { at = (y + 1) / H; break; }
    }
    out[x] = at;
  }
  return out;
}
