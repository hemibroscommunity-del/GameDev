/* ═══ v2.3.2975: PLACING THE OBJECTS ON THE WHEEL ═══
 *
 * Owner, 2026-10-02, with a zip of every object but the Town Hall: "Wire
 * this stuff into the game.  Put mayor bro in town too."
 *
 * Where every object made in the Object Studio (public/tools/objects/
 * catalog.js) stands on the Wheel, worked out from the blueprint
 * (layout.js), the same on every device: the ground worker runs it once on
 * the way in (ground-worker.js) and the game draws what it says
 * (src/rendering/wheelObjects.js).  Pure, no page: test-world-core.mjs runs
 * it in Node.
 *
 *   BUILDINGS     each on its plot (layout.js townPlan), its foot -- the
 *                 bottom of its steps -- on the plot's door
 *   THE TOWN      lamps along the streets and round the square, the well,
 *                 the bragging board and benches in the square, barrels,
 *                 crates, hay, troughs and hitching rails beside the porches
 *                 that suit them, a cart and hay in the yards, the town gate
 *                 over Main Street at both ends and signposts where every
 *                 street leaves town (TOWN_DRESSING, DOOR_PROPS)
 *   THE COMMONS   split-rail fences along the four Old Roads out of town,
 *                 haystacks in the fields between them, oaks and bushes in
 *                 the clumps the plan calls obstacles, orchard trees in
 *                 groves, stones, stumps and flowers here and there
 *   EACH LAND     its own objects (LANDS), stage by stage: the big ones thick
 *                 in the plan's obstacle clumps -- the woods, rock fields and
 *                 pylon yards the prompts always described and the ground
 *                 could never draw -- and sparse elsewhere, the rest
 *                 scattered, the shore things by the water
 *
 * NEVER on a road, a street, a bridge, the railway, water, lava, a cliff, a
 * plot, a camp, a landmark or a keystone gate, and nothing wild in town.  A
 * big object keeps clear of them by two cells (48 game px) so a trunk never
 * stands in a road, and its picture never covers the town.
 *
 * DETERMINISTIC.  Every candidate spot is a hashed point in its own lattice
 * cell (rng.js hash2), so whether something stands there, and what, depends
 * only on WHERE it is -- never on how many came before -- except the one
 * rule that a smaller thing does not stand on a bigger one's foot, which is
 * decided in a fixed order (big, then medium, then small).
 *
 * Positions are decided from the CATALOG, never from which pictures exist:
 * an object whose picture is not made yet keeps its place (the Town Hall
 * did, until v2.3.2976), and the game simply does not draw it, or let it
 * stop anyone.  So making a picture never moves anything else.
 *
 * OUT, in game px with the Wheel's top-left at 0 (as the ground worker's
 * pieces are): { kinds: [object ids], n, kind, piece, flip, x, y } -- x, y
 * the object's FOOT, where it touches the ground (its sprite's anchor, 0.5 1).
 * Each object's FOOTPRINT, the ground it stops you on, is footprintOf(id,
 * its picture's game size), worked out where the pictures are known.
 */
import { C, townPlan } from './layout.js';
import { hash2, fbm } from './rng.js';
import { gridInfo } from './grid.js';
import { objectCatalog } from '../../objects/catalog.js';

export const PLACING = 'v2.3.2975';

/* ── how much ground each object stops you on ──
   Shares of its picture's game size: `w` of its width, centred on its foot,
   and `d` back from its foot -- a share of its height, or game px when 1 or
   more.  None (null) for what you walk through: flowers, shells, small
   shrubs.  Measured off the owner's pictures: a building's footprint is its
   width and half its height (its roof is the other half, which you walk
   behind); a tree's is its trunk. */
