/* ═══ v2.3.2937: THE GROUND — swatches laid on the plan ═══
 *
 * Owner, 2026-09-29: "Yes definitely do the swatches."  Since v2.3.2935 the
 * ground is not painted square by square: it is made from about fifty
 * seamless GROUND SWATCHES in HD pixel art -- four stages for each of the
 * eight elements, the commons, the town, the roads and the border lands --
 * and laid onto the blueprint by code (docs/WORLD-BIBLE.md §13).
 *
 * This module does that laying, and nothing that needs a browser:
 *
 *   groundCatalog(plan)   every swatch the world needs, derived from the
 *                         plan (its stages, borders and classes), with a
 *                         brief for its prompt and where it is used;
 *   materialMap(plan, bp) which swatch covers each blueprint cell, or the
 *                         sea -- water is drawn by the game, not a swatch;
 *   composeGround(...)    the ground of any rectangle, one output pixel per
 *                         art px (1.5 game px), from the swatch pictures;
 *   groundOverview(...)   the whole map at one pixel a cell, each swatch in
 *                         its own colour -- the Ground Studio's progress map.
 *
 * It is what the Ground Studio (public/tools/ground/) previews with, and it
 * is written so the game can compose its ground on the phone the same way
 * later: the download stays the swatches, however big the map grows.
 *
 * ── HOW TWO SWATCHES MEET ──
 * Never on a straight line, and never with a soft blend: pixel art has no
 * half-colours.  Each swatch's share of the ground is a smooth field over
 * the cells (the same blurred membership the World Builder's sketch uses);
 * every pixel takes the swatch whose share, plus a little noise of its own,
 * is highest.  The edge comes out ragged, in clusters of pixels, like a
 * pixel artist's.  Two versions of a swatch (A and B) share the ground in
 * large noisy patches, so the repeat is harder to spot.
 *
 * ── DETERMINISM ──
 * Everything is a function of absolute position (the frame's art px): the
 * tiles are anchored to the frame's origin, so two neighbouring rectangles
 * composed separately meet with no seam -- the property that lets the game
 * build its ground in chunks.  No Math.sin/cos/pow (core/rng.js).
 */
import { valueNoise, fbm, hash2 } from './rng.js';
import { gridInfo } from './grid.js';
import { C, hexToRgb } from './layout.js';
import { axisDist } from './wheel.js';

/* the id of the sea and every other water: drawn by the game, not a swatch */
export const WATER = 'water';
/* how far either side of the line between two spokes their border land
   reaches, in squares (about 700 art px across, a zone) */
const BORDER_BAND = 0.45;
/* how much each swatch's own noise pushes its edge about */
const JIT = 0.32;
/* the water the preview draws: deep, mid, shallow and foam -- the game's own
   reserved effect colours (public/tools/style/scene.js, EFFECT_PALETTE) */
const WATER_RGB = { deep: [28, 70, 126], mid: [53, 113, 161], shallow: [78, 156, 196], foam: [226, 238, 240] };

const shade = (rgb, k) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b) => a.map((v, i) => Math.round((v + b[i]) / 2));

/* ── the catalog ── */

/* Every swatch the world needs.  `group` is how the Ground Studio lists
   them; `color` is the plan's own colour for it, drawn wherever a swatch
   has not been made yet. */
export function groundCatalog(plan) {
  const R = plan.regions, K = plan.classes;
  const out = [];
  const add = (e) => out.push({ levels: null, ...e });
  add({ id: 'commons', group: 'hub', name: R.commons.name, brief: R.commons.stages[0].ground,
    where: 'the safe common land round the town', color: hexToRgb(R.commons.ground) });
  add({ id: 'town-yard', group: 'hub', name: 'Brotown yards', brief: 'packed earth with patchy short grass and a few pebbles',
    where: "the town's yards, and the ground under every building plot and camp", color: hexToRgb(R.town.ground) });
  add({ id: 'street', group: 'hub', name: 'Main Street', brief: 'wide, hard-packed dirt street with faint wagon-wheel ruts and hoof prints',
    where: "Brotown's streets", color: hexToRgb(K.street.color) });
  add({ id: 'boardwalk', group: 'hub', name: 'Boardwalk planks', brief: 'weathered wooden planks laid side by side, running left to right',
    where: "the town's boardwalks, and the bridges", color: hexToRgb(K.boardwalk.color) });
  add({ id: 'plaza', group: 'hub', name: 'Town square', brief: 'packed pale gravel with a few flat flagstones',
    where: 'the town square round the Town Hall', color: hexToRgb(K.plaza.color) });
  add({ id: 'road', group: 'routes', name: 'Road', brief: 'the surface of a worn dirt road: packed earth with faint wheel ruts and scattered pebbles',
    where: 'every road and footpath', color: hexToRgb(K.path.color) });
  add({ id: 'gravel', group: 'routes', name: 'Railway bed', brief: 'coarse grey ballast gravel',
    where: 'under the mine railway (its rails and sleepers are objects)', color: [138, 138, 134] });
  for (const id of Object.keys(R)) {
    const rd = R[id];
    if (!rd.dir) continue;
    const base = hexToRgb(rd.ground);
    rd.stages.forEach((st, k) => add({ id: `${id}-${k + 1}`, group: id, name: `${rd.name}: ${st.name}`, brief: st.ground,
      levels: [k * 20 + 1, (k + 1) * 20], where: `levels ${k * 20 + 1}–${(k + 1) * 20} of ${rd.name}`, color: shade(base, 1.06 - 0.07 * k) }));
  }
  add({ id: 'lava', group: 'routes', name: 'Lava', brief: 'molten lava in bright orange and yellow under a cracked black crust (its own bright colours, with no glow spilling onto anything)',
    where: 'the lava pools and channels of the Flame Fields', color: hexToRgb(K.lava.color) });
  for (const key of Object.keys(plan.borders || {})) {
    const br = plan.borders[key];
    const [a, b] = key.split('|');
    add({ id: `border-${a}-${b}`, group: 'borders', name: `${R[a].name} and ${R[b].name}`, brief: br.ground || br.land,
      where: `where they meet, at their bases and on ${br.passes ? br.passes.join(' and ') : 'their passes'}`,
      color: mix(hexToRgb(R[a].ground), hexToRgb(R[b].ground)) });
  }
  return out;
}

