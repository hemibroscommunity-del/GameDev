/* Equipment slots + per-slot selection store (localStorage).
 *
 * Mirrors the shirt/skin stores.  An equip is just an item id per slot (or
 * 'none').  The renderer stacks the matching gear sheet (gearSheets.js) above
 * the body.  See gear-layer-spec.md.
 */

export const GEAR_SLOTS = ['head', 'legs', 'chest', 'shoulders'];

/* Per-slot catalog.  v2.3.503: a single 'testplate' chest piece (an aligned
   steel vest baked from the body frames by tools/make_test_gear.py) to prove
   the layered renderer before real gear art exists.
   v2.3.602: the helmet was split out of the chest sheet into its own `head`
   slot (tools/split_helmet.py) so helmet / chest / legs equip independently. */
export const GEAR_CATALOG = {
  /* coversHead: this head piece is a full helmet -> the renderer hides the
     hair/hat/beard traits AND masks the body's head band while it's worn. */
  head: [{ id: 'none', name: 'None' }, { id: 'steelhelm', name: 'Steel Helm', coversHead: true }],
  legs: [{ id: 'none', name: 'None' }, { id: 'steelgreaves', name: 'Steel Greaves' }],
  chest: [{ id: 'none', name: 'None' }, { id: 'testplate', name: 'Test Plate' },
          { id: 'steelplate', name: 'Steel Plate' }],
  shoulders: [{ id: 'none', name: 'None' }],
};

/* True if the equipped HEAD item is a full helmet (head traits should hide). */
export function headCoversHead(headId) {
  const it = GEAR_CATALOG.head.find(c => c.id === headId);
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

/* v2.3.546: re-enable the existing steel set (covers jog+stand all 5 dirs,
   aligned to the current bodies) so the armored character is visible again
   over the now size-normalized body.  Bulk still varies per direction (old
   per-dir scale_mul) until the uniform re-extraction; alignment is already
   good.  Key stays bt-gear-v2-* (no stale equips under it, so this default
   wins). */
const _stores = {
  head: makeSlotStore('head', 'steelhelm'),
  legs: makeSlotStore('legs', 'steelgreaves'),
  chest: makeSlotStore('chest', 'steelplate'),
  shoulders: makeSlotStore('shoulders', 'none'),
};

export function getEquip(slot) { return _stores[slot] ? _stores[slot].get() : 'none'; }
export function setEquip(slot, id) { if (_stores[slot]) _stores[slot].set(id); }
export function onEquipChange(slot, fn) { return _stores[slot] ? _stores[slot].on(fn) : () => {}; }
