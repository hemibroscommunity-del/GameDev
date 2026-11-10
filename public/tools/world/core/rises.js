/* ═══ v2.3.3994: RISES — raised ground on the flat map ═══
 *
 * The owner, 2026-11-02: "Make a portion of the game that you need to swim in
 * ... and also a portion of the game that you need to climb (explore
 * animations for this) and double jump to get to the next part.  Maybe this
 * is part of the 'elevation' addition of the game where you add hills and
 * dips."  docs/ELEVATION-PLAN.md has the design; this is its ground.
 *
 * A RISE (plan.js `rises`) is ordinary ground with a rock FACE on its south
 * side and a thin RIM on its other edges -- the terraces of A Link to the Past
 * and Stardew Valley.  Nobody has a height number: "on top" is standing on the
 * ground above the face.  So everything that already works in screen space
 * (the depth sort, the shadows, the server's speed check, the messages) keeps
 * working, and a face is just cells of the walk grid you cannot walk into,
 * like the sea -- except that:
 *   - a climb strip (`climb`) of vines down a face is climbed, straight up
 *     and down (src/game/climb.js);
 *   - a jump going north crosses a face it can reach -- 72 px with a
 *     sprinting jump, 144 px only with the flip -- and a missed one drops you
 *     back where you jumped from (src/game/climb.js faceCross).
 *
 * What is here, pure (no worker, no page; node tests it):
 *   riseLayout(plan)   every rise in CELLS from the whole blueprint's corner
 *                      (24 game px each), on its islet (layout.js
 *                      planFeatures `islets`), and the islet's one grid of
 *                      cell kinds -- what the ground worker sends the game
 *                      with its 'ready' (ground-worker.js) and the walk grid
 *                      shuts (src/game/wheelTrial.js lazyGrid);
 *   risePaint(...)     the faces, rims, vines and the chest painted into a
 *                      laid piece of ground, in code: one face picture for
 *                      the Water Caves from its `cliffPaint` ("a dark mossy
 *                      sea cliff with glowing teal caves at its foot"), in
 *                      RISE_PALETTE's colours only (well under 256: the
 *                      memory law's "256 colours a picture at most").
 *
 * Never Wheel objects: an object can be smashed and comes back (v2.3.2995),
 * and one is drawn by its feet, over a bro climbing it (ELEVATION-PLAN.md
 * "Things found in the code").  Collision comes from the plan, never from the
 * pictures (tiledMaps.js v2.3.1777/1794).
 */
import { planFeatures } from './layout.js';
import { valueNoise, hash2 } from './rng.js';

/* a cell's kind (the low three bits of a grid byte; the rise's index + 1 is
   above them, 0 a cell of no rise) */
export const RISE_KIND = Object.freeze({ top: 0, face: 1, rim: 2, climb: 3, chest: 4, ramp: 5 });
/* kinds the walk grid shuts (everything but a top -- and, v2.3.4471, a RAMP: a strip of a face you
   WALK up, a grassy slope, where a climb strip is vines you climb) */
export const RISE_SHUT = Object.freeze([false, true, true, true, true, false]);

const LAYOUTS = new WeakMap();

/** Every rise of the plan, on its islet.  null when the plan has none (or
    none whose islet is on this Wheel).  Cells are the whole blueprint's. */
