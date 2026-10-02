/* ═══ v2.3.2931: THE BLUEPRINT — the whole world as a colour-coded plan ═══
 *
 * One cell per `plan.blueprintScale` art px (16), each holding a terrain
 * CLASS (ground, road, water, cliff, street, ...), a REGION (frost, ember,
 * ...), a STAGE (which of its region's four looks, `band`) and a TIER (the
 * level: tier t is levels 5t-4 to 5t; 0 where no monster goes).  Built
 * deterministically from the plan: same seed, same world, on every device.
 *
 * v2.3.2936: the island is the WHEEL (core/wheel.js) -- the commons round
 * the town, a spoke of land per element, sea between them, passes across
 * it.  The tier map is the level map a game system asks "how dangerous is
 * it here?" (docs/WORLD-ARCHITECTURE.md §2: region and level come from
 * position, not from a zone).
 *
 * It has two jobs, and the second is why it exists at all:
 *
 *  1. It is the layout sketch every square's template shows ChatGPT, so a
 *     road or a river crossing a square border is already continuous before
 *     a single pixel is painted -- the biggest source of seams in tiled AI art
 *     is two squares disagreeing about WHERE things are, not how they look.
 *  2. It becomes the game's collision map.  Walls drawn first and painted to
 *     are the reverse of what failed twice (walls traced off finished art by
 *     hue, tiledMaps.js v2.3.1693 / v2.3.1794).
 *
 * ── GROWTH: NOTHING HERE MAY DEPEND ON HOW BIG THE PAINTED AREA IS ──
 * The blueprint covers only the ACTIVE area (grid.js), but every value in it
 * is a function of ABSOLUTE position: noise is sampled at plan coordinates,
 * the coarse noise lattice is aligned to absolute cells, and scattered
 * features (tree clumps, ponds, cliffs) sit on a hashed lattice anchored at
 * the world centre instead of being drawn from one random sequence whose
 * every draw would shift when the area grew.  So widening `plan.active`
 * leaves every painted square's plan bit-for-bit unchanged -- which the core
 * suite proves (tools/world/test-world-core.mjs, "growth").
 *
 * Built in about a second on a desktop: the low-frequency fields (coast
 * wobble, region-border warp, commons and tier wobble) are evaluated on a coarse
 * lattice and interpolated, because they vary over hundreds of cells.
 */
import { fbm, valueNoise, hash2, fnv1a } from './rng.js';
import { gridInfo } from './grid.js';
import { wheelInfo, axisDist, between, tierAt, stageOf, spokePoint } from './wheel.js';

/* APPEND ONLY: a class's index is stored in every blueprint cell. */
export const CLASS_IDS = ['ground', 'path', 'obstacle', 'water', 'ocean', 'cliff', 'lava', 'landmark', 'anchor',
  'street', 'boardwalk', 'plaza', 'lot', 'river', 'rail', 'bridge', 'gate'];
export const C = Object.freeze(Object.fromEntries(CLASS_IDS.map((k, i) => [k, i])));
/* A region's stages (its looks, one per twenty levels), as `band` stores
   them: 0-based. */
export const STAGES = 4;
const TOWN_CLASSES = new Set([C.street, C.boardwalk, C.plaza]);

export function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* A stable 32-bit seed from a string (FNV-1a), so a road's or a region's
   randomness belongs to its NAME, not to its place in a list. */
export function strSeed(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h | 0;
}

/* Evaluate f(gx, gy) -- ABSOLUTE cell coordinates -- on a lattice every
   `step` cells, the lattice aligned to multiples of `step` in absolute cells,
   and return a bilinear sampler over absolute cells.  Aligning to absolute
   cells (not to wherever the blueprint starts) is what keeps a place's value
   the same when the active area grows. */
