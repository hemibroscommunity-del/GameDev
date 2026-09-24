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
import { groundLineAt } from './propGround.js';

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

/* ═══ v2.3.2748: EVERYTHING SORTS BY WHERE IT TOUCHES THE GROUND ═══
   Owner: "Fix layer detection for props. Right now it's really bad at
   detecting contact and when the player should appropriately show in front or
   behind the layer. Jogging against a prop seems to be some of the most
   problematic."

   The rule above was right; two of the numbers fed to it were not.

   1. A PLAYER'S POSITION IS THEIR BODY'S CENTRE, NOT THEIR FEET.  The figure
      is drawn centred on S.player.y (v2.3.822 measured it: the body reaches
      ~57 px below), so the boots are ~52 world px further down.  This pass
      was handed S.player.y as "the player's ground line", so every prop whose
      base fell between your waist and your boots was treated as SOUTH of you
      and drawn over you while you stood visibly in front of it -- the forge's
      weapon rack over your head, the bench over your chest.  Peers had the
      same fault through their own display.y.  The caller now passes the
      feet, and a figure that is not anchored at its feet says how far below
      its y they are in `_groundDy` (a peer: entityRenderer).
   2. A BUILDING'S BASE IS NOT ONE LINE.  See propGround.js: the town's art is
      isometric, its base a diamond, and beside a building the line that
      matters is the wall next to you, not its front step.  A prop sprite
      carries `_propGround`, and groundLineAt() gives its base at any x.

   Because a prop's line now depends on WHERE along it you stand, one number
   per object can no longer order everything -- a figure beside the auction
   house's left corner is in front of it while standing north of its front
   step.  So after the ordinary sort, each figure standing in front of a
   prop's actual base is RAISED just above that prop (same layer), or moved
   over it from the back layer when the prop is in front of the player.  The
   raise keeps the figures' own order among themselves: it is a fraction of a
   unit above the prop, scaled by their ground line. */

/** The ground-contact line of an ordinary child: its y, plus the drop to its
 *  feet for a figure that is not anchored at them. */
export function groundOf(c) {
  const y = c.y + (c._groundDy || 0);
  return Number.isFinite(y) ? y : NaN;
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
    const y = groundOf(c);
    const k = Number.isFinite(y) ? Math.round(y) : 0;
    /* v2.3.2796: a RIDER -- a building's moving pieces (worldLife.js), which
       stand on their host's ground line -- sorts a quarter step after the
       host: over the building and anything else on its row, but UNDER a
       figure raised over that building (+0.5, raiseOverProps) and under
       anything a row further south.  At +1 (TRAPS §104's overlay rule) the
       auction house's scales drew over a player standing at its left corner,
       raised over the wall they hang on (TRAPS §115). */
    const host = c._ridesOn;
    if (host && !host.destroyed && host.parent === c.parent) {
      const hy = groundOf(host);
      c.zIndex = (Number.isFinite(hy) ? Math.round(hy) : k) + 0.25;
      continue;
    }
    /* v2.3.2748: a figure standing in front of a building's real base is
       lifted just over it (see raiseOverProps) */
    c.zIndex = c._raiseTo != null ? c._raiseTo : k;
  }
}

/* A figure is anything sorted that is not a prop and has a ground line. */
function isFigure(c) {
  return !!c && !c._propGround && c.visible !== false;
}

/**
 * v2.3.2748: the raise.  For every figure whose body can overlap a prop's art
 * and whose feet are SOUTH of that prop's base at the figure's own x, make
 * sure it draws after the prop.  Returns nothing; sets `_raiseTo` and may
 * move a figure into the front layer.
 */
