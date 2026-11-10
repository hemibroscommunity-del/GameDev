/* ═══ v2.3.4393: THE DAILY SPIN'S RECORDS, ON THE PHONE ═══
 *
 * The owner: "I want to have the 'daily spin' biggest wins and losses
 * records."  The worker keeps them (server boards.js `spin_board`: the ten
 * biggest pots paid and the ten biggest lost to a double or nothing, one row
 * a player, each with the level and the face it was set with); this file only
 * sends the ask (`spin_board_request`) and keeps the last answer for the
 * Leaderboards page.  Asked only against a worker that says caps.boards2.
 *
 * No imports: node tests read it.  Spec: docs/specs/leaderboards.md. */

const listeners = new Set();
function emit() { for (const fn of listeners) { try { fn(); } catch (_e) { /* a screen's own */ } } }

/** The page follows the board: returns the unsubscribe. */
export function subscribeSpinBoard(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The worker keeps the spin's records (caps.boards2, read directly:
 *  caps-audit). */
export function spinBoardLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.boards2);
}

/** Ask for the board. */
export function askSpinBoard(S) {
  if (!spinBoardLive(S) || !S.channel) return false;
  try { S.channel.send({ type: 'spin_board_request', payload: {} }); } catch (_e) { return false; }
  return true;
}

/** `spin_board` from the worker (wsClient's direct switch): kept on S. */
export function onSpinBoard(S, p) {
  if (!S || !p || typeof p !== 'object') return;
  S._spinBoard = {
    wins: Array.isArray(p.wins) ? p.wins : [],
    losses: Array.isArray(p.losses) ? p.losses : [],
    off: !!p.off, unavailable: !!p.unavailable, at: Date.now(),
  };
  if (typeof window !== 'undefined') window.__btSpinBoard = S._spinBoard;
  emit();
}

/** "12,800 gold" */
export function spinGoldText(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return v.toLocaleString('en-US') + ' gold';
}

/** The line under a row's name: how the pot got there, in words short
 *  enough for a phone's row (about fourteen letters beside "12,800 gold").
 *  A win: "No doubles", "1 double", "3 doubles" won before it was taken; a
 *  loss: "On the 2nd double", the double that lost it. */
export function spinRowLine(row, won) {
  const k = Math.max(0, Math.floor(Number(row && row.k) || 0));
  if (won) return k <= 0 ? 'No doubles' : k === 1 ? '1 double' : k + ' doubles';
  const ord = k === 1 ? '1st' : k === 2 ? '2nd' : k === 3 ? '3rd' : k + 'th';
  return k <= 0 ? 'On a double' : 'On the ' + ord + ' double';
}
