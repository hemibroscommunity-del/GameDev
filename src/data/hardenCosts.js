/* ═══ v2.3.3139: WHAT A HARDENING ATTEMPT COSTS ═══
 * The owner: "I think hardening should cost 1 bar per level (hardening lvl 1
 * cost 1 bar, hardening lvl 2 costs 2 bars, and a doubling gold cost per
 * level) ... I meant 1000 for lvl 2, 2000 for lvl 3, etc" -- up to H5,
 * "which is almost impossibly hard" (its 0.5% odds are unchanged).
 *
 * The game's copy of the worker's ladder (server/src/hardening.js HARDEN,
 * HARDEN_BAR_BY_TIER, hardenGoldFor/hardenBarsFor/hardenBarFor), held to it by
 * mirror-audit, so the Blacksmith's and the Woodworker's Harden rows show
 * exactly what the worker will take.  Against a worker that does not advertise
 * caps.hardenbars (an old one, or `hardenbars: false` thrown) it is the old
 * ladder -- 500 x 4^H gold, no bars -- which is what that worker charges.
 *
 * No '@/' imports: mirror-audit loads this file in node.
 */
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from './gameSystems.js';

export const HARDEN_COSTS = Object.freeze({
  COST_BASE: 500,
  COST_FACTOR: 2,       /* 500, 1,000, 2,000, 4,000, 8,000 for the attempt at H1..H5 */
  OLD_COST_FACTOR: 4,   /* the ladder before: 500 ... 128,000 */
  BARS_PER_LEVEL: 1,    /* the attempt at H(n) takes n bars */
  /* by the weapon's material tier: 1-2 copper, 3 iron, 4 and up black steel */
  BAR_BY_TIER: Object.freeze(['bar_copper', 'bar_copper', 'bar_iron', 'bar_black_steel']),
});

export const HARDEN_BAR_NAMES = Object.freeze({
  bar_copper: 'Copper Bar', bar_iron: 'Iron Bar', bar_black_steel: 'Black Steel Bar',
});

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

/** The bar a weapon of material tier `tierIdx` takes. */
export function hardenBarFor(tierIdx) {
  const i = Math.max(1, Math.floor(Number(tierIdx) || 1));
  return HARDEN_COSTS.BAR_BY_TIER[Math.min(i, HARDEN_COSTS.BAR_BY_TIER.length) - 1];
}

/** How many bars the attempt from hardness `h` takes: the level it reaches. */
export function hardenBarsFor(h) {
  return (Math.max(0, Math.floor(Number(h) || 0)) + 1) * HARDEN_COSTS.BARS_PER_LEVEL;
}

/** The gold the attempt from hardness `h` takes; `old` is the ladder before
    v2.3.3139 (a worker without caps.hardenbars) -- the worker's own
    signature (hardening.js hardenGoldFor), so the two read alike. */
export function hardenGoldFor(h, old) {
  const f = old ? HARDEN_COSTS.OLD_COST_FACTOR : HARDEN_COSTS.COST_FACTOR;
  return HARDEN_COSTS.COST_BASE * Math.pow(f, Math.max(0, Math.floor(Number(h) || 0)));
}

/** Everything one attempt on weapon `w` at hardness `h` takes:
    { gold, bar, bars, barName } -- bar null and bars 0 on the old ladder. */
export function hardenCost(w, h, withBars) {
  const gold = hardenGoldFor(h, !withBars);
  if (!withBars) return { gold, bar: null, bars: 0, barName: '' };
  const bar = hardenBarFor(hardenTierOf(w));
  return { gold, bar, bars: hardenBarsFor(h), barName: HARDEN_BAR_NAMES[bar] || bar };
}
