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
 * v2.3.3013: AND THE STRETCHES PAST IT.  The owner said yes to "monsters past
 * level 5": each land's next three stretches (tiers 2-4, levels 6-10, 11-15
 * and 16-20 -- the rest of its first stage, up to the first pass and the
 * camp at level 20) get places of their own, worked out the same way along
 * that stretch of the axis (SPAWN_RULES.deep).  The first stretch's places are
 * exactly what they were: the deeper ones are written after them, as `deeper`.
 *
 * DRIFT: the worker only redeploys when server/** changes, so a plan change
 * that moved a land would leave monsters standing where it used to be.
 * tools/world/test-world-core.mjs runs this with --check: the plan and the
 * server's copy must agree, in the same PR.  (v2.3.3401: and the trees' and
 * rocks' picture sizes, which the resources' places are kept clear by.)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAN, PLAN5, WHEEL_LONG } from '../../public/tools/world/plan.js';
import { buildBlueprint, C } from '../../public/tools/world/core/layout.js';
import { wheelInfo, axisDist } from '../../public/tools/world/core/wheel.js';
import { gridInfo } from '../../public/tools/world/core/grid.js';
import { placeObjects, footprintOf, MOUTH_CLEAR } from '../../public/tools/world/core/placing.js';
import { objectCatalog } from '../../public/tools/objects/catalog.js';
import { materialMap, walkBits, composeGround } from '../../public/tools/world/core/ground.js';   /* v2.3.3012: the game's own walk grid; v2.3.3401: and its drawn shore */
import { PIXEL } from '../../public/tools/style/bible.js';
import { SWIM_PROBES, SWIM_IN } from '../../src/game/wheelSwim.js';
/* v2.3.3401: each tier's tree and rock as the game draws them (bakeWheelNodes `hidden`) */
import { treeGeom, treeChopOffset } from '../../src/game/tierTrees.js';
import { oreGeom } from '../../src/game/tierOre.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/* v2.3.3315: the live Wheel's (WHEEL_LONG times longer, plan.js PLAN5), and the
   short one's -- the Wheel as it was, which the worker plays only under its
   kill switch `wheel5x: false` (wheelzone.js) */
const OUT = path.join(ROOT, 'server/src/wheelspawns.js');
const OUT1 = path.join(ROOT, 'server/src/wheelspawns1.js');

/* The rules, in game px. */
/* v2.3.3016: the way back out of a dungeon, tried in turn round its mouth
   (game px): south first -- you come out walking down the screen -- then the
   sides, then north */
export const DOOR_BACK = [[0, 150], [0, 210], [150, 60], [-150, 60], [0, -150]];

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
  /* v2.3.3013: the stretches past the first, each a tier of its own (one zone
     of walking, five levels).  The rest of the rules above hold there too
     (hazards, roads, objects, `apart`, `half`, `keep`); these are theirs. */
  deep: Object.freeze({
    /* levels 6-10, 11-15, 16-20: the first stage, up to the pass and camp at 20;
       v2.3.3093: and 21-25 ... 36-40, the second stage, out to the camp at 40
       (the owner: "build the world past level 20 (levels 21-40 in each land
       with their own monsters and resources)") */
    tiers: Object.freeze([2, 3, 4, 5, 6, 7, 8]),
    clearTier: 120,    /* from any land of another tier, the tier's wandering edge (tierWarp) included: a monster
                          stands, and wanders 180 px at most, among the levels its stretch says on the top bar */
    clearPlace: 360,   /* from a camp's plot (or any plot out in the country): no monster at a waystation's door */
  }),
});

/* ═══ v2.3.3315: THE RULES FOR THE WHEEL FIVE TIMES LONGER ═══
   The owner: "Maybe 5x larger map is needed" ("Rebuild for 5x").  Every land's
   tiers are WHEEL_LONG times longer, so each holds that many times the places
   (the server stands that many times the monsters a tier: wheelzone.js), the
   first stretch's band reaches as far into its longer tier, and each band of a
   land grows that many times the resources; the commons are the size they
   were and keep theirs. */
export function spawnRulesFor(long) {
  if (!(long > 1)) return SPAWN_RULES;
  return Object.freeze({ ...SPAWN_RULES, bandTo: SPAWN_RULES.bandFrom + (SPAWN_RULES.bandTo - SPAWN_RULES.bandFrom) * long,
    keep: SPAWN_RULES.keep * long });
}
export function nodeRulesFor(long) {
  if (!(long > 1)) return NODE_RULES;
  return Object.freeze({ ...NODE_RULES, bands: Object.freeze(NODE_RULES.bands.map((b) => (b.id === 'commons' ? b
    : Object.freeze({ ...b, ore: b.ore * long, tree: b.tree * long, fish: b.fish * long })))) });
}