export function riseLayout(plan) {
  if (LAYOUTS.has(plan)) return LAYOUTS.get(plan);
  const F = planFeatures(plan);
  const cellG = F.S * plan.worldPxPerArtPx;   /* game px a cell (24) */
  const list = [];
  for (const rs of plan.rises || []) {
    /* where its box is counted from: an islet's corner -- or, v2.3.4456, `at`:
       cells from the Wheel's centre cell (the town's middle), for a rise on
       plain land (the Town Bluff, on the commons).  `long: true` keeps such a
       rise to the long Wheel, as an islet's own flag does: the short Wheel's
       centre cell is elsewhere and its commons a fifth the room. */
    let ox, oy, where = null;
    if (rs.islet) {
      const I = F.islets.find((il) => il.id === rs.islet);
      if (!I) continue;
      ox = I.x0; oy = I.y0; where = I.id;
    } else if (rs.at) {
      if (rs.long && !(plan.wheel.tierZones > 1)) continue;
      ox = Math.floor(F.cellX(F.g.cx)) + rs.at[0]; oy = Math.floor(F.cellY(F.g.cy)) + rs.at[1];
    } else continue;
    const x0 = ox + rs.box[0], y0 = oy + rs.box[1], x1 = ox + rs.box[2], y1 = oy + rs.box[3];
    const face = rs.face | 0;
    list.push({ id: rs.id, name: rs.name || rs.id, islet: where, look: rs.look || null, keepOut: rs.keepOut | 0, round: rs.round | 0, k: list.length,
      x0, y0, x1, y1, faceY0: y1 - face, face, h: face * cellG,
      climb: rs.climb ? { x0: ox + rs.climb[0], x1: ox + rs.climb[1] } : null,
      ramp: rs.ramp ? { x0: ox + rs.ramp[0], x1: ox + rs.ramp[1] } : null,
      chest: rs.chest ? { x0: ox + rs.chest[0], y0: oy + rs.chest[1], x1: ox + rs.chest[2], y1: oy + rs.chest[3] } : null });
  }
  let out = null;
  if (list.length) {
    let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    for (const r of list) { gx0 = Math.min(gx0, r.x0); gy0 = Math.min(gy0, r.y0); gx1 = Math.max(gx1, r.x1); gy1 = Math.max(gy1, r.y1); }
    const w = gx1 - gx0, h = gy1 - gy0;
    const cells = new Uint8Array(w * h);
    for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) {
      const at = kindOf(list, x, y);
      if (at) cells[(y - gy0) * w + (x - gx0)] = ((at.r.k + 1) << 3) | at.kind;
    }
    out = { cell: cellG, x0: gx0, y0: gy0, w, h, cells, list };
  }
  LAYOUTS.set(plan, out);
  return out;
}

/* The kind of cell (x, y) and its rise, or null: the LAST rise listed whose
   box holds it (a rise inside another stands on its top), then that rise's
   rule -- the face its last `face` rows (the climb strip through it), the
   chest's cells, the rim its first row and first and last columns, the rest
   its top. */
function kindOf(list, x, y) {
  for (let k = list.length - 1; k >= 0; k--) {
    const r = list[k];
    if (x < r.x0 || y < r.y0 || x >= r.x1 || y >= r.y1) continue;
    if (y >= r.faceY0) {
      if (r.ramp && x >= r.ramp.x0 && x < r.ramp.x1) return { r, kind: RISE_KIND.ramp };
      return { r, kind: r.climb && x >= r.climb.x0 && x < r.climb.x1 ? RISE_KIND.climb : RISE_KIND.face };
    }
    if (r.chest && x >= r.chest.x0 && x < r.chest.x1 && y >= r.chest.y0 && y < r.chest.y1) return { r, kind: RISE_KIND.chest };
    if (y === r.y0 || x === r.x0 || x === r.x1 - 1) return { r, kind: RISE_KIND.rim };
    /* v2.3.4471: `round`: its two back corners cut off on the diagonal, `round` cells deep -- rim too,
       so the hill's drawn corner (hillRim) is a wide curve with nobody walking outside it */
    if (r.round > 0 && Math.min(x - r.x0, r.x1 - 1 - x) + (y - r.y0) <= r.round) return { r, kind: RISE_KIND.rim };
    return { r, kind: RISE_KIND.top };
  }
  return null;
}

/** What the ground worker sends the game (its 'ready', with `?climb=1`):
    every number in GAME px from the Wheel's top-left, as the game reads them
    (src/game/climb.js), and the grid of kinds. */
export function riseMessage(plan) {
  const L = riseLayout(plan);
  if (!L) return null;
  const c = L.cell;
  const box = (x0, y0, x1, y1) => ({ x0: x0 * c, y0: y0 * c, x1: x1 * c, y1: y1 * c });
  return {
    cell: c, x0: L.x0, y0: L.y0, w: L.w, h: L.h, cells: L.cells.slice(),
    list: L.list.map((r) => ({
      id: r.id, name: r.name, k: r.k, h: r.h,
      box: box(r.x0, r.y0, r.x1, r.y1),
      /* the face's band: from its top edge (the top's front) down to its foot */
      face: box(r.x0, r.faceY0, r.x1, r.y1),
      climb: r.climb ? box(r.climb.x0, r.faceY0, r.climb.x1, r.y1) : null,
      ramp: r.ramp ? box(r.ramp.x0, r.faceY0, r.ramp.x1, r.y1) : null,
      chest: r.chest ? box(r.chest.x0, r.chest.y0, r.chest.x1, r.chest.y1) : null,
    })),
  };
}

/* ── the picture ── */

