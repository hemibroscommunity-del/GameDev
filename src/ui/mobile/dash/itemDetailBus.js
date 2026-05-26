/* Item-detail popup bus.
 *
 * Open the popup from anywhere (InventoryPanel tile, InventoryPreview
 * tile, Loadout slot tap) by calling open({ kind, ... }) with one of:
 *   { kind: 'inventory', key, count }     -- a bag inventory item
 *   { kind: 'weapon',    slot, wpn }      -- an equipped weapon slot
 *                                            (slot: 'melee'|'ranged'|'staff')
 * The ItemDetailPopup component subscribes to this bus and renders
 * the type-appropriate detail card with action buttons.
 */

const state = { open: false, target: null };
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const itemDetailBus = {
  state,
  open(target) {
    state.open = true;
    state.target = target;
    emit();
  },
  close() {
    if (!state.open) return;
    state.open = false;
    state.target = null;
    emit();
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window._itemDetailBus = itemDetailBus;
