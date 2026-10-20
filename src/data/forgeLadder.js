/* ═══ v2.3.3514: THE FORGE'S LADDER -- the game's copy ═══
 * The owner's playtest notes at the Blacksmith (2026-10-19): "'wood
 * greatsword' is not an actual weapon in the game.  Make the beginning weapon
 * a copper greatsword (requiring smithing lvl 1)", "Copper 1, iron 5, black
 * steel 10 for smithing lvl req", and "Hardening should only require the same
 * smithing level as it takes to smithing that item tier".
 *
 * The worker's rules are server/src/forgeladder.js; this is what the
 * Blacksmith's Forge and Upgrade tabs (and the Woodworker's hardening line)
 * draw from, held to it by mirror-audit.  Against a worker that advertises
 * caps.forgeladder: no wood tier on the Forge tab, the table's new Smithing
 * levels (gameSystems.js BLACKSMITH_TIERS: copper 1, iron 5, black steel 10,
 * five more a tier), the forge's Melee gate the WEAR gate, and hardening the
 * level that makes the weapon's tier (hardenCosts.js hardenLevelFor).
 * Against an older worker -- or `forgeladder: false` thrown -- the old
 * numbers (OLD_LEVELS here, 5 x the tier for hardening), which is what that
 * worker asks.  The panels read the cap straight off S._serverCaps and pass
 * `old` in, so the caps audit sees each gate where it is used.
 *
 * No '@/' imports: mirror-audit loads this file in node.
 */
import { BLACKSMITH_TIERS, getEquipReqLabel, getGearStatReq } from './gameSystems.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const FORGE_LADDER = Object.freeze({
  /* The forge's Smithing level for each blacksmith tier before v2.3.3514:
     1 + 5 x its place in the table (wood 1, copper 6, iron 11, black steel 16
     ... worldbreaker 96) -- the worker's FORGE_LADDER.OLD_LEVELS. */
  OLD_LEVELS: Object.freeze(Object.fromEntries(Object.keys(BLACKSMITH_TIERS).map((k, i) => [k, 1 + 5 * i]))),
});

/** The Smithing level forging blacksmith tier `tierKey` asks: the table's own,
    or with `old` the ladder before (the worker's forgeLevelFor). */
export function forgeLevelFor(tierKey, old) {
  if (typeof tierKey !== 'string' || !own(BLACKSMITH_TIERS, tierKey)) return Infinity;
  return old ? FORGE_LADDER.OLD_LEVELS[tierKey] : BLACKSMITH_TIERS[tierKey].minLvl;
}

/** Is blacksmith tier `tierKey` forged?  Every tier on the old ladder; on the
    new, not one marked `forge: false` (the wood tier). */
export function forgeOffered(tierKey, old) {
  if (typeof tierKey !== 'string' || !own(BLACKSMITH_TIERS, tierKey)) return false;
  return !!old || BLACKSMITH_TIERS[tierKey].forge !== false;
}

/** What the forge's stat gate asks of `rpg` for a `wtype` blade of tier
    `tierKey`, as { label, value, met, prog3, stat } (getGearStatReq's shape):
    on the new ladder, for a trained (prog3) character, what WEARING the blade
    asks -- getEquipReqLabel, the badge that reads canEquipItem's own number
    (copper and iron nothing, black steel Melee 10 ...), the worker's
    _prog3EquipOk; otherwise the old tierIndex x 5 (or the legacy statReq),
    as the worker asks then. */
export function forgeStatReq(wtype, tierKey, rpg, old) {
  const idx = Object.keys(BLACKSMITH_TIERS).indexOf(tierKey);
  const req = getGearStatReq(wtype, idx, rpg);
  if (old || !req || !req.prog3 || idx < 0) return req;
  const tier = BLACKSMITH_TIERS[tierKey];
  const wear = getEquipReqLabel({ type: wtype, gearBase: tierKey, tierMult: tier.tierMult }, wtype, rpg);
  if (!wear) return { stat: req.stat, label: req.label, value: 0, have: req.have, met: true, prog3: true };
  return { stat: wear.stat, label: wear.label, value: wear.req, have: wear.have, met: !!wear.met, prog3: true };
}
