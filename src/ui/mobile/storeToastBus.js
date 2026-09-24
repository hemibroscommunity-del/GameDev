/* ═══ v2.3.2476: "YOUR THING SOLD" ═══
 *
 * The store's sale notice is not a new wire message: the seller's gold leg
 * is a `_creditPlayer` with `source: 'market'`, which already reaches an
 * online seller as `inbox_delivered` and an offline one through their mail
 * at the next join (server/src/store.js).  Until now the client's only
 * rendering of that was a line in the chat log -- which, on a phone, in a
 * fight, you will simply never see.
 *
 * So this: a small chat-shaped card that shows the same sentence for a few
 * seconds and then goes away.  Module-scoped like every other band bus
 * (chatBubbleBus, eatBus, shopBus) because the thing that PUSHES is a
 * WebSocket handler (networking/gameEvents.js) and the thing that DRAWS is
 * a React component -- neither can reach the other, and threading setState
 * into the socket layer is how that file ends up importing UI.
 *
 * Deliberately narrow: only `source === 'market'` deliveries come here.
 * Every other delivery keeps the chat line it has always had -- the daily
 * reward was made silent on purpose (v2.3.2037) and a toast for it would
 * put it right back, larger. */

const listeners = new Set();
let items = [];
let seq = 0;

export const STORE_TOAST_MS = 6000;

export const storeToastBus = {
  get() { return items; },
  push(text) {
    if (!text) return;
    seq = (seq + 1) % 1000000;
    /* Newest last, at most three on screen: a batch of mail drained at
       join can carry several sales at once, and a stack taller than that
       covers the game. */
    items = items.concat([{ id: 'st-' + seq, text: String(text).slice(0, 120), at: Date.now() }]).slice(-3);
    /* v2.3.2820 QA probe (mp-polish): every toast text, so a scenario can
       tell "shown and already dismissed" from "never shown". Capped. */
    try { if (typeof window !== 'undefined') { (window.__btToastLog = window.__btToastLog || []).push(String(text)); if (window.__btToastLog.length > 30) window.__btToastLog.shift(); } } catch (e) { /* probe only */ }
    for (const fn of listeners) { try { fn(items); } catch (e) { /* a dead listener must not eat the mail */ } }
  },
  dismiss(id) {
    items = items.filter((i) => i.id !== id);
    for (const fn of listeners) { try { fn(items); } catch (e) {} }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broStoreToasts = storeToastBus;