function coarseField(gx0, gy0, bw, bh, step, f) {
  const lx0 = Math.floor(gx0 / step), ly0 = Math.floor(gy0 / step);
  const cw = Math.floor((gx0 + bw) / step) - lx0 + 2, ch = Math.floor((gy0 + bh) / step) - ly0 + 2;
  const data = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) data[j * cw + i] = f((lx0 + i) * step, (ly0 + j) * step);
  return function sample(gx, gy) {
    const x = gx / step - lx0, y = gy / step - ly0;
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const i1 = Math.min(i + 1, cw - 1), j1 = Math.min(j + 1, ch - 1);
    const a = data[j * cw + i], b = data[j * cw + i1], c = data[j1 * cw + i], d = data[j1 * cw + i1];
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

/* Where each anchor painting sits, in art px.  `keep` is the part that stays
   (the painting minus its inset), `core` is keep minus the feather: fully
   opaque painting.  `at` is in squares from the world centre. */
export function placeAnchors(plan) {
  const g = gridInfo(plan);
  return (plan.anchors || []).map((a) => {
    const w = a.size[0], h = a.size[1];
    const x0 = Math.round(g.cx + a.at[0] * g.P - w / 2), y0 = Math.round(g.cy + a.at[1] * g.P - h / 2);
    const keep = { x0: x0 + a.inset.left, y0: y0 + a.inset.top, x1: x0 + w - a.inset.right, y1: y0 + h - a.inset.bottom };
    const core = { x0: keep.x0 + a.feather, y0: keep.y0 + a.feather, x1: keep.x1 - a.feather, y1: keep.y1 - a.feather };
    return { id: a.id, name: a.name, src: a.src, x0, y0, w, h, keep, core, feather: a.feather };
  });
}

/* Distance from point p to segment ab. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

/* A smooth curve through `pts` (uniform Catmull-Rom), sampled about every
   `spacing` px.  Only + - * /, so every engine draws the same curve. */
function smoothCurve(pts, spacing) {
  const out = [];
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let s = 0; s < pts.length - 1; s++) {
    const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / spacing));
    for (let k = s ? 1 : 0; k <= steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/* Offset a dense curve sideways by a noise wobble of `amp` px that fades in
   over the first and last `fade` px -- rivers meander, roads wander. */
function wobbleCurve(pts, amp, seed, wavelength, fade) {
  if (!amp) return pts;
  const L = [0];
  for (let k = 1; k < pts.length; k++) {
    const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1];
    L.push(L[k - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = L[L.length - 1] || 1;
  return pts.map((p, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
    const f = Math.min(1, L[k] / fade, (total - L[k]) / fade);
    const w = amp * f * fbm(L[k] / wavelength, 0.5, seed, 3);
    return [p[0] - ty * w, p[1] + tx * w];
  });
}

/* Every `k`th point of a dense curve, always keeping the last -- what a
   route keeps for the prompt's "comes in by the top edge" arithmetic. */
function thin(pts, k) {
  const out = [];
  for (let i = 0; i < pts.length; i += k) out.push(pts[i]);
  if (pts.length && out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

/* ═══ v2.3.2975: THE TOWN LAID OUT ROUND ITS BUILDINGS ═══
   The owner's buildings came (2026-10-02), each drawn square-on: roof from
   above, front below, the door at the bottom on a porch with steps -- so
   every one FACES SOUTH, toward the viewer, as in most top-down games, and
   stands 321-453 game px tall on a plot 386 wide.  The old plots (300 game
   px, two a side along every street arm) were laid out before any was
   drawn: too narrow, and on Main Street, a north-south street, every door
   would have faced the yard of the plot beside it.  So the town is laid out
   round what was drawn:

     - every door opens onto the square, a street, or a FRONT WALK -- a
       strip of street from Main Street to the door (`fronts`);
     - along Main Street the buildings stand side-on, two a side on each
       arm, the first ones' doors on the square (north) or on the BACK LANE
       (south) and the second ones' on front walks.  Each is far enough from
       the next that no roof hides a door: `tall` (the tallest building's
       drawn height) and a walk apart;
     - on Market Row the buildings on the NORTH side open straight onto the
       street; those on the SOUTH side stand back so their roofs stay off it
       and open onto the Back Lane, which runs behind Market Row from end to
       end and crosses Main Street;
     - the Town Hall stands in the middle of the square, its door to the
       south, where Mayor Bro waits.

   In art px from the world centre, like everything here.  `lot` and `hall`
   in plan.js size it (a building, its ground depth `d`, its drawn height
   budget `tall`, a front walk `walk`); the buildings themselves are placed
   on these plots by core/placing.js.  Each plot keeps the building's
   ground: x0..x1 its width, y0..y1 its depth, the DOOR at (foot.x, foot.y),
   the middle of its south edge. */
export function townPlan(T) {
  const L = T.lot, Hl = T.hall;
  const verge = T.boardwalks ? Math.max(L.verge, T.boardwalk) : L.verge;
  const porch = T.boardwalks ? Math.max(L.porch, T.boardwalk) : L.porch;
  const lots = [], fronts = [];
  const lot = (o, x0, x1, footY) => {
    const r = { ...o, x0, x1, y0: footY - L.d, y1: footY, foot: { x: (x0 + x1) / 2, y: footY } };
    /* v2.3.2949/2960: a plan that lays boardwalks puts one along each door */
    r.walk = { x0, x1, y0: footY, y1: footY + T.boardwalk };
    lots.push(r);
    return r;
  };
  lots.push({ ...T.hallLot, arm: 'square', x0: -Hl.w / 2, x1: Hl.w / 2, y0: -Hl.d / 2, y1: Hl.d / 2, foot: { x: 0, y: Hl.d / 2 } });
  const near = T.main + verge, far = near + L.w;          /* a side-on plot beside Main Street */
  const yN0 = -(T.square + porch);                         /* the north arm's first doors, on the square */
  const yS0 = T.square + porch + L.d;                      /* the south arm's first doors, and the Back Lane */
  const step = L.tall + L.walk;
  const rowAt = (k) => far + L.gap + k * (L.w + L.gap);    /* a Market Row plot's near edge */
  let rowEnd = far;
  const arms = T.lots || {};
  for (const arm of Object.keys(arms)) {
    for (const side of Object.keys(arms[arm])) {
      arms[arm][side].slice(0, L.perSide).forEach((o, k) => {
        const base = { ...o, arm, side };
        if (arm === 'north' || arm === 'south') {
          const [x0, x1] = side === 'west' ? [-far, -near] : [near, far];
          const footY = arm === 'north' ? yN0 - k * step : yS0 + k * step;
          lot(base, x0, x1, footY);
          /* its front walk, from Main Street to its door -- the first ones
             south open onto the Back Lane, the first ones north the square */
          if (k > 0 || arm === 'south') {
            if (!(arm === 'south' && k === 0)) fronts.push({ x0: side === 'west' ? -far : T.main, x1: side === 'west' ? -T.main : far, y0: footY, y1: footY + L.walk });
          }
        } else {
          const a0 = rowAt(k), [x0, x1] = arm === 'west' ? [-(a0 + L.w), -a0] : [a0, a0 + L.w];
          rowEnd = Math.max(rowEnd, a0 + L.w);
          lot(base, x0, x1, side === 'north' ? -(T.row + porch) : yS0);
        }
      });
    }
  }
  /* the Back Lane: behind Market Row's south side, end to end, across Main Street */
  fronts.push({ x0: -rowEnd, x1: rowEnd, y0: yS0, y1: yS0 + L.walk, lane: true });
  const northEnd = -Math.min(yN0, ...lots.filter((l) => l.arm === 'north').map((l) => l.y0));
  const southEnd = Math.max(yS0 + L.walk, ...lots.filter((l) => l.arm === 'south').map((l) => l.y1 + L.walk));
  return { lots, fronts, verge, porch, rowEnd, northEnd, southEnd, yN0, yS0 };
}

/* The town's ground, as rectangles (art px from the centre): the square, the
   four arms round their plots with a yard behind, and the streets out to
   the gates.  Brotown is wherever one of them is, give or take its wobble. */
export function townShape(T) {
  const tp = townPlan(T), y = T.yard, L = T.lot;
  const sideOuter = T.main + tp.verge + L.w + y;
  const rows = tp.lots.filter((l) => l.arm === 'west' || l.arm === 'east');
  const rowTop = rows.length ? -Math.min(...rows.map((l) => Math.min(l.y0, l.y1 - L.tall * 0.5))) : T.row;
  const rowBot = tp.yS0 + L.walk;
  const rects = [
    { x0: -T.square - y, x1: T.square + y, y0: -T.square - y, y1: T.square + y },
    { x0: -sideOuter, x1: sideOuter, y0: -(tp.northEnd + y), y1: 0 },
    { x0: -sideOuter, x1: sideOuter, y0: 0, y1: tp.southEnd + y },
    { x0: -(tp.rowEnd + y), x1: tp.rowEnd + y, y0: -(rowTop + y), y1: rowBot + y },
    { x0: -(T.main + y + 40), x1: T.main + y + 40, y0: -T.gate, y1: T.gate },
    { x0: -T.gate, x1: T.gate, y0: -(T.row + y + 40), y1: T.row + y + 40 },
  ];
  return { ...tp, rects };
}
function inTown(dx, dy, T, sh, wob) {
  for (const r of sh.rects) {
    if (dx >= r.x0 - wob && dx <= r.x1 + wob && dy >= r.y0 - wob && dy <= r.y1 + wob) return true;
  }
  return false;
}

/* v2.3.2977: how far an edge is pushed out (+) or in (-) where it stands,
   art px: `amp` either way over `wave` art px, `amp2` over `wave2` and
   `amp3` over `wave3` on top -- bays, then coves, then bumps.
   The owner, of the town's yards meeting the grass: "the lines between dirt
   and grass are razor straight" -- the town's rectangles were grown by noise
   that changed over 480 art px and was read off the coarse lattice, 128 art
   px apart and joined by straight lines, so each side stayed a ruler line a
   few px either way.  Read here for every cell near an edge, never from the
   lattice.  Each change is about 1 px a px along the edge at the very most
   (half that as a rule), so an edge wanders in bays and coves and seldom
   folds back on itself; where it does, it leaves a tuft of grass. */
export const TOWN_EDGE = { amp: 60, wave: 300, amp2: 30, wave2: 110, amp3: 12, wave3: 45 };
/* ...the plots out in the country, smaller, the same way (plan.places) */
export const PLACE_EDGE = { amp: 18, wave: 140, amp2: 9, wave2: 55, amp3: 4, wave3: 24 };
export function edgeWobble(E, nseed, ax, ay) {
  let w = E.amp * valueNoise(ax / E.wave, ay / E.wave, nseed | 0);
  if (E.amp2) w += E.amp2 * valueNoise(ax / E.wave2, ay / E.wave2, (nseed + 7) | 0);
  if (E.amp3) w += E.amp3 * valueNoise(ax / E.wave3, ay / E.wave3, (nseed + 13) | 0);
  return w;
}
const edgeReach = (E) => E.amp + (E.amp2 || 0) + (E.amp3 || 0);
/* Is (dx, dy) -- art px from (ox, oy) -- inside the rectangle `r` once its
   edge has wandered (E)?  The wobble is read at the NEAREST POINT OF THE
   EDGE, not where the cell is: read where the cell is, the edge sat where
   the cell's distance matched the noise there, and where the noise climbed
   steeply away from the edge that pinned it in one column for 400 game px
   (the town's north-west corner, the first try of v2.3.2977).  Read on the
   edge, it moves exactly as far as the noise says, everywhere. */
function inWobblyRect(dx, dy, r, E, nseed, ox, oy, reach) {
  const ix = Math.min(Math.max(dx, r.x0), r.x1), iy = Math.min(Math.max(dy, r.y0), r.y1);
  let d, px, py;
  if (ix !== dx || iy !== dy) {
    /* outside: how far, and the nearest point of the rectangle */
    d = -Math.hypot(dx - ix, dy - iy);
    if (d < -reach) return false;
    px = ix; py = iy;
  } else {
    /* inside: how far in from the nearest side, and the point on it */
    const l = dx - r.x0, rt = r.x1 - dx, t = dy - r.y0, b = r.y1 - dy, m = Math.min(l, rt, t, b);
    if (m > reach) return true;
    d = m;
    if (m === l) { px = r.x0; py = dy; } else if (m === rt) { px = r.x1; py = dy; } else if (m === t) { px = dx; py = r.y0; } else { px = dx; py = r.y1; }
  }
  return d + edgeWobble(E, nseed, ox + px, oy + py) >= 0;
}

/* The town's plots, in art px from the world centre (townPlan).  Also used
   by the World Bible's lot table. */
export function townLots(T) {
  return townPlan(T).lots;
}

export function buildBlueprint(plan) {
  const g = gridInfo(plan);
  const S = plan.blueprintScale, P = g.P;
  const gx0 = Math.floor(g.ax / S), gy0 = Math.floor(g.ay / S);
  const x0 = gx0 * S, y0 = gy0 * S;
  const bw = Math.ceil((g.ax + g.AW - x0) / S), bh = Math.ceil((g.ay + g.AH - y0) / S);
  const n = bw * bh;
  const cls = new Uint8Array(n), reg = new Uint8Array(n), band = new Uint8Array(n);
  const regionIds = Object.keys(plan.regions);
  const R = Object.create(null);
  regionIds.forEach((k, i) => { R[k] = i; });
  const seed = plan.seed | 0;
  const townId = R.town;

  /* coordinates: a cell's centre in art px, an art position in (float) cells
     where cell b's centre is b + 0.5, and plan squares -> art px */
  const artX = (bx) => x0 + (bx + 0.5) * S, artY = (by) => y0 + (by + 0.5) * S;
  const cellX = (ax) => (ax - x0) / S, cellY = (ay) => (ay - y0) / S;
  const toArt = (p) => [g.cx + p[0] * P, g.cy + p[1] * P];
  const sqx = (gx) => ((gx + 0.5) * S - g.cx) / P, sqy = (gy) => ((gy + 0.5) * S - g.cy) / P;
  const cellIndex = (ax, ay) => {
    const bx = Math.floor(cellX(ax)), by = Math.floor(cellY(ay));
    return bx >= 0 && by >= 0 && bx < bw && by < bh ? by * bw + bx : -1;
  };

  const anchors = placeAnchors(plan);
  const W = wheelInfo(plan);
  const coast = plan.coast, cmn = plan.commons, warp = plan.regionWarp, tw = plan.tierWarp;
  const passWob = plan.wheel.passWobble || 0;
  const tier = new Uint8Array(n);

  const STEP = 8;
  const field = (f) => coarseField(gx0, gy0, bw, bh, STEP, f);
  const coastN = field((gx, gy) => fbm(sqx(gx) * coast.freq, sqy(gy) * coast.freq, seed + 11, 4));
  const warpX = field((gx, gy) => fbm(sqx(gx) * warp.freq, sqy(gy) * warp.freq, seed + 23, 3));
  const warpY = field((gx, gy) => fbm(sqx(gx) * warp.freq + 17.3, sqy(gy) * warp.freq + 5.1, seed + 37, 3));
  const ringN = field((gx, gy) => fbm(sqx(gx) * cmn.freq, sqy(gy) * cmn.freq, seed + 41, 3));
  /* (v2.3.2977: the town's edge, read per cell near it: edgeWobble) */
  const tierN = field((gx, gy) => fbm(sqx(gx) * tw.freq, sqy(gy) * tw.freq, seed + 61, 2));

  const spokes = W.spokes.map((sp) => ({ ...sp, rid: R[sp.id] }));
  const passes = [];
  for (const [pa, pb] of W.pairs) for (const t of plan.wheel.passes) passes.push({ a: pa, b: pb, r: W.tierMid(t), half: (plan.wheel.passZones * W.Z) / 2 });
  const T = plan.town || null;
  const TS = T ? townShape(T) : null;
  const TE = T ? { ...TOWN_EDGE, ...(T.edge || {}) } : null;
  /* the town's rectangles, grown by the most its edge can wander: only a
     cell inside this asks edgeWobble */
  const townReach = TE ? edgeReach(TE) : 0;
  const townBox = TS ? (() => {
    const m = townReach + S;
    return { x0: Math.min(...TS.rects.map((r) => r.x0)) - m, x1: Math.max(...TS.rects.map((r) => r.x1)) + m,
      y0: Math.min(...TS.rects.map((r) => r.y0)) - m, y1: Math.max(...TS.rects.map((r) => r.y1)) + m };
  })() : null;
  const commonsId = R.commons;

  /* ── pass 1: sea, anchors, the town, the commons, the spokes and passes,
     each cell's stage and tier ──
     Land is the commons, the union of the spoke capsules, and the pass
     arcs.  A land cell belongs to the spoke whose axis is nearest a
     slightly warped copy of it -- so the border between two neighbours
     wanders round the line halfway between them, at their bases and across
     their passes alike.  Its tier comes from its distance from the town. */
  for (let by = 0; by < bh; by++) {
    const gy = gy0 + by, y = sqy(gy), ay = artY(by);
    for (let bx = 0; bx < bw; bx++) {
      const gx = gx0 + bx, x = sqx(gx), ax = artX(bx);
      const i = by * bw + bx;
      const r = Math.sqrt(x * x + y * y);
      let k1 = 0, k2 = 0, d1 = Infinity, d2 = Infinity;
      for (let k = 0; k < spokes.length; k++) {
        const d = axisDist(W, spokes[k], x, y);
        if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; }
      }
      const cn = coastN(gx, gy);
      const inCommons = r < W.hub + cmn.wobble * ringN(gx, gy);
      let land = inCommons || d1 < W.half + coast.wobble * cn;
      if (!land) {
        for (const p of passes) {
          if (Math.abs(r - p.r) < p.half + passWob * cn && between(p.a, p.b, x, y)) { land = true; break; }
        }
      }
      /* the region: of the two nearest axes, the one nearer the warped point */
      const wx = x + warp.amount * warpX(gx, gy), wy = y + warp.amount * warpY(gx, gy);
      const best = spokes.length > 1 && axisDist(W, spokes[k2], wx, wy) < axisDist(W, spokes[k1], wx, wy) ? spokes[k2].rid : spokes.length ? spokes[k1].rid : 0;
      if (!land) { cls[i] = C.ocean; reg[i] = best; continue; }
      cls[i] = C.ground;
      let inAnchor = false;
      for (const an of anchors) {
        if (ax >= an.core.x0 && ax < an.core.x1 && ay >= an.core.y0 && ay < an.core.y1) { inAnchor = true; break; }
      }
      if (inAnchor) { cls[i] = C.anchor; reg[i] = townId != null ? townId : best; continue; }
      if (T && townId != null) {
        const tx = ax - g.cx, ty = ay - g.cy;
        if (tx >= townBox.x0 && tx <= townBox.x1 && ty >= townBox.y0 && ty <= townBox.y1 && TS.rects.some((r) => inWobblyRect(tx, ty, r, TE, seed + 53, g.cx, g.cy, townReach))) { reg[i] = townId; continue; }
      }
      if (inCommons && commonsId != null) { reg[i] = commonsId; continue; }
      reg[i] = best;
      const t = Math.max(1, tierAt(W, r + tw.amount * tierN(gx, gy)));
      tier[i] = t;
      band[i] = stageOf(W, t);
    }
  }

  /* ── stamping helpers (positions in float cells) ── */
  const any = () => true;
  function stampDisc(fx, fy, r, k, can, rid) {
    const xa = Math.max(0, Math.floor(fx - r - 1)), xb = Math.min(bw - 1, Math.ceil(fx + r + 1));
    const ya = Math.max(0, Math.floor(fy - r - 1)), yb = Math.min(bh - 1, Math.ceil(fy + r + 1));
    const r2 = r * r;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const dx = x + 0.5 - fx, dy = y + 0.5 - fy;
      if (dx * dx + dy * dy > r2) continue;
      const i = y * bw + x;
      if (!can(cls[i], i)) continue;
      cls[i] = k;
      if (rid != null) reg[i] = rid;
    }
  }
  function stampBlob(fx, fy, r, k, can, nseed) {
    const xa = Math.max(0, Math.floor(fx - r * 1.45)), xb = Math.min(bw - 1, Math.ceil(fx + r * 1.45));
    const ya = Math.max(0, Math.floor(fy - r * 1.45)), yb = Math.min(bh - 1, Math.ceil(fy + r * 1.45));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * bw + x;
      if (!can(cls[i], i)) continue;
      const dx = x + 0.5 - fx, dy = y + 0.5 - fy;
      const d = Math.sqrt(dx * dx + dy * dy) / r;
      if (d + 0.32 * valueNoise((gx0 + x) * 0.12, (gy0 + y) * 0.12, nseed) < 1) cls[i] = k;
    }
  }
  function stampRidge(pts, r, k, can, nseed) {
    let xa = Infinity, ya = Infinity, xb = -Infinity, yb = -Infinity;
    for (const p of pts) { xa = Math.min(xa, p[0]); ya = Math.min(ya, p[1]); xb = Math.max(xb, p[0]); yb = Math.max(yb, p[1]); }
    xa = Math.max(0, Math.floor(xa - r * 1.5)); ya = Math.max(0, Math.floor(ya - r * 1.5));
    xb = Math.min(bw - 1, Math.ceil(xb + r * 1.5)); yb = Math.min(bh - 1, Math.ceil(yb + r * 1.5));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * bw + x;
      if (!can(cls[i], i)) continue;
      let d = Infinity;
      for (let s = 0; s < pts.length - 1; s++) d = Math.min(d, segDist(x + 0.5, y + 0.5, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]));
      if (d / r + 0.3 * valueNoise((gx0 + x) * 0.14, (gy0 + y) * 0.14, nseed) < 1) cls[i] = k;
    }
  }
  /* v2.3.2977: a rectangle whose sides wander (`E` as TOWN_EDGE): a cell is
     in when it is inside the rectangle grown, or shrunk, by edgeWobble where
     it stands */
  function stampRectEdge(rx0, ry0, rx1, ry1, k, can, rid, E, nseed) {
    const reach = edgeReach(E), m = reach + S, r = { x0: rx0, y0: ry0, x1: rx1, y1: ry1 };
    const xa = Math.max(0, Math.floor(cellX(g.cx + rx0 - m) - 1)), xb = Math.min(bw - 1, Math.ceil(cellX(g.cx + rx1 + m) + 1));
    const ya = Math.max(0, Math.floor(cellY(g.cy + ry0 - m) - 1)), yb = Math.min(bh - 1, Math.ceil(cellY(g.cy + ry1 + m) + 1));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      if (!inWobblyRect(artX(x) - g.cx, artY(y) - g.cy, r, E, nseed, g.cx, g.cy, reach)) continue;
      const i = y * bw + x;
      if (!can(cls[i], i)) continue;
      cls[i] = k;
      if (rid != null) reg[i] = rid;
    }
  }
  /* art-px rectangle relative to the world centre, by cell centres */
  function stampRect(rx0, ry0, rx1, ry1, k, can, rid) {
    const xa = Math.max(0, Math.floor(cellX(g.cx + rx0) - 1)), xb = Math.min(bw - 1, Math.ceil(cellX(g.cx + rx1) + 1));
    const ya = Math.max(0, Math.floor(cellY(g.cy + ry0) - 1)), yb = Math.min(bh - 1, Math.ceil(cellY(g.cy + ry1) + 1));
    for (let y = ya; y <= yb; y++) {
      const ay = artY(y) - g.cy;
      if (ay < ry0 || ay >= ry1) continue;
      for (let x = xa; x <= xb; x++) {
        const ax = artX(x) - g.cx;
        if (ax < rx0 || ax >= rx1) continue;
        const i = y * bw + x;
        if (!can(cls[i], i)) continue;
        cls[i] = k;
        if (rid != null) reg[i] = rid;
      }
    }
  }

  /* ── pass 2: scatter each region's features on a hashed lattice ──
     One candidate per L x L lattice cell (L from the density), jittered
     inside it by a hash of the cell -- so a feature's place, size and shape
     depend only on WHERE it is, never on how many came before it. */
  for (const rk of regionIds) {
    const rd = plan.regions[rk];
    if (!rd.features) continue;
    const rid = R[rk];
    rd.features.forEach((f, fi) => {
      const k = C[f.class];
      const L = Math.sqrt(1e6 / f.density);
      const fs = (strSeed(rk) ^ seed) + Math.imul(fi + 1, 7919);
      const bandOk = f.in ? new Set(f.in.map((k) => k - 1)) : null;   /* stages 1-4 in the plan, 0-3 in `band` */
      const i0 = Math.floor((x0 - g.cx) / L) - 1, i1 = Math.floor((x0 + bw * S - g.cx) / L) + 1;
      const j0 = Math.floor((y0 - g.cy) / L) - 1, j1 = Math.floor((y0 + bh * S - g.cy) / L) + 1;
      const can = (c, i) => reg[i] === rid && (c === C.ground || c === C.obstacle);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = g.cx + (i + hash2(i, j, fs)) * L, py = g.cy + (j + hash2(i, j, fs + 1)) * L;
        const ci = cellIndex(px, py);
        if (ci < 0 || reg[ci] !== rid || cls[ci] !== C.ground) continue;
        if (bandOk && !bandOk.has(band[ci])) continue;
        const r = (f.r[0] + hash2(i, j, fs + 2) * (f.r[1] - f.r[0])) / S;
        const fx = cellX(px), fy = cellY(py), ns = fs + Math.imul(i, 31) + Math.imul(j, 17);
        if (f.shape === 'ridge') {
          let ux = hash2(i, j, fs + 3) * 2 - 1, uy = hash2(i, j, fs + 4) * 2 - 1;
          const ul = Math.sqrt(ux * ux + uy * uy) || 1; ux /= ul; uy /= ul;
          const len = (f.len[0] + hash2(i, j, fs + 5) * (f.len[1] - f.len[0])) / S;
          const q1 = (hash2(i, j, fs + 6) - 0.5) * len * 0.35, q2 = (hash2(i, j, fs + 7) - 0.5) * len * 0.35;
          stampRidge([
            [fx - ux * len / 2, fy - uy * len / 2],
            [fx - ux * len / 6 - uy * q1, fy - uy * len / 6 + ux * q1],
            [fx + ux * len / 6 - uy * q2, fy + uy * len / 6 + ux * q2],
            [fx + ux * len / 2, fy + uy * len / 2],
          ], r, k, can, ns);
        } else {
          stampBlob(fx, fy, r, k, can, ns);
        }
      }
    });
  }

  const pois = [], routes = [], lots = [];
  const landAt = (c) => c !== C.ocean && c !== C.anchor;

  /* ── pass 3: the rivers, and the falls they cut through ── */
  for (const rv of plan.rivers || []) {
    const rs = seed + strSeed(rv.id);
    let pts = wobbleCurve(smoothCurve(rv.pts.map(toArt), 4), rv.wobble || 0, rs, 520, 300);
    /* the falls: a rock ledge across the river, stamped first so the river cuts it */
    for (const fl of rv.falls || []) {
      const [fx, fy] = toArt(fl.at);
      let bestK = 0, bestD = Infinity;
      pts.forEach((p, k) => { const d = (p[0] - fx) * (p[0] - fx) + (p[1] - fy) * (p[1] - fy); if (d < bestD) { bestD = d; bestK = k; } });
      const a = pts[Math.max(0, bestK - 8)], b = pts[Math.min(pts.length - 1, bestK + 8)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
      const half = (fl.len * P) / 2, cfx = cellX(pts[bestK][0]), cfy = cellY(pts[bestK][1]);
      stampRidge([[cfx + ty * half / S, cfy - tx * half / S], [cfx - ty * half / S, cfy + tx * half / S]], 34 / S, C.cliff,
        (c) => c === C.ground || c === C.obstacle || c === C.water, rs + 5);
      pois.push({ kind: 'falls', id: rv.id + '-falls', name: fl.name, paint: fl.paint, x: pts[bestK][0], y: pts[bestK][1], r: 120 });
    }
    /* the river ends where it reaches the sea */
    let end = pts.length;
    for (let k = 0; k < pts.length; k++) {
      const ci = cellIndex(pts[k][0], pts[k][1]);
      if (ci >= 0 && cls[ci] === C.ocean) { end = k; break; }
    }
    const total = pts.length - 1 || 1;
    pts.forEach((p, k) => {
      const t = k / total;
      const half = (rv.width[0] + (rv.width[1] - rv.width[0]) * t) / 2;
      stampDisc(cellX(p[0]), cellY(p[1]), half / S, C.river, landAt, null);
    });
    routes.push({ kind: 'river', id: rv.id, name: rv.name, pts: thin(pts.slice(0, end), 4) });
  }

  /* ── pass 4: the roads, and a bridge wherever one meets a river ── */
  const roadDense = [];
  /* ═══ v2.3.2949: PLANK DECKS ═══
     Owner, on the Mill Bridge in the Ground Studio: "The bridge needs to
     take shrink the tiles and maybe make them line up using your coding I
     had to change the checker pattern wood the original prompt made it
     didn't look right."  Every boardwalk and bridge is now a DECK: a
     rectangle of cells with the way you walk along it (`along`, 'x' or
     'y'), so the ground can lay the boards across it, a set width, lined up
     with its ends (ground.js, planksOf).  A bridge used to be the road's
     own discs stamped wider over the water: rounded, ragged ends, and a
     staircase on a diagonal crossing, which no row of boards can line up
     with.  Now it is a straight deck laid the short way across the river
     (along x or y, whichever crosses less water at the road's crossing),
     reaching BRIDGE_PAD cells onto both banks, as wide as the road's old
     bridge; and where the road reached the bank off the deck's end (a
     diagonal crossing), a short stretch of road joins it on (joinRoad). */
  const decks = [];
  const BRIDGE_PAD = 2;
  const wetAt = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && cls[y * bw + x] === C.river;
  const bridgeDeck = (mid, half) => {
    const fx = cellX(mid[0]), fy = cellY(mid[1]);
    const mx = Math.min(bw - 1, Math.max(0, Math.floor(fx))), my = Math.min(bh - 1, Math.max(0, Math.floor(fy)));
    const run = (dx, dy) => { let k = 0; while (k < 96 && wetAt(mx + dx * (k + 1), my + dy * (k + 1))) k++; return k; };
    const alongX = run(1, 0) + run(-1, 0) <= run(0, 1) + run(0, -1);
    const W = Math.max(3, Math.round((2 * (half + 6)) / S));
    /* the river's reach across every row (or column) of the deck, so a
       river running aslant is crossed bank to bank on all of them */
    let lo = Infinity, hi = -Infinity;
    const c0 = Math.round((alongX ? fy : fx) - W / 2);
    for (let c = c0; c < c0 + W; c++) {
      const at = (a) => (alongX ? wetAt(a, c) : wetAt(c, a));
      const m = alongX ? mx : my;
      /* from the middle out, over the few land cells a slanting bank puts
         there, to the water's far side in each direction */
      for (const dir of [-1, 1]) {
        let a = m, dry = 0, last = null;
        for (let k = 0; k < 96 && dry <= W; k++, a += dir) {
          if (at(a)) { last = a; dry = 0; } else if (last != null || k > W) dry++;
        }
        if (last != null) { lo = Math.min(lo, last); hi = Math.max(hi, last); }
      }
    }
    if (!(lo <= hi)) { lo = alongX ? mx : my; hi = lo; }
    const n = alongX ? bw : bh, m2 = alongX ? bh : bw;
    const a0 = Math.max(0, lo - BRIDGE_PAD), a1 = Math.min(n, hi + 1 + BRIDGE_PAD);
    const b0 = Math.max(0, c0), b1 = Math.min(m2, c0 + W);
    return alongX ? { along: 'x', x0: a0, x1: a1, y0: b0, y1: b1 } : { along: 'y', x0: b0, x1: b1, y0: a0, y1: a1 };
  };
  /* the road to each end of a deck: from the middle of the end to the
     nearest point of the road on that bank, only over land */
  const joinRoad = (deck, samples, rr, half) => {
    const ax = (x) => x0 + x * S, ay = (y) => y0 + y * S;
    const ends = deck.along === 'x'
      ? [[ax(deck.x0) + S / 2, (ay(deck.y0) + ay(deck.y1)) / 2], [ax(deck.x1) - S / 2, (ay(deck.y0) + ay(deck.y1)) / 2]]
      : [[(ax(deck.x0) + ax(deck.x1)) / 2, ay(deck.y0) + S / 2], [(ax(deck.x0) + ax(deck.x1)) / 2, ay(deck.y1) - S / 2]];
    const before = samples.slice(0, rr.a), after = samples.slice(rr.b + 1);
    const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    const nearest = (list, p) => { let best = null, bd = Infinity; for (const q of list) { const d = d2(p, q); if (d < bd) { bd = d; best = q; } } return best; };
    /* which bank's road goes to which end: the pairing with less road to lay */
    const pair = (e, list) => { const q = list.length ? nearest(list, e) : null; return { e, q, d: q ? d2(e, q) : Infinity }; };
    const A = [pair(ends[0], before), pair(ends[1], after)], B = [pair(ends[0], after), pair(ends[1], before)];
    const cost = (P) => P.reduce((s, p) => s + Math.sqrt(p.d), 0);
    const can = (c) => landAt(c) && c !== C.river && c !== C.bridge;
    for (const { e, q } of cost(A) <= cost(B) ? A : B) {
      if (!q) continue;
      const L = Math.sqrt(d2(e, q)), steps = Math.max(1, Math.ceil(L / 4));
      for (let k = 0; k <= steps; k++) stampDisc(cellX(e[0] + (q[0] - e[0]) * k / steps), cellY(e[1] + (q[1] - e[1]) * k / steps), half / S, C.path, can, null);
    }
  };
  for (const rd of plan.roads || []) {
    const ctrl = rd.pts.map(toArt);
    const rs = seed + strSeed(rd.id);
    const samples = [];
    for (let s = 0; s < ctrl.length - 1; s++) {
      const a = ctrl[s], b = ctrl[s + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.sqrt(dx * dx + dy * dy) || 1;
      const tx = dx / L, ty = dy / L;
      const steps = Math.max(1, Math.ceil(L / 4));
      /* wobble fades to zero at both ends of every segment, so forks that
         start ON a trunk point meet the trunk exactly */
      const amp = (rd.wobble != null ? rd.wobble : 80) * Math.min(1, L / 700);
      for (let k = s ? 1 : 0; k <= steps; k++) {
        const t = k / steps;
        const bump = Math.min(1, 6 * t * (1 - t));
        const w = amp * bump * fbm((t * L) / 270, 0.5, rs + s * 101, 3);
        samples.push([a[0] + dx * t - ty * w, a[1] + dy * t + tx * w]);
      }
    }
    const half = rd.half / S;
    for (const p of samples) stampDisc(cellX(p[0]), cellY(p[1]), half, C.path, (c) => landAt(c) && c !== C.river, null);
    roadDense.push({ rd, samples });
    routes.push({ kind: 'road', id: rd.id, name: rd.name, to: rd.to || null, pts: thin(samples, 4) });
  }
  for (const { rd, samples } of roadDense) {
    let run = null;
    const runs = [];
    samples.forEach((p, k) => {
      const ci = cellIndex(p[0], p[1]);
      if (ci >= 0 && cls[ci] === C.river) { if (!run) run = { a: k, b: k }; else run.b = k; } else if (run) { runs.push(run); run = null; }
    });
    if (run) runs.push(run);
    const named = (plan.bridges || {})[rd.id] || {};
    for (const rr of runs) {
      const mid = samples[(rr.a + rr.b) >> 1];
      /* v2.3.2949: a straight deck, square at both ends, with the road
         joined to each end (bridgeDeck, joinRoad below) */
      const deck = bridgeDeck(mid, rd.half);
      for (let y = deck.y0; y < deck.y1; y++) for (let x = deck.x0; x < deck.x1; x++) if (landAt(cls[y * bw + x])) cls[y * bw + x] = C.bridge;
      decks.push({ kind: 'bridge', road: rd.id, ...deck });
      joinRoad(deck, samples, rr, rd.half);
      pois.push({ kind: 'bridge', id: rd.id + '-bridge-' + rr.a, name: named.name || 'a bridge', road: rd.name,
        paint: named.paint || null, x: mid[0], y: mid[1], r: 60 });
    }
  }

  /* ── pass 5: Brotown -- streets, the square, boardwalks and empty plots ── */
  if (T && townId != null) {
    stampRect(-T.main, -T.gate, T.main, T.gate, C.street, landAt, townId);
    stampRect(-T.gate, -T.row, T.gate, T.row, C.street, landAt, townId);
    /* v2.3.2975: the front walks and the Back Lane, so every door opens
       onto a street (townPlan) */
    for (const f of TS.fronts) stampRect(f.x0, f.y0, f.x1, f.y1, C.street, landAt, townId);
    stampRect(-T.square, -T.square, T.square, T.square, C.plaza, landAt, townId);
    for (const lot of TS.lots) {
      stampRect(lot.x0, lot.y0, lot.x1, lot.y1, C.lot, landAt, townId);
      /* v2.3.2960: only when the plan lays them (plan.js `boardwalks`:
         put away until the buildings, whose porches they become) */
      if (lot.walk && T.boardwalks) {
        stampRect(lot.walk.x0, lot.walk.y0, lot.walk.x1, lot.walk.y1, C.boardwalk, landAt, townId);
        /* v2.3.2949: a deck along its street -- the cells stampRect took */
        const cx = (rx) => Math.ceil((g.cx + rx - x0) / S - 0.5), cy = (ry) => Math.ceil((g.cy + ry - y0) / S - 0.5);
        /* v2.3.2975: along each plot's door, its south side: boards run east-west */
        decks.push({ kind: 'boardwalk', lot: lot.id, along: 'x',
          x0: cx(lot.walk.x0), x1: cx(lot.walk.x1), y0: cy(lot.walk.y0), y1: cy(lot.walk.y1) });
      }
      /* v2.3.2975: and where its door is (the middle of its south edge) */
      lots.push({ id: lot.id, name: lot.name, today: lot.today || null, arm: lot.arm, side: lot.side || null,
        x0: g.cx + lot.x0, y0: g.cy + lot.y0, x1: g.cx + lot.x1, y1: g.cy + lot.y1, town: true,
        foot: { x: g.cx + lot.foot.x, y: g.cy + lot.foot.y } });
    }
  }

  /* ── pass 6: the railway -- after the roads, so it crosses them ── */
  for (const rl of plan.rails || []) {
    const pts = smoothCurve(rl.pts.map(toArt), 4);
    const can = (c) => landAt(c) && c !== C.river && !TOWN_CLASSES.has(c) && c !== C.lot && c !== C.bridge;
    for (const p of pts) stampDisc(cellX(p[0]), cellY(p[1]), (plan.classes.rail.half || 14) / S, C.rail, can, null);
    routes.push({ kind: 'rail', id: rl.id, name: rl.name, abandoned: !!rl.abandoned, paint: rl.paint || null, pts: thin(pts, 4) });
  }

  /* ── pass 7: empty plots outside town, for sprites added later ── */
  for (const pl of plan.places || []) {
    const [px, py] = toArt(pl.at);
    const can = (c) => landAt(c) && c !== C.river && c !== C.path && c !== C.rail && c !== C.bridge && !TOWN_CLASSES.has(c);
    let box;
    if (pl.r) {
      stampDisc(cellX(px), cellY(py), pl.r / S, C.lot, can, null);
      box = { x0: px - pl.r, y0: py - pl.r, x1: px + pl.r, y1: py + pl.r };
    } else {
      const w = pl.size[0], h = pl.size[1];
      /* v2.3.2977: its sides wander, as the town's edge does */
      stampRectEdge(px - g.cx - w / 2, py - g.cy - h / 2, px - g.cx + w / 2, py - g.cy + h / 2, C.lot, can, null, PLACE_EDGE, strSeed(pl.id) + 71);
      box = { x0: px - w / 2, y0: py - h / 2, x1: px + w / 2, y1: py + h / 2 };
    }
    lots.push({ id: pl.id, name: pl.name, round: !!pl.r, ...box, town: false });
    pois.push({ kind: 'place', id: pl.id, name: pl.name, paint: pl.paint || '', x: px, y: py, r: pl.r || Math.max(pl.size[0], pl.size[1]) / 2 });
  }

  /* ── pass 8: the landmarks, and a keystone gate at every spoke's tip ──
     A landmark sits at `at` (squares), or at the middle of `tier` on its
     spoke, `side` squares right of the road; a gate at the spoke's tip,
     where its road ends. */
  const stampMark = (rk, px, py, rad, k, nseed) => {
    const cx = cellX(px), cy = cellY(py), r = rad / S;
    const xa = Math.max(0, Math.floor(cx - r * 1.45)), xb = Math.min(bw - 1, Math.ceil(cx + r * 1.45));
    const ya = Math.max(0, Math.floor(cy - r * 1.45)), yb = Math.min(bh - 1, Math.ceil(cy + r * 1.45));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * bw + x;
      if (!landAt(cls[i]) || TOWN_CLASSES.has(cls[i]) || cls[i] === C.lot || cls[i] === C.river) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (Math.sqrt(dx * dx + dy * dy) / r + 0.22 * valueNoise((gx0 + x) * 0.09, (gy0 + y) * 0.09, nseed) < 1) {
        cls[i] = k; reg[i] = R[rk];
      }
    }
  };
  for (const rk of regionIds) {
    const rd = plan.regions[rk];
    const sp = W.byId[rk];
    const lm = rd.landmark;
    const at = lm && (lm.at || (sp && lm.tier ? spokePoint(sp, W.tierMid(lm.tier), lm.side || 0) : null));
    if (lm && at) {
      const [lx, ly] = toArt(at);
      stampMark(rk, lx, ly, lm.r, C.landmark, seed + 500 + strSeed(rk));
      pois.push({ kind: 'landmark', id: rk, region: rk, name: lm.name, x: lx, y: ly, r: lm.r });
    }
    if (rd.gate && sp) {
      const [gx, gy] = toArt(spokePoint(sp, W.gateR));
      stampMark(rk, gx, gy, rd.gate.r, C.gate, seed + 700 + strSeed(rk));
      pois.push({ kind: 'gate', id: rk + '-gate', region: rk, realm: rd.realm, name: rd.gate.name, x: gx, y: gy, r: rd.gate.r });
    }
  }

  /* the passes, for the prompt: where each one's middle is */
  for (const rd of plan.roads || []) {
    if (!rd.pass) continue;
    const m = rd.pts[rd.pts.length >> 1];
    const [mx, my] = toArt(m);
    pois.push({ kind: 'pass', id: rd.id, name: rd.name, a: rd.pass.a, b: rd.pass.b, tier: rd.pass.tier, level: rd.pass.level,
      x: mx, y: my, r: (plan.wheel.passZones * W.Z * P) / 2 });
  }

  const counts = { classes: new Array(CLASS_IDS.length).fill(0), regions: new Array(regionIds.length).fill(0) };
  for (let i = 0; i < n; i++) { counts.classes[cls[i]]++; counts.regions[reg[i]]++; }

  return {
    w: bw, h: bh, scale: S, x0, y0, W: g.W, H: g.H,
    cls, reg, band, tier, regionIds, classIds: CLASS_IDS, wheel: W,
    anchors, pois, lots, routes, counts,
    /* v2.3.2949: every boardwalk and bridge, in cells, with the way along it */
    decks,
    landmarks: pois.filter((p) => p.kind === 'landmark'),
    gates: pois.filter((p) => p.kind === 'gate'),
    hash: fnv1a(cls, reg, band, tier),
  };

}

