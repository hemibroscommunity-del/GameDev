#!/usr/bin/env node
/* ═══ v2.3.2975: A PICTURE OF THE WHEEL WITH ITS OBJECTS ═══
 *
 *   node tools/world/render-wheel-objects.mjs [--at town|x,y] [--size 2400x2000] [--px 1.5] [--feet] [--placing 2] [--plaintown] [--out file.png]
 *
 * The ground from the game's own swatches (public/world/ground/) and every
 * object placed there (public/tools/world/core/placing.js) drawn from the
 * game's own sprite sheets (public/world/objects/), sorted by their feet as
 * the game sorts them -- so a change to the placing rules can be looked at
 * without a phone.  `--at` is the middle (game px, or `town`, the arrival);
 * `--size` game px; `--px` game px a picture px (1.5 = one plan art px);
 * `--feet` outlines each footprint in red, the ground it stops you on.
 * Node only, no dependencies (the PNGs are read and written by png.mjs).
 */
import fs from 'fs';
import path from 'path';
import { PLAN as BASE_PLAN, PLAIN, bigTownPlan } from '../../public/tools/world/plan.js';
import { buildBlueprint } from '../../public/tools/world/core/layout.js';
import { materialMap, composeGround, swatchesUnder } from '../../public/tools/world/core/ground.js';
import { placeObjects, footprintOf, mayorSpot } from '../../public/tools/world/core/placing.js';
import { resample } from '../../public/tools/world/core/image.js';
import { wheelInfo, spokePoint } from '../../public/tools/world/core/wheel.js';
import { gridInfo } from '../../public/tools/world/core/grid.js';
import { decodePNG, encodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PXS = +arg('--px', '1.5');
const [VW, VH] = arg('--size', '2400x2000').split('x').map(Number);
/* by default where the QA pictures go, which git ignores */
const OUT = arg('--out', path.join(ROOT, 'tools/qa/out/wheel-objects.png'));
const FEET = process.argv.includes('--feet');
/* v2.3.2982: `--bigtown [k]`, the big-town preview's plan (plan.js bigTownPlan).
   v2.3.2998: without it, the STANDARD plan -- the town the game lays
   (plan.js PLAN, BUILDINGS 1.15) -- not bigTownPlan(1), the town as written,
   which this drew by default after v2.3.2994 made a bigger town standard */
const BIG = process.argv.includes('--bigtown') ? Number(arg('--bigtown', '2')) || 2 : null;
/* v2.3.3031: `--plaintown`, the standard size without the designed town (plan.js
   PLAIN, the game's `?plaintown`) -- to put a picture of it beside the designed one */
const PLAN = BIG == null ? (process.argv.includes('--plaintown') ? PLAIN : BASE_PLAN) : bigTownPlan(BIG);

const bp = buildBlueprint(PLAN);
const mm = materialMap(PLAN, bp);
const WPA = PLAN.worldPxPerArtPx;
/* v2.3.2999: `--placing 2`, placing v2 (the `?placing=2` preview) */
const placed = placeObjects(PLAN, bp, Number(arg('--placing', '1')) === 2 ? { v: 2 } : {});
const mayor = mayorSpot(PLAN, bp);
let at = arg('--at', 'town');
let cx, cy;
if (at === 'town') { cx = mayor.x + 105; cy = mayor.y + 120; }
else if (at.startsWith('land:')) {
  /* land:<id>:<tier>[:<side>] -- the middle of that tier on that spoke's
     road, `side` squares to the right of it looking outward */
  const [, id, tier, side] = at.split(':');
  const W = wheelInfo(PLAN), g = gridInfo(PLAN), sp = W.byId[id];
  const [sx, sy] = spokePoint(sp, W.tierMid(+tier), +(side || 0));
  cx = (g.cx + sx * g.P - bp.x0) * WPA; cy = (g.cy + sy * g.P - bp.y0) * WPA;
}
else [cx, cy] = at.split(',').map(Number);
const x0 = cx - VW / 2, y0 = cy - VH / 2;

/* the ground, one picture px a plan art px, then scaled to --px */
const rect = { x: Math.round(bp.x0 + x0 / WPA), y: Math.round(bp.y0 + y0 / WPA), w: Math.round(VW / WPA), h: Math.round(VH / WPA) };
const gman = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/world/ground/manifest.json'), 'utf8'));
const tiles = Object.create(null);
for (const id of swatchesUnder(bp, mm, rect)) {
  const s = (gman.swatches || []).find((q) => q.id === id);
  if (!s) continue;
  const t = {};
  for (const v of ['A', 'B']) {
    if (!(s.versions || []).includes(v)) continue;
    const img = decodePNG(fs.readFileSync(path.join(ROOT, 'public/world/ground', `${id}-${v}.png`)));
    /* a swatch is kept at 3 picture px a plan art px; this lays it at one */
    const small = resample({ w: img.w, h: img.h, data: img.data }, Math.round(img.w / 3), Math.round(img.h / 3));
    t[v] = { w: small.w, h: small.h, data: small.data };
  }
  if (t.A || t.B) tiles[id] = { A: t.A || t.B, B: t.A && t.B ? t.B : null };
}
const ground = composeGround(PLAN, bp, mm, rect, tiles, { scale: 1 });
const OW = Math.round(VW / PXS), OH = Math.round(VH / PXS);
const out = new Uint8ClampedArray(OW * OH * 4);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
  const gxp = Math.min(ground.w - 1, Math.floor((x * PXS) / WPA)), gyp = Math.min(ground.h - 1, Math.floor((y * PXS) / WPA));
  const s = (gyp * ground.w + gxp) * 4, o = (y * OW + x) * 4;
  out[o] = ground.data[s]; out[o + 1] = ground.data[s + 1]; out[o + 2] = ground.data[s + 2]; out[o + 3] = 255;
}

