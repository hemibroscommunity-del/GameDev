/* ═══ v2.3.3260: A HIT BETWEEN PLAYERS IS THE WORKER'S OWN ROLL ═══
 *
 * Owner, 2026-10-14, after the time-to-kill study (docs/specs/pvp-fights.md):
 * "I want you to plan and implement fixes for all of these ... You're the
 * expert on this not me."  Then, 2026-10-15: "I just want one formula that
 * works the same across everything" -- so the hit a player takes is the hit
 * a monster takes, and the fight lasts because players have the health for
 * it (oneformula.js), not because of a number of its own.
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
 *   1. THE WORKER ROLLS EVERY PvP HIT ITSELF, with the very roll it makes
 *      for a monster (v2.3.3263: combat.js _rollHit -- the weapon, the trained level,
 *      the points, the grade, the brew, the crit, the ceiling -- and the
 *      level edge by the target's level as an opponent, as a monster's).  The phone's dmgBase is ignored here, so
 *      a forged claim buys nothing and the crit chance is the real one.
 *      The big staff bolt (`orbs`) and a volley arrow (`part`) say what they
 *      are, as they do against a monster (a retreat shot's `rs` is read by
 *      neither: it is a whole plain hit on both).
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
 *   That is all.  The first cut of this PR also scaled the hit (0.4), weighted
 *   each weapon, cut each special to a share, let a bow's or staff's hit fall
 *   off with distance and capped it at a share of the target's bar -- every
 *   one a number for fights between players only.  The owner asked for none,
 *   and each is now either gone or the same for every fight (oneformula.js:
 *   the health, the two specials, and since v2.3.3263 the level edge both
 *   ways and no cap of a player's own).
 *
 * KILL SWITCH: `pvpbalance: false` in liveflags is the resolver exactly as
 * before (the phone's claim x 0.5, the 300 ms lane), and un-advertises
 * caps.pvpbalance; so is `oneformula: false` (this roll needs its health).
 *
 * Duels and the arena go through the same resolver, so they take the same
 * numbers.
 */

export const PVP = Object.freeze({
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
  /* (the first cut halved the retreat shot here, RETREAT_K 0.5; the worker
     rolls it whole against a monster -- monster_damage carries no `rs` -- so
     against a player it is whole too: one formula) */
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const pvpBalanceMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _pvpBalanceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'pvpbalance') && !f.pvpbalance);
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

  /* The worker's own roll for this claim -- the hit, whole: the one roll a
     monster takes (combat.js _rollHit -- v2.3.3263: the same function, so the
     edge, the bolt, the volley and the ceiling cannot drift apart), with the
     special's shape the wire says (each honoured only on its own weapon and
     only where it can make the hit no bigger than three separate claims
     could).  `targetLevel` is the target's level as an opponent (prog3.js
     _prog3OpponentLevel): the edge, as a monster's level is. */
  _pvpRollFor(ps, kind, special, payload, targetLevel) {
    const slot = kind === 'ranged' ? 'ranged' : kind === 'staff' ? 'staff' : 'melee';
    const orbsWire = Math.floor(Number(payload && payload.orbs));
    /* the big bolt is worth as many orbs as it carries -- never more than
       three, nor more than the window has claims left to spend (the monster
       path's lane does the same with its own budget) */
    const bigBolt = !!(special && slot === 'staff' && orbsWire > 1);
    const orbs = bigBolt ? Math.max(1, Math.min(PVP.SPECIAL_CLAIMS, orbsWire, ps && ps._pvpSpecLeft > 0 ? ps._pvpSpecLeft : 1)) : 1;
    const r = this._rollHit(ps, slot, special, { targetLevel, bigBolt, orbs, part: payload && payload.part });
    return { dmg: Math.max(0, Number(r && r.dmg) || 0), isCrit: !!(r && r.isCrit) };
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
