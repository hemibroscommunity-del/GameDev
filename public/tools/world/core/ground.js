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
 *   composeGround(...)    the ground of any rectangle from the swatch
 *                         pictures, at one output pixel per art px (1.5 game
 *                         px) or, since v2.3.2942, finer (opts.scale);
 *   groundOverview(...)   the whole map at one pixel a cell, each swatch in
 *                         its own colour -- the Ground Studio's progress map.
 *
 * It is what the Ground Studio (public/tools/ground/) previews with, and --
 * since v2.3.2943 -- what the game itself lays its ground with, on the phone,
 * in a worker (ground-worker.js, the `?trial=wheel` switch): the download
 * stays the swatches, however big the map grows.  For that it also gives
 *
 *   swatchesUnder(...)    which swatches a rectangle's ground can use;
 *   walkBits(...)         where you cannot walk (the sea, rivers, lakes);
 *   overviewPixels(...)   the whole map, small, in the plan's colours.
 *
 * ── HOW TWO SWATCHES MEET ──
 * Never with a soft blend: pixel art has no half-colours.  NATURAL ground --
 * grass, dirt, sand, snow, the roads, the water -- meets on a ragged line:
 * each swatch's share of the ground is a smooth field over the cells (the
 * same blurred membership the World Builder's sketch uses), and every pixel
 * takes the swatch whose share, plus a little noise of its own, is highest.
 * The edge comes out in clusters of pixels, like a pixel artist's.  Two
 * versions of a swatch (A and B) share the ground in large noisy patches,
 * so the repeat is harder to spot.
 *
 * BUILT surfaces -- the town's street, boardwalks and square (BUILT below)
 * -- are laid exactly on their cells, with straight edges, over the natural
 * ground.  v2.3.2945, owner, on Main Street in the Ground Studio: "I think
 * wooden plank bits are on the edges."  They were the boardwalks: one cell
 * wide, and a blurred field cannot hold a strip that thin -- between the
 * street and a yard all three shares come out near a third, the noise
 * decides every pixel, and the planks crumbled into specks along both
 * edges of the street.  A surveyed town has straight edges anyway.
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
/* v2.3.2945: the surfaces laid exactly on their cells (see the header) */
const BUILT = ['street', 'boardwalk', 'plaza'];
/* the water the preview draws: deep, mid, shallow and foam -- the game's own
   reserved effect colours (public/tools/style/scene.js, EFFECT_PALETTE) */
const WATER_RGB = { deep: [28, 70, 126], mid: [53, 113, 161], shallow: [78, 156, 196], foam: [226, 238, 240] };

const shade = (rgb, k) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b) => a.map((v, i) => Math.round((v + b[i]) / 2));

/* ── the catalog ── */

/* Every swatch the world needs.  `group` is how the Ground Studio lists
   them; `color` is the plan's own colour for it, drawn wherever a swatch
   has not been made yet.
   v2.3.2944: no brief asks for a detail with a direction (style/bible.js,
   NO_DIRECTION -- the owner's rule, after wagon ruts tiled sideways down a
   north-south street).  `revised` names the version a brief last changed
   in, so the Ground Studio can tell the owner which swatches to redo. */
