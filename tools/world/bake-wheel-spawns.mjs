#!/usr/bin/env node
/* ═══ v2.3.2978: WHERE EACH LAND'S MONSTERS STAND ON THE WHEEL ═══
 *
 *   node tools/world/bake-wheel-spawns.mjs            (writes server/src/wheelspawns.js)
 *   node tools/world/bake-wheel-spawns.mjs --check    (exit 1 if that file is stale)
 *
 * Owner, 2026-10-02: "can you place the monsters where they belong in their
 * zones (on the ends closest to the central map)?"  Each of today's eight
 * element zones has its six monsters; on the Wheel they stand at the INNER
 * end of that element's spoke -- its levels 1-5, just past the safe commons.
 *
 * The server has no copy of the map (and must never build one: the plan is
 * ~1 s and 13 MB, TRAPS / the fishing notes), so the places are worked out
 * here, from the plan, and written into the server as plain numbers.  For
 * every spoke: open ground (`C.ground`: not a road, a wood, water, a cliff,
 * lava, a landmark or a plot) in that spoke's own land, in a band just past
 * the commons, near its axis, well clear of water, cliffs, lava, roads and
 * the commons -- and spread apart, farthest first, so the first six are as
 * far from each other as the land allows.
 *
 * v2.3.3012: AND THE STRETCHES PAST IT.  The owner said yes to "monsters past
 * level 5": each land's next three stretches (tiers 2-4, levels 6-10, 11-15
 * and 16-20 -- the rest of its first stage, up to the first pass and the
 * camp at level 20) get places of their own, worked out the same way along
 * that stretch of the axis (SPAWN_RULES.deep).  The first stretch's places are
 * exactly what they were: the deeper ones are written after them, as `deeper`.
 *
 * DRIFT: the worker only redeploys when server/** changes, so a plan change
 * that moved a land would leave monsters standing where it used to be.
 * tools/world/test-world-core.mjs runs this with --check: the plan and the
 * server's copy must agree, in the same PR.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAN } from '../../public/tools/world/plan.js';
import { buildBlueprint, C } from '../../public/tools/world/core/layout.js';
import { wheelInfo, axisDist } from '../../public/tools/world/core/wheel.js';
import { gridInfo } from '../../public/tools/world/core/grid.js';
import { placeObjects, footprintOf } from '../../public/tools/world/core/placing.js';
import { objectCatalog } from '../../public/tools/objects/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'server/src/wheelspawns.js');

/* The rules, in game px. */
export const SPAWN_RULES = Object.freeze({
  bandFrom: 350,       /* the band starts this far past the commons' edge on the axis... */
  bandTo: 1350,        /* ...and ends this far past it, or where the land's first stage does */
  tier: 1,             /* every place on that first stage: levels 1-5, the land's end nearest
                          the centre (the first bake's band ran ~300 px into levels 6-10) */
  half: 420,           /* at most this far either side of the spoke's axis */
  clearHazard: 168,    /* from water, a cliff or lava (a snowman's 144 px wander + a step) */
  clearRoad: 72,       /* from a road, the railway or a bridge */
  clearCommons: 300,   /* from the safe commons */
  apart: 150,          /* between two places */
  clearObject: 24,     /* from the footprint of anything placed on the land (placing.js) */
  safeMargin: 48,      /* the safe ground: every land cell of the commons and the town lies
                          within WHEEL_SAFE_R of the centre, this much to spare */
  keep: 12,            /* places kept a land (six are used today) */
  /* v2.3.3012: the stretches past the first, each a tier of its own (one zone
     of walking, five levels).  The rest of the rules above hold there too
     (hazards, roads, objects, `apart`, `half`, `keep`); these are theirs. */
  deep: Object.freeze({
    tiers: Object.freeze([2, 3, 4]),   /* levels 6-10, 11-15, 16-20: the first stage, up to the pass and camp at 20 */
    clearTier: 120,    /* from any land of another tier, the tier's wandering edge (tierWarp) included: a monster
                          stands, and wanders 180 px at most, among the levels its stretch says on the top bar */
    clearPlace: 360,   /* from a camp's plot (or any plot out in the country): no monster at a waystation's door */
  }),
});

