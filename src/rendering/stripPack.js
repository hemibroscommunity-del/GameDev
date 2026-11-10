/* ═══ v2.3.4460: A STRIP PACKED FROM ITS FILE'S OWN COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-10, on the slowdown by the Blacksmith (the fire goblin's
 * look loading: docs/specs/strip-gentle.md): "I thought fire goblin strips
 * were converted into 256 color art like everything should be."  They are.
 * Every monster strip is a 256-colour file: one byte a pixel, the colour's
 * number, the colours listed once.  And the game HOLDS each as colour numbers
 * (picsNumbers.js).  The waste was in between: the browser unpacked the file
 * to full colour, the page cropped and packed that on a canvas, and then read
 * every pixel back to work out the numbers the file had held all along --
 * 13 to 39 ms a strip of the page's time.
 *
 * This is that crop and pack done on the numbers themselves, with no canvas
 * and no import but the packer's own rules (trimRules.js), so it runs on a
 * core of its own (png8Worker.js) and node can test it:
 *
 *   packStripNumbers(dec, fw, fh, n) -> { w, h, idx, pal, cells } | null
 *
 * `dec` is png8Decode.js's reading of the file ({ w, h, stride, idx, rgb,
 * alpha }).  Each fw x fh cell is cropped to its art and the crops laid out
 * exactly as gearSheets.js packTrimmed lays them out (the same cells, the
 * same layout: strip-door.test), into `idx`: w x h, a byte a pixel, 0 for
 * see-through.  `pal` is the colours as picsNumbers.js keeps them (RGBA
 * bytes in one 32-bit number, as a canvas reads a pixel back; pal[0] is
 * see-through), numbered in the order the packed picture first uses them --
 * the order heldNumbers.js numbersOfPixels gives -- and ONLY the ones it
 * uses, so a bundle's row of 256 colours fills no faster than before.
 * `cells` is null when packing is not worth it (art that fills its cells):
 * then `idx` is the strip whole, n * fw wide.
 *
 * A colour whose alpha is 0 is see-through whatever its RGB says, as a canvas
 * reads it.  A colour that is partly see-through keeps the FILE's own RGB;
 * a canvas gave back that RGB rounded through its premultiplied store, a
 * step or two out.  Drawn, the two are the same picture (the atlas keeps
 * colours premultiplied: mp-stripgentle measures the difference).
 */
import { trimScanCellIdx, trimCellOf, trimLayout } from './trimRules.js';

export function packStripNumbers(dec, fw, fh, n) {
  if (!dec || !dec.idx) return null;
  const W = dec.w | 0, H = dec.h | 0, st = dec.stride | 0 || W;
  if (!n) n = Math.max(1, Math.floor(W / fw));
  if (!W || !H || H < fh || fw !== Math.round(fw) || fh !== Math.round(fh) || n * fw > W) return null;
  const src = dec.idx, alpha = dec.alpha, rgb = dec.rgb;
  const cells = [];
  for (let i = 0; i < n; i++) cells.push(trimCellOf(trimScanCellIdx(src, st, i * fw, fw, fh, alpha), fw, fh));
  const L = trimLayout(cells, fw, fh, n);
  const w = L ? L.W : n * fw, h = L ? L.H : fh;
  const idx = new Uint8Array(w * h);
  /* the file's numbers -> the packed picture's own, in the order it first uses them */
  const to = new Int16Array(256).fill(-1);
  const pal = new Uint32Array(256);
  let count = 1;
  const numberOf = (k) => {
    let v = to[k];
    if (v >= 0) return v;
    const a = k < alpha.length ? alpha[k] : 0;
    if (a === 0) v = 0;
    else {
      const c = (rgb[k * 3] | (rgb[k * 3 + 1] << 8) | (rgb[k * 3 + 2] << 16) | (a << 24)) >>> 0;
      /* two of the file's entries with one colour are one colour */
      v = -1;
      for (let j = 1; j < count; j++) if (pal[j] === c) { v = j; break; }
      if (v < 0) { v = count; pal[count++] = c; }
    }
    to[k] = v;
    return v;
  };
  const copy = (sx, sy, cw, ch, dx, dy) => {
    for (let y = 0; y < ch; y++) {
      const s = (sy + y) * st + sx, d = (dy + y) * w + dx;
      for (let x = 0; x < cw; x++) { const k = src[s + x]; const v = to[k]; idx[d + x] = v >= 0 ? v : numberOf(k); }
    }
  };
  if (L) {
    /* in reading order of the PACKED picture the numbering would need a second pass; the crops in their own order
       number the same colours, and the page maps them onto its bundle's row either way */
    for (let i = 0; i < n; i++) { const c = cells[i]; if (!c.blank) copy(i * fw + c.tx, c.ty, c.w, c.h, c.ax, c.ay); }
  } else {
    copy(0, 0, n * fw, fh, 0, 0);
  }
  return { w, h, idx, pal: pal.slice(0, count), cells: L ? cells : null, n };
}
