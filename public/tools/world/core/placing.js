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
import { wheelInfo } from './wheel.js';
import { objectCatalog } from '../../objects/catalog.js';

export const PLACING = 'v2.3.2981';

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
    /* v2.3.2981: no palms out on the sand -- the owner: "The palm trees
       don't belong in the desert unless they surround water to emulate an
       oasis".  They ring the dunes' pools instead (`oasis`); where one stood
       out here, nothing does (`null`), so the hoodoos are as thick as before
       rather than standing in every palm's place */
    big: [[null, [0.8, 0.45, 0.15, 0.3]], ['hoodoo', [0.3, 0.7, 1, 1]]],
    mid: [['cactus', 1]],
    small: [['tumbleweed', 1], ['sage', 1], ['skull', 0.35]],
    oasis: 'palm',
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
/* v2.3.2981: an oasis's ring (game px): each trunk `back` past the water's
   edge, about `step` apart round the pool, `min` to `max` of them, none on
   the side facing you (`open`: where the ring's direction points further
   south than this) -- a palm is 300 game px tall, and one on the near shore
   hides the water behind its crown; nothing else nothing wild may stand on
   (a road, a cliff) within `keep` cells of a trunk; and the land's own
   things kept back from the water -- big ones (the hoodoos) `shoreBig`
   cells, the rest `shore` -- and big ones `clearBig` game px from a trunk */
const OASIS = { back: [22, 46], step: 150, min: 4, max: 12, open: 0.8, keep: 2, shoreBig: 8, shore: 2, clearBig: 70 };

/* ═══ v2.3.2999: PLACING v2, A PREVIEW (`?placing=2`) ═══
 *
 * Owner, 2026-10-03: "work throughout the night on studying object placement
 * in the game's maps and what a good distribution is".  What the study
 * (tools/world/study-placement.mjs, docs/OBJECT-PLACEMENT-STUDY.md) measured
 * of the scatter above, and what v2 does about it:
 *
 *   NO WOODS.  The tall things are spread almost exactly at random (Clark-
 *   Evans R 0.95-1.04; within 300 px of a tree as many trees as a random
 *   scatter would put there).  The plan's obstacle "clumps" are hundreds of
 *   blobs of ~25-40 cells, each the size of ONE tree.  v2: a GROVE field --
 *   noise over ~1,500 game px, nudged up where the plan's clumps are thick --
 *   and the tall things thick where it is high (groves), thin where it is
 *   middling, and all but gone where it is low (clearings).
 *
 *   POLKA DOTS.  The rocks, cacti, toadstools and scrap stand one by one at
 *   an even spacing (R 1.1-1.3 for everything: more even than random).  v2:
 *   they come in PILES (rocks, crystals, scrap), SCATTERS (cacti, stumps,
 *   driftwood), RINGS (toadstools: fairy rings) and LINES (the ruined stone
 *   walls), a few to a group, with open ground between groups.
 *
 *   TREES FLOATING.  Nothing small stands near a tree (the old rule kept
 *   small things 34 px off a big thing's foot).  v2: a little UNDERGROWTH --
 *   a fern, a flower, a stone -- at the foot of some trees, in front of the
 *   trunk where it shows.
 *
 *   TRUNKS TOO CLOSE.  Nothing kept two tall things apart but the lattice's
 *   jitter (35 px at worst).  v2: each tall thing keeps a fair share of its
 *   own width from the next (Poisson-disc spacing, `tallSpace`).
 *
 *   ROADSIDE WALLS.  Things crowd the band just past a road's kept-clear
 *   cells (frost 29 a screen there against 23 further out).  v2: tall and
 *   middle things thin out toward a road and come back over ~150 px.
 *
 *   CLUTTERED CAMPS.  The monsters' camps are as cluttered as the land round
 *   them (0.56-0.91 of it).  v2: tall things a quarter as thick there and
 *   middle ones half (campBands: where the worker's monsters stand,
 *   tools/world/bake-wheel-spawns.mjs).
 *
 *   SLITS.  387 gaps between two footprints under 20 px (the feet cannot
 *   pass, the eye says you can) and 467 of 20-36 (the feet catch).  v2: a
 *   thing whose footprint would leave a gap under 40 px to another's is not
 *   placed; the members of one pile may touch, so a pile is one solid lump.
 *
 *   TWINS.  A fifth of the tall things stand within 250 px of the same
 *   picture drawn the same way round.  v2: such a one is turned the other way.
 *
 * Still deterministic: every candidate is a hashed point of its own lattice
 * cell, decided in a fixed order, from the catalog's sizes (never from which
 * pictures exist).  The town, the fences, the oases are as before; only the
 * land's own scatter (section 5) is v2's.  Behind `?placing=2` while the
 * owner looks: the server's monster places are baked against v1, and v2
 * keeps their camps clearer, not fuller.
 */
