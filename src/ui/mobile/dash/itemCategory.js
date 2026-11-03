/* ═══ v2.3.4061: WHAT KIND OF THING EVERY ITEM IS, FOR THE GEAR TAB'S FILTER ═══
 *
 * The owner, of the bag's filter (design threads, 2026-11-02): "a tiny
 * accordion style pill button instead that just says 'filter' on it ... and
 * expands downward into a bigger menu that includes things like sword, chest
 * armor, leg armor, ore / metal bars, crops, fish, etc."
 *
 * The five chips it replaces sorted by `classify` (InventoryPanel.jsx), which
 * guesses from English words in the key and drops everything it does not
 * recognise into "Crafting".  The menu's rows are finer than that -- a fish
 * is not an ore -- so this is ONE function that names every item the game
 * makes, by its key, and a node test (server/test/gear-tab.test.mjs) walks
 * every item id the tables in src/data name and fails if one falls through.
 * `classify` stays as it is: the auction house files listings under its
 * five ids ('potion' among them), and the Bag destination still draws them.
 *
 * Pure: relative imports of src/data only, so the server's suite can read it
 * (bagModel.js imports it and stamps each entry's `gcat`).  Never throws.
 */
import { farmCropOfSeed, farmCropOfItem, FARM } from '../../../data/farmCrops.js';
import { dishFor } from '../../../data/dishes.js';
import { parseGemKey } from '../../../data/gems.js';
import { isHardenedWoodKey } from '../../../data/hardenedWood.js';
import { parseEssenceKey } from '../../../data/salvage.js';
import { remainsName } from '../../../data/remains.js';

/* The menu, top to bottom (the owner's list, grouped): each row its id, the
   word the pill reads ("Swords ×") and the words an empty bag says ("No
   swords in your bag").  `group` heads a set of rows; a row without one is a
   group of its own. */
export const GEAR_FILTER_GROUPS = Object.freeze([
  { id: 'weapons', label: 'Weapons', rows: ['sword', 'bow', 'staff'] },
  /* v2.3.4061: the armour in the grid's order (the owner's mockup) */
  { id: 'armour', label: 'Armour', rows: ['chest', 'legs', 'cape', 'shield', 'amulet'] },
  { id: 'gem', label: 'Gems & shards', rows: ['gem'] },
  { id: 'ore', label: 'Ore & bars', rows: ['ore'] },
  { id: 'wood', label: 'Wood', rows: ['wood'] },
  { id: 'crops', label: 'Crops & seeds', rows: ['crops'] },
  { id: 'fish', label: 'Fish', rows: ['fish'] },
  { id: 'food', label: 'Food & drinks', rows: ['food'] },
  { id: 'potion', label: 'Potions', rows: ['potion'] },
  { id: 'quest', label: 'Quest items', rows: ['quest'] },
  { id: 'other', label: 'Other', rows: ['other'] },
]);

export const GEAR_FILTERS = Object.freeze({
  sword:  { pill: 'Swords',      none: 'swords' },
  bow:    { pill: 'Bows',        none: 'bows' },
  staff:  { pill: 'Staffs',      none: 'staffs' },
  shield: { pill: 'Shields',     none: 'shields' },
  chest:  { pill: 'Chest',       none: 'chest armour' },
  legs:   { pill: 'Legs',        none: 'leg armour' },
  cape:   { pill: 'Capes',       none: 'capes' },
  amulet: { pill: 'Amulets',     none: 'amulets' },
  gem:    { pill: 'Gems',        none: 'gems or shards' },
  ore:    { pill: 'Ore & bars',  none: 'ore or bars' },
  wood:   { pill: 'Wood',        none: 'wood' },
  crops:  { pill: 'Crops',       none: 'crops or seeds' },
  fish:   { pill: 'Fish',        none: 'fish' },
  food:   { pill: 'Food',        none: 'food or drinks' },
  potion: { pill: 'Potions',     none: 'potions' },
  quest:  { pill: 'Quest items', none: 'quest items' },
  other:  { pill: 'Other',       none: 'other items' },
});

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* The shop's and the Cookhouse's bottles, by their lowered keys (the keys are
   camelCase: 'manaShard').  The same set InventoryPanel's POTION_THUMBS gives
   a bottle picture -- the test holds the two together -- plus the antidote the
   old shop table still names. */
