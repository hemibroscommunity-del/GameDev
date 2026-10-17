/* ═══ v2.3.3300: WHICH WHEEL THE ROOM PLAYS, ON THE PHONE ═══
 *
 * The owner, 2026-10-17: "the game map needs to be larger. It goes from lvl 1
 * monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed" -- and,
 * offered the ways to get there, "Rebuild for 5x".  The worker plays the Wheel
 * five times longer unless its kill switch says the short one
 * (server/src/wheeltables.js), and says which in state_sync.caps.wheelsize;
 * a worker that says nothing plays the short one, as every worker before did.
 *
 * The phone tells the worker which it can draw when it joins (`ws`,
 * WHEEL_SIZES_DRAWN): a phone that says nothing -- a tab left open across the
 * deploy -- is out of step with the long Wheel, and the worker keeps it out of
 * harm until it reloads.
 *
 * Everything that measures the Wheel on the phone asks wheelLong(): the ground
 * worker's plan (wheelTrial.js), the zone's size and lands (zones.js
 * setWheelGeom), the way in (worldTrial.js), No man's land's rings
 * (noMansLand.js).  It is set before the way into the Wheel, which waits for
 * the worker's caps (wheelHome.js); a room that changes size under a phone
 * already in the Wheel (its kill switch thrown and the room started again)
 * reloads the page.  Pure: no Pixi, no React.
 */
import { setWheelGeom } from '@/data/zones.js';

/* every Wheel this bundle can draw (join's `ws`) */
export const WHEEL_SIZES_DRAWN = Object.freeze([1, 5]);

let _long = 1;
let _built = 0;                 /* the size the ground worker was started with, 0 if none */
const _listeners = [];

export function wheelLong() { return _long; }

/* the caps' word (state_sync.caps.wheelsize): a size this bundle draws, else 1 */
export function setWheelLong(size) {
  const n = WHEEL_SIZES_DRAWN.includes(Number(size)) ? Number(size) : 1;
  if (_built && n !== _built) {
    /* the room changed size under a Wheel already built: start again */
    try { window.location.reload(); } catch (e) { /* no page: a test */ }
    return _long;
  }
  if (n === _long) return _long;
  _long = n;
  setWheelGeom(n);
  for (const fn of _listeners) { try { fn(n); } catch (e) { /* a listener's own trouble */ } }
  return _long;
}

/* told whenever the size changes (worldTrial.js: the zone and the way in) */
export function onWheelLong(fn) { if (typeof fn === 'function') _listeners.push(fn); }

/* the ground worker started (or stopped: 0) with this size */
export function noteWheelBuilt(size) { _built = size | 0; }
