/* ═══ v2.3.3315: WHICH WHEEL THE ROOM PLAYS, ON THE PHONE ═══
 *
 * The owner, 2026-10-17: "the game map needs to be larger. It goes from lvl 1
 * monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed" -- and,
 * offered the ways to get there, "Rebuild for 5x".  The worker plays the Wheel
 * five times longer unless its kill switch says the short one
 * (server/src/wheeltables.js), and says which in state_sync.caps.wheelsize;
 * a worker that says nothing plays the short one, as every worker before did.
 *
 * The phone tells the worker which it can draw when it joins (`ws`,
 * wheelSizesDrawn): a phone that says nothing -- a tab left open across the
 * deploy -- is out of step with the long Wheel, and the worker keeps it out of
 * harm until it reloads.  So is a preview (`?bigtown` ...), which draws the
 * short Wheel only.
 *
 * Everything that measures the Wheel on the phone asks wheelLong(): the ground
 * worker's plan (wheelTrial.js), the zone's size and lands (zones.js
 * setWheelGeom), the way in (worldTrial.js), No man's land's rings
 * (noMansLand.js).  It is set before the Wheel is built: the way in waits for
 * the worker's caps (wheelHome.js), and the build itself for them too, 8 s
 * at most (worldTrial.js preloadWheel, wheelSizeTold).  A room that changes
 * size under a phone already in the Wheel (its kill switch thrown and the
 * room started again) reloads the page, once in two minutes at most.  Pure:
 * no Pixi, no React.
 */
import { setWheelGeom } from '../data/zones.js';   /* (relative: this module loads in Node -- test-world-core, through wheelTrial.js) */

/* every Wheel this bundle can draw */
export const WHEEL_SIZES_DRAWN = Object.freeze([1, 5]);

/* the previews (`?bigtown`, `?plaintown`, `?placing=2`) are the short Wheel's
   whatever the room plays: their objects come from the whole map, which the
   long one is far too big for on a phone.  MIRROR of public/tools/world/
   plan.js wheelPreview (test-world-core). */
export function wheelPreviewAddress(search) {
  const s = search || '';
  return /(?:^|[?&])bigtown(?:=[0-9.]*)?(?:&|$)/.test(s) || /(?:^|[?&])plaintown(?:&|$)/.test(s) || /(?:^|[?&])placing=2(?:&|$)/.test(s);
}

/* the Wheels THIS page can draw (join's `ws`): the short one alone in a
   preview, so the worker keeps a preview's player out of harm (they stand on
   the short Wheel's ground in the long one's world) */
export function wheelSizesDrawn() {
  let search = '';
  try { search = window.location.search || ''; } catch (e) { /* no page: a test */ }
  return wheelPreviewAddress(search) ? [1] : WHEEL_SIZES_DRAWN.slice();
}

let _long = 1;
let _built = 0;                 /* the size the ground worker was started with, 0 if none */
let _told = false;              /* the worker's caps have said (or said nothing: the short one) */
const _listeners = [];
const _waiters = [];
/* a page reloaded for a size change at most once in this long (a second
   change so soon stays as built: never a loop of loading screens) */
const RELOAD_GAP_MS = 120000;
const RELOAD_KEY = 'bt-wheel-size-reload';

export function wheelLong() { return _long; }

/* resolves true once the worker's caps have said which Wheel, false after
   `ms` without (the way in then builds the short one, as before any caps) */
export function wheelSizeTold(ms = 8000) {
  if (_told) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => { const i = _waiters.indexOf(done); if (i >= 0) _waiters.splice(i, 1); resolve(false); }, ms);
    const done = () => { clearTimeout(t); resolve(true); };
    _waiters.push(done);
  });
}

/* the caps' word (state_sync.caps.wheelsize): a size this bundle draws, else 1 */
export function setWheelLong(size) {
  const n = wheelSizesDrawn().includes(Number(size)) ? Number(size) : 1;
  if (!_told) { _told = true; for (const fn of _waiters.splice(0)) fn(); }
  if (_built && n !== _built) {
    /* the room changed size under a Wheel already built (its kill switch
       thrown and the room started again, or caps later than the way in's
       wait): start again -- once, never a loop */
    let recent = false;
    try {
      const at = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0;
      recent = Date.now() - at < RELOAD_GAP_MS;
      if (!recent) window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch (e) { /* no storage: reload all the same */ }
    if (!recent) { try { window.location.reload(); } catch (e) { /* no page: a test */ } }
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