/* Every colour the rises are drawn in (the memory law: 256 a picture at
   most -- these are all a piece gains).  From the Water Caves' cliffPaint,
   "a dark mossy sea cliff with glowing teal caves at its foot", in its
   obstacle's dark rock (#5a5f55) and its gate's teal (#2ab3a8); every edge
   that stands up outlined in a darker shade of its own colour, never black
   (plan.js style). */
export const RISE_PALETTE = Object.freeze({
  rock: Object.freeze([[46, 52, 49], [58, 65, 61], [70, 78, 72], [84, 92, 85], [99, 108, 99]]),
  edge: [36, 41, 39],
  moss: Object.freeze([[56, 79, 46], [69, 96, 54], [88, 118, 64], [112, 142, 76]]),
  barnacle: Object.freeze([[132, 136, 124], [160, 162, 150]]),
  cave: Object.freeze([[24, 34, 36], [31, 64, 66]]),
  glow: Object.freeze([[42, 179, 168], [96, 214, 198], [168, 240, 226]]),
  vine: Object.freeze([[38, 72, 40], [58, 104, 52], [86, 140, 66], [120, 172, 82]]),
  wood: Object.freeze([[74, 44, 22], [110, 70, 36], [140, 94, 48]]),
  woodEdge: [52, 30, 16],
  iron: Object.freeze([[70, 74, 80], [118, 124, 132]]),
  gold: Object.freeze([[196, 150, 52], [240, 204, 96]]),
  /* v2.3.4471: a `look: 'hill'` rise (the Town Bluff, on the commons' grass) in the owner's reference
     sheet's "grass ledge": a cliff of rounded brown boulders (the darkest the gaps between them and
     every outline), under a thick cap of the commons' own short green grass (#86b94f) with its dark
     edge, and the shade it throws on the grass at its foot -- not the sea's dark rock */
  boulder: Object.freeze([[58, 36, 28], [86, 55, 39], [112, 73, 49], [138, 93, 61], [163, 114, 76], [188, 140, 96]]),
  grass: Object.freeze([[70, 112, 46], [92, 140, 56], [114, 164, 66], [134, 185, 79], [156, 202, 96]]),
  grassEdge: [48, 82, 38],
  shade: Object.freeze([[62, 100, 42], [80, 122, 52]]),
});

const pick = (arr, v) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor(v * arr.length)))];

/**
 * Paint the rises into a laid piece of ground.  `data` RGBA, `ow` x `oh`
 * pixels covering art px from (X0, Y0) at `K` pixels an art px; `F` the
 * plan's features (its corner F.x0/F.y0 in art px, its cell F.S); `wpa` game
 * px an art px.  Every pixel is worked out from where it is on the Wheel, so
 * two pieces meet with no seam.  Returns how many pixels it painted.
 */
export function risePaint(plan, data, ow, oh, X0, Y0, K, opts = {}) {
  const L = riseLayout(plan);
  if (!L) return 0;
  const F = planFeatures(plan);
  const wpa = plan.worldPxPerArtPx, c = L.cell, seed = (plan.seed | 0) + 4955;
  /* the piece's game-px box, and is any rise near it? */
  const gxa = (X0 - F.x0) * wpa, gya = (Y0 - F.y0) * wpa;
  const gxb = gxa + (ow / K) * wpa, gyb = gya + (oh / K) * wpa;
  const LIFT = 34;   /* the chest and the lip draw a little above their cells */
  const BELOW = 22;   /* v2.3.4462: a hill's shade falls a little below its foot */
  if (gxb < L.x0 * c || gxa > (L.x0 + L.w) * c || gyb < L.y0 * c - LIFT || gya > (L.y0 + L.h) * c + BELOW) return 0;
  /* v2.3.4456: ...and near one rise in particular -- the grid is ONE box over every rise, and with a
     rise by the town and two on the islet that box is a strip a quarter of the Wheel long: a piece in it
     but near no rise has nothing to paint, and must not ask every pixel */
  let near = false;
  for (const r of L.list) {
    if (gxb >= r.x0 * c && gxa <= r.x1 * c && gyb >= r.y0 * c - LIFT && gya <= r.y1 * c + BELOW) { near = true; break; }
  }
  if (!near) return 0;
  let n = 0;
  const set = (o, rgb) => { data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255; n++; };
  const step = wpa / K;   /* game px a picture pixel (0.5) */
  for (let py = 0; py < oh; py++) {
    const gy = gya + (py + 0.5) * step;
    for (let px = 0; px < ow; px++) {
      const gx = gxa + (px + 0.5) * step;
      const rgb = riseColour(L, gx, gy, seed);
      if (rgb) set((py * ow + px) * 4, rgb);
    }
  }
  return n;
}

