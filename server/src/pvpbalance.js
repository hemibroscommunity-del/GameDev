/* ═══ v2.3.3258: A FIGHT BETWEEN PLAYERS LASTS LONG ENOUGH TO MATTER ═══
 *
 * Owner, 2026-10-14, after the time-to-kill study (docs/specs/pvp-fights.md):
 * "I want you to plan and implement fixes for all of these ... You're the
 * expert on this not me."
 *
 * WHAT THE STUDY FOUND.  Two equal players with no points spent finished
 * each other in 1-5 seconds of fighting -- under a second when a staff
 * opened on someone unarmoured -- because:
 *   - every hit was a number the PHONE claimed (clamped only at 7.5x the
 *     weapon's base, so a modified page could one-shot anyone in No man's
 *     land, where the bag is the prize), scaled by a flat 0.5;
 *   - specials did 70-93% of the damage: five of them on a full bar, one
 *     every 1.5 s, the staff's at 0.3-2.5x killing from full HP 55% of the
 *     time at level 12;
 *   - a sword landed TWICE a swing (its claim went out every frame of the
 *     400 ms sweep and the 300 ms lane let two through), twice its pace on a
 *     monster -- and sent ~24 messages a swing doing it;
 *   - crits never happened: the sword sent its chance as a fraction (0.01)
 *     and this worker read it as a percentage; projectiles sent 0.
 *
 * WHAT THIS FILE DOES (the resolver, combat.js _resolvePvPAttack, calls it):
 *   1. THE WORKER ROLLS EVERY PvP HIT ITSELF, with the same roll it makes
 *      for a monster (_computeAttackDamage: the weapon, the trained level,
 *      the points, the grade, the brew, the crit -- at edge 1, as PvP has
 *      always read the points).  The phone's dmgBase is ignored here, so
 *      a forged claim buys nothing and the crit chance is the real one.
 *      The big staff bolt (`orbs`), a volley arrow (`part`) and the retreat
 *      shot (`rs`) say what they are, as they do against a monster.
 *   2. A SPECIAL IS A SPECIAL ONLY AFTER ONE WAS PAID FOR: a `swipe` the
 *      worker charged (index.js _handleAbilityUse) opens a short window worth
 *      ONE special -- the sword's swing, the big staff bolt, or the bow
 *      volley's three arrows (SPECIAL_CLAIMS, _pvpSpecialCost); a `special:
 *      true` claim outside it rolls as an ordinary hit.  It used to be the
 *      phone's word alone.
 *   3. ONE SWORD HIT PER SWING: a page that says which swing a claim belongs
 *      to (`sw`) lands one hit per swing; an older page, which says nothing,
 *      gets one per NOSW_LANE_MS -- longer than its 400 ms sweep, so one a
 *      swing too.
 *   4. THE PvP NUMBERS (tuned on the fight simulator, tools/pvp-sim/):
 *        SCALE     the whole hit (was 0.5 of a claim)
 *        SPECIAL   a special's share in a fight with a player, per weapon --
 *                  the staff's big bolt is 8.4x its base where the sword's
 *                  swing is 3x and the bow's volley 4.2x, so one share for
 *                  all would leave one cast of the staff's worth 2.5 of the
 *                  sword's
 *        KIND      per weapon, so the three are even at equal skill
 *        FALLOFF   a bow's or staff's hit loses force past NEAR, down to
 *                  MIN at FAR -- closing in is how a sword wins
 *        CAP       no hit takes more than this share of the target's max HP
 *                  (after armour): nothing kills from full health
 *      Each is a live flag (pvp_scale, pvp_sp_melee, pvp_sp_ranged,
 *      pvp_sp_staff, pvp_melee, pvp_ranged,
 *      pvp_staff, pvp_cap, pvp_near, pvp_far, pvp_min_ranged, pvp_min_staff),
 *      clamped on read, so
 *      it can be retuned without a deploy.
 *
 * KILL SWITCH: `pvpbalance: false` in liveflags is the resolver exactly as
 * before (the phone's claim x 0.5, the 300 ms lane, no cap), and
 * un-advertises caps.pvpbalance.
 *
 * Duels and the arena go through the same resolver, so they take the same
 * numbers: the study's TTK applied to them too.
 */
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from './combat.js';