export function groundCatalog(plan) {
  const R = plan.regions, K = plan.classes;
  const out = [];
  const add = (e) => out.push({ levels: null, revised: null, ...e });
  add({ id: 'commons', group: 'hub', name: R.commons.name, brief: R.commons.stages[0].ground,
    where: 'the safe common land round the town', color: hexToRgb(R.commons.ground) });
  add({ id: 'town-yard', group: 'hub', name: 'Brotown yards', brief: 'packed earth with patchy short grass and a few pebbles',
    where: "the town's yards, and the ground under every building plot and camp", color: hexToRgb(R.town.ground) });
  add({ id: 'street', group: 'hub', name: 'Main Street', brief: 'hard-packed dirt street, trodden smooth and a little darker in soft patches, with a few scattered pebbles and wisps of straw lying every which way',
    where: "Brotown's streets", color: hexToRgb(K.street.color), revised: 'v2.3.2944' });
  add({ id: 'boardwalk', group: 'hub', name: 'Boardwalk', brief: 'weathered wooden decking of short boards in a basket weave: small square blocks of three or four boards, each block turned a quarter turn from its neighbours',
    where: "the town's boardwalks, and the bridges", color: hexToRgb(K.boardwalk.color), revised: 'v2.3.2944' });
  add({ id: 'plaza', group: 'hub', name: 'Town square', brief: 'packed pale gravel with a few flat flagstones',
    where: 'the town square round the Town Hall', color: hexToRgb(K.plaza.color) });
  add({ id: 'road', group: 'routes', name: 'Road', brief: 'the surface of a worn dirt road: packed earth worn evenly all over, with scattered pebbles and a few tiny tufts of grass',
    where: 'every road and footpath', color: hexToRgb(K.path.color), revised: 'v2.3.2944' });
  add({ id: 'gravel', group: 'routes', name: 'Railway bed', brief: 'coarse grey ballast gravel',
    where: 'under the mine railway (its rails and sleepers are objects)', color: [138, 138, 134] });
  for (const id of Object.keys(R)) {
    const rd = R[id];
    if (!rd.dir) continue;
    const base = hexToRgb(rd.ground);
    rd.stages.forEach((st, k) => add({ id: `${id}-${k + 1}`, group: id, name: `${rd.name}: ${st.name}`, brief: st.ground,
      levels: [k * 20 + 1, (k + 1) * 20], where: `levels ${k * 20 + 1}–${(k + 1) * 20} of ${rd.name}`, color: shade(base, 1.06 - 0.07 * k),
      revised: st.groundRevised || null }));
  }
  add({ id: 'lava', group: 'routes', name: 'Lava', brief: 'molten lava in bright orange and yellow under a cracked black crust (its own bright colours, with no glow spilling onto anything)',
    where: 'the lava pools and channels of the Flame Fields', color: hexToRgb(K.lava.color) });
  for (const key of Object.keys(plan.borders || {})) {
    const br = plan.borders[key];
    const [a, b] = key.split('|');
    add({ id: `border-${a}-${b}`, group: 'borders', name: `${R[a].name} and ${R[b].name}`, brief: br.ground || br.land,
      where: `where they meet, at their bases and on ${br.passes ? br.passes.join(' and ') : 'their passes'}`,
      color: mix(hexToRgb(R[a].ground), hexToRgb(R[b].ground)), revised: br.groundRevised || null });
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
  /* v2.3.2945: which swatches are built (laid on their cells, straight-edged) */
  const built = new Uint8Array(ids.length);
  for (const id of BUILT) if (index[id] != null) built[index[id]] = 1;
  return { mat, ids, index, water, catalog: cat, built };
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

/* v2.3.2945: the NATURAL swatches' shares of the ground round a rectangle
   (`cw` x `ch` cells from `cellAt`): each one's cells blurred twice.  Built
   surfaces take no part -- they are laid on their cells (builtLookup) -- so
   the natural ground runs on under them, and a one-cell boardwalk can no
   longer split a street from a yard three ways. */
function naturalFields(mm, cellAt, cw, ch) {
  const seen = new Uint8Array(mm.ids.length);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) seen[cellAt(x, y)] = 1;
  const present = [], memb = [];
  for (let q = 0; q < mm.ids.length; q++) {
    if (!seen[q] || (mm.built && mm.built[q])) continue;
    const f = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) f[y * cw + x] = cellAt(x, y) === q ? 1 : 0;
    blur1(f, cw, ch, 1);
    blur1(f, cw, ch, 1);
    present.push(q); memb.push(f);
  }
  /* nothing natural in reach (deep inside the square): the commons, which
     is never drawn there because every pixel is built */
  if (!present.length) { present.push(mm.index.commons != null ? mm.index.commons : 0); memb.push(new Float32Array(cw * ch).fill(1)); }
  return { present, memb };
}

/* v2.3.2945: the built swatch under a point (art px, continuous), or -1. */
function builtLookup(bp, mm) {
  const built = mm.built;
  if (!built) return () => -1;
  const S = bp.scale;
  return (ax, ay) => {
    const bx = Math.floor((ax - bp.x0) / S), by = Math.floor((ay - bp.y0) / S);
    if (bx < 0 || by < 0 || bx >= bp.w || by >= bp.h) return -1;
    const q = mm.mat[by * bp.w + bx];
    return built[q] ? q : -1;
  };
}

