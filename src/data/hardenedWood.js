/* ═══ v2.3.3139: HARDENED WOOD -- THE GAME'S COPY ═══
 * The owner: "Maybe 5 logs of the raw material can make one 'hardened (name)
 * wood' raw material so it mirrors the same structure.  Also for the number
 * required and gold too".
 *
 * MIRROR of server/src/hardenedwood.js HARDENED_WOOD (mirror-audit pins every
 * field): the worker settles every make from its own copy; this one only
 * draws the Woodworker's Harden tab (logs, level, XP), names the bag's
 * pieces and tells the Harden rows which wood a bow takes.  `logName` is the
 * tree's own bag name (gathering.js TREE), for the rows' "5 Pine Logs each".
 *
 * No '@/' imports: mirror-audit loads this file in node.
 */
import { WOODWORKING_TIERS } from './gameSystems.js';

export const HARDENED_WOOD_RECIPES = Object.freeze({
  hardened_pine: Object.freeze({ log: 'wood_pine_log', logCost: 5, minLvl: 1, xp: 400, tier: 'pine', name: 'Hardened Pine Wood', logName: 'Pine Log', logPlural: 'Pine Logs' }),
  hardened_softwood: Object.freeze({ log: 'wood_softwood', logCost: 5, minLvl: 5, xp: 600, tier: 'softwood', name: 'Hardened Softwood', logName: 'Softwood', logPlural: 'Softwood' }),
  hardened_hardwood: Object.freeze({ log: 'wood_hardwood', logCost: 5, minLvl: 10, xp: 800, tier: 'hardwood', name: 'Hardened Hardwood', logName: 'Hardwood', logPlural: 'Hardwood' }),
  hardened_cedar: Object.freeze({ log: 'wood_cedar_wood', logCost: 5, minLvl: 15, xp: 1000, tier: 'cedar', name: 'Hardened Cedar Wood', logName: 'Cedar Wood', logPlural: 'Cedar Wood' }),
  hardened_maple: Object.freeze({ log: 'wood_maple_wood', logCost: 5, minLvl: 20, xp: 1200, tier: 'maple', name: 'Hardened Maple Wood', logName: 'Maple Wood', logPlural: 'Maple Wood' }),
});
export const HARDENED_WOOD_MAX_PER_REQUEST = 50;

/* The hardened wood each WOODWORKING_TIERS wood takes, in that table's order
   (the worker's HARDEN_WOOD_BY_TIER): pine, softwood, hardwood, cedar, maple. */
export const HARDEN_WOOD_BY_TIER = Object.freeze(Object.keys(WOODWORKING_TIERS)
  .map((t) => Object.keys(HARDENED_WOOD_RECIPES).find((k) => HARDENED_WOOD_RECIPES[k].tier === t))
  .filter(Boolean));

/* key -> display name, for the bag (InventoryPanel's DISPLAY_NAMES) */
export const HARDENED_WOOD_NAMES = Object.freeze(Object.fromEntries(
  Object.keys(HARDENED_WOOD_RECIPES).map((k) => [k, HARDENED_WOOD_RECIPES[k].name])));

/* log key -> the hardened wood it makes, for the log's item card */
export const HARDENED_WOOD_BY_LOG = Object.freeze(Object.fromEntries(
  Object.keys(HARDENED_WOOD_RECIPES).map((k) => [HARDENED_WOOD_RECIPES[k].log, k])));

export const isHardenedWoodKey = (k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(HARDENED_WOOD_RECIPES, k);

/* The bag's picture: public/icons/items/hardened-<tier>.webp, made from the
   tree's own log picture by tools/make_hardened_wood_icons.py. */
export const hardenedWoodIcon = (k, v) => (isHardenedWoodKey(k) ? '/icons/items/hardened-' + HARDENED_WOOD_RECIPES[k].tier + '.webp' + (v || '') : null);