/* ── which swatch covers each cell ── */

export function materialMap(plan, bp) {
  const g = gridInfo(plan);
  const cat = groundCatalog(plan);
  const ids = [...cat.map((e) => e.id), WATER];
  const index = Object.create(null);
  ids.forEach((id, i) => { index[id] = i; });
  const W = bp.wheel, S = bp.scale, P = g.P;
  const spokes = W.spokes;
  const water = index[WATER];
  const isWater = new Uint8Array(bp.classIds.length);
  for (const k of ['ocean', 'river', 'water']) isWater[C[k]] = 1;
  const mat = new Uint8Array(bp.w * bp.h);
  const reg = bp.regionIds;
  const stageId = Object.create(null), borderId = Object.create(null);
  for (const id of reg) if (plan.regions[id].dir) stageId[id] = [1, 2, 3, 4].map((k) => index[`${id}-${k}`]);
  for (const key of Object.keys(plan.borders || {})) borderId[key] = index[`border-${key.replace('|', '-')}`];
  for (let by = 0; by < bp.h; by++) {
    const y = (bp.y0 + (by + 0.5) * S - g.cy) / P;
    for (let bx = 0; bx < bp.w; bx++) {
      const i = by * bp.w + bx, c = bp.cls[i], rid = reg[bp.reg[i]];
      let m;
      if (isWater[c]) m = water;
      else if (c === C.lava) m = index.lava;
      else if (rid === 'town') m = c === C.street ? index.street : c === C.boardwalk ? index.boardwalk : c === C.plaza ? index.plaza : index['town-yard'];
      else if (c === C.path) m = index.road;
      else if (c === C.bridge) m = index.boardwalk;
      else if (c === C.rail) m = index.gravel;
      else if (c === C.lot) m = index['town-yard'];
      else if (rid === 'commons' || !stageId[rid]) m = index.commons;
      else {
        m = stageId[rid][bp.band[i]];
        /* border land: on a pass (outside every spoke), or near the line
           halfway between two spokes at their bases */
        const x = (bp.x0 + (bx + 0.5) * S - g.cx) / P;
        let d1 = Infinity, d2 = Infinity, k1 = 0, k2 = 0;
        for (let k = 0; k < spokes.length; k++) {
          const d = axisDist(W, spokes[k], x, y);
          if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; }
        }
        if (d1 > W.half || d2 - d1 < BORDER_BAND) {
          const b = borderId[[spokes[k1].id, spokes[k2].id].sort().join('|')];
          if (b != null) m = b;
        }
      }
      mat[i] = m;
    }
  }
  return { mat, ids, index, water, catalog: cat };
}

/* ── laying the swatches ── */

/* In-place box blur of a 1-channel field. */
function blur1(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += f[y * w + Math.min(w - 1, Math.max(0, x + d))];
      tmp[x] = s / (2 * r + 1);
    }
    f.set(tmp.subarray(0, w), y * w);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += f[Math.min(h - 1, Math.max(0, y + d)) * w + x];
      tmp[y] = s / (2 * r + 1);
    }
    for (let y = 0; y < h; y++) f[y * w + x] = tmp[y];
  }
}

/* The ground of `rect` (art px, frame coordinates), one pixel per art px.
   `tiles[id]` = { A: {w, h, data}, B?: {w, h, data} }: the swatch pictures,
   square, seamless and already on the palette; a swatch not made yet is
   drawn in its plan colour, chequered, so the gap shows.  Returns
   { w, h, data (RGBA), mat (the swatch index of every pixel) }. */
