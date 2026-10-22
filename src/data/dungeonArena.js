/* ═══ v2.3.3565: WHERE EACH DUNGEON'S THINGS STAND, AND ITS WALLS ═══
 *
 * The owner's ChatGPT pictures of the Goo Grotto (src/data/dungeonArt.js,
 * cut by tools/world/add-dungeon-art.mjs) stood in its arena, as its prompt
 * said they would (docs/art/DUNGEON-ART-PROMPTS.md): "stands them round the
 * arena's edges, clear of the middle where you fight and of the way out. The
 * torches or lamps go either side of the way out."
 *
 * No imports: the server's tests read it (server/test/dungeon-arena.test.mjs
 * holds every thing inside the floor, clear of the wave's ground, the arrival
 * and the way out).
 *
 * THE ARENA (game px) is the one every world dungeon has (src/data/
 * wheelDungeons.js WHEEL_ARENA): 36 x 52 tiles of 32, 1152 x 1664, the way
 * out two tiles wide in the last row of floor (cols 17-18, y 1536-1568), a
 * bottom wall three tiles thick under it, and you arriving seven rows above
 * it (576, 1328).  The worker's waves stand in cols 3-33 from row 5 to the
 * middle (server/src/wheeldungeon.js TOP_ROW): x 96-1056, y 160-832.
 *
 * ITS WALLS, from the art (rendering/arenaWalls.js draws them):
 *   the north wall's FRONT stands along the top, its foot at FACE_FOOT -- the
 *   top bar covers the rows above, where nobody's middle ever goes (BroTown.jsx
 *   _HEAD_MARGIN), so the wall a little taller than a person fits there whole;
 *   its TOP lies above it, and along the two sides and the bottom, SIDE thick;
 *   the bottom one with a gap where the way out is (GAP, from its middle).
 *   Each is a footprint too (arenaWallBlockers): your boots stop at the drawn
 *   wall, and an arrow fired into one sticks there.
 *
 * ITS THINGS: `x`, `y` where each stands (its foot); `flat` lies on the
 * ground under everyone (a puddle); `block` [w, d] is the ground it stops your
 * boots on (none: you walk through it -- mushrooms, ferns), and `id` the kind
 * a hit on it is (its chips and sound, worldProps.propMaterial; a low one,
 * 'stone' or 'scrap', is one a jump clears and an arrow flies over:
 * game/jump.js JUMP_OVER). */

export const ARENA_W = 36 * 32;
export const ARENA_H = 52 * 32;
/* the way out's middle and the arrival (data/wheelDungeons.js wheelArenaMap) */
export const ARENA_EXIT = Object.freeze({ x: 18 * 32, y0: 48 * 32, y1: 49 * 32 });
export const ARENA_ARRIVAL = Object.freeze({ x: 18 * 32, y: (48 - 7) * 32 + 16 });
/* the ground a wave stands on (server/src/wheeldungeon.js) */
export const ARENA_WAVES = Object.freeze({ x0: 3 * 32, x1: 33 * 32, y0: 5 * 32, y1: 26 * 32 });

/* the walls (game px): the front's foot, how thick the top is drawn along the
   sides and bottom, the bottom wall's top edge, and the gap in it either side
   of the way out's middle */
export const ARENA_WALLS = Object.freeze({ FACE_FOOT: 176, SIDE: 64, BOTTOM: 49 * 32, GAP: 46 });

export const DUNGEON_ARENA = {
  verdant: [
    /* the west side, north to south */
    { art: 'pillar-1', x: 122, y: 292, block: [44, 18], id: 'pillar', h: 100 },
    { art: 'mushroom-1', x: 92, y: 420 },
    { art: 'boulder-1', x: 112, y: 724, block: [52, 18], id: 'stone', h: 60 },
    { art: 'puddle-3', x: 190, y: 968, flat: true },
    { art: 'fern-1', x: 96, y: 1150 },
    { art: 'boulder-3', x: 140, y: 1396, block: [64, 18], id: 'stone', h: 58 },
    /* the east side, north to south */
    { art: 'fern-3', x: 1004, y: 214 },
    { art: 'pillar-2', x: 1036, y: 336, block: [44, 18], id: 'pillar', h: 64 },
    { art: 'mushroom-2', x: 1064, y: 604 },
    { art: 'boulder-2', x: 1030, y: 884, block: [64, 16], id: 'stone', h: 47 },
    { art: 'fern-2', x: 1064, y: 1112 },
    { art: 'heap-1', x: 992, y: 1432, block: [52, 16], id: 'scrap', h: 42 },
    { art: 'mushroom-3', x: 878, y: 1504 },
    /* the way out, a torch post either side of it */
    { art: 'torch-1', x: 486, y: 1558, block: [18, 10], id: 'torchpost', h: 110 },
    { art: 'torch-2', x: 664, y: 1558, block: [18, 10], id: 'torchpost', h: 110 },
    /* slime on the floor, out of the fight's middle */
    { art: 'puddle-1', x: 300, y: 600, flat: true },
    { art: 'puddle-2', x: 806, y: 1196, flat: true },
  ],
};

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** What stands in land `home`'s arena ([] for a land with no art yet). */
export function arenaThings(home) {
  return own(DUNGEON_ARENA, home) ? DUNGEON_ARENA[home] : [];
}

/** The walls' footprints, game px boxes { x0, y0, x1, y1, id, h }: the north
    wall's front, the two sides and the bottom either side of the way out. */
export function arenaWallBlockers(W = ARENA_W, H = ARENA_H) {
  const { FACE_FOOT, SIDE, BOTTOM, GAP } = ARENA_WALLS;
  const ex = ARENA_EXIT.x, inset = 8;
  return [
    { x0: 0, y0: 0, x1: W, y1: FACE_FOOT, id: 'wall', h: 120 },
    { x0: 0, y0: 0, x1: SIDE - inset, y1: H, id: 'wall', h: 64 },
    { x0: W - SIDE + inset, y0: 0, x1: W, y1: H, id: 'wall', h: 64 },
    { x0: 0, y0: BOTTOM - 6, x1: ex - GAP, y1: H, id: 'wall', h: 64 },
    { x0: ex + GAP, y0: BOTTOM - 6, x1: W, y1: H, id: 'wall', h: 64 },
  ];
}

/** Every footprint of land `home`'s arena: its walls and the things that
    stop your boots. */
export function arenaBlockers(home) {
  const out = arenaWallBlockers();
  for (const t of arenaThings(home)) {
    if (!t.block) continue;
    const [w, d] = t.block;
    out.push({ x0: t.x - w / 2, y0: t.y - d, x1: t.x + w / 2, y1: t.y, id: t.id || 'stone', h: t.h || 40 });
  }
  return out;
}
