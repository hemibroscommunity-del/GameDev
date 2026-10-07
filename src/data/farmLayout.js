/* ═══ v2.3.3124: YOUR FARM, LAID OUT ═══
 *
 * The owner, 2026-10-06: "I want your character to be able to walk around on
 * the farm" -- and of the old cave map: "This map isn't suited for a farm.
 * It was an early idea of having it be in a cave."
 *
 * The one copy of where everything on the farm is.  Read by the ground's bake
 * (tools/world/bake_farm_ground.py: the grass, the yard and the path under
 * it all, from the owner's own Ground Studio pictures), the farm's renderer
 * (src/rendering/farmWorld.js: the barn, the props, the trees, the beds and
 * what grows in them), the walk test (the blockers), the zone's tile grid
 * (gameDisplay.js generateZoneMap: the gate out) and the tests.  Plain data,
 * no imports: node reads it.  docs/specs/farm-walk.md.
 *
 * Game px, the zone's own: (0, 0) its top-left corner.  A thing stands at its
 * FOOT (x, y) -- the bottom middle of its picture, where it meets the ground,
 * as the Wheel's objects do -- and `block` is the ground it takes from the
 * walk test, [dx, dy, w, h] from the foot (dy negative: behind it).
 *
 * `art` names a picture: 'farm:<name>' is the owner's farm art
 * (public/world/farm/<name>.png, src/data/farmArt.js), 'obj:<sheet>/<frame>'
 * one of the Wheel's objects (public/world/objects/<sheet>.json, its
 * manifest's names -- server/test/farmwalk.test.mjs checks every one).
 */

export const FARM_ZONE = Object.freeze({ w: 1024, h: 1408, tiles: [32, 44] });

/* The ground, at 2 picture px a game px (the art law): the owner's commons
   grass everywhere, a yard of packed earth before the barn and a dirt path
   from the gate.  Edges wander (never a ruler line). */
export const FARM_GROUND = Object.freeze({
  picture: '/maps/farm_v2.webp',   /* tiledMaps.js IMAGE_ZONE_MAPS.farm_home, the same */
  seed: 31,
  grass: ['commons-A', 'commons-B'],
  yard: { swatch: 'town-yard-A', cx: 512, cy: 600, rx: 360, ry: 112, wander: 22 },
  path: { swatch: 'street-A', width: 86, wander: 9,
    points: [[232, 1460], [232, 1080], [246, 880], [286, 744], [352, 668], [420, 630]] },
});

/* The beds, in the worker's order (farm_state's plots[i] is FARM_BEDS[i]):
   six now, the free deed (server/src/farm.js FREE_BEDS).  Each the size of
   the owner's bed pictures (~98 x 72 game px); x, y its top-left. */
export const FARM_BED_W = 98, FARM_BED_H = 72;
const bed = (x, y) => Object.freeze({ x, y, w: FARM_BED_W, h: FARM_BED_H });
export const FARM_BEDS = Object.freeze([
  bed(410, 760), bed(572, 760), bed(734, 760),
  bed(410, 916), bed(572, 916), bed(734, 916),
]);
/* Where what grows in a bed stands: its foot this far below the bed's top,
   in the middle of the owner's soil (inside the raised edge). */
export const FARM_CROP_FOOT_DY = 46;
/* How near your boots must be to work a bed, game px round its edge. */
export const FARM_BED_REACH = 46;
/* Where you kneel to work one: your boots on its back edge, a little in, and
   left of its middle -- you crouch as the cook does, and what stands where
   the cook's pan is (a crate of earth, seeds or water, the compost bin, the
   straw: src/data/farmCovers.js) is to your right, over the bed's middle
   (effectsRenderer _updateFarmKneel). */
export const FARM_KNEEL_DY = 12;
export const FARM_KNEEL_DX = -19;

/* The places the old farm had as invisible spots, now things you can see:
   your bed for the night (the haystack until the owner's Farmhouse picture
   comes), the Dungeon Workshop (the notice board until its own picture), and
   the Pet House: the barn's big door -- animals live in the barn. */
export const FARM_SPOTS = Object.freeze({
  sleep: { x: 132, y: 556, r: 86, label: 'Sleep in the hay' },
  workshop: { x: 890, y: 548, r: 92, label: 'Dungeon Workshop' },
  petHouse: { x: 512, y: 566, r: 82, label: 'Pet House' },
});

/* The gate out (the zone's exit tiles) and where a visit arrives: your body's
   middle (S.player), your boots 52 px below it -- three tiles from the exit,
   outside its reach (zoneTransitions RETURN_R).  Back from a dungeon of the
   Dungeon Workshop, you arrive at its notice board. */
export const FARM_GATE = Object.freeze({ x: 232, y: 1400, halfW: 64 });
export const FARM_ARRIVE = Object.freeze({ x: 232, y: 1296 });
export const FARM_FROM_WORKSHOP = Object.freeze({ x: 862, y: 600 });