export function bakeWheelSpawns(plan = PLAN, rules = SPAWN_RULES, nodeRules = NODE_RULES) {
  const bp = buildBlueprint(plan);
  const W = wheelInfo(plan), g = gridInfo(plan);
  const WPA = plan.worldPxPerArtPx, S = bp.scale, cellG = S * WPA;
  const ri = Object.create(null);
  bp.regionIds.forEach((k, i) => { ri[k] = i; });
  const n = bp.w * bp.h;
  /* city-block distances (in cells) from hazards, from roads, from the commons.
     v2.3.3315: one byte a cell, held at DIST_CAP, by two sweeps -- the same
     distances the queue it replaces found below the cap (city-block distance
     is what a forward and a backward sweep give exactly), and every rule here
     asks only whether one is under a few hundred px.  Four bytes a cell and a
     queue as long were ~2.4 GB at the Wheel five times longer. */
  const DIST_CAP = 255;
  const dist = (seed) => {
    const W2 = bp.w, H2 = bp.h, d = new Uint8Array(n).fill(DIST_CAP);
    for (let i = 0; i < n; i++) if (seed(i)) d[i] = 0;
    for (let y = 0; y < H2; y++) {
      const r = y * W2;
      for (let x = 0; x < W2; x++) {
        const i = r + x;
        let v = d[i];
        if (!v) continue;
        if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1;
        if (y > 0 && d[i - W2] + 1 < v) v = d[i - W2] + 1;
        d[i] = v;
      }
    }
    for (let y = H2 - 1; y >= 0; y--) {
      const r = y * W2;
      for (let x = W2 - 1; x >= 0; x--) {
        const i = r + x;
        let v = d[i];
        if (!v) continue;
        if (x < W2 - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1;
        if (y < H2 - 1 && d[i + W2] + 1 < v) v = d[i + W2] + 1;
        d[i] = v;
      }
    }
    return d;
  };
  const HAZ = new Set([C.ocean, C.river, C.water, C.cliff, C.lava]);
  const ROAD = new Set([C.path, C.rail, C.bridge, C.street]);
  const dHaz = dist((i) => HAZ.has(bp.cls[i]));
  const dRoad = dist((i) => ROAD.has(bp.cls[i]));
  const dCommons = dist((i) => bp.reg[i] === ri.commons || bp.reg[i] === ri.town);
  /* v2.3.3013: for the deeper stretches -- from the plots out in the country
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
  /* v2.3.3012: and each one's PICTURE, its foot at the bottom middle -- a
     node's place must not be under a tall thing standing in front of it (the
     first bake put an iron vein of the Wind Dunes behind a hoodoo: clear of
     its footprint, hidden by its picture) */
  const pics = new Map();
  const into = (map, b) => {
    for (let j = Math.floor(b.y0 / HB); j <= Math.floor(b.y1 / HB); j++) for (let i = Math.floor(b.x0 / HB); i <= Math.floor(b.x1 / HB); i++) {
      const key = j * hcols + i;
      let a = map.get(key);
      if (!a) map.set(key, (a = []));
      a.push(b);
    }
  };
  for (let k = 0; k < placed.n; k++) {
    const id = placed.kinds[placed.kind[k]], e = catById[id];
    if (!e) continue;
    const h = e.fit === 'w' ? e.size / (e.ar || 1) : e.size, w = e.fit === 'w' ? e.size : e.size * (e.ar || 1);
    for (const b of footprintOf(id, e.kind, placed.x[k], placed.y[k], w, h)) into(boxes, b);
    into(pics, { x0: placed.x[k] - w / 2, x1: placed.x[k] + w / 2, y0: placed.y[k] - h, y1: placed.y[k] });
  }
  /* whether a picture standing in FRONT of footY (its foot further south, so
     drawn over it) reaches into the box x0..x1, y0..y1 -- every picture is in
     each hash cell it covers, so the box's own cells find all that reach it */
  const coveredAt = (x0, x1, y0, y1, footY) => {
    for (let j = Math.floor(y0 / HB); j <= Math.floor(y1 / HB); j++) for (let i = Math.floor(x0 / HB); i <= Math.floor(x1 / HB); i++) {
      for (const b of pics.get(j * hcols + i) || []) {
        if (b.y1 > footY && b.x0 < x1 && b.x1 > x0 && b.y0 < y1 && b.y1 > y0) return true;
      }
    }
    return false;
  };
  const nearObject = (x, y, r) => {
    for (let j = Math.floor((y - r) / HB); j <= Math.floor((y + r) / HB); j++) for (let i = Math.floor((x - r) / HB); i <= Math.floor((x + r) / HB); i++) {
      for (const b of boxes.get(j * hcols + i) || []) {
        if (Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)) < r) return true;
      }
    }
    return false;
  };
  /* farthest first, from the place nearest the band's middle on the axis
     (v2.3.3013: one copy for every stretch -- the first's places came out of
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
  /* v2.3.3315: every open-ground cell of a land, by land and tier, in the
     map's own order -- what each stretch's scan below walks, where it walked
     a square round the centre as wide as its outer end (the same cells, in
     the same order: any cell near enough the axis and the centre is in it).
     One pass over the map, where the Wheel five times longer made those
     squares ~850 M cells. */
  const groundOf = new Map();
  for (let i = 0; i < n; i++) {
    if (bp.cls[i] !== C.ground) continue;
    const key = bp.reg[i] * 64 + bp.tier[i];
    let a = groundOf.get(key);
    if (!a) groundOf.set(key, (a = []));
    a.push(i);
  }
  const groundCells = (rid, t) => groundOf.get(rid * 64 + t) || [];
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
    for (const i of groundCells(rid, rules.tier)) {
      const bx = i % bp.w, by = (i / bp.w) | 0;
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
    /* ── v2.3.3013: the stretches past the first ──
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
      for (const i of groundCells(rid, t)) {
        const bx = i % bp.w, by = (i / bp.w) | 0;
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
  safeR = Math.ceil(safeR + rules.safeMargin);
  /* v2.3.3012: the walk grid the game's ground worker hands the client
     (ground-worker.js init): a cell is a wall where its water, blurred two
     cells, is half or more -- so a land cell in a narrow spit or a cove's
     corner is a wall (and, since v2.3.3003's swimming, water to swim in) though
     the plan calls it ground.  A harvest seat must be ground the game agrees
     is ground: the first survey of the seats as drawn found one such, the
     angler sat in a pond. */
  const mm = materialMap(plan, bp);
  const walk = walkBits(bp, mm);
  const blocked = (i) => !!(walk[i >> 3] & (1 << (i & 7)));
  /* v2.3.3401: and the water as the game draws it, for the fishing seats */
  const drawnWater = drawnWaterOf(plan, bp, mm);
  /* v2.3.3540: the dungeons' mouths -- every landmark with a tier, at its
     middle -- as the boxes no picture may reach into (placing.js
     MOUTH_CLEAR): no resource's either (bakeWheelNodes) */
  const mouths = [];
  for (const p of bp.pois || []) {
    const lm = p.kind === 'landmark' && plan.regions[p.region] && plan.regions[p.region].landmark;
    if (!lm || !(lm.tier > 0)) continue;
    const mx = (p.x - bp.x0) * WPA, my = (p.y - bp.y0) * WPA;
    mouths.push({ x0: mx + MOUTH_CLEAR.left, x1: mx + MOUTH_CLEAR.right, y0: my + MOUTH_CLEAR.top, y1: my + MOUTH_CLEAR.bottom });
  }
  const nodes = bakeWheelNodes({ bp, W, ri, cellG, cxG, cyG, dHaz, dRoad, dist, nearObject, coveredAt, gameX, gameY, spawns: out, safeR, blocked, groundCells, drawnWater, mouths }, nodeRules);
  /* ═══ v2.3.3016: THE DUNGEONS' MOUTHS ═══
     Each land's landmark (layout.js pass 8: the Great Cave, the Foundry
     Dome, the Buried City) is the way into its dungeon (server/src/
     wheeldungeon.js): where it stands, in the game px the client's own map
     of the Wheel names it at (wheelmap.js `game`), its tier's levels, and
     the way back out -- the first of a few steps round the mouth, south
     first, that is open ground by the game's walk grid and clear of every
     placed object.  A landmark placed by `at` (the commons' Prospector's
     Circle) has no tier and is no dungeon. */
  const doors = Object.create(null);
  for (const p of bp.pois || []) {
    if (p.kind !== 'landmark' || !p.region) continue;
    const lm = plan.regions[p.region] && plan.regions[p.region].landmark;
    if (!lm || !(lm.tier > 0)) continue;
    const x = Math.round((p.x - bp.x0) * WPA), y = Math.round((p.y - bp.y0) * WPA);
    let back = null;
    for (const [dx, dy] of DOOR_BACK) {
      const bx = x + dx, by = y + dy;
      const ci = Math.floor(by / cellG) * bp.w + Math.floor(bx / cellG);
      if (ci < 0 || ci >= n || blocked(ci) || HAZ.has(bp.cls[ci]) || nearObject(bx, by, 40)) continue;
      back = [bx, by];
      break;
    }
    doors[p.region] = { name: lm.name, tier: lm.tier, levels: W.levels(lm.tier), at: [x, y], back: back || [x, y + DOOR_BACK[0][1]] };
  }
  return { spawns: out, nodes, doors, hash: bp.hash, world: [Math.round(bp.w * cellG), Math.round(bp.h * cellG)], centre: [Math.round(cxG), Math.round(cyG)],
    safeR };
}

