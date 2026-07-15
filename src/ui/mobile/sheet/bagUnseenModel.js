/* v2.3.1312 (ChatGPT round-8 Bag): the shared unread-pickup registry.
   BagCompact used to hold this as private module state; the toolbar
   Bag badge + pickup pulse need it too, so it lives here now.
   Session-scoped (a marker, not a save file).  Keys are bagModel keyOf
   strings ('i-<inv key>' / '<stashKind>-<index>').
   Round-8 rule: the badge clears only when the item is INSPECTED
   (markSeen from the detail-card open), never merely by opening Bag. */

/* The one keyOf for bag entries — BagCompact's markers and the
   BottomDashboard pickup watcher must agree on it or markers and the
   badge drift apart. */
export const bagEntryKey = (e) => e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}`;

const UNSEEN = new Set();
let epoch = 0; /* bumps on every NEW pickup — drives the one-shot pulse */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const bagUnseen = {
  add(k) {
    if (UNSEEN.has(k)) return;
    UNSEEN.add(k);
    epoch++;
    emit();
  },
  markSeen(k) { if (UNSEEN.delete(k)) emit(); },
  has(k) { return UNSEEN.has(k); },
  count() { return UNSEEN.size; },
  epoch() { return epoch; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
