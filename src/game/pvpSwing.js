/* ═══ v2.3.3258: ONE SWORD CLAIM A SWING, NOT TWENTY-FOUR ═══
 * (docs/specs/pvp-fights.md, server/src/pvpbalance.js)
 *
 * The sword's hit on a player went out as a `player_attack` on EVERY frame of
 * its 400 ms sweep -- about 24 messages a swing -- and the worker's 300 ms
 * lane let two of them through, so a sword hit a player twice a swing where
 * it hits a monster once.
 *
 * Against a worker that says it lands one hit a swing (caps.pvpbalance), the
 * page now sends the swing's claim at most TRIES times, GAP_MS apart, each
 * one only while the player it is locked on is within its reach on this
 * screen; every claim names its swing (`sw`, the swing's own clock,
 * S.swingTimer), and the worker lands the first that reaches.  A swing that
 * never reaches sends nothing.  Against an older worker the page claims on
 * every frame as it always did (that worker has no `sw` to count by).
 *
 * The melee special swing says `special: true` on that worker too: it is a
 * special only inside the window the swipe the worker charged opened
 * (pvpbalance.js), and one hit a swing.  (An older worker would let a
 * `special` claim through its three-a-1200-ms lane -- v2.3.3133's note --
 * so there it is still never sent.)
 *
 * No imports, so the worker's suites can run it. */

export var PVP_SWING = Object.freeze({
  TRIES: 3,      /* at 0, 90 and 180 ms into the sweep */
  GAP_MS: 90,
  SLACK_PX: 24,  /* a player a stride past the reach on this screen may be in it on the worker's */
});

/* Does the worker land one hit a swing (and roll it itself)?  v2.3.3258: only
   with its one formula on too (caps.oneformula) -- `oneformula: false` puts the
   worker's resolver back on its old path while caps.pvpbalance still reads
   true (oneformula.js). */
export function pvpBalanceOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.pvpbalance && S._serverCaps.oneformula);
}

/* May this frame of the sweep send the swing's claim?  `sw` is the swing's
   own clock; `inReach` false keeps the try for a later frame.  Records the
   try when it says yes. */
export function pvpSwingClaimOk(S, sw, now, inReach) {
  if (!S) return false;
  if (!pvpBalanceOn(S)) return true;   /* an older worker: every frame, as before */
  if (inReach === false) return false;
  var t = typeof now === 'number' ? now : Date.now();
  var st = S._pvpSwSent;
  if (!st || st.sw !== sw) { S._pvpSwSent = { sw: sw, n: 1, at: t }; return true; }
  if (st.n >= PVP_SWING.TRIES || t - st.at < PVP_SWING.GAP_MS) return false;
  st.n += 1;
  st.at = t;
  return true;
}

/* Is the locked player within `range` of (px, py) on this screen?  null when
   the page has no position for them (the worker decides then). */
export function pvpLockInReach(ref, px, py, range) {
  if (!ref) return null;
  var x = typeof ref.renderX === 'number' ? ref.renderX : ref.x;
  var y = typeof ref.renderY === 'number' ? ref.renderY : ref.y;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  var dx = x - px, dy = y - py;
  return Math.sqrt(dx * dx + dy * dy) <= (Number(range) || 0) + PVP_SWING.SLACK_PX;
}
