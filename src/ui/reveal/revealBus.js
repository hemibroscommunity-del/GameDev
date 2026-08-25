/* ═══ v2.3.1925: THE REVEAL QUEUE ═══
 *
 * wsClient receives `loot_credit.reveals` on the socket; the overlay that
 * plays them is a React component several files away and mounted somewhere
 * else entirely.  One tiny bus between them, the same shape as
 * chatBubbleBus / itemDetailBus, rather than a prop chain through BroTown.
 *
 * A QUEUE, not a slot.  Two mysteries on one pickup needs two rare-or-better
 * rolls landing on the same corpse and will essentially never happen — but
 * "essentially never" is how you get a bug that eats somebody's godly, so the
 * second reveal waits its turn instead of replacing the first.
 */
const _queue = [];
let _notify = null;

export const revealBus = {
  /* Called from the socket handler.  Accepts the server's array verbatim. */
  push(list) {
    if (!Array.isArray(list) || !list.length) return;
    for (const r of list) {
      if (r && Array.isArray(r.ladder) && r.ladder.length) _queue.push(r);
    }
    if (_notify) _notify();
  },
  /* The overlay takes one at a time and plays it to the end. */
  take() { return _queue.length ? _queue.shift() : null; },
  pending() { return _queue.length; },
  subscribe(fn) { _notify = fn; return () => { if (_notify === fn) _notify = null; }; },
};

/* QA/debug handle, same pattern as window.__broDashPanelBus.  A 1-in-11 drop
   is waitable; a 1-in-400,000 is not, so the godly ceremony can only ever be
   exercised by handing the overlay a ladder directly. */
try {
  if (typeof window !== 'undefined') window.__btReveal = revealBus;
} catch (e) { /* SSR / no window */ }
