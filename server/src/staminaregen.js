/* ═══ v2.3.3536: STAMINA REGEN, WORKED OUT BY THE WORKER ═══
 *
 * The owner, 2026-10-21, a week before reviewers play the game: "I value
 * SIMPLICITY and INTELLIGIBILITY".  The regen tick (index.js
 * _tickPlayerRegen) refilled stamina by 7 a tick times two multipliers the
 * player could not see:
 *
 *   - (1 + amuletStaminaRegen / 100), a number the PHONE sent at every join
 *     (join.js) and in every stats_update (grids.js), clamped to [0, 100].
 *     Any phone could claim 100: twice the refill, with no amulet at all.
 *     The worker has held the amulet itself since v2.3.1192 (amulet.js mints
 *     it; gear.js _sanitizeAmulet keeps its {tier, gem}), so the bonus is
 *     worked out from THAT: a LIGHT gem's (4 + 3 x its tier's power) %, the
 *     game's own AMULET_GEM_STATS.light (src/data/items.js, which the
 *     amulet's card prints; mirror-audit pins the two).  Any other gem, or no
 *     amulet, is 0.
 *   - (1 + endurance x 0.002), the old Endurance stat.  Under prog3 (every
 *     character: join.js installs it at the first connect, migration v10 on
 *     every older record) Endurance is FROZEN -- nothing raises it, no screen
 *     shows it, and max stamina no longer reads it (prog3.js
 *     _prog3Recompute) -- so this was its last live use: a character made
 *     before prog3 refilled faster for a number it could never see or
 *     change.  A prog3 character refills at x1.
 *
 * A new player sees no change: no amulet and an Endurance of 0 were x1
 * already.  Nothing makes a light gem yet (no land's shards crack into one:
 * the realms are not built), so no honest player has the amulet's bonus
 * either; it is worked out here so the worker's amulet means what its card
 * says.
 *
 * `amuletregen: false` in the live flags is the tick as it was: the phone's
 * claim, and Endurance for everyone.  The claims are still taken in (join.js,
 * grids.js) as session-only fields nothing else reads, so the switch works
 * mid-session.  docs/specs/stamina-regen.md; `stamina-regen` suite. */

import { AMULET_TIER_POWER } from './data.js';

/* The light gem's row of the game's AMULET_GEM_STATS (src/data/items.js):
   mirror-audit fails if either side moves alone. */
export const AMULET_STAMINA_REGEN = { gem: 'light', base: 4, perPower: 3 };

/* The amulet's stamina regen in percent, as the game's getAmuletBonus
   (src/data/items.js) works it out for the card: rounded to a tenth.
   Simple 7, ornate 8.5, regal 10.6, mythic 13.  An unknown tier counts for
   nothing (own property, TRAPS §6: 'constructor' is not a tier). */
export function amuletStaminaRegenPct(amulet) {
  if (!amulet || typeof amulet !== 'object' || amulet.gem !== AMULET_STAMINA_REGEN.gem) return 0;
  if (!Object.prototype.hasOwnProperty.call(AMULET_TIER_POWER, amulet.tier)) return 0;
  const power = AMULET_TIER_POWER[amulet.tier];
  return Math.round((AMULET_STAMINA_REGEN.base + AMULET_STAMINA_REGEN.perPower * power) * 10) / 10;
}

export const staminaRegenMethods = {
  /* `amuletregen: false` in liveflags: the old multipliers. */
  _amuletRegenOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'amuletregen') && !f.amuletregen);
  },

  /* The two multipliers on a regen tick's 7: the amulet's and Endurance's. */
  _staminaRegenMults(ps) {
    const endurance = 1 + ((ps && ps.endurance) || 0) * 0.002;
    if (this._amuletRegenOff()) {
      return { amulet: 1 + ((ps && ps.amuletStaminaRegen) || 0) / 100, endurance };
    }
    return {
      amulet: 1 + amuletStaminaRegenPct(ps && ps.amulet) / 100,
      endurance: (ps && ps.prog3) ? 1 : endurance,
    };
  },
};
