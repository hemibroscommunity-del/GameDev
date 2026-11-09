/* ═══ v2.3.4355: THE WATER FROG'S WATER, DRAWN IN CODE ═══
 *
 * The owner, 2026-11-09: "I intend for you to draw the water attacks in code
 * actually. Don't use the water in the drawings. (Either cover over it or
 * remove)".  So the frog's strips show the frog -- its sac swelling, its
 * mouth opening -- and no water leaving it (tools/art/cut_water_frog.py), and
 * the water it attacks with is this: drawn by rendering/waterAttackFx.js the
 * moment its blow lands, its pieces placed by game/waterAttack.js from the
 * time alone.  (Its wind-up already had water drawn in code: the droplets
 * swirling in, data/elemWindup.js `water`.)
 *
 * The table the renderer draws from and the node suite reads (no imports).
 *
 *   spray   an ordinary blow (its swing, and any move that is not a ring): a
 *           jet out of its mouth the way it faces, drops thrown ahead of it
 *           in an arc, and the splash where they come down
 *   ring    a slam (and the other ring moves): a wave thrown out from under
 *           it to the ring the worker hits in, drops leaping off its crest
 *
 *   ms      how long the whole thing is on screen
 *   reach   spray: how far ahead of its mouth the water comes down (world px
 *           on an ordinary monster; the frog's swing reaches about this far)
 *   size    a piece's size in world px
 *   pieces  [shape, how many, its size against `size`] -- each shape a cell
 *           of the one picture made in code (rendering/waterAttackShapes.js)
 *   words   what it is, for the spec, the probe and a test's message
 */
export const WATER_BLOWS = Object.freeze({
  /* (size 28: at 22 its drops were specks beside a frog 120 px across,
     mp-waterfrog's first pictures) */
  spray: Object.freeze({ ms: 480, reach: 84, size: 28,
    pieces: [['streak', 3, 1.5], ['drop', 5, 1], ['blob', 4, 0.8], ['ripple', 2, 1.6], ['foam', 3, 0.9]],
    words: 'a jet of water out of its mouth, and the splash where it lands' }),
  ring: Object.freeze({ ms: 620, reach: 88, size: 24,
    pieces: [['crest', 10, 1.5], ['drop', 10, 0.9], ['foam', 4, 1.2]],
    words: 'a wave thrown out from under it, drops leaping off its crest' }),
});

/* Every shape a blow may name: the cells of the one picture, in its order. */
export const WATER_SHAPES = Object.freeze(['drop', 'blob', 'streak', 'crest', 'ripple', 'foam']);

export const WATER_FX = Object.freeze({
  POOL: 96,           /* pieces made once with the renderer, never added or removed again (TRAPS §218) */
  MAX_BLOWS: 4,       /* blows drawn at once: the nearest to you when there are more (4 x 24 pieces) */
  VIEW_PAD: 160,      /* world px past the screen's edge still drawn */
  CELL: 48,           /* a shape's cell in the picture, px */
  LATE_MS: 400,       /* a blow first seen this long after it landed is not started (it was off screen) */
});

/* the worker's abilities that hit in a ring round the monster
   (server/src/telegraph.js `slam`, server/src/monstermoves.js `quake`,
   `stomp`): every other blow is a spray the way it faces */
const RING_ABILITIES = Object.freeze({ slam: 1, quake: 1, stomp: 1 });
export function waterBlowKind(ability) {
  return Object.prototype.hasOwnProperty.call(RING_ABILITIES, String(ability)) ? 'ring' : 'spray';
}

/** How many pieces a blow draws. */
export function waterPieceCount(blow) {
  let n = 0;
  if (blow && blow.pieces) for (const p of blow.pieces) n += p[1];
  return n;
}

/* the unit vector of each facing (entityRenderer's SECTORS: x right, y down) */
const D = Math.SQRT1_2;
export const FACING_DIR = Object.freeze({
  east: [1, 0], southeast: [D, D], south: [0, 1], southwest: [-D, D],
  west: [-1, 0], northwest: [-D, -D], north: [0, -1], northeast: [D, -D],
});
