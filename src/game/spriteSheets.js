import { TILED_ZONE_MAPS, getWalkability, loadWalkabilityMaps, preloadAllTiledMaps, WALK_MASKS_ENABLED } from '@/rendering/tiledMaps.js';
import { propsForZone, propFootprint } from '@/data/worldProps.js'; /* v2.3.1778: buildings block */
import { ZONES, TILE } from '@/data/index.js';

/* === spriteSheets — mount-time walkability loader ===
   v2.3.900: extracted verbatim from a BroTown.jsx mount useEffect (empty
   deps).  Call from a useEffect with an empty dep array.

   ═══ v2.3.2328: THE SPRITE HALF OF THIS MODULE IS GONE ═══
   What was removed: the 15 player stand/jog/hit sheets at ?v=43, the four
   weapon icons, the six slime sheets, anchors.json?v=3 and handles.json?v=2.
   Every one of them was written into a ref that NOTHING READS.  Their only
   consumer was the Canvas 2D drawSpriteCharacter/drawNft360 pair in
   BroTown.jsx, which Rollup had already tree-shaken out of the shipped
   bundle — but a bundler cannot shake a `new Image()` whose src is set,
   because a network fetch is a side effect it must preserve.  So the
   downloads kept happening for code that no longer shipped.

   MEASURED on a cold load at 390x844 (tools/qa/mp/mp-coldload.mjs), before
   and after: the 15 player sheets (1.091 MB), anchors.json?v=3 (0.022 MB),
   handles.json?v=2, six slime sheets and three weapon icons all go to zero --
   1.21 MB across 26 requests, of a 33.30 MB / 790-request total.  Worse
   than dead weight in two places — the 15 player sheets were the SAME art
   the live Pixi loader (playerSprites.js, ?v=101) already fetches as WebP,
   so jog-south arrived twice in two formats and was decoded twice; and the
   slime sheets and weapon icons arrived twice as well, once unversioned
   here and once tagged by the live loader.

   The module keeps the half that is real: the Tiled preload, the painted
   walkability grids, and the prop-footprint stamping that isSolid() reads.
   This is the same cleanup the v2.3.1670 note below describes for the zone
   swatch and tree loaders — the Canvas 2D path leaving in pieces. */
export function wireSpriteSheets(stateRef) {
    /* Zone swatch + tree-sprite loaders removed — those were used
       only by the Canvas 2D rendering path (gather-node procedural
       tree replacement, ground-tile pattern fill).  The Pixi tile
       renderer pulls art from public/maps/<zone>_*.webp directly.
       v2.3.1670: this used to end "and the gather nodes are
       sprite-based via tileAssets" — tileAssets.js is deleted; its
       tileset only ever fed an unreachable render branch. */

    /* Tiled maps — fire-and-forget preload so the renderer can pick
       them up as soon as they arrive. Once each map resolves, stash
       its walkability grid on stateRef so isSolid() can consult it. */
    preloadAllTiledMaps().then(function () {
      var S = stateRef.current;
      if (!S) return;
      S._tiledWalkable = S._tiledWalkable || {};
      /* v2.3.1693: the owner's walk-mask kill switch covers the Tiled-derived
         grids too, not just the painted .walk.json ones — TILED_ZONE_MAPS is
         empty today, so this is only guarding the day a Tiled zone comes back
         and quietly re-arms collision behind a flag that says it's off. */
      if (!WALK_MASKS_ENABLED) return;
      Object.keys(TILED_ZONE_MAPS).forEach(function (zid) {
        var grid = getWalkability(zid);
        if (grid) S._tiledWalkable[zid] = grid;
      });
    });

    /* Image-zone walkability JSONs (e.g. town, where the painted yellow
       overlay was processed offline into a 32x32 boolean grid).  Stored
       on the same _tiledWalkable map isSolid() already consults. */
    loadWalkabilityMaps().then(function (grids) {
      var S = stateRef.current;
      if (!S) return;
      S._tiledWalkable = S._tiledWalkable || {};
      Object.keys(grids).forEach(function (zid) {
        S._tiledWalkable[zid] = stampPropFootprints(zid, grids[zid]);
      });
      /* v2.3.1794: zones with no mask still need their OBJECTS to block.
         Owner: "only make the objects (like each house and NPC) unwalkable
         areas.  Everything else walkable again in the brotown area."  So the
         terrain contributes nothing and the props table is the whole of
         collision — an open field with solid buildings standing on it. */
      installPropOnlyGrids(S);
    });
}

/* ═══ v2.3.1794: COLLISION FROM OBJECTS ALONE ═══
   For a zone with blocking props but no walkability mask, build a grid that is
   entirely walkable and stamp only the footprints into it.  isSolid treats any
   present grid as AUTHORITATIVE, so handing it an all-open grid is what makes
   "everything walkable except the objects" true — there is no separate
   no-mask code path to add.

   CELL SIZE 16px, half a tile.  The footprint stamp rounds outward to whole
   cells, so a coarser grid grows every building by up to a tile of invisible
   wall on each side; 16px keeps that under 8px, which is smaller than the
   player's own half-width and so cannot be felt.  Finer would cost memory for
   accuracy the art does not have — these footprints are hand-declared boxes,
   not pixel outlines. */
function installPropOnlyGrids(S) {
  Object.keys(ZONES).forEach(function (zid) {
    if (S._tiledWalkable[zid]) return;                 /* a real mask wins */
    var props = propsForZone(zid).filter(function (p) { return propFootprint(p); });
    if (!props.length) return;
    var zone = ZONES[zid];
    var CELL = 16;
    var gw = Math.max(1, Math.round(zone.w * TILE / CELL));
    var gh = Math.max(1, Math.round(zone.h * TILE / CELL));
    var open = [];
    for (var gy = 0; gy < gh; gy++) {
      var row = new Array(gw);
      for (var gx = 0; gx < gw; gx++) row[gx] = true;
      open.push(row);
    }
    S._tiledWalkable[zid] = stampPropFootprints(zid, open);
  });
}

/* ═══ v2.3.1778: BUILDINGS BLOCK ═══
   Owner, on the buildings going into town: "Not walkable."

   Stamped onto the loaded grid rather than baked into the .walk.json, so the
   props table stays the ONE place a building's position lives: move a building
   and its collision moves with it, with no map rebuild and no chance of the
   two disagreeing.  The map's own grid is the terrain; this is what is
   standing on it.

   The grid is COPIED before stamping — loadWalkabilityMaps caches its fetch,
   and stamping in place would compound every footprint again on a re-entry
   until the town was solid. */
function stampPropFootprints(zoneId, grid) {
  if (!grid || !grid.length) return grid;
  var zone = ZONES[zoneId];
  var props = propsForZone(zoneId).filter(function (p) { return propFootprint(p); });
  if (!zone || !props.length) return grid;
  var gh = grid.length, gw = grid[0].length;
  var mw = zone.w * TILE, mh = zone.h * TILE;
  var out = grid.map(function (row) { return row.slice(); });
  props.forEach(function (p) {
    var f = propFootprint(p);
    var gx0 = Math.max(0, Math.floor(f.x0 * gw / mw));
    var gx1 = Math.min(gw - 1, Math.floor(f.x1 * gw / mw));
    var gy0 = Math.max(0, Math.floor(f.y0 * gh / mh));
    var gy1 = Math.min(gh - 1, Math.floor(f.y1 * gh / mh));
    for (var gy = gy0; gy <= gy1; gy++) {
      for (var gx = gx0; gx <= gx1; gx++) out[gy][gx] = false;
    }
  });
  return out;
}
