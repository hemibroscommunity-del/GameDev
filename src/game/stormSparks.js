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
 * as an offset from that point (x right, y down), its cell of the picture,
 * whether it is flipped, and how lit.  v2.3.4359: hard pixels -- a piece is
 * never turned or scaled (the owner: "avoid marking cartoonish shapes").
 */
import { STORM_LOOKS, STORM_FX, STORM_WAYS, boltWay } from '../data/stormSparks.js';

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

/* a piece: which cell of the picture, where, flipped or not (`fx`, `fy`: 1
   or -1), and lit or not.  Never turned and never scaled (v2.3.4359: hard
   pixels) -- lightning is ON or half on, it does not fade smoothly. */
function put(out, n, shape, dx, dy, a, fx, fy) {
  let p = out[n];
  if (!p) p = out[n] = { shape: '', dx: 0, dy: 0, a: 0, fx: 1, fy: 1 };
  p.shape = shape; p.dx = dx; p.dy = dy; p.a = a < 0.2 ? 0 : a >= 0.75 ? 1 : 0.5; p.fx = fx || 1; p.fy = fy || 1;
  return n + 1;
}
/* a bolt or an arc lying along `angle`: its baked cell, and its flips (the
   second flip is free variety: a number 0..1 says which way up) */
function lie(kind, angle, h) {
  const w = boltWay(angle);
  return [STORM_WAYS[kind][w.way], w.flip, h < 0.5 ? 1 : -1];
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
  for (const [kind, count] of look.pieces) {
    for (let i = 0; i < count; i++, q++) {
      const key = (slot * 16 + q) | 0;
      const lit = hash01(seed, key) < look.duty;
      const a = hash01(seed, key + 0x4000) * TAU;
      const h = hash01(seed, key + 0x8000);
      const r = g.R * (kind === 'spark' ? 0.9 + 0.5 * h : 0.55 + 0.45 * h);
      /* bright as it jumps, half as it holds */
      const alpha = lit ? (phase < 0.45 ? 1 : 0.5) : 0;
      if (kind === 'spark') { n = put(out, n, STORM_WAYS.spark[h < 0.5 ? 0 : 1], Math.cos(a) * r, -g.H + Math.sin(a) * r * 0.92, alpha, 1, 1); continue; }
      /* an arc lies ACROSS the body where it jumped (along the body's edge
         there: a quarter turn from the way out) */
      const [cell, fx, fy] = lie('arc', a + Math.PI / 2, hash01(seed, key + 0xC000));
      n = put(out, n, cell, Math.cos(a) * r, -g.H + Math.sin(a) * r * 0.92, alpha, fx, fy);
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
  for (const [kind, count] of look.pieces) {
    for (let i = 0; i < count; i++, q++) {
      const h = hash01(seed, q * 3 + 11);
      const a = turn + (i / count) * TAU + (h - 0.5) * 0.5;
      if (kind === 'spark') {
        /* thrown clear, out past the lightning */
        const d = g.R * 0.5 + (reach * (0.75 + 0.5 * h)) * easeOut(t);
        n = put(out, n, STORM_WAYS.spark[h < 0.5 ? 0 : 1], Math.cos(a) * d, -g.H + Math.sin(a) * d * 0.92, clamp01(1.4 * (1 - t)), 1, 1);
        continue;
      }
      /* a bolt stands off the body, lying along the way out from it, and
         jumps out to its reach in the first third (every third one further) */
      const d = g.R * 0.55 + (reach - g.R * 0.55) * (i % 3 === 0 ? 0.82 : 0.6) * easeOut(clamp01(t / 0.35));
      const lit = hash01(seed, flick * 32 + q) > 0.3 ? 1 : 0.5;
      const [cell, fx, fy] = lie('bolt', a, h);
      n = put(out, n, cell, Math.cos(a) * d, -g.H + Math.sin(a) * d * 0.92, fade > 0.25 ? lit : fade > 0.08 ? 0.5 : 0, fx, fy);
    }
  }
  return n;
}

/** The same, as fresh lists (the tests', the probe's). */
export function cracklePieceList(kind, g, now, seed) { const out = []; out.length = cracklePieces(kind, g, now, seed, out); return out; }
export function zapPieceList(g, age, seed) { const out = []; out.length = zapPieces(g, age, seed, out); return out; }