/* ═══ v2.3.3012: WHERE THE WHEEL'S RESOURCES GROW ═══
 *
 * Owner, 2026-10-03: "Add harvestable resources back to the wheel" -- and of
 * their tiers: "the higher lvl resources will be progressively more distant
 * ... let's plan on 'black steel' in like level 10+ areas and have its own ore
 * to mine.  Iron can be in lvl 1 monster areas.  Copper can be in the safe
 * areas around town.  Same principle for fishing and wood cutting too."
 *
 * So three bands, by the plan's own level map (layout.js `tier`: 0 in the
 * commons, 1 for levels 1-5, 2 for 6-10, ...), each with the gathering tier
 * whose items the worker already names (gathering.js _harvestNameForTier):
 *
 *   commons  round town          tier 1   copper ore, pine, minnow
 *   near     levels 1-10         tier 6   iron ore, softwood, clownfish
 *   far      levels 11-20        tier 11  black steel ore, hardwood, trout
 *   deep     levels 21-30        tier 16  titanium ore, cedar, salmon      (v2.3.3094)
 *   deeper   levels 31-40        tier 21  obsidian ore, maple, pike        (v2.3.3094)
 *
 * "far" stopped at level 20, where the first pass is; since v2.3.3094 the
 * second stage grows its own past it, out to level 40.
 *
 * LAND NODES (ore veins, trees) stand on open ground (`C.ground`) of their
 * band, clear of water, roads, the town, every placed object and every
 * monster place, spread apart.  The commons' fill in nearest town first, so
 * the first copper and pine are a short walk out of the gates; a land's are
 * spread across its band farthest-first, like the monsters' places.
 *
 * FISHING SPOTS are in real water now -- the commons' four ponds and the
 * Sweetwater River (fresh, minnows), a land's coast (clownfish) and its
 * rivers and pools past level 10 (trout; the coast where it has none).
 * Fishing SEATS you at the spot + FISH_SEAT_DX/DY (src/data/constants.js:
 * up and right, so the rod's line falls on the spot) with the body's 52 px
 * drop to the boots: so a spot is only used where that seat is dry, clear
 * ground of the same band, with water west of the spot (its fish swim there:
 * SPOT_SIDE, below).  The same for the miner's seat (MINE_SEAT_DX/DY).
 *
 * Positions never depend on which pictures exist, only on the plan and the
 * placer -- like everything else this tool bakes.  v2.3.3401: except the
 * resources' own pictures' SIZES: each tier's tree and rock is kept clear as
 * the game draws it (src/data/treeArt.js, oreArt.js, made by
 * tools/world/add-tree-art.mjs and add-ore-art.mjs), so a new cut of them is
 * a re-bake -- test-world-core's --check says so, and the worker deploys. */
export const NODE_RULES = Object.freeze({
  bands: Object.freeze([
    Object.freeze({ id: 'commons', tiers: Object.freeze([0]), tierLvl: 1, ore: 6, tree: 6, fish: 10, order: 'near' }),
    Object.freeze({ id: 'near', tiers: Object.freeze([1, 2]), tierLvl: 6, ore: 3, tree: 3, fish: 2, order: 'spread' }),
    Object.freeze({ id: 'far', tiers: Object.freeze([3, 4]), tierLvl: 11, ore: 3, tree: 3, fish: 2, order: 'spread' }),
    /* v2.3.3094: the second stage (the owner: "levels 21-40 in each land with
       their own monsters and resources"): titanium, cedar and salmon at
       levels 21-30, obsidian, maple and pike at 31-40 (gathering.js
       _harvestNameForTier) -- each a tier of its own as the first stage's
       are, and the same three, three and two a land */
    Object.freeze({ id: 'deep', tiers: Object.freeze([5, 6]), tierLvl: 16, ore: 3, tree: 3, fish: 2, order: 'spread' }),
    Object.freeze({ id: 'deeper', tiers: Object.freeze([7, 8]), tierLvl: 21, ore: 3, tree: 3, fish: 2, order: 'spread' }),
  ]),
  apart: 360,           /* between two of a band's ore veins and trees */
  fishApart: 240,       /* between two fishing spots */
  clearObject: 40,      /* a vein or tree from anything placing.js put down */
  clearSeat: 24,        /* a harvest seat's boots from the same */
  clearRoad: 40,        /* from a road, the railway, a bridge or a street */
  clearWater: 72,       /* a vein or tree from water, a cliff or lava */
  clearMonster: 300,    /* anything from a monster's place */
  clearTown: 240,       /* a commons node from the town's own ground */
  clearNode: 160,       /* a vein or tree from a fishing spot, any area's */
  fishSeat: Object.freeze([52, 9]),   /* FISH_SEAT_DX, FISH_SEAT_DY + the 52 px drop to the boots */
  mineSeat: Object.freeze([-7, -34]), /* MINE_SEAT_DX, MINE_SEAT_DY + 52 */
  chopSeat: 6,          /* v2.3.3401: the woodcutter's boots, this far south of the node (effectsRenderer chopStandInSpot) */
});