/* The fingerprint of the plan under one rectangle (a square): what a
   painted square is checked against, so a later change to the plan -- or a
   growth that should have changed nothing -- names exactly the squares it
   touched. */
export function planKey(bp, rect) {
  const S = bp.scale;
  const bx0 = Math.max(0, Math.floor((rect.x - bp.x0) / S)), by0 = Math.max(0, Math.floor((rect.y - bp.y0) / S));
  const bx1 = Math.min(bp.w, Math.ceil((rect.x + rect.w - bp.x0) / S)), by1 = Math.min(bp.h, Math.ceil((rect.y + rect.h - bp.y0) / S));
  const w = Math.max(0, bx1 - bx0), h = Math.max(0, by1 - by0);
  const a = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (by0 + y) * bp.w + bx0 + x, o = (y * w + x) * 3;
    a[o] = bp.cls[i]; a[o + 1] = bp.reg[i]; a[o + 2] = bp.band[i];
  }
  return fnv1a(a, `${rect.x},${rect.y},${rect.w},${rect.h}`);
}

/* ── colours ── */

/* RGB for every (class, region) pair, as the sketch shows it. */
export function colorTable(plan, bp) {
  const nr = bp.regionIds.length;
  const table = new Array(CLASS_IDS.length * nr);
  const K = plan.classes;
  for (let k = 0; k < CLASS_IDS.length; k++) for (let r = 0; r < nr; r++) {
    const rd = plan.regions[bp.regionIds[r]] || {};
    const cid = CLASS_IDS[k];
    let hex;
    if (cid === 'ground') hex = rd.ground;
    else if (cid === 'obstacle') hex = rd.obstacle || '#3c6b2c';
    else if (cid === 'water') hex = rd.water || K.water.color;
    else if (cid === 'landmark') hex = (rd.landmark && rd.landmark.color) || '#999999';
    else if (cid === 'gate') hex = (rd.gate && rd.gate.color) || '#999999';
    /* The anchor's CORE is fully opaque painting, so no template ever shows
       this colour -- only the overview does, where "the painting is here" is
       the point. */
    else if (cid === 'anchor') hex = (plan.regions.town && plan.regions.town.ground) || '#b98f55';
    else hex = (K[cid] && K[cid].color) || '#ff00ff';
    table[k * nr + r] = hexToRgb(hex || '#808080');
  }
  return table;
}