/* The ground of `rect` (art px, frame coordinates).
   `tiles[id]` = { A: tile, B?: tile }: the swatch pictures, square, seamless
   and already on the palette; a swatch not made yet is drawn in its plan
   colour, chequered, so the gap shows.  A tile is {w, h, data} (RGBA) or,
   since v2.3.2943, {w, h, idx, pal}: one palette index a pixel and the
   palette as r,g,b triples -- a quarter of the memory, which is what lets
   the phone keep a dozen swatches unpacked (ground-worker.js).  Returns
   { w, h, data (RGBA), mat (the swatch index of every pixel), scale }.

   `opts.scale` (v2.3.2942): output pixels per art px, a whole number.  1 (the
   default) is one pixel per art px (1.5 game px).  The Ground Studio uses 3:
   since v2.3.2942 a swatch is kept at 2 px per game px (style/bible.js,
   PIXEL) so ChatGPT's picture is never blown up, and the ground is laid at
   that sharpness.  Tiles are then in output px, anchored to the frame the
   same way, so chunks still meet with no seam.  Where one swatch fills a
   pixel's whole neighbourhood the answer is the plain one; only where two
   meet is each output pixel worked out on its own, which keeps the finer
   ground about as quick to lay as the coarse one. */
export function composeGround(plan, bp, mm, rect, tiles, opts = {}) {
  const K = Math.max(1, Math.round(opts.scale || 1));
  if (K > 1) return composeFine(plan, bp, mm, rect, tiles, opts, K);
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
  const { present, memb } = naturalFields(mm, cellAt, cw, ch);
  const water = mm.water;
  const wIdx = present.indexOf(water);
  const builtAt = builtLookup(bp, mm);
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
      /* a built surface is its cells, exactly (v2.3.2945) */
      const bq = builtAt(ax + 0.5, ay + 0.5);
      if (bq >= 0) { emat[ey * EW + ex] = bq; wdepth[ey * EW + ex] = 0; continue; }
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
          const u = ((ax % T) + T) % T, v = ((ay % T) + T) % T;
          putTexel(data, o, tile, v * T + u);
          continue;
        }
        /* not made yet: the plan's colour, chequered every 16 art px */
        c = ((ax >> 4) + (ay >> 4)) & 1 ? e.color : shade(e.color, 0.86);
      }
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  if (opts.withMaterials === false) return { w: RW, h: RH, data, scale: 1 };
  return { w: RW, h: RH, data, mat, scale: 1 };
}

/* One swatch pixel into the output: from an RGBA tile, or an indexed one. */
function putTexel(data, o, tile, k) {
  if (tile.idx) {
    const q = tile.idx[k] * 3, p = tile.pal;
    data[o] = p[q]; data[o + 1] = p[q + 1]; data[o + 2] = p[q + 2];
  } else {
    const q = k * 4, d = tile.data;
    data[o] = d[q]; data[o + 1] = d[q + 1]; data[o + 2] = d[q + 2];
  }
  data[o + 3] = 255;
}

