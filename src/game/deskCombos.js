/* ═══ v2.3.3711: A COMPUTER'S COMBOS -- A KEY TAPPED TWICE, AND THE WHEEL ═══
 *
 * The owner, 2026-10-28: "Do your recommended keyboard layout. I still think
 * there are better layouts if you consider more creative combos (like keyboard
 * presses while a click is held down, double clicking, etc)."
 *
 * The layout (docs/specs/desktop-keys.md "v2.3.3711"): the left hand on WASD,
 * the right on the mouse.  Two of its moves need a memory of what came
 * before, and their rules live here, with no imports, so server/test/
 * desk-keys.test.mjs runs them in node exactly as the page does:
 *
 *   - a DIRECTION KEY TAPPED TWICE (W, A, S or D -- or an arrow -- twice
 *     within DBL_TAP_MS) rolls that way (desktopControls.js).  The second
 *     tap's own axis is the tapped key's, whatever else is held, and the other
 *     axis is the keys held across it: W held and D tapped twice rolls up and
 *     right, as Space would there.  Only the presses count (a held key's
 *     repeats never do), only the same key pairs, and a roll forgets the pair,
 *     so a third quick tap is the start of the next pair, not a second roll.
 *   - the MOUSE WHEEL steps through your weapons (BroTown's canvas): down the
 *     next, up the one before.  A wheel is a stream of small deltas -- a
 *     mouse's notch about 100 px, a trackpad's flick dozens of 2-10 px ones,
 *     each going on after the finger lifts -- so the deltas ADD UP to a step
 *     (WHEEL_STEP_PX) and a step is followed by WHEEL_GAP_MS in which the
 *     rest of that flick is let go: one notch or one small flick, one weapon.
 */

/** Two presses of one direction key at most this far apart roll that way. */
export const DBL_TAP_MS = 250;

/* a key's name (KeyboardEvent.key, any case) -> its direction.  The game
   walks by e.key (BroTown's K['w']), so the taps are read the same way. */
const DIR_OF = Object.freeze({
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0], arrowright: [1, 0],
});
function norm(key) { return typeof key === 'string' ? key.toLowerCase() : ''; }

/** The direction a key walks, as [dx, dy], or null for any other key. */
export function tapDir(key) {
  const k = norm(key);
  return Object.prototype.hasOwnProperty.call(DIR_OF, k) ? DIR_OF[k] : null;
}

/**
 * A key's press (never a repeat).  `mem` is the caller's memory of the last
 * direction press ({ key, at }), updated here; `held` says which ways are
 * held ({ up, down, left, right }), the tapped key's own way included.
 * Returns the roll's angle (radians, screen y down, as Space's) when this
 * press is the second tap of the same direction key within DBL_TAP_MS, else
 * null.  Any key that walks nowhere returns null and leaves the memory alone.
 */
export function dblTapRoll(mem, key, now, held) {
  if (!mem) return null;
  const d = tapDir(key);
  if (!d) return null;
  const k = norm(key);
  const t = typeof now === 'number' ? now : 0;
  const pair = mem.key === k && typeof mem.at === 'number' && t >= mem.at && t - mem.at <= DBL_TAP_MS;
  if (!pair) { mem.key = k; mem.at = t; return null; }
  mem.key = null; mem.at = 0;
  const h = held || {};
  let dx = d[0], dy = d[1];
  /* the other axis, from the keys held across the tap (both ways held: none) */
  if (dx !== 0) dy = (h.down ? 1 : 0) - (h.up ? 1 : 0);
  else dx = (h.right ? 1 : 0) - (h.left ? 1 : 0);
  return Math.atan2(dy, dx);
}

/** A wheel's deltas that make one weapon step (a mouse's notch is ~100). */
export const WHEEL_STEP_PX = 50;
/** After a step, the rest of that notch or flick is let go this long. */
export const WHEEL_GAP_MS = 220;
/** A pause this long and the next delta starts a fresh count. */
export const WHEEL_IDLE_MS = 400;

/**
 * One wheel event.  `mem` is the caller's memory ({ acc, last, quietUntil }),
 * updated here; `deltaMode` is WheelEvent.deltaMode (0 pixels, 1 lines, 2
 * pages).  Returns +1 (the next weapon: the wheel turned down, toward you), -1
 * (the one before) or 0 (not yet, or let go).
 */
export function wheelStep(mem, deltaY, deltaMode, now) {
  if (!mem) return 0;
  const t = typeof now === 'number' ? now : 0;
  const px = deltaMode === 1 ? deltaY * 40 : deltaMode === 2 ? deltaY * 800 : deltaY;
  if (typeof px !== 'number' || !isFinite(px) || px === 0) return 0;
  const last = typeof mem.last === 'number' ? mem.last : -Infinity;
  mem.last = t;
  if (typeof mem.quietUntil === 'number' && t < mem.quietUntil) { mem.acc = 0; return 0; }
  let acc = typeof mem.acc === 'number' ? mem.acc : 0;
  /* a pause, or a turn the other way, starts a fresh count */
  if (t - last > WHEEL_IDLE_MS || (acc !== 0 && Math.sign(acc) !== Math.sign(px))) acc = 0;
  acc += px;
  if (Math.abs(acc) < WHEEL_STEP_PX) { mem.acc = acc; return 0; }
  mem.acc = 0;
  mem.quietUntil = t + WHEEL_GAP_MS;
  return acc > 0 ? 1 : -1;
}
