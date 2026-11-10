/* ═══ v2.3.4355: WHERE EACH PIECE OF A WATER ATTACK IS ═══
 *
 * The owner, 2026-11-09: "I intend for you to draw the water attacks in code
 * actually."  data/waterAttack.js says what each blow is made of; this says
 * where every piece of it is `age` ms after the blow landed.
 *
 * Pure arithmetic, no imports past the table, so the node suite can run it
 * (as game/elemWindup.js is): every piece's place is worked out from the time
 * alone and a number from the monster's id -- nothing is kept from frame to
 * frame, nothing is random, and two phones watching one frog see the same
 * splash.
 *
 * `g` is the blow as it is drawn (world px, already at the monster's drawn
 * size): dx, dy the unit vector it faces; R its half-width; H how high its
 * mouth is above its feet; reach how far the water goes (a spray: ahead of
 * its mouth; a ring: the ring's radius); k how much bigger its pieces are
 * than an ordinary monster's.  Each piece comes back as an offset from the
 * monster's FEET (x right, y down), its cell of the picture and its alpha.
 * v2.3.4359: hard pixels -- a piece is never turned or scaled (the owner:
 * "avoid marking cartoonish shapes"), and fades in steps.
 */
import { WATER_BLOWS, WATER_KINDS, WATER_FX, JET_SIZES, WATER_CROWN_H } from '../data/waterAttack.js';

const TAU = Math.PI * 2;
/* a torrent's gouts: ms from one to the next, ms each is on its way, and how
   long the crown it throws up stands */
export const JET_GAP = 15;
export const JET_FLY = 190;
export const CROWN_MS = 300;

