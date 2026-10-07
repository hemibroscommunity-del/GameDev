/* ═══ v2.3.3062: BROTOWN'S SIGNPOSTS SAY WHERE THEIR ROADS GO ═══
 *
 * Asked how to make the Wheel easier to find your way round, the owner said to
 * go on building the list ("Continue building recommended"), and signposts
 * naming the lands were on it.  Brotown already has one at each gate -- where
 * every street leaves town (public/tools/world/core/placing.js, TOWN
 * DRESSING) -- with its boards left blank (objects/catalog.js asks for them
 * so).  Now each says, when you are near, the two lands its road leads to:
 * the one straight on down the compass road, and the one whose trail forks
 * off that road further out (plan.js: "the North Road forks to the Frost
 * Trail, the East Road to the Dune Trail, the South Road to the Foundry Road,
 * the West Road to the Bog Trail").
 *
 * Keyed by the gate (which side of the town the signpost stands on), each a
 * list read top to bottom: the road you are on first, then its fork.  The
 * lands are the plan's region ids (src/data/wheelLands.js); their names and
 * directions come from the worker's map (wheelMapInfo().lands), so they never
 * disagree with the minimap.  test-world-core checks this table against the
 * plan's own roads ("the gate signposts").  No imports.
 */
export const WHEEL_GATE_ROADS = Object.freeze({
  north: Object.freeze(['ember', 'frost']),     /* the North Road; the Frost Trail forks off it */
  east: Object.freeze(['hollows', 'sky']),      /* the East Road; the Dune Trail */
  south: Object.freeze(['tidal', 'thunder']),   /* the South Road; the Foundry Road */
  west: Object.freeze(['verdant', 'mist']),     /* the West Road; the Bog Trail */
});

/* ═══ v2.3.3089: AND THE LEVELS THEIR LANDS HOLD ═══
 * Asked "Show levels on the signposts?" -- every land starts at level 1 at its
 * near end, so all eight plates read the same -- the owner said "Yes".  Each
 * plate ends in the levels its land's monsters span: from the first stretch
 * to the deepest the worker spawns.  The top is the worker's own: the last
 * stretch baked into server/src/wheelspawns.js (WHEEL_SPAWNS[home].deeper),
 * which mirror-audit holds this to -- so the stretch that takes a land past
 * level 20 moves both, or that suite fails.  ([lo, hi], levels.) */
export const WHEEL_LAND_LEVELS = Object.freeze([1, 40]);   /* v2.3.3093: 20 -> 40, the second stage's monsters */

/** "Lv 1–20": a plate's level tag. */
export function landLevelsText(levels = WHEEL_LAND_LEVELS) {
  return `Lv ${levels[0]}\u2013${levels[1]}`;
}

/** Which gate a signpost `dx, dy` game px from the town's middle stands at. */
export function gateOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}

/* The town's signposts are the ones this near its middle, game px (the four
   stand 1,876-2,118 out, at the gates of the 1.5x town; the commons end at
   ~2,765, and no other signpost is placed anywhere: test-world-core). */
export const SIGNPOST_TOWN_R = 2600;
/* Their plates show from this near, game px, fading over the last SHOW_FADE.
   v2.3.3146: 640 -> 300 and 160 -> 60 -- the owner: "Change the signage in
   the town to proximity based so it only pops up when you get close".  640
   is about the whole of a phone's view at the Wheel's zoom, so the plates were
   up as soon as their signpost came on screen.  300 is the street the post
   stands beside: the four stand 159-174 px off their street's middle, so a
   walk down either side of it passes them at 66-252 px, and the plates are at
   least 80% up anywhere on the street at the gate -- and none a screen away. */
export const SIGNPOST_SHOW_R = 300;
export const SIGNPOST_SHOW_FADE = 60;
