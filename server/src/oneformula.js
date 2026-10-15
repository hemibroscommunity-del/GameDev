/* ═══ v2.3.3260: ONE FORMULA FOR EVERY FIGHT ═══
 *
 * Owner, 2026-10-15, on the PvP numbers this PR first shipped: "Is there a
 * way you can adjust like starting hp, damage, special attack damage, etc so
 * that there's no special "PvP" versus "PVE" formulas? I just want one
 * formula that works the same across everything".
 *
 * There is.  A hit is the same hit whoever takes it -- a monster or a player
 * -- and the fight between players lasts long enough because PLAYERS HAVE
 * MORE HEALTH, not because their hits on each other are cut.  What this file
 * holds (docs/specs/one-formula.md has the study and the tables):
 *
 *   1. HEALTH.  A character's max HP is 100 + 50 a level + 40 a Max HP point
 *      (it was 100 + 6 a level + 8 a point).  A level is the character level
 *      (the three weapon skills summed, prog3.js _prog3CharLevel).  Health now
 *      grows with level about as fast as damage does, so two equal players
 *      take about as long to finish each other at level 10 as at level 30
 *      (the old +6 a level made a level-30 fight a third the length of a
 *      level-5 one).
 *
 *   2. MONSTERS HIT HARDER BY THE SAME AMOUNT, so fighting them feels exactly
 *      as it did: a monster of level M hits a player whose weapon skill is M
 *      (character level M + 2, the other two skills at 1 -- MATCH_LEVEL) for
 *      the same share of their health as before.  `monsterHitK(M)` is that
 *      player's new health over their old; every monster's `dmg` is built
 *      with it (index.js _makeZoneMonster, dungeon.js _dungeonMonster), and
 *      the two flat amounts (the blue slime's burst, the fire trail) take it
 *      too.  Burns, poisons and storm arcs are shares of the hit, so they
 *      follow.
 *
 *   3. ONE CAP FOR EVERY HIT ON A PLAYER: nothing takes more than HIT_CAP of
 *      a player's max HP in one blow, whoever lands it (combat.js
 *      _applyDamage, after every cut).  The monsters' own rails (half the bar
 *      for a telegraphed hit or a boss's ability) sit inside it.
 *
 *   4. TWO SPECIALS, FOR EVERYONE.  The sword's special swing hits
 *      SWORD_SPECIAL x a plain hit (was 3x): it was the weakest special one
 *      on one -- its reach is its ring of monsters, which a lone target does
 *      not have.  The staff's big bolt is worth STAFF_BOLT_K of what it was
 *      (8.4x its plain hit on average, now ~5x): it still hits the hardest of
 *      the three and keeps its whole spread (the owner's "staff, but with high
 *      variance"), but it no longer kills a monster of your level outright,
 *      and the staff no longer out-farms the sword and bow by a fifth.
 *
 *   5. FOOD (cooking.js): a heal is the same size in any fight, and one
 *      healing bite every 15 s while you are fighting ANYTHING (PVP_HEAL), not
 *      only a player.  The bars are bigger, so a fish is a third or so of one.
 *
 * And between players, nothing else: the worker's own roll (pvpbalance.js) at
 * full value, exactly the roll a monster takes.  The PvP-only numbers this PR
 * first shipped (a 0.4 scale, per-weapon weights and special shares, a bow's
 * falloff, a quarter-size bite) are gone.
 *
 * Mirrored in src/data/oneFormula.js (mirror-audit).  The phone predicts with
 * it only against a worker that advertises caps.oneformula.
 *
 * KILL SWITCH: `oneformula: false` in liveflags is the combat from before
 * this version -- the old health, monsters' old hits, no cap, the old
 * specials, the bite rule only in fights between players, and the PvP
 * resolver's old path (caps.pvpbalance goes with it).  Throwing it re-sizes
 * every connected player's bar (keeping how full it is) and every live
 * monster's hit (_oneFormulaFlagChanged, called by liveops.js).
 */

export const ONE_FORMULA = Object.freeze({
  HEALTH: Object.freeze({ BASE: 100, PER_LEVEL: 50, PER_POINT: 40 }),
  /* the formula before, frozen: what `oneformula: false` puts back (and
     prog3.js PROG3.HP_PER_LEVEL / BODY.hp.per still say) */
  OLD_HEALTH: Object.freeze({ BASE: 100, PER_LEVEL: 6, PER_POINT: 8 }),
  /* a monster of level M is the match for character level M + MATCH_LEVEL */
  MATCH_LEVEL: 2,
  HIT_CAP: 0.3,
  SWORD_SPECIAL: 4.5,
  OLD_SWORD_SPECIAL: 3,
  STAFF_BOLT_K: 0.6,
});

/** Max HP at a character level with `pts` Max HP points: the new formula, or
 *  the old one when `on` is false.  Floored, as the worker always has. */