function raiseOverProps(kids, frontLayer, playerX) {
  let props = null;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c) c._raiseTo = null;
    if (c && c._propGround && c.visible !== false) (props || (props = [])).push(c);
  }
  if (!props) return;
  for (let i = 0; i < kids.length; i++) {
    const f = kids[i];
    if (!isFigure(f)) continue;
    const gy = groundOf(f);
    if (!Number.isFinite(gy)) continue;
    for (let j = 0; j < props.length; j++) {
      const p = props[j];
      const g = p._propGround;
      if (!(gy < g.base)) continue;                         /* already sorts after it on its own */
      if (Math.abs(f.x - g.x) > g.halfW + 24) continue;     /* cannot overlap its art */
      const line = groundLineAt(g, f.x);
      if (!(gy > line)) continue;                            /* behind this prop's base here too */
      if (f.parent !== p.parent) {
        /* the prop is in front of the player and the figure behind him.  It
           can come over the prop unless it overlaps the player, whom it must
           stay under -- which a figure standing beside one wall while the
           player stands behind another is well clear of */
        if (p.parent !== frontLayer || Math.abs(f.x - playerX) < 48) continue;
        frontLayer.addChild(f);
      }
      const key = Math.round(g.base) + 0.5 - (g.base - gy) * 1e-4;
      if (f._raiseTo == null || key > f._raiseTo) f._raiseTo = key;
    }
  }
}

/**
 * Put every ground-standing object on the correct SIDE of the player, then
 * sort each side by ground-contact line.
 *
 * ═══ WHY THIS IS A CORRECT TOTAL ORDER, NOT A HACK ═══
 * The local player's body cannot simply join the sorted layer: it lives in
 * `player`, and v2.3.1713's gathering-gesture promotion and a good deal of
 * other code depend on that. So the player stays put and everything else
 * moves around it -- into `entities` (drawn under the player) when it stands
 * north of him, into the front layer (drawn over him) when it stands south.
 *
 * That is not an approximation. Both buckets are partitioned by the SAME key
 * the sort uses, with the player's own ground line as the pivot, so the
 * concatenation back-bucket + player + front-bucket is exactly the order a
 * single sort over all three would produce. Two objects in different buckets
 * are already correctly ordered by the partition; two in the same bucket are
 * ordered by the sort.
 *
 * v2.3.2635: before this, `entities` sat below `player` in the layer stack
 * and nothing could move, so the player drew over EVERY npc, monster and pet
 * from any position -- standing behind Mayor Bro painted straight through
 * him. v2.3.2633 gave props this treatment; this gives it to everything that
 * stands on the ground, in one pass, so a new kind of entity cannot be added
 * without it.
 *
 * @param {import('pixi.js').Container} backLayer   drawn UNDER the player
 * @param {import('pixi.js').Container} frontLayer  drawn OVER the player
 * @param {number} playerGroundY  the player's ground-contact line: their FEET
 *                                (v2.3.2748 -- see the note above groundOf)
 * @param {number} [playerX]      where along a prop's base to read it
 */
export function applyDepthBuckets(backLayer, frontLayer, playerGroundY, playerX) {
  if (!backLayer || !frontLayer) return;
  if (backLayer === frontLayer) { applyGroundSort(backLayer); return; }
  /* Snapshot both child lists before moving anything -- addChild mutates the
     array being walked, and a live walk silently skips every other child. */
  const moving = [];
  for (const c of backLayer.children) moving.push(c);
  for (const c of frontLayer.children) moving.push(c);
  const px = Number.isFinite(playerX) ? playerX : NaN;
  for (let i = 0; i < moving.length; i++) {
    const c = moving[i];
    if (!c || !c.parent) continue;
    const isFront = c.parent === frontLayer;
    /* a prop is in front of the player if his feet are north of ITS BASE
       WHERE HE STANDS -- the wall beside him, not its front step */
    const gy = c._propGround && px === px ? groundLineAt(c._propGround, px) : groundOf(c);
    const want = wantsFront(gy, playerGroundY, isFront) ? frontLayer : backLayer;
    if (c.parent !== want) want.addChild(c);
  }
  raiseOverProps(moving, frontLayer, px);
  applyGroundSort(backLayer);
  applyGroundSort(frontLayer);
}
