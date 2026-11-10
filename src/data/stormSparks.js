/* ═══ v2.3.4356: THE STORM EYE'S ELECTRICITY, DRAWN IN CODE ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".  Its pictures are one still a side (tools/art/cut_storm_eye.py);
 * everything electric about it is this, drawn by rendering/stormSparksFx.js,
 * its pieces placed by game/stormSparks.js from the time alone.  (Its
 * wind-up already crackles in code: data/elemWindup.js `storm`.)
 *
 * v2.3.4359, the owner: "avoid marking cartoonish shapes ... pixelation
 * similar to how you made the flame effects".  Every piece is hard pixels now
 * (rendering/stormSparkShapes.js), never turned or scaled: a bolt is one of
 * three baked ways, flipped for the rest.
 *
 * The table the renderer draws from and the node suite reads (no imports).
 *
 *   aura   while it lives and is on screen: arcs that jump over its body for
 *          a tenth of a second and are gone, a new place each time, on for
 *          `duty` of the slots -- so it crackles, and is never a steady glow
 *   zap    the moment a blow of its lands (a spit, a lunge): lightning
 *          thrown off it every way, and sparks
 *   ball   round a shot of its in flight: the same arcs -- its goo ball in
 *          the pale blue of its lightning is a ball of it
 *
 *   ms      a zap's length
 *   reach   how far a zap's lightning gets from its middle (world px)
 *   pieces  [kind, how many] -- game/stormSparks.js picks each one's cell of
 *           the picture (which way a bolt lies, a spark's size)
 *   duty    the share of slots a crackling piece is lit in
 *   words   what it is, for the spec, the probe and a test's message
 */
export const STORM_LOOKS = Object.freeze({
  aura: Object.freeze({ duty: 0.34, pieces: [['arc', 2], ['spark', 1]], words: 'arcs jumping over its body' }),
  zap: Object.freeze({ ms: 320, reach: 62, pieces: [['bolt', 9], ['spark', 5]], words: 'lightning thrown off it every way' }),
  ball: Object.freeze({ duty: 0.6, pieces: [['arc', 2], ['spark', 1]], words: 'arcs round its shot' }),
});

/* Every cell of the one picture, in its order (rendering/stormSparkShapes.js
   STORM_PIXELS has each one's pixels). */
export const STORM_SHAPES = Object.freeze(['bv', 'bh', 'bd', 'av', 'ah', 'ad', 's3', 's5']);
/* the three ways a bolt (and an arc) is baked: upright, lying, on the slant */
export const STORM_WAYS = Object.freeze({ bolt: Object.freeze(['bv', 'bh', 'bd']), arc: Object.freeze(['av', 'ah', 'ad']), spark: Object.freeze(['s3', 's5']) });

export const STORM_FX = Object.freeze({
  POOL: 112,          /* pieces made once with the renderer, never added or removed again (TRAPS §218) */
  MAX_EYES: 8,        /* eyes crackling at once: the nearest to you when there are more (3 pieces each) */
  MAX_ZAPS: 4,        /* zaps drawn at once (14 pieces each) */
  MAX_SHOTS: 8,       /* shots crackling at once (3 pieces each) */
  SLOT_MS: 110,       /* how long an arc stays where it jumped to */
  VIEW_PAD: 120,      /* world px past the screen's edge still drawn */
  PX: 2,              /* world px an art pixel is drawn at: every piece sits on this grid, never between */
  LATE_MS: 400,       /* a blow first seen this long after it landed is not zapped (it was off screen) */
});

/** How many pieces a look draws. */
export function stormPieceCount(look) {
  let n = 0;
  if (look && look.pieces) for (const p of look.pieces) n += p[1];
  return n;
}

/** Which baked way a bolt lying along `angle` (radians, x right, y down) is
 *  drawn: its cell's place in a kind's three ways, and whether flipped
 *  left-to-right (the slant is baked top-left to bottom-right). */
export function boltWay(angle) {
  const s = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;   /* 0 east, 2 south, 4 west, 6 north */
  if (s === 0 || s === 4) return { way: 1, flip: 1 };
  if (s === 2 || s === 6) return { way: 0, flip: 1 };
  return { way: 2, flip: (s === 1 || s === 5) ? 1 : -1 };
}
