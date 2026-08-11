/* v2.3.1649 (owner: "there's currently a space to the right of the active
   button — which will now be the space to the left after making your
   formatting changes here — you can put all of the filter chips there to
   sort the inventory items (by weapons, armor, healing, crafting, etc)
   that were removed previously due to lack of space").

   The bag's category filter is CHOSEN in the band's top row and APPLIED in
   the Bag panel's grid — two different components in two different rows of
   the sheet, with no ancestor between them that owns the state.  This is
   the smallest thing that lets them agree: the same subscribe/get/set
   shape every other band bus uses (dashboardPanelBus, itemDetailBus,
   eatBus), module-scoped so the choice survives leaving the destination
   exactly as InventoryPanel's own `_lastFilter` did through v2.3.1648.

   WHY THE CHIPS LIVE UP THERE AT ALL: they were cut at v2.3.1645 because a
   ~46px track inside a 93px panel was half the sheet.  The band's top row
   already reserves its full height for the identity strip, and that strip
   HIDES whenever a panel is open — so with the nav group moved to the
   right, the chips cost the Bag nothing at all.  They are drawn only while
   the Bag is the open destination; every other panel leaves that space
   empty, as it was. */

let _filter = 'all';
const subs = new Set();

export const bagFilterBus = {
  get() { return _filter; },
  set(id) {
    if (!id || id === _filter) return;
    _filter = id;
    subs.forEach(fn => { try { fn(_filter); } catch (_e) {} });
  },
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

/* v2.3.1652: the category roster lives HERE, not in InventoryPanel.  The
   chips moved into the Bag panel, so InventoryPanel imports BagFilterChips
   while BagFilterChips needs the roster — importing it back would have made
   a module cycle whose resolution depends on which file React renders
   first.  The bus is the one module both already depend on and neither
   owns, which makes it the roster's home too.  InventoryPanel re-exports
   the name so nothing that imported it from there has to change. */
export const CATEGORIES = [
  { id: 'all',      glyph: '\u25CE', iconSrc: '/icons/bag/bag-all.webp?v=2.3.1312',      label: 'All' },
  { id: 'weapon',   glyph: '\u2694', iconSrc: '/icons/bag/bag-weapons.webp?v=2.3.1312',  label: 'Weapon' },
  { id: 'armor',    glyph: '\uD83D\uDEE1', iconSrc: '/icons/bag/bag-armor.webp?v=2.3.1312',    label: 'Armor' },
  { id: 'potion',   glyph: '\uD83E\uDDEA', iconSrc: '/icons/bag/bag-potions.webp?v=2.3.1312',  label: 'Potion' },
  { id: 'crafting', glyph: '\u2692', iconSrc: '/icons/bag/bag-crafting.webp?v=2.3.1312', label: 'Crafting' },
];
