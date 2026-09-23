#!/usr/bin/env node
/* ═══ v2.3.2668: SLICE THE OWNER'S BADGE + NUMERAL SHEET ═══
 * One sheet: a round badge and a pill badge on the top row, then the numerals
 * 0-9 and a "+" on the bottom row.  Cut into transparent PNGs for the Points
 * grid's remaining-points badges (owner: "Use this sprite sheet for the tiny
 * numbers").
 *
 * Found by PROJECTION, as slice_stat_glyphs.mjs does it: alpha projected onto
 * Y finds the two row bands, projected onto X within each band finds the
 * pieces, and each piece gets a tight alpha box.  A hardcoded grid would be one
 * re-export away from cutting every numeral in half.
 *
 * Downscaled here, to a fixed HEIGHT per kind (not a max side -- the pill is
 * wide, and a max-side rule would shrink it to a sliver), with alpha-weighted
 * averaging so the edges do not pick up a dark halo.  The badge renders ~14px
 * tall; the kept heights give a 3x phone screen room to spare.
 *
 *   node tools/slice_badge_sheet.mjs <sheet.png> public/icons/ui/badge
 */
import { decode, encode } from './png.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , sheetPath, outDir] = process.argv;
if (!sheetPath || !outDir) { console.error('usage: node tools/slice_badge_sheet.mjs <sheet.png> <outDir>'); process.exit(1); }

const img = decode(readFileSync(sheetPath));
const W = img.width, H = img.height, d = img.data;
const A = (x, y) => d[(y * W + x) * 4 + 3];
const ON = 40;

function runs(counts, minGap, minLen) {
  const out = []; let s = -1, gap = 0;
  for (let i = 0; i <= counts.length; i++) {
    const on = i < counts.length && counts[i] > 0;
    if (on) { if (s < 0) s = i; gap = 0; }
    else if (s >= 0) { gap++; if (gap >= minGap || i === counts.length) { const e = i - gap; if (e - s + 1 >= minLen) out.push([s, e]); s = -1; gap = 0; } }
  }
  return out;
}

const rowOn = []; for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (A(x, y) > ON) n++; rowOn.push(n); }
const bands = runs(rowOn, 12, 60);
if (bands.length !== 2) { console.error('expected 2 row bands, got', bands); process.exit(1); }

function pieces([y0, y1], minGap) {
  const colOn = []; for (let x = 0; x < W; x++) { let n = 0; for (let y = y0; y <= y1; y++) if (A(x, y) > ON) n++; colOn.push(n); }
  return runs(colOn, minGap, 20).map(([x0, x1]) => {
    let t = y1, b = y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (A(x, y) > 8) { if (y < t) t = y; if (y > b) b = y; }
    let l = x1, r = x0;
    for (let y = t; y <= b; y++) for (let x = x0; x <= x1; x++) if (A(x, y) > 8) { if (x < l) l = x; if (x > r) r = x; }
    return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
  });
}

function crop({ x, y, w, h }) {
  const o = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) o.set(d.subarray(((y + j) * W + x) * 4, ((y + j) * W + x + w) * 4), j * w * 4);
  return { width: w, height: h, data: o };
}

function scaleToH(src, th) {
  const k = th / src.height, dw = Math.max(1, Math.round(src.width * k)), dh = th;
  const out = new Uint8Array(dw * dh * 4), sw = src.width, sd = src.data;
  for (let dy = 0; dy < dh; dy++) for (let dx = 0; dx < dw; dx++) {
    const sx0 = dx / k, sx1 = (dx + 1) / k, sy0 = dy / k, sy1 = (dy + 1) / k;
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
      if (sx >= sw || sy >= src.height) continue;
      const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0), wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0), w = wx * wy;
      const i = (sy * sw + sx) * 4, al = sd[i + 3] / 255;
      r += sd[i] * al * w; g += sd[i + 1] * al * w; b += sd[i + 2] * al * w; a += al * w; wsum += w;
    }
    const o = (dy * dw + dx) * 4;
    if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    out[o + 3] = Math.round(255 * a / wsum);
  }
  return { width: dw, height: dh, data: out };
}

const shapes = pieces(bands[0], 30);
const glyphs = pieces(bands[1], 6);
if (shapes.length !== 2 || glyphs.length !== 11) { console.error('expected 2 shapes + 11 glyphs, got', shapes.length, glyphs.length, glyphs); process.exit(1); }

