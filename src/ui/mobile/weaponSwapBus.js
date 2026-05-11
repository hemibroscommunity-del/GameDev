// Pub/sub for weapon-slot swaps requested from the on-screen weapon bar.
// WeaponSwapBar publishes a slot ('melee' | 'ranged' | 'staff') here, and
// BroTown subscribes to mirror the change into its React rpgState (which
// drives the on-character weapon visuals + UI re-renders).

const listeners = new Set();

export const weaponSwapBus = {
  activeSlot: 'melee',
  setSlot(slot) {
    this.activeSlot = slot;
    const g = window._gameState && window._gameState.current;
    if (g && g.rpg) g.rpg.activeSlot = slot;
    for (const fn of listeners) fn(slot);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
