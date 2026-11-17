/* ═══ v2.3.5529: THE DUEL'S PAGE DOOR -- ONE WRITER OF THE PHONE'S DUEL (card L PR 5) ═══
 * (docs/specs/duel-page-door.md; held by server/test/duel-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's duel is one field, `S._inDuel`: none, or its record (the
 * opponent, the wager, an arena match's id; `settleBy` while the Accept tap
 * waits for the worker's word).  Its note, `S._activeDuel` (the partner and
 * the start, read by the lock and the hit gates), is written beside it, by
 * the same call.  Four files wrote them in eleven places; now only duelTo
 * does, by a way of DUEL_PAGE_WAYS:
 *   start    gameEvents.js arena_match_start, duel_accept  a duel and its note
 *   resume   rejoinSlots.js duelResume (duel_resume)        a duel and its note
 *   pending  duelPending.js enterPendingDuel (Accept tap)   the duel alone
 *   drop     duelPending.js dropPending                     the duel before it
 *                                                           (or none); the note
 *                                                           only if it was this
 *                                                           foe's
 *   end      gameEvents.js duel_end                        none, and its note
 *   rejoin   rejoinSlots.js rejoinClear                    none, and its note
 * `note` is the note to write: a record, null, or undefined (leave it).
 * The door's rule is the callers' own: start, resume and pending write a
 * duel with an opponent; end and rejoin write none.  Nothing a player sees
 * changes.  `?dueldoor=0` writes what a caller asks, as the lines before
 * the door.
 *
 * Not folded here: settleOwnAccept's own marks on the record (`settleBy`,
 * `prev`, deleted when the worker settles it), the lock (duelLock.js), and
 * the worker's duel (server duel.js, the duel door).
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const DUEL_PAGE_WAYS = Object.freeze({
  start: 'on', resume: 'on', pending: 'on', drop: 'back', end: 'none', rejoin: 'none',
});
const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* `?dueldoor=0` -- through the page's one reader, so a test can set it */
export function duelDoorOff() {
  return sw('dueldoor');
}

/* THE ONE WRITER.  True when it wrote. */
export function duelTo(S, duel, way, note) {
  if (!S || typeof S !== 'object' || !has(DUEL_PAGE_WAYS, way)) return false;
  const to = DUEL_PAGE_WAYS[way];
  if (!duelDoorOff()) {
    if (to === 'on' && !(duel && typeof duel === 'object' && duel.opponent != null)) return false;
    if (to === 'none' && (duel != null || note != null)) return false;
    if (to === 'back' && duel != null && typeof duel !== 'object') return false;
  }
  S._inDuel = duel == null ? null : duel;
  if (note !== undefined) S._activeDuel = note;
  return true;
}

/* the duel's phase on this phone (the phase table's words) */
export function duelPhase(S) {
  const d = S && S._inDuel;
  if (!d || typeof d !== 'object') return 'none';
  return d.settleBy ? 'pending' : 'on';
}