const FOOT = {
  building: { w: 0.94, d: 0.5 },
  lamp: { w: 0.4, d: 10 }, barrel: { w: 0.8, d: 0.4 }, crate: { w: 0.85, d: 0.4 }, haybale: { w: 0.85, d: 0.45 },
  trough: { w: 0.9, d: 0.45 }, hitch: { w: 0.9, d: 12 }, bench: { w: 0.85, d: 0.35 }, well: { w: 0.75, d: 0.32 },
  signpost: { w: 0.25, d: 10 }, cart: { w: 0.8, d: 0.3 }, noticeboard: { w: 0.85, d: 12 },
  gate: { posts: 0.15, d: 18 },            /* two posts, the street open between them */
  fence: { w: 1, d: 12 }, 'fence-down': { w: 0.5, d: 0.85 },
  oak: { w: 0.15, d: 16 }, orchard: { w: 0.15, d: 14 }, bush: { w: 0.7, d: 0.35 }, haystack: { w: 0.8, d: 0.35 },
  stone: { w: 0.8, d: 0.4 }, flowers: null, stump: { w: 0.7, d: 0.3 },
  pine: { w: 0.14, d: 14 }, birch: { w: 0.14, d: 12 }, snowrock: { w: 0.8, d: 0.4 }, icespire: { w: 0.5, d: 0.2 }, frostbush: null,
  deadtree: { w: 0.14, d: 14 }, charstump: { w: 0.7, d: 0.3 }, basalt: { w: 0.8, d: 0.4 }, obsidian: { w: 0.6, d: 0.2 },
  cactus: { w: 0.45, d: 0.2 }, palm: { w: 0.12, d: 14 }, tumbleweed: null, skull: null, hoodoo: { w: 0.55, d: 0.25 }, sage: null,
  boulder: { w: 0.85, d: 0.42 }, crystal: { w: 0.6, d: 0.3 }, minecart: { w: 0.85, d: 0.3 }, rubble: null,
  pylon: { w: 0.5, d: 0.18 }, scrap: { w: 0.8, d: 0.35 }, coal: { w: 0.8, d: 0.35 }, coil: { w: 0.4, d: 0.15 },
  driftwood: { w: 0.8, d: 0.4 }, netpole: { w: 0.92, d: 12 }, rowboat: { w: 0.9, d: 0.35 }, searock: { w: 0.8, d: 0.4 }, shell: null, coral: null,
  slimetree: { w: 0.16, d: 16 }, toadstool: { w: 0.4, d: 0.2 }, mangrove: { w: 0.3, d: 0.18 }, scarecrow: { w: 0.2, d: 10 },
  jungletree: { w: 0.3, d: 24 }, wildfruit: { w: 0.15, d: 14 }, giantflower: { w: 0.25, d: 10 }, fern: null, stonewall: { w: 0.95, d: 0.35 },
};

/* The footprint of one object: [{ x0, y0, x1, y1 }] boxes (game px; one,
   or two for the town gate's posts), or [] for one you walk through.  `w`
   and `h` are its picture's game size; (x, y) its foot. */
export function footprintOf(id, kindOf, x, y, w, h) {
  const f = FOOT[id] !== undefined ? FOOT[id] : kindOf === 'building' ? FOOT.building : { w: 0.7, d: 0.3 };
  if (!f) return [];
  const d = Math.min(h, f.d >= 1 ? f.d : f.d * h);
  if (f.posts) {
    const pw = Math.max(8, f.posts * w);
    return [{ x0: x - w / 2, y0: y - d, x1: x - w / 2 + pw, y1: y }, { x0: x + w / 2 - pw, y0: y - d, x1: x + w / 2, y1: y }];
  }
  const fw = Math.max(8, f.w * w);
  return [{ x0: x - fw / 2, y0: y - d, x1: x + fw / 2, y1: y }];
}

/* Things that look the same mirrored -- most of nature, carts and boats --
   are flipped at random for variety; a building, a sign or anything with a
   horseshoe or a fish nailed the right way round is not. */
const NO_FLIP = new Set(['gate', 'signpost', 'noticeboard', 'hitch', 'lamp', 'well', 'bench', 'trough', 'fence', 'fence-down']);

/* ── each land's objects ──
   `big` thick in the obstacle clumps and sparse elsewhere; `mid` and
   `small` scattered.  A weight is one number, or four: one a stage (1-4,
   the land's looks from its edge to its gate).  `shore`: kinds found by the
   water (tried four times as often there, a third as often away from it). */
