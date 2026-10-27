/* ═══ v2.3.3619: WHERE EACH PIECE OF A WIND-UP IS ═══
 *
 * The owner, 2026-10-26: "It would be cool if you could telegraph the attacks
 * of each monster (briefly) using code to represent their elements. Maybe a
 * brief snow swirl effect before a snowman throws a snowball for instance.
 * This will promote blocking and more skilled play."
 *
 * The worker already announces every monster's attack before it lands: a
 * basic swing or throw winds up 350-600 ms (server/src/telegraph.js
 * BASIC_WINDUP), a kit's slam, lunge or burst longer, and the phone throbs the
 * body for it (entityRenderer _windupFx, from `_tgFrom`/`_tgUntil`).  This is
 * the same moment drawn in the monster's element (data/elemWindup.js): a
 * snowman's snow swirling into his hands, a goblin's sparks rising, a mummy's
 * gust circling it, rock dust at a golem's feet, a storm slime crackling,
 * droplets round a fishman, a wisp's fumes, a slime's goo bubbling.
 *
 * Pure arithmetic, no imports past the table, so the node suite can run it:
 * every piece's place is worked out from the time alone (how long since the
 * wind-up began, how far through it is) and a number from the monster's id --
 * nothing is kept from frame to frame, nothing is random, and two phones
 * watching one monster see the same swirl.
 *
 * `g` is the monster's body as it is drawn: R its half-width, H how high its
 * middle is above its feet (world px, already at its drawn size), k how much
 * bigger its pieces are than an ordinary monster's.  Each piece comes back as
 * an offset from the monster's FEET (x right, y down), its alpha, its scale
 * (of the look's `size`) and its rotation. */
import { WINDUP_FX } from '../data/elemWindup.js';

const TAU = Math.PI * 2;