/* ═══ v2.3.3401: THE WATER AS THE GAME DRAWS IT ═══
   A fishing seat is placed by the plan's cells, but the shore is not drawn
   on the cells' lines: each pixel of the ground is the swatch whose blurred
   field is strongest there (ground.js composeGround, the water's edge kept
   crisp), so a cell of land can come out as water.  A nub of land one cell
   wide with the sea on three sides does, and a seat on it put the angler's
   boots in the sea: mp-wheelseats found wn-ember-119 with all five of a
   swimmer's looks wet, after this version's re-bake moved 111 spots.  Asked
   of every seat, the live table had 7 with the boots on drawn water BEFORE
   that re-bake (wn-thunder-37, wn-sky-111...), 8 after it.  The shore is
   worked out from the plan alone -- the pictures only colour it -- so the
   bake asks exactly what the game's ground worker draws: the material at
   the very pixel a piece's `under` reads (ground-worker.js underOf: one
   every UNDER art px of a CHUNK-art-px piece, at its middle), composed with
   no pictures, a small rectangle round the points (composeGround's pieces
   meet with no seam, so any rectangle gives the same pixel).  Checked
   against a phone's survey of 111 seats: the same answer at every look.
   `pts` [[x, y], ...] in game px -> [wet, ...]. */
export const PIECE_ART = 128, UNDER_ART = 2;   /* ground-worker.js CHUNK, UNDER (test-world-core holds them to it) */
export function drawnWaterOf(plan, bp, mm) {
  const WPA = plan.worldPxPerArtPx, K = Math.round(WPA / PIXEL.gamePxPerArtPx);
  const cs = PIECE_ART * WPA, n = PIECE_ART / UNDER_ART, half = (UNDER_ART * K) >> 1;
  /* the ground px (art px x K, from the plan's corner) a game point's sample reads */
  const sampleOf = (x, y) => {
    const i = Math.floor(x / cs), j = Math.floor(y / cs);
    const u = Math.min(n - 1, Math.max(0, Math.floor(((x - i * cs) / cs) * n)));
    const v = Math.min(n - 1, Math.max(0, Math.floor(((y - j * cs) / cs) * n)));
    return [(bp.x0 + i * PIECE_ART) * K + half + u * UNDER_ART * K, (bp.y0 + j * PIECE_ART) * K + half + v * UNDER_ART * K];
  };
  return (pts) => {
    const f = pts.map(([x, y]) => sampleOf(x, y));
    let ax0 = Infinity, ay0 = Infinity, ax1 = -Infinity, ay1 = -Infinity;
    for (const [fx, fy] of f) {
      ax0 = Math.min(ax0, Math.floor(fx / K)); ay0 = Math.min(ay0, Math.floor(fy / K));
      ax1 = Math.max(ax1, Math.floor(fx / K)); ay1 = Math.max(ay1, Math.floor(fy / K));
    }
    const rect = { x: ax0 - 1, y: ay0 - 1, w: ax1 - ax0 + 3, h: ay1 - ay0 + 3 };
    const out = composeGround(plan, bp, mm, rect, {}, { scale: K });
    return f.map(([fx, fy]) => out.mat[(fy - rect.y * K) * out.w + (fx - rect.x * K)] === mm.water);
  };
}