const BOTTLES = Object.freeze({ whetstone: 1, swiftdraught: 1, manashard: 1, staminasalts: 1, zoomjuice: 1, antidote: 1 });
const TOOLS = Object.freeze({ fishing_pole: 1, woodcutting_axe: 1, mining_pickaxe: 1, trap_box: 1, basic_trap: 1, trap_basic: 1, basictrap: 1 });

/** An inventory key's filter id, or null when no rule knows it (the bag
 *  shows such an item under Other; the test fails on any item id the game's
 *  tables name). */
export function itemCategory(key) {
  if (typeof key !== 'string' || !key) return null;
  const k = key.toLowerCase();
  if (k.indexOf('cape_') === 0) return 'cape';
  if (k.indexOf('goldticket_') === 0 || k === 'daily_chest') return 'other';
  if (dishFor(key)) return 'food';
  if (k.indexOf('cooked_fish_') === 0 || k === 'cookedminnow') return 'food';
  if (hasOwn(BOTTLES, k)) return 'potion';
  if (hasOwn(TOOLS, k)) return 'other';
  if (k.indexOf('burnt_') === 0) return 'other';
  if (k.indexOf('fish_') === 0) return 'fish';
  if (isHardenedWoodKey(key) || k.indexOf('wood_') === 0) return 'wood';
  if (k.indexOf('ore_') === 0 || k.indexOf('bar_') === 0 || k === 'nugget' || k === 'gold_nugget') return 'ore';
  if (parseEssenceKey(key)) return 'ore';
  if (parseGemKey(key) || k === 'rare_gem' || k.indexOf('shard_') === 0) return 'gem';
  if (farmCropOfSeed(key) || farmCropOfItem(key) || key === FARM.COMPOST) return 'crops';
  /* a slain monster's remains: what the Mayor's errands ask for */
  if (remainsName(key)) return 'quest';
  /* old keys that read as gear (the five chips' own word rules) */
  if (/greatsword|sword/.test(k)) return 'sword';
  if (/bow/.test(k)) return 'bow';
  if (/staff|wand/.test(k)) return 'staff';
  if (/shield/.test(k)) return 'shield';
  if (/amulet/.test(k)) return 'amulet';
  if (/potion|elixir|tonic|salve|tincture|draught/.test(k)) return 'potion';
  return null;
}

/** A bag entry's filter id (bagModel's entries: an item, or a stash piece). */
export function entryCategory(e) {
  if (!e) return 'other';
  const o = e.obj || {};
  switch (e.kind) {
    case 'stashWeapon': return o.type === 'bow' ? 'bow' : o.type === 'staff' ? 'staff' : 'sword';
    case 'stashShield': return 'shield';
    case 'stashArmor': return 'chest';
    case 'stashLegs': return 'legs';
    case 'stashGear': return o.slot === 'legs' ? 'legs' : 'chest';
    default: return itemCategory(e.key) || 'other';
  }
}

/* The equipment grid, the owner's: "3 columns ... Sword, bow, and staff across
   the top ... no helmet ... 3 columns by 3 rows ... add gem slot".  Each cell's
   id, its word, the filter a tap sets, and (for a weapon) the rpg field and
   the activeSlot it is.
   v2.3.4061: the rows in the owner's mockup (2026-11-03): Sword Bow Staff /
   Chest Legs Cape / Shield Amulet Gem -- the body's three, then the hand's. */
export const GEAR_CELLS = Object.freeze([
  { id: 'sword',  label: 'Sword',  filter: 'sword',  field: 'weapon',       active: 'melee',  skill: 'power' },
  { id: 'bow',    label: 'Bow',    filter: 'bow',    field: 'rangedWeapon', active: 'ranged', skill: 'agility' },
  { id: 'staff',  label: 'Staff',  filter: 'staff',  field: 'staffWeapon',  active: 'staff',  skill: 'mind' },
  { id: 'chest',  label: 'Chest',  filter: 'chest' },
  { id: 'legs',   label: 'Legs',   filter: 'legs' },
  { id: 'cape',   label: 'Cape',   filter: 'cape' },
  { id: 'shield', label: 'Shield', filter: 'shield' },
  { id: 'amulet', label: 'Amulet', filter: 'amulet' },
  { id: 'gem',    label: 'Gem',    filter: 'gem' },
]);

export function gearCell(id) {
  for (const c of GEAR_CELLS) if (c.id === id) return c;
  return null;
}

/** The cell a bag entry would go into, or null (a fish fits no slot). */
export function cellForEntry(e) {
  const c = entryCategory(e);
  return gearCell(c) && c !== 'gem' ? c : null;
}
