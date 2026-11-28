/* ═══ v2.3.6861: BRO · BAG -- THE RAIL, THE GRID, GEAR'S SLOTS, AND WHERE A COUNTER'S ACTION IS DONE (card MN step 4) ═══
 *
 * The owner's Bag (docs/design/menus3/SPEC.md "What You Carry"; the card's
 * "Decided" 4; the wireframe v4.4's rail and grid): a filter rail -- All,
 * Gear, Weapons, Armor, Consumables, Materials, Pets -- over a grid four
 * across upright, from the game's REAL bag, spare weapons and spare armour
 * (src/ui/mobile/dash/bagModel.js getBagEntries: every entry already carries
 * its Gear-tab kind, `gcat`, from itemCategory.js).  Gear is a TAB of the Bag
 * (its rail's second place): the nine slots and the active pet.  Pets are NOT
 * in All (decided 4): only their own rail.
 *
 * THE GAME'S TRUTH, NOT THE SAMPLE'S.  The wireframe's All says "11/40"; the
 * game's bag has NO cap (src/ui/mobile/dash/GearFilterMenu.jsx: "no cap on
 * the bag (only the weapon bag has one)"), so All shows the count alone and
 * Weapons the weapon bag's fill against the worker's own cap
 * (gameSystems.js WEAPON_STASH_MAX, live from caps.bagWeapons: 140 today, 8
 * on an older worker).  The owner's "spare armour (32 per kind)" is 48 in the
 * worker (gearstash.js GEAR_STASH_CAP): no number is drawn for it.  Flagged
 * to the owner in the PR.
 *
 * Quest items and Other (a ticket, the daily chest, a tool) belong to no
 * rail of the owner's six: they are in All, as every item is.
 *
 * COUNTER ACTIONS (SPEC "Counter actions"): what is done at a town counter is
 * shown on the Item page greyed, with WHERE (the card: "A counter-only action
 * is shown greyed with where to go"): selling at a shop, banking, and the
 * item's own craft.  This file says which and where; it never sends one.
 *
 * No imports: node's suite reads this (server/test/menus3-bag.test.mjs). */

export const MENUS3_RAIL = Object.freeze(['all', 'gear', 'weapons', 'armor', 'consumables', 'materials', 'pets']);

/* each rail's kinds (itemCategory.js's `gcat`); All takes every entry, Gear
   and Pets draw their own pages */
export const MENUS3_RAIL_KINDS = Object.freeze({
  weapons: Object.freeze(['sword', 'bow', 'staff']),
  armor: Object.freeze(['chest', 'legs', 'cape', 'shield', 'amulet']),
  consumables: Object.freeze(['food', 'potion']),
  materials: Object.freeze(['gem', 'ore', 'wood', 'crops', 'fish']),
});

/* Gear's nine slots, in the game's order (itemCategory.js GEAR_CELLS) */
export const MENUS3_SLOTS = Object.freeze(['sword', 'bow', 'staff', 'chest', 'legs', 'cape', 'shield', 'amulet', 'gem']);

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** A rail id, or 'all' for anything else (a stored or forged one). */
export function railId(id) {
  return MENUS3_RAIL.indexOf(id) >= 0 ? id : 'all';
}

/** The entries a rail shows, in the bag's own order (pinned first, then the
 *  newest).  'gear' and 'pets' have pages of their own: no entry. */
export function railEntries(entries, rail) {
  const list = Array.isArray(entries) ? entries : [];
  const r = railId(rail);
  if (r === 'all') return list.slice();
  if (!has(MENUS3_RAIL_KINDS, r)) return [];
  const kinds = MENUS3_RAIL_KINDS[r];
  return list.filter((e) => e && kinds.indexOf(e.gcat) >= 0);
}

/** The rail's counts: { all, weapons, weaponsMax, pets } (the words are the
 *  page's).  `weaponBag` the spare weapons held (rpg.weaponStash.length),
 *  `weaponMax` the worker's cap, `pets` the pets owned. */
export function railCounts(entries, weaponBag, weaponMax, pets) {
  const list = Array.isArray(entries) ? entries : [];
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  return Object.freeze({
    all: list.length,
    weapons: n(weaponBag),
    weaponsMax: n(weaponMax),
    pets: n(pets),
  });
}

/** The grid's columns: four upright (the wireframe), and a wide drawer (a
 *  computer's) as many whole 96 px tiles as its width holds, never fewer
 *  than four.  `w` the panel's width (px, a kept size: no measuring). */
export const MENUS3_GRID = Object.freeze({ MIN_COLS: 4, TILE: 96, GAP: 5, PAD: 8 });
export function gridCols(w) {
  const W = Math.max(0, Number(w) || 0);
  const g = MENUS3_GRID;
  const fit = Math.floor((W - 2 * g.PAD + g.GAP) / (g.TILE + g.GAP));
  return Math.max(g.MIN_COLS, fit);
}

/** A slot's candidates: the bag's entries that slot takes (a weapon's kind,
 *  a piece of armour's), in the bag's order.  The gem slot is the weapon in
 *  hand's sockets, set at a counter: its candidates are the bag's gems, each
 *  with no Equip (counterActions says where). */
export function slotCandidates(entries, slot) {
  const list = Array.isArray(entries) ? entries : [];
  if (MENUS3_SLOTS.indexOf(slot) < 0) return [];
  return list.filter((e) => e && e.gcat === slot);
}

/* Where each counter's action is done (the town's own names: src/data's
   buildings).  `kinds` the item kinds it takes; `card` an action flag the
   item card already answers (its `actions.sell`). */
export const MENUS3_COUNTERS = Object.freeze([
  Object.freeze({ id: 'sell', where: 'Diego’s Shop', card: 'sell' }),
  Object.freeze({ id: 'smelt', where: 'the Blacksmith', kinds: Object.freeze(['ore']) }),
  Object.freeze({ id: 'cook', where: 'the Cookhouse', kinds: Object.freeze(['fish']) }),
  Object.freeze({ id: 'setGem', where: 'the Gem Works', kinds: Object.freeze(['gem']) }),
  Object.freeze({ id: 'harden', where: 'the Woodworker', kinds: Object.freeze(['wood']) }),
  Object.freeze({ id: 'bank', where: 'the Bank', any: true }),
]);

/** The counter actions an entry has, each { id, where }, greyed on the Item
 *  page away from town.  `gcat` the entry's kind, `cardActions` the item
 *  card's own answer (resolveTarget's `actions`), `kind` the entry's ('item'
 *  or a spare list's). */
export function counterActions(gcat, cardActions, kind) {
  const a = cardActions || {};
  const out = [];
  for (const c of MENUS3_COUNTERS) {
    let ok = false;
    if (c.card) ok = !!a[c.card];
    else if (c.kinds) ok = kind === 'item' && c.kinds.indexOf(gcat) >= 0;
    else if (c.any) ok = kind === 'item';   /* the vault takes any bag key (server bank.js okKey); a spare piece is no bag key */
    if (ok) out.push(Object.freeze({ id: c.id, where: c.where }));
  }
  return out;
}
