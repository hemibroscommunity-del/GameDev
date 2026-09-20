/* ═══════════════════════════════════════════════════════════════════════
   v2.3.2633: DEPTH SORTING BY GROUND-CONTACT LINE
   Roadmap item 1 (docs/DEPTH-ROADMAP.md).

   THE PROBLEM THIS SOLVES.  Before this file, draw order in the world was
   STATIC.  `sortableChildren`, `sortChildren` and `zIndex` had zero matches
   anywhere in src/rendering/: props were added to the entity layer in table
   order and stayed there, and the layer stack itself decided everything
   else.  Two consequences the owner could see:

     - A BUILDING COULD NEVER OCCLUDE ANYTHING.  `entities` sits below
       `player` in WORLD_LAYER_NAMES, so the player painted over the mayor's
       house from any position, including standing behind it.
     - A TREE ALWAYS OCCLUDED.  v2.3.1500 answered "walking behind a tree
       should be hidden by it" by moving trees to gatherNodesFront, ABOVE
       the player.  That is right when you are behind the tree and wrong
       every other moment — standing south of a trunk, its canopy painted
       over your head.

   Both are the same missing idea: depth is a function of POSITION, and
   nothing was computing it.

   THE SORT KEY IS THE GROUND-CONTACT LINE, NOT THE SPRITE POSITION.
   This is the whole trick and it is worth being explicit about, because
   sorting by sprite Y is the obvious wrong answer.  The mayor's house is
   512px of art; its top edge is half a screen north of where it actually
   stands.  Sorting by the top would put the player behind the building from
   far up the map.  What decides occlusion is where an object TOUCHES THE
   WORLD — the base of the building, the foot of the trunk, the character's
   feet.

   The game already stores exactly that and has for a long time.  Every
   world sprite is anchored (0.5, 1) — bottom-centre — and positioned at its
   ground point, and `propFootprint` returns `y1: p.y` for the same reason.
   So the contact line is `display.y`, for props, NPCs, monsters, remote
   players and the local body alike.  No new data is needed anywhere.

   WHY THERE IS STILL A FRONT/BACK SPLIT.  The local player's body lives in
   its own `player` layer, above `entities`, and a great deal of code and
   several QA scenarios depend on that (the gathering-gesture promotion of
   v2.3.1713 among them).  Rather than move the body and rewrite all of it,
   occluders pick which SIDE of the player layer to live on each frame —
   `entities` when they stand north of the player, gatherNodesFront when
   they stand south of it — and then sort by ground line WITHIN that layer.
   The visible result is the same, and the blast radius is a fraction.
   ═══════════════════════════════════════════════════════════════════════ */

/* Hysteresis, in world pixels, on the front/back decision.

   Without it an object whose ground line sits exactly on the player's flips
   layer on every sub-pixel wobble of the walk, which reads as a flicker
   rather than as depth.  The band is deliberately small: it is here to kill
   jitter at the boundary, not to delay a real crossing.  Two pixels is
   under a tenth of a tile (TILE = 32). */
const HYST = 2;

/**
 * Should an occluder standing at `groundY` draw IN FRONT of the player?
 *
 * @param {number} groundY      the occluder's ground-contact line, world px
 * @param {number} playerGroundY the player's ground-contact line, world px
 * @param {boolean} isFrontNow  whether it is currently in the front layer,
 *                              which supplies the hysteresis band
 * @returns {boolean}
 */
export function wantsFront(groundY, playerGroundY, isFrontNow) {
  if (!Number.isFinite(groundY) || !Number.isFinite(playerGroundY)) {
    /* Unknown position must not silently mean "behind": before the first
       player_state arrives, `behind` would pop every building in the zone
       to the back for a frame.  Keep whatever it already had. */
    return !!isFrontNow;
  }
  /* Larger y is further down the screen, which in a 3/4 view is nearer the
     camera.  An occluder NEARER than the player draws over them. */
  return isFrontNow
    ? groundY > playerGroundY - HYST   // already front: needs to clear the band to go back
    : groundY > playerGroundY + HYST;  // already back: needs to clear it to come front
}

/**
 * Give every child of a sortable layer a depth key taken from its ground
 * contact line, so Pixi's own sort orders them back-to-front.
 *
 * STABILITY.  Two objects standing on the same row must not swap places
 * every frame — a swap with no movement behind it is exactly the kind of
 * shimmer that reads as a rendering bug.  This is safe for free here:
 * Array.prototype.sort has been required to be STABLE since ES2019, and
 * Pixi sorts the children array in place, so equal keys preserve the order
 * they already had and a settled scene stays settled.  Rounding the key
 * also means sub-pixel drift alone cannot reorder anything.
 *
 * @param {import('pixi.js').Container} layer
 */
export function applyGroundSort(layer) {
  if (!layer || !layer.children) return;
  const kids = layer.children;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (!c) continue;
    const y = c.y;
    c.zIndex = Number.isFinite(y) ? Math.round(y) : 0;
  }
}
