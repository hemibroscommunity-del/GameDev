/* ═══ v2.3.4470: A MONSTER IN ANOTHER COLOUR IS ITS PALETTE IN ANOTHER COLOUR ═══
 *
 * A colour variant of a monster (the moss slime, the mire wisp:
 * monsterRecolor.js) is the same art retinted by brightness: every solid
 * pixel becomes the target colour times (its own brightness / the sheet's
 * mean brightness x 1.15).  That was done to the PIXELS, on the page: each
 * sheet unpacked onto a canvas, read back, rewritten, kept as a full-colour
 * copy -- 23 ms a sheet of the page's time as a look came in on a ride
 * through the town (the whole-game sweep, docs/specs/held-sweep.md), and four
 * bytes a pixel where the art is one.
 *
 * The art is a 256-colour file (strip-door.test holds that), so the same
 * retint is at most 255 multiplications: this gives the strip's palette in
 * the new colour.  The numbers are not touched; the strip stays one byte a
 * pixel on the graphics chip.
 *
 *   retintPalette(pal, idx, rgb) -> Uint32Array, entry for entry
 *     pal   the strip's colours, R | G << 8 | B << 16 | A << 24 (stripPack.js;
 *           entry 0 is see-through)
 *     idx   its numbers (how many pixels wear each colour: the mean is over
 *           the PIXELS, as the canvas's was)
 *     rgb   the target
 * A colour of alpha 30 or less is left as it is and counts for nothing, as
 * the canvas's rule left such a pixel.  No imports: node tests it
 * (held-sweep.test).
 */
export const RETINT_ALPHA = 30;
export const RETINT_REF_K = 1.15;

export function retintPalette(pal, idx, rgb) {
  const n = pal.length;
  const count = new Uint32Array(n);
  for (let i = 0; i < idx.length; i++) { const k = idx[i]; if (k < n) count[k]++; }
  const lum = new Float64Array(n);
  let sum = 0, px = 0, maxL = 1;
  for (let k = 1; k < n; k++) {
    const c = pal[k];
    if ((c >>> 24) <= RETINT_ALPHA || !count[k]) continue;
    const l = 0.299 * (c & 255) + 0.587 * ((c >>> 8) & 255) + 0.114 * ((c >>> 16) & 255);
    lum[k] = l;
    sum += l * count[k]; px += count[k];
    if (l > maxL) maxL = l;
  }
  const ref = Math.max(1, px ? (sum / px) * RETINT_REF_K : maxL);
  const out = new Uint32Array(n);
  for (let k = 0; k < n; k++) {
    const c = pal[k], a = c >>> 24;
    if (k === 0 || a <= RETINT_ALPHA) { out[k] = c; continue; }
    const l = count[k] ? lum[k] : 0.299 * (c & 255) + 0.587 * ((c >>> 8) & 255) + 0.114 * ((c >>> 16) & 255);
    const s = l / ref;
    const r = Math.min(255, Math.round(rgb[0] * s)), g = Math.min(255, Math.round(rgb[1] * s)), b = Math.min(255, Math.round(rgb[2] * s));
    out[k] = (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
  }
  return out;
}