const LANDS = {
  commons: {
    /* the commons is the first thing outside town, and was bare at the
       spokes' density: everything a little thicker (`dense`, a multiplier
       on each layer's chance) */
    dense: { big: 2, mid: 2.4, small: 2.2 },
    big: [['oak', 1], ['orchard', 0.45]],
    mid: [['bush', 1], ['stone', 0.6], ['stump', 0.45], ['haystack', 0.15]],
    small: [['flowers', 1], ['stone', 0.25]],
  },
  frost: {
    big: [['birch', [1, 0.45, 0.1, 0]], ['pine', [0.5, 1, 0.7, 0.25]], ['icespire', [0, 0.1, 0.7, 1]]],
    mid: [['snowrock', 1], ['icespire', [0, 0, 0.25, 0.5]]],
    small: [['frostbush', [1, 0.7, 0.3, 0.15]], ['snowrock', 0.2]],
  },
  ember: {
    /* burnt land, but not bare: more of its rocks and dead trees */
    dense: { big: 1.5, mid: 1.6, small: 1.2 },
    big: [['deadtree', [1, 0.7, 0.35, 0.15]], ['obsidian', [0, 0.3, 0.7, 1]], ['basalt', [0.2, 0.4, 0.6, 0.8]]],
    mid: [['basalt', 1], ['obsidian', [0, 0.15, 0.4, 0.6]]],
    small: [['charstump', [1, 0.7, 0.35, 0.15]]],
  },
  sky: {
    big: [['palm', [0.8, 0.45, 0.15, 0.3]], ['hoodoo', [0.3, 0.7, 1, 1]]],
    mid: [['cactus', 1]],
    small: [['tumbleweed', 1], ['sage', 1], ['skull', 0.35]],
  },
  hollows: {
    big: [['boulder', 1], ['crystal', [0.15, 0.45, 0.9, 1]]],
    mid: [['boulder', 0.5], ['crystal', [0.15, 0.4, 0.7, 1]], ['minecart', 0.05]],
    small: [['rubble', 1]],
  },
  thunder: {
    /* a pylon yard, not a thicket of pylons */
    dense: { big: 0.65 },
    big: [['pylon', 1], ['coil', 0.6]],
    mid: [['scrap', 1], ['coal', 0.55]],
    small: [['scrap', 0.3]],
  },
  tidal: {
    big: [['searock', 1], ['netpole', 0.25]],
    mid: [['searock', 0.6], ['driftwood', [1, 0.7, 0.4, 0.2]], ['coral', [0.3, 0.6, 1, 1]], ['rowboat', 0.06]],
    small: [['shell', 1]],
    shore: ['driftwood', 'netpole', 'rowboat', 'shell'],
  },
  mist: {
    /* toadstools are its only middle and small things: fewer of them */
    dense: { big: 0.6, mid: 0.45, small: 0.3 },
    big: [['slimetree', 1], ['mangrove', 0.6]],
    mid: [['toadstool', 1], ['scarecrow', [0.08, 0.02, 0, 0]]],
    small: [['toadstool', 0.3]],
    shore: ['mangrove'],
  },
  verdant: {
    /* the plan's thickest clumps under the biggest trees: a sea of canopy
       you vanished under, so thinner */
    dense: { big: 0.4 },
    big: [['jungletree', [0.45, 1, 1, 1]], ['wildfruit', [1, 0.6, 0.3, 0.2]]],
    mid: [['giantflower', 1], ['stonewall', 0.2]],
    small: [['fern', 1]],
  },
};
/* the scatter: lattice spacing (game px), the chance a spot is used on the
   plan's obstacle clumps and on open ground, the cells it keeps from
   anything it may not stand on, and how far it keeps from the feet of the
   layers already placed (game px) */
const LAYERS = [
  { id: 'big', step: 116, inClump: 0.9, open: 0.05, clear: 2, gapBig: 0 },
  { id: 'mid', step: 92, inClump: 0.18, open: 0.08, clear: 1, gapBig: 46 },
  { id: 'small', step: 68, inClump: 0.1, open: 0.11, clear: 1, gapBig: 34 },
];
/* how wide a stretch of open ground goes bare, and how strongly: the scatter
   comes in drifts and clearings, not an even sprinkle */
const DRIFT = 1 / 1400, DRIFT_SEED = 9113;

/* ── the town's furniture, in plan art px from the world centre ──
   The square (the Town Hall in its middle, its door at (0, hall.d / 2); you
   arrive 192 art px south of the centre, and the way home is 85 west of
   that): benches either side of the hall's porch, the well and the bragging
   board in the south corners, a lamp at every corner of the square.  Lamps
   along the streets stand at the gaps between plots, never at a door. */
