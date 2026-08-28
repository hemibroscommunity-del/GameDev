/* ═══ chatLogBus — "the chat log changed" ═══ */
/* v2.3.1980: created for the world-chat feed in ChatBubble.
 *
 * S.chatLog has been accumulating messages since long before this — every
 * send, every peer line, party chat, the welcome line, operator
 * announcements — and gameEvents.js says so in its own comment: "the chat
 * log currently has no renderer (pre-existing gap)".  The feed is that
 * renderer, and it lives in ChatBubble, which is mounted by GameApp and
 * therefore has no path to BroTown's `chatLog` React state.
 *
 * WHY A BUS AND NOT A POLL.  The first draft polled S.chatLog.length on an
 * interval while the feed was open.  That works, but it makes the feed's
 * liveness depend on a timer nobody would think to look at, and it cannot
 * tell "40 messages, one replaced" from "40 messages, unchanged" (the log
 * is capped at 40-50 entries, so a busy room holds the length constant
 * while the contents scroll).  Every writer already funnels through the
 * one `setChatLog` BroTown owns, so bumping a counter there is both exact
 * and a single edit.
 *
 * Deliberately NOT a copy of the log: the log lives on the game state and
 * the feed reads it there.  This carries a version number and nothing
 * else, so there is no second copy to drift. */

const listeners = new Set();

export const chatLogBus = {
  /* Increments on every write to S.chatLog.  A subscriber that renders on
     change can also use it as a cheap "is this the same log I drew?" key. */
  version: 0,
  bump() {
    this.version++;
    for (const fn of listeners) { try { fn(this.version); } catch (e) { /* one bad listener must not stop the rest */ } }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/* QA visibility (mirrors __broChatBubbleBus / __broDashPanelBus). */
if (typeof window !== 'undefined') window.__broChatLogBus = chatLogBus;