/* the colour a rise draws at game px (gx, gy), or null where it draws
   nothing (the ground as laid shows) */
export function riseColour(L, gx, gy, seed) {
  const c = L.cell;
  /* the chest first: it stands up from its cells, over the rim behind it */
  for (const r of L.list) {
    if (!r.chest) continue;
    const col = chestColour(r.chest, c, gx, gy);
    if (col) return col;
  }
  const cx = Math.floor(gx / c), cy = Math.floor(gy / c);
  /* a face's lip reaches a little up into the top's front row, so the top
     ends on a wandering line, not a cell's edge */
  for (let k = L.list.length - 1; k >= 0; k--) {
    const r = L.list[k];
    const hill = r.look === 'hill';
    if (gx < r.x0 * c || gx >= r.x1 * c || gy < r.y0 * c - 8 || gy >= r.y1 * c + (hill ? 22 : 5)) continue;
    const top = r.faceY0 * c;
    /* the lip's line: wandering 0-4 px over the face's top edge; the foot's,
       0-4 px past the face's last row onto the ground below (rubble), so
       neither is a ruler line (the art law; the walk grid stays on cells) */
    /* v2.3.4471: a hill's wander further and more slowly (a game px is under half a screen px on a
       phone): its lip up to 7 px into the top's front row, its foot up to 9 px onto the ground */
    const lip = hill ? top - 3.5 + 3.5 * valueNoise(gx * 0.045, 3.1, seed + r.k) : top - 2 + 2 * valueNoise(gx * 0.07, 3.1, seed + r.k);
    const foot = r.y1 * c + 2 + 2 * valueNoise(gx * 0.09, 5.3, seed + 7 + r.k) + (hill ? 2.5 + 2.5 * valueNoise(gx * 0.031, 8.8, seed + 9 + r.k) : 0);
    if (gy >= lip && gy < foot) return hill ? hillFace(r, c, gx, gy, top, foot, lip, seed) : faceColour(r, c, gx, gy, top, foot, lip, seed);
    /* v2.3.4462: a hill throws a little shade on the ground at its foot (what makes a bank stand UP on
       flat grass): 11 px, thinning out, so it ends in the grass and not on a line */
    if (hill && gy >= foot && gy < foot + 11) {
      /* v2.3.4471: ...but none under a ramp (nothing stands over its foot) or past the cliff's round ends */
      if (gx < r.x0 * c + 10 || gx >= r.x1 * c - 10 || (r.ramp && gx >= r.ramp.x0 * c + 5 && gx < r.ramp.x1 * c - 5)) continue;
      const t = (gy - foot) / 11;
      return hash2(Math.floor(gx), Math.floor(gy), seed + 41) > t * 0.95 ? RISE_PALETTE.shade[t < 0.45 ? 0 : 1] : null;
    }
    if (gy >= r.y1 * c) continue;
    if (gy < r.y0 * c) {
      /* above the north rim: the rim's back edge, a hair of rock */
      continue;
    }
    if (inside(L, cx, cy, r)) return rimColour(r, c, gx, gy, seed);
    return null;
  }
  return null;
}

/* is cell (cx, cy) a rim cell of rise r (and of no rise inside it)? */
function inside(L, cx, cy, r) {
  const i = (cy - L.y0) * L.w + (cx - L.x0);
  if (cx < L.x0 || cy < L.y0 || cx >= L.x0 + L.w || cy >= L.y0 + L.h) return false;
  const v = L.cells[i];
  return v !== 0 && (v >> 3) === r.k + 1 && (v & 7) === RISE_KIND.rim;
}