export function healthAt(charLevel, pts, on) {
  const H = on === false ? ONE_FORMULA.OLD_HEALTH : ONE_FORMULA.HEALTH;
  const L = Math.max(0, Number(charLevel) || 0);
  const P = Math.max(0, Number(pts) || 0);
  return Math.floor(H.BASE + L * H.PER_LEVEL + P * H.PER_POINT);
}

/** How much harder a monster of `level` hits under the one formula: its
 *  matching player's new health over their old (1 when off). */
export function monsterHitK(level, on) {
  if (on === false) return 1;
  const c = Math.max(1, Number(level) || 1) + ONE_FORMULA.MATCH_LEVEL;
  const H = ONE_FORMULA.HEALTH, O = ONE_FORMULA.OLD_HEALTH;
  return (H.BASE + c * H.PER_LEVEL) / (O.BASE + c * O.PER_LEVEL);
}

/** The special's multiplier on a plain hit, per weapon type (combat.js
 *  _computeAttackDamage): the staff's orb 2x, the bow's arrow 3x, every
 *  sword SWORD_SPECIAL. */
export function specialMultFor(type, on) {
  if (type === 'staff') return 2.0;
  if (type === 'bow') return 3.0;
  return on === false ? ONE_FORMULA.OLD_SWORD_SPECIAL : ONE_FORMULA.SWORD_SPECIAL;
}

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const oneFormulaMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _oneFormulaOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'oneformula') && !f.oneformula);
  },
  _oneFormulaOn() { return !this._oneFormulaOff(); },

  /* A monster's hit multiplier at its level, for the formula in force. */
  _monsterHitK(level) { return monsterHitK(level, this._oneFormulaOn()); },

  /* The most one blow may take from this player (after every cut), or 0 for
     no cap (the formula off). */
  _hitCapHp(ps) {
    if (!ps || this._oneFormulaOff()) return 0;
    const mx = Number(ps.maxHp);
    return mx > 0 ? Math.max(1, Math.floor(mx * ONE_FORMULA.HIT_CAP)) : 0;
  },

  /* Stamp a freshly built monster with the multiplier its `dmg` carries, so
     a flip of the switch can take it back out (_oneFormulaFlagChanged). */
  _monsterHitStamp(m) {
    if (!m) return m;
    const k = this._monsterHitK(m.level);
    m.dmg = Math.max(1, Math.ceil((Number(m.dmg) || 0) * k));
    m._hk = k;
    return m;
  },

  /* ═══ THE SWITCH THROWN WHILE PLAYERS ARE ON ═══
     liveops.js calls this after `oneformula` is set or cleared.  Every
     connected player's bar is re-sized by the formula in force, keeping how
     full it was, and every live monster's hit is re-scaled from the
     multiplier it was built with.  Without it the switch would reach each
     player only at their next join and each monster at the next restart --
     and a player on the old health beside a monster on the new hits would
     die in a few blows. */
  _oneFormulaFlagChanged() {
    for (const [id, ps] of Object.entries(this.playerState || {})) {
      if (!ps || !ps.prog3 || typeof this._prog3Recompute !== 'function') continue;
      const max0 = Number(ps.maxHp) || 0;
      const hp0 = Number(ps.hp) || 0;
      this._prog3Recompute(ps);
      this._keepBarFullness(ps, hp0, max0);
      if (typeof this._queuePlayerStateFlush === 'function') this._queuePlayerStateFlush(id);
    }
    const zones = this.monsters || {};
    for (const zid of Object.keys(zones)) {
      const list = zones[zid];
      if (!Array.isArray(list)) continue;
      for (const m of list) {
        if (!m) continue;
        const k0 = Number(m._hk) > 0 ? Number(m._hk) : 1;
        const k1 = this._monsterHitK(m.level);
        if (k1 === k0) continue;
        m.dmg = Math.max(1, Math.round((Number(m.dmg) || 0) * k1 / k0));
        if (typeof m._enrageBaseDmg === 'number') m._enrageBaseDmg = Math.max(1, Math.round(m._enrageBaseDmg * k1 / k0));
        m._hk = k1;
      }
    }
  },

  /* A bar whose size changed under the player (the formula changed between
     two sessions, or the switch was thrown) keeps how full it was: a player
     who logged out at full health logs in at full health, not at a fifth of
     a bar five times the size.  `hp0`/`max0` are the bar before. */
  _keepBarFullness(ps, hp0, max0) {
    if (!ps || !(max0 > 0) || !(ps.maxHp > 0) || ps.maxHp === max0) return;
    if (ps.dead || ps.dying || !(hp0 > 0)) return;
    ps.hp = Math.max(1, Math.min(ps.maxHp, Math.round(hp0 * ps.maxHp / max0)));
  },
};