export function bakeWheelSpawns(plan = PLAN, rules = SPAWN_RULES) {
  const bp = buildBlueprint(plan);
  const W = wheelInfo(plan), g = gridInfo(plan);
  const WPA = plan.worldPxPerArtPx, S = bp.scale, cellG = S * WPA;
  const ri = Object.create(null);
  bp.regionIds.forEach((k, i) => { ri[k] = i; });
  const n = bp.w * bp.h;
  /* city-block distances (in cells) from hazards, from roads, from the commons */
  const dist = (seed) => {
    const d = new Float32Array(n).fill(1e9);
    const q = new Int32Array(n);
    let qh = 0, qt = 0;
    for (let i = 0; i < n; i++) if (seed(i)) { d[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const i = q[qh++], x = i % bp.w, y = (i / bp.w) | 0, nd = d[i] + 1;
      if (x > 0 && d[i - 1] > nd) { d[i - 1] = nd; q[qt++] = i - 1; }
      if (x < bp.w - 1 && d[i + 1] > nd) { d[i + 1] = nd; q[qt++] = i + 1; }
      if (y > 0 && d[i - bp.w] > nd) { d[i - bp.w] = nd; q[qt++] = i - bp.w; }
      if (y < bp.h - 1 && d[i + bp.w] > nd) { d[i + bp.w] = nd; q[qt++] = i + bp.w; }
    }
    return d;
  };
  const HAZ = new Set([C.ocean, C.river, C.water, C.cliff, C.lava]);
  const ROAD = new Set([C.path, C.rail, C.bridge, C.street]);
  const dHaz = dist((i) => HAZ.has(bp.cls[i]));
  const dRoad = dist((i) => ROAD.has(bp.cls[i]));
  const dCommons = dist((i) => bp.reg[i] === ri.commons || bp.reg[i] === ri.town);
  /* v2.3.3012: for the deeper stretches -- from the plots out in the country
     (the camps), and, per tier, from any land of another tier (the commons,
     the town and the sea are tier 0: they bound no stretch) */
  const D = rules.deep || null;
  /* the camps' plots as straight-line distance (a city-block count runs long
     on the diagonal: the first bake put a place 305 px from one); the plots
     are few, so their cells in a 128 px hash */
  const LB = 128, lcols = Math.ceil((bp.w * S * WPA) / LB) + 1;
  const lotCells = new Map();
  if (D) for (let i = 0; i < n; i++) {
    if (bp.cls[i] !== C.lot) continue;
    const x = ((i % bp.w) + 0.5) * S * WPA, y = (((i / bp.w) | 0) + 0.5) * S * WPA;
    const key = Math.floor(y / LB) * lcols + Math.floor(x / LB);
    let a = lotCells.get(key);
    if (!a) lotCells.set(key, (a = []));
    a.push(x, y);
  }
  const nearLot = (x, y, r) => {
    for (let j = Math.floor((y - r) / LB); j <= Math.floor((y + r) / LB); j++) for (let i = Math.floor((x - r) / LB); i <= Math.floor((x + r) / LB); i++) {
      const a = lotCells.get(j * lcols + i);
      if (a) for (let k = 0; k < a.length; k += 2) if (Math.hypot(a[k] - x, a[k + 1] - y) < r) return true;
    }
    return false;
  };
  const dOther = Object.create(null);
  if (D) for (const t of D.tiers) dOther[t] = dist((i) => bp.tier[i] > 0 && bp.tier[i] !== t);
  /* what stands on the land -- placing.js's trees, rocks and props, sized from
     the catalog as the placer sizes them (its positions never depend on which
     pictures exist, and so neither does this), in a 128 px hash */
  const placed = placeObjects(plan, bp);
  const catById = Object.create(null);
  for (const e of objectCatalog()) catById[e.id] = e;
  const HB = 128, hcols = Math.ceil(placed.worldW / HB) + 1;
  const boxes = new Map();
  for (let k = 0; k < placed.n; k++) {
    const id = placed.kinds[placed.kind[k]], e = catById[id];
    if (!e) continue;
    const h = e.fit === 'w' ? e.size / (e.ar || 1) : e.size, w = e.fit === 'w' ? e.size : e.size * (e.ar || 1);
    for (const b of footprintOf(id, e.kind, placed.x[k], placed.y[k], w, h)) {
      for (let j = Math.floor(b.y0 / HB); j <= Math.floor(b.y1 / HB); j++) for (let i = Math.floor(b.x0 / HB); i <= Math.floor(b.x1 / HB); i++) {
        const key = j * hcols + i;
        let a = boxes.get(key);
        if (!a) boxes.set(key, (a = []));
        a.push(b);
      }
    }
  }
  const nearObject = (x, y, r) => {
    for (let j = Math.floor((y - r) / HB); j <= Math.floor((y + r) / HB); j++) for (let i = Math.floor((x - r) / HB); i <= Math.floor((x + r) / HB); i++) {
      for (const b of boxes.get(j * hcols + i) || []) {
        if (Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)) < r) return true;
      }
    }
    return false;
  };
  /* farthest first, from the place nearest the band's middle on the axis
     (v2.3.3012: one copy for every stretch -- the first's places came out of
     exactly this, and still do) */
  const pick = (cand, mid) => {
    cand.sort((a, b) => (Math.abs(a.along - mid) + a.side) - (Math.abs(b.along - mid) + b.side) || a.y - b.y || a.x - b.x);
    const picked = [cand[0]];
    const dMin = cand.map((c) => Math.hypot(c.x - cand[0].x, c.y - cand[0].y));
    while (picked.length < rules.keep) {
      let best = -1, bestD = rules.apart;
      for (let k = 0; k < cand.length; k++) if (dMin[k] >= bestD) { bestD = dMin[k]; best = k; }
      if (best < 0) break;
      const c = cand[best];
      picked.push(c);
      for (let k = 0; k < cand.length; k++) dMin[k] = Math.min(dMin[k], Math.hypot(cand[k].x - c.x, cand[k].y - c.y));
    }
    return picked;
  };
  /* game px of a cell's centre, and back */
  const gameX = (bx) => (bx + 0.5) * cellG, gameY = (by) => (by + 0.5) * cellG;
  const cxG = (g.cx - bp.x0) * WPA, cyG = (g.cy - bp.y0) * WPA;
  const sqPx = g.P * WPA;                          /* game px a plan square */
  const out = Object.create(null);
  for (const s of W.spokes) {
    const rid = ri[s.id];
    if (rid == null) continue;
    /* where the commons ends on this spoke's axis: walk out from the hub */
    let rEdge = null;
    for (let r = W.hub * sqPx * 0.6; r < W.hub * sqPx * 2; r += cellG / 2) {
      const bx = Math.floor((cxG + s.ux * r) / cellG), by = Math.floor((cyG + s.uy * r) / cellG);
      const i = by * bp.w + bx;
      if (bp.reg[i] === rid && bp.cls[i] !== C.ocean) { rEdge = r; break; }
    }
    if (rEdge == null) continue;
    /* ...and where its first stage ends on the axis (the cells wobble about
       it, tierWarp: each place is held to the stage below as well) */
    let rStage = rEdge + rules.bandTo;
    for (let r = rEdge; r < rEdge + rules.bandTo; r += cellG / 2) {
      const bx = Math.floor((cxG + s.ux * r) / cellG), by = Math.floor((cyG + s.uy * r) / cellG);
      if (bp.tier[by * bp.w + bx] > rules.tier) { rStage = r; break; }
    }
    const r0 = rEdge + rules.bandFrom, r1 = Math.min(rEdge + rules.bandTo, rStage);
    const cand = [];
    const R = Math.ceil((r1 + rules.half) / cellG) + 2;
    const bx0 = Math.max(0, Math.floor(cxG / cellG) - R), bx1 = Math.min(bp.w - 1, Math.floor(cxG / cellG) + R);
    const by0 = Math.max(0, Math.floor(cyG / cellG) - R), by1 = Math.min(bp.h - 1, Math.floor(cyG / cellG) + R);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
      const i = by * bp.w + bx;
      if (bp.cls[i] !== C.ground || bp.reg[i] !== rid || bp.tier[i] !== rules.tier) continue;
      const x = gameX(bx), y = gameY(by), dx = x - cxG, dy = y - cyG;
      const along = dx * s.ux + dy * s.uy, side = Math.abs(dx * s.uy - dy * s.ux);
      if (along < r0 || along > r1 || side > rules.half) continue;
      if (dHaz[i] * cellG < rules.clearHazard || dRoad[i] * cellG < rules.clearRoad || dCommons[i] * cellG < rules.clearCommons) continue;
      if (nearObject(x, y, rules.clearObject)) continue;
      /* (axisDist in squares, for the record: the same "near the axis") */
      if (axisDist(W, s, (bp.x0 + (bx + 0.5) * S - g.cx) / g.P, (bp.y0 + (by + 0.5) * S - g.cy) / g.P) * sqPx > rules.half + cellG) continue;
      cand.push({ x, y, along, side });
    }
    if (!cand.length) continue;
    const mid = (r0 + r1) / 2;
    const picked = pick(cand, mid);
    out[s.id] = {
      /* the axis point at the band's middle, and how deep each place is in
         the band (0 its inner end, 1 its outer): the level spread */
      anchor: [Math.round(cxG + s.ux * mid), Math.round(cyG + s.uy * mid)],
      band: [Math.round(r0), Math.round(r1)],
      points: picked.map((c) => [Math.round(c.x), Math.round(c.y), Math.round(((c.along - r0) / (r1 - r0)) * 100) / 100]),
    };
    /* ── v2.3.3012: the stretches past the first ──
       Each is a tier: from where it begins on the axis to where it ends,
       less `clearTier` at either end, and every place on a cell of that very
       tier, `clearTier` from land of any other (the tiers' edges wander,
       tierWarp), `clearPlace` from the camps' plots, and clear of all the
       first stretch is clear of (the commons aside: it is far behind). */
    if (!D) continue;
    const deeper = [];
    for (const t of D.tiers) {
      const rIn = (W.hub + (t - 1) * W.tierLen) * sqPx, rOut = (W.hub + t * W.tierLen) * sqPx;
      const t0 = rIn + D.clearTier, t1 = rOut - D.clearTier;
      const cd = [];
      const Rt = Math.ceil((t1 + rules.half) / cellG) + 2;
      const ax0 = Math.max(0, Math.floor(cxG / cellG) - Rt), ax1 = Math.min(bp.w - 1, Math.floor(cxG / cellG) + Rt);
      const ay0 = Math.max(0, Math.floor(cyG / cellG) - Rt), ay1 = Math.min(bp.h - 1, Math.floor(cyG / cellG) + Rt);
      for (let by = ay0; by <= ay1; by++) for (let bx = ax0; bx <= ax1; bx++) {
        const i = by * bp.w + bx;
        if (bp.cls[i] !== C.ground || bp.reg[i] !== rid || bp.tier[i] !== t) continue;
        const x = gameX(bx), y = gameY(by), dx = x - cxG, dy = y - cyG;
        const along = dx * s.ux + dy * s.uy, side = Math.abs(dx * s.uy - dy * s.ux);
        if (along < t0 || along > t1 || side > rules.half) continue;
        if (dHaz[i] * cellG < rules.clearHazard || dRoad[i] * cellG < rules.clearRoad) continue;
        if (dOther[t][i] * cellG < D.clearTier || nearLot(x, y, D.clearPlace)) continue;
        if (nearObject(x, y, rules.clearObject)) continue;
        if (axisDist(W, s, (bp.x0 + (bx + 0.5) * S - g.cx) / g.P, (bp.y0 + (by + 0.5) * S - g.cy) / g.P) * sqPx > rules.half + cellG) continue;
        cd.push({ x, y, along, side });
      }
      if (!cd.length) continue;
      const pts = pick(cd, (t0 + t1) / 2);
      deeper.push({ tier: t, levels: W.levels(t), band: [Math.round(t0), Math.round(t1)],
        points: pts.map((c) => [Math.round(c.x), Math.round(c.y), Math.round(((c.along - t0) / (t1 - t0)) * 100) / 100]) });
    }
    if (deeper.length) out[s.id].deeper = deeper;
  }
  /* the safe ground, as one radius: the commons and the town are a near-round
     blob round the centre (their edge 2,739-2,886 px out, every direction),
     so the farthest land cell of either, plus a margin, is a circle that holds
     all of it and stops short of every land's places.  The worker keeps
     monsters off it and its people safe on it (wheelzone.js _wheelSafeAt). */
  let safeR = 0;
  for (let i = 0; i < n; i++) {
    if ((bp.reg[i] !== ri.commons && bp.reg[i] !== ri.town) || HAZ.has(bp.cls[i])) continue;
    const x = gameX(i % bp.w) - cxG, y = gameY((i / bp.w) | 0) - cyG;
    safeR = Math.max(safeR, Math.hypot(x, y) + cellG * 0.71);
  }
  return { spawns: out, hash: bp.hash, world: [Math.round(bp.w * cellG), Math.round(bp.h * cellG)], centre: [Math.round(cxG), Math.round(cyG)],
    safeR: Math.ceil(safeR + rules.safeMargin) };
}

