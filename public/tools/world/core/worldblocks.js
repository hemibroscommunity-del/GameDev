/* ═══ v2.3.3298: THE WHEEL IN BLOCKS — built round you, not all at once ═══
 *
 * The owner, 2026-10-17: "the game map needs to be larger. It goes from lvl 1
 * monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed" -- and,
 * offered the ways to get there, "Rebuild for 5x".  The game's ground worker
 * built the blueprint and its swatch map for the WHOLE Wheel on the way in:
 * ~2 s on a desktop and ~50 MB at its peak, and a Wheel five times longer is
 * 25 times the cells -- ~23 s and ~600 MB, where a phone's tab dies at ~250.
 * So the worker now builds the Wheel a BLOCK at a time, only the blocks round
 * you, and lets the far ones go:
 *
 *   a block      BLOCK x BLOCK cells (128: 3,072 game px, two phone screens)
 *                of the whole blueprint, counted from its corner;
 *   its ground   which swatch covers each of its cells (`mat`), which water
 *                is fresh, and each cell's region and tier -- from a blueprint
 *                of the block and LAND_STAGE_MARGIN cells round it
 *                (layout.js buildBlueprint's `rect`, ground.js materialMap),
 *                exactly the whole map's;
 *   its walls    where you cannot walk and where you may swim (walkBits,
 *                swimBits), from the swatch map of the block and the
 *                WALL_MARGIN cells round it -- built with its ground, from
 *                one blueprint of the block and both margins round it;
 *   a window     any rectangle of cells, the swatch map stitched from the
 *                blocks under it -- what composeGround lays a piece from.
 *
 * Every number a block holds is the whole map's own at that cell
 * (tools/world/test-world-core.mjs, "the Wheel in blocks", compares them all).
 * Pure: no worker, no page; the ground worker (ground-worker.js) and the
 * tools use it.
 */
import { buildBlueprint, planFeatures } from './layout.js';
import { materialMap, walkBits, swimBits, LAND_STAGE_MARGIN, SHORE_CAP } from './ground.js';
import { PLACING } from './placing.js';
import { objectCatalog } from '../../objects/catalog.js';
import { fnv1a } from './rng.js';

/* blueprint cells an overview pixel (the minimap's and world map's picture) */
export const OVERVIEW_CELLS = 4;
/* What the baked objects and overview (tools/world/bake-wheel-world.mjs) were
   worked out from: the plan, the objects' catalog and the placing's version.
   The worker trusts the baked files only when its own plan says the same --
   a plan changed without a re-bake falls back to building the whole Wheel. */
export function planFingerprint(plan) {
  return fnv1a(JSON.stringify(plan), JSON.stringify(objectCatalog()), PLACING);
}

export const BLOCK = 128;
/* cells round a block its walls need: swimBits measures the shore up to
   SHORE_CAP + 1 cells away, and walkBits blurs two cells either way */
export const WALL_MARGIN = SHORE_CAP + 3;
/* blocks kept built (~50 KB each); the ones furthest from the last asked go */
const KEEP = 48;

/* cells round a piece of ground its window needs (composeGround's blur and
   edges, the shore's distance, the water's field: 8 is enough today, with
   room for the edge pieces and blends the address can bring back) */
export const PIECE_MARGIN = 24;

/* A Wheel's blocks.  `opts.onBuilt(block)` is told of each block as it is
   built (the worker sends its walls to the game). */
