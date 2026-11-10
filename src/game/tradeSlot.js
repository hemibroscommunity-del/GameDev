/* ═══ v2.3.4362: THE TRADE WINDOW NEVER OUTLIVES ITS SERVER ═══
 *
 * The state-machine sweep (2026-11-03, V8b P2-1): with a trade window open,
 * the phone dropped its connection or the worker updated.  The window stayed
 * on the phone, its ✕, Cancel and Leave Trade only sent trade2_cancel and
 * waited, and the worker, with no trade on file, answers nothing
 * (server/src/trade2.js _handleTrade2Cancel).  Until a reload the window could
 * not be closed, bag taps staged into the dead trade (tradeBagBus) and the
 * chat stayed hidden.  Only the worker's own trade2_state ever cleared it.
 *
 * Three rules, here with no imports so node can test them
 * (server/test/trade-window-slot.test.mjs):
 *   1. t2OnStateSync -- a fresh join clears what the old socket left that
 *      no worker re-sends: an invite card, a waiting drawer, a receipt and its
 *      watcher.  A window showing an OPEN trade stays up.  The ordinary phone
 *      reconnect (an app switch, a signal blip) replaces a socket the worker
 *      still holds without webSocketClose (join.js, "superseded by
 *      reconnect"), so that trade lives on and the window keeps working on the
 *      new socket, as it always did.  When the worker did see the close (the
 *      trade cancelled) or updated (the trade wiped), the window is dead, and
 *      rule 2 makes it closable within 3 s.  Clearing it here waits on the
 *      worker re-sending a live trade after state_sync (the server batch).
 *   2. t2Leave -- ✕, Cancel and Leave Trade send trade2_cancel as ever, and
 *      when no answer comes within T2_LEAVE_WAIT_MS, or the socket is down,
 *      the window closes on the phone ("The trade was cancelled").  Any
 *      trade2_state or trade2_invite that arrives first stops the wait
 *      (t2LeaveDrop): the worker's answer is the truth.
 *   3. t2IgnoreBusy -- a 'busy' refusal (a second "Open trade" tap, or Trade
 *      on another card mid-trade) never clears a window showing your own live
 *      trade: the worker refused the NEW ask, the live trade goes on.
 *
 * S._t2Live is the id of the open trade the window shows (set and cleared by
 * gameEvents.js's trade2 cases); S._t2Leave the pending leave's timer;
 * S._t2QuietUntil hushes the worker's late 'declined' to a leave already
 * closed here, so one leave is told once. */

export const T2_LEAVE_WAIT_MS = 3000;
export const T2_QUIET_MS = 15000;

/* is the socket up?  Every other status (disconnected, frozen, linger...)
   means a send goes nowhere (wsClient.js). */
export function t2LinkUp(S) {
  return !!S && S._realtimeStatus === 'connected';
}

/* stop a pending leave: the worker answered, or a new join came */
export function t2LeaveDrop(S, clearTimer) {
  if (!S || !S._t2Leave) return;
  try { (clearTimer || clearTimeout)(S._t2Leave); } catch (e) { /* gone already */ }
  S._t2Leave = null;
}

/* leave the trade: send, and close here when no answer comes.  `end` closes
   the window with its words (gameEvents' own cancel, reason 'gone'). */
export function t2Leave(S, send, end, opts) {
  if (!S) return;
  const o = opts || {};
  const setTimer = o.setTimer || setTimeout;
  const now = o.now || Date.now;
  const wait = typeof o.waitMs === 'number' ? o.waitMs : T2_LEAVE_WAIT_MS;
  t2LeaveDrop(S, o.clearTimer);
  try { send('trade2_cancel'); } catch (e) { /* a dead socket: closing here below */ }
  const close = () => {
    S._t2Leave = null;
    S._t2QuietUntil = now() + T2_QUIET_MS;
    end();
  };
  if (!t2LinkUp(S)) { close(); return; }
  S._t2Leave = setTimer(close, wait);
}

/* the worker's 'declined' to a leave this phone already closed: say nothing
   twice.  One-shot. */
export function t2Hushed(S, payload, nowMs) {
  if (!S || !S._t2QuietUntil || !payload || payload.reason !== 'declined') return false;
  const hush = (nowMs === undefined ? Date.now() : nowMs) < S._t2QuietUntil;
  S._t2QuietUntil = 0;
  return hush;
}

/* a 'busy' refusal while the window shows your own live trade: keep it */
export function t2IgnoreBusy(S, payload) {
  return !!(S && S._t2Live && payload && payload.state === 'cancelled' && payload.reason === 'busy');
}

/* a fresh join (state_sync): what the old socket left is cleared, except a
   window showing an open trade (rule 1 above), and a leave already asked for,
   which still closes the window if nothing answers */
export function t2OnStateSync(S, setTrade2, clearIv) {
  if (!S || S._t2Live) return;
  if (S._t2DoneWatch) {
    try { (clearIv || clearInterval)(S._t2DoneWatch); } catch (e) { /* gone already */ }
    S._t2DoneWatch = null;
  }
  S._t2QuietUntil = 0;
  if (setTrade2) setTrade2(null);
}
