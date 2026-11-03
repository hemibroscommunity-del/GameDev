/* ═══ v2.3.3995: THE SKATEBOARD BUMPS GENTLY OVER THE GROUND ═══
 * The owner, 2026-11-02: "Make snowboard bounce subtly up and down like going
 * over small bumps in the road." (The skateboard: there is no snowboard.)
 *
 * Before: only the board dropped 0.5 game px, an on/off step every 90 px of
 * travel (rendering/rideFx.js, v2.3.3857), which a computer's whole-pixel
 * rounding mostly erased (0.3-0.45 CSS px; TRAPS section 231).
 *
 * Now the whole rider and board rise over a bump and settle again: a smooth
 * raised-cosine hump BUMP_WIDTH px of travel long, BUMP_MIN..BUMP_MAX game px
 * high, one in each BUMP_EVERY px stretch of ground covered, its place in the
 * stretch and its height from a hash of the stretch's number -- so the gaps
 * run irregular (about 30 to 110 px), the same ride gives the same bumps, and
 * nothing is stored.  `dist` is the ground covered on the board (rideFx's
 * roll, measured from the un-lifted place).
 *
 * No imports: node tests it (server/test/board-bumps.test.mjs). */

export const BUMP_EVERY = 70;     /* px of travel a bump, on average */
export const BUMP_WIDTH = 24;     /* px of travel over one bump */
export const BUMP_MIN = 1;        /* game px high, at least... */
export const BUMP_MAX = 1.5;      /* ...and at most */

/* a number in [0, 1) from an integer (a small integer hash) */
export function bumpHash(n, salt) {
  let h = (Math.floor(n) * 374761393 + (salt || 0) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** How far the board is lifted (game px, >= 0) `dist` px into the ride. */
export function boardBumpAt(dist) {
  const d = Number(dist);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const c = Math.floor(d / BUMP_EVERY);
  const half = BUMP_WIDTH / 2;
  /* the hump's middle somewhere in its stretch, never so near an end that it
     runs into the next stretch's */
  const lo = half + 2, hi = BUMP_EVERY - half - 2;
  const mid = c * BUMP_EVERY + lo + (hi - lo) * bumpHash(c, 1);
  const off = d - mid;
  if (off <= -half || off >= half) return 0;
  const amp = BUMP_MIN + (BUMP_MAX - BUMP_MIN) * bumpHash(c, 2);
  return amp * (1 + Math.cos(Math.PI * off / half)) / 2;
}