/* A human name for a (class, region) colour, for the prompt's legend. */
export function colorNameOf(plan, cid, rid) {
  const rd = plan.regions[rid] || {};
  const K = plan.classes;
  if (cid === 'ground') return rd.groundName;
  if (cid === 'obstacle') return rd.obstacleName;
  if (cid === 'water') return rd.waterName || K.water.colorName;
  if (cid === 'landmark') return rd.landmark && rd.landmark.colorName;
  if (cid === 'gate') return rd.gate && rd.gate.colorName;
  return K[cid] && K[cid].colorName;
}

/* ── the sketch ──
   Renders the blueprint over `rect` (art px, frame coordinates) into an
   outW x outH RGBA buffer.

   Taking the nearest cell would draw every outline as 8 px stairs, and the
   model copies what it is shown -- a stair-stepped lake comes back as a
   stair-stepped lake.  So each class present gets a membership field
   (1 where the cell is that class), blurred over a couple of cells, and
   every output pixel takes the class whose blurred membership is highest
   there: the outlines come out as smooth curves through the cell corners.
   Ground colour is blended across region borders over ~80 art px so the
   sketch itself asks for a gradual change of landscape. */
export function renderSketch(plan, bp, rect, outW, outH, table) {
  table = table || colorTable(plan, bp);
  const S = bp.scale, nr = bp.regionIds.length;
  const out = new Uint8ClampedArray(outW * outH * 4);

  /* the rect plus a margin, in cells */
  const M = 8;
  const gx0 = Math.floor((rect.x - bp.x0) / S) - M, gy0 = Math.floor((rect.y - bp.y0) / S) - M;
  const gw = Math.ceil(rect.w / S) + 2 * M + 2, gh = Math.ceil(rect.h / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, gx0 + x)), by = Math.min(bp.h - 1, Math.max(0, gy0 + y));
    return by * bp.w + bx;
  };

  /* blurred ground-colour field */
  const field = new Float32Array(gw * gh * 3);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const c = table[C.ground * nr + bp.reg[cellAt(x, y)]];
    const o = (y * gw + x) * 3;
    field[o] = c[0]; field[o + 1] = c[1]; field[o + 2] = c[2];
  }
  boxBlur3(field, gw, gh, 4);
  boxBlur3(field, gw, gh, 4);

  /* blurred membership per class present */
  const present = [];
  const memb = [];
  {
    const seen = new Uint8Array(CLASS_IDS.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) seen[bp.cls[cellAt(x, y)]] = 1;
    for (let k = 0; k < CLASS_IDS.length; k++) if (seen[k]) present.push(k);
    for (const k of present) {
      const f = new Float32Array(gw * gh);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) f[y * gw + x] = bp.cls[cellAt(x, y)] === k ? 1 : 0;
      boxBlur1(f, gw, gh, 1);
      boxBlur1(f, gw, gh, 1);
      memb.push(f);
    }
  }

  const sx = rect.w / outW, sy = rect.h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const gyf = (rect.y + (oy + 0.5) * sy - bp.y0) / S - 0.5 - gy0;
    const gj = Math.min(gh - 2, Math.max(0, Math.floor(gyf)));
    const uy = Math.min(1, Math.max(0, gyf - gj));
    for (let ox = 0; ox < outW; ox++) {
      const gxf = (rect.x + (ox + 0.5) * sx - bp.x0) / S - 0.5 - gx0;
      const gi = Math.min(gw - 2, Math.max(0, Math.floor(gxf)));
      const ux = Math.min(1, Math.max(0, gxf - gi));
      const p00 = gj * gw + gi, p10 = p00 + 1, p01 = p00 + gw, p11 = p01 + 1;
      const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
      let k = present[0], kv = -1;
      for (let q = 0; q < present.length; q++) {
        const f = memb[q];
        const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
        if (v > kv) { kv = v; k = present[q]; }
      }
      let r, gcol, b;
      if (k === C.ground) {
        const o00 = p00 * 3, o10 = p10 * 3, o01 = p01 * 3, o11 = p11 * 3;
        r = field[o00] * w00 + field[o10] * w10 + field[o01] * w01 + field[o11] * w11;
        gcol = field[o00 + 1] * w00 + field[o10 + 1] * w10 + field[o01 + 1] * w01 + field[o11 + 1] * w11;
        b = field[o00 + 2] * w00 + field[o10 + 2] * w10 + field[o01 + 2] * w01 + field[o11 + 2] * w11;
      } else {
        /* the region of the nearest cell that really carries class k */
        const nx = Math.round(gxf), ny = Math.round(gyf);
        let rr = bp.reg[cellAt(nx, ny)], bestD = Infinity;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const ci = cellAt(nx + dx, ny + dy);
          if (bp.cls[ci] !== k) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; rr = bp.reg[ci]; }
        }
        const c = table[k * nr + rr];
        r = c[0]; gcol = c[1]; b = c[2];
      }
      const o = (oy * outW + ox) * 4;
      out[o] = r; out[o + 1] = gcol; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}

