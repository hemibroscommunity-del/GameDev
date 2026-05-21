// Pub/sub for weapon-slot swaps requested from the on-screen weapon bar.
// WeaponSwapBar publishes a slot ('melee' | 'ranged' | 'staff') here, and
// BroTown subscribes to mirror the change into its React rpgState (which
// drives the on-character weapon visuals + UI re-renders).

const listeners = new Set();

export const weaponSwapBus = {
  activeSlot: 'melee',
  setSlot(slot) {
    // Skip re-entrant duplicate calls — pointerdown and touchstart both
    // fire for the same tap on mobile, so guard against double dispatch.
    if (this.activeSlot === slot) return;
    this.activeSlot = slot;
    const g = window._gameState && window._gameState.current;
    if (g && g.rpg) g.rpg.activeSlot = slot;
    /* Mark the session as user-driven so the player_state handler in
       BroTown.jsx stops accepting the server's persisted activeSlot
       (defense in depth -- if set_active_slot drops somewhere on the
       pipeline, the client at least doesn't revert mid-session). */
    if (g) g._userCycledSlot = true;
    /* Mirror to the worker -- v2.3.98 bug: any subsequent player_state
       (kill / loot credit / etc.) carries the worker's persisted
       activeSlot and was reverting the client's local cycle.  Now the
       worker stores the player's choice the moment it changes. */
    if (g && g.channel) {
      try { g.channel.send({ type: 'set_active_slot', payload: { slot } }); } catch (e) {}
    }
    for (const fn of listeners) fn(slot);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