/* a number 0..1 from two integers, the same on every phone */
export function hash01(a, b) {
  let x = (Math.imul(a | 0, 0x9E3779B1) ^ Math.imul(((b | 0) + 0x7F4A7C15) | 0, 0x85EBCA77)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D) >>> 0;
  x ^= x >>> 12; x = Math.imul(x, 0x297A2D39) >>> 0;
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

/* a monster's number, from its id (FNV-1a) */
export function seedOfId(id) {
  const s = String(id == null ? '' : id);
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h | 0;
}

const frac = (v) => v - Math.floor(v);
const smooth = (t) => t * t * (3 - 2 * t);

/** A boss's pieces are bigger, never past 2.4x (its body can be 5x). */
export function windupSizeK(drawScale) {
  const k = Number(drawScale);
  return Math.max(0.7, Math.min(2.4, k > 0 ? k : 1));
}

/** How strong the whole look is: up within FADE_IN_MS, a little stronger as
 *  the blow comes. */
export function windupStrength(age, t) {
  return Math.max(0, Math.min(1, age / WINDUP_FX.FADE_IN_MS)) * (0.8 + 0.2 * Math.max(0, Math.min(1, t)));
}

/**
 * Every piece of one monster's wind-up this frame.
 * @param look  the element's row (data/elemWindup.js ELEM_WINDUP)
 * @param g     { R, H, k } its body as drawn
 * @param age   ms since its wind-up began
 * @param t     0..1, how far through its wind-up
 * @param seed  seedOfId(monster id)
 * @param out   an array to fill, its objects kept by the caller and used
 *              again (no garbage a frame); it may hold more than are used
 * @returns how many of `out`'s first pieces this frame has, each
 *          { shape, dx, dy, a, s, r }
 */
export function windupPieces(look, g, age, t, seed, out) {
  const res = out;
  let n = 0;
  if (!look || !look.pieces || !res) return 0;
  const R = Math.max(1, g.R), H = Math.max(0, g.H), k = g.k || 1;
  const tt = Math.max(0, Math.min(1, t));
  const total = look.pieces.reduce((s, p) => s + p[1], 0);
  let i = 0;
  let sk = 1;   /* this shape's size against the look's (its row's third number) */
  const put = (shape, dx, dy, a, s, r) => {
    let p = res[n];
    if (!p) p = res[n] = { shape: '', dx: 0, dy: 0, a: 0, s: 1, r: 0 };
    p.shape = shape; p.dx = dx; p.dy = dy;
    p.a = Math.max(0, Math.min(1, a)); p.s = s * sk; p.r = r;
    n++;
  };
  for (const [shape, count, size] of look.pieces) {
    sk = size > 0 ? size : 1;
    for (let j = 0; j < count; j++, i++) {
      const h1 = hash01(seed, i * 7 + 1), h2 = hash01(seed, i * 7 + 2), h3 = hash01(seed, i * 7 + 3);
      switch (look.kind) {
        case 'swirl': {
          /* round the body and IN: the snow (or the water) gathers as the
             blow comes, turning all the while -- the owner's "snow swirl" */
          const dir = look.spin === -1 ? -1 : 1;
          const ang = TAU * (i / total) + h1 * 0.6 + dir * TAU * 2.0 * (age / 1000);
          const r = R * (1.9 - 1.4 * smooth(tt)) * (0.85 + 0.3 * h2);
          const cy = -H * (0.95 + 0.3 * (h3 - 0.5));
          const dx = Math.cos(ang) * r;
          const dy = cy + Math.sin(ang) * r * 0.45 + Math.sin(ang * 2 + i) * 3 * k;
          if (shape === 'sparkle' || shape === 'spray') {
            put(shape, dx, dy, 0.55 + 0.45 * Math.sin(age / 45 + i * 1.3), 0.7 + 0.4 * h2, 0);
          } else if (shape === 'drop') {
            /* a drop points the way it goes: along the ring */
            put(shape, dx, dy, 0.95, 0.8 + 0.35 * h2, Math.atan2(Math.cos(ang) * 0.45 * dir, -Math.sin(ang) * dir) + Math.PI / 2);
          } else {
            put(shape, dx, dy, 0.95, 0.8 + 0.35 * h2, ang * 1.5);
          }
          break;
        }
        case 'rise': {
          if (shape === 'flame') {
            /* flames at its hands and flanks, flickering, growing as it comes */
            const side = (j & 1) ? 1 : -1;
            const up = j >> 1;
            const dx = side * R * (0.75 + 0.2 * up);
            const dy = -H * (0.55 + 0.45 * up);
            const s = (0.8 + 0.35 * Math.sin(age / 55 + i * 1.7)) * (0.7 + 0.5 * tt);
            put(shape, dx, dy, 0.92, s, side * 0.22);
          } else {
            /* sparks off it, rising and going out */
            const p = frac(age / 520 + h1);
            const x0 = (h2 - 0.5) * 2 * R * 0.95;
            const dx = x0 + Math.sin(age / 90 + i) * 3 * k * (1 - p);
            const dy = -H * 0.15 - p * (H * 1.9 + 18 * k);
            put(shape, dx, dy, 0.35 + 0.65 * Math.sin(p * Math.PI), (1 - 0.45 * p) * (0.8 + 0.5 * h3), 0);
          }
          break;
        }
        case 'gust': {
          /* round and round it, up its body: streaks lie along the way they
             go, the ones in front brighter */
          const fast = shape === 'sand' ? 1.6 : 1;
          const ang = TAU * (j / count) + h1 * 0.4 + TAU * 1.7 * fast * (age / 1000);
          const r = R * (shape === 'sand' ? 1.6 : 1.35) * (1 - 0.15 * tt);
          const cy = shape === 'sand' ? -H * (0.2 + 1.1 * h2) : -H * (0.35 + 0.9 * (j / Math.max(1, count - 1)));
          const dx = Math.cos(ang) * r;
          const dy = cy + Math.sin(ang) * r * 0.42;
          const front = 0.5 + 0.5 * Math.sin(ang);
          if (shape === 'streak') put(shape, dx, dy, 0.45 + 0.55 * front, 0.9 + 0.2 * h3, Math.atan2(Math.cos(ang) * 0.42, -Math.sin(ang)));
          else put(shape, dx, dy, 0.6 + 0.4 * front, 0.6 + 0.5 * h3, 0);
          break;
        }
        case 'quake': {
          /* pebbles hop off the ground round its feet; dust puffs out */
          const ang = TAU * h2;
          if (shape === 'pebble') {
            const p = frac(age / 420 + h1);
            const dist = R * (0.5 + 0.9 * p);
            const hop = 34 * k * 4 * p * (1 - p);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.4 - hop;
            put(shape, dx, dy, p < 0.8 ? 1 : (1 - p) / 0.2, 0.7 + 0.5 * h3, (age / 120) * (h3 - 0.5) * 8);
          } else {
            const p = frac(age / 600 + h1);
            const dist = R * (0.6 + 0.8 * p);
            put(shape, Math.cos(ang) * dist, Math.sin(ang) * dist * 0.35 - 6 * k * p, 0.85 * (1 - p), 0.7 + 1.1 * p, h3 * TAU);
          }
          break;
        }
        case 'crackle': {
          /* sparks that jump about it: a new place every 70 ms, more of them
             lit as the blow comes */
          const step = Math.floor(age / 70);
          const u = hash01(seed + step * 131, i * 3 + 1);
          const lit = hash01(seed + step * 71, i * 3 + 2) < 0.55 + 0.4 * tt;
          const w = hash01(seed + step * 37, i * 3 + 3);
          const near = shape === 'spark' ? 0.75 : 1;
          const ang = TAU * u;
          const dx = Math.cos(ang) * R * (0.7 + 0.6 * w) * near;
          const dy = -H * (0.3 + 1.2 * w) + Math.sin(ang) * R * 0.3;
          put(shape, dx, dy, lit ? 1 : 0, 0.8 + 0.5 * h3, TAU * hash01(seed + step * 53, i));
          break;
        }
        case 'fume': {
          if (shape === 'fume') {
            /* puffs rising off it, swelling and thinning out */
            const p = frac(age / 900 + h1);
            const dx = (h2 - 0.5) * R * 1.4 + Math.sin(age / 260 + i) * 5 * k;
            const dy = -H * 0.6 - p * (H * 1.2 + 20 * k);
            put(shape, dx, dy, 0.92 * Math.sin(p * Math.PI), 0.6 + 1.0 * p, h3 * TAU);
          } else {
            const ang = TAU * (j / count) + age / 500;
            const dx = Math.cos(ang) * R * 1.1;
            const dy = -H + Math.sin(ang) * R * 0.5 + Math.sin(age / 200 + i) * 4 * k;
            put(shape, dx, dy, 0.5 + 0.5 * Math.sin(age / 90 + i), 0.7 + 0.4 * h3, 0);
          }
          break;
        }
        case 'goo': {
          if (shape === 'bubble') {
            /* bubbles swell on its top and pop */
            const p = frac(age / 560 + h1);
            const ang = Math.PI * (0.15 + 0.7 * h2);
            const dx = Math.cos(ang) * R * 0.8;
            const dy = -H - Math.sin(ang) * H * 0.7 - p * 12 * k;
            const pop = p > 0.85 ? (p - 0.85) / 0.15 : 0;
            put(shape, dx, dy, 0.95 * (1 - pop), (0.3 + 0.9 * p) * (1 + 0.6 * pop), 0);
          } else {
            /* goo flicked off it, landing round it */
            const p = frac(age / 640 + h1);
            const ang = TAU * h2;
            const dist = R * (0.6 + 0.8 * p);
            const dx = Math.cos(ang) * dist;
            const dy = -H * 0.8 * (1 - p) - 30 * k * 4 * p * (1 - p) + Math.sin(ang) * dist * 0.3;
            put(shape, dx, dy, 1 - p * p * p, 0.7 + 0.4 * h3, age / 100);
          }
          break;
        }
        default:
          break;
      }
    }
  }
  return n;
}

/** The pieces as a new list (the tests'; the renderer uses windupPieces). */
export function windupPieceList(look, g, age, t, seed) {
  const out = [];
  const n = windupPieces(look, g, age, t, seed, out);
  return out.slice(0, n).map((p) => Object.assign({}, p));
}
