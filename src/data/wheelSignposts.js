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

/** Which gate a signpost `dx, dy` game px from the town's middle stands at. */
export function gateOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}

/* The town's signposts are the ones this near its middle, game px (the four
   stand 1,876-2,118 out, at the gates of the 1.5x town; the commons end at
   ~2,765, and no other signpost is placed anywhere: test-world-core). */
export const SIGNPOST_TOWN_R = 2600;
/* Their plates show from this near, game px, fading over the last SHOW_FADE. */
export const SIGNPOST_SHOW_R = 640;
export const SIGNPOST_SHOW_FADE = 160;