function faceColour(r, c, gx, gy, top, foot, lip, seed) {
  const x0 = r.x0 * c, x1 = r.x1 * c;
  /* the outline: one darker pixel along the lip and down both ends */
  if (gy < lip + 1 || gx < x0 + 1 || gx >= x1 - 1) return RISE_PALETTE_EDGE;
  /* the moss lip: a fringe a few px deep, ragged */
  const fringe = 3 + 3 * (valueNoise(gx * 0.19, 7.7, seed + 11) * 0.5 + 0.5);
  if (gy < lip + fringe) return pick(RISE_PALETTE.moss, 0.55 + 0.45 * (1 - (gy - lip) / fringe));
  /* the vines, over the climb strip */
  if (r.climb && gx >= r.climb.x0 * c && gx < r.climb.x1 * c) {
    const v = vineColour(r, c, gx, gy, lip, foot, seed);
    if (v) return v;
  }
  /* a cave mouth at the foot now and then, glowing teal inside */
  /* v2.3.4456: not on a `look: 'hill'` rise (the Town Bluff stands in grass, not the sea) */
  const cave = r.look === 'hill' ? null : caveColour(r, c, gx, gy, foot, seed);
  if (cave) return cave;
  /* the rock: rough strata, cracks and patches of moss */
  const depth = (gy - top) / Math.max(1, foot - top);
  const strata = valueNoise(gx * 0.02, gy * 0.16, seed + 21);
  const grain = valueNoise(gx * 0.31, gy * 0.31, seed + 23);
  let shade = 0.55 + 0.32 * strata + 0.14 * grain - 0.25 * depth;
  /* a crack: a thin dark seam running down the face */
  const seam = Math.abs(valueNoise(gx * 0.045, gy * 0.012, seed + 25));
  if (seam < 0.035) return RISE_PALETTE.rock[0];
  /* a ledge's lit top: a band brighter where the strata turn */
  if (strata > 0.62 && grain > 0) shade += 0.18;
  const moss = valueNoise(gx * 0.06, gy * 0.06, seed + 27) + 0.6 * (1 - depth) - 0.55;
  if (moss > 0.12) return pick(RISE_PALETTE.moss, 0.15 + 0.5 * grain * 0.5 + 0.25 * (1 - depth));
  /* barnacles low down, where the sea reaches */
  if (r.look !== 'hill' && depth > 0.7 && hash2(Math.floor(gx), Math.floor(gy * 2), seed + 29) > 0.985) return pick(RISE_PALETTE.barnacle, grain * 0.5 + 0.5);
  return pick(RISE_PALETTE.rock, shade);
}
const RISE_PALETTE_EDGE = RISE_PALETTE.edge;

/* the vines down a climb strip: a few strands, each a wavy stem with leaves
   either side; the rock behind them darker */
function vineColour(r, c, gx, gy, lip, foot, seed) {
  const sx0 = r.climb.x0 * c, sx1 = r.climb.x1 * c, w = sx1 - sx0;
  const strands = Math.max(3, Math.round(w / 12));
  for (let s = 0; s < strands; s++) {
    const base = sx0 + (s + 0.5) * (w / strands) + (hash2(s, r.k, seed + 31) - 0.5) * 4;
    const sway = 2.2 * Math.sin((gy + s * 17) * 0.11) + 1.2 * valueNoise(s * 3.3, gy * 0.05, seed + 33);
    const d = gx - (base + sway);
    /* each strand ends a little short of the foot, ragged */
    const end = foot - 4 - 8 * hash2(s, r.k, seed + 35);
    if (gy > end) continue;
    if (Math.abs(d) < 1.1) return RISE_PALETTE.vine[d < 0 ? 0 : 1];
    /* a leaf every ~9 px, left then right */
    const j = Math.floor((gy - lip) / 9), side = j % 2 ? 1 : -1;
    const ly = lip + j * 9 + 4.5, lx = base + sway + side * 3.2;
    const ex = (gx - lx) / 3.2, ey = (gy - ly) / 2.1;
    if (ex * ex + ey * ey < 1) return RISE_PALETTE.vine[ey < 0 ? 3 : 2];
  }
  /* the rock showing between the strands, in shadow */
  return null;
}

/* cave mouths along a face's foot: arches, dark inside, teal glowing at the
   back -- only on a face tall enough to hold one (the high ledge's) */
function caveColour(r, c, gx, gy, foot, seed) {
  if (r.h < 100) return null;
  const n = Math.max(1, Math.floor((r.x1 - r.x0) * c / 70));
  for (let k = 0; k < n; k++) {
    if (hash2(k, r.k, seed + 41) < 0.35) continue;
    const span = (r.x1 - r.x0) * c / n;
    const mx = r.x0 * c + (k + 0.25 + 0.5 * hash2(k, r.k, seed + 43)) * span;
    const hw = 9 + 5 * hash2(k, r.k, seed + 45), hh = 12 + 8 * hash2(k, r.k, seed + 47);
    const ex = (gx - mx) / hw, ey = (foot - gy) / hh;
    if (ey < 0 || ex * ex + ey * ey >= 1) continue;
    const d = Math.sqrt(ex * ex + ey * ey);
    if (d > 0.86) return RISE_PALETTE.edge;
    /* the glow: brightest low in the middle, at the back of the cave */
    const g = (1 - d) * (1 - 0.6 * ey);
    if (g > 0.55) return RISE_PALETTE.glow[g > 0.75 ? 2 : g > 0.65 ? 1 : 0];
    return RISE_PALETTE.cave[g > 0.35 ? 1 : 0];
  }
  return null;
}

