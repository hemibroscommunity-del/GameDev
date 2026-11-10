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
 * v2.3.4359, the owner: "avoid marking cartoonish shapes. Make water effects
 * with pixelation similar to how you made the flame effects".  Every piece is
 * hard pixels now (rendering/waterAttackShapes.js), never turned or scaled.
 *
 * The table the renderer draws from and the node suite reads (no imports).
 *
 *   spray   an ordinary blow (its swing, and any move that is not a ring): a
 *           torrent out of its mouth the way it faces -- gouts of water one
 *           on another, so they run together -- spray thrown off it, and the
 *           splash where it comes down: a crown thrown up off the ground, a
 *           ring spreading under it
 *   ring    a slam (and the other ring moves): a wave of gouts thrown out
 *           from under it to the ring the worker hits in, spray leaping off it
 *
 *   ms      how long the whole thing is on screen
 *   reach   spray: how far ahead of its mouth the water comes down (world px
 *           on an ordinary monster; the frog's swing reaches about this far)
 *   pieces  [kind, how many] -- game/waterAttack.js picks each one's cell of
 *           the picture (a gout's size and cut, the crown's frame)
 *   words   what it is, for the spec, the probe and a test's message
 */
export const WATER_BLOWS = Object.freeze({
  spray: Object.freeze({ ms: 560, reach: 84,
    pieces: [['jet', 12], ['drop', 8], ['crown', 1], ['ripple', 2], ['foam', 3]],
    words: 'a torrent out of its mouth, and the splash thrown up where it lands' }),
  ring: Object.freeze({ ms: 620, reach: 88,
    pieces: [['wave', 26], ['drop', 6]],
    words: 'a wave thrown out from under it, spray leaping off it' }),
});

/* Every cell of the one picture, in its order (rendering/waterAttackShapes.js
   WATER_PIXELS has each one's pixels). */
export const WATER_SHAPES = Object.freeze(['d2', 'd3', 'g5a', 'g5b', 'g9a', 'g9b', 'g13a', 'g13b', 'g17a', 'g17b',
  'k1', 'k2', 'k3', 'k4', 'f3', 'f5', 'r1', 'r2', 'r3']);
/* the cells each kind of piece may be (a gout's two cuts side by side: a
   piece flickers between them) */
export const WATER_KINDS = Object.freeze({
  jet: Object.freeze(['g5a', 'g5b', 'g9a', 'g9b', 'g13a', 'g13b', 'g17a', 'g17b']),
  wave: Object.freeze(['g13a', 'g13b', 'g17a', 'g17b']),
  drop: Object.freeze(['d2', 'd3', 'g5a']), foam: Object.freeze(['f3', 'f5']),
  crown: Object.freeze(['k1', 'k2', 'k3', 'k4']), ripple: Object.freeze(['r1', 'r2', 'r3']),
});
/* a torrent's gouts from its head back: the biggest lead, the last trail off
   (indexes of WATER_KINDS.jet's sizes: 0 = 5 px, 1 = 9, 2 = 13, 3 = 17) */
export const JET_SIZES = Object.freeze([3, 3, 2, 3, 2, 3, 2, 2, 1, 2, 1, 0]);
/* how tall the crown's cell is (rendering/waterAttackShapes.js CROWN_H): its
   foot is its bottom row, and a piece is placed by its middle */
export const WATER_CROWN_H = 17;

export const WATER_FX = Object.freeze({
  POOL: 128,          /* pieces made once with the renderer, never added or removed again (TRAPS §218) */
  MAX_BLOWS: 4,       /* blows drawn at once: the nearest to you when there are more (4 x 32 pieces) */
  VIEW_PAD: 160,      /* world px past the screen's edge still drawn */
  PX: 2,              /* world px an art pixel is drawn at: every piece sits on this grid, never between */
  ALPHA_STEPS: 3,     /* a piece fades in steps (1, 2/3, 1/3, gone), never smoothly */
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
