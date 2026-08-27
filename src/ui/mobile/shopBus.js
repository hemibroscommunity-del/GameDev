/* ═══ v2.3.2050: SHOPKEEPER BRO'S WINDOW ═══
 *
 * The panel's state, outside React, for the same reason chatBubbleBus and
 * dashboardPanelBus are: the things that need to open this window (an NPC
 * proximity check inside the game loop) and the thing that needs to fill it
 * (a WebSocket message handler) both live outside the component tree, and
 * threading setState down to either of them is how those files end up
 * importing UI.
 *
 * THE STOCK IS THE SERVER'S, NOT OURS. `stock` is only ever written from a
 * `shop_state` event. The panel never computes a price, never edits a
 * quantity, and never optimistically updates after a sale -- it asks, and
 * redraws when the server says what happened. That is what makes the prices
 * on screen the prices you will actually be charged.
 */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const shopBus = {
  open: false,
  /* [{key, qty, buy, sell, full}] straight off the wire, newest wins. */
  stock: [],
  /* The last thing he said back, shown as a one-line receipt. */
  note: '',
  noteOk: true,
  /* True between sending an ask and hearing an answer, so the buttons can
     stop a second tap landing before the first has settled -- on a phone a
     double-tap is the normal way to press something once. */
  busy: false,

  setOpen(v) { this.open = !!v; if (!v) { this.note = ''; this.busy = false; } emit(); },
  setStock(items) { this.stock = Array.isArray(items) ? items : []; this.busy = false; emit(); },
  setNote(text, ok) { this.note = text || ''; this.noteOk = ok !== false; this.busy = false; emit(); },
  setBusy(v) { this.busy = !!v; emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broShopBus = shopBus;