/* the objects, from the game's sprite sheets */
const oman = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/world/objects/manifest.json'), 'utf8'));
const pages = new Map();
const pageOf = (name) => {
  if (!pages.has(name)) {
    const a = oman.atlases.find((q) => q.name === name);
    pages.set(name, a ? { img: decodePNG(fs.readFileSync(path.join(ROOT, 'public/world/objects', a.image))), sheet: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/world/objects', a.sheet), 'utf8')) } : null);
  }
  return pages.get(name);
};
const objBy = Object.create(null);
for (const o of oman.objects) objBy[o.id] = o;
const draw = [];
let drawn = 0, missing = 0;
for (let i = 0; i < placed.n; i++) {
  const id = placed.kinds[placed.kind[i]], o = objBy[id];
  if (!o) { missing++; continue; }
  const pc = o.pieces[placed.piece[i] % o.pieces.length];
  const x = placed.x[i], y = placed.y[i], ks = placed.kindScale[placed.kind[i]] || 1;
  if (x + pc.gameW * ks < x0 || x - pc.gameW * ks > x0 + VW || y < y0 || y - pc.gameH * ks > y0 + VH) continue;
  draw.push({ id, o, pc, x, y, flip: placed.flip[i], ks });
}
draw.sort((a, b) => a.y - b.y);
for (const d of draw) {
  const pg = pageOf(d.pc.atlas);
  const fr = pg && pg.sheet.frames[d.pc.frame];
  if (!fr) continue;
  const k = d.ks / (2 * PXS);        /* picture px a sheet px (v2.3.2982: the big town's buildings bigger) */
  const dw = Math.round(fr.frame.w * k), dh = Math.round(fr.frame.h * k);
  /* v2.3.2981: stood on its foot, as the game stands it (a palm on its
     trunk; a mirrored one turns on it) */
  const fa = d.pc.foot && d.pc.w ? d.pc.foot[0] / d.pc.w : 0.5, fax = d.flip ? 1 - fa : fa;
  const ox = Math.round((d.x - x0) / PXS - dw * fax), oy = Math.round((d.y - y0) / PXS - dh);
  for (let v = 0; v < dh; v++) {
    const yy = oy + v;
    if (yy < 0 || yy >= OH) continue;
    const sy = fr.frame.y + Math.min(fr.frame.h - 1, Math.floor(v / k));
    for (let u = 0; u < dw; u++) {
      const xx = ox + u;
      if (xx < 0 || xx >= OW) continue;
      const su = Math.min(fr.frame.w - 1, Math.floor(u / k));
      const sx = fr.frame.x + (d.flip ? fr.frame.w - 1 - su : su);
      const s = (sy * pg.img.w + sx) * 4;
      if (pg.img.data[s + 3] < 128) continue;
      const o = (yy * OW + xx) * 4;
      out[o] = pg.img.data[s]; out[o + 1] = pg.img.data[s + 1]; out[o + 2] = pg.img.data[s + 2];
    }
  }
  drawn++;
  if (FEET) {
    for (const b of footprintOf(d.id, d.o.kind, d.x, d.y, d.pc.gameW * d.ks, d.pc.gameH * d.ks)) {
      const bx0 = Math.round((b.x0 - x0) / PXS), bx1 = Math.round((b.x1 - x0) / PXS), by0 = Math.round((b.y0 - y0) / PXS), by1 = Math.round((b.y1 - y0) / PXS);
      const dot = (xx, yy) => { if (xx >= 0 && yy >= 0 && xx < OW && yy < OH) { const o = (yy * OW + xx) * 4; out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; } };
      for (let xx = bx0; xx <= bx1; xx++) { dot(xx, by0); dot(xx, by1); }
      for (let yy = by0; yy <= by1; yy++) { dot(bx0, yy); dot(bx1, yy); }
    }
  }
}
/* Mayor Bro's spot: a gold ring (the game draws him) */
if (mayor) {
  const mx = Math.round((mayor.x - x0) / PXS), my = Math.round((mayor.y - y0) / PXS);
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * 2 * Math.PI, xx = Math.round(mx + 10 * Math.cos(t)), yy = Math.round(my + 5 * Math.sin(t));
    if (xx >= 0 && yy >= 0 && xx < OW && yy < OH) { const o = (yy * OW + xx) * 4; out[o] = 255; out[o + 1] = 210; out[o + 2] = 40; }
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, encodePNG(OW, OH, out));
console.log(`${OUT}: ${OW} x ${OH}, ${drawn} objects drawn (${placed.n} placed on the Wheel${missing ? `, ${missing} with no picture yet` : ''})`);