export const PLACING_V2 = 'v2.3.2999';
/* `?placing=2` in the address: placing v2 (ground-worker.js init) */
export function placingOpts(search) {
  const m = /(?:^|[?&])placing=([0-9]+)(?:&|$)/.exec(search || '');
  return m && m[1] === '2' ? { v: 2 } : {};
}
const V2 = {
  /* the woods: noise over the land (warped, so a wood is not a blob), read
     every `coarse` cells -- under `glade` a clearing, from `open` scattered
     trees, from `woodLo` to `woodHi` thickening into a wood */
  field: { wave: 2400, warp: 650, warpWave: 1700, coarse: 4, glade: [0.36, 0.46], wood: [0.54, 0.64] },
  /* tall things a phone screen (619 x 1280 game px): in a clearing, in the
     open, and in the heart of a wood; candidates every `step` px; a hard
     core of max(`crown` x the picture's width, `core` / sqrt(density)) --
     Matern II, by hashed priority, so the order never matters */
  tall: { step: 64, glade: 0.3, open: 4, wood: 22, pow: 1.5, crown: 0.42, core: 0.38, clear: 2, clump: 1.8 },
  /* middle things in groups: `groups` a screen, more at a wood's edge */
  mid: { step: 240, groups: 2.6, edge: 1.7, clear: 2 },
  /* low things: `perScreen`, in drifts (`patch`) */
  low: { step: 60, perScreen: 11, patchWave: 650, patch: [0.45, 0.62], core: 0.6, clear: 1, gapTall: 30 },
  /* undergrowth at a tall thing's foot: up to `max`, `near`-`far` px, in front */
  under: { max: 3, chance: 0.5, near: 24, far: 92 },
  road: { tall: [2, 8], mid: [2, 5] },     /* cells from a road: none at the first, all by the second */
  /* inside a camp (the band) and round it (`margin` px): open in the
     middle, its edge framed by rocks and bushes */
  camp: { tall: 0.3, mid: 0.5, frame: 1.6, low: 0.8, margin: 160 },
  slit: 40,                 /* game px: a gap under this between two footprints is not left */
  slitOverlap: 14,          /* ...and two that overlap by less are not "touching" */
  tallCover: 160,           /* a picture this tall may not cover a road, a plot or a camp */
};
const SCREEN_AREA = 619 * 1280;
/* how each middle kind gathers: a PILE (touching, a lump), a SCATTER
   (loose), a RING (a fairy ring), a LINE (a run of wall), or ONE; `r` in
   widths of the kind's picture */
const GROUPS = {
  pile: { n: [2, 5], r: 0.6 }, scatter: { n: [2, 4], r: 1.7 }, ring: { n: [5, 8], r: 1.5 }, line: { n: [3, 5], r: 0.92 }, one: { n: [1, 1], r: 0 },
};
const GROUP_OF = {
  boulder: 'pile', crystal: 'pile', snowrock: 'pile', basalt: 'pile', stone: 'pile', searock: 'pile', scrap: 'pile', coal: 'pile', coral: 'pile', icespire: 'pile',
  obsidian: 'scatter', cactus: 'scatter', driftwood: 'scatter', giantflower: 'scatter', bush: 'scatter', stump: 'scatter', haystack: 'scatter',
  toadstool: 'ring', stonewall: 'line',
  minecart: 'one', rowboat: 'one', scarecrow: 'one',
};
/* stone and scrap like the open, living things the woods */
const MINERAL = new Set(['boulder', 'crystal', 'snowrock', 'basalt', 'stone', 'searock', 'scrap', 'coal', 'obsidian', 'cactus', 'icespire', 'minecart']);
const UNDERWOOD = new Set(['toadstool', 'giantflower', 'bush', 'stump']);
/* per land: how thick each layer is against the numbers above (set so each
   land keeps about v1's count -- study-placement.mjs --placing 2 measures),
   and what grows at a tall thing's foot */
const V2_LANDS = {
  commons: { tall: 0.5, mid: 2.1, low: 2.0, under: ['flowers', 'stone', 'bush'] },
  frost: { tall: 2.5, mid: 0.9, low: 0.82, under: ['frostbush', 'snowrock'] },
  ember: { tall: 4.2, mid: 1.4, low: 1.35, under: ['charstump', 'basalt'] },
  sky: { tall: 1.75, mid: 1.3, low: 0.93, under: ['sage', 'skull', 'tumbleweed'] },
  hollows: { tall: 1, mid: 0.96, low: 0.8, under: ['rubble', 'crystal'] },
  thunder: { tall: 1.45, mid: 0.6, low: 1.3, under: ['scrap', 'coal'] },
  tidal: { tall: 0.33, mid: 1.4, low: 1.2, under: ['shell', 'searock'] },
  mist: { tall: 0.73, mid: 0.3, low: 1, under: ['toadstool'] },
  verdant: { tall: 2.2, mid: 1.3, low: 0.98, under: ['fern', 'giantflower'] },
};
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/* The camps: where the worker's monsters stand (bake-wheel-spawns.mjs
   SPAWN_RULES -- the band 350-1,350 game px past the commons' edge along
   each spoke's axis, or to its first stage's end, within 420 px of the
   axis), grown by `margin`.  A Uint8Array a blueprint cell.  test-world-core
   holds it to the bake's own bands. */