export function composeGround(plan, bp, mm, rect, tiles, opts = {}) {
  const S = bp.scale, seed = (plan.seed | 0) + 900;
  const RW = Math.round(rect.w), RH = Math.round(rect.h), X0 = Math.round(rect.x), Y0 = Math.round(rect.y);
  /* the cells under the rectangle, and a margin for the blur */
  const M = 4;
  const cx0 = Math.floor((X0 - bp.x0) / S) - M, cy0 = Math.floor((Y0 - bp.y0) / S) - M;
  const cw = Math.ceil(RW / S) + 2 * M + 2, ch = Math.ceil(RH / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, cx0 + x)), by = Math.min(bp.h - 1, Math.max(0, cy0 + y));
    return mm.mat[by * bp.w + bx];
  };
  const seen = new Uint8Array(mm.ids.length);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) seen[cellAt(x, y)] = 1;
  const present = [], memb = [];
  for (let q = 0; q < mm.ids.length; q++) {
    if (!seen[q]) continue;
    const f = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) f[y * cw + x] = cellAt(x, y) === q ? 1 : 0;
    blur1(f, cw, ch, 1);
    blur1(f, cw, ch, 1);
    present.push(q); memb.push(f);
  }
  const water = mm.water;
  const wIdx = present.indexOf(water);
  /* the swatch of every pixel, with one pixel more all round, so a shore on
     the rectangle's edge is found the same way whichever rectangle it is in */
  const EW = RW + 2, EH = RH + 2;
  const emat = new Uint8Array(EW * EH);
  const wdepth = new Float32Array(EW * EH);
  for (let ey = 0; ey < EH; ey++) {
    const ay = Y0 - 1 + ey;
    const gyf = (ay + 0.5 - bp.y0) / S - 0.5 - cy0;
    const gj = Math.min(ch - 2, Math.max(0, Math.floor(gyf))), uy = Math.min(1, Math.max(0, gyf - gj));
    for (let ex = 0; ex < EW; ex++) {
      const ax = X0 - 1 + ex;
      const gxf = (ax + 0.5 - bp.x0) / S - 0.5 - cx0;
      const gi = Math.min(cw - 2, Math.max(0, Math.floor(gxf))), ux = Math.min(1, Math.max(0, gxf - gi));
      const p00 = gj * cw + gi, p10 = p00 + 1, p01 = p00 + cw, p11 = p01 + 1;
      const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
      let best = present[0], bv = -Infinity, wv = 0;
      for (let q = 0; q < present.length; q++) {
        const f = memb[q];
        const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
        if (q === wIdx) wv = v;
        if (v <= 0) continue;
        const id = present[q];
        const n = valueNoise(ax * 0.09 + id * 7.31, ay * 0.09 - id * 3.17, seed) * 0.62 + valueNoise(ax * 0.31 + id * 1.9, ay * 0.31, seed + 7) * 0.38;
        const s = v + JIT * n;
        if (s > bv) { bv = s; best = id; }
      }
      emat[ey * EW + ex] = best;
      wdepth[ey * EW + ex] = wv;
    }
  }
  /* colour */
  const data = new Uint8ClampedArray(RW * RH * 4);
  const mat = new Uint8Array(RW * RH);
  const cat = mm.catalog;
  for (let py = 0; py < RH; py++) {
    const ay = Y0 + py;
    for (let px = 0; px < RW; px++) {
      const ax = X0 + px, i = py * RW + px, o = i * 4;
      const e0 = (py + 1) * EW + px + 1, m = emat[e0];
      mat[i] = m;
      let c;
      if (m === water) {
        const land = emat[e0 - 1] !== water || emat[e0 + 1] !== water || emat[e0 - EW] !== water || emat[e0 + EW] !== water;
        const d = wdepth[e0];
        c = land ? WATER_RGB.foam : d < 0.72 ? WATER_RGB.shallow : d < 0.93 ? WATER_RGB.mid : WATER_RGB.deep;
      } else {
        const e = cat[m], t = tiles && tiles[e.id];
        if (t && t.A) {
          const useB = t.B && fbm(ax / 1100, ay / 1100, seed + 11, 2) + 0.18 * (hash2(ax >> 2, ay >> 2, seed + 13) - 0.5) > 0;
          const tile = useB ? t.B : t.A, T = tile.w;
          const u = ((ax % T) + T) % T, v = ((ay % T) + T) % T, q = (v * T + u) * 4;
          data[o] = tile.data[q]; data[o + 1] = tile.data[q + 1]; data[o + 2] = tile.data[q + 2]; data[o + 3] = 255;
          continue;
        }
        /* not made yet: the plan's colour, chequered every 16 art px */
        c = ((ax >> 4) + (ay >> 4)) & 1 ? e.color : shade(e.color, 0.86);
      }
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  if (opts.withMaterials === false) return { w: RW, h: RH, data };
  return { w: RW, h: RH, data, mat };
}

/* The whole map, one pixel per cell: each swatch in `means[id]` (its
   picture's average colour) once made, else in its plan colour dimmed --
   so the map fills in as the swatches come in. */
export function groundOverview(plan, bp, mm, means = {}) {
  const out = new Uint8ClampedArray(bp.w * bp.h * 4);
  const cols = mm.ids.map((id, q) => {
    if (q === mm.water) return [22, 44, 70];
    if (means[id]) return means[id];
    return shade(mm.catalog[q].color, 0.55);
  });
  for (let i = 0; i < bp.w * bp.h; i++) {
    const c = cols[mm.mat[i]], o = i * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}