const SHAPE_H = 64, GLYPH_H = 48;
const put = (name, box, th) => {
  const s = scaleToH(crop(box), th);
  writeFileSync(`${outDir}/${name}.png`, encode(s));
  console.log(`${name.padEnd(6)} src ${box.w}x${box.h} -> ${s.width}x${s.height}`);
};
put('circle', shapes[0], SHAPE_H);
put('pill', shapes[1], SHAPE_H);
/* every numeral scales by ONE factor (the tallest's), so a "1" stays a thin
   1 and the row keeps a common baseline instead of each glyph filling its box */
const tall = Math.max(...glyphs.map((g) => g.h));
glyphs.forEach((g, i) => put(i < 10 ? `d${i}` : 'plus', g, Math.max(1, Math.round(GLYPH_H * g.h / tall))));

/* ═══ v2.3.2670: TWO BAKED VARIANTS, FROM THE SAME PIXELS ═══
   Owner, off the mockups: "I like the normal blue with the yellow/gold
   outline" (the badges) and "try making the outline of all the number stats
   white" (the numerals in the thirteen stat cells).
   Baked here rather than applied as a CSS filter at runtime: a filter on the
   badge would recolour the gold numerals sitting on it too (the first blue
   mockup did exactly that), and a filter per stat cell is thirteen
   compositing layers on an iPhone for a colour that never changes.

   BLUE SHAPES -- the exact CSS `hue-rotate(170deg) saturate(1.1)` the owner
   picked from the capture, as the Filter Effects matrices, so the baked badge
   is the approved colour and not an approximation of it.

   WHITE-OUTLINE NUMERALS -- only the GOLD pixels move: each keeps its own
   brightness as a grey, so the outline's bevel and highlight survive; the
   dark fill and the dark outer ring are left exactly as drawn.  Edge pixels
   that are half gold, half dark move by how gold they are, so the rim does
   not grow a hard seam. */
function hueSat(png, deg, sat) {
  const a = deg * Math.PI / 180, c = Math.cos(a), si = Math.sin(a);
  const H = [
    [0.213 + c * 0.787 - si * 0.213, 0.715 - c * 0.715 - si * 0.715, 0.072 - c * 0.072 + si * 0.928],
    [0.213 - c * 0.213 + si * 0.143, 0.715 + c * 0.285 + si * 0.140, 0.072 - c * 0.072 - si * 0.283],
    [0.213 - c * 0.213 - si * 0.787, 0.715 - c * 0.715 + si * 0.715, 0.072 + c * 0.928 + si * 0.072],
  ];
  const S = [
    [0.213 + 0.787 * sat, 0.715 - 0.715 * sat, 0.072 - 0.072 * sat],
    [0.213 - 0.213 * sat, 0.715 + 0.285 * sat, 0.072 - 0.072 * sat],
    [0.213 - 0.213 * sat, 0.715 - 0.715 * sat, 0.072 + 0.928 * sat],
  ];
  const d = new Uint8Array(png.data);
  const mul = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  for (let i = 0; i < d.length; i += 4) {
    const v = mul(S, mul(H, [d[i], d[i + 1], d[i + 2]]));
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round(v[k])));
  }
  return { width: png.width, height: png.height, data: d };
}
function goldToWhite(png) {
  const d = new Uint8Array(png.data);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (!mx) continue;
    const sat = (mx - mn) / mx;
    let h = 0;
    if (mx !== mn) {
      if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
      h *= 60; if (h < 0) h += 360;
    }
    if (h < 20 || h > 70) continue;                      /* not gold */
    const t = Math.max(0, Math.min(1, (sat - 0.15) / 0.3)); /* how gold */
    const grey = Math.min(255, mx * 1.04);
    d[i] = Math.round(r + (grey - r) * t);
    d[i + 1] = Math.round(g + (grey - g) * t);
    d[i + 2] = Math.round(b + (grey - b) * t);
  }
  return { width: png.width, height: png.height, data: d };
}
const reread = (name) => decode(readFileSync(`${outDir}/${name}.png`));
for (const n of ['circle', 'pill']) {
  writeFileSync(`${outDir}/${n}-blue.png`, encode(hueSat(reread(n), 170, 1.1)));
  console.log(`${n}-blue`);
}
for (const n of [...Array(10).keys()].map((i) => `d${i}`).concat(['plus'])) {
  const w = n === 'plus' ? 'wplus' : 'w' + n.slice(1);
  writeFileSync(`${outDir}/${w}.png`, encode(goldToWhite(reread(n))));
}
console.log('w0-w9, wplus');
