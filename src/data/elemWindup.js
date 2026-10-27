/* ═══ v2.3.3619: WHAT EACH ELEMENT LOOKS LIKE AS A MONSTER WINDS UP ═══
 *
 * The owner, 2026-10-26: "It would be cool if you could telegraph the attacks
 * of each monster (briefly) using code to represent their elements. Maybe a
 * brief snow swirl effect before a snowman throws a snowball for instance.
 * This will promote blocking and more skilled play."
 *
 * The table rendering/elemWindup.js draws from, and the node suite reads (no
 * imports).  Keyed by the monster's ELEMENT -- the worker's own word for it
 * (server/src/monsterstatus.js ELEM_HITS: what its hit does), which every
 * monster carries (server/src/spawnscale.js monsterSnapWire `element`) -- so
 * a look always belongs to what the hit after it will do.  elem-windup.test
 * holds the two tables to the same eight.
 *
 *   kind    how its pieces move (game/elemWindup.js windupPieces)
 *   pieces  [shape, how many, its size against `size` (1 if not said)] --
 *           each shape a cell of the one picture made in code
 *           (rendering/elemWindupShapes.js SHAPE_DRAW)
 *   size    a piece's size in world px on an ordinary monster (a boss's
 *           pieces are bigger, game/elemWindup.js windupSizeK)
 *   spin    a swirl's way round (1 with the clock, -1 against)
 *   words   what it is, for the spec, the probe and a test's message
 *
 * Sizes were chosen for a phone, from its pictures (mp-elemwindup): at the
 * world's 0.6 scale a 24 world px flake is ~15 CSS px (44 device px on a 3x
 * phone), a quarter of a snowman's width.  The first cut's 13-15 px pieces
 * read as specks beside a monster, as the land auras' first 2 px squares did
 * (v2.3.3402) and the status looks' first cut (v2.3.2996). */
export const ELEM_WINDUP = Object.freeze({
  frost: Object.freeze({ kind: 'swirl', pieces: [['flake', 9], ['sparkle', 4, 0.7]], size: 24, spin: 1, words: 'snow swirling in' }),
  water: Object.freeze({ kind: 'swirl', pieces: [['drop', 8], ['spray', 3, 1.1]], size: 20, spin: -1, words: 'droplets swirling in' }),
  flame: Object.freeze({ kind: 'rise', pieces: [['ember', 9], ['flame', 4, 1.5]], size: 20, words: 'sparks rising, flames at its hands' }),
  wind: Object.freeze({ kind: 'gust', pieces: [['streak', 6], ['sand', 6, 0.35]], size: 40, words: 'a gust circling it' }),
  stone: Object.freeze({ kind: 'quake', pieces: [['pebble', 8], ['dust', 5, 1.5]], size: 22, words: 'rock dust kicked up at its feet' }),
  storm: Object.freeze({ kind: 'crackle', pieces: [['bolt', 5], ['spark', 5, 0.8]], size: 26, words: 'crackling sparks' }),
  venom: Object.freeze({ kind: 'fume', pieces: [['fume', 7], ['mote', 4, 0.6]], size: 26, words: 'poison fumes rising' }),
  flora: Object.freeze({ kind: 'goo', pieces: [['bubble', 7], ['goo', 4, 0.7]], size: 24, words: 'goo bubbling up' }),
});

/* Every shape a look may name: the cells of the one picture, in its order. */
export const WINDUP_SHAPES = Object.freeze([
  'flake', 'sparkle', 'drop', 'spray',
  'ember', 'flame', 'bolt', 'spark',
  'streak', 'sand', 'pebble', 'dust',
  'bubble', 'goo', 'fume', 'mote',
]);

export const WINDUP_FX = Object.freeze({
  POOL: 128,          /* pieces made once with the renderer, never added or removed again (TRAPS §218) */
  MAX_MONSTERS: 8,    /* winding up at once and drawn: the nearest to you when there are more */
  FADE_IN_MS: 70,     /* a wind-up can be 350 ms: it is up at once */
  VIEW_PAD: 160,      /* world px past the screen's edge still drawn */
  CELL: 48,           /* a shape's cell in the picture, px */
});

/** How many pieces a look draws. */
export function windupPieceCount(look) {
  let n = 0;
  if (look && look.pieces) for (const p of look.pieces) n += p[1];
  return n;
}