/* In-place separable box blur of a 1-channel float field. */
function boxBlur1(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { s += f[y * w + Math.min(w - 1, Math.max(0, x + d))]; n++; }
      tmp[x] = s / n;
    }
    f.set(tmp.subarray(0, w), y * w);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { s += f[Math.min(h - 1, Math.max(0, y + d)) * w + x]; n++; }
      tmp[y] = s / n;
    }
    for (let y = 0; y < h; y++) f[y * w + x] = tmp[y];
  }
}

/* In-place separable box blur of a 3-channel float field. */
function boxBlur3(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h) * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(w - 1, Math.max(0, x + d));
        const o = (y * w + xx) * 3;
        s0 += f[o]; s1 += f[o + 1]; s2 += f[o + 2]; n++;
      }
      tmp[x * 3] = s0 / n; tmp[x * 3 + 1] = s1 / n; tmp[x * 3 + 2] = s2 / n;
    }
    f.set(tmp.subarray(0, w * 3), y * w * 3);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const yy = Math.min(h - 1, Math.max(0, y + d));
        const o = (yy * w + x) * 3;
        s0 += f[o]; s1 += f[o + 1]; s2 += f[o + 2]; n++;
      }
      tmp[y * 3] = s0 / n; tmp[y * 3 + 1] = s1 / n; tmp[y * 3 + 2] = s2 / n;
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 3;
      f[o] = tmp[y * 3]; f[o + 1] = tmp[y * 3 + 1]; f[o + 2] = tmp[y * 3 + 2];
    }
  }
}

