/* ═══ v2.3.3260: THE COOKED FOOD'S PICTURES, IN ONE PLACE ═══
 * The bag (InventoryPanel.jsx thumbFor) draws them, and since the QUICK EAT
 * button (ui/panels/QuickEatButton.jsx) shows them in the middle of a fight,
 * the loading screen warms them too (rendering/controlsPreload.js) -- which
 * could not import the bag without a loop (the bag imports the preloader for
 * the box trap's picture).  So the table lives here, with no imports, and
 * both read it: one spelling of each URL, nothing to drift.
 * v2.3.3281: one import, data/dishes.js, itself import-free: the Cookhouse's
 * dishes have the owner's pictures now (their `icon`), and the ones eaten at
 * once -- the Garden Stew -- are quick-eat food. */
import { DISHES } from './dishes.js';
export const FOOD_ICON_V = '?v=2.3.1774';   /* the bag's ITEMS_V */

export const COOKED_FISH_ICONS = Object.freeze({
  cooked_fish_clownfish: '/icons/items/cooked-clownfish.webp' + FOOD_ICON_V,
  cooked_fish_trout: '/icons/items/cooked-trout.webp' + FOOD_ICON_V,
  cooked_fish_salmon: '/icons/items/cooked-salmon.webp' + FOOD_ICON_V,   /* v2.3.3094 */
  cooked_fish_pike: '/icons/items/cooked-pike.webp' + FOOD_ICON_V,
});
/* the minnow, and any cooked fish the table does not name; the shop's old
   minnow bottle ('cookedMinnow') is the same picture */
export const COOKED_FISH_ICON_DEFAULT = '/icons/items/cooked-minnow.webp' + FOOD_ICON_V;

/* Every picture the quick-eat button can show: the cooked fish, and since
   v2.3.3281 every dish eaten at once (slot 'now', game/fightFood.js
   isInstantHeal) -- the Garden Stew was a glyph until then. */
export function quickEatIconUrls() {
  const dishes = Object.keys(DISHES).filter((k) => DISHES[k].slot === 'now' && DISHES[k].icon).map((k) => DISHES[k].icon);
  return Object.keys(COOKED_FISH_ICONS).map((k) => COOKED_FISH_ICONS[k]).concat([COOKED_FISH_ICON_DEFAULT], dishes);
}
