/* ═══ v2.3.3501: AN AIMED SHOT IS JUDGED FROM YOUR FEET TO ITS TARGET'S ═══
 *
 * A shot is drawn from your bow's grip (or the staff) at the height it flies,
 * and asks the ground below it about props: a building, a tree, a rock stops
 * it (v2.3.2652), the low things it flies over (v2.3.3206).  Until now that
 * ground line ran PARALLEL to the drawn shot, from your boots
 * (projectiles.js `_goy`).  Aimed at a monster's chest, a parallel line ends
 * about 33 px short of the monster's feet, and off to the side by the grip's
 * own offset -- so it could meet a rock the monster was not behind:
 * mp-hitreal's frost magic row, a snowman just past the end of the rock ridge
 * on your side of it, your boots on the ridge's edge line, and every bolt
 * burst on the ridge's end.  The hit test meanwhile asked a different
 * question, a rock between the shot's ground point and the monster's FEET
 * (`_rockBetween`, v2.3.2701), and the bow's gate asked that one since
 * v2.3.3485.
 *
 * The owner, offered "aimed shots judge props along the line from your feet to
 * the target's feet": "Go recommended".
 *
 * So a shot fired AT something carries it (`shotAim`, frozen as it leaves: the
 * target's hit circle and its feet), and while its drawn point runs from where
 * it left to its nearest approach to the circle's centre, its ground point
 * runs from your boots to the target's feet; past that it runs on from the
 * feet, parallel to the flight.  One straight line on the ground, boots to
 * feet -- the question the hit test and the gate already ask.
 *
 * A shot that is NOT aimed at a target keeps the parallel line: one aimed at a
 * prop, at nothing, or steered off its target (a staff bolt follows your
 * thumb), whose drawn line no longer passes through the target's circle.
 *
 * v2.3.3515: a target behind a rock is aimed at too (the owner: "continue
 * recommended") -- the first target on the line, covered or not
 * (projectiles.js _sightLine's cover note).  Its ground runs from your boots
 * into the rock, and the shot stops there; it used to keep the parallel line,
 * which could pass beside the rock and hit what the rock covered.
 *
 * No imports (server/test/shot-ground.test.mjs runs it as it is).
 */

/** What a shot is fired at, as it leaves: its hit circle's centre (cx, cy) and
 *  radius r (the hit test's, the shot's half-thickness included), and its FEET
 *  (fx, fy).  Null when any of it is not a number. */
export function shotAim(cx, cy, r, fx, fy) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(r) || !isFinite(fx) || !isFinite(fy) || !(r > 0)) return null;
  return { cx: cx, cy: cy, r: r, fx: fx, fy: fy };
}

/**
 * The offset from a shot's DRAWN point to its GROUND point, `d` px along its
 * flight: ground = drawn - offset.
 *   (ox, oy), ang -- the drawn line: where it starts and its heading;
 *   (gx, gy)      -- the parallel offset, the drawn start minus your boots: the
 *                    line every unaimed shot keeps;
 *   aim           -- shotAim, or null.
 * Aimed, and the drawn line still passing through the target's circle ahead of
 * its start: the offset slides from (gx, gy) at the start to (the nearest
 * approach - the feet) there, and keeps that past it.  Otherwise (gx, gy).
 * Returns [dx, dy].
 */
export function shotGroundOffset(ox, oy, ang, gx, gy, aim, d) {
  if (!aim) return [gx, gy];
  var ux = Math.cos(ang), uy = Math.sin(ang);
  var vx = aim.cx - ox, vy = aim.cy - oy;
  var t = vx * ux + vy * uy;                       /* the nearest approach, along the flight */
  if (!(t > 1) || Math.abs(vx * uy - vy * ux) > aim.r) return [gx, gy];
  var ax = ox + ux * t - aim.fx, ay = oy + uy * t - aim.fy;   /* there: the drawn point over the feet */
  if (!(d < t)) return [ax, ay];
  var k = d > 0 ? d / t : 0;
  return [gx + (ax - gx) * k, gy + (ay - gy) * k];
}

/* `gf` on the wire -- five whole numbers, the circle's centre and radius and
   the feet -- and back.  A peer's numbers, so only five finite ones in range
   are taken; they decide only where a drawn copy meets a prop. */
export function shotAimWire(aim) {
  return aim ? [Math.round(aim.cx), Math.round(aim.cy), Math.max(1, Math.round(aim.r)), Math.round(aim.fx), Math.round(aim.fy)] : undefined;
}
export function shotAimFromWire(v) {
  if (!Array.isArray(v) || v.length !== 5) return null;
  for (var i = 0; i < 5; i++) { var n = Number(v[i]); if (!isFinite(n) || Math.abs(n) > 1e7) return null; }
  var r = Number(v[2]);
  if (!(r > 0 && r < 400)) return null;
  return shotAim(Number(v[0]), Number(v[1]), r, Number(v[3]), Number(v[4]));
}