export const PVP = Object.freeze({
  /* Tuned on the fight simulator (tools/pvp-sim/, docs/specs/pvp-fights.md
     has the tables): equal players with no points, level 12, the copper set,
     average skill -- a sword fight 7.4 s from the first hit (was 2.7), a bow
     fight 14.8 (4.5), a staff fight 16.6 (2.1); specials ~40% of the damage
     (68-90%); a sword beats a bow 78% of the time in the open (35%) and a
     staff 44% (8%), a bow a staff 42% (26%); the biggest hit 30% of a bar
     (107%); the better player still wins 94-100% of same-weapon fights. */
  SCALE: 0.4,
  SPECIAL: Object.freeze({ melee: 0.5, ranged: 0.45, staff: 0.3 }),
  /* the sword weighs more: it fights in contact, after crossing the ground a
     bow or staff hits it over */
  KIND: Object.freeze({ melee: 1.3, ranged: 1, staff: 1 }),
  FALLOFF: Object.freeze({ NEAR: 150, FAR: 450, MIN: Object.freeze({ ranged: 0.6, staff: 0.6 }) }),
  CAP: 0.3,
  /* a paid swipe's window: long enough for a big bolt to fly its 675 px at
     300 px/s (2.25 s) with the network on top; three claims for the volley's
     three arrows (a sword's special swing spends all three, the big bolt its
     orbs: _pvpSpecialCost) */
  SPECIAL_WINDOW_MS: 3500,
  SPECIAL_CLAIMS: 3,
  /* the quickest honest swing is 600 ms x (1 - 0.39 at the attack-speed
     asymptote) = 366 ms; x 0.7 for the network's bunching */
  MELEE_MIN_MS: 250,
  /* an older page's sword (no `sw`): longer than its 400 ms sweep */
  NOSW_LANE_MS: 450,
  /* the retreat shot's share of an arrow (client RETREAT_SHOT_DAMAGE_MULT) */
  RETREAT_K: 0.5,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const pvpBalanceMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _pvpBalanceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'pvpbalance') && !f.pvpbalance);
  },

  /* The numbers in force: the constants, or a live flag's value clamped to a
     sane range (liveops.js _flagNum clamps on read). */
  _pvpTune() {
    const num = (name, dflt, lo, hi) => (typeof this._flagNum === 'function' ? this._flagNum(name, dflt, lo, hi) : dflt);
    return {
      scale: num('pvp_scale', PVP.SCALE, 0.05, 1),
      spMelee: num('pvp_sp_melee', PVP.SPECIAL.melee, 0.05, 2),
      spRanged: num('pvp_sp_ranged', PVP.SPECIAL.ranged, 0.05, 2),
      spStaff: num('pvp_sp_staff', PVP.SPECIAL.staff, 0.05, 2),
      melee: num('pvp_melee', PVP.KIND.melee, 0.25, 3),
      ranged: num('pvp_ranged', PVP.KIND.ranged, 0.25, 3),
      staff: num('pvp_staff', PVP.KIND.staff, 0.25, 3),
      near: num('pvp_near', PVP.FALLOFF.NEAR, 50, 100000),
      far: num('pvp_far', PVP.FALLOFF.FAR, 60, 100000),
      minRanged: num('pvp_min_ranged', PVP.FALLOFF.MIN.ranged, 0.1, 1),
      minStaff: num('pvp_min_staff', PVP.FALLOFF.MIN.staff, 0.1, 1),
      cap: num('pvp_cap', PVP.CAP, 0.1, 1),
    };
  },

  /* A bow's or a staff's hit at `dist` px: full up to NEAR, then straight
     down to MIN at FAR and beyond.  A sword is never far. */
  /* a special's share for this weapon */
  _pvpSpecialShare(kind, tune) {
    const t = tune || this._pvpTune();
    return kind === 'staff' ? t.spStaff : kind === 'ranged' ? t.spRanged : t.spMelee;
  },

  _pvpFalloff(kind, dist, tune) {
    if (kind === 'melee') return 1;
    const t = tune || this._pvpTune();
    const d = Number(dist) || 0;
    const min = kind === 'staff' ? t.minStaff : t.minRanged;
    if (!(t.far > t.near) || d <= t.near) return 1;
    if (d >= t.far) return min;
    return 1 - (1 - min) * ((d - t.near) / (t.far - t.near));
  },

  /* A swipe the worker charged (index.js _handleAbilityUse) opens the window. */
  _pvpSpecialPaid(ps, now) {
    if (!ps) return;
    ps._pvpSpecUntil = (typeof now === 'number' ? now : Date.now()) + PVP.SPECIAL_WINDOW_MS;
    ps._pvpSpecLeft = PVP.SPECIAL_CLAIMS;
  },
  _pvpSpecialOk(ps, now) {
    return !!(ps && ps._pvpSpecLeft > 0 && (typeof now === 'number' ? now : Date.now()) < (ps._pvpSpecUntil || 0));
  },
  _pvpSpecialSpent(ps, n) {
    if (ps && ps._pvpSpecLeft > 0) ps._pvpSpecLeft = Math.max(0, ps._pvpSpecLeft - (n > 0 ? n : 1));
  },
  /* How many of the window's claims a special claim that landed spends: one
     paid swipe buys ONE special's worth.  A sword's special is one swing
     (the whole window -- or a forged page could mark its next two ordinary
     swings special); the big staff bolt is the orbs it carries; a volley
     arrow, or one orb of the old three-orb staff special, is one. */
  _pvpSpecialCost(kind, payload) {
    if (kind === 'melee') return PVP.SPECIAL_CLAIMS;
    const orbs = Math.floor(Number(payload && payload.orbs));
    if (kind === 'staff' && orbs > 1) return Math.min(PVP.SPECIAL_CLAIMS, orbs);
    return 1;
  },

  /* The worker's own roll for this claim, before the PvP numbers: the
     monster path's roll at edge 1, with the special's shape the wire says
     (each honoured only on its own weapon and only where it can make the hit
     no bigger than three separate claims could). */
  _pvpRollFor(ps, kind, special, payload) {
    const slot = kind === 'ranged' ? 'ranged' : kind === 'staff' ? 'staff' : 'melee';
    const orbsWire = Math.floor(Number(payload && payload.orbs));
    /* the big bolt is as many special rolls as it carries orbs -- never more
       than three, nor more than the window has claims left to spend */
    const orbs = Math.min(PVP.SPECIAL_CLAIMS, orbsWire, ps && ps._pvpSpecLeft > 0 ? ps._pvpSpecLeft : 1);
    const big = special && slot === 'staff' && orbs > 1;
    const r = this._computeAttackDamage(ps, slot, special, big ? { band: STAFF_BOLT.BAND } : undefined);
    let dmg = Number(r && r.dmg) || 0;
    if (big) dmg *= orbs;
    const partWire = Math.floor(Number(payload && payload.part));
    if (special && slot === 'ranged' && partWire >= 2) dmg *= Math.min(1, BOW_VOLLEY_WORTH / Math.min(3, partWire));
    if (!special && slot !== 'melee' && payload && payload.rs === 1) dmg *= PVP.RETREAT_K;
    return { dmg: Math.max(0, dmg), isCrit: !!(r && r.isCrit) };
  },

  /* A sword's claim against one target, on the pair's lane: with `sw`, one
     hit per swing and MELEE_MIN_MS between swings; without, one per
     NOSW_LANE_MS.  Stamps the lane when it lets one through.  A PAID special
     swing skips the gap (a special pressed right after a swing landed would
     otherwise lose its hit and its mana): the window it spends is worth one
     special, so nothing can be stacked through it. */
  _pvpMeleeLane(lane, payload, now, paidSpecial) {
    const sw = payload && Number.isFinite(payload.sw) ? Math.floor(payload.sw) : null;
    if (sw != null) {
      if (lane.sw === sw) return false;
      if (!paidSpecial && now - lane.lastTs < PVP.MELEE_MIN_MS) return false;
      lane.sw = sw;
      lane.lastTs = now;
      return true;
    }
    if (now - lane.lastTs < PVP.NOSW_LANE_MS) return false;
    lane.lastTs = now;
    return true;
  },
};