function townDressing(T, tp) {
  const out = [];
  const add = (id, x, y, piece) => out.push({ id, x, y, piece });
  const S = T.square, hd = T.hall.d / 2, hw = T.hall.w / 2;
  /* the square's south band is under the roofs of the saloon and the hotel
     (they stand just south of it, and a building's roof rises over the
     ground behind it), so the well and the bragging board stand in its
     north corners, where nothing covers them, and the benches either side
     of the hall's porch, in front of those roofs */
  add('bench', -(hw + 46), hd + 22, 0);
  add('bench', hw + 46, hd + 22, 1);
  add('well', S - 38, -(T.row + 44), 0);
  add('noticeboard', -(S - 40), -(T.row + 42), 0);
  for (const sx of [-1, 1]) {
    add('lamp', sx * (S - 8), T.row + 8, sx < 0 ? 0 : 1);
    add('lamp', sx * (hw + 12), -(S - 10), sx < 0 ? 1 : 0);
  }
  /* Main Street: both edges, beside each plot's side wall */
  const L = T.lot, ex = T.main + 8;
  for (const l of tp.lots) {
    if (l.arm !== 'north' && l.arm !== 'south') continue;
    if (l.side !== 'east') continue;
    const y = l.foot.y - L.d * 0.55;
    add('lamp', ex, y, 0);
    add('lamp', -ex, y, 1);
  }
  /* Market Row: the north edge at every gap between plots, and past the
     last; the south edge between the plots behind it */
  const gaps = [];
  for (const l of tp.lots) if (l.arm === 'east' && l.side === 'north') gaps.push(l.x0 - L.gap / 2, l.x1 + L.gap / 2);
  for (const gx of [...new Set(gaps.map((v) => Math.round(v)))]) {
    for (const sx of [-1, 1]) add('lamp', sx * gx, -(T.row + 6), gx % 2 ? 0 : 1);
  }
  for (const sx of [-1, 1]) add('lamp', sx * (tp.rowEnd + 30), T.row + 10, 1);
  /* the town gate over Main Street at both ends (square-on across a
     north-south street; Market Row's ends get signposts -- a gate seen
     side-on is a picture nobody drew) */
  add('gate', 0, -(T.gate - 24), 0);
  add('gate', 0, T.gate - 6, 0);
  add('signpost', T.main + 44, -(T.gate - 80), 0);
  add('signpost', -(T.main + 44), T.gate - 30, 1);
  add('signpost', T.gate - 40, -(T.row + 28), 0);
  add('signpost', -(T.gate - 40), T.row + 64, 1);
  /* the yards behind the Back Lane: the farm end's hay and the store's cart */
  const yb = tp.yS0 + L.walk + 44;
  add('cart', tp.rowEnd - L.w * 0.45, yb + 6, 0);
  add('haybale', -(tp.rowEnd - 40), yb, 0);
  add('haybale', -(tp.rowEnd - 92), yb + 8, 1);
  add('haybale', -(tp.rowEnd - 64), yb + 30, 3);
  add('barrel', tp.rowEnd - 30, yb - 4, 0);
  add('crate', tp.rowEnd - 64, yb + 2, 1);
  return out;
}
/* Beside each porch, by what goes on there (art px from its door: +x east,
   +y in front of it).  The steps are in the middle, so everything stands
   toward the porch's ends, where it blocks no door. */
const DOOR_PROPS = {
  blacksmith: [['barrel', -112, 16, 0], ['crate', 112, 18, 1]],
  woodworker: [['crate', -112, 16, 3], ['barrel', 114, 14, 2]],
  gemcutter: [['crate', 112, 16, 0]],
  sheriff: [['hitch', -104, 22, 0], ['trough', 104, 20, 0]],
  saloon: [['hitch', -104, 22, 1], ['trough', 106, 20, 1], ['barrel', 140, 14, 0]],
  gambling: [['barrel', 112, 16, 3]],
  hotel: [['bench', -104, 18, 1]],
  post: [['barrel', -110, 16, 1]],
  cookhouse: [['barrel', -110, 14, 0], ['crate', 112, 16, 2]],
  feedseed: [['haybale', -108, 18, 1], ['haybale', 112, 18, 2]],
  landoffice: [['haybale', 110, 18, 0]],
  guildhall: [['barrel', -110, 16, 2]],
  bank: [['bench', 112, 18, 0]],
  assay: [['crate', -110, 16, 1]],
  store: [['crate', -112, 18, 1], ['barrel', 112, 16, 0]],
  auction: [['crate', 110, 18, 3]],
};