/* a rim: a low lip of the same rock, mossy on top, its outer edge outlined */
function rimColour(r, c, gx, gy, seed) {
  if (r.look === 'hill') return hillRim(r, c, gx, gy, seed);
  const g = valueNoise(gx * 0.27, gy * 0.27, seed + 51);
  const lit = valueNoise(gx * 0.05, gy * 0.05, seed + 53);
  /* the outer edge, one darker pixel: the west, east and north sides */
  const ox = gx - r.x0 * c, oxe = r.x1 * c - gx, oy = gy - r.y0 * c;
  if (ox < 1 || oxe <= 1 || oy < 1) return RISE_PALETTE.edge;
  if (lit + 0.35 * g > 0.35) return pick(RISE_PALETTE.moss, 0.3 + 0.35 * (g * 0.5 + 0.5));
  return pick(RISE_PALETTE.rock, 0.45 + 0.4 * (g * 0.5 + 0.5));
}

/* ═══ v2.3.4471: A HILL'S OWN LOOK (`look: 'hill'`: the Town Bluff) ═══
   The owner, 2026-11-10, with a reference sheet ("Terrain Elevation - Tile Set", its "grass ledge"
   row) and these words for it: "making the elevation feel like a raised piece of the existing world
   rather than a brown rectangle placed on top of it ... Keep the grass on top of the elevation
   identical to the surrounding grass tiles.  The elevation should be communicated through the cliff
   faces, shading, and grass overhangs -- not by changing the entire ground texture ... a single-height
   grassy bluff with a visible southern cliff face, irregular rocky edges, and one grassy ramp."
   (v2.3.4462's first try was a flat band of packed earth under a ruler-straight outline.)  So:
     the TOP paints nothing: it is the ground as laid, the very grass around it;
     the FACE is a cliff of rounded brown boulders, lit from above, dark in the gaps, under a thick
       CAP of grass whose blades hang over it, with the ground's own tufts standing in front of its
       foot and its shade on the grass below (riseColour);
     the SIDES are the same cliff seen nearly edge-on: a narrow wall of boulders, widest where it
       meets the face and thinning to an outline at the back, so the block reads as leaning away;
     the OUTLINE wanders (hillEdge) and its corners are round: no edge is a ruler's.  All of that is
       inside the rim's and the face's own cells, which stay solid: the walk grid is still cells;
     a RAMP (`ramp`) is a gap in the face where the grass runs down to the ground: the ground as
       laid again, the cliff's cut ends casting more shade the taller they stand.
   Painted in code like the rest (the sheet is "a visual design reference rather than a ...
   game-ready tile atlas": no picture is loaded), in RISE_PALETTE's own colours. */
const HILL = Object.freeze({ GW: 16, GH: 20, WALL: 13, WALL_BACK: 5, CORNER: 14, FOOT_R: 10 });
/* where a hill's drawn edge is, px in from its box's side `side` (0 west, 1 east, 2 north) at `t` px
   along it: 1-9 px, wandering slowly, stepping a little from one boulder to the next, with a blade
   of grass or a stone's corner sticking out here and there.  (A phone shows a game px at under half
   a screen px: an edge that wanders 2 px is a ruler's line there.) */
function hillEdge(r, side, t, seed) {
  return 5 + 3 * valueNoise(t * 0.035, side * 9.1 + r.k * 3.7, seed + 61) + 2 * (hash2(Math.floor(t / HILL.GH), side + r.k * 5, seed + 65) - 0.5)
    + (hash2(Math.floor(t / 3), side + r.k * 5, seed + 63) > 0.72 ? -1 : 0);
}
/* the side wall's width at game px gy: HILL.WALL_BACK at the back, HILL.WALL where it meets the face */
function hillWall(r, c, gy) {
  const y0 = r.y0 * c, top = r.faceY0 * c;
  const s = Math.max(0, Math.min(1, (gy - y0) / Math.max(1, top - y0)));
  return HILL.WALL_BACK + (HILL.WALL - HILL.WALL_BACK) * s;
}
/* a boulder of the cliff at (gx, gy): the cells of a jittered grid of points, taller than wide, each
   a stone lit from the upper left with a dark gap round it.  `dark` 0-1 takes it down (deep in the
   face, under the cap, the side in shadow). */
