/* ═══ v2.3.3139: WHAT A HARDENING ATTEMPT COSTS ═══
 * The owner: "I think hardening should cost 1 bar per level (hardening lvl 1
 * cost 1 bar, hardening lvl 2 costs 2 bars, and a doubling gold cost per
 * level) ... I meant 1000 for lvl 2, 2000 for lvl 3, etc" -- up to H5,
 * "which is almost impossibly hard" (its 0.5% odds are unchanged).  And for a
 * bow or a staff: "Maybe 5 logs of the raw material can make one 'hardened
 * (name) wood' raw material so it mirrors the same structure.  Also for the
 * number required and gold too" -- its own wood's hardened wood
 * (data/hardenedWood.js), as a sword takes its metal's bars.
 *
 * The game's copy of the worker's ladder (server/src/hardening.js HARDEN,
 * HARDEN_BAR_BY_TIER, HARDEN_WOOD_BY_TIER, hardenMaterialFor ...), held to it
 * by mirror-audit, so the Blacksmith's and the Woodworker's Harden rows show
 * exactly what the worker will take.  Against a worker that does not advertise
 * caps.hardenmats (an old one, or `hardenmats: false` thrown) it is the old
 * ladder -- 500 x 4^H gold, nothing else -- which is what that worker charges;
 * and a bow or a staff is on that old ladder too while caps.hardenedwood is
 * off, as the worker puts it (no material asked that cannot be made).
 *
 * No '@/' imports: mirror-audit loads this file in node.
 */
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from './gameSystems.js';
import { HARDENED_WOOD_RECIPES, HARDEN_WOOD_BY_TIER } from './hardenedWood.js';

export const HARDEN_COSTS = Object.freeze({
  COST_BASE: 500,
  COST_FACTOR: 2,       /* 500, 1,000, 2,000, 4,000, 8,000 for the attempt at H1..H5 */
  OLD_COST_FACTOR: 4,   /* the ladder before: 500 ... 128,000 */
  MATS_PER_LEVEL: 1,    /* the attempt at H(n) takes n of the weapon's material */
  /* a metal weapon's bars by its material tier: 1-2 copper, 3 iron, 4 and up black steel */
  BAR_BY_TIER: Object.freeze(['bar_copper', 'bar_copper', 'bar_iron', 'bar_black_steel']),
  /* a bow's or a staff's hardened wood by its wood: pine ... maple, then maple */
  WOOD_BY_TIER: HARDEN_WOOD_BY_TIER,
});

/* A material's name, one and many ("Need 3 Iron Bars", "2 Hardened Pine Wood"). */
export const HARDEN_MATERIAL_NAMES = Object.freeze(Object.assign({
  bar_copper: ['Copper Bar', 'Copper Bars'], bar_iron: ['Iron Bar', 'Iron Bars'], bar_black_steel: ['Black Steel Bar', 'Black Steel Bars'],
}, Object.fromEntries(Object.keys(HARDENED_WOOD_RECIPES).map((k) => [k, [HARDENED_WOOD_RECIPES[k].name, HARDENED_WOOD_RECIPES[k].name]]))));

export function hardenMaterialWord(key, n) {
  const w = HARDEN_MATERIAL_NAMES[key];
  return n + ' ' + (w ? w[n === 1 ? 0 : 1] : key);
}

/** A weapon's material tier, 1-based in its own table -- the worker's
    _weaponTierIndex, which its Smithing gate reads too (tier i needs Smithing
    i x 5).  A legacy weapon with no gearBase is ranked by its tierMult. */
export function hardenTierOf(w) {
  const gb = w && typeof w.gearBase === 'string' ? w.gearBase : '';
  const ww = gb.indexOf('ww_') === 0;
  const keys = Object.keys(ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS);
  const i = keys.indexOf(ww ? gb.slice(3) : gb);
  if (i >= 0) return i + 1;
  const tm = (w && w.tierMult) || 1;
  return Math.max(1, Object.values(BLACKSMITH_TIERS).filter((t) => t.tierMult <= tm).length);
}

/** Is this weapon hardened with wood?  A `ww_` gearBase, or the bow's or the
    staff's slot (the worker's hardenIsWood). */
export function hardenIsWood(w, slot) {
  const gb = w && typeof w.gearBase === 'string' ? w.gearBase : '';
  return gb.indexOf('ww_') === 0 || slot === 'rangedWeapon' || slot === 'staffWeapon';
}

/** The material a weapon of material tier `tierIdx` takes: its metal's bars,
    or for wood its wood's hardened wood (the worker's hardenMaterialFor). */
export function hardenMaterialFor(tierIdx, wood) {
  const table = wood ? HARDEN_COSTS.WOOD_BY_TIER : HARDEN_COSTS.BAR_BY_TIER;
  const i = Math.max(1, Math.floor(Number(tierIdx) || 1));
  return table[Math.min(i, table.length) - 1];
}

/** How many the attempt from hardness `h` takes: the level it reaches. */
export function hardenAmountFor(h) {
  return (Math.max(0, Math.floor(Number(h) || 0)) + 1) * HARDEN_COSTS.MATS_PER_LEVEL;
}

/** The gold the attempt from hardness `h` takes; `old` is the ladder before
    v2.3.3139 -- the worker's own signature (hardening.js hardenGoldFor). */
export function hardenGoldFor(h, old) {
  const f = old ? HARDEN_COSTS.OLD_COST_FACTOR : HARDEN_COSTS.COST_FACTOR;
  return HARDEN_COSTS.COST_BASE * Math.pow(f, Math.max(0, Math.floor(Number(h) || 0)));
}

/** Everything one attempt on weapon `w` (in `slot`) at hardness `h` takes,
    against a worker whose state_sync caps say `mats` (caps.hardenmats) and
    `wood` (caps.hardenedwood): { gold, material, amount, name, word(n) } --
    material null and amount 0 on the old ladder.  The two flags are passed
    in, read straight off S._serverCaps by the panels, so the caps audit sees
    each gate where it is used. */
export function hardenCost(w, h, mats, wood, slot) {
  const isWood = hardenIsWood(w, slot);
  const matsOn = !!mats && !(isWood && !wood);
  const gold = hardenGoldFor(h, !matsOn);
  if (!matsOn) return { gold, material: null, amount: 0, name: '', word: () => '' };
  const material = hardenMaterialFor(hardenTierOf(w), isWood);
  return {
    gold, material, amount: hardenAmountFor(h),
    name: (HARDEN_MATERIAL_NAMES[material] || [material])[0],
    word: (n) => hardenMaterialWord(material, n),
  };
}
