import { TILED_ZONE_MAPS, getWalkability, loadWalkabilityMaps, preloadAllTiledMaps, WALK_MASKS_ENABLED } from '@/rendering/tiledMaps.js';
import { propsForZone, propFootprint } from '@/data/worldProps.js'; /* v2.3.1778: buildings block */
import { ZONES, TILE } from '@/data/index.js';

/* === spriteSheets — mount-time player/slime/weapon sheet + walkability loader ===
   v2.3.900: extracted verbatim from a BroTown.jsx mount useEffect (empty
   deps). Loads the per-direction player jog/hit sheets, slime sheets,
   weapon sprites + hand anchors, and the Tiled walkability maps into the
   refs BroTown's render loop reads. Behavior-frozen: the per-direction
   frame-interval math, the image-load wiring, and the async map loads are
   unchanged. The ten image/anchor refs come in via a `refs` object so the
   body stays byte-identical (destructured back to the original names);
   stateRef passes separately. Call from a useEffect with an empty dep
   array. */
export function wireSpriteSheets(stateRef, refs) {
  var handAnchorsRef = refs.handAnchorsRef,
    playerSpritesRef = refs.playerSpritesRef,
    slimeDeathImgRef = refs.slimeDeathImgRef,
    slimeHitImgRef = refs.slimeHitImgRef,
    slimeIdleImgRef = refs.slimeIdleImgRef,
    slimeProjectileImgRef = refs.slimeProjectileImgRef,
    slimeRemnantsImgRef = refs.slimeRemnantsImgRef,
    slimeShootImgRef = refs.slimeShootImgRef,
    weaponHandlesRef = refs.weaponHandlesRef,
    weaponSpritesRef = refs.weaponSpritesRef;
    /* Source clip durations (ms), used to compute per-direction frame interval. */
    var JOG_DURATION_MS = {
      east: 1333, north: 2008, northeast: 1503, south: 2000, southwest: 1998,
    };
    var JOG_FRAMES = 24;
    /* Hit-react sheets: 6 frames × 64×64 each (384×64), played once over
       250 ms (≈ 24 fps source) when the player takes damage. The character
       is locked from movement/actions during this window — see the
       playerStunned check in the input section. */
    var HIT_FRAMES = 6;
    var HIT_DURATION_MS = 250;
    var sheets = {};
    var dirs = ['east', 'north', 'northeast', 'south', 'southwest'];
    var poses = ['stand', 'jog', 'hit'];
    var total = dirs.length * poses.length, loaded = 0;
    poses.forEach(function (pose) {
      dirs.forEach(function (dir) {
        var img = new Image();
        img.onload = function () {
          var frames = pose === 'jog' ? JOG_FRAMES : pose === 'hit' ? HIT_FRAMES : 1;
          var intervalMs = pose === 'jog' ? JOG_DURATION_MS[dir] / JOG_FRAMES
                          : pose === 'hit' ? HIT_DURATION_MS / HIT_FRAMES
                          : 1000;
          sheets[pose + '-' + dir] = { img: img, frames: frames, w: 64, intervalMs: intervalMs };
          loaded++;
          if (loaded === total) playerSpritesRef.current = sheets;
        };
        img.onerror = function () { loaded++; if (loaded === total) playerSpritesRef.current = sheets; };
        /* Cache-buster: bump v= each time sheet content or frame count changes. */
        img.src = '/sprites/player/' + pose + '-' + dir + '.png?v=43'; /* v43: regenerated NE jog cycle (v2.3.708) */
      });
    });

    /* Weapon icons. Map weapon.type → image. Greatsword shares the sword
       icon. */
    var wsheets = {};
    var wMap = {
      sword:      '/sprites/weapons/swords/Sword1.webp',
      greatsword: '/sprites/weapons/swords/Sword1.webp',
      bow:        '/sprites/weapons/bows/Bow2.png',
      staff:      '/sprites/weapons/staffs/Wizard%20Staff2.png',
    };
    var wTotal = Object.keys(wMap).length, wLoaded = 0;
    Object.keys(wMap).forEach(function (type) {
      var wImg = new Image();
      wImg.onload = function () {
        wsheets[type] = wImg;
        wLoaded++;
        if (wLoaded === wTotal) weaponSpritesRef.current = wsheets;
      };
      wImg.onerror = function () { wLoaded++; if (wLoaded === wTotal) weaponSpritesRef.current = wsheets; };
      wImg.src = wMap[type] + '?v=1';
    });

    /* Per-frame hand anchors (built by the public/tools/anchor.html annotator).
       Bump ?v= when re-annotating so cached copies don't shadow the new file. */
    fetch('/sprites/player/anchors.json?v=3')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) handAnchorsRef.current = j; })
      .catch(function () { /* missing file — sprite falls back to facing-based offset */ });

    /* Per-weapon handle pixel (built by public/tools/weapon-anchor.html).
       Without this the renderer assumes the handle is at the bottom-center
       of the weapon image — wrong for diagonally-drawn sources. */
    fetch('/sprites/weapons/handles.json?v=2')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) weaponHandlesRef.current = j; })
      .catch(function () { /* missing — fall back to bottom-center */ });

    /* Slime monster sprites — idle bob loop + death splash.  Sheets are
       128 px tall; renderer reads frame count from naturalWidth / 128
       so we can swap in new sheets with different frame counts without
       touching render code (v4 was 8 frames, v5 is 24 frames). */
    var slimeIdle = new Image();
    slimeIdle.onload = function () { slimeIdleImgRef.current = slimeIdle; };
    slimeIdle.src = '/sprites/monsters/slime-idle-v5.png';
    var slimeDeath = new Image();
    slimeDeath.onload = function () { slimeDeathImgRef.current = slimeDeath; };
    slimeDeath.src = '/sprites/monsters/slime-death-v10.png';
    /* Shoot/attack animation — same 8-frame sheet shape as idle/death.
       Plays briefly when the slime lunges at the player so the attack
       cadence reads visually. */
    var slimeShoot = new Image();
    slimeShoot.onload = function () { slimeShootImgRef.current = slimeShoot; };
    slimeShoot.src = '/sprites/monsters/slime-shoot-v2.png';
    /* Hit-reaction sheet — squash anim plays for 250 ms when a fodder
       slime takes damage. Priority order in render: hit > shoot > idle. */
    var slimeHit = new Image();
    slimeHit.onload = function () { slimeHitImgRef.current = slimeHit; };
    slimeHit.src = '/sprites/monsters/slime-hit-v1.png';
    /* Projectile (single-frame orb) and remnants splat (single-frame
       ground splatter for the inventory pickup drop). */
    var slimeProj = new Image();
    slimeProj.onload = function () { slimeProjectileImgRef.current = slimeProj; };
    slimeProj.src = '/sprites/monsters/slime-projectile-v1.png';
    var slimeRem = new Image();
    slimeRem.onload = function () { slimeRemnantsImgRef.current = slimeRem; };
    slimeRem.src = '/sprites/monsters/slime-remnants-v1.png';

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
