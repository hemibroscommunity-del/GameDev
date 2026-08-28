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

  /* ═══ v2.3.2059: THE SELECTION LIVES HERE, NOT IN THE DRAWER ═══
   * Owner: "Tap my inventory -> sell it. Tap his inventory -> buy it."
   * That makes the BAND'S OWN BAG TILES (dash/InventoryPanel.jsx) half of
   * this window's controls -- and they are rendered by a component the
   * drawer does not own and cannot pass props to. The selection is the one
   * piece of state both halves read, so it sits in the bus with everything
   * else that crosses that boundary.
   * { key, side } where side is 'bro' (buying) or 'bag' (selling). */
  sel: null,
  /* Bumped on every selection, INCLUDING re-selecting what is already
     selected. Without it, tapping the same slot twice was a dead end: setSel
     clears the stale total (correctly -- the old number belonged to the old
     item), but the drawer's quote request is keyed on WHICH item is selected,
     so re-tapping the same one changed no key, sent no request, and left the
     button showing a permanent "…". Caught by mp-shopkeeper. */
  selSeq: 0,
  setSel(key, side) {
    this.sel = key ? { key, side } : null;
    this.quote = null;   /* the old total belongs to the old item */
    this.selSeq = (this.selSeq + 1) % 1000000;
    emit();
  },
  /* The server's line for one key, or null. The client holds NO price table
     on purpose (see the panel header), so every number on screen -- including
     the tiny per-slot quotes on your own bag -- is read out of here. */
  quoteFor(key) {
    for (const i of this.stock) if (i && i.key === key) return i;
    return null;
  },

  setOpen(v) {
    this.open = !!v;
    if (!v) { this.note = ''; this.busy = false; this.sel = null; this.quote = null; }
    emit();
  },
  /* ═══ v2.3.2059: MERGED, NOT REPLACED ═══
   * Two different lists arrive under `shop_state`. The one answering YOUR
   * shop_list also carries a quote-only line (qty 0) for every key in your
   * bag, which is what draws the little gold price in each of your slots. The
   * one BROADCAST after any sale cannot -- it goes to every player at once,
   * so it can only describe the pile itself. Replacing wholesale meant the
   * first sale wiped every quote off your bag and they never came back.
   *
   * Merging is not a fudge here, it is exactly right: an incoming list is
   * authoritative for every key it names, and the entries it does not name
   * are the ones he holds NONE of -- whose price is his opening offer and
   * does not move until he acquires some, at which point the next broadcast
   * names it and overwrites this. So nothing retained can go stale.
   */
  setStock(items) {
    const next = Array.isArray(items) ? items : [];
    const named = Object.create(null);          /* CLAUDE.md rule 4 */
    for (const i of next) if (i && typeof i.key === 'string') named[i.key] = 1;
    const kept = this.stock.filter((i) => i && i.quote && !named[i.key]);
    this.stock = next.concat(kept);
    this.busy = false;
    emit();
  },
  /* v2.3.2059: bumped on every settled answer from him, so the drawer can
     re-ask for the bag's per-slot quotes once the bag has actually changed.
     A counter rather than a boolean: two sales in a row must be two events. */
  settled: 0,
  setNote(text, ok) {
    this.note = text || '';
    this.noteOk = ok !== false;
    this.busy = false;
    if (ok !== false) this.settled = (this.settled + 1) % 1000000;
    emit();
  },
  setBusy(v) { this.busy = !!v; emit(); },
  /* v2.3.2057: the last stack quote he gave. Held here rather than in the
     panel's state because it arrives on a WebSocket handler, which has no
     route into the component tree — same reason the stock does. */
  quote: null,
  setQuote(q) { this.quote = q; emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broShopBus = shopBus;
