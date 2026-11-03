/* ═══ v2.3.4071: THE BELL MOVED INTO MORE -- notifBus ═══
 *
 * The owner, adopting the review of his dashboard: "The notification bell
 * could also move to More, retaining an unread badge."  The bell was the
 * World Chat feed's shut state (WorldChatFeed.jsx, v2.3.2155: "collapse all
 * notifications (chat, special events, etc, into a little notification bell
 * on the bottom left corner above the dashboard)").  It is off the play screen
 * now: shut, the feed draws NOTHING in the world's corner; its lines and its
 * unread count are More -> Notifications (dash/NotificationsPanel.jsx), with
 * the count on the More button and on that tile.
 *
 * Two pieces of state, shared by the feed and the page, so they live here
 * rather than in either component (the dashMinBus / uiBusyBus shape):
 *   - SHUT: is the feed folded away?  The same localStorage key the feed has
 *     always used (bt_worldchat_shut), read defensively, shut by default --
 *     v2.3.2155's rule, kept.  "Show on screen" on the page opens it; a tap on
 *     the feed folds it again (v2.3.2325, unchanged).
 *   - SEEN: the newest chat line the player has been shown (a timestamp, the
 *     v2.3.2099 reasoning: the log is capped and rolls over, so a running
 *     tally drifts and a mark does not).  The open feed advances it, and so
 *     does opening the Notifications page.  Unread is the lines newer than it
 *     while the feed is shut (open, you are looking at them).
 *
 * Nothing here imports React, so a node test can read it. */
const SHUT_KEY = 'bt_worldchat_shut';
const readShut = () => {
  try { return localStorage.getItem(SHUT_KEY) !== '0'; } catch (e) { return true; }
};

const listeners = new Set();
const emit = () => { for (const fn of listeners) { try { fn(); } catch (e) { /* a listener's own trouble */ } } };

export const notifBus = {
  shut: readShut(),
  /** The newest line's ts the player has been shown (0 until something is). */
  seen: 0,
  setShut(v) {
    const next = !!v;
    if (next === notifBus.shut) return;
    notifBus.shut = next;
    try { localStorage.setItem(SHUT_KEY, next ? '1' : '0'); } catch (e) { /* private window */ }
    emit();
  },
  /** Everything up to `ts` has been seen. Never moves the mark backwards. */
  markSeen(ts) {
    const t = Number(ts) || 0;
    if (t <= notifBus.seen) return;
    notifBus.seen = t;
    emit();
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/** The lines the feed keeps (its KEEP): the page and the count read the same. */
export const NOTIF_KEEP = 40;

/** The chat log's last NOTIF_KEEP lines, oldest first. */
export function notifLines(S) {
  const log = (S && Array.isArray(S.chatLog)) ? S.chatLog : [];
  return log.slice(-NOTIF_KEEP);
}

/** How many lines the player has not seen: 0 while the feed is open. */
export function notifUnread(S) {
  if (!notifBus.shut) return 0;
  const seen = notifBus.seen;
  let n = 0;
  for (const m of notifLines(S)) if ((m && m.ts || 0) > seen) n++;
  return n;
}

/** The newest line's ts, or 0. */
export function notifNewestTs(S) {
  const lines = notifLines(S);
  return lines.length ? ((lines[lines.length - 1] && lines[lines.length - 1].ts) || 0) : 0;
}