export function campBands(plan, bp, rules = { from: 350, to: 1350, half: 420, tier: 1 }, margin = 0) {
  const W = wheelInfo(plan), g = gridInfo(plan);
  const WPA = plan.worldPxPerArtPx, cellG = bp.scale * WPA;
  const ri = Object.create(null);
  bp.regionIds.forEach((k, i) => { ri[k] = i; });
  const cxG = (g.cx - bp.x0) * WPA, cyG = (g.cy - bp.y0) * WPA, sqPx = g.P * WPA;
  const mask = new Uint8Array(bp.w * bp.h);
  const bands = Object.create(null);
  for (const s of W.spokes) {
    const rid = ri[s.id];
    if (rid == null) continue;
    let rEdge = null;
    for (let r = W.hub * sqPx * 0.6; r < W.hub * sqPx * 2; r += cellG / 2) {
      const i = Math.floor((cyG + s.uy * r) / cellG) * bp.w + Math.floor((cxG + s.ux * r) / cellG);
      if (bp.reg[i] === rid && bp.cls[i] !== C.ocean) { rEdge = r; break; }
    }
    if (rEdge == null) continue;
    let rStage = rEdge + rules.to;
    for (let r = rEdge; r < rEdge + rules.to; r += cellG / 2) {
      const i = Math.floor((cyG + s.uy * r) / cellG) * bp.w + Math.floor((cxG + s.ux * r) / cellG);
      if (bp.tier[i] > rules.tier) { rStage = r; break; }
    }
    const r0 = rEdge + rules.from, r1 = Math.min(rEdge + rules.to, rStage);
    bands[s.id] = { r0, r1, anchor: [Math.round(cxG + s.ux * (r0 + r1) / 2), Math.round(cyG + s.uy * (r0 + r1) / 2)] };
    const R = Math.ceil((r1 + rules.half + margin) / cellG) + 2;
    const bx0 = Math.max(0, Math.floor(cxG / cellG) - R), bx1 = Math.min(bp.w - 1, Math.floor(cxG / cellG) + R);
    const by0 = Math.max(0, Math.floor(cyG / cellG) - R), by1 = Math.min(bp.h - 1, Math.floor(cyG / cellG) + R);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
      const dx = (bx + 0.5) * cellG - cxG, dy = (by + 0.5) * cellG - cyG;
      const along = dx * s.ux + dy * s.uy, side = Math.abs(dx * s.uy - dy * s.ux);
      if (along >= r0 - margin && along <= r1 + margin && side <= rules.half + margin) mask[by * bp.w + bx] = 1;
    }
  }
  return { mask, bands };
}

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
  /* the yards behind the Back Lane: the farm end's hay and the store's cart
     (v2.3.2997: marked `yard`, so placeObjects keeps them on the town's
     ground -- see there) */
  const yb = tp.yS0 + L.walk + 44;
  const yard = (id, x, y, piece) => out.push({ id, x, y, piece, yard: true });
  yard('cart', tp.rowEnd - L.w * 0.45, yb + 6, 0);
  yard('haybale', -(tp.rowEnd - 40), yb, 0);
  yard('haybale', -(tp.rowEnd - 92), yb + 8, 1);
  yard('haybale', -(tp.rowEnd - 64), yb + 30, 3);
  yard('barrel', tp.rowEnd - 30, yb - 4, 0);
  yard('crate', tp.rowEnd - 64, yb + 2, 1);
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
  /* v2.3.2982: the big-town preview's buildings are drawn `bk` times the
     size (plan.js bigTownPlan), so what stands beside a porch stands that
     much further out */
  const bk = (T && T.buildingScale) || 1;
  const townLots = bp.lots.filter((l) => l.town && l.foot);
  for (const l of townLots) {
    const fx = (l.foot.x - bp.x0) * WPA, fy = (l.foot.y - bp.y0) * WPA;
    put(l.id, fx, fy, 0, false);
    for (const [id, dx, dy, piece] of DOOR_PROPS[l.id] || []) put(id, fx + dx * bk * WPA, fy + dy * bk * WPA, piece, false);
  }
  /* ── 2. the town's furniture ── */
  if (T) {
    const tp = townPlan(T);
    /* v2.3.2997: the yards' things stand on the town's ground.  The yard
       behind the Back Lane is T.yard deep (78 art px) and the town's edge
       wanders up to ~100 either way (layout.js TOWN_EDGE), so a spot a
       little way into it can come out on the commons' grass: at 1.15x the
       cart did, at 1.5x two of the bales, at 1x a barrel and a crate.  Such
       a spot moves to the nearest one -- along the yard, or toward the lane
       by up to 24 art px -- where the ground under its whole footprint is
       the town's, clear of anything already standing; with none, it stays. */
    const townGround = (x, y) => { const c = cellOf(x, y); return c >= 0 && bp.reg[c] === townR && bp.cls[c] === C.ground; };
    const solidYard = (id, x, y) => {
      const e = byId[id], f = FOOT[id] || { w: 0.7 };
      const hw = e ? (f.w * (e.fit === 'w' ? e.size : e.size * (e.ar || 1))) / 2 : 30;
      for (const u of [-hw, 0, hw]) for (const v of [-12, 0, 12]) if (!townGround(x + u, y + v)) return false;
      return true;
    };
    const YARD_TRIES = [];
    for (let dy = 0; dy >= -24; dy -= 8) for (let dx = -96; dx <= 96; dx += 16) YARD_TRIES.push([dx, dy]);
    YARD_TRIES.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
    for (const d of townDressing(T, tp)) {
      let ax = d.x, ay = d.y;
      if (d.yard && !solidYard(d.id, gx(ax), gy(ay))) {
        const t = YARD_TRIES.find(([u, v]) => solidYard(d.id, gx(d.x + u), gy(d.y + v)) && !nearFoot(gx(d.x + u), gy(d.y + v), 40));
        if (t) { ax = d.x + t[0]; ay = d.y + t[1]; }
      }
      put(d.id, gx(ax), gy(ay), d.piece, false);
    }
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

  const landOf = (r) => LANDS[bp.regionIds[r]] || null;
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

  /* ── 4. v2.3.2981: THE OASES ──
     Owner, 2026-10-02: "The palm trees don't belong in the desert unless
     they surround water to emulate an oasis."  Every pool (C.water) of a
     land with `oasis` -- the dunes' small pools, plan.js -- gets a ring of
     that tree: OASIS.back past the water's edge, all the way round, each
     leaning in over the pool.  Every palm leans left in the game's copy
     (catalog `lean`, stood on its trunk by objects/atlas.js), so one east of
     the water is drawn as it is and one west of it mirrored.  A spot on
     anything nothing wild may stand on, or with one within OASIS.keep cells
     (a road, a cliff: never the pool's own water), is skipped, so a pool
     beside the trail is open on that side.  Before the land's scatter,
     whose big things keep OASIS.clearBig from these trunks. */
  const oasisFeet = [];
  {
    const seen = new Uint8Array(N);
    const keepNear = (c) => {
      const cx = c % BW, cy = (c / BW) | 0;
      for (let dy = -OASIS.keep; dy <= OASIS.keep; dy++) for (let dx = -OASIS.keep; dx <= OASIS.keep; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= BW || y >= BH) return true;
        const k = bp.cls[y * BW + x];
        if (KEEP_CLEAR[k] && k !== C.water) return true;
      }
      return false;
    };
    for (let i0 = 0; i0 < N; i0++) {
      if (seen[i0] || bp.cls[i0] !== C.water) continue;
      const land = landOf(bp.reg[i0]);
      if (!land || !land.oasis || !byId[land.oasis]) continue;
      /* the pool: its cells, its middle, its size were it round */
      const stack = [i0];
      seen[i0] = 1;
      let n = 0, sx = 0, sy = 0;
      while (stack.length) {
        const c = stack.pop(), cx = c % BW;
        n++; sx += cx; sy += (c / BW) | 0;
        if (cx > 0 && !seen[c - 1] && bp.cls[c - 1] === C.water) { seen[c - 1] = 1; stack.push(c - 1); }
        if (cx < BW - 1 && !seen[c + 1] && bp.cls[c + 1] === C.water) { seen[c + 1] = 1; stack.push(c + 1); }
        if (c >= BW && !seen[c - BW] && bp.cls[c - BW] === C.water) { seen[c - BW] = 1; stack.push(c - BW); }
        if (c < N - BW && !seen[c + BW] && bp.cls[c + BW] === C.water) { seen[c + BW] = 1; stack.push(c + BW); }
      }
      const mx = (sx / n + 0.5) * cellPx, my = (sy / n + 0.5) * cellPx;
      const rad = Math.sqrt(n / Math.PI) * cellPx;
      const ring = 2 * Math.PI * (rad + (OASIS.back[0] + OASIS.back[1]) / 2);
      const count = Math.max(OASIS.min, Math.min(OASIS.max, Math.round(ring / OASIS.step)));
      /* everything about the ring from where the pool is, never from how
         many pools came before it */
      const ps = seed + 6011, pi = Math.floor(mx / 8), pj = Math.floor(my / 8);
      const a0 = hash2(pi, pj, ps) * 2 * Math.PI;
      const e = byId[land.oasis];
      for (let k = 0; k < count; k++) {
        const a = a0 + ((k + 0.35 * (hash2(pi + k, pj, ps + 1) - 0.5)) * 2 * Math.PI) / count;
        const ux = Math.cos(a), uy = Math.sin(a);
        if (uy > OASIS.open) continue;
        /* out from the middle to the water's edge, then back from it */
        let t = 0;
        while (t < rad * 3 + cellPx * 4) {
          const c = cellOf(mx + ux * t, my + uy * t);
          if (c < 0 || bp.cls[c] !== C.water) break;
          t += 4;
        }
        const back = OASIS.back[0] + hash2(pi + k, pj, ps + 2) * (OASIS.back[1] - OASIS.back[0]);
        /* ...and on dry ground a cell (24 game px) all round, as every tall
           thing stands: further out until it is */
        let x = 0, y = 0, dry = false;
        for (let d = t + back, tries = 0; tries < 6 && !dry; tries++, d += 8) {
          x = Math.round((mx + ux * d) * 2) / 2; y = Math.round((my + uy * d) * 2) / 2;
          dry = [[0, 0], [-24, 0], [24, 0], [0, -24], [0, 24]].every(([u, v]) => { const q = cellOf(x + u, y + v); return q >= 0 && bp.cls[q] !== C.water; });
        }
        if (!dry) continue;
        const c = cellOf(x, y);
        if (c < 0 || landOf(bp.reg[c]) !== land) continue;
        if (bp.cls[c] !== C.ground && bp.cls[c] !== C.obstacle) continue;
        if (keepNear(c) || nearFoot(x, y, 40)) continue;
        const h = e.fit === 'w' ? e.size / (e.ar || 1) : e.size, w = e.fit === 'w' ? e.size : e.size * (e.ar || 1);
        if (coversTown(x, y, w, h)) continue;
        /* leaning in: drawn leaning left, so mirrored west of the pool (and
           either way, by the hash, right above or below it) */
        const flip = Math.abs(ux) < 0.25 ? hash2(pi + k, pj, ps + 3) < 0.5 : ux < 0;
        put(e.id, x, y, Math.floor(hash2(pi + k, pj, ps + 4) * (e.count || 1)), flip, 26);
        oasisFeet.push(x, y);
        counts[e.id] = (counts[e.id] || 0) + 1;
      }
    }
  }
  const nearOasis = (x, y, r) => {
    for (let q = 0; q < oasisFeet.length; q += 2) {
      const dx = oasisFeet[q] - x, dy = oasisFeet[q + 1] - y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  };

  /* ── 5. nature: each land's big, middle and small things ── */
  const weightAt = (w, stage) => (Array.isArray(w) ? w[Math.max(0, Math.min(3, stage))] : w);
  /* v2.3.2999: `?placing=2`, the woods, groups and undergrowth of PLACING v2 */
  if (opts.v === 2) natureV2({ plan, bp, seed, cellOf, cellPx, BW, BH, N, worldW, worldH, clear, wet, byId, landOf, townR, commonsR, coversTown, nearOasis, nearFoot, put, counts });
  else for (const L of LAYERS) {
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
      /* v2.3.2981: an oasis's shore is its palms' (a pool laid over a rock
         field had hoodoos standing at the water's edge) */
      if (land.oasis && wet[c] < (L.id === 'big' ? OASIS.shoreBig : OASIS.shore)) continue;
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
      const id = list[k][0], e = id == null ? null : byId[id];
      if (!e) continue;      /* `null`: nothing stands here (the dunes' old palms) */
      /* a shore thing away from the water is mostly not there at all (only
         re-weighting it did nothing where it is a layer's one kind: shells) */
      if (land.shore && land.shore.includes(id) && !shore && hash2(i, j, ls + 6) < 0.92) continue;
      if (nearFoot(x, y, L.gapBig)) continue;
      /* its size, roughly, from the catalog: big things keep their pictures
         off the town */
      const h = e.fit === 'w' ? e.size / (e.ar || 1) : e.size, w = e.fit === 'w' ? e.size : e.size * (e.ar || 1);
      if (L.id === 'big' && coversTown(x, y, w, h)) continue;
      if (L.id === 'big' && oasisFeet.length && nearOasis(x, y, OASIS.clearBig)) continue;
      const piece = Math.floor(hash2(i, j, ls + 4) * (e.count || 1));
      put(id, x, y, piece, !NO_FLIP.has(id) && hash2(i, j, ls + 5) < 0.5, L.id === 'big' ? 26 : L.id === 'mid' ? 14 : 8);
      counts[id] = (counts[id] || 0) + 1;
    }
  }

  const n = out.kind.length;
  /* v2.3.2982: how many times its picture's size each kind is drawn -- the
     big-town preview's buildings bigger, everything else as made */
  const kindScale = new Float32Array(kinds.length).fill(1);
  if (bk !== 1) cat.forEach((e, k) => { if (e.kind === 'building') kindScale[k] = bk; });
  const res = {
    version: opts.v === 2 ? PLACING_V2 : PLACING, kinds, kindScale, n, worldW, worldH,
    /* v2.3.2982: the buildings standing, of the catalog's (the big-town
       preview has room for 13 of the 17) */
    buildings: townLots.length, buildingsOf: cat.filter((e) => e.kind === 'building').length,
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
  /* (v2.3.2982: beside a bigger Town Hall's wider steps in the big-town preview) */
  const bk = plan.town.buildingScale || 1;
  return { x: (hall.foot.x + 70 * bk - bp.x0) * WPA, y: (hall.foot.y + 20 - bp.y0) * WPA };
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
    /* (v2.3.2982: drawn bigger in the big-town preview, so a bigger footprint) */
    const ks = (placed.kindScale && placed.kindScale[placed.kind[i]]) || 1;
    for (const b of footprintOf(id, o.kind, placed.x[i], placed.y[i], pc.gameW * ks, pc.gameH * ks)) boxes.push(b.x0, b.y0, b.x1, b.y1);
  }
  boxOf[placed.n] = boxes.length >> 2;
  return { present, boxOf, boxes: Float32Array.from(boxes) };
}