/* ── the work ── */

const KEEP_CLEAR = (() => {
  const s = new Uint8Array(32);
  for (const k of ['path', 'street', 'plaza', 'lot', 'rail', 'bridge', 'water', 'river', 'ocean', 'lava', 'cliff', 'landmark', 'gate', 'boardwalk', 'anchor']) s[C[k]] = 1;
  return s;
})();

export function placeObjects(plan, bp, opts = {}) {
  const t0 = Date.now();
  const g = gridInfo(plan);
  const WPA = plan.worldPxPerArtPx;
  const S = bp.scale, BW = bp.w, BH = bp.h, N = BW * BH;
  const cellPx = S * WPA;                                       /* 24 game px a blueprint cell */
  const worldW = BW * cellPx, worldH = BH * cellPx;
  const seed = (plan.seed | 0) + 4243;
  const cat = opts.catalog || objectCatalog();
  const byId = Object.create(null);
  cat.forEach((e, k) => { byId[e.id] = { ...e, k }; });
  const kinds = cat.map((e) => e.id);
  const regIdx = Object.create(null);
  bp.regionIds.forEach((id, k) => { regIdx[id] = k; });
  const townR = regIdx.town, commonsR = regIdx.commons;
  /* art px from the centre -> game px from the Wheel's corner */
  const gx = (ax) => (g.cx + ax - bp.x0) * WPA, gy = (ay) => (g.cy + ay - bp.y0) * WPA;
  const cellOf = (x, y) => {
    const bx = Math.floor(x / cellPx), by = Math.floor(y / cellPx);
    return bx >= 0 && by >= 0 && bx < BW && by < BH ? by * BW + bx : -1;
  };

  /* how far every cell is from anything nothing wild may stand on, in
     cells (capped at 6): two sweeps of a city-block distance */
  const clear = new Uint8Array(N);
  for (let i = 0; i < N; i++) clear[i] = KEEP_CLEAR[bp.cls[i]] || bp.reg[i] === townR ? 0 : 6;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const i = y * BW + x;
    let v = clear[i];
    if (x > 0 && clear[i - 1] + 1 < v) v = clear[i - 1] + 1;
    if (y > 0 && clear[i - BW] + 1 < v) v = clear[i - BW] + 1;
    clear[i] = v;
  }
  for (let y = BH - 1; y >= 0; y--) for (let x = BW - 1; x >= 0; x--) {
    const i = y * BW + x;
    let v = clear[i];
    if (x < BW - 1 && clear[i + 1] + 1 < v) v = clear[i + 1] + 1;
    if (y < BH - 1 && clear[i + BW] + 1 < v) v = clear[i + BW] + 1;
    clear[i] = v;
  }
  /* ...and from water, for the shore things (cells, capped at 8) */
  const wet = new Uint8Array(N);
  const isWet = (c) => c === C.water || c === C.river || c === C.ocean;
  for (let i = 0; i < N; i++) wet[i] = isWet(bp.cls[i]) ? 0 : 8;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const i = y * BW + x;
    if (x > 0 && wet[i - 1] + 1 < wet[i]) wet[i] = wet[i - 1] + 1;
    if (y > 0 && wet[i - BW] + 1 < wet[i]) wet[i] = wet[i - BW] + 1;
  }
  for (let y = BH - 1; y >= 0; y--) for (let x = BW - 1; x >= 0; x--) {
    const i = y * BW + x;
    if (x < BW - 1 && wet[i + 1] + 1 < wet[i]) wet[i] = wet[i + 1] + 1;
    if (y < BH - 1 && wet[i + BW] + 1 < wet[i]) wet[i] = wet[i + BW] + 1;
  }

  /* a spatial hash of every foot placed, for "nothing stands on another's
     foot" (game px): each foot with its radius */
  const H = 128, hc = Math.ceil(worldW / H), hr = Math.ceil(worldH / H);
  const feet = new Map();
  const noteFoot = (x, y, r) => {
    const k = Math.floor(y / H) * hc + Math.floor(x / H);
    let a = feet.get(k);
    if (!a) feet.set(k, (a = []));
    a.push(x, y, r);
  };
  const nearFoot = (x, y, gap) => {
    if (!gap) return false;
    const i0 = Math.floor((x - 160) / H), i1 = Math.floor((x + 160) / H);
    const j0 = Math.floor((y - 160) / H), j1 = Math.floor((y + 160) / H);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i < 0 || j < 0 || i >= hc || j >= hr) continue;
      const a = feet.get(j * hc + i);
      if (!a) continue;
      for (let q = 0; q < a.length; q += 3) {
        const dx = a[q] - x, dy = a[q + 1] - y, r = gap + a[q + 2];
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
    return false;
  };

  const out = { kind: [], piece: [], flip: [], x: [], y: [] };
  const put = (id, x, y, piece, flip, r = 30) => {
    const e = byId[id];
    if (!e) return false;
    out.kind.push(e.k);
    out.piece.push(((piece | 0) % (e.count || 1) + (e.count || 1)) % (e.count || 1));
    out.flip.push(flip ? 1 : 0);
    out.x.push(Math.round(x * 2) / 2);
    out.y.push(Math.round(y * 2) / 2);
    noteFoot(x, y, r);
    return true;
  };

  /* ── 1. the buildings, and what stands at their doors ── */
  const T = plan.town;
  const townLots = bp.lots.filter((l) => l.town && l.foot);
  for (const l of townLots) {
    const fx = (l.foot.x - bp.x0) * WPA, fy = (l.foot.y - bp.y0) * WPA;
    put(l.id, fx, fy, 0, false);
    for (const [id, dx, dy, piece] of DOOR_PROPS[l.id] || []) put(id, fx + dx * WPA, fy + dy * WPA, piece, false);
  }
  /* ── 2. the town's furniture ── */
  if (T) {
    const tp = townPlan(T);
    for (const d of townDressing(T, tp)) put(d.id, gx(d.x), gy(d.y), d.piece, false);
    /* ...and a few barrels, crates and bales in the yards between: never on a
       street, a walk or the square, never under a building's roof (the ground
       behind a building, which its picture covers), never before a door */
    const ys = seed + 311, step = 150, tl = T.lot;
    const lotsArt = townLots.map((l) => ({ x0: l.x0 - g.cx, x1: l.x1 - g.cx, fx: l.foot.x - g.cx, fy: l.foot.y - g.cy,
      tall: l.id === T.hallLot.id ? T.hall.d * 2.2 : tl.tall }));
    const ext = T.gate + T.yard;
    for (let j = Math.floor(-ext / step); j <= Math.ceil(ext / step); j++) for (let i = Math.floor(-ext / step); i <= Math.ceil(ext / step); i++) {
      if (hash2(i, j, ys + 2) >= 0.3) continue;
      const ax = (i + 0.2 + 0.6 * hash2(i, j, ys)) * step, ay = (j + 0.2 + 0.6 * hash2(i, j, ys + 1)) * step;
      const x = gx(ax), y = gy(ay), c = cellOf(x, y);
      if (c < 0 || bp.reg[c] !== townR || bp.cls[c] !== C.ground) continue;
      /* clear of the streets, walks and the square by a step */
      let nearStreet = false;
      for (const [u, v] of [[-30, 0], [30, 0], [0, -30], [0, 30]]) {
        const cc = cellOf(x + u, y + v);
        if (cc < 0 || bp.cls[cc] !== C.ground || bp.reg[cc] !== townR) { nearStreet = true; break; }
      }
      if (nearStreet) continue;
      if (lotsArt.some((l) => ax > l.x0 - 30 && ax < l.x1 + 30 && ay > l.fy - l.tall - 20 && ay < l.fy + 70)) continue;
      if (nearFoot(x, y, 60)) continue;
      const west = ax < -(T.square + 40);
      const pick = hash2(i, j, ys + 3) * (west ? 3.2 : 2.2);
      const id = pick < 1 ? 'barrel' : pick < 2 ? 'crate' : 'haybale';
      put(id, x, y, Math.floor(hash2(i, j, ys + 4) * 4), false);
    }
  }
  const placedTown = out.kind.length;

  /* ── 3. the commons' fences and fields, along the four Old Roads ── */
  const fences = [];
  const fenceH = byId['fence-down'] ? byId['fence-down'].size : 170, fenceW = byId.fence ? byId.fence.size : 160;
  if (T) {
    const run = 900, off = 74, start = T.gate + 70;     /* art px */
    const okFence = (x, y) => {
      const c = cellOf(x, y);
      return c >= 0 && bp.reg[c] === commonsR && clear[c] >= 1 && !KEEP_CLEAR[bp.cls[c]];
    };
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const along = dy !== 0;                           /* a north-south road: fences up and down */
      const step = (along ? fenceH * 0.8 : fenceW * 0.92) / WPA;
      let k = 0;
      for (let a = start; a < start + run; a += step, k++) {
        if (k % 6 === 5) continue;                      /* a way into the field */
        for (const side of [-1, 1]) {
          const ax = dx * a + (along ? side * off : 0), ay = dy * a + (along ? 0 : side * off);
          /* a piece is placed by its foot: the bottom of a run going down the
             picture is its southern end */
          const fx = gx(ax), fy = gy(ay) + (along ? (fenceH * 0.4) : 0);
          if (!okFence(fx, fy) || !okFence(fx, fy - (along ? fenceH * 0.8 : 4))) continue;
          put(along ? 'fence-down' : 'fence', fx, fy, (k + (side > 0 ? 1 : 0)) % 3, false, 20);
          fences.push([fx, fy]);
        }
        /* haystacks in the field beyond the fence, now and then */
        if (k % 3 === 1) {
          for (const side of [-1, 1]) {
            if (hash2(k, side, seed + 77) > 0.55) continue;
            const far = off + 120 + hash2(k, side, seed + 78) * 180;
            const ax = dx * a + (along ? side * far : 0), ay = dy * a + (along ? 0 : side * far);
            const fx = gx(ax), fy = gy(ay), c = cellOf(fx, fy);
            if (c < 0 || bp.reg[c] !== commonsR || clear[c] < 2) continue;
            put('haystack', fx, fy, (k >> 1) + side, hash2(k, side, seed + 79) < 0.5);
          }
        }
      }
    }
  }

  /* ── 4. nature: each land's big, middle and small things ── */
  const landOf = (r) => LANDS[bp.regionIds[r]] || null;
  const weightAt = (w, stage) => (Array.isArray(w) ? w[Math.max(0, Math.min(3, stage))] : w);
  /* a big thing's picture must not cover the town: its top corners and
     middle are checked against the town's cells */
  const coversTown = (x, y, w, h) => {
    for (const [u, v] of [[-0.5, -1], [0, -1], [0.5, -1], [-0.5, -0.5], [0.5, -0.5], [0, -0.5]]) {
      const c = cellOf(x + u * w, y + v * h);
      if (c >= 0 && bp.reg[c] === townR) return true;
    }
    return false;
  };
  const counts = Object.create(null);
  for (const L of LAYERS) {
    const st = L.step, cols = Math.ceil(worldW / st), rows = Math.ceil(worldH / st);
    const ls = seed + Math.imul(L.id.length + 3, 1013);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      /* rounded first (to the half px every foot is kept at), so the cell
         checked is the cell it stands in */
      const x = Math.round((i + 0.15 + 0.7 * hash2(i, j, ls)) * st * 2) / 2, y = Math.round((j + 0.15 + 0.7 * hash2(i, j, ls + 1)) * st * 2) / 2;
      const c = cellOf(x, y);
      if (c < 0) continue;
      const r = bp.reg[c];
      if (r === townR) continue;
      const land = landOf(r);
      if (!land) continue;
      const list = land[L.id];
      if (!list || !list.length) continue;
      if (clear[c] < L.clear) continue;
      const cls = bp.cls[c];
      if (cls !== C.ground && cls !== C.obstacle) continue;
      const clump = cls === C.obstacle;
      /* open ground in drifts and clearings */
      const drift = 0.5 + 0.5 * fbm(x * DRIFT, y * DRIFT, ls + DRIFT_SEED, 2);
      const dense = (land.dense && land.dense[L.id]) || 1;
      const chance = clump ? Math.min(1, L.inClump * Math.sqrt(dense)) : L.open * dense * (0.25 + 1.5 * drift * drift);
      if (hash2(i, j, ls + 2) >= chance) continue;
      const stage = r === commonsR ? 0 : Math.max(0, bp.band[c]);
      const shore = land.shore ? wet[c] <= 3 : false;
      let tot = 0;
      const ws = list.map(([id, w]) => {
        let v = weightAt(w, stage);
        if (land.shore && land.shore.includes(id)) v *= shore ? 4 : 0.3;
        tot += v;
        return v;
      });
      if (tot <= 0) continue;
      let pick = hash2(i, j, ls + 3) * tot, k = 0;
      while (k < ws.length - 1 && pick >= ws[k]) { pick -= ws[k]; k++; }
      const id = list[k][0], e = byId[id];
      if (!e) continue;
      /* a shore thing away from the water is mostly not there at all (only
         re-weighting it did nothing where it is a layer's one kind: shells) */
      if (land.shore && land.shore.includes(id) && !shore && hash2(i, j, ls + 6) < 0.92) continue;
      if (nearFoot(x, y, L.gapBig)) continue;
      /* its size, roughly, from the catalog: big things keep their pictures
         off the town */
      const h = e.fit === 'w' ? e.size / (e.ar || 1) : e.size, w = e.fit === 'w' ? e.size : e.size * (e.ar || 1);
      if (L.id === 'big' && coversTown(x, y, w, h)) continue;
      const piece = Math.floor(hash2(i, j, ls + 4) * (e.count || 1));
      put(id, x, y, piece, !NO_FLIP.has(id) && hash2(i, j, ls + 5) < 0.5, L.id === 'big' ? 26 : L.id === 'mid' ? 14 : 8);
      counts[id] = (counts[id] || 0) + 1;
    }
  }

  const n = out.kind.length;
  const res = {
    version: PLACING, kinds, n, worldW, worldH,
    kind: Uint8Array.from(out.kind), piece: Uint8Array.from(out.piece), flip: Uint8Array.from(out.flip),
    x: Float32Array.from(out.x), y: Float32Array.from(out.y),
    town: placedTown, fences: fences.length, counts, ms: Date.now() - t0,
  };
  return res;
}