export function bakeWheelNodes(ctx, rules = NODE_RULES) {
  const { bp, W, ri, cellG, cxG, cyG, dHaz, dRoad, dist, nearObject, coveredAt, gameX, gameY, spawns, safeR } = ctx;
  const blocked = ctx.blocked || (() => false);
  /* nothing standing in front of the node's own picture, or of the bro working
     it (a body's box, 44 x 64, over his boots).
     ═══ v2.3.3401: THE NODE'S PICTURE AS IT IS DRAWN ═══
     The owner, of the trees' and rocks' new pictures: "Yes fix #3 resource
     placement".  Since v2.3.3345 each tier's tree and rock is a picture of
     its own at its own size (src/game/tierTrees.js treeGeom, tierOre.js
     oreGeom: from a copper rock 58 px across to a maple 428 across and 424
     tall), but this kept clear the box of the ONE old pine and the ONE old
     vein (62 and 52 px a half, 196 and 118 tall, 1.13x at tier 21): a tall
     thing could stand in front of a maple's crown, which is three times as
     wide.  So it is each picture's own box, from its top to its foot (a
     tree's foot is TREE_FOOT_DY north of the node; a thing whose foot is
     south of it is drawn over it), at the band's tier -- and, as the miner's
     for a rock, the WOODCUTTER'S spot either side of the trunk (effectsRenderer
     chopStandInSpot, the side you came from), which the old pine's box
     happened to cover and a slim pine's picture does not.
     `loose`: only its middle half across and its lower half -- a tree's
     trunk and what stands round it -- for the few a thick wood has no room
     for whole (the band loop, "Whole where there is room"). */
  const hidden = (x, y, kind, lvl = 1, loose = false) => {
    if (!coveredAt) return false;
    if (kind === 'f') {
      const bx = x + rules.fishSeat[0], by = y + rules.fishSeat[1];
      return coveredAt(bx - 22, bx + 22, by - 64, by, by);
    }
    const node = { x, y, gatherLvl: lvl };
    const g = kind === 'o' ? oreGeom(node) : treeGeom(node);
    const qw = loose ? (g.right - g.left) / 4 : 0, top = loose ? (g.top + g.footY) / 2 : g.top;
    if (coveredAt(loose ? g.footX - qw : g.left, loose ? g.footX + qw : g.right, top, g.footY, g.footY)) return true;
    if (kind === 'o') {
      const bx = x + rules.mineSeat[0], by = y + rules.mineSeat[1];
      return coveredAt(bx - 22, bx + 22, by - 64, by, by);
    }
    const off = treeChopOffset(node), by = y + rules.chopSeat;
    return coveredAt(x - off - 22, x - off + 22, by - 64, by, by) || coveredAt(x + off - 22, x + off + 22, by - 64, by, by);
  };
  /* v2.3.3401: a fishing seat as mp-wheelseats asks it of the ground as
     drawn (drawnWaterOf, above): the spot and its school's middle in the
     water, the angler's boots dry and fewer than SWIM_IN of a swimmer's
     five looks round them wet -- so a seated angler stays out of the water */
  const drawnWater = ctx.drawnWater || null;
  const seatDrawnDry = (x, y) => {
    if (!drawnWater) return true;
    const sx = x + rules.fishSeat[0], sy = y + rules.fishSeat[1], L = SWIM_PROBES.length;
    const w = drawnWater([...SWIM_PROBES.map(([dx, dy]) => [sx + dx, sy + dy]), [x, y], [x - 30, y]]);
    let wet = 0;
    for (let k = 0; k < L; k++) if (w[k]) wet++;
    return !w[0] && wet < SWIM_IN && w[L] && w[L + 1];
  };
  const n = bp.w * bp.h;
  const WATER = new Set([C.water, C.ocean, C.river]);
  const FRESH = new Set([C.water, C.river]);
  const DRY = new Set([C.ground, C.path, C.anchor, C.street, C.boardwalk, C.plaza, C.rail, C.bridge]);
  const dTown = dist((i) => bp.reg[i] === ri.town);
  const cellAt = (x, y) => {
    const bx = Math.floor(x / cellG), by = Math.floor(y / cellG);
    return bx < 0 || by < 0 || bx >= bp.w || by >= bp.h ? -1 : by * bp.w + bx;
  };
  /* i and its neighbours at the given offsets, all passing `test` */
  const around = (i, offs, test) => {
    const x = i % bp.w, y = (i / bp.w) | 0;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= bp.w || yy >= bp.h || !test(yy * bp.w + xx)) return false;
    }
    return true;
  };
  const ALL = [[0, 0], [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  /* A fishing spot's seat is two cells EAST of it (52 px), so the shore runs
     between them: the spot needs water on its own side and the seat dry
     ground on its -- asking for water or dry ground all round each would ask
     the cells between them to be both.  The baked rod's line drops down-LEFT
     of the angler, ending 52 px west of him and 9 px above his boots, so the
     water is always WEST of where he stands.
     v2.3.3012 (owner: "Make all 8 have fishing spots"): the spot's side was a
     5 x 5 block of water (three cells west of it to one east, two up and
     down) with a dry 2 x 3 seat beside it: a perfectly straight north-south
     shore, five cells long.  A land whose coasts wander or run east-west
     never has one -- the Wind Dunes, the Storm Peaks and the Verdant Wilds
     had no spot at all.  So the water is a 4 x 3 block now (x-84..x+12,
     y-36..y+36) plus the one cell the line crosses (east of the spot, its
     own row), and the seat is the boots' cell and the one east of it: any
     shore with three rows of water to the west of a dry cell will do, the
     angler's body standing over the water behind him as a 3/4 view draws
     it.  The fish swim inside the block (src/rendering/wheelNodes.js
     SWIM_*).
     v2.3.3012, after v2.3.3003's swimming: the seat's boots stand 3 px above
     the cell BELOW the seat (9 px under the spot's middle, 21 into a 24 px
     cell), so that cell is dry ground too -- a survey of the 33 seats in the
     game, the ground as drawn (wheelSwim's five looks round the boots),
     found three with the boots themselves on drawn water.  And every seat
     cell is ground by the game's own walk grid (`blocked`, above): the
     fourth stood on a land cell the grid counts as water, ringed by it.  It
     cost the Electric Foundry its levels 1-10 spot, whose only seat was one
     of the three; the next survey, of the 32 left, found every pair of
     boots dry. */
  const SPOT_SIDE = [[1, 0]];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 0; dx++) SPOT_SIDE.push([dx, dy]);
  const SEAT_SIDE = [[0, 0], [1, 0], [0, 1]];
  /* v2.3.3315: the cells each band's scans walk, in the map's own order --
     its open ground (ctx.groundCells, by land and tier), and the water cells
     whose angler's seat is dry ground of it (seatCells) -- where every band
     walked the whole map, twice for its fishing spots: 45 passes over the
     55 M cells of the Wheel five times longer.  The same cells pass the same
     tests in the same order (a seat off the band never passed dryClear). */
  const { groundCells } = ctx;
  const seatOf = new Map();
  for (let i = 0; i < n; i++) {
    if (!WATER.has(bp.cls[i])) continue;
    const j = cellAt(gameX(i % bp.w) + rules.fishSeat[0], gameY((i / bp.w) | 0) + rules.fishSeat[1]);
    if (j < 0 || !DRY.has(bp.cls[j])) continue;
    const key = bp.reg[j] * 64 + bp.tier[j];
    let a = seatOf.get(key);
    if (!a) seatOf.set(key, (a = []));
    a.push(i);
  }
  const seatCells = (rid, t) => seatOf.get(rid * 64 + t) || [];
  /* a band's cells from `of` (by land and tier), merged back into map order */
  const bandCells = (of, band, rid) => {
    const lists = band.id === 'commons' ? [of(ri.commons, 0)] : band.tiers.map((t) => of(rid, t));
    if (lists.length === 1) return lists[0];
    const all = [].concat(...lists);
    return all.sort((a, b) => a - b);
  };
  /* v2.3.3013: every monster place, the next stretches' (levels 6-20,
     `deeper`) as well as the first's -- the resources were placed when only
     the first stretch had monsters, and a black steel vein at levels 11-20
     must keep its 300 px from the snowman standing there now */
  const monsterPts = [];
  for (const s of Object.values(spawns)) {
    for (const p of s.points) monsterPts.push(p);
    for (const d of s.deeper || []) for (const p of d.points) monsterPts.push(p);
  }
  /* v2.3.3315: found in squares of clearMonster px (the same answer as
     asking every place: none nearer than that is outside the 3 x 3 round it) */
  const MQ = rules.clearMonster, mq = new Map();
  for (const p of monsterPts) {
    const k = Math.floor(p[1] / MQ) * 65536 + Math.floor(p[0] / MQ);
    let a = mq.get(k);
    if (!a) mq.set(k, (a = []));
    a.push(p);
  }
  const clearOfMonsters = (x, y) => {
    const qx = Math.floor(x / MQ), qy = Math.floor(y / MQ);
    for (let j = qy - 1; j <= qy + 1; j++) for (let i = qx - 1; i <= qx + 1; i++) {
      const a = mq.get(j * 65536 + i);
      if (a) for (const p of a) if (Math.hypot(p[0] - x, p[1] - y) < rules.clearMonster) return false;
    }
    return true;
  };
  /* every node placed so far, whatever its area or band: two lands' bands meet
     at a border, and each picks its own -- the first bake put a Mist Marsh and
     a Tidal Coast fishing spot 34 px apart on the river between them.  So a
     node keeps the same distance from ANY node of its kind (veins and trees
     `apart`, spots `fishApart`) and `clearNode` from the other kind. */
  /* v2.3.3315: in squares of the widest of the three distances, as above */
  const NQ = Math.max(rules.apart, rules.fishApart, rules.clearNode), nq = new Map();
  const placed = {
    push(p) {
      const k = Math.floor(p.y / NQ) * 65536 + Math.floor(p.x / NQ);
      let a = nq.get(k);
      if (!a) nq.set(k, (a = []));
      a.push(p);
    },
  };
  const clearOfNodes = (x, y, fish) => {
    const qx = Math.floor(x / NQ), qy = Math.floor(y / NQ);
    for (let j = qy - 1; j <= qy + 1; j++) for (let i = qx - 1; i <= qx + 1; i++) {
      const a = nq.get(j * 65536 + i);
      if (a) for (const p of a) if (Math.hypot(p.x - x, p.y - y) < (p.fish === fish ? (fish ? rules.fishApart : rules.apart) : rules.clearNode)) return false;
    }
    return true;
  };
  /* ═══ v2.3.3401: NOR ONE RESOURCE IN FRONT OF ANOTHER ═══
     The new trees are as tall as the scenery: a willow 175 px south of a
     fishing spot stood over its angler, and the live table had 15 such (a
     tree or rock whose picture, its foot further south, covers another
     node's picture or the one working it).  So every node placed is
     remembered as what it draws (`pic`: a tree's or rock's picture; a
     fishing spot has none) and what must stay in view (`keep`: that picture
     and its worker -- the miner, the woodcutter either side, the angler),
     and a new one may neither stand in front of a `keep` nor have a `pic` in
     front of its own.  Kinds are known as each is picked (the band loop). */
  const nodeDrawn = [];
  /* v2.3.3540: a dungeon's mouth stays in view, under every picture
     (placing.js MOUTH_CLEAR): kept as nothing drawn and a box no resource's
     picture may cover, whatever its foot */
  for (const m of ctx.mouths || []) nodeDrawn.push({ pic: null, keep: [{ x0: m.x0, x1: m.x1, y0: m.y0, y1: m.y1, foot: -Infinity }] });
  const nodeBoxes = (kind, x, y, lvl) => {
    const body = (bx, by) => ({ x0: bx - 22, x1: bx + 22, y0: by - 64, y1: by, foot: by });
    if (kind === 'f') return { pic: null, keep: [body(x + rules.fishSeat[0], y + rules.fishSeat[1])] };
    const node = { x, y, gatherLvl: lvl };
    const g = kind === 'o' ? oreGeom(node) : treeGeom(node);
    const pic = { x0: g.left, x1: g.right, y0: g.top, y1: g.footY, foot: g.footY };
    if (kind === 'o') return { pic, keep: [pic, body(x + rules.mineSeat[0], y + rules.mineSeat[1])] };
    const off = treeChopOffset(node), by = y + rules.chopSeat;
    return { pic, keep: [pic, body(x - off, by), body(x + off, by)] };
  };
  const over = (f, b) => f.foot > b.foot && f.x0 < b.x1 && f.x1 > b.x0 && f.y0 < b.y1 && f.y1 > b.y0;
  const nodeClash = (kind, x, y, lvl) => {
    const b = nodeBoxes(kind, x, y, lvl);
    for (const o of nodeDrawn) {
      if (b.pic) for (const k of o.keep) if (over(b.pic, k)) return true;
      if (o.pic) for (const k of b.keep) if (over(o.pic, k)) return true;
    }
    return false;
  };
  /* whether cell i is ground of this band (and land).  A land's must also be
     off the safe ground: WHEEL_SAFE_R is a circle round the commons' ragged
     edge, so in places it reaches a few hundred px into a land's levels 1-5,
     and iron grows where the monsters can reach you ("Iron can be in lvl 1
     monster areas") -- copper is the safe ground's own. */
  const inBand = (i, band, rid) => band.id === 'commons'
    ? bp.reg[i] === ri.commons
    : bp.reg[i] === rid && band.tiers.includes(bp.tier[i])
      && !(safeR > 0 && Math.hypot(gameX(i % bp.w) - cxG, gameY((i / bp.w) | 0) - cyG) < safeR + cellG);
  const dryClear = (x, y, band, rid, side = ALL) => {
    const j = cellAt(x, y);
    return j >= 0 && DRY.has(bp.cls[j]) && inBand(j, band, rid) && around(j, side, (k) => !WATER.has(bp.cls[k]) && !blocked(k))
      && !nearObject(x, y, rules.clearSeat);
  };
  /* nearest the centre first (the commons), or farthest-first from the
     candidate nearest the band's middle (a land) -- ties by y, then x, so the
     bake is the same on every run */
  const pick = (cand, count, apart, order) => {
    if (!cand.length || count <= 0) return [];
    const out = [];
    if (order === 'near') {
      cand.sort((a, b) => a.r - b.r || a.y - b.y || a.x - b.x);
      for (const c of cand) {
        if (out.length >= count) break;
        if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) >= apart)) out.push(c);
      }
      return out;
    }
    const mid = cand.reduce((s, c) => s + c.r, 0) / cand.length;
    cand.sort((a, b) => Math.abs(a.r - mid) - Math.abs(b.r - mid) || a.y - b.y || a.x - b.x);
    out.push(cand[0]);
    const dMin = cand.map((c) => Math.hypot(c.x - cand[0].x, c.y - cand[0].y));
    while (out.length < count) {
      let best = -1, bestD = apart;
      for (let k = 0; k < cand.length; k++) if (dMin[k] >= bestD) { bestD = dMin[k]; best = k; }
      if (best < 0) break;
      const c = cand[best];
      out.push(c);
      for (let k = 0; k < cand.length; k++) dMin[k] = Math.min(dMin[k], Math.hypot(cand[k].x - c.x, cand[k].y - c.y));
    }
    return out;
  };
  /* v2.3.3401: `pick`, with each candidate asked whether it `fits` (the node
     it would become, beside those placed) as its turn comes, and carrying on
     from the picks in `out` (`apart` from them too) -- so a second set of
     candidates can fill what the first could not.  With nothing seeded and
     everything fitting, it picks exactly as `pick` does. */
  const pickFit = (cand, count, apart, order, fits, take, out) => {
    if (!cand.length || count <= 0) return;
    const start = out.length;
    if (order === 'near') {
      cand.sort((a, b) => a.r - b.r || a.y - b.y || a.x - b.x);
      for (const c of cand) {
        if (out.length - start >= count) break;
        if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) >= apart) && fits(c)) { take(c); out.push(c); }
      }
      return;
    }
    const mid = cand.reduce((s, c) => s + c.r, 0) / cand.length;
    cand.sort((a, b) => Math.abs(a.r - mid) - Math.abs(b.r - mid) || a.y - b.y || a.x - b.x);
    const dMin = cand.map((c) => out.reduce((m, o) => Math.min(m, Math.hypot(c.x - o.x, c.y - o.y)), Infinity));
    const takeAt = (k) => {
      const c = cand[k];
      take(c); out.push(c);
      for (let j = 0; j < cand.length; j++) dMin[j] = Math.min(dMin[j], Math.hypot(cand[j].x - c.x, cand[j].y - c.y));
    };
    if (!out.length) {
      let first = -1;
      for (let k = 0; k < cand.length && first < 0; k++) if (fits(cand[k])) first = k;
      if (first < 0) return;
      takeAt(first);
    }
    while (out.length - start < count) {
      let best = -1, bestD = apart;
      for (let k = 0; k < cand.length; k++) if (dMin[k] >= bestD) { bestD = dMin[k]; best = k; }
      if (best < 0) break;
      if (!fits(cand[best])) { dMin[best] = -1; continue; }
      takeAt(best);
    }
  };
  const areas = [{ id: 'commons', rid: ri.commons, bands: rules.bands.filter((b) => b.id === 'commons') }];
  for (const s of W.spokes) if (ri[s.id] != null) areas.push({ id: s.id, rid: ri[s.id], bands: rules.bands.filter((b) => b.id !== 'commons') });
  const result = Object.create(null);
  for (const area of areas) {
    const list = [];
    for (const band of area.bands) {
      /* fishing spots: fresh water in the commons; a land's coast for its
         clownfish; its rivers and pools for trout, else its coast.
         v2.3.3401: chosen FIRST, before the band's veins and trees (they
         still come first in its list): a spot needs water, a dry seat on
         the bank and that bank clear, and a land has few, so where its
         trees stood decided how many it got -- their bigger pictures, laid
         first, cost the long Wheel's lands up to three a stretch.  Open
         ground has room to spare for a tree, so the trees go round the
         anglers now (clearOfNodes, nodeClash). */
      const prefer = band.id === 'near' ? (k) => bp.cls[k] === C.ocean : (k) => FRESH.has(bp.cls[k]);
      const fishAt = (want) => {
        const cand = [];
        for (const i of bandCells(seatCells, band, area.rid)) {
          if (!WATER.has(bp.cls[i]) || !want(i)) continue;
          if (band.id === 'commons' && !FRESH.has(bp.cls[i])) continue;
          if (!around(i, SPOT_SIDE, (k) => WATER.has(bp.cls[k]))) continue;
          const x = gameX(i % bp.w), y = gameY((i / bp.w) | 0);
          const sx = x + rules.fishSeat[0], sy = y + rules.fishSeat[1];
          if (!dryClear(sx, sy, band, area.rid, SEAT_SIDE) || !clearOfMonsters(sx, sy) || !clearOfNodes(x, y, true) || hidden(x, y, 'f')) continue;
          if (nodeClash('f', x, y, band.tierLvl)) continue;   /* v2.3.3401: its angler in view */
          if (!seatDrawnDry(x, y)) continue;                   /* v2.3.3401: and out of the water as drawn */
          cand.push({ x, y, r: Math.hypot(x - cxG, y - cyG) });
        }
        return cand;
      };
      let fish = fishAt(prefer);
      if (fish.length < band.fish && band.id !== 'commons') fish = fishAt(() => true);
      const fishList = [];
      for (const c of pick(fish, band.fish, rules.fishApart, band.order)) {
        fishList.push(['f', Math.round(c.x), Math.round(c.y), band.tierLvl]);
        placed.push({ x: c.x, y: c.y, fish: true });
        nodeDrawn.push(nodeBoxes('f', c.x, c.y, band.tierLvl));
      }
      /* veins and trees */
      const land = [], loose = [];
      for (const i of bandCells(groundCells, band, area.rid)) {
        if (!inBand(i, band, area.rid)) continue;
        if (dHaz[i] * cellG < rules.clearWater || dRoad[i] * cellG < rules.clearRoad) continue;
        if (band.id === 'commons' && dTown[i] * cellG < rules.clearTown) continue;
        const x = gameX(i % bp.w), y = gameY((i / bp.w) | 0);
        if (nearObject(x, y, rules.clearObject) || !clearOfMonsters(x, y) || !clearOfNodes(x, y, false)) continue;
        if (!dryClear(x + rules.mineSeat[0], y + rules.mineSeat[1], band, area.rid)) continue;
        /* hidden as either kind: which it becomes is decided as it is picked
           (v2.3.3401: each the band's own tier's picture -- a rock always
           whole, a tree whole or else at least its middle and lower half,
           for the thick woods) */
        if (hidden(x, y, 'o', band.tierLvl)) continue;
        const c = { x, y, r: Math.hypot(x - cxG, y - cyG) };
        if (!hidden(x, y, 't', band.tierLvl)) land.push(c);
        else if (!hidden(x, y, 't', band.tierLvl, true)) loose.push(c);
      }
      /* ═══ v2.3.3401: WHOLE WHERE THERE IS ROOM ═══
         A maple 428 px across seldom stands clear of everything in the
         Verdant Wilds: the whole-picture rule alone left its levels 31-40
         five resources short (25 of 30).  So a band takes its places with
         the whole picture clear first, and only what that leaves short from
         places where its middle and lower half are (the trunk and what
         stands round it, the woodcutter always whole; a rock and its miner
         always whole) -- the count as it was, and every node clear of every
         other (nodeClash). */
      let ore = 0, tree = 0;
      const out = [];
      /* alternate, so a band's veins and trees are spread through it alike */
      const kindNow = () => (((out.length % 2 === 0 && ore < band.ore) || tree >= band.tree) ? 'o' : 't');
      const fits = (c) => !nodeClash(kindNow(), c.x, c.y, band.tierLvl);
      const take = (c) => {
        const kind = kindNow();
        if (kind === 'o') ore++; else tree++;
        list.push([kind, Math.round(c.x), Math.round(c.y), band.tierLvl]);
        placed.push({ x: c.x, y: c.y, fish: false });
        nodeDrawn.push(nodeBoxes(kind, c.x, c.y, band.tierLvl));
      };
      const want = band.ore + band.tree;
      pickFit(land, want, rules.apart, band.order, fits, take, out);
      if (out.length < want) pickFit(loose, want - out.length, rules.apart, band.order, fits, take, out);
      list.push(...fishList);
    }
    if (list.length) result[area.id] = list;
  }
  return result;
}