function boulderColour(gx, gy, dark, seed) {
  const u = gx / HILL.GW, v = gy / HILL.GH, iu = Math.floor(u), iv = Math.floor(v);
  let f1 = 9, f2 = 9, sx = 0, sy = 0, sh = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ci = iu + i, cj = iv + j;
    const px = ci + 0.5 + (cj & 1 ? 0.5 : 0) + (hash2(ci, cj, seed + 71) - 0.5) * 0.6;
    const py = cj + 0.5 + (hash2(ci, cj, seed + 73) - 0.5) * 0.5;
    const d = Math.hypot(u - px, v - py);
    if (d < f1) { f2 = f1; f1 = d; sx = u - px; sy = v - py; sh = hash2(ci, cj, seed + 75); } else if (d < f2) f2 = d;
  }
  const gap = f2 - f1;
  if (gap < 0.1) return RISE_PALETTE.boulder[0];
  let lit = 0.62 - 0.55 * sy - 0.3 * sx + 0.22 * (sh - 0.5) - 0.3 * dark;
  if (gap < 0.24 && (sy > 0.05 || sx > 0.1)) lit -= 0.2;   /* the stone's own underside, by the gap */
  return RISE_PALETTE.boulder[1 + Math.max(0, Math.min(4, Math.floor(lit * 5)))];
}
function hillFace(r, c, gx, gy, top, foot, lip, seed) {
  const ox = gx - r.x0 * c, oxe = r.x1 * c - gx;
  /* the cliff's two ends: its wandering edge, and a round corner at the foot */
  const dw = ox - hillEdge(r, 0, gy, seed), de = oxe - hillEdge(r, 1, gy, seed), dEnd = Math.min(dw, de);
  if (dEnd < 0) return null;
  const ds = foot - gy;
  let round = 9;
  if (dEnd < HILL.FOOT_R && ds < HILL.FOOT_R) {
    round = HILL.FOOT_R - Math.hypot(HILL.FOOT_R - dEnd, HILL.FOOT_R - ds);
    if (round < 0) return null;
  }
  const q = gy - lip;
  /* a ramp: the grass runs down through the face.  The ground as laid shows (null), under the shade
     of the cut ends either side -- wider the lower you are, where they stand taller over you -- and a
     few broken lines of darker grass across it, the slope's own steps */
  if (r.ramp) {
    const rx0 = r.ramp.x0 * c, rx1 = r.ramp.x1 * c;
    /* (its cut ends are drawn as the side walls are, leaning in: 3 px into the ramp's own cells at
       its top, 9 at its foot, where they stand a face tall -- the feet's box stops 10 short of them) */
    const t = Math.max(0, Math.min(1, (gy - top) / Math.max(1, foot - top)));
    const w = 1.5 * valueNoise(gy * 0.21, 4.4 + r.k, seed + 81);
    const e = Math.min(gx - rx0 - 3 - 6 * t - w, rx1 - gx - 3 - 6 * t + w);
    if (e >= 0) {
      if (e < 2 && q > 1) return RISE_PALETTE.boulder[0];
      const sw = 4 + 12 * t;
      if (e < 2 + sw && hash2(Math.floor(gx), Math.floor(gy), seed + 83) > (e - 2) / sw) return RISE_PALETTE.shade[e < 2 + sw * 0.45 ? 0 : 1];
      /* the slope's steps: every 12 px a line of darker grass, lit along the line above it */
      const band = ((gy - top) % 12 + 12) % 12;
      if (q > 4 && ds > 5) {
        if (band < 2.2 && hash2(Math.floor(gx / 3), Math.floor((gy - top) / 12), seed + 85) > 0.14) return RISE_PALETTE.shade[band < 1.1 ? 0 : 1];
        if (band >= 10.4 && hash2(Math.floor(gx / 3), Math.floor((gy - top) / 12) + 1, seed + 87) > 0.3) return RISE_PALETTE.grass[4];
      }
      return null;
    }
  }
  /* the outline: the darkest rock down both ends and round the foot's corners */
  if (dEnd < 1.6 || round < 1.6) return RISE_PALETTE.boulder[0];
  /* the cap: its lit edge, then blades hanging 10-21 px over the rock (three px a blade), darker as
     they hang, a dark edge under them and their shade on the stones below */
  const tooth = hash2(Math.floor(gx / 3), r.k, seed + 13);
  const fr = 10 + 5 * (valueNoise(gx * 0.08, 7.7, seed + 11) * 0.5 + 0.5) + 6 * tooth * tooth;
  /* (not over the side walls' own columns: there the wall comes round the corner, rock to the lip) */
  if (dEnd >= HILL.WALL) {
    if (dEnd < HILL.WALL + 2 && q < fr) return RISE_PALETTE.grassEdge;
    if (q < 3) return RISE_PALETTE.grass[4];
    if (q < fr) { const t = q / fr; return RISE_PALETTE.grass[t < 0.4 ? 3 : t < 0.72 ? 2 : 1]; }
    if (q < fr + 2) return RISE_PALETTE.grassEdge;
  }
  /* the ground's own tufts standing in front of the foot (two px a blade), and the dark where the
     rock sits in the ground between them */
  const tuft = hash2(Math.floor(gx / 3), r.k + 7, seed + 17);
  if (ds < 1 + 8 * tuft * tuft) return RISE_PALETTE.grass[tuft > 0.6 ? 2 : 1];
  if (ds < 3) return RISE_PALETTE.boulder[0];
  const depth = (gy - top) / Math.max(1, foot - top);
  return boulderColour(gx, gy, 0.55 * depth + (q < fr + 7 ? 0.7 : 0), seed);
}
function hillRim(r, c, gx, gy, seed) {
  const ox = gx - r.x0 * c, oxe = r.x1 * c - gx, oy = gy - r.y0 * c;
  const wall = hillWall(r, c, gy);
  /* how far inside the rock's outer edge on the nearer side, and inside the back's edge */
  const rw = ox - hillEdge(r, 0, gy, seed), re = oxe - hillEdge(r, 1, gy, seed), gn = oy - hillEdge(r, 2, gx, seed);
  const east = re < rw, side = (east ? re : rw) - wall;
  /* how far inside the GRASS's edge (the wall is outside it), its two back corners a curve as wide
     as the rise's `round` cells allow; `nx`: how much that edge faces the side (1) or the back (0) */
  const R = r.round > 0 ? c * r.round - 12 : HILL.CORNER;
  let d = Math.min(side, gn), nx = side < gn ? 1 : 0;
  if (side < R && gn < R) { const ax = R - side, ay = R - gn, h = Math.hypot(ax, ay); d = R - h; nx = h > 0 ? ax / h : 0; }
  if (d >= 5) return null;                   /* the top's own grass */
  if (d >= 2) return RISE_PALETTE.grass[hash2(Math.floor(gx), Math.floor(gy), seed + 55) > 0.35 ? 4 : 3];   /* its lit edge */
  if (d >= 0) return RISE_PALETTE.grassEdge;
  /* outside the grass: the side's wall (west lit, east in shadow), thinning to nothing as the corner
     turns to the back, outlined in the darkest rock */
  const thick = wall * nx;
  if (d < -thick) return null;
  if (thick > 1.6 && d < -thick + 1.6) return RISE_PALETTE.boulder[0];
  return boulderColour(gx, gy, east ? 0.75 : 0.2, seed);
}

