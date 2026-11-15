/* ═══ v2.3.5603: THE OWNER LOOKS AFTER THE FEEDBACK BOARD (card OPS PR 4) ═══
 *
 * The words the Test panel's feedback rows (src/ui/panels/FeedbackOwnerRows.jsx)
 * show, with no imports so node can test them
 * (tools/guards/feedback-owner.test.mjs).  The routes are the Feedback
 * object's, behind the owner's admin key (red team RT-3's #1878):
 *   DELETE /api/feedback/ticket?id=   takes one post down;
 *   DELETE /api/feedback/sweep        removes oversized posts and old pace
 *                                     rows, and rebuilds the board's counts.
 * Both answer a plain 404 to a worker without them, or without the key: the
 * row then says "this server can't yet" (the panel's own admin route tells
 * the two apart).
 */

export const FEEDBACK_ROUTES = Object.freeze({
  LIST: '/api/feedback/list?sort=new&limit=20',
  TICKET: '/api/feedback/ticket?id=',
  SWEEP: '/api/feedback/sweep',
});

const clip = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/** One post as the list shows it: who, about what, and the start of it. */
export function postLine(t) {
  if (!t || typeof t !== 'object') return '';
  const who = clip(t.playerName || 'Bro', 24);
  const topic = clip(t.topic || '', 32);
  return who + (topic ? ' on ' + topic : '') + ': ' + clip(t.text || '', 80);
}

/** A number's name in the sweep's reply, in a player's words: the
 *  Feedback object's sweep answers { ok, big, paces, tickets } (#1878,
 *  feedback.js sweep: the oversized posts and the old pace rows it took
 *  away, and the posts left that its counts were made from). */
const NAMES = Object.freeze({
  big: 'oversized posts removed', paces: 'old pace rows removed', tickets: 'posts left on the board',
});

/** The sweep's reply, its numbers in words ("Swept the feedback board: 3
 *  posts removed, 12 old pace rows removed."); a number it does not know by
 *  name is said by its own name, never dropped. */
export function sweepWords(reply) {
  const parts = [];
  if (reply && typeof reply === 'object') {
    for (const [k, v] of Object.entries(reply)) {
      if (k === 'ok' || typeof v !== 'number' || !Number.isFinite(v)) continue;
      parts.push(v + ' ' + (NAMES[k] || k));
    }
  }
  return 'Swept the feedback board' + (parts.length ? ': ' + parts.join(', ') : '') + '.';
}

/** What a 404 means, once the panel's own admin route has been asked. */
export function notYetWords(keyWorks, what) {
  return keyWorks
    ? 'This server can\'t ' + what + ' yet: it needs the update that adds it.'
    : 'Your admin key does not work on this server (or none is set on it).';
}
