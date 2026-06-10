/* Equipment slots + per-slot selection store (localStorage).
 *
 * Mirrors the shirt/skin stores.  An equip is just an item id per slot (or
 * 'none').  The renderer stacks the matching gear sheet (gearSheets.js) above
 * the body.  See gear-layer-spec.md.
 */

export const GEAR_SLOTS = ['legs', 'chest', 'shoulders'];

/* Per-slot catalog.  v2.3.503: a single 'testplate' chest piece (an aligned
   steel vest baked from the body frames by tools/make_test_gear.py) to prove
   the layered renderer before real gear art exists.
   v2.3.613: helmet/head slot removed -- the head/face is always shown (player
   identity) and only chest + legs plate are equippable. */
export const GEAR_CATALOG = {
  legs: [{ id: 'none', name: 'None' }, { id: 'steelgreaves', name: 'Steel Greaves' }],
  chest: [{ id: 'none', name: 'None' }, { id: 'testplate', name: 'Test Plate' },
          { id: 'steelplate', name: 'Steel Plate' }],
  shoulders: [{ id: 'none', name: 'None' }],
};

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
  legs: makeSlotStore('legs', 'steelgreaves'),
  chest: makeSlotStore('chest', 'steelplate'),
  shoulders: makeSlotStore('shoulders', 'none'),
};

/* v2.3.604: build inventory items for the real armor gear (chest/legs), one per
   catalog entry (excluding 'none').  The inventory UI shows these in the
   chest/legs equip slots; equipping one calls setEquip(slot, gearId) via the
   GameApp bridge, which the renderer reads. */
export function gearInventoryItems() {
  const out = [];
  for (const slot of ['chest', 'legs']) {
    for (const c of (GEAR_CATALOG[slot] || [])) {
      if (c.id === 'none') continue;
      out.push({
        id: 'gear_' + slot + '_' + c.id, type: 'armor', slot, gearId: c.id,
        name: c.name, tier: 1, quality: 'normal', acquiredAt: 0,
        hardness: 0, temper: 0, count: null, gems: [], gemSlots: 0,
        stats: { def: 5 }, isNew: false,
      });
    }
  }
  return out;
}

export function getEquip(slot) { return _stores[slot] ? _stores[slot].get() : 'none'; }
export function setEquip(slot, id) { if (_stores[slot]) _stores[slot].set(id); }
export function onEquipChange(slot, fn) { return _stores[slot] ? _stores[slot].on(fn) : () => {}; }

/* v2.3.687: the steel set is INDESTRUCTIBLE -- each piece exists exactly once,
   either worn (gearCatalog slot) or in the bag (rpg.gearStash).  Unequip paths
   that predate the stash (e.g. the Equipment menu's WORN ARMOUR toggle) just
   set the slot to 'none', orphaning the piece: gone from the Loadout AND the
   bag, with the unequipped state persisted.  Reconcile on load / bag render:
   an orphaned piece is restored to the stash, a worn piece is deduped out of
   it.  Returns true when R.gearStash was changed (caller persists). */
const DEFAULT_GEAR_SET = [
  { slot: 'chest', gearId: 'steelplate', name: 'Steel Plate' },
  { slot: 'legs', gearId: 'steelgreaves', name: 'Steel Greaves' },
];
export function reconcileGearStash(R) {
  if (!R) return false;
  if (!R.gearStash) R.gearStash = [];
  let changed = false;
  for (const piece of DEFAULT_GEAR_SET) {
    const wornId = getEquip(piece.slot);
    const idx = R.gearStash.findIndex(g => g && g.slot === piece.slot && g.gearId === piece.gearId);
    if (wornId === piece.gearId && idx >= 0) {
      R.gearStash.splice(idx, 1);                 // worn AND bagged -> dedupe
      changed = true;
    } else if (wornId !== piece.gearId && idx < 0) {
      R.gearStash.push({ ...piece });             // orphaned -> back to the bag
      changed = true;
    }
  }
  return changed;
}
