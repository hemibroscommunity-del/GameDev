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
 * monster's FEET (x right, y down), its alpha, its scale (of the blow's
 * `size`) and its rotation.
 */
import { WATER_BLOWS } from '../data/waterAttack.js';

const TAU = Math.PI * 2;

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

function put(out, n, shape, dx, dy, a, s, r) {
  let p = out[n];
  if (!p) p = out[n] = { shape: '', dx: 0, dy: 0, a: 0, s: 1, r: 0 };
  p.shape = shape; p.dx = dx; p.dy = dy; p.a = a < 0 ? 0 : a > 1 ? 1 : a; p.s = s; p.r = r;
  return n + 1;
}
/* nothing is on screen at full strength when a blow ends: over its last
   TAIL of the time every piece fades out with it (no piece pops off) */
const TAIL = 0.15;
function fadeTail(out, n, t) {
  if (t <= 1 - TAIL) return n;
  const k = Math.max(0, (1 - t) / TAIL);
  for (let i = 0; i < n; i++) out[i].a *= k;
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
  const sizeOf = Object.create(null);
  for (const p of blow.pieces) sizeOf[p[0]] = p[2] || 1;
  const count = (shape) => { for (const p of blow.pieces) if (p[0] === shape) return p[1]; return 0; };

  if (kind === 'ring') {
    /* the wave: out from under it to the ring, fast then slowing */
    const r0 = R * 0.5;
    const r = r0 + (reach - r0) * easeOut(clamp01(t / 0.7));
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const turn = hash01(seed, 7) * TAU;
    const nc = count('crest');
    for (let i = 0; i < nc; i++, q++) {
      const a = turn + (i / nc) * TAU;
      /* a crest stands on the ring, upright (it is seen from above and in
         front: never turned on its side), bobbing as it runs out */
      const bob = Math.sin((t * 2.2 + hash01(seed, 40 + i)) * Math.PI) * 4 * k;
      n = put(out, n, 'crest', Math.cos(a) * r, Math.sin(a) * r - 6 * k - bob, fade * 0.95,
        sizeOf.crest * (0.75 + 0.45 * t), 0);
    }
    const nd = count('drop');
    for (let i = 0; i < nd; i++, q++) {
      const a = turn + ((i + 0.5) / nd) * TAU;
      const h = hash01(seed, 80 + i);
      const rr = r * (0.9 + 0.18 * h);
      const up = (16 + 22 * h) * k * Math.sin(Math.PI * clamp01(t * 1.25));
      n = put(out, n, 'drop', Math.cos(a) * rr, Math.sin(a) * rr - 8 * k - up, fade,
        sizeOf.drop * (0.7 + 0.5 * h), (h - 0.5) * 0.8);
    }
    const nf = count('foam');
    for (let i = 0; i < nf; i++, q++) {
      const a = turn + (i / nf) * TAU + 0.6;
      const u = clamp01(t / 0.45);
      n = put(out, n, 'foam', Math.cos(a) * R * (0.5 + 0.5 * u), Math.sin(a) * R * 0.35 * (0.5 + 0.5 * u) - 4 * k,
        (1 - u) * 0.9, sizeOf.foam * (0.7 + 0.6 * u), 0);
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
  /* the jet: three lengths of it, out of the mouth and gone in a third of a
     second, each a little further along the line to the landing */
  const ns = count('streak');
  for (let i = 0; i < ns; i++, q++) {
    const u = clamp01((age - i * 25) / 210);
    const along = (0.12 + 0.2 * i) + easeOut(u) * (0.3 + 0.12 * i);
    const x = mx + (lx - mx) * along, y = my + (ly - my) * along * along;
    const a = age < i * 25 ? 0 : (u < 0.55 ? 1 : (1 - u) / 0.45);
    n = put(out, n, 'streak', x, y, a, sizeOf.streak * (0.7 + 0.5 * u), Math.atan2((ly - my) * 2 * along, lx - mx));
  }
  /* the drops: thrown ahead in a fan, each in its own arc, down by the end */
  for (const shape of ['drop', 'blob']) {
    const nd = count(shape);
    for (let i = 0; i < nd; i++, q++) {
      const h1 = hash01(seed, q * 4 + 1), h2 = hash01(seed, q * 4 + 2), h3 = hash01(seed, q * 4 + 3), h4 = hash01(seed, q * 4 + 4);
      const ti = clamp01((age - h1 * 90) / (blow.ms * 0.72));
      const a2 = ang + (h2 - 0.5) * 0.95;
      const d = reach * (0.5 + 0.62 * h3) * easeOut(ti);
      const arc = (12 + 20 * h4) * k * Math.sin(Math.PI * ti);
      const x = mx + Math.cos(a2) * d;
      const y = my * (1 - ti) + (uy * R * 0.5) * ti + Math.sin(a2) * d * 0.92 - arc;
      const a = ti <= 0 ? 0 : (ti < 0.72 ? 1 : (1 - ti) / 0.28);
      n = put(out, n, shape, x, y, a, sizeOf[shape] * (0.7 + 0.5 * h4), a2 + Math.PI / 2);
    }
  }
  /* the splash where it comes down: rings spreading flat on the ground,
     foam thrown up off them */
  const nr = count('ripple');
  for (let i = 0; i < nr; i++, q++) {
    const u = clamp01((age - 200 - i * 70) / 230);
    n = put(out, n, 'ripple', lx, ly, u <= 0 ? 0 : Math.sin(Math.PI * u) * 0.85, sizeOf.ripple * (0.45 + 0.85 * u), 0);
  }
  const nf = count('foam');
  for (let i = 0; i < nf; i++, q++) {
    const h = hash01(seed, 200 + i);
    const u = clamp01((age - 190 - h * 60) / 240);
    n = put(out, n, 'foam', lx + (h - 0.5) * 30 * k, ly - (6 + 16 * h) * k * Math.sin(Math.PI * u), u <= 0 ? 0 : (1 - u) * 0.9,
      sizeOf.foam * (0.6 + 0.6 * u), 0);
  }
  return fadeTail(out, n, t);
}

/** The same, as a fresh list (the tests', the probe's). */
export function waterPieceList(kind, g, age, seed) {
  const out = [];
  out.length = waterPieces(kind, g, age, seed, out);
  return out;
}