/* ═══ v2.3.2999: THE LAND'S OWN SCATTER, v2 (`?placing=2`) ═══
   What PLACING v2 (above) says, in order: the tall things (kept by the woods
   field, then a hard core), the undergrowth at their feet, the middle things
   in groups, the low things in drifts.  Called by placeObjects in place of
   its section 5, with that function's own helpers. */

/* city-block distance in cells from every cell `seed` says yes to, to `cap` */
function chamfer(N, BW, BH, seed, cap) {
  const d = new Uint8Array(N);
  for (let i = 0; i < N; i++) d[i] = seed(i) ? 0 : cap;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const i = y * BW + x;
    let v = d[i];
    if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1;
    if (y > 0 && d[i - BW] + 1 < v) v = d[i - BW] + 1;
    d[i] = v;
  }
  for (let y = BH - 1; y >= 0; y--) for (let x = BW - 1; x >= 0; x--) {
    const i = y * BW + x;
    let v = d[i];
    if (x < BW - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1;
    if (y < BH - 1 && d[i + BW] + 1 < v) v = d[i + BW] + 1;
    d[i] = v;
  }
  return d;
}

/* Matern II over candidates { x, y, r, pri }: keep one unless another within
   max(both r) has a higher priority -- every decision local, none hanging on
   the order anything was made in */