/* a small sea chest: oak boards bound in iron, a gold lock -- standing on
   its cells, drawn up into the row behind it */
function chestColour(ch, c, gx, gy) {
  const cx0 = ch.x0 * c, cx1 = ch.x1 * c, cy1 = ch.y1 * c;
  const w = Math.min(cx1 - cx0 - 6, 44);
  const x0 = (cx0 + cx1) / 2 - w / 2, x1 = x0 + w;
  const yb = cy1 - 3, body = 20, lid = 11;
  const yt = yb - body - lid;
  if (gx < x0 || gx >= x1 || gy < yt || gy >= yb) return null;
  /* the lid's rounded top corners */
  const u = gx - x0, v = gy - yt;
  if (v < 3 && (u < 3 - v || w - u < 3 - v)) return null;
  if (u < 1 || w - u <= 1 || v < 1 || yb - gy <= 1) return RISE_PALETTE.woodEdge;
  const ly = yt + lid;
  if (Math.abs(gy - ly) < 1) return RISE_PALETTE.woodEdge;            /* where the lid meets the body */
  if (u < 5 || w - u <= 5) return RISE_PALETTE.iron[v < lid ? 1 : 0];   /* the iron bands at each end */
  /* the lock */
  const mx = x0 + w / 2;
  if (Math.abs(gx - mx) < 3.5 && gy > ly - 3 && gy < ly + 5) return RISE_PALETTE.gold[gy < ly + 1 ? 1 : 0];
  /* the boards: a plank line every 5 px, lit on the lid */
  if (v < lid) return RISE_PALETTE.wood[(v | 0) % 5 === 0 ? 0 : 2];
  return RISE_PALETTE.wood[((gy - ly) | 0) % 5 === 0 ? 0 : 1];
}
