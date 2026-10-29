/* ═══ v2.3.3847: A COMPUTER'S GUARD, TOGGLED ON THE RIGHT BUTTON ═══
 *
 * The owner, 2026-10-29: "Also I think right click should just hold up
 * shield until you click right click again. You should also be able to just
 * hold it up and point if there's no monsters around."
 *
 * The right press raises the guard and the next one lowers it (BroTown.jsx
 * _deskRightPress); while it is up, with nothing near to face
 * (shieldToggle.js shieldTargetAngle), it follows the mouse pointer.  These
 * two rules are that aim, with no imports, so server/test/desk-keys.test.mjs
 * runs them in node exactly as the page does.
 */

/**
 * The angle from the bro to the pointer, from where the pointer is on the
 * canvas NOW (`S._mouseScreen`, CSS px, written by onMouseMove) and where the
 * camera is NOW -- not the angle the last mouse move left (`_mouseAimAngle`),
 * which goes stale the moment you walk with the mouse still.  The renderer's
 * own transform, inverted: world = screen / scale + camera (v2.3.1756).
 * Null when there is no pointer yet, or it sits on the bro.
 */
export function deskPointerAngle(S) {
  var m = S && S._mouseScreen, P = S && S.player, C = S && S.camera;
  if (!m || !P || !C || typeof m.x !== 'number' || typeof m.y !== 'number') return null;
  var sx = S._worldScaleX || 1.0, sy = S._worldScaleY || 1.0;
  var dx = m.x / sx + C.x - P.x, dy = m.y / sy + C.y - P.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null;
  return Math.atan2(dy, dx);
}

/**
 * `?shieldaim=mouse`: the guard follows the pointer always, monsters near or
 * not (the owner's to choose; the default faces what is near, as a phone's
 * guard does).  `search` is the page's location.search.
 */
export function shieldFollowsPointerAlways(search) {
  return typeof search === 'string' && /[?&]shieldaim=mouse(?:&|$)/.test(search);
}