function hardCore(cand, worldW, reach) {
  const CB = 256, cols = Math.ceil(worldW / CB) + 1, hash = new Map();
  cand.forEach((q, k) => {
    const key = Math.floor(q.y / CB) * cols + Math.floor(q.x / CB);
    let a = hash.get(key);
    if (!a) hash.set(key, (a = []));
    a.push(k);
  });
  const kept = [];
  for (let k = 0; k < cand.length; k++) {
    const q = cand[k];
    let ok = true;
    for (let j = Math.floor((q.y - reach) / CB); ok && j <= Math.floor((q.y + reach) / CB); j++) {
      for (let i = Math.floor((q.x - reach) / CB); ok && i <= Math.floor((q.x + reach) / CB); i++) {
        for (const m of hash.get(j * cols + i) || []) {
          if (m === k) continue;
          const o = cand[m];
          if (o.pri < q.pri || (o.pri === q.pri && m > k)) continue;
          const rr = Math.max(q.r, o.r), dx = o.x - q.x, dy = o.y - q.y;
          if (dx * dx + dy * dy < rr * rr) { ok = false; break; }
        }
      }
    }
    if (ok) kept.push(q);
  }
  /* highest priority first: what is decided next (a twin's turn) is
     decided in an order of WHERE, not of when */
  return kept.sort((a, b) => b.pri - a.pri);
}

