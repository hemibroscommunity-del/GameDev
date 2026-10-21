/* ═══ v2.3.3541: THE FREE POINTS RESET, the phone's half ═══
 *
 * The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY" -- the
 * after-review list's second item: "Today, points you spend are spent for
 * good.  After the change one button gives them back, so you can try a
 * different build."
 *
 * The Points tab's Reset button (ui/mobile/sheet/HeroExpanded.jsx), two taps,
 * asks the worker (server/src/pointsreset.js), which gives every placed point
 * back and answers `points_reset_result`; the player_state echo carries the
 * new prog3 the tab draws from, so nothing here changes your points.  This is
 * when to show the button, the ask, and the answer in words over your bro.
 *
 * NO IMPORTS: server/test/points-reset.test.mjs runs it in node.
 */

/* the three weapon skills, in the worker's order (server/src/prog3.js
   PROG3.SKILLS -- the suite holds the two together) */
export const POINTS_RESET_SKILLS = Object.freeze(['sword', 'bow', 'staff']);
/* the second tap must come within this of the first */
export const POINTS_RESET_CONFIRM_MS = 4000;
/* one ask in flight at a time */
const ASK_MS = 4000;

/** Does this worker reset points (caps.pointsreset)? */
export function pointsResetOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.pointsreset);
}

/** How many points are placed in a prog3 block (the worker's pointsPlaced):
 *  the shared stats and every weapon's offense stats. */
export function placedPoints(p3) {
  if (!p3 || typeof p3 !== 'object') return 0;
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  let t = 0;
  if (p3.alloc && typeof p3.alloc === 'object') for (const k of Object.keys(p3.alloc)) t += n(p3.alloc[k]);
  if (p3.atk && typeof p3.atk === 'object') {
    for (const cat of POINTS_RESET_SKILLS) {
      const a = p3.atk[cat];
      if (a && typeof a === 'object') for (const k of Object.keys(a)) t += n(a[k]);
    }
  }
  return t;
}

/** Whether the Points tab shows the Reset button: a worker that resets, and
 *  a point placed to give back. */
export function showPointsReset(S) {
  const R = S && S.rpg;
  return pointsResetOn(S) && !!R && placedPoints(R.prog3) > 0;
}

/** Send the ask.  False when it was not sent (no worker for it, one already
 *  asked, no socket). */
export function requestPointsReset(S, now) {
  if (!pointsResetOn(S) || !S.channel) return false;
  const t = typeof now === 'number' ? now : Date.now();
  if (S._pointsResetAskedAt && t - S._pointsResetAskedAt < ASK_MS) return false;
  S._pointsResetAskedAt = t;
  try { S.channel.send({ type: 'points_reset', payload: {} }); } catch (e) { return false; }
  return true;
}

/* the worker's refusals, in words */
const REFUSED = Object.freeze({
  fight: "Can't reset in a fight",
  soon: 'You just reset your points',
  none: 'No points to give back',
  off: "Can't reset right now",
});

/** The answer's words: [line] or [line, subline]. */
export function pointsResetLines(p) {
  if (!p || typeof p !== 'object') return [];
  if (!p.ok) return [Object.prototype.hasOwnProperty.call(REFUSED, p.err) ? REFUSED[p.err] : REFUSED.off];
  const lanes = p.poolBy && typeof p.poolBy === 'object'
    ? POINTS_RESET_SKILLS.reduce((t, c) => t + Math.max(0, Math.floor(Number(p.poolBy[c]) || 0)), 0) : 0;
  const shared = Math.max(0, Math.floor(Number(p.shared) || 0));
  const n = lanes + shared;
  return ['Points reset!', `${n} point${n === 1 ? '' : 's'} to spend`];
}

/** The worker's answer: `out.say(text, colour, k)` puts a line over your bro
 *  (k = its row), `out.sound(name)` plays a cue. */
export function onPointsResetResult(S, p, out) {
  if (!S || !p || typeof p !== 'object') return;
  S._pointsResetAskedAt = 0;
  const lines = pointsResetLines(p);
  const say = out && typeof out.say === 'function' ? out.say : null;
  if (say) lines.forEach((l, k) => say(l, p.ok ? '#f5c542' : '#e9d27a', k));
  const sound = out && typeof out.sound === 'function' ? out.sound : null;
  if (sound) sound(p.ok ? 'pointsSpent' : 'denied');
}
