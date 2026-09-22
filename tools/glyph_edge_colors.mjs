/* v2.3.2665: the dominant colour of each stat glyph, for the Points grid's
   cell outline (owner: "I'd rather have the cell outline be whatever the main
   icon color is").
   Measured off the shipped PNGs rather than picked by eye, so a re-exported
   glyph re-measures instead of drifting from its frame.
   Method: opaque pixels only; drop the ink outline (very dark) and the
   specular highlight (near-white) unless the glyph is itself white-ish
   (Luck); bucket what remains by hue weighted by saturation, take the
   heaviest bucket, and average the pixels in it.
     node tools/glyph_edge_colors.mjs            # prints key -> #hex */
import { readFileSync, readdirSync } from 'node:fs';
import { decode } from './png.mjs';

const DIR = new URL('../public/icons/ui/stat/', import.meta.url);
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: mx ? d / mx : 0, v: mx / 255 };
}

export function dominant(png) {
  const { width, height, data } = png;
  const px = [];
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3];
    if (a < 200) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    px.push({ r, g, b, ...hsv(r, g, b) });
  }
  const body = px.filter((p) => p.v > 0.28);                 /* not the ink outline */
  const chroma = body.filter((p) => p.s > 0.35 && p.v > 0.35);
  /* a glyph with almost no colour in it (Luck's white star) is its bright
     body, not whatever few tinted pixels sit in its shading */
  if (chroma.length < body.length * 0.25) {
    /* ...and only its UNcoloured body: Resist is a silver shield with a small
       flame in it, and averaging the flame in turns the silver muddy pink */
    const lit = body.filter((p) => p.v > 0.7 && p.s < 0.25);
    const n = lit.length || 1;
    return hex(lit.reduce((s, p) => s + p.r, 0) / n, lit.reduce((s, p) => s + p.g, 0) / n, lit.reduce((s, p) => s + p.b, 0) / n);
  }
  const bins = new Array(24).fill(0).map(() => ({ w: 0, px: [] }));
  for (const p of chroma) {
    const k = Math.floor(p.h / 15) % 24;
    bins[k].w += p.s * p.v; bins[k].px.push(p);
  }
  /* neighbouring bins belong to one hue -- a gradient straddling a bin edge
     must not lose to a flatter colour elsewhere */
  let best = 0, bestW = -1;
  for (let k = 0; k < 24; k++) {
    const w = bins[k].w + 0.5 * (bins[(k + 23) % 24].w + bins[(k + 1) % 24].w);
    if (w > bestW) { bestW = w; best = k; }
  }
  const sel = [...bins[best].px, ...bins[(best + 23) % 24].px, ...bins[(best + 1) % 24].px]
    .filter((p) => Math.abs(((p.h - (best * 15 + 7.5)) + 540) % 360 - 180) <= 22.5);
  /* the colour the eye calls the icon's colour is its lit body, not its
     shadow -- keep the brighter half */
  sel.sort((a, b) => b.v - a.v);
  const top = sel.slice(0, Math.max(1, Math.ceil(sel.length / 2)));
  const n = top.length;
  return hex(top.reduce((s, p) => s + p.r, 0) / n, top.reduce((s, p) => s + p.g, 0) / n, top.reduce((s, p) => s + p.b, 0) / n);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()) {
    const png = decode(readFileSync(new URL(f, DIR)));
    console.log(f.replace('.png', '').padEnd(8), dominant(png));
  }
}
