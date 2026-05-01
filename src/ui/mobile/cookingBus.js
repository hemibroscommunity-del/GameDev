// Lightweight pub/sub for launching the CookingMinigame.  InventoryPanel
// publishes a fish key (e.g. 'fish_minnow') when a raw fish tile is
// tapped; BroTown subscribes and opens the minigame overlay.

const listeners = new Set();

export const cookingBus = {
  pendingKey: null,
  open(fishKey) {
    this.pendingKey = fishKey;
    for (const fn of listeners) fn();
  },
  consume() {
    const k = this.pendingKey;
    this.pendingKey = null;
    return k;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
