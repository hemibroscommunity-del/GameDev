/* ═══ THE TRADE WINDOW USES YOUR REAL BAG (v2.3.2149) ═══
 *
 * Owner: "change the player to player trade menu to be like the shopkeeper
 * trade menu where it just attaches to the player bag."
 *
 * Shopkeeper Bro's window already works that way and this is the same shape,
 * for the same reason it was built there (shopBus, v2.3.2059): the thing that
 * needs to stage an item is the BAND'S OWN BAG TILE, rendered by
 * dash/InventoryPanel -- a component the trade window does not own and cannot
 * pass props to. The one piece of state both halves read therefore lives
 * outside React, exactly as the shop's selection does.
 *
 * WHAT THIS DOES NOT DO, and it is the important half: it does not touch the
 * trade PROTOCOL. TradeWindowPanel's header is emphatic that the panel is a
 * pure renderer of server truth and that every button sends a trade2_*
 * command; staging still goes through its existing `addOne` -> `trade2_set`
 * path, unchanged, and this bus only carries a function reference and a
 * read-only copy of what is staged so the tiles can draw themselves. No new
 * wire message, no new server gate, no client-side minting.
 *
 * `stage` is installed by the panel while it is mounted and cleared on the way
 * out, so a tile tap after the window closes reaches nothing rather than a
 * stale closure over a finished trade.
 */
const listeners = new Set();
const emit = () => { for (const fn of listeners) { try { fn(); } catch (e) { /* a listener must not break the bus */ } } };

export const tradeBagBus = {
  /* True only while a LIVE trade window is up -- not for the invite stub,
     which stages nothing and whose bag taps should still open item cards. */
  open: false,
  /* { [invKey]: count } -- the panel's own staging mirror, copied for reading.
     Never written from here; the panel owns it. */
  staged: Object.create(null),   /* CLAUDE.md rule 4: keyed by inventory ids */
  /* (invKey) => void, installed by the panel. */
  add: null,

  /** The panel takes the bag while its window is live. */
  attach(addFn) {
    this.open = true;
    this.add = typeof addFn === 'function' ? addFn : null;
    emit();
  },
  /** ...and gives it back. Called from the panel's unmount cleanup. */
  detach() {
    this.open = false;
    this.add = null;
    this.staged = Object.create(null);
    emit();
  },
  /** Mirror of the panel's staged offer, for drawing the tiles. */
  setStaged(map) {
    const next = Object.create(null);
    for (const k of Object.keys(map || {})) next[k] = map[k];
    this.staged = next;
    emit();
  },
  countFor(key) { return this.staged[key] || 0; },
  /** A bag tile was tapped while a trade is live. */
  tap(key) {
    if (!this.open || !this.add) return false;
    try { this.add(key); } catch (e) { /* the panel owns the failure path */ }
    return true;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broTradeBagBus = tradeBagBus;
