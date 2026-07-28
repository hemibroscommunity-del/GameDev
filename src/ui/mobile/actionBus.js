/* v2.3.1562: a tiny registry so UI OUTSIDE the game component can fire
   the game's own action handlers.

   The weapon-cycle handler (_desktopCycleWeapon) lives inside BroTown as
   a useCallback — it owns the slot rotation, the set_active_slot send to
   the worker, the _userCycledSlot latch, the popup and the swap flash.
   The quick bar needs exactly that behaviour and must NOT re-implement
   it: a second swap path would drift from the first (the v2.3.1534 lesson
   about three parallel chains doing the same job).

   Same shape as the other buses in this folder — register on mount,
   returns its own unregister. */

let _cycleWeapon = null;

export const actionBus = {
  /* BroTown registers on mount; the returned fn unregisters (and only
     clears if it is still the current handler, so a remount that
     registers before the old teardown runs cannot blank it). */
  registerCycleWeapon(fn) {
    _cycleWeapon = fn;
    return () => { if (_cycleWeapon === fn) _cycleWeapon = null; };
  },
  /* Returns false when the game isn't mounted (menu screens), so a
     caller can fall back rather than silently no-op. */
  cycleWeapon() {
    if (typeof _cycleWeapon !== 'function') return false;
    try { _cycleWeapon(); } catch (_e) { return false; }
    return true;
  },
};
