// Lightweight pub/sub for eating consumables from the bag.  InventoryPanel
// publishes a cooked-food key (e.g. 'cooked_fish_minnow') when the tile
// is tapped; BroTown subscribes, consumes one, applies the heal effect.

const listeners = new Set();

export const eatBus = {
  pendingKey: null,
  open(itemKey) {
    this.pendingKey = itemKey;
    for (const fn of listeners) fn();
  },
  consume() {
    const k = this.pendingKey;
    this.pendingKey = null;
    return k;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
