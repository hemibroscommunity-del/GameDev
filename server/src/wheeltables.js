/* ═══ v2.3.3300: WHICH WHEEL THE ROOM PLAYS ═══
 *
 * The owner, 2026-10-17: "the game map needs to be larger. It goes from lvl 1
 * monsters to lvl 20+ way too quickly. Maybe 5x larger map is needed" -- and,
 * offered the ways to get there, "Rebuild for 5x".  Every land's tiers are now
 * five zones of walking, not one (public/tools/world/plan.js PLAN5), and the
 * places baked from that plan are wheelspawns.js.  The short Wheel's, as it
 * was, are wheelspawns1.js.
 *
 * The room plays the long Wheel unless `wheel5x: false` is in the live flags
 * when it first needs to know (its first join): then the short one, for the
 * room's whole life -- its monsters are spawned once, and every phone is told
 * which in state_sync.caps.wheelsize.  A flag thrown later takes effect when
 * the room next starts (a deploy, or the room going idle).
 */
import * as LONG from './wheelspawns.js';
import * as SHORT from './wheelspawns1.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* The baked tables of the Wheel `long` times longer than one zone a tier */
export function wheelTable(long) {
  return long === SHORT.WHEEL_LONG ? SHORT : LONG;
}

/* every size a room may play, the long one first */
export const WHEEL_SIZES = Object.freeze([LONG.WHEEL_LONG, SHORT.WHEEL_LONG]);

export const wheelTableMethods = {
  /* The size this room plays, decided once (see above) */
  _wheelLongNow() {
    if (this._wheelLong) return this._wheelLong;
    const f = this._liveFlags;
    const off = !!(f && typeof f === 'object' && own(f, 'wheel5x') && !f.wheel5x);
    this._wheelLong = off ? SHORT.WHEEL_LONG : LONG.WHEEL_LONG;
    return this._wheelLong;
  },
  /* ...and its baked tables */
  _wheelT() {
    return wheelTable(this._wheelLongNow());
  },
  /* Does player `ps`'s phone draw the Wheel this room plays?  A phone says
     which sizes it can draw when it joins (`ws`, kept as ps._wheelSizes); one
     that says nothing -- every phone before v2.3.3300, a tab left open across
     the deploy -- draws the short one.  A phone out of step stands somewhere
     else on its own map than on the room's, so no monster goes after it and No
     man's land holds no rule for it (wheelzone.js _wheelSheltered, nomansland.js
     _nmlLevelOf) until it reloads -- its UpdateBanner asks it to. */
  _wheelInStep(ps) {
    if (!ps || ps._wheelSizes === undefined) return true;   /* not a phone's join (a sparring clone, a test) */
    const ws = ps._wheelSizes, long = this._wheelLongNow();
    return Array.isArray(ws) ? ws.includes(long) : long === SHORT.WHEEL_LONG;
  },
};

/* The sizes a join says its phone draws (`ws`): known ones only, or null */
export function cleanWheelSizes(ws) {
  if (!Array.isArray(ws)) return null;
  const out = [];
  for (const v of ws.slice(0, 8)) if (WHEEL_SIZES.includes(v) && !out.includes(v)) out.push(v);
  return out;
}