/* a number 0..1 from two integers, the same on every phone (elemWindup's) */
export function hash01(a, b) {
  let x = (Math.imul(a | 0, 0x9E3779B1) ^ Math.imul(((b | 0) + 0x7F4A7C15) | 0, 0x85EBCA77)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D) >>> 0;
  x ^= x >>> 12; x = Math.imul(x, 0x297A2D39) >>> 0;
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - (1 - t) * (1 - t);

/* a piece: which cell of the picture, where, and how see-through.  Never
   turned and never scaled (v2.3.4359: hard pixels) -- `s` and `r` stay 1 and
   0 for the renderer's sake -- and its alpha one of ALPHA_STEPS, not a fade. */
function put(out, n, shape, dx, dy, a) {
  let p = out[n];
  if (!p) p = out[n] = { shape: '', dx: 0, dy: 0, a: 0, s: 1, r: 0 };
  const q = a <= 0 ? 0 : a >= 1 ? 1 : Math.ceil(a * WATER_FX.ALPHA_STEPS) / WATER_FX.ALPHA_STEPS;
  p.shape = shape; p.dx = dx; p.dy = dy; p.a = q; p.s = 1; p.r = 0;
  return n + 1;
}
const pick = (kind, t) => { const c = WATER_KINDS[kind]; return c[Math.max(0, Math.min(c.length - 1, Math.floor(t * c.length)))]; };
/* nothing is on screen at full strength when a blow ends: over its last
   TAIL of the time every piece steps down with it (no piece pops off) */
const TAIL = 0.15;
function fadeTail(out, n, t) {
  if (t <= 1 - TAIL) return n;
  const k = Math.max(0, (1 - t) / TAIL);
  for (let i = 0; i < n; i++) { const a = out[i].a * k; out[i].a = a <= 0 ? 0 : Math.ceil(a * WATER_FX.ALPHA_STEPS) / WATER_FX.ALPHA_STEPS; }
  return n;
}

/** Is a blow of this kind over at `age` ms? */
export function waterBlowOver(kind, age) {
  const b = WATER_BLOWS[kind];
  return !b || !(age >= 0) || age >= b.ms;
}

/** The pieces of blow `kind` at `age` ms, written into `out` (objects reused
 *  from call to call): how many.  Always the blow's whole count while it is
 *  on (a piece not yet thrown, or already gone, has alpha 0), 0 once over. */
export function waterPieces(kind, g, age, seed, out) {
  const blow = WATER_BLOWS[kind];
  if (!blow || waterBlowOver(kind, age)) return 0;
  const k = g.k > 0 ? g.k : 1;
  const R = g.R, H = g.H, reach = g.reach > 0 ? g.reach : blow.reach * k;
  const t = age / blow.ms;
  let n = 0, q = 0;
  const count = (kind) => { for (const p of blow.pieces) if (p[0] === kind) return p[1]; return 0; };

  /* a gout flickers between its two cuts as it goes (never turned: v2.3.4359) */
  const cut = (i) => (Math.floor(age / 70) + i) & 1;

  if (kind === 'ring') {
    /* the wave: out from under it to the ring, fast then slowing */
    const r0 = R * 0.5;
    const r = r0 + (reach - r0) * easeOut(clamp01(t / 0.7));
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const turn = hash01(seed, 7) * TAU;
    const nw = count('wave');
    for (let i = 0; i < nw; i++, q++) {
      const a = turn + (i / nw) * TAU;
      /* a gout of the wave: on the ring, in and out of it a little (a broken
         front, not a drawn circle), the big ones and the small turn about */
      const h = hash01(seed, 40 + i);
      const rr = r + (h - 0.5) * 7 * k;
      const big = (i & 1) ^ (h > 0.8 ? 1 : 0);
      n = put(out, n, WATER_KINDS.wave[big * 2 + cut(i)], Math.cos(a) * rr, Math.sin(a) * rr - 6 * k, fade);
    }
    const nd = count('drop');
    for (let i = 0; i < nd; i++, q++) {
      const a = turn + ((i + 0.5) / nd) * TAU;
      const h = hash01(seed, 80 + i);
      const rr = r * (0.9 + 0.18 * h);
      const up = (16 + 22 * h) * k * Math.sin(Math.PI * clamp01(t * 1.25));
      n = put(out, n, pick('drop', h), Math.cos(a) * rr, Math.sin(a) * rr - 8 * k - up, fade);
    }
    const nf = count('foam');
    for (let i = 0; i < nf; i++, q++) {
      const a = turn + (i / nf) * TAU + 0.6;
      const u = clamp01(t / 0.45);
      n = put(out, n, pick('foam', u), Math.cos(a) * R * (0.5 + 0.5 * u), Math.sin(a) * R * 0.35 * (0.5 + 0.5 * u) - 4 * k, (1 - u) * 0.9);
    }
    return fadeTail(out, n, t);
  }

  /* ── a spray ── */
  const ux = g.dx, uy = g.dy;
  const ang = Math.atan2(uy, ux);
  /* its mouth: ahead of its middle, up its body (a frog facing away spits
     from behind its own head: the mouth is a little lower on the picture) */
  const mx = ux * R * 0.55;
  const my = -H + uy * R * 0.25;
  /* where the water comes down: on the ground, `reach` ahead of the mouth */
  const lx = mx + ux * reach;
  const ly = uy * (R * 0.55 + reach) * 0.92;
  /* the torrent: gouts out of the mouth one behind another, each on the same
     line to the landing JET_GAP ms after the one ahead and JET_FLY ms on the
     way -- close enough that they lie over one another and read as one rope
     of water, its head the biggest.  A gout is gone as it comes down: the
     splash is there instead. */
  const nj = count('jet');
  /* across the line, to shake each gout off it a little */
  const px0 = -uy, py0 = ux;
  for (let i = 0; i < nj; i++, q++) {
    const u = (age - i * JET_GAP) / JET_FLY;
    const on = u > 0 && u < 1;
    const along = 0.04 + 0.96 * (on ? u * (2 - u) * 0.35 + u * 0.65 : 0);
    const wob = (hash01(seed, 20 + i) - 0.5) * 6 * k;
    const size = JET_SIZES[i % JET_SIZES.length];
    n = put(out, n, WATER_KINDS.jet[size * 2 + cut(i)],
      mx + (lx - mx) * along + px0 * wob, my + (ly - my) * along * along + py0 * wob * 0.6, on ? 1 : 0);
  }
  /* the spray off it: specks thrown ahead in a fan, each in its own arc */
  const nd = count('drop');
  for (let i = 0; i < nd; i++, q++) {
    const h1 = hash01(seed, q * 4 + 1), h2 = hash01(seed, q * 4 + 2), h3 = hash01(seed, q * 4 + 3), h4 = hash01(seed, q * 4 + 4);
    const ti = clamp01((age - h1 * 120) / (blow.ms * 0.66));
    const a2 = ang + (h2 - 0.5) * 0.95;
    const d = reach * (0.5 + 0.62 * h3) * easeOut(ti);
    const arc = (12 + 20 * h4) * k * Math.sin(Math.PI * ti);
    const x = mx + Math.cos(a2) * d;
    const y = my * (1 - ti) + (uy * R * 0.5) * ti + Math.sin(a2) * d * 0.92 - arc;
    n = put(out, n, pick('drop', h4), x, y, ti <= 0 ? 0 : (ti < 0.72 ? 1 : (1 - ti) / 0.28));
  }
  /* the splash where it comes down, from the moment the head does: a crown
     thrown up off the ground through its four frames (its foot ON the
     ground: a piece is placed by its middle, and an art pixel is the
     renderer's PX, doubled on a big monster) ... */
  const artPx = WATER_FX.PX * Math.max(1, Math.round(k));
  const nk = count('crown');
  for (let i = 0; i < nk; i++, q++) {
    const u = (age - JET_FLY * 0.85) / CROWN_MS;
    const on = u > 0 && u < 1;
    n = put(out, n, pick('crown', on ? u : 0), lx, ly - (WATER_CROWN_H / 2 - 1) * artPx, on ? (u < 0.8 ? 1 : 0.6) : 0);
  }
  /* ...a ring spreading flat under it through its three sizes, foam thrown
     up off it */
  const nr = count('ripple');
  for (let i = 0; i < nr; i++, q++) {
    const u = clamp01((age - JET_FLY - i * 90) / 250);
    n = put(out, n, pick('ripple', u), lx, ly, u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * 0.85 + 0.15);
  }
  const nf = count('foam');
  for (let i = 0; i < nf; i++, q++) {
    const h = hash01(seed, 200 + i);
    const u = clamp01((age - JET_FLY - h * 80) / 260);
    n = put(out, n, pick('foam', 1 - u), lx + (h - 0.5) * 34 * k, ly - (8 + 18 * h) * k * Math.sin(Math.PI * u), u <= 0 ? 0 : (1 - u) * 0.9);
  }
  return fadeTail(out, n, t);
}

/** The same, as a fresh list (the tests', the probe's). */
export function waterPieceList(kind, g, age, seed) {
  const out = [];
  out.length = waterPieces(kind, g, age, seed, out);
  return out;
}
