#!/usr/bin/env node
/* ═══ v2.3.6646: THE FIVE ENERGY BLOCKS IN THE CONTROLLER'S STEEL (card PAD part 11) ═══
 *
 *   node tools/art/steel-strip.mjs          write public/icons/ui/blocks-stam-steel.webp
 *   node tools/art/steel-strip.mjs --check  say the numbers, write nothing
 *
 * The owner, 2026-11-26, of the gold left beside the steel controller (the
 * five energy blocks under the bro among it): "Turn steel".  The blocks are
 * the owner's PAINTED strip (public/icons/ui/blocks-stam.webp, six frames of
 * five blocks, src/rendering/fxStrips.js BLOCK_BARS cuts it by geometry), so
 * the steel is a twin of that picture, made here, never by hand: same size,
 * same geometry (BLOCK_GEOM holds), only its gold hues moved:
 *
 *   - a gold pixel (hue 15-70 degrees, some colour in it) goes onto the steel
 *     ramp by its own lightness: the frame's bronze rim onto the rim's light
 *     and dark, a lit block's gold onto the cold light.  Every stop of the
 *     ramp is a colour measured on the steel sheet
 *     (assets/icons-source/owner-2026-11-26-pad4/sheet.png; padSkin.js
 *     PAD_STEEL: the Attack face's rim, its light DEEBF6, the sword's FBFBFA);
 *   - an empty block's grey (no colour, lightness .10 to .50) takes the
 *     steel's blue (hue 210) at its own lightness: the steel's dark;
 *   - the black frame, the see-through and every other pixel as they are.
 * Then 256 colours (the style process's quant256, the asset door's finish.mjs
 * onColours), written as a lossless WebP read back pixel for pixel.  Its
 * palette twin is tools/art/reduce256.mjs's (src/data/p256Files.js), as the
 * gold strip's is.  The mana strip (blocks-mp.webp) is not touched.
 *
 * Full and empty must stay at least as far apart as the gold's (WCAG contrast
 * of a block's mean colour, frame 0's first block against frame 5's): the
 * run stops otherwise.  tools/guards/pad-steel.test.mjs reads the result.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRgba, onColours, encodePng, writeWebp } from '../assets/finish.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(REPO, 'public/icons/ui/blocks-stam.webp');
const OUT = path.join(REPO, 'public/icons/ui/blocks-stam-steel.webp');
const CHECK = process.argv.includes('--check');

/* the steel ramp by lightness 0..1: the sheet's own colours */
export const STEEL_RAMP = [
  [0.0, [0x0E, 0x1F, 0x2B]],   /* the rim's outer edge */
  [0.22, [0x2B, 0x3C, 0x4C]],  /* PAD_STEEL.rimDark */
  [0.32, [0x35, 0x4E, 0x66]],  /* rimDeep */
  [0.42, [0x52, 0x6B, 0x81]],  /* rimMid */
  [0.62, [0xA7, 0xBD, 0xD5]],  /* the rim's top, 2 px in */
  [0.75, [0xC6, 0xD7, 0xE7]],  /* rimLight */
  [0.86, [0xDE, 0xEB, 0xF6]],  /* light: the cold light */
  [1.0, [0xFB, 0xFB, 0xFA]],   /* the top bevel's white */
];
/* a gold's lightness to the ramp: a lit block (lightness about .53) lands
   on C6D7E7 to DEEBF6, the frame's bronze (.69) near the sword's white */
const GOLD_LIFT = 1.45;
const STEEL_HUE = 210;
const STEEL_SAT = 0.22;

