/* ═══ v2.3.3105: WHAT A COOKHOUSE DISH DOES ═══
 * The farming plan, Phase 2 (docs/FARMING-PLAN.md, "What farming pays"): the
 * Cookhouse makes things you CARRY.  Mirror of server/src/data.js DISHES
 * (mirror-audit: slot, buff, power, duration); the recipes that make them are
 * COOKING_RECIPES in gameSystems.js, which re-exports this.
 *
 * One MEAL and one BREW may run at once: eating replaces the meal, drinking
 * replaces the brew.  Damage is only ever a brew (combat.js's cheat ceiling).
 * The Herb Bread's timer is `rest`, not the old 60 s `regen` (server data.js
 * DISHES says why); the HUD's Regen chip reads either (wsClient.js).
 * `name`, `look` and `desc` are the client's own words for it -- the bag, the
 * Cookhouse, the HUD.  The three tonics are brews too, described by their
 * bottles (SHOP_ITEMS); they are not in this table.
 *
 * Dependency-free on purpose, like farmCrops.js: the bag imports it. */
export const DISHES = {
  meal_herb_bread: {
    slot: 'meal', buff: 'rest', power: 2, duration: 1800,
    name: 'Herb Bread', look: '\uD83C\uDF5E', desc: 'Heal twice as fast out of a fight, 30 min'
  },
  meal_root_stew: {
    slot: 'meal', buff: 'resist', power: 0.05, duration: 1800,
    name: 'Root Stew', look: '\uD83C\uDF72', desc: 'Take 5% less damage, 30 min'
  },
  brew_firebloom_tea: {
    slot: 'brew', buff: 'damage', power: 0.20, duration: 1800,
    name: 'Firebloom Tea', look: '\uD83C\uDF75', desc: '+20% damage, 30 min'
  }
};
/* Own-property lookup: an inventory key is the client's own, but keep the
   habit (TRAPS §6). */
export function dishFor(key) {
  return (typeof key === 'string' && Object.prototype.hasOwnProperty.call(DISHES, key)) ? DISHES[key] : null;
}

/* The bag's names for them (InventoryPanel ITEM_NAMES). */
export const DISH_NAMES = Object.keys(DISHES).reduce(function (m, k) {
  m[k] = DISHES[k].name;
  return m;
}, {});
