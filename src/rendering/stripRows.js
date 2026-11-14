/* ═══ v2.3.5044: A MONSTER'S STRIP PUT ON ITS ROW OF COLOURS, OFF THE PAGE ═══
 *
 * held-budget.mjs `strip-made`: the page's own part of a monster's strip
 * coming in (zoneTextures.js _stripOfNumbers > picsNumbers.js stripAsNumbers)
 * was to choose the row of colours its bundle shares, give the row the
 * colours it lacked, and then put every pixel's number on the row's numbers
 * (and pad each line to four bytes for WebGL): a loop over every byte of the
 * strip, on the page, 4 to 18 ms a strip in the town (the held sweep's
 * `town`, three runs).  The family's `next`: "send the bundle's row with the
 * ask so the worker numbers the strip for it".  So the page sends its
 * bundle's rows with the ask (picsNumbers.js stripRowsAsk), the reader's
 * worker (png8Worker.js) chooses the row and numbers the strip with the two
 * functions below, and the page checks the rows are as it described them,
 * gives the row its new colours and makes the texture
 * (picsNumbers.js _onPlannedRow).  Rows that changed meanwhile: the page
 * numbers the strip itself, as before.
 *
 * The rule is the page's own (picsNumbers.js rowFor and stripAsNumbers):
 * server/test/strip-door.test.mjs holds these two to a verbatim copy of it,
 * on made-up strips and rows.  No imports: the worker and node run it.
 */

/** Which row the strip's colours go on, and how.  `pal`: the strip's colours
 *  (place 0 see-through, never looked up); `rows`: its bundle's rows as the
 *  page holds them, each { n, pal } (pal: places 0 to n - 1).  The first row
 *  with room for the colours it lacks (256 places a row), else a new one
 *  (`ri === rows.length`, its place 0 see-through).
 *  -> { ri, n0 (the row's places before), to (the strip's number -> the
 *  row's), added (the colours the row gains, in order, from place n0) } */
export function planOnRows(pal, rows) {
  const list = rows || [];
  let ri = list.length, map = null, n = 1;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const m = new Map();
    for (let k = 0; k < r.n; k++) if (!m.has(r.pal[k])) m.set(r.pal[k], k);
    if (!m.has(0)) m.set(0, 0);
    let fresh = 0;
    for (let k = 1; k < pal.length; k++) if (!m.has(pal[k])) fresh++;
    if (r.n + fresh <= 256) { ri = i; map = m; n = r.n; break; }
  }
  if (!map) map = new Map([[0, 0]]);
  const n0 = n;
  const to = new Uint8Array(pal.length);
  const added = [];
  for (let k = 1; k < pal.length; k++) {
    const c = pal[k];
    let x = map.get(c);
    if (x === undefined) { x = n++; map.set(c, x); added.push(c); }
    to[k] = x;
  }
  return { ri, n0, to, added: Uint32Array.from(added) };
}

/** The strip's numbers on its row's: `to` applied to every pixel, each line
 *  padded to `st` bytes with copies of its last pixel (WebGL's unpacking, so
 *  the right edge samples as a canvas's clamped edge did).  A new array: the
 *  strip's own numbers are left as they were. */
export function remapToRow(idx, w, h, to, st) {
  const out = new Uint8Array(st * h);
  for (let y = 0; y < h; y++) {
    const o = y * st, i0 = y * w;
    for (let x = 0; x < w; x++) out[o + x] = to[idx[i0 + x]];
    for (let x = w; x < st; x++) out[o + x] = out[o + w - 1];
  }
  return out;
}
