// v2.3.853: lightweight pub/sub for firemaking.  ItemDetailPopup publishes a
// log key (e.g. 'wood_pine') when "Light fire" is tapped on a wood_* item;
// BroTown subscribes, consumes one log, and lights a campfire to cook at.
// Mirrors cookingBus.

const listeners = new Set();

export const firemakingBus = {
  pendingKey: null,
  open(logKey) {
    this.pendingKey = logKey;
    for (const fn of listeners) fn();
  },
  consume() {
    const k = this.pendingKey;
    this.pendingKey = null;
    return k;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
