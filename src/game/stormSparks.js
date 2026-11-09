/* ═══ v2.3.4356: WHERE EACH PIECE OF THE STORM EYE'S ELECTRICITY IS ═══
 *
 * data/stormSparks.js says what each look is made of; this says where every
 * piece of it is.  Pure arithmetic, no imports past the table (as
 * game/elemWindup.js and game/waterAttack.js are): a piece's place comes from
 * the time and a number from the monster's id alone -- nothing is kept from
 * frame to frame, nothing is random, and two phones watching one eye see the
 * same crackle.
 *
 * A crackle (`aura`, `ball`) is cut into slots of STORM_FX.SLOT_MS: in each
 * slot a piece is lit or not (the look's `duty`), at a place of that slot's
 * own -- an arc jumps, holds a tenth of a second, and is somewhere else.
 *
 * `g` is the body it is drawn on (world px): R its half-width, H how high
 * its middle is above the point it is given at (an eye: its feet; a shot: 0,
 * the ball itself), k how much bigger its pieces are.  Each piece comes back
 * as an offset from that point (x right, y down), its alpha, its scale (of
 * the look's `size`) and its rotation.
 */
import { STORM_LOOKS, STORM_FX } from '../data/stormSparks.js';

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

/** A crackle's pieces at `now` ms (`kind`: 'aura' on an eye, 'ball' on its
 *  shot), written into `out`: always the look's whole count, the unlit ones
 *  at alpha 0. */
export function cracklePieces(kind, g, now, seed, out) {
  const look = STORM_LOOKS[kind];
  if (!look || !look.duty) return 0;
  const k = g.k > 0 ? g.k : 1;
  /* each body's slots start at its own moment, so a crowd does not flash as one */
  const t = now + (hash01(seed, 3) * STORM_FX.SLOT_MS | 0);
  const slot = Math.floor(t / STORM_FX.SLOT_MS);
  const phase = (t - slot * STORM_FX.SLOT_MS) / STORM_FX.SLOT_MS;
  let n = 0, q = 0;
  for (const [shape, count, size] of look.pieces) {
    for (let i = 0; i < count; i++, q++) {
      const key = (slot * 16 + q) | 0;
      const lit = hash01(seed, key) < look.duty;
      const a = hash01(seed, key + 0x4000) * TAU;
      const r = g.R * (shape === 'spark' ? 0.9 + 0.5 * hash01(seed, key + 0x8000) : 0.55 + 0.45 * hash01(seed, key + 0x8000));
      /* an arc lies ACROSS the body where it jumped (turned to the body's
         edge there), a spark any way up; bright as it jumps, dimmer as it holds */
      const rot = shape === 'spark' ? a * 2 : a + Math.PI / 2 + (hash01(seed, key + 0xC000) - 0.5) * 0.9;
      n = put(out, n, shape, Math.cos(a) * r, -g.H + Math.sin(a) * r * 0.92,
        lit ? (phase < 0.45 ? 1 : 0.55) : 0, (size || 1) * (0.8 + 0.4 * hash01(seed, key + 0x2000)) * k, rot);
    }
  }
  return n;
}

/** Is a zap over at `age` ms? */
export function zapOver(age) { return !(age >= 0) || age >= STORM_LOOKS.zap.ms; }

/** A zap's pieces `age` ms after the blow: its whole count while it is on (a
 *  piece that has gone dark has alpha 0), 0 once over. */
export function zapPieces(g, age, seed, out) {
  const look = STORM_LOOKS.zap;
  if (zapOver(age)) return 0;
  const k = g.k > 0 ? g.k : 1;
  const t = age / look.ms;
  const reach = (g.reach > 0 ? g.reach : look.reach * k);
  /* lightning flickers: every 55 ms each bolt is bright or half dark */
  const flick = Math.floor(age / 55);
  const fade = Math.pow(1 - t, 0.8);
  const turn = hash01(seed, 5) * TAU;
  let n = 0, q = 0;
  for (const [shape, count, size] of look.pieces) {
    for (let i = 0; i < count; i++, q++) {
      const h = hash01(seed, q * 3 + 11);
      const a = turn + (i / count) * TAU + (h - 0.5) * 0.7 + (shape === 'fork' ? 0.5 : 0);
      if (shape === 'spark') {
        /* thrown clear, out past the lightning */
        const d = g.R * 0.5 + (reach * (0.75 + 0.5 * h)) * easeOut(t);
        n = put(out, n, shape, Math.cos(a) * d, -g.H + Math.sin(a) * d * 0.92, clamp01(1.4 * (1 - t)), (size || 1) * (0.7 + 0.5 * h) * k, a * 3 + t * 6);
        continue;
      }
      /* a bolt stands off the body, pointing away from it, and jumps out to
         its reach in the first third */
      const d = g.R * 0.55 + (reach - g.R * 0.55) * (shape === 'fork' ? 0.82 : 0.6) * easeOut(clamp01(t / 0.35));
      const lit = hash01(seed, flick * 32 + q) > 0.3 ? 1 : 0.35;
      n = put(out, n, shape, Math.cos(a) * d, -g.H + Math.sin(a) * d * 0.92, lit * fade, (size || 1) * (0.85 + 0.35 * h) * k, a - Math.PI / 2);
    }
  }
  return n;
}

/** The same, as fresh lists (the tests', the probe's). */
export function cracklePieceList(kind, g, now, seed) { const out = []; out.length = cracklePieces(kind, g, now, seed, out); return out; }
export function zapPieceList(g, age, seed) { const out = []; out.length = zapPieces(g, age, seed, out); return out; }