function natureV2(X) {
  const { plan, bp, seed, cellOf, cellPx, BW, BH, N, worldW, worldH, clear, wet, byId, landOf, townR, commonsR, coversTown, nearOasis, nearFoot, put, counts } = X;
  const s0 = seed + 7121;
  const weightAt = (w, stage) => (Array.isArray(w) ? w[Math.max(0, Math.min(3, stage))] : w);
  const sizeOf = (e) => (e.fit === 'w' ? { w: e.size, h: e.size / (e.ar || 1) } : { w: e.size * (e.ar || 1), h: e.size });
  const landId = (r) => bp.regionIds[r];
  const count = (id) => { counts[id] = (counts[id] || 0) + 1; };
  const halfPx = (v) => Math.round(v * 2) / 2;

  /* roads (cells, to 12), and what a tall picture may not cover */
  const ROADC = new Uint8Array(64), NOCOVER = new Uint8Array(64);
  for (const k of ['path', 'street', 'rail', 'bridge', 'boardwalk', 'plaza']) if (C[k] != null) ROADC[C[k]] = 1;
  for (const k of ['path', 'street', 'rail', 'bridge', 'boardwalk', 'plaza', 'lot', 'landmark', 'gate']) if (C[k] != null) NOCOVER[C[k]] = 1;
  const road = chamfer(N, BW, BH, (i) => ROADC[bp.cls[i]], 12);
  /* where the worker's monsters stand, and round them */
  const camp = campBands(plan, bp, undefined, V2.camp.margin).mask;
  const core = campBands(plan, bp).mask;

  /* the woods field, every `coarse` cells, read between them */
  const F = V2.field, KP = F.coarse * cellPx, GW = Math.ceil(worldW / KP) + 2, GH = Math.ceil(worldH / KP) + 2;
  const nf = new Float32Array(GW * GH);
  for (let gj = 0; gj < GH; gj++) for (let gi = 0; gi < GW; gi++) {
    const x = gi * KP, y = gj * KP;
    const wx = x + F.warp * fbm(x / F.warpWave, y / F.warpWave, s0 + 3, 2);
    const wy = y + F.warp * fbm(x / F.warpWave + 17.3, y / F.warpWave + 5.1, s0 + 4, 2);
    nf[gj * GW + gi] = 0.5 + 0.5 * fbm(wx / F.wave, wy / F.wave, s0 + 5, 3);
  }
  const fieldAt = (x, y) => {
    const u = x / KP, v = y / KP;
    const i = Math.max(0, Math.min(GW - 2, Math.floor(u))), j = Math.max(0, Math.min(GH - 2, Math.floor(v)));
    const fu = Math.max(0, Math.min(1, u - i)), fv = Math.max(0, Math.min(1, v - j));
    const a = nf[j * GW + i], b = nf[j * GW + i + 1], c = nf[(j + 1) * GW + i], d = nf[(j + 1) * GW + i + 1];
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
  const woodOf = (n) => smooth(F.wood[0], F.wood[1], n);
  const edgeOf = (n) => { const w = woodOf(n); return 4 * w * (1 - w); };
  const T = V2.tall;
  const tallPerScreen = (n) => T.glade + (T.open - T.glade) * smooth(F.glade[0], F.glade[1], n) + (T.wood - T.open) * Math.pow(woodOf(n), T.pow);
  /* each kind of a list in stands: its weight times its own slow noise */
  const pickKind = (list, stage, x, y, h, salt, wetC, shoreKinds) => {
    let tot = 0;
    const ws = list.map(([id, w], k) => {
      let v = weightAt(w, stage);
      if (v > 0) v *= 0.35 + 1.3 * (0.5 + 0.5 * fbm(x / 850, y / 850, s0 + 211 + salt + k * 31, 2));
      if (v > 0 && shoreKinds && shoreKinds.includes(id)) v *= wetC <= 3 ? 4 : 0.3;
      tot += v;
      return v;
    });
    if (tot <= 0) return null;
    let pick = h * tot, k = 0;
    while (k < ws.length - 1 && pick >= ws[k]) { pick -= ws[k]; k++; }
    return list[k][0];
  };

  /* a tall picture covers the ground north of its foot: not a road, a
     plot, a landmark or a camp's middle (seen from the south, a tree just
     below a road stood in it) -- 2 of 9 points of its upper part */
  const covers = (x, y, w, h) => {
    if (h < V2.tallCover) return false;
    let hit = 0;
    for (const u of [-0.4, 0, 0.4]) for (const v of [-0.85, -0.6, -0.35]) {
      const q = cellOf(x + u * w, y + v * h);
      if (q >= 0 && (NOCOVER[bp.cls[q]] || core[q] || bp.reg[q] === townR)) hit++;
    }
    return hit > 1;
  };

  /* footprints v2 has placed, for the slit rule (game px, a 128 px hash) */
  const FB = 128, fcols = Math.ceil(worldW / FB) + 1, fboxes = new Map();
  const feetOf = (id, e, x, y) => { const { w, h } = sizeOf(e); return footprintOf(id, e.kind, x, y, w, h); };
  const addBoxes = (bs, group) => {
    for (const b of bs) for (let j = Math.floor(b.y0 / FB); j <= Math.floor(b.y1 / FB); j++) for (let i = Math.floor(b.x0 / FB); i <= Math.floor(b.x1 / FB); i++) {
      const key = j * fcols + i;
      let a = fboxes.get(key);
      if (!a) fboxes.set(key, (a = []));
      a.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, group });
    }
  };
  /* would these boxes leave a gap under V2.slit to one already placed?
     Touching is no gap: overlapping footprints are one lump */
  const slit = (bs, group) => {
    const S = V2.slit;
    for (const b of bs) for (let j = Math.floor((b.y0 - S) / FB); j <= Math.floor((b.y1 + S) / FB); j++) for (let i = Math.floor((b.x0 - S) / FB); i <= Math.floor((b.x1 + S) / FB); i++) {
      for (const q of fboxes.get(j * fcols + i) || []) {
        /* (a pile's stones may touch -- one lump -- but, like anything,
           not stand a foot apart) */
        const gx = Math.max(q.x0 - b.x1, b.x0 - q.x1), gy = Math.max(q.y0 - b.y1, b.y0 - q.y1);
        /* touching is overlapping by a clear margin: these are the
           catalog's sizes, and a picture can come out a fifth wider or
           narrower (study-placement.mjs measures the real ones) */
        const over = Math.max(V2.slitOverlap, 0.25 * Math.min(b.x1 - b.x0, q.x1 - q.x0));
        if (gx <= -over && gy <= 0) continue;
        if (gy <= -over && gx <= 0) continue;
        const gap = gx > 0 && gy > 0 ? Math.hypot(gx, gy) : Math.max(gx, gy);
        if (gap < S) return true;
      }
    }
    return false;
  };

  /* ── 1. tall things: kept by the woods, then a hard core ── */
  const ts = T.step, lsT = s0 + 101;
  const cand = [];
  for (let j = 0, rows = Math.ceil(worldH / ts); j < rows; j++) for (let i = 0, cols = Math.ceil(worldW / ts); i < cols; i++) {
    const x = halfPx((i + hash2(i, j, lsT)) * ts), y = halfPx((j + hash2(i, j, lsT + 1)) * ts);
    const c = cellOf(x, y);
    if (c < 0) continue;
    const r = bp.reg[c];
    if (r === townR) continue;
    const land = landOf(r);
    if (!land || !land.big || !land.big.length) continue;
    const cls = bp.cls[c];
    if ((cls !== C.ground && cls !== C.obstacle) || clear[c] < T.clear) continue;
    if (land.oasis && wet[c] < OASIS.shoreBig) continue;
    const V = V2_LANDS[landId(r)] || { tall: 1 };
    let per = tallPerScreen(fieldAt(x, y)) * V.tall;
    if (cls === C.obstacle) per *= T.clump;
    per *= smooth(V2.road.tall[0], V2.road.tall[1], road[c]);
    if (core[c]) per *= V2.camp.tall;
    if (hash2(i, j, lsT + 2) >= (per * ts * ts / SCREEN_AREA) * 1.25) continue;
    const stage = r === commonsR ? 0 : Math.max(0, bp.band[c]);
    const id = pickKind(land.big, stage, x, y, hash2(i, j, lsT + 3), 0);
    const e = id == null ? null : byId[id];
    if (!e) continue;
    const { w, h } = sizeOf(e);
    if (coversTown(x, y, w, h) || nearOasis(x, y, OASIS.clearBig)) continue;
    if (covers(x, y, w, h)) continue;
    const spacing = Math.sqrt(SCREEN_AREA / Math.max(0.05, per));
    cand.push({ x, y, i, j, id, e, w, h, r: Math.max(T.crown * w, Math.min(260, T.core * spacing)), pri: hash2(i, j, lsT + 4) });
  }
  const tall = [];
  const TB = 256, tcols = Math.ceil(worldW / TB) + 1, tallHash = new Map();
  for (const q of hardCore(cand, worldW, 300)) {
    if (nearFoot(q.x, q.y, 10)) continue;
    /* (a wide-footed tall thing -- a hoodoo, a pylon -- spaced by its crown
       can still leave a slit beside the next) */
    const qf = feetOf(q.id, q.e, q.x, q.y);
    if (qf.length && slit(qf, null)) continue;
    const cnt = q.e.count || 1, flippable = !NO_FLIP.has(q.id);
    let piece = Math.floor(hash2(q.i, q.j, lsT + 5) * cnt), flip = flippable && hash2(q.i, q.j, lsT + 6) < 0.5;
    /* its nearest twin already standing, within 2.5 widths: drawn the
       same, turn this one the other way */
    let best = null, bd = 2.5 * q.w;
    for (let j = Math.floor((q.y - bd) / TB); j <= Math.floor((q.y + bd) / TB); j++) for (let i = Math.floor((q.x - bd) / TB); i <= Math.floor((q.x + bd) / TB); i++) {
      for (const o of tallHash.get(j * tcols + i) || []) {
        if (o.id !== q.id) continue;
        const d = Math.hypot(o.x - q.x, o.y - q.y);
        if (d < bd) { bd = d; best = o; }
      }
    }
    if (best && best.piece === piece && best.flip === flip) { if (flippable) flip = !flip; else piece = (piece + 1) % cnt; }
    put(q.id, q.x, q.y, piece, flip, 26);
    count(q.id);
    addBoxes(qf, null);
    const rec = { x: q.x, y: q.y, i: q.i, j: q.j, id: q.id, piece, flip };
    const key = Math.floor(q.y / TB) * tcols + Math.floor(q.x / TB);
    let a = tallHash.get(key);
    if (!a) tallHash.set(key, (a = []));
    a.push(rec);
    tall.push(rec);
  }

  /* ── 2. the undergrowth at their feet, in front of the trunk ── */
  const U = V2.under, lsU = s0 + 301;
  for (const q of tall) {
    const c0 = cellOf(q.x, q.y), V = c0 >= 0 ? V2_LANDS[landId(bp.reg[c0])] : null;
    if (!V || !V.under) continue;
    const n = fieldAt(q.x, q.y);
    const want = U.chance * (0.4 + 0.9 * woodOf(n) + 0.6 * edgeOf(n));
    for (let k = 0; k < U.max; k++) {
      const hk = lsU + k * 7;
      if (hash2(q.i, q.j, hk) >= want / (k + 1)) continue;
      const id = V.under[Math.floor(hash2(q.i, q.j, hk + 1) * V.under.length)], e = byId[id];
      if (!e) continue;
      const ang = (-0.15 + 1.3 * hash2(q.i, q.j, hk + 2)) * Math.PI;
      const d = U.near + (U.far - U.near) * hash2(q.i, q.j, hk + 3);
      const x = halfPx(q.x + Math.cos(ang) * d), y = halfPx(q.y + Math.sin(ang) * d * 0.6);
      const c = cellOf(x, y);
      /* in its tree's own land (a tree at a land's edge keeps its fern) */
      if (c < 0 || bp.reg[c] === townR || bp.reg[c] !== bp.reg[c0]) continue;
      const cls = bp.cls[c];
      if ((cls !== C.ground && cls !== C.obstacle) || clear[c] < 1) continue;
      if (nearFoot(x, y, 8)) continue;
      const fb = feetOf(id, e, x, y);
      if (fb.length && slit(fb, null)) continue;
      put(id, x, y, Math.floor(hash2(q.i, q.j, hk + 4) * (e.count || 1)), !NO_FLIP.has(id) && hash2(q.i, q.j, hk + 5) < 0.5, 8);
      count(id);
      if (fb.length) addBoxes(fb, null);
    }
  }

  /* ── 3. the middle things, in groups ── */
  const M = V2.mid, ms = M.step, lsM = s0 + 401;
  const parents = [];
  for (let j = 0, rows = Math.ceil(worldH / ms); j < rows; j++) for (let i = 0, cols = Math.ceil(worldW / ms); i < cols; i++) {
    const x = halfPx((i + hash2(i, j, lsM)) * ms), y = halfPx((j + hash2(i, j, lsM + 1)) * ms);
    const c = cellOf(x, y);
    if (c < 0) continue;
    const r = bp.reg[c];
    if (r === townR) continue;
    const land = landOf(r);
    if (!land || !land.mid || !land.mid.length) continue;
    const cls = bp.cls[c];
    if ((cls !== C.ground && cls !== C.obstacle) || clear[c] < M.clear) continue;
    if (land.oasis && wet[c] < OASIS.shore) continue;
    const stage = r === commonsR ? 0 : Math.max(0, bp.band[c]);
    const shore = land.shore ? wet[c] <= 3 : false;
    const id = pickKind(land.mid, stage, x, y, hash2(i, j, lsM + 3), 50, wet[c], land.shore);
    const e = id == null ? null : byId[id];
    if (!e) continue;
    if (land.shore && land.shore.includes(id) && !shore && hash2(i, j, lsM + 6) < 0.92) continue;
    const V = V2_LANDS[landId(r)] || { mid: 1 };
    const n = fieldAt(x, y), wood = woodOf(n);
    let per = M.groups * V.mid * (MINERAL.has(id) ? 1.3 - 0.9 * wood : UNDERWOOD.has(id) ? 0.45 + 1.1 * wood : 1) * (1 + (M.edge - 1) * edgeOf(n));
    per *= smooth(V2.road.mid[0], V2.road.mid[1], road[c]);
    if (core[c]) per *= V2.camp.mid; else if (camp[c]) per *= V2.camp.frame;
    if (hash2(i, j, lsM + 2) >= per * ms * ms / SCREEN_AREA) continue;
    const G = GROUPS[GROUP_OF[id] || 'scatter'];
    const { w } = sizeOf(e);
    parents.push({ x, y, i, j, id, e, w, G, r: Math.max(110, 2 * G.r * w + 50), pri: hash2(i, j, lsM + 4) });
  }
  let group = 0;
  for (const p of hardCore(parents, worldW, 600)) {
    group++;
    const nm = p.G.n[0] + Math.floor(hash2(p.i, p.j, lsM + 5) * (p.G.n[1] - p.G.n[0] + 1));
    const R = p.G.r * p.w, a0 = hash2(p.i, p.j, lsM + 7) * 2 * Math.PI;
    const cnt = p.e.count || 1, piece0 = Math.floor(hash2(p.i, p.j, lsM + 8) * cnt);
    /* a line runs mostly across the screen, a little askew */
    const lineA = (hash2(p.i, p.j, lsM + 9) - 0.5) * 0.5;
    for (let k = 0; k < nm; k++) {
      const hk = lsM + 20 + k * 5;
      let x = p.x, y = p.y;
      if (p.G === GROUPS.ring) {
        const a = a0 + (k / nm) * 2 * Math.PI + (hash2(p.i, p.j, hk) - 0.5) * 0.4;
        x = p.x + Math.cos(a) * R; y = p.y + Math.sin(a) * R * 0.6;
      } else if (p.G === GROUPS.line) {
        const t = (k - (nm - 1) / 2) * R;
        x = p.x + Math.cos(lineA) * t; y = p.y + Math.sin(lineA) * t * 0.6 + (hash2(p.i, p.j, hk) - 0.5) * 6;
      } else if (k > 0) {
        const a = hash2(p.i, p.j, hk) * 2 * Math.PI, rr = R * Math.sqrt(0.25 + 0.75 * hash2(p.i, p.j, hk + 1));
        x = p.x + Math.cos(a) * rr; y = p.y + Math.sin(a) * rr * 0.6;
      }
      x = halfPx(x); y = halfPx(y);
      const c = cellOf(x, y);
      if (c < 0 || bp.reg[c] === townR || landOf(bp.reg[c]) !== landOf(bp.reg[cellOf(p.x, p.y)])) continue;
      const cls = bp.cls[c];
      if ((cls !== C.ground && cls !== C.obstacle) || clear[c] < (k === 0 ? M.clear : 1)) continue;
      if (nearFoot(x, y, 6)) continue;
      const ps = sizeOf(p.e);
      if (covers(x, y, ps.w, ps.h) || coversTown(x, y, ps.w, ps.h)) continue;
      const fb = feetOf(p.id, p.e, x, y);
      if (fb.length && slit(fb, group)) continue;
      put(p.id, x, y, (piece0 + k) % cnt, !NO_FLIP.has(p.id) && hash2(p.i, p.j, hk + 2) < 0.5, 14);
      count(p.id);
      if (fb.length) addBoxes(fb, group);
    }
  }

  /* ── 4. the low things, in drifts ── */
  const L = V2.low, lsL = s0 + 701;
  for (let j = 0, rows = Math.ceil(worldH / L.step); j < rows; j++) for (let i = 0, cols = Math.ceil(worldW / L.step); i < cols; i++) {
    const x = halfPx((i + hash2(i, j, lsL)) * L.step), y = halfPx((j + hash2(i, j, lsL + 1)) * L.step);
    const c = cellOf(x, y);
    if (c < 0) continue;
    const r = bp.reg[c];
    if (r === townR) continue;
    const land = landOf(r);
    if (!land || !land.small || !land.small.length) continue;
    const cls = bp.cls[c];
    if ((cls !== C.ground && cls !== C.obstacle) || clear[c] < L.clear) continue;
    if (land.oasis && wet[c] < OASIS.shore) continue;
    const V = V2_LANDS[landId(r)] || { low: 1 };
    const n2 = 0.5 + 0.5 * fbm(x / L.patchWave, y / L.patchWave, s0 + 9, 3);
    const per = L.perScreen * V.low * (0.15 + 2.0 * smooth(L.patch[0], L.patch[1], n2)) * (1 + 0.5 * edgeOf(fieldAt(x, y))) * (core[c] ? V2.camp.low : 1);
    if (hash2(i, j, lsL + 2) >= per * L.step * L.step / SCREEN_AREA) continue;
    const stage = r === commonsR ? 0 : Math.max(0, bp.band[c]);
    const shore = land.shore ? wet[c] <= 3 : false;
    const id = pickKind(land.small, stage, x, y, hash2(i, j, lsL + 3), 90, wet[c], land.shore);
    const e = id == null ? null : byId[id];
    if (!e) continue;
    if (land.shore && land.shore.includes(id) && !shore && hash2(i, j, lsL + 6) < 0.92) continue;
    if (nearFoot(x, y, 20)) continue;
    const fb = feetOf(id, e, x, y);
    if (fb.length && slit(fb, null)) continue;
    put(id, x, y, Math.floor(hash2(i, j, lsL + 4) * (e.count || 1)), !NO_FLIP.has(id) && hash2(i, j, lsL + 5) < 0.5, 8);
    count(id);
    if (fb.length) addBoxes(fb, null);
  }
}
