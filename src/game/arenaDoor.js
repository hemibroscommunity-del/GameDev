/* ═══ v2.3.5531: THE ARENA'S PAGE DOOR -- ONE WRITER OF THE PHONE'S ARENA (card L PR 5) ═══
 * (docs/specs/arena-page-door.md; held by server/test/arena-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's view of the tournament is one field, `S._arenaMatch`: none,
 * or your live match (the PvP kill hook and the quiet phone read it).  Its
 * notes, written beside it by the same call: `S._arenaInvolved` (you are
 * queued or in the bracket) and `S._arenaTournamentId`.  The phase (the
 * phase table's words): fighting with a match, involved without one but in
 * it, else none.  Written only by arenaTo, by a way of ARENA_PAGE_WAYS:
 *   poll    BroTown.jsx, the arena's status poll   your place and your match
 * The rule is the poll's own: a match is a record or none.  `?arenadoor=0`
 * writes what the poll asks, as the lines before the door.
 *
 * Beside the door: the stake board (S._arenaStakeBoard, gameEvents.js), the
 * match's popup mark (S._arenaNotified), and the duel the match rides
 * (S._inDuel, the duel's page door).
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const ARENA_PAGE_WAYS = Object.freeze({ poll: 'poll' });

export function arenaDoorOff() {
  return sw('arenadoor');
}

/* THE ONE WRITER.  `match`: the live match or null; `involved`: queued or in
   the bracket; `tid`: the tournament's id (written with a match only, as
   the poll did).  True when it wrote. */
export function arenaTo(S, way, involved, match, tid) {
  if (!S || typeof S !== 'object' || !Object.prototype.hasOwnProperty.call(ARENA_PAGE_WAYS, way)) return false;
  if (!arenaDoorOff() && match != null && typeof match !== 'object') return false;
  S._arenaInvolved = !!involved;
  if (match) {
    S._arenaMatch = match;
    S._arenaTournamentId = tid;
  } else {
    S._arenaMatch = null;
  }
  return true;
}

/* the arena's phase on this phone (the phase table's words) */
export function arenaPhase(S) {
  if (S && S._arenaMatch) return 'fighting';
  return S && S._arenaInvolved ? 'involved' : 'none';
}
