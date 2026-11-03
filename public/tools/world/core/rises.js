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
export const RISE_KIND = Object.freeze({ top: 0, face: 1, rim: 2, climb: 3, chest: 4 });
/* kinds the walk grid shuts (everything but a top) */
export const RISE_SHUT = Object.freeze([false, true, true, true, true]);

const LAYOUTS = new WeakMap();

/** Every rise of the plan, on its islet.  null when the plan has none (or
    none whose islet is on this Wheel).  Cells are the whole blueprint's. */
export function riseLayout(plan) {
  if (LAYOUTS.has(plan)) return LAYOUTS.get(plan);
  const F = planFeatures(plan);
  const cellG = F.S * plan.worldPxPerArtPx;   /* game px a cell (24) */
  const list = [];
  for (const rs of plan.rises || []) {
    const I = F.islets.find((il) => il.id === rs.islet);
    if (!I) continue;
    const x0 = I.x0 + rs.box[0], y0 = I.y0 + rs.box[1], x1 = I.x0 + rs.box[2], y1 = I.y0 + rs.box[3];
    const face = rs.face | 0;
    list.push({
      id: rs.id, name: rs.name || rs.id, islet: I.id, k: list.length,
      x0, y0, x1, y1, faceY0: y1 - face, face,
      /* how tall the face is drawn, game px: one cell a row */
      h: face * cellG,
      climb: rs.climb ? { x0: I.x0 + rs.climb[0], x1: I.x0 + rs.climb[1] } : null,
      chest: rs.chest ? { x0: I.x0 + rs.chest[0], y0: I.y0 + rs.chest[1], x1: I.x0 + rs.chest[2], y1: I.y0 + rs.chest[3] } : null,
    });
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
    if (y >= r.faceY0) return { r, kind: r.climb && x >= r.climb.x0 && x < r.climb.x1 ? RISE_KIND.climb : RISE_KIND.face };
    if (r.chest && x >= r.chest.x0 && x < r.chest.x1 && y >= r.chest.y0 && y < r.chest.y1) return { r, kind: RISE_KIND.chest };
    if (y === r.y0 || x === r.x0 || x === r.x1 - 1) return { r, kind: RISE_KIND.rim };
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
  if (gxb < L.x0 * c || gxa > (L.x0 + L.w) * c || gyb < L.y0 * c - LIFT || gya > (L.y0 + L.h) * c) return 0;
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
    if (gx < r.x0 * c || gx >= r.x1 * c || gy < r.y0 * c - 6 || gy >= r.y1 * c + 5) continue;
    const top = r.faceY0 * c;
    /* the lip's line: wandering 0-4 px over the face's top edge; the foot's,
       0-4 px past the face's last row onto the ground below (rubble), so
       neither is a ruler line (the art law; the walk grid stays on cells) */
    const lip = top - 2 + 2 * valueNoise(gx * 0.07, 3.1, seed + r.k);
    const foot = r.y1 * c + 2 + 2 * valueNoise(gx * 0.09, 5.3, seed + 7 + r.k);
    if (gy >= lip && gy < foot) return faceColour(r, c, gx, gy, top, foot, lip, seed);
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
  const cave = caveColour(r, c, gx, gy, foot, seed);
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
  if (depth > 0.7 && hash2(Math.floor(gx), Math.floor(gy * 2), seed + 29) > 0.985) return pick(RISE_PALETTE.barnacle, grain * 0.5 + 0.5);
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
  const g = valueNoise(gx * 0.27, gy * 0.27, seed + 51);
  const lit = valueNoise(gx * 0.05, gy * 0.05, seed + 53);
  /* the outer edge, one darker pixel: the west, east and north sides */
  const ox = gx - r.x0 * c, oxe = r.x1 * c - gx, oy = gy - r.y0 * c;
  if (ox < 1 || oxe <= 1 || oy < 1) return RISE_PALETTE.edge;
  if (lit + 0.35 * g > 0.35) return pick(RISE_PALETTE.moss, 0.3 + 0.35 * (g * 0.5 + 0.5));
  return pick(RISE_PALETTE.rock, 0.45 + 0.4 * (g * 0.5 + 0.5));
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