/* Where Mayor Bro stands in the Wheel's town: beside the Town Hall's steps,
   so he never blocks its door -- to the EAST, as the way home is marked just
   WEST of where you arrive (worldTrial.js exitBeside) and his name plate
   covered its label (game px, as placeObjects). */
export function mayorSpot(plan, bp) {
  const hall = bp.lots.find((l) => l.id === (plan.town && plan.town.hallLot && plan.town.hallLot.id));
  if (!hall || !hall.foot) return null;
  const WPA = plan.worldPxPerArtPx;
  return { x: (hall.foot.x + 70 - bp.x0) * WPA, y: (hall.foot.y + 20 - bp.y0) * WPA };
}

/* The ground each object stops you on, from its picture's size in the
   game's manifest (public/world/objects/manifest.json, the Object Studio's
   "Download for the game"), and which kinds have a picture at all -- an
   object with none is neither drawn nor in anyone's way.  Boxes in game px,
   four numbers each; object i's are boxOf[i] to boxOf[i + 1]. */
export function objectFootprints(placed, manifest) {
  const byId = Object.create(null);
  for (const o of (manifest && manifest.objects) || []) if (o && typeof o.id === 'string' && o.pieces && o.pieces.length) byId[o.id] = o;
  const present = new Uint8Array(placed.kinds.length);
  placed.kinds.forEach((id, k) => { present[k] = byId[id] ? 1 : 0; });
  const boxOf = new Uint32Array(placed.n + 1);
  const boxes = [];
  for (let i = 0; i < placed.n; i++) {
    boxOf[i] = boxes.length >> 2;
    const id = placed.kinds[placed.kind[i]], o = byId[id];
    if (!o) continue;
    const pc = o.pieces[placed.piece[i] % o.pieces.length];
    for (const b of footprintOf(id, o.kind, placed.x[i], placed.y[i], pc.gameW, pc.gameH)) boxes.push(b.x0, b.y0, b.x1, b.y1);
  }
  boxOf[placed.n] = boxes.length >> 2;
  return { present, boxOf, boxes: Float32Array.from(boxes) };
}