export function wheelSpawnsSource(b) {
  /* v2.3.3012: a land's deeper stretches follow its first, one a line */
  const pts = (a) => a.map((p) => `[${p.join(', ')}]`).join(', ');
  const lines = Object.entries(b.spawns).map(([id, s]) =>
    `  ${id}: { anchor: [${s.anchor.join(', ')}], band: [${s.band.join(', ')}],\n    points: [${pts(s.points)}]`
    + (s.deeper && s.deeper.length
      ? `,\n    deeper: [\n${s.deeper.map((d) => `      { tier: ${d.tier}, levels: [${d.levels.join(', ')}], band: [${d.band.join(', ')}],\n        points: [${pts(d.points)}] },`).join('\n')}\n    ] },`
      : ' },'));
  return `/* GENERATED by tools/world/bake-wheel-spawns.mjs from public/tools/world/plan.js
 * (plan ${PLAN.id} v${PLAN.version}, blueprint ${b.hash}) -- do not edit by hand:
 * run the tool again.  tools/world/test-world-core.mjs fails when this is stale.
 *
 * v2.3.2978: where each element zone's monsters stand on the Wheel (zone
 * 'wheel', server/src/wheelzone.js), in game px of the Wheel (${b.world[0]} x ${b.world[1]},
 * centre ${b.centre.join(', ')}).  Per land: the band just past the safe commons
 * on its spoke ([inner, outer] radius from the centre), its middle on the axis,
 * and up to twelve places, farthest-apart first: [x, y, depth], depth 0 at the
 * band's inner end and 1 at its outer -- the server's level spread.
 *
 * v2.3.3012: and 'deeper', the land's next stretches, each a tier: its levels,
 * its band on the axis and its places, in the same shape. */
export const WHEEL_SPAWNS_HASH = '${b.hash}';
export const WHEEL_WORLD = [${b.world.join(', ')}];
/* the safe ground: the commons and the town, every land cell of them within
   this radius of the centre -- no monster targets anyone in it, steps into
   it, or lands a hit in it */
export const WHEEL_CENTRE = [${b.centre.join(', ')}];
export const WHEEL_SAFE_R = ${b.safeR};
export const WHEEL_SPAWNS = {
${lines.join('\n')}
};
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const b = bakeWheelSpawns();
  const src = wheelSpawnsSource(b);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== src) { console.error(`${path.relative(ROOT, OUT)} is stale: run node tools/world/bake-wheel-spawns.mjs`); process.exit(1); }
    console.log('wheelspawns.js matches the plan');
  } else {
    fs.writeFileSync(OUT, src);
    for (const [id, s] of Object.entries(b.spawns)) {
      console.log(`${id.padEnd(8)} band ${s.band.join('-')}  ${s.points.length} places, first at ${s.points[0].slice(0, 2).join(', ')}`);
      for (const d of s.deeper || []) console.log(`${''.padEnd(8)} tier ${d.tier} (Lv ${d.levels.join('-')}) band ${d.band.join('-')}  ${d.points.length} places`);
    }
    console.log(`-> ${path.relative(ROOT, OUT)}`);
  }
}
