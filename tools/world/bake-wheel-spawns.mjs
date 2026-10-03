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
  /* v2.3.3007: and each one's PICTURE, its foot at the bottom middle -- a
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
  safeR = Math.ceil(safeR + rules.safeMargin);
  const nodes = bakeWheelNodes({ bp, W, ri, cellG, cxG, cyG, dHaz, dRoad, dist, nearObject, coveredAt, gameX, gameY, spawns: out, safeR }, NODE_RULES);
  return { spawns: out, nodes, hash: bp.hash, world: [Math.round(bp.w * cellG), Math.round(bp.h * cellG)], centre: [Math.round(cxG), Math.round(cyG)],
    safeR };
}

/* ═══ v2.3.3007: WHERE THE WHEEL'S RESOURCES GROW ═══
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
 *
 * "far" stops at level 20, where the first pass is: past it the next tiers
 * (titanium, cedar, ...) will grow, once they are planned.
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
 * placer -- like everything else this tool bakes. */
export const NODE_RULES = Object.freeze({
  bands: Object.freeze([
    Object.freeze({ id: 'commons', tiers: Object.freeze([0]), tierLvl: 1, ore: 6, tree: 6, fish: 10, order: 'near' }),
    Object.freeze({ id: 'near', tiers: Object.freeze([1, 2]), tierLvl: 6, ore: 3, tree: 3, fish: 2, order: 'spread' }),
    Object.freeze({ id: 'far', tiers: Object.freeze([3, 4]), tierLvl: 11, ore: 3, tree: 3, fish: 2, order: 'spread' }),
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
});

export function bakeWheelNodes(ctx, rules = NODE_RULES) {
  const { bp, W, ri, cellG, cxG, cyG, dHaz, dRoad, dist, nearObject, coveredAt, gameX, gameY, spawns, safeR } = ctx;
  /* nothing standing in front of the node's own picture, or of the bro working
     it (a body's box, 44 x 64, over his boots) -- `art` [half-width, height]
     of each kind's picture over its anchor (effectsRenderer NODE_SPRITE_HEIGHT_BASE,
     at a tier-11's 1.15x) */
  const ART = { o: [52, 118], t: [62, 196] };
  const hidden = (x, y, kind) => {
    if (!coveredAt) return false;
    if (kind === 'f') {
      const bx = x + rules.fishSeat[0], by = y + rules.fishSeat[1];
      return coveredAt(bx - 22, bx + 22, by - 64, by, by);
    }
    const [hw, h] = ART[kind];
    if (coveredAt(x - hw, x + hw, y - h, y, y)) return true;
    if (kind === 'o') {
      const bx = x + rules.mineSeat[0], by = y + rules.mineSeat[1];
      return coveredAt(bx - 22, bx + 22, by - 64, by, by);
    }
    return false;
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
     v2.3.3007 (owner: "Make all 8 have fishing spots"): the spot's side was a
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
     SWIM_*). */
  const SPOT_SIDE = [[1, 0]];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 0; dx++) SPOT_SIDE.push([dx, dy]);
  const SEAT_SIDE = [[0, 0], [1, 0]];
  const monsterPts = [];
  for (const s of Object.values(spawns)) for (const p of s.points) monsterPts.push(p);
  const clearOfMonsters = (x, y) => monsterPts.every((p) => Math.hypot(p[0] - x, p[1] - y) >= rules.clearMonster);
  /* every node placed so far, whatever its area or band: two lands' bands meet
     at a border, and each picks its own -- the first bake put a Mist Marsh and
     a Tidal Coast fishing spot 34 px apart on the river between them.  So a
     node keeps the same distance from ANY node of its kind (veins and trees
     `apart`, spots `fishApart`) and `clearNode` from the other kind. */
  const placed = [];
  const clearOfNodes = (x, y, fish) => placed.every((p) => Math.hypot(p.x - x, p.y - y)
    >= (p.fish === fish ? (fish ? rules.fishApart : rules.apart) : rules.clearNode));
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
    return j >= 0 && DRY.has(bp.cls[j]) && inBand(j, band, rid) && around(j, side, (k) => !WATER.has(bp.cls[k]))
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
  const areas = [{ id: 'commons', rid: ri.commons, bands: rules.bands.filter((b) => b.id === 'commons') }];
  for (const s of W.spokes) if (ri[s.id] != null) areas.push({ id: s.id, rid: ri[s.id], bands: rules.bands.filter((b) => b.id !== 'commons') });
  const result = Object.create(null);
  for (const area of areas) {
    const list = [];
    for (const band of area.bands) {
      /* veins and trees */
      const land = [];
      for (let i = 0; i < n; i++) {
        if (bp.cls[i] !== C.ground || !inBand(i, band, area.rid)) continue;
        if (dHaz[i] * cellG < rules.clearWater || dRoad[i] * cellG < rules.clearRoad) continue;
        if (band.id === 'commons' && dTown[i] * cellG < rules.clearTown) continue;
        const x = gameX(i % bp.w), y = gameY((i / bp.w) | 0);
        if (nearObject(x, y, rules.clearObject) || !clearOfMonsters(x, y) || !clearOfNodes(x, y, false)) continue;
        if (!dryClear(x + rules.mineSeat[0], y + rules.mineSeat[1], band, area.rid)) continue;
        /* hidden as either kind: which it becomes is decided after the pick */
        if (hidden(x, y, 'o') || hidden(x, y, 't')) continue;
        land.push({ x, y, r: Math.hypot(x - cxG, y - cyG) });
      }
      const placedLand = pick(land, band.ore + band.tree, rules.apart, band.order);
      let ore = 0, tree = 0;
      placedLand.forEach((c, k) => {
        /* alternate, so a band's veins and trees are spread through it alike */
        const wantOre = (k % 2 === 0 && ore < band.ore) || tree >= band.tree;
        if (wantOre) ore++; else tree++;
        list.push([wantOre ? 'o' : 't', Math.round(c.x), Math.round(c.y), band.tierLvl]);
        placed.push({ x: c.x, y: c.y, fish: false });
      });
      /* fishing spots: fresh water in the commons; a land's coast for its
         clownfish; its rivers and pools for trout, else its coast */
      const prefer = band.id === 'near' ? (k) => bp.cls[k] === C.ocean : (k) => FRESH.has(bp.cls[k]);
      const fishAt = (want) => {
        const cand = [];
        for (let i = 0; i < n; i++) {
          if (!WATER.has(bp.cls[i]) || !want(i)) continue;
          if (band.id === 'commons' && !FRESH.has(bp.cls[i])) continue;
          if (!around(i, SPOT_SIDE, (k) => WATER.has(bp.cls[k]))) continue;
          const x = gameX(i % bp.w), y = gameY((i / bp.w) | 0);
          const sx = x + rules.fishSeat[0], sy = y + rules.fishSeat[1];
          if (!dryClear(sx, sy, band, area.rid, SEAT_SIDE) || !clearOfMonsters(sx, sy) || !clearOfNodes(x, y, true) || hidden(x, y, 'f')) continue;
          cand.push({ x, y, r: Math.hypot(x - cxG, y - cyG) });
        }
        return cand;
      };
      let fish = fishAt(prefer);
      if (fish.length < band.fish && band.id !== 'commons') fish = fishAt(() => true);
      for (const c of pick(fish, band.fish, rules.fishApart, band.order)) {
        list.push(['f', Math.round(c.x), Math.round(c.y), band.tierLvl]);
        placed.push({ x: c.x, y: c.y, fish: true });
      }
    }
    if (list.length) result[area.id] = list;
  }
  return result;
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

/* v2.3.3007: where the Wheel's resources grow (gathering.js through
 * wheelzone.js _wheelSpawnNodes): per area -- the commons, then each land --
 * [kind, x, y, tierLvl], kind 'o' an ore vein, 't' a tree, 'f' a fishing
 * spot, tierLvl the worker's gathering tier: 1 in the commons (copper, pine,
 * minnow), 6 at levels 1-10 (iron, softwood, clownfish), 11 at levels 11-20
 * (black steel, hardwood, trout).  A fishing spot is in the water; its seat
 * (+52, +9 to the boots) is dry ground. */
export const WHEEL_NODES = {
${Object.entries(b.nodes || {}).map(([id, list]) => `  ${id}: [${list.map((p) => `['${p[0]}', ${p[1]}, ${p[2]}, ${p[3]}]`).join(', ')}],`).join('\n')}
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