export function wheelSpawnsSource(b, plan = PLAN) {
  const long = (plan.wheel && plan.wheel.tierZones) || 1;
  /* v2.3.3013: a land's deeper stretches follow its first, one a line */
  const pts = (a) => a.map((p) => `[${p.join(', ')}]`).join(', ');
  const lines = Object.entries(b.spawns).map(([id, s]) =>
    `  ${id}: { anchor: [${s.anchor.join(', ')}], band: [${s.band.join(', ')}],\n    points: [${pts(s.points)}]`
    + (s.deeper && s.deeper.length
      ? `,\n    deeper: [\n${s.deeper.map((d) => `      { tier: ${d.tier}, levels: [${d.levels.join(', ')}], band: [${d.band.join(', ')}],\n        points: [${pts(d.points)}] },`).join('\n')}\n    ] },`
      : ' },'));
  return `/* GENERATED by tools/world/bake-wheel-spawns.mjs from public/tools/world/plan.js
 * (plan ${plan.id} v${plan.version}, blueprint ${b.hash}) -- do not edit by hand:
 * run the tool again.  tools/world/test-world-core.mjs fails when this is stale.
 *
 * ${long > 1 ? `v2.3.3315: the Wheel ${long} times longer (plan.js PLAN5): the live one` : 'v2.3.3315: the short Wheel, one zone a tier (plan.js PLAN): the worker plays it only under `wheel5x: false`'}.
 *
 * v2.3.2978: where each element zone's monsters stand on the Wheel (zone
 * 'wheel', server/src/wheelzone.js), in game px of the Wheel (${b.world[0]} x ${b.world[1]},
 * centre ${b.centre.join(', ')}).  Per land: the band just past the safe commons
 * on its spoke ([inner, outer] radius from the centre), its middle on the axis,
 * and up to twelve places, farthest-apart first: [x, y, depth], depth 0 at the
 * band's inner end and 1 at its outer -- the server's level spread.
 *
 * v2.3.3013: and 'deeper', the land's next stretches, each a tier: its levels,
 * its band on the axis and its places, in the same shape. */
export const WHEEL_SPAWNS_HASH = '${b.hash}';
/* v2.3.3315: how many times longer than one zone a tier this Wheel's tiers are */
export const WHEEL_LONG = ${long};
export const WHEEL_WORLD = [${b.world.join(', ')}];
/* the safe ground: the commons and the town, every land cell of them within
   this radius of the centre -- no monster targets anyone in it, steps into
   it, or lands a hit in it */
export const WHEEL_CENTRE = [${b.centre.join(', ')}];
export const WHEEL_SAFE_R = ${b.safeR};
export const WHEEL_SPAWNS = {
${lines.join('\n')}
};

/* v2.3.3012: where the Wheel's resources grow (gathering.js through
 * wheelzone.js _wheelSpawnNodes): per area -- the commons, then each land --
 * [kind, x, y, tierLvl], kind 'o' an ore vein, 't' a tree, 'f' a fishing
 * spot, tierLvl the worker's gathering tier: 1 in the commons (copper, pine,
 * minnow), 6 at levels 1-10 (iron, softwood, clownfish), 11 at levels 11-20
 * (black steel, hardwood, trout).  A fishing spot is in the water; its seat
 * (+52, +9 to the boots) is dry ground. */
export const WHEEL_NODES = {
${Object.entries(b.nodes || {}).map(([id, list]) => `  ${id}: [${list.map((p) => `['${p[0]}', ${p[1]}, ${p[2]}, ${p[3]}]`).join(', ')}],`).join('\n')}
};

/* v2.3.3016: the dungeons' mouths (server/src/wheeldungeon.js): per land
 * whose landmark is one, its name, its tier and that tier's levels, where it
 * stands, and the way back out, a step from it on open ground. */
export const WHEEL_DOORS = {
${Object.entries(b.doors || {}).map(([id, d]) => `  ${id}: { name: ${JSON.stringify(d.name)}, tier: ${d.tier}, levels: [${d.levels.join(', ')}], at: [${d.at.join(', ')}], back: [${d.back.join(', ')}] },`).join('\n')}
};
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/* v2.3.3315: both Wheels' tables -- [file, plan] */
export const SPAWN_BAKES = [[OUT, PLAN5, WHEEL_LONG], [OUT1, PLAN, 1]];
export function bakeWheelSpawnsFor(plan, long) {
  return bakeWheelSpawns(plan, spawnRulesFor(long), nodeRulesFor(long));
}
if (isMain) {
  const only = process.argv.includes('--short') ? 1 : process.argv.includes('--long') ? WHEEL_LONG : 0;
  let stale = 0;
  for (const [out, plan, long] of SPAWN_BAKES) {
    if (only && only !== long) continue;
    const t0 = Date.now();
    const b = bakeWheelSpawnsFor(plan, long);
    const src = wheelSpawnsSource(b, plan);
    if (process.argv.includes('--check')) {
      const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
      if (now !== src) { console.error(`${path.relative(ROOT, out)} is stale: run node tools/world/bake-wheel-spawns.mjs`); stale++; }
      else console.log(`${path.relative(ROOT, out)} matches the plan (${Date.now() - t0} ms)`);
    } else {
      fs.writeFileSync(out, src);
      for (const [id, s] of Object.entries(b.spawns)) {
        console.log(`${id.padEnd(8)} band ${s.band.join('-')}  ${s.points.length} places, first at ${s.points[0].slice(0, 2).join(', ')}`);
        for (const d of s.deeper || []) console.log(`${''.padEnd(8)} tier ${d.tier} (Lv ${d.levels.join('-')}) band ${d.band.join('-')}  ${d.points.length} places`);
      }
      const nn = Object.values(b.nodes).reduce((a, l) => a + l.length, 0);
      console.log(`-> ${path.relative(ROOT, out)} (${long}x: ${nn} nodes, ${Object.keys(b.doors).length} doors, safe ${b.safeR}, ${Date.now() - t0} ms)`);
    }
  }
  if (stale) process.exit(1);
}