export function wheelBlocks(plan, opts = {}) {
  const F = planFeatures(plan);
  const S = F.S, BW = F.bw, BH = F.bh;
  const cols = Math.ceil(BW / BLOCK), rows = Math.ceil(BH / BLOCK);
  /* the ground's seed (composeGround's, which swimBits shares) */
  const seed = (plan.seed | 0) + 900;
  const built = new Map();     /* J * cols + I -> block */
  /* the material map's catalog, ids and the rest -- the same for every
     rectangle, so from a blueprint of one cell */
  let catalogOf = null;
  {
    const one = materialMap(plan, buildBlueprint(plan, { x: 0, y: 0, w: 1, h: 1 }));
    catalogOf = { ids: one.ids, index: one.index, water: one.water, catalog: one.catalog, built: one.built };
  }
  let lastI = 0, lastJ = 0, nearKnown = false;
  const stats = { built: 0, ms: 0 };

  const key = (I, J) => J * cols + I;
  const inRange = (I, J) => I >= 0 && J >= 0 && I < cols && J < rows;

  /* the block's ground and walls: a blueprint of it and MARGIN cells round
     it, its swatch map, and this block's cells of both -- its swatch map is
     the whole map's LAND_STAGE_MARGIN cells in from that blueprint's edges,
     and its walls need WALL_MARGIN cells of that round the block */
  const MARGIN = LAND_STAGE_MARGIN + WALL_MARGIN;
  function ground(I, J) {
    const k = key(I, J);
    const hit = built.get(k);
    if (hit) return hit;
    const t0 = Date.now();
    const x = I * BLOCK, y = J * BLOCK, w = Math.min(BLOCK, BW - x), h = Math.min(BLOCK, BH - y);
    const wx = Math.max(0, x - MARGIN), wy = Math.max(0, y - MARGIN);
    const ww = Math.min(BW, x + w + MARGIN) - wx, wh = Math.min(BH, y + h + MARGIN) - wy;
    const bp = buildBlueprint(plan, { x: wx, y: wy, w: ww, h: wh });
    const mm = materialMap(plan, bp);
    const walk = walkBits(bp, mm), swim = swimBits(bp, mm, seed, walk);
    const n = w * h;
    const mat = new Uint8Array(n), reg = new Uint8Array(n), tier = new Uint8Array(n), fresh = new Uint8Array(n);
    const wk = new Uint8Array((n + 7) >> 3), sw = new Uint8Array((n + 7) >> 3);
    for (let yy = 0; yy < h; yy++) {
      const src = (y - wy + yy) * ww + (x - wx), dst = yy * w;
      mat.set(mm.mat.subarray(src, src + w), dst);
      reg.set(bp.reg.subarray(src, src + w), dst);
      tier.set(bp.tier.subarray(src, src + w), dst);
      for (let xx = 0; xx < w; xx++) {
        const s2 = src + xx, d = dst + xx;
        fresh[d] = (mm.fresh[s2 >> 3] >> (s2 & 7)) & 1;
        if ((walk[s2 >> 3] >> (s2 & 7)) & 1) wk[d >> 3] |= 1 << (d & 7);
        if ((swim[s2 >> 3] >> (s2 & 7)) & 1) sw[d >> 3] |= 1 << (d & 7);
      }
    }
    const b = { I, J, x, y, w, h, mat, reg, tier, fresh, walls: { walk: wk, swim: sw } };
    built.set(k, b);
    stats.built++;
    stats.ms += Date.now() - t0;
    trim(b);
    if (opts.onBuilt) opts.onBuilt(b);
    return b;
  }
  /* let the blocks furthest from where you are (near) go -- never the one
     just built, which is wanted now */
  function trim(fresh) {
    if (built.size <= KEEP) return;
    const dist = (b) => Math.max(Math.abs(b.I - lastI), Math.abs(b.J - lastJ));
    const far = [...built.values()].filter((b) => b !== fresh).sort((a, b) => dist(b) - dist(a));
    for (const b of far.slice(0, built.size - KEEP)) built.delete(key(b.I, b.J));
  }

  /* The swatch map of any rectangle of cells (`x`, `y`, `w`, `h` from the
     whole blueprint's corner, clipped to it), stitched from its blocks: a
     blueprint-shaped `bp` and a materialMap-shaped `mm`, which composeGround,
     walkBits and swimBits take as they take the whole map's. */
  function window(rect) {
    const x0 = Math.max(0, Math.floor(rect.x)), y0 = Math.max(0, Math.floor(rect.y));
    const x1 = Math.min(BW, Math.floor(rect.x + rect.w)), y1 = Math.min(BH, Math.floor(rect.y + rect.h));
    const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0), n = w * h;
    const mat = new Uint8Array(n), fresh = new Uint8Array((n + 7) >> 3);
    for (let J = Math.floor(y0 / BLOCK); J <= Math.floor((y1 - 1) / BLOCK); J++) {
      for (let I = Math.floor(x0 / BLOCK); I <= Math.floor((x1 - 1) / BLOCK); I++) {
        const b = ground(I, J);
        const ax = Math.max(x0, b.x), bx = Math.min(x1, b.x + b.w), ay = Math.max(y0, b.y), by = Math.min(y1, b.y + b.h);
        for (let yy = ay; yy < by; yy++) {
          const src = (yy - b.y) * b.w + (ax - b.x), dst = (yy - y0) * w + (ax - x0);
          mat.set(b.mat.subarray(src, src + (bx - ax)), dst);
          for (let xx = 0; xx < bx - ax; xx++) if (b.fresh[src + xx]) { const d = dst + xx; fresh[d >> 3] |= 1 << (d & 7); }
        }
      }
    }
    const cat = catalogOf;
    const bp = { w, h, scale: S, x0: F.x0 + x0 * S, y0: F.y0 + y0 * S, ox: x0, oy: y0, decks: F.decks,
      wheel: F.W, regionIds: F.regionIds, full: { w: BW, h: BH, x0: F.x0, y0: F.y0 } };
    /* the plank decks' cells in this window (materialMap's deckAt) */
    const deckAt = new Map();
    F.decks.forEach((d, k) => {
      for (let y = Math.max(d.y0, y0); y < Math.min(d.y1, y1); y++) for (let x = Math.max(d.x0, x0); x < Math.min(d.x1, x1); x++) {
        const i = (y - y0) * w + (x - x0);
        if (!deckAt.has(i) && cat.catalog[mat[i]] && cat.catalog[mat[i]].laid === 'planks') deckAt.set(i, k);
      }
    });
    const mm = { mat, ids: cat.ids, index: cat.index, water: cat.water, catalog: cat.catalog, built: cat.built, decks: F.decks, deckAt, fresh };
    return { bp, mm };
  }

  /* A block's walls: where you cannot walk and where you may swim, one bit a
     cell of the block (row by row) -- built with its ground */
  const walls = (I, J) => ground(I, J).walls;

  return {
    BLOCK, cols, rows, cellsW: BW, cellsH: BH, scale: S, x0: F.x0, y0: F.y0, features: F, stats,
    inRange, ground, window, walls,
    /* the block a cell is in */
    blockOf: (bx, by) => [Math.floor(bx / BLOCK), Math.floor(by / BLOCK)],
    /* which blocks are built now */
    builtKeys: () => [...built.keys()],
    /* the blocks round (I, J) are the ones to keep: the furthest go first */
    near(I, J) { lastI = I; lastJ = J; nearKnown = true; },
    /* the nearest block within `R` blocks of the last near() that is not
       built yet, [I, J] -- or null when they all are */
    missingNear(R = 1) {
      if (!nearKnown) return null;
      for (let r = 0; r <= R; r++) {
        for (let J = lastJ - r; J <= lastJ + r; J++) for (let I = lastI - r; I <= lastI + r; I++) {
          if (Math.max(Math.abs(I - lastI), Math.abs(J - lastJ)) !== r || !inRange(I, J)) continue;
          if (!built.has(key(I, J))) return [I, J];
        }
      }
      return null;
    },
    /* the material map's catalog: ids, index, water, catalog, built */
    catalog: () => catalogOf,
    /* is block (I, J) built now? */
    has: (I, J) => built.has(key(I, J)),
    /* how many blocks are built now */
    size: () => built.size,
  };
}