/* Everything standing.  Drawn by its foot and sorted with you by it. */
export const FARM_THINGS = Object.freeze([
  /* the barn, top middle; its walls end 46 px above its foot, where the ramp
     to the big door begins */
  { art: 'farm:barn', x: 512, y: 566, block: [-186, -176, 372, 128] },
  { art: 'farm:tool-rack', x: 262, y: 528, block: [-44, -18, 88, 18] },
  { art: 'obj:commons-2/haystack-1', x: 132, y: 540, block: [-46, -26, 92, 26] },
  { art: 'obj:town-4/noticeboard-1', x: 890, y: 532, block: [-52, -16, 104, 16] },
  { art: 'farm:seed-sacks', x: 760, y: 624, block: [-58, -24, 116, 24] },
  { art: 'farm:wheelbarrow', x: 690, y: 690, block: [-74, -26, 148, 26] },
  { art: 'farm:compost-bin', x: 332, y: 792, block: [-46, -28, 92, 28] },
  { art: 'farm:scarecrow', x: 890, y: 920, block: [-12, -10, 24, 10] },
  { art: 'obj:town-3/well-1', x: 112, y: 1010, block: [-54, -40, 108, 40] },
  { art: 'obj:town-2/trough-1', x: 722, y: 1166, block: [-30, -16, 60, 16] },
  { art: 'obj:town-2/haybale-2', x: 640, y: 1184, block: [-22, -16, 44, 16] },
  { art: 'obj:town-2/haybale-1', x: 800, y: 1196, block: [-22, -14, 44, 14] },
  /* trees round the edge */
  { art: 'obj:commons-1/oak-1', x: 110, y: 250, block: [-22, -14, 44, 14] },
  { art: 'obj:commons-1/orchard-1', x: 262, y: 168, block: [-14, -10, 28, 10] },
  { art: 'obj:commons-1/orchard-2', x: 766, y: 150, block: [-14, -10, 28, 10] },
  { art: 'obj:commons-1/oak-2', x: 920, y: 262, block: [-22, -14, 44, 14] },
  { art: 'obj:commons-1/oak-2', x: 18, y: 780, block: [-22, -14, 44, 14] },
  { art: 'obj:commons-1/orchard-1', x: 36, y: 1210, block: [-14, -10, 28, 10] },
  { art: 'obj:commons-1/oak-1', x: 1004, y: 760, block: [-22, -14, 44, 14] },
  { art: 'obj:commons-1/orchard-2', x: 980, y: 1080, block: [-14, -10, 28, 10] },
  { art: 'obj:commons-1/orchard-1', x: 930, y: 1310, block: [-14, -10, 28, 10] },
  { art: 'obj:commons-1/orchard-2', x: 560, y: 1330, block: [-14, -10, 28, 10] },
  /* bushes, flowers and the odd stone */
  { art: 'obj:commons-1/bush-2', x: 186, y: 690 },
  { art: 'obj:commons-1/bush-3', x: 88, y: 1330 },
  { art: 'obj:commons-1/bush-1', x: 990, y: 560 },
  { art: 'obj:commons-1/bush-4', x: 420, y: 1250 },
  { art: 'obj:commons-1/bush-1', x: 840, y: 1350 },
  { art: 'obj:commons-2/flowers-1', x: 200, y: 600 },
  { art: 'obj:commons-2/flowers-3', x: 404, y: 1060 },
  { art: 'obj:commons-2/flowers-2', x: 860, y: 1050 },
  { art: 'obj:commons-2/flowers-4', x: 330, y: 1220 },
  { art: 'obj:commons-2/flowers-1', x: 676, y: 700 },
  { art: 'obj:commons-2/flowers-2', x: 640, y: 1070 },
  { art: 'obj:commons-2/stone-2', x: 70, y: 880 },
  { art: 'obj:commons-3/stump-1', x: 980, y: 1200 },
  /* the fence along the bottom and the gate in it */
  { art: 'obj:town-4/gate-1', x: 232, y: 1404 },
  { art: 'obj:town-4/fence-1', x: 40, y: 1404, block: [-80, -14, 160, 14] },
  { art: 'obj:town-4/fence-2', x: 446, y: 1404, block: [-78, -14, 156, 14] },
  { art: 'obj:town-4/fence-3', x: 614, y: 1404, block: [-92, -14, 184, 14] },
  { art: 'obj:town-4/fence-1', x: 786, y: 1404, block: [-80, -14, 160, 14] },
  { art: 'obj:town-4/fence-2', x: 942, y: 1404, block: [-78, -14, 156, 14] },
]);

/* The edge you cannot walk past, game px in from each side (the trees and
   the fence stand on it). */
export const FARM_EDGE = Object.freeze({ top: 196, left: 44, right: 44, bottom: 22 });

/** Everything that stops your BOOTS on the farm, as boxes {x0, y0, x1, y1,
 *  id} (game px): the farm's edge -- open under the gate -- and each thing's
 *  footprint.  The renderer hands these to the walk test
 *  (rendering/farmWorld.js, worldProps.setZoneBlockerHook); the tests walk
 *  the same boxes (server/test/farmwalk.test.mjs). */
export function farmBlockers() {
  const W = FARM_ZONE.w, H = FARM_ZONE.h, out = 400;
  const boxes = [
    { x0: -out, y0: -out, x1: W + out, y1: FARM_EDGE.top, id: 'edge' },
    { x0: -out, y0: -out, x1: FARM_EDGE.left, y1: H + out, id: 'edge' },
    { x0: W - FARM_EDGE.right, y0: -out, x1: W + out, y1: H + out, id: 'edge' },
    { x0: -out, y0: H - FARM_EDGE.bottom, x1: FARM_GATE.x - FARM_GATE.halfW, y1: H + out, id: 'edge' },
    { x0: FARM_GATE.x + FARM_GATE.halfW, y0: H - FARM_EDGE.bottom, x1: W + out, y1: H + out, id: 'edge' },
  ];
  for (const t of FARM_THINGS) {
    if (!t.block) continue;
    const [dx, dy, w, h] = t.block;
    boxes.push({ x0: t.x + dx, y0: t.y + dy, x1: t.x + dx + w, y1: t.y + dy + h, id: t.art.replace(/^(farm|obj):(.*\/)?/, '').replace(/-\d+$/, '') });
  }
  return boxes;
}
