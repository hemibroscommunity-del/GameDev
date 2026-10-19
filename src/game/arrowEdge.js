/* ═══ v2.3.3489: WHERE AN ARROW COMES DOWN AT THE SCREEN'S EDGE ═══
 *
 * An arrow comes down before it would fly off the screen (v2.3.1095), so a
 * shot's reach is the screen as much as the bow.  Three things have to agree
 * on where that is, and until now they did not:
 *
 *   - the ARROW (projectiles.js) began its fall the frame its point was within
 *     24 px of ANY edge -- whichever way it was flying.  An arrow loosed with
 *     the bow already in that band, flying along the edge or away from it,
 *     came down at once: where the camera stops at the world's edge, a bow held
 *     against it dropped every arrow at its feet, even at a monster right in
 *     front of you (mp-hitreal's frost bow row, a snowman by the map's east
 *     edge);
 *   - the FIRE GATE (monsterCombat, projectiles.js firstSightHit) measured the
 *     edge for props only.  A monster or a player counted out to the bow's
 *     range, 675 px, while an upright phone shows about 320 px either side of
 *     you: a monster off the screen to your side, on the line, opened the gate,
 *     and every arrow came down at the edge, short of it;
 *   - the AIMING LINE (effectsRenderer) was drawn to the bow's range, off the
 *     screen, past where any arrow comes down.
 *
 * The owner, offered "end the aiming line where the arrow comes down, and let
 * an arrow flying along the edge keep going": "Go recommended".
 *
 * ONE RULE, ALONG THE FLIGHT.  An arrow comes down 24 px of flight before the
 * screen edge it is flying toward.  Head-on that is the old rule exactly (24 px
 * inside the edge); along an edge, or away from it, it flies on; at a slant it
 * flies until its own last 24 px.  `arrowEdgeRoom` is the flight left before
 * that point, from any point and heading: the arrow comes down when it is 0,
 * and the gate and the line read it from the bow's grip.
 *
 * No imports, so the rule is one copy and can be run on its own
 * (server/test/arrow-edge.test.mjs).
 */

/** How far short of the screen's edge, along its flight, an arrow comes down. */
export var ARROW_EDGE_PX = 24;

/**
 * The flight left, in world px, from (x, y) heading `ang` before an arrow
 * comes down at the screen's edge: the distance along the heading to the
 * first edge it is flying toward, less ARROW_EDGE_PX, never below 0.  An edge
 * it is not flying toward does not count, so an arrow along an edge or away
 * from it is never stopped by it.  Infinity with no camera or view size.
 *
 * `cam` is the view's top-left in world coords (S.camera), `viewW`/`viewH`
 * its size in world px (S._viewW/_viewH).
 */
export function arrowEdgeRoom(cam, viewW, viewH, x, y, ang) {
  if (!cam || !(viewW > 0) || !(viewH > 0)
    || !isFinite(cam.x) || !isFinite(cam.y) || !isFinite(x) || !isFinite(y) || !isFinite(ang)) return Infinity;
  var c = Math.cos(ang), s = Math.sin(ang), t = Infinity;
  if (c > 1e-9) t = Math.min(t, (cam.x + viewW - x) / c);
  else if (c < -1e-9) t = Math.min(t, (cam.x - x) / c);
  if (s > 1e-9) t = Math.min(t, (cam.y + viewH - y) / s);
  else if (s < -1e-9) t = Math.min(t, (cam.y - y) / s);
  if (t === Infinity) return Infinity;
  return Math.max(0, t - ARROW_EDGE_PX);
}
