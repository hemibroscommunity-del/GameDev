#!/usr/bin/env node
/* ═══ v2.3.2642: SLICE THE OWNER'S STAT GLYPH SHEET ═══
 * The owner supplied one 1448x1086 sheet holding all thirteen stat glyphs in
 * two rows (six lane stats, seven body stats) with a caption under each.
 * This cuts it into thirteen transparent PNGs.
 *
 * The cells are found by PROJECTION rather than by a hardcoded grid: alpha is
 * projected onto each axis to find the row bands and the column bands inside
 * them, then each cell gets its own tight alpha bounding box. A hardcoded
 * grid would be one re-export away from silently cutting every glyph in half.
 *
 * The CAPTION under each glyph is excluded on purpose -- the UI draws its own
 * labels in its own font, and baking the artwork's text in would double them.
 */
import { decode, encode } from './png.mjs';
import { readFileSync, writeFileSync } from 'fs';

const [, , sheetPath, outDir] = process.argv;
if (!sheetPath || !outDir) { console.error('usage: node tools/slice_stat_glyphs.mjs <sheet.png> <outDir>'); process.exit(1); }

const img = decode(readFileSync(sheetPath));
const W = img.width, H = img.height, d = img.data;
const A = (x, y) => d[(y * W + x) * 4 + 3];

/* row bands, with a gap threshold wide enough to separate a glyph from the
   caption sitting a few pixels under it */
const rowOn = [];
for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (A(x, y) > 60) n++; rowOn.push(n); }
const GLYPH_MIN_H = 120;          /* a caption band is ~49px; a glyph ~190 */
const bands = [];
{ let inb = false, s = 0;
  for (let y = 0; y < H; y++) {
    const on = rowOn[y] > 300;    /* a glyph row is wide; a caption row is not */
    if (on && !inb) { inb = true; s = y; } else if (!on && inb) { inb = false; if (y - s >= GLYPH_MIN_H) bands.push([s, y - 1]); }
  }
  if (inb && H - s >= GLYPH_MIN_H) bands.push([s, H - 1]); }

const NAMES = [
  ['range', 'dmg', 'aspd', 'luck', 'special', 'elem'],
  ['hp', 'def', 'mana', 'stam', 'dodge', 'move', 'eres'],
];
if (bands.length !== 2) { console.error('expected 2 glyph rows, found ' + bands.length + ': ' + JSON.stringify(bands)); process.exit(2); }

let made = 0;
bands.forEach(([y0, y1], r) => {
  const colOn = [];
  for (let x = 0; x < W; x++) { let n = 0; for (let y = y0; y <= y1; y++) if (A(x, y) > 60) n++; colOn.push(n > 2); }
  const cols = []; let inb = false, s = 0;
  for (let x = 0; x < W; x++) { if (colOn[x] && !inb) { inb = true; s = x; } else if (!colOn[x] && inb) { inb = false; if (x - s > 40) cols.push([s, x - 1]); } }
  if (inb) cols.push([s, W - 1]);
  if (cols.length !== NAMES[r].length) {
    console.error(`row ${r}: expected ${NAMES[r].length} glyphs, found ${cols.length}`); process.exit(3);
  }
  cols.forEach(([x0, x1], c) => {
    /* tight bbox inside the cell, so a glyph is not left floating in padding */
    let bx0 = x1, bx1 = x0, by0 = y1, by1 = y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (A(x, y) > 24) {
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    const w = bx1 - bx0 + 1, h = by1 - by0 + 1;
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((by0 + y) * W + (bx0 + x)) * 4, ti = (y * w + x) * 4;
      out[ti] = d[si]; out[ti + 1] = d[si + 1]; out[ti + 2] = d[si + 2]; out[ti + 3] = d[si + 3];
    }
    const name = NAMES[r][c];
    writeFileSync(`${outDir}/${name}.png`, Buffer.from(encode({ width: w, height: h, data: out })));
    console.log(`${name}.png  ${w}x${h}`);
    made++;
  });
});
console.log(made + ' glyphs written to ' + outDir);