/* The whole blueprint as one image, one pixel per cell (1/8 scale) -- the
   builder's overview background.  Pixel (0, 0) is art (bp.x0, bp.y0). */
export function renderOverview(plan, bp, table) {
  table = table || colorTable(plan, bp);
  const nr = bp.regionIds.length;
  const out = new Uint8ClampedArray(bp.w * bp.h * 4);
  for (let i = 0; i < bp.w * bp.h; i++) {
    const c = table[bp.cls[i] * nr + bp.reg[i]];
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return out;
}

/* ── what a square contains ──
   Region and class shares (with centroids in 0..1 square coordinates), how
   much of each region is in each of its stages (`bands`), the tiers present,
   which classes touch each edge, and the points of interest inside.  This
   is what the prompt is written from. */
export function coverage(plan, bp, rect) {
  const S = bp.scale;
  const bx0 = Math.max(0, Math.floor((rect.x - bp.x0) / S)), by0 = Math.max(0, Math.floor((rect.y - bp.y0) / S));
  const bx1 = Math.min(bp.w, Math.ceil((rect.x + rect.w - bp.x0) / S)), by1 = Math.min(bp.h, Math.ceil((rect.y + rect.h - bp.y0) / S));
  const total = Math.max(1, (bx1 - bx0) * (by1 - by0));
  const regs = new Map(), kinds = new Map(), bands = new Map();
  const edges = { top: new Set(), right: new Set(), bottom: new Set(), left: new Set() };
  const E = 3;
  let tmin = Infinity, tmax = 0;
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const i = y * bp.w + x;
    const rid = bp.regionIds[bp.reg[i]], cid = CLASS_IDS[bp.cls[i]];
    const u = ((x + 0.5) * S + bp.x0 - rect.x) / rect.w, v = ((y + 0.5) * S + bp.y0 - rect.y) / rect.h;
    let e = regs.get(rid); if (!e) regs.set(rid, (e = { id: rid, n: 0, su: 0, sv: 0 }));
    e.n++; e.su += u; e.sv += v;
    const key = cid + ':' + rid;
    let f = kinds.get(key); if (!f) kinds.set(key, (f = { cls: cid, region: rid, n: 0, su: 0, sv: 0 }));
    f.n++; f.su += u; f.sv += v;
    if (cid !== 'ocean') {
      let b = bands.get(rid);
      if (!b) bands.set(rid, (b = Array.from({ length: STAGES }, (_, k) => ({ stage: k, n: 0, su: 0, sv: 0 }))));
      const bb = b[bp.band[i]];
      bb.n++; bb.su += u; bb.sv += v;
      const t = bp.tier[i];
      if (t) { if (t < tmin) tmin = t; if (t > tmax) tmax = t; }
    }
    if (y < by0 + E) edges.top.add(cid);
    if (y >= by1 - E) edges.bottom.add(cid);
    if (x < bx0 + E) edges.left.add(cid);
    if (x >= bx1 - E) edges.right.add(cid);
  }
  const fin = (m) => [...m.values()].map((e) => ({ ...e, frac: e.n / total, cx: e.su / e.n, cy: e.sv / e.n }))
    .sort((a, b) => b.n - a.n);
  const bandsOut = Object.create(null);
  for (const [rid, b] of bands) {
    const sum = b.reduce((s, e) => s + e.n, 0) || 1;
    bandsOut[rid] = b.map((e) => ({ stage: e.stage, n: e.n, frac: e.n / sum, cx: e.n ? e.su / e.n : 0.5, cy: e.n ? e.sv / e.n : 0.5 }));
  }
  const hit = (p) => p.x + p.r > rect.x && p.x - p.r < rect.x + rect.w && p.y + p.r > rect.y && p.y - p.r < rect.y + rect.h;
  const pois = bp.pois.filter(hit).map((p) => ({ ...p, cx: (p.x - rect.x) / rect.w, cy: (p.y - rect.y) / rect.h }));
  const landmarks = pois.filter((p) => p.kind === 'landmark');
  const anchors = bp.anchors.filter((a) => a.keep.x1 > rect.x && a.keep.x0 < rect.x + rect.w && a.keep.y1 > rect.y && a.keep.y0 < rect.y + rect.h);
  const lots = bp.lots.filter((l) => l.x1 > rect.x && l.x0 < rect.x + rect.w && l.y1 > rect.y && l.y0 < rect.y + rect.h);
  return { total, regions: fin(regs), classes: fin(kinds), bands: bandsOut, tiers: tmax ? [tmin, tmax] : null, edges, pois, landmarks, anchors, lots };
}