/* composeGround at K output pixels per art px (see there). */
function composeFine(plan, bp, mm, rect, tiles, opts, K) {
  const S = bp.scale, seed = (plan.seed | 0) + 900;
  const RW = Math.round(rect.w), RH = Math.round(rect.h), X0 = Math.round(rect.x), Y0 = Math.round(rect.y);
  const M = 4, E2 = 2;
  const cx0 = Math.floor((X0 - E2 - bp.x0) / S) - M, cy0 = Math.floor((Y0 - E2 - bp.y0) / S) - M;
  const cw = Math.ceil((RW + 2 * E2) / S) + 2 * M + 2, ch = Math.ceil((RH + 2 * E2) / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, cx0 + x)), by = Math.min(bp.h - 1, Math.max(0, cy0 + y));
    return mm.mat[by * bp.w + bx];
  };
  const { present, memb } = naturalFields(mm, cellAt, cw, ch);
  const water = mm.water, wIdx = present.indexOf(water);
  const builtAt = builtLookup(bp, mm);
  /* the swatch at a point (art px, continuous), as composeGround decides it
     for a whole art px; `nx, ny` place its noise.  Leaves the water's share
     in `lastWater` for the sea's shading. */
  let lastWater = 0;
  const vs = new Float32Array(present.length);
  const pickAt = (axc, ayc, nx, ny) => {
    /* a built surface is its cells, exactly (v2.3.2945) */
    const bq = builtAt(axc, ayc);
    if (bq >= 0) return bq;
    const gyf = (ayc - bp.y0) / S - 0.5 - cy0, gxf = (axc - bp.x0) / S - 0.5 - cx0;
    const gj = Math.min(ch - 2, Math.max(0, Math.floor(gyf))), uy = Math.min(1, Math.max(0, gyf - gj));
    const gi = Math.min(cw - 2, Math.max(0, Math.floor(gxf))), ux = Math.min(1, Math.max(0, gxf - gi));
    const p00 = gj * cw + gi, p10 = p00 + 1, p01 = p00 + cw, p11 = p01 + 1;
    const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
    let best = present[0], bv = -Infinity, alive = 0, only = best;
    for (let q = 0; q < present.length; q++) {
      const f = memb[q];
      const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
      vs[q] = v;
      if (q === wIdx) lastWater = v;
      if (v > 0) { alive++; only = present[q]; }
    }
    if (alive === 1) return only;
    for (let q = 0; q < present.length; q++) {
      const v = vs[q];
      if (v <= 0) continue;
      const id = present[q];
      const n = valueNoise(nx * 0.09 + id * 7.31, ny * 0.09 - id * 3.17, seed) * 0.62 + valueNoise(nx * 0.31 + id * 1.9, ny * 0.31, seed + 7) * 0.38;
      const sc = v + JIT * n;
      if (sc > bv) { bv = sc; best = id; }
    }
    return best;
  };
  /* 1. whole art px, two more all round, so every output pixel below can
     see its art px's neighbours whichever rectangle it is in */
  const PW = RW + 2 * E2, PH = RH + 2 * E2;
  const pmat = new Uint8Array(PW * PH), pdep = new Float32Array(PW * PH);
  for (let py = 0; py < PH; py++) {
    const ay = Y0 - E2 + py;
    for (let px = 0; px < PW; px++) {
      const ax = X0 - E2 + px, p = py * PW + px;
      lastWater = 0;
      pmat[p] = pickAt(ax + 0.5, ay + 0.5, ax, ay);
      pdep[p] = lastWater;
    }
  }
  /* which art px have one swatch all round them (their eight neighbours too) */
  const puni = new Uint8Array(PW * PH);
  for (let py = 1; py < PH - 1; py++) for (let px = 1; px < PW - 1; px++) {
    const p = py * PW + px, m0 = pmat[p];
    puni[p] = pmat[p - PW - 1] === m0 && pmat[p - PW] === m0 && pmat[p - PW + 1] === m0 && pmat[p - 1] === m0 &&
      pmat[p + 1] === m0 && pmat[p + PW - 1] === m0 && pmat[p + PW] === m0 && pmat[p + PW + 1] === m0 ? 1 : 0;
  }
  /* 2. output pixels: the art px's answer where its neighbourhood is one
     swatch, each pixel's own where two meet.  FW more all round for the foam. */
  const FW = Math.max(1, Math.round(K / 1.5));
  const OW = RW * K, OH = RH * K, OX0 = X0 * K, OY0 = Y0 * K, OEW = OW + 2 * FW, OEH = OH + 2 * FW;
  const omat = new Uint8Array(OEW * OEH), odep = new Float32Array(OEW * OEH);
  for (let oy = 0; oy < OEH; oy++) {
    const aoy = OY0 - FW + oy, pyi = Math.floor(aoy / K) - (Y0 - E2);
    for (let ox = 0; ox < OEW; ox++) {
      const aox = OX0 - FW + ox, pxi = Math.floor(aox / K) - (X0 - E2);
      const p = pyi * PW + pxi, o = oy * OEW + ox;
      if (puni[p]) { omat[o] = pmat[p]; odep[o] = pdep[p]; continue; }
      lastWater = 0;
      const axc = (aox + 0.5) / K, ayc = (aoy + 0.5) / K;
      omat[o] = pickAt(axc, ayc, axc - 0.5, ayc - 0.5);
      odep[o] = lastWater;
    }
  }
  /* 3. colour */
  const data = new Uint8ClampedArray(OW * OH * 4), cat = mm.catalog;
  const mat = opts.withMaterials === false ? null : new Uint8Array(OW * OH);
  for (let oy = 0; oy < OH; oy++) {
    const aoy = OY0 + oy, ay = Math.floor(aoy / K);
    let lastAx = null, bsel = 0;
    for (let ox = 0; ox < OW; ox++) {
      const aox = OX0 + ox, ax = Math.floor(aox / K), i = oy * OW + ox, o = i * 4;
      const e0 = (oy + FW) * OEW + ox + FW, m = omat[e0];
      if (mat) mat[i] = m;
      let c;
      if (m === water) {
        let land = false;
        for (let d = 1; d <= FW && !land; d++) land = omat[e0 - d] !== water || omat[e0 + d] !== water || omat[e0 - d * OEW] !== water || omat[e0 + d * OEW] !== water;
        const dd = odep[e0];
        c = land ? WATER_RGB.foam : dd < 0.72 ? WATER_RGB.shallow : dd < 0.93 ? WATER_RGB.mid : WATER_RGB.deep;
      } else {
        const e = cat[m], t = tiles && tiles[e.id];
        if (t && t.A) {
          if (t.B && ax !== lastAx) { lastAx = ax; bsel = fbm(ax / 1100, ay / 1100, seed + 11, 2) + 0.18 * (hash2(ax >> 2, ay >> 2, seed + 13) - 0.5); }
          const tile = t.B && bsel > 0 ? t.B : t.A, T = tile.w;
          const u = ((aox % T) + T) % T, v = ((aoy % T) + T) % T;
          putTexel(data, o, tile, v * T + u);
          continue;
        }
        /* not made yet: the plan's colour, chequered every 16 art px */
        c = ((ax >> 4) + (ay >> 4)) & 1 ? e.color : shade(e.color, 0.86);
      }
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  if (opts.withMaterials === false) return { w: OW, h: OH, data, scale: K };
  return { w: OW, h: OH, data, mat, scale: K };
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

/* ── for the game (v2.3.2943) ── */

/* Every swatch the ground of `rect` (art px) can use: the cells under it and
   six more all round, more than composeGround's blur and noise reach, so a
   caller that unpacks exactly these has every picture the composer asks for. */
export function swatchesUnder(bp, mm, rect) {
  const sc = bp.scale, M = 6;
  const x0 = Math.max(0, Math.floor((rect.x - bp.x0) / sc) - M), y0 = Math.max(0, Math.floor((rect.y - bp.y0) / sc) - M);
  const x1 = Math.min(bp.w - 1, Math.ceil((rect.x + rect.w - bp.x0) / sc) + M), y1 = Math.min(bp.h - 1, Math.ceil((rect.y + rect.h - bp.y0) / sc) + M);
  const ids = new Set();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ids.add(mm.ids[mm.mat[y * bp.w + x]]);
  return ids;
}

/* Where you cannot walk: one bit a blueprint cell (row by row, bit k of byte
   k >> 3), set where the water's share of the ground is at least half -- the
   same blurred share composeGround draws the shore from, so the line you are
   stopped at is the line you see, give or take its noise (about half a cell,
   12 game px).  A river one cell wide is never drawn (the land's share wins
   everywhere along it), and so is not a wall either. */
export function walkBits(bp, mm) {
  const w = bp.w, h = bp.h, n = w * h;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = mm.mat[i] === mm.water ? 1 : 0;
  blur1(f, w, h, 1);
  blur1(f, w, h, 1);
  const bits = new Uint8Array((n + 7) >> 3);
  /* v2.3.2945: a built cell -- a bridge, a boardwalk -- is always open: it is
     laid over the water, and a one-cell bridge across a wide river sat in a
     share of water well over half */
  for (let i = 0; i < n; i++) if (f[i] >= 0.5 && !(mm.built && mm.built[mm.mat[i]])) bits[i >> 3] |= 1 << (i & 7);
  return bits;
}

/* The whole map, one pixel per `k` x `k` cells, in the plan's own colours
   and the deep sea: the game's blurry underlay for ground still being laid,
   and its Map panel.  RGBA. */
export function overviewPixels(bp, mm, k = 4) {
  const w = Math.ceil(bp.w / k), h = Math.ceil(bp.h / k);
  const cols = mm.ids.map((id, q) => (q === mm.water ? WATER_RGB.deep : mm.catalog[q].color));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const by = Math.min(bp.h - 1, y * k + (k >> 1));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(bp.w - 1, x * k + (k >> 1));
      const c = cols[mm.mat[by * bp.w + bx]], o = (y * w + x) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  return { w, h, data };
}