function ramp(t) {
  for (let i = 1; i < STEEL_RAMP.length; i++) {
    const [a, ca] = STEEL_RAMP[i - 1], [b, cb] = STEEL_RAMP[i];
    if (t <= b) { const k = b > a ? (t - a) / (b - a) : 0; return ca.map((v, j) => Math.round(v + (cb[j] - v) * k)); }
  }
  return STEEL_RAMP[STEEL_RAMP.length - 1][1];
}
/* Python's colorsys, both ways (the first cut was made with it) */
function toHls(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, l, 0];
  const d = mx - mn, s = l <= 0.5 ? d / (mx + mn) : d / (2 - mx - mn);
  const rc = (mx - r) / d, gc = (mx - g) / d, bc = (mx - b) / d;
  let h = r === mx ? bc - gc : g === mx ? 2 + rc - bc : 4 + gc - rc;
  h = ((h / 6) % 1 + 1) % 1;
  return [h, l, s];
}
function fromHls(h, l, s) {
  if (s === 0) return [l, l, l];
  const m2 = l <= 0.5 ? l * (1 + s) : l + s - l * s, m1 = 2 * l - m2;
  const v = (hue) => { hue = ((hue % 1) + 1) % 1; if (hue < 1 / 6) return m1 + (m2 - m1) * hue * 6; if (hue < 0.5) return m2; if (hue < 2 / 3) return m1 + (m2 - m1) * (2 / 3 - hue) * 6; return m1; };
  return [v(h + 1 / 3), v(h), v(h - 1 / 3)];
}

/** the steel of one picture's RGBA (a new array; the input untouched) */
export function steelOf(d) {
  const o = new Uint8Array(d);
  for (let i = 0; i < o.length; i += 4) {
    if (!o[i + 3]) continue;
    const [h, l, s] = toHls(o[i] / 255, o[i + 1] / 255, o[i + 2] / 255);
    const hd = h * 360;
    if (hd >= 15 && hd <= 70 && s > 0.25 && l > 0.06) {
      const c = ramp(Math.min(1, l * GOLD_LIFT));
      o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2];
    } else if (s < 0.18 && l > 0.10 && l < 0.5) {
      const c = fromHls(STEEL_HUE / 360, l, STEEL_SAT);
      o[i] = Math.round(c[0] * 255); o[i + 1] = Math.round(c[1] * 255); o[i + 2] = Math.round(c[2] * 255);
    }
  }
  return o;
}

/* a block's mean colour (frame `f`, block 0's inside) and WCAG contrast */
export function blockMean(d, w, h, f) {
  const fw = Math.floor(w / 6), x0 = f * fw + 24, x1 = f * fw + 50;
  const s = [0, 0, 0]; let n = 0;
  for (let y = 25; y < h - 25; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 200) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; }
  }
  return s.map((v) => v / Math.max(1, n));
}
const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
export const lumOf = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrastOf = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export function fullEmpty(d, w, h) { return contrastOf(blockMean(d, w, h, 0), blockMean(d, w, h, 5)); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = readRgba(SRC);
  const steel = steelOf(src.d);
  const r = onColours([{ d: steel, w: src.w, h: src.h }]);
  /* the picture as it will be on its 256 colours */
  const out = new Uint8Array(src.w * src.h * 4);
  r.idx[0].forEach((k, i) => { out.set(r.pal.subarray ? r.pal.subarray(k * 4, k * 4 + 4) : r.pal.slice(k * 4, k * 4 + 4), i * 4); });
  const gold = fullEmpty(src.d, src.w, src.h), now = fullEmpty(out, src.w, src.h);
  console.log(`  gold:  full against empty ${gold.toFixed(2)}`);
  console.log(`  steel: full against empty ${now.toFixed(2)}, ${r.n} colours, moved ${r.err.toFixed(4)} (OKLab)`);
  if (now < gold) { console.log('  FAIL the steel\'s full and empty are closer than the gold\'s'); process.exit(1); }
  if (!CHECK) {
    const png = await encodePng(r.idx[0], r.pal, src.w, src.h);
    const n = writeWebp(png, OUT);
    console.log(`  wrote ${path.relative(REPO, OUT)} (${src.w}x${src.h}, ${n} colours, ${fs.statSync(OUT).size} bytes)`);
  }
}
