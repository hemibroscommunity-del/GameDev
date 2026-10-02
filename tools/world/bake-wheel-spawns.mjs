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
    /* farthest first, from the place nearest the band's middle on the axis */
    const mid = (r0 + r1) / 2;
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
    out[s.id] = {
      /* the axis point at the band's middle, and how deep each place is in
         the band (0 its inner end, 1 its outer): the level spread */
      anchor: [Math.round(cxG + s.ux * mid), Math.round(cyG + s.uy * mid)],
      band: [Math.round(r0), Math.round(r1)],
      points: picked.map((c) => [Math.round(c.x), Math.round(c.y), Math.round(((c.along - r0) / (r1 - r0)) * 100) / 100]),
    };
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
  const lines = Object.entries(b.spawns).map(([id, s]) =>
    `  ${id}: { anchor: [${s.anchor.join(', ')}], band: [${s.band.join(', ')}],\n    points: [${s.points.map((p) => `[${p.join(', ')}]`).join(', ')}] },`);
  return `/* GENERATED by tools/world/bake-wheel-spawns.mjs from public/tools/world/plan.js
 * (plan ${PLAN.id} v${PLAN.version}, blueprint ${b.hash}) -- do not edit by hand:
 * run the tool again.  tools/world/test-world-core.mjs fails when this is stale.
 *
 * v2.3.2978: where each element zone's monsters stand on the Wheel (zone
 * 'wheel', server/src/wheelzone.js), in game px of the Wheel (${b.world[0]} x ${b.world[1]},
 * centre ${b.centre.join(', ')}).  Per land: the band just past the safe commons
 * on its spoke ([inner, outer] radius from the centre), its middle on the axis,
 * and up to twelve places, farthest-apart first: [x, y, depth], depth 0 at the
 * band's inner end and 1 at its outer -- the server's level spread. */
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
    for (const [id, s] of Object.entries(b.spawns)) console.log(`${id.padEnd(8)} band ${s.band.join('-')}  ${s.points.length} places, first at ${s.points[0].slice(0, 2).join(', ')}`);
    console.log(`-> ${path.relative(ROOT, OUT)}`);
  }
}
