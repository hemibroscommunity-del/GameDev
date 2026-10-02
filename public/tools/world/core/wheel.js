/* ═══ v2.3.2936: THE WHEEL — the island's shape, and where every level is ═══
 *
 * Owner, 2026-09-29: "I want each 8 regions to have its own monster tiers
 * though (im thinking 1-80 with a zone sized space separating each 5
 * levels) so The game is all about elements. Each monster should have an
 * elemental type ... except for light and dark which are endgame elements
 * (im thinking lvl 80-100)."  Then, choosing: "1-80 plus dark and light".
 *
 * So the island is a WHEEL: Brotown and its safe commons at the hub, and one
 * SPOKE of land per element running out from it.  Along every spoke the
 * levels climb one TIER per zone of walking -- five levels a tier, sixteen
 * tiers, 1 to 80 -- and at every tip a GATE leads to one of the two endgame
 * realms, Dark or Light (80-100), which are maps of their own behind doors.
 * Between the spokes is sea.  Two rings of PASSES join neighbouring spokes
 * at the same level (20 and 60), and a CAMP (waystation) marks levels 20,
 * 40, 60 and 80 on every road.
 *
 * This module is the geometry, and nothing else: plan.js holds the wheel's
 * numbers and each spoke's look and names; layout.js asks this module which
 * spoke, tier and stage a cell is in; plan.js asks it where the roads, camps
 * and passes go.  One set of formulas for both, so a road always runs down
 * the middle of its spoke and a camp always sits at its level.
 *
 * ── UNITS ──
 * Positions are in SQUARES from the world centre (east +x, south +y), like
 * the rest of the plan.  The wheel's own numbers are in ZONES -- the owner's
 * unit, one of today's 1,024 game px zones -- and converted here:
 * one zone = zonePx / (worldPxPerArtPx x square step) squares.
 *
 * ── NO TRIGONOMETRY ──
 * Every value here decides which cell is land, so it must come out
 * bit-for-bit the same on a phone and a desktop.  JavaScript engines agree
 * on + - * / and sqrt but not on sin, cos or atan2 (core/rng.js), so spokes
 * point along the eight compass directions -- unit vectors made with sqrt
 * alone -- and arcs are drawn by normalised interpolation, not by angle.
 */

/* The compass: a spoke's `dir` in plan.js is one of these names. */
const R2 = Math.sqrt(0.5);
export const COMPASS = Object.freeze({
  N: [0, -1], NE: [R2, -R2], E: [1, 0], SE: [R2, R2],
  S: [0, 1], SW: [-R2, R2], W: [-1, 0], NW: [-R2, -R2],
});

const round3 = (v) => Math.round(v * 1000) / 1000;
const norm = (x, y) => { const l = Math.sqrt(x * x + y * y) || 1; return [x / l, y / l]; };

/* Everything about the wheel, in squares, from the plan.  `spokes` is in
   the order plan.js lists them (clockwise from north-west). */
export function wheelInfo(plan) {
  const w = plan.wheel;
  const step = plan.square.px - plan.square.overlap;
  const Z = w.zonePx / (plan.worldPxPerArtPx * step);   /* squares per zone */
  const hub = w.hub * Z, tierLen = w.tierZones * Z, half = (w.width * Z) / 2;
  const lastR = hub + w.tiers * tierLen;                 /* where the last tier ends */
  const tipR = lastR + w.tip * Z;                        /* where the land ends */
  const capR = tipR - half;                              /* the spoke's axis ends here; a round cap of `half` beyond it */
  const ids = Object.keys(plan.regions).filter((k) => plan.regions[k].dir);
  const spokes = ids.map((id, i) => {
    const [ux, uy] = COMPASS[plan.regions[id].dir];
    return { id, i, ux, uy, realm: plan.regions[id].realm || null };
  });
  /* neighbours round the wheel, each pair once, clockwise */
  const order = [...spokes].sort((a, b) => clockOrder(a) - clockOrder(b));
  const pairs = order.map((a, k) => [a, order[(k + 1) % order.length]]);
  return {
    Z, hub, tierLen, half, lastR, tipR, capR, tiers: w.tiers, levelsPerTier: w.levelsPerTier,
    stageTiers: w.stageTiers, stages: Math.ceil(w.tiers / w.stageTiers),
    spokes, pairs, byId: Object.fromEntries(spokes.map((s) => [s.id, s])),
    /* where a spoke's keystone gate stands: halfway through its tip */
    gateR: (lastR + tipR) / 2,
    /* the middle of tier t, measured from the world centre (t may be
       fractional: 4.5 is three quarters of the way through tier 4) */
    tierMid: (t) => hub + (t - 0.5) * tierLen,
    levels: (t) => [(t - 1) * w.levelsPerTier + 1, t * w.levelsPerTier],
  };
}

/* Compass directions clockwise from north: N 0, NE 1, ... NW 7. */
function clockOrder(s) {
  const k = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let i = 0; i < k.length; i++) if (COMPASS[k[i]][0] === s.ux && COMPASS[k[i]][1] === s.uy) return i;
  return 99;
}

/* A point `r` squares out along a spoke's axis, `side` squares to its right
   (looking outward), rounded so two plan entries built from the same numbers
   are exactly equal -- which is how a fork is recognised (prompt.js). */
export function spokePoint(s, r, side = 0) {
  return [round3(s.ux * r - s.uy * side), round3(s.uy * r + s.ux * side)];
}

/* The point a fraction `t` of the way round the arc at radius `r` from
   spoke a's axis (t = 0) to spoke b's (t = 1), by normalised interpolation
   of the two directions. */
export function arcPoint(a, b, r, t) {
  if (t <= 0) return spokePoint(a, r);
  if (t >= 1) return spokePoint(b, r);
  const [dx, dy] = norm(a.ux * (1 - t) + b.ux * t, a.uy * (1 - t) + b.uy * t);
  return [round3(dx * r), round3(dy * r)];
}

/* That arc as `n` + 1 points.  Its ends are exactly the two spokes' axis
   points at `r`, so a pass road starts and ends ON its trunk roads. */
export function arcPoints(a, b, r, n = 8) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push(arcPoint(a, b, r, k / n));
  return out;
}

/* Distance (squares) from (x, y) to a spoke's axis -- a segment from the
   centre to `capR` along its direction.  Land is where this is under
   `half`: every spoke is a capsule, and they all meet at the hub. */
export function axisDist(W, s, x, y) {
  let t = x * s.ux + y * s.uy;
  if (t < 0) t = 0; else if (t > W.capR) t = W.capR;
  const qx = x - s.ux * t, qy = y - s.uy * t;
  return Math.sqrt(qx * qx + qy * qy);
}

/* Is (x, y) between spoke a's direction and spoke b's (clockwise, a then b)?
   Screen y points south, so "clockwise" is a positive cross product. */
export function between(a, b, x, y) {
  return a.ux * y - a.uy * x >= 0 && x * b.uy - y * b.ux >= 0;
}

/* The tier at distance r from the centre: 0 inside the hub, then 1..tiers
   (the land past the last tier -- the gate's cap -- is the last tier). */
export function tierAt(W, r) {
  if (r < W.hub) return 0;
  const t = Math.ceil((r - W.hub) / W.tierLen);
  return t < 1 ? 1 : t > W.tiers ? W.tiers : t;
}

/* The stage (0-based) a tier is painted as: four looks per spoke, one per
   twenty levels -- and the ground swatches follow them. */
export function stageOf(W, t) {
  return t < 1 ? 0 : Math.min(W.stages - 1, Math.floor((t - 1) / W.stageTiers));
}