/* How a route (road, river, railway) passes through a rectangle: one entry
   per stretch inside it, with the edge it comes in by and the edge it
   leaves by -- null where it starts or ends inside.  Stretches shorter than
   `minPts` points (a road clipping a corner by a few pixels) are skipped. */
export function routeCrossings(route, rect, minPts = 2) {
  const inside = (p) => p[0] >= rect.x && p[0] < rect.x + rect.w && p[1] >= rect.y && p[1] < rect.y + rect.h;
  const edgeTo = (q) => {
    const over = { top: rect.y - q[1], bottom: q[1] - (rect.y + rect.h), left: rect.x - q[0], right: q[0] - (rect.x + rect.w) };
    let best = 'top', bv = -Infinity;
    for (const k in over) if (over[k] > bv) { bv = over[k]; best = k; }
    return best;
  };
  const out = [];
  let cur = null;
  const pts = route.pts;
  for (let k = 0; k < pts.length; k++) {
    const inn = inside(pts[k]);
    if (inn && !cur) cur = { from: k === 0 ? null : edgeTo(pts[k - 1]), to: null, n: 0, first: k, last: k };
    if (inn) { cur.n++; cur.last = k; }
    if (!inn && cur) { cur.to = edgeTo(pts[k]); out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((s) => s.n >= minPts);
}
