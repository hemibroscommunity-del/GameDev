/* ═══ v2.3.4356: THE STORM EYE'S ELECTRICITY, DRAWN IN CODE ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".  Its pictures are one still a side (tools/art/cut_storm_eye.py);
 * everything electric about it is this, drawn by rendering/stormSparksFx.js,
 * its pieces placed by game/stormSparks.js from the time alone.  (Its
 * wind-up already crackles in code: data/elemWindup.js `storm`.)
 *
 * The table the renderer draws from and the node suite reads (no imports).
 *
 *   aura   while it lives and is on screen: arcs that jump over its body for
 *          a tenth of a second and are gone, a new place each time, on for
 *          `duty` of the slots -- so it crackles, and is never a steady glow
 *   zap    the moment a blow of its lands (a spit, a lunge): lightning
 *          thrown off it every way, and sparks
 *   ball   round a shot of its in flight: the same arcs, small -- its goo
 *          ball in the pale blue of its lightning is a ball of it
 *
 *   ms      a zap's length
 *   reach   how far a zap's lightning gets from its middle (world px)
 *   size    a piece's size in world px
 *   pieces  [shape, how many, its size against `size`] -- each shape a cell
 *           of the one picture made in code (rendering/stormSparkShapes.js)
 *   duty    the share of slots a crackling piece is lit in
 *   words   what it is, for the spec, the probe and a test's message
 */
export const STORM_LOOKS = Object.freeze({
  aura: Object.freeze({ size: 26, duty: 0.34, pieces: [['arc', 2, 1], ['spark', 1, 0.6]], words: 'arcs jumping over its body' }),
  zap: Object.freeze({ ms: 320, reach: 62, size: 28, pieces: [['bolt', 6, 1.2], ['fork', 3, 1.35], ['spark', 5, 0.7]], words: 'lightning thrown off it every way' }),
  ball: Object.freeze({ size: 18, duty: 0.6, pieces: [['arc', 2, 0.9], ['spark', 1, 0.55]], words: 'arcs round its shot' }),
});

/* Every shape a look may name: the cells of the one picture, in its order. */
export const STORM_SHAPES = Object.freeze(['bolt', 'fork', 'arc', 'spark']);

export const STORM_FX = Object.freeze({
  POOL: 112,          /* pieces made once with the renderer, never added or removed again (TRAPS §218) */
  MAX_EYES: 8,        /* eyes crackling at once: the nearest to you when there are more (3 pieces each) */
  MAX_ZAPS: 4,        /* zaps drawn at once (14 pieces each) */
  MAX_SHOTS: 8,       /* shots crackling at once (3 pieces each) */
  SLOT_MS: 110,       /* how long an arc stays where it jumped to */
  VIEW_PAD: 120,      /* world px past the screen's edge still drawn */
  CELL: 48,           /* a shape's cell in the picture, px */
  LATE_MS: 400,       /* a blow first seen this long after it landed is not zapped (it was off screen) */
});

/** How many pieces a look draws. */
export function stormPieceCount(look) {
  let n = 0;
  if (look && look.pieces) for (const p of look.pieces) n += p[1];
  return n;
}
