/* Equipment slots + per-slot selection store (localStorage).
 *
 * Mirrors the shirt/skin stores.  An equip is just an item id per slot (or
 * 'none').  The renderer stacks the matching gear sheet (gearSheets.js) above
 * the body.  See gear-layer-spec.md.
 */

export const GEAR_SLOTS = ['legs', 'chest', 'shoulders'];

/* Per-slot catalog.  v2.3.503: a single 'testplate' chest piece (an aligned
   steel vest baked from the body frames by tools/make_test_gear.py) to prove
   the layered renderer before real gear art exists. */
export const GEAR_CATALOG = {
  legs: [{ id: 'none', name: 'None' }],
  chest: [{ id: 'none', name: 'None' }, { id: 'testplate', name: 'Test Plate' }],
  shoulders: [{ id: 'none', name: 'None' }],
};

function makeSlotStore(slot, defId) {
  const key = 'bt-gear-' + slot;
  let active = defId;
  try { const s = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (s) active = s; } catch (e) { /* ignore */ }
  const listeners = new Set();
  return {
    get: () => active,
    set: (id) => {
      if (id === active) return;
      active = id;
      try { localStorage.setItem(key, id); } catch (e) { /* ignore */ }
      listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
    },
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/* Default the chest to the test plate so the layered render is visible
   immediately; legs/shoulders empty. */
const _stores = {
  legs: makeSlotStore('legs', 'none'),
  chest: makeSlotStore('chest', 'testplate'),
  shoulders: makeSlotStore('shoulders', 'none'),
};

export function getEquip(slot) { return _stores[slot] ? _stores[slot].get() : 'none'; }
export function setEquip(slot, id) { if (_stores[slot]) _stores[slot].set(id); }
export function onEquipChange(slot, fn) { return _stores[slot] ? _stores[slot].on(fn) : () => {}; }
