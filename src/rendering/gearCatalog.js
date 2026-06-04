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
  legs: [{ id: 'none', name: 'None' }, { id: 'steelgreaves', name: 'Steel Greaves' }],
  chest: [{ id: 'none', name: 'None' }, { id: 'testplate', name: 'Test Plate' },
          /* coversHead: the chest sheet includes a full helmet (drawn in the
             head region of the band), so the renderer hides hair/hat/beard
             while it's equipped -- otherwise those head traits poke through. */
          { id: 'steelplate', name: 'Steel Plate', coversHead: true }],
  shoulders: [{ id: 'none', name: 'None' }],
};

/* True if the equipped chest item bakes a helmet (head traits should hide). */
export function chestCoversHead(chestId) {
  const it = GEAR_CATALOG.chest.find(c => c.id === chestId);
  return !!(it && it.coversHead);
}

function makeSlotStore(slot, defId) {
  /* v2.3.538: key bumped to -v2 so any previously-saved steelplate/greaves
     equip is ignored and the new 'none' default wins (lets the bare,
     scale-normalized body show without stale localStorage overriding it). */
  const key = 'bt-gear-v2-' + slot;
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

/* v2.3.538: default to NO gear so the bare character shows the derived
   per-facing body-scale normalization (v2.3.537) without armor on top.
   Re-enable steelplate/steelgreaves defaults once the gear is re-extracted
   at uniform bulk over the normalized body. */
const _stores = {
  legs: makeSlotStore('legs', 'none'),
  chest: makeSlotStore('chest', 'none'),
  shoulders: makeSlotStore('shoulders', 'none'),
};

export function getEquip(slot) { return _stores[slot] ? _stores[slot].get() : 'none'; }
export function setEquip(slot, id) { if (_stores[slot]) _stores[slot].set(id); }
export function onEquipChange(slot, fn) { return _stores[slot] ? _stores[slot].on(fn) : () => {}; }
