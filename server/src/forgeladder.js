/* ═══ v2.3.3485: THE FORGE'S LADDER -- the owner's playtest notes ═══
 *
 * The owner, at the Blacksmith (2026-10-19):
 *   "On blacksmith don't have two tabs for sword and greatsword.  Only
 *    greatswords are in the game."
 *   "Also 'wood greatsword' is not an actual weapon in the game.  Make the
 *    beginning weapon a copper greatsword (requiring smithing lvl 1) and an
 *    iron greatsword (requiring smithing lvl 2) after that."
 *   "Copper 1, iron 5, black steel 10 for smithing lvl req" -- the later
 *    note, which wins over "iron lvl 2".
 *   "Hardening should only require the same smithing level as it takes to
 *    smithing that item tier"
 *
 * So, against caps.forgeladder:
 *   1. THE WOOD TIER IS NOT FORGED.  BLACKSMITH_TIERS.wood carries `forge:
 *      false` (data.js) and forge_weapon refuses it (gear.js).  The row stays:
 *      the starter Pine Shield and every old wooden weapon read their label
 *      and tierMult there, and every tier index after it counts it.
 *   2. THE FORGE'S SMITHING LEVELS are the table's own -- copper 1, iron 5,
 *      black steel 10, then five more a tier (data.js).  The levels before,
 *      1 + 5 x the row's place (wood 1, copper 6, iron 11 ... 96), are
 *      FORGE_LADDER.OLD_LEVELS, which the kill switch asks again.
 *   3. THE FORGE'S MELEE GATE IS THE WEAR GATE.  Forging asked the trained
 *      sword level 5 x the row's place (copper 5, iron 10, black steel 15),
 *      while WEARING the same blade asks _prog3EquipOk's (copper and iron
 *      nothing, black steel 10, titanium 15 ...): a new character with the
 *      Smithing for a copper greatsword could not forge it.  Now forging asks
 *      what wearing asks (gear.js).  The Woodworker's gate already did -- its
 *      table starts at pine, the wear ladder's first rung -- and is untouched.
 *   4. HARDENING ASKS THE LEVEL THAT MAKES THE TIER (_hardenLevelFor): a
 *      greatsword its tier's Smithing (copper 1, iron 5, black steel 10 ...),
 *      a bow or a staff its wood's Woodworking (pine 1, softwood 6, hardwood
 *      11 ... the Woodworker's own WOODWORKING_TIERS) -- the owner's rule on
 *      the skill v2.3.3481 chose for each.  It asked 5 x the weapon's tier
 *      index (the wood tier Smithing 5, copper 10, iron 15 ...).  Only the
 *      level moved: the tier index that picks the bars or hardened wood
 *      (hardening.js _weaponTierIndex, hardenMaterialFor) is unchanged.
 *
 * The one-handed SWORD: the game forges greatswords only now (SmithyPanel,
 * the owner's first note), but the worker still forges a sword for an older
 * page, and every sword already made is worn, hardened and salvaged as before.
 *
 * DEPLOY ORDER (rule 19).  caps.forgeladder tells the game to show these
 * numbers; against a worker without it (an old one, or the switch thrown) the
 * game shows the old ones (src/data/forgeLadder.js, held to this file by
 * mirror-audit), so neither side contradicts the other.
 * KILL SWITCH: `forgeladder: false` in liveflags puts all four back as they
 * were and un-advertises the cap, with no deploy.  Nothing held is touched. */

import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from './data.js';
import { hardenIsWood } from './hardening.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const FORGE_LADDER = Object.freeze({
  /* The forge's Smithing level for each blacksmith tier before v2.3.3485:
     1 + 5 x its place in the table (wood 1, copper 6, iron 11, black steel 16
     ... worldbreaker 96). */
  OLD_LEVELS: Object.freeze(Object.fromEntries(Object.keys(BLACKSMITH_TIERS).map((k, i) => [k, 1 + 5 * i]))),
});

/** The Smithing level forging blacksmith tier `tierKey` asks -- the table's
    own, or with `old` (the kill switch) the ladder before.  A key the table
    does not hold asks the impossible.  (The Woodworker's levels never moved:
    gear.js reads WOODWORKING_TIERS' minLvl itself.) */
export function forgeLevelFor(tierKey, old) {
  if (typeof tierKey !== 'string' || !own(BLACKSMITH_TIERS, tierKey)) return Infinity;
  return old ? FORGE_LADDER.OLD_LEVELS[tierKey] : BLACKSMITH_TIERS[tierKey].minLvl;
}

/** Is blacksmith tier `tierKey` forged?  Every tier was before the ladder
    (`old`); with it, not one marked `forge: false` (the wood tier). */
export function forgeOffered(tierKey, old) {
  if (typeof tierKey !== 'string' || !own(BLACKSMITH_TIERS, tierKey)) return false;
  return !!old || BLACKSMITH_TIERS[tierKey].forge !== false;
}

export const forgeLadderMethods = {
  /* The kill switch, read the smelting way (smelting.js _smeltOff). */
  _forgeLadderOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'forgeladder') && !f.forgeladder);
  },

  /* The level hardening weapon `w` (in `slot`) asks, of the skill that gates
     it (hardening.js: Woodworking for a bow or a staff, Smithing for the
     rest): the level that MAKES its tier -- its own row's minLvl, in the
     Woodworker's table for a `ww_` gearBase, the Blacksmith's for any other.
     A weapon whose gearBase names no tier (a legacy blob) is ranked by
     tierMult as _weaponTierIndex ranks it, on the table of the bench that
     makes its kind (hardenIsWood), and asks that row's level. */
  _hardenLevelFor(w, slot) {
    const gb = w && typeof w.gearBase === 'string' ? w.gearBase : '';
    const ww = gb.indexOf('ww_') === 0;
    const mine = ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
    const key = ww ? gb.slice(3) : gb;
    if (Object.keys(mine).indexOf(key) >= 0) return mine[key].minLvl;
    const table = hardenIsWood(w, slot) ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
    const keys = Object.keys(table);
    return table[keys[Math.min(Math.max(1, this._weaponTierIndex(w)), keys.length) - 1]].minLvl;
  },
};
