/* ═══ v2.3.1659: PROG3 — the trained-skill combat progression ═══
 *
 * The OSRS-inspired combat rebuild (docs/PROGRESSION-REDESIGN.md,
 * owner-approved 2026-08-13 "Go recommended"; spec:
 * docs/specs/progression-v3.md).  Replaces the six-parent T2 grid
 * economy for every player carrying `ps.prog3`:
 *
 *   - THREE trained skills — sword (Melee), bow, staff (Magic) —
 *     level 1..100 by USE: the server awards damage-proportional XP at
 *     hit time in _handleMonsterDamage (§9-A full server ownership;
 *     the client-only _buildProg track dies with the client slice).
 *     Specials credit staff/Magic (§3; they scale on magic level too).
 *   - Character level = Σ trained levels, cap 300 (fresh character =
 *     3).  EVERY trained level-up is +1 character level + 1 allocation
 *     point, immediately.
 *   - SEVEN allocated stats (def / hp / dodge / stam / crit / critDmg
 *     / aspd), linear per-point values with hard caps (§4-A), each
 *     stat additionally capped at min(100, character level) (§6-C —
 *     you can go defense-first but you can't outrun your level).
 *     Allocation is a server endpoint (prog3_allocate), not
 *     client-applied-and-clamped.
 *
 * TRUST POSTURE: ps.prog3 is SERVER-OWNED end to end — never ingested
 * from a join payload or stats_update (the t2Flat rule, v2.3.1451:
 * anything that feeds the damage roll AND the anticheat ceiling must
 * not be client-suppliable, or a forged value raises its own cap).
 * Join adoption reads the STORED blob only; first-connect bootstraps
 * respec from the sanitized legacy tracks via prog3FromLegacy (the
 * migration-v10 boundary heal, same pattern as v4/v9).
 *
 * LEGACY COEXISTENCE (dual-path, §10): every combat formula branches
 * on `ps.prog3` — present = new math, absent = the old T2 math
 * unchanged.  The 30-channel reads are gated off for prog3 players at
 * their choke points (_t2Flat returns 0; the point-count helpers
 * return neutral) so dropped channels can't keep paying.  The
 * anticheat ceilings (_maxWeaponDmg/_maxDmgForAttacker) carry the
 * same branch IN THE SAME COMMIT — ceiling and roll move in lockstep
 * or every legit hit gets rejected (the v2.3.1451 invariant).
 * The old fields (weaponSkills/weaponSpecs/defenseSpec/hpSpec/
 * enduranceSpec/t2Flat/T1 stats) stay stored for rollback; the
 * cleanup PR retires them after soak (§10 PR-6, v2.3.1155 precedent).
 */

export const PROG3 = {
  SKILLS: ['sword', 'bow', 'staff'], // storage keys; displayed Melee / Bow / Magic
  LEVEL_CAP: 100,                    // per trained skill
  CHAR_LEVEL_CAP: 300,               // Σ trained levels
  XP_PER_DMG: 1.0,                   // mirrors the legacy WEAPON_XP_PER_DMG
  // §4-A per-point values + hard caps (approved table).  Fractions are
  // the per-point rate; the alloc endpoint enforces the point caps.
  STATS: {
    def:     { cap: 100, per: 0.004 },  // −0.4% damage taken/pt → −40%
    hp:      { cap: 100, per: 8 },      // +8 max HP/pt → +800
    dodge:   { cap: 75,  per: 0.004 },  // +0.4%/pt → 30%
    stam:    { cap: 100, per: 3 },      // +3 max stamina/pt → +300
    crit:    { cap: 75,  per: 0.004 },  // +0.4%/pt → 30%
    critDmg: { cap: 100, per: 2 },      // +2 flat on crits/pt → +200
    aspd:    { cap: 100, per: 0.0035 }, // −0.35% swing period/pt → −35%
    // aspd note: 600ms base × 0.65 × the 0.7 lag headroom = 273ms >
    // the 210ms server cadence floor (combat.js), so the existing
    // floor already covers a maxed prog3 build.  If the per-point
    // value ever grows past −50%, the floor must move in lockstep.
  },
  // §7-A: +K damage per trained level, replacing stat×0.1667.  First
  // guess pending the balance-sim retune (±10% of today's maxed DPS);
  // staff pays a premium for its 0.5–1.5 variance.
  DMG_PER_LEVEL: { sword: 0.18, bow: 0.18, staff: 0.22 },
  HP_PER_LEVEL: 2,          // §5-B: 100 + level×2 + hp×8 (≈1500 base at cap)
  MANA_PER_MAGIC_LEVEL: 1.2, // §4 audit table: mana follows Magic (mind dies)
};

/* XP to go from trained level L to L+1.  The legacy weaponXpRequired
 * curve (280 × 1.16^L, gameSystems.js) reused verbatim (§3-A), shifted
 * one because prog3 skills are 1-based where the legacy track was
 * 0-based: cost(1→2) here == cost(0→1) there, so XP carried by the
 * respec lands on exactly the level it had earned. */
export function prog3XpRequired(level) {
  return Math.ceil(280 * Math.pow(1.16, Math.max(0, (level || 1) - 1)));
}

export function prog3FreshAlloc() {
  return { def: 0, hp: 0, dodge: 0, stam: 0, crit: 0, critDmg: 0, aspd: 0 };
}

/* The respec (§8-B, approved): recompute from carried XP.  New trained
 * level = legacy level + 1 (identical curve, 0→1 base shift), leftover
 * xp carried; pool = Σ legacy weapon levels + legacy defense level
 * (every trained level = 1 point, retroactively true; defense-skill
 * carry per §3's bonus-points pick).  Pure and blob-shaped: shared by
 * migration v10 (stored blobs) AND the join boundary heal (first
 * connects / fail-open blobs), the v4/v9 pattern.  Tolerates any
 * partial shape; null/undefined src yields the fresh-character object
 * (levels 1, pool 0). */
export function prog3FromLegacy(src) {
  const clampLvl = (v) => Math.max(0, Math.min(100, Math.floor(Number(v) || 0)));
  const sk = {};
  let pool = 0;
  for (const cat of PROG3.SKILLS) {
    const old = (src && src.weaponSkills && typeof src.weaponSkills === 'object')
      ? src.weaponSkills[cat] : null;
    const oldLevel = clampLvl(old && old.level);
    const level = Math.min(PROG3.LEVEL_CAP, oldLevel + 1);
    const xp = Math.max(0, Math.min(1e8, Number(old && old.xp) || 0));
    sk[cat] = { level, xp: level >= PROG3.LEVEL_CAP ? 0 : xp };
    pool += oldLevel;
  }
  pool += clampLvl(src && src.defenseSkill && src.defenseSkill.level);
  return { sk, alloc: prog3FreshAlloc(), pool };
}

export const prog3Methods = {
  // Shape-normalize a SERVER-stored prog3 (join adoption, admin
  // restores).  Never fed client input — the join payload is not a
  // source by construction (see header).  Merges onto the fresh shape
  // so every key exists and is bounded.
  _sanitizeProg3(src) {
    const out = prog3FromLegacy(null);
    if (!src || typeof src !== 'object') return out;
    for (const cat of PROG3.SKILLS) {
      const s = src.sk && src.sk[cat];
      if (s && typeof s === 'object') {
        out.sk[cat].level = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(Number(s.level) || 1)));
        out.sk[cat].xp = Math.max(0, Math.min(1e8, Number(s.xp) || 0));
      }
    }
    for (const k of Object.keys(out.alloc)) {
      const n = src.alloc && Number(src.alloc[k]);
      if (Number.isFinite(n) && n > 0) out.alloc[k] = Math.min(PROG3.STATS[k].cap, Math.floor(n));
    }
    const p = Number(src.pool);
    if (Number.isFinite(p) && p > 0) out.pool = Math.min(999, Math.floor(p));
    return out;
  },

  // Allocated points in a stat, bounded read (the caps are enforced at
  // spend time; this re-clamps so a corrupt snapshot stays bounded at
  // every consumption site).
  _prog3Pts(ps, stat) {
    const p3 = ps && ps.prog3;
    const v = p3 && p3.alloc && p3.alloc[stat];
    return (typeof v === 'number') ? Math.max(0, Math.min(PROG3.STATS[stat].cap, v)) : 0;
  },

  _prog3CharLevel(ps) {
    const p3 = ps && ps.prog3;
    if (!p3 || !p3.sk) return 3;
    let sum = 0;
    for (const cat of PROG3.SKILLS) {
      sum += Math.max(1, Math.min(PROG3.LEVEL_CAP, (p3.sk[cat] && p3.sk[cat].level) || 1));
    }
    return Math.min(PROG3.CHAR_LEVEL_CAP, sum);
  },

  // The prog3 twin of _recomputeMaxes (grids.js delegates here when
  // ps.prog3 exists).  §5-B pools: level term shrinks to 2 HP/level
  // and the hp stat carries the rest; stamina/mana lose their T1 stat
  // terms (endurance→stam points, mind→Magic level).  Armor keeps its
  // flat-HP identity but DROPS the vitality multiplier (§4 audit
  // table) — same 20 × tierMult base, same ×8 forged-tierMult clamp
  // as _armorHp.
  _prog3Recompute(ps) {
    if (!ps || !ps.prog3) return;
    ps.level = this._prog3CharLevel(ps);
    let armorHp = 0;
    if (ps.armor) {
      const tmRaw = (typeof ps.armor.tierMult === 'number' && ps.armor.tierMult > 0) ? ps.armor.tierMult : 1.0;
      armorHp = Math.floor(20 * Math.min(8, tmRaw));
    }
    ps.maxHp = Math.floor(100 + ps.level * PROG3.HP_PER_LEVEL
      + this._prog3Pts(ps, 'hp') * PROG3.STATS.hp.per + armorHp);
    ps.maxStamina = Math.floor(100 + this._prog3Pts(ps, 'stam') * PROG3.STATS.stam.per);
    const magicLvl = (ps.prog3.sk && ps.prog3.sk.staff && ps.prog3.sk.staff.level) || 1;
    ps.maxMana = Math.floor(100 + magicLvl * PROG3.MANA_PER_MAGIC_LEVEL);
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.hp, ps.maxHp);
    if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
    ps.stamina = Math.min(ps.stamina, ps.maxStamina);
    if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
    ps.mana = Math.min(ps.mana, ps.maxMana);
  },

  // Per-hit dodge chance (§4: replaces agility×0.0008 + the evasion
  // accumulator; cap 30% at the 75-pt stat cap).
  _prog3DodgePct(ps) {
    return this._prog3Pts(ps, 'dodge') * PROG3.STATS.dodge.per;
  },

  // Incoming-damage multiplier (§4 decision 9-B: % reduction, the
  // game's first real mitigation stat; cap −40%).  Consumed in
  // _applyDamage AFTER the resist buff, floor 1 preserved there.
  _prog3DefMult(ps) {
    return 1 - this._prog3Pts(ps, 'def') * PROG3.STATS.def.per;
  },

  // ═══ Trained XP accrual (§9-A: server-authoritative) ═══
  //
  // Called from _handleMonsterDamage with the CREDITED damage
  // (actualDmg — clamped to the monster's remaining hp, so overkill
  // farming can't inflate the rate) after every landed hit.  cat is
  // resolved server-side from the effective slot (never the raw wire
  // string); specials always credit 'staff' (§3: specials are Magic).
  // XP mutations ride in memory between saves — persistence lands on
  // level-up here and on the kill-path _saveRpg like every other
  // combat mutation (the v2.3.1619b write-amplification lesson: no
  // per-hit storage puts).
  _prog3AwardXp(playerId, ps, cat, dmg) {
    const p3 = ps && ps.prog3;
    if (!p3 || !p3.sk || !p3.sk[cat] || !(dmg > 0)) return;
    const sk = p3.sk[cat];
    if (sk.level >= PROG3.LEVEL_CAP) return;
    sk.xp += dmg * PROG3.XP_PER_DMG;
    let gained = 0;
    while (sk.level < PROG3.LEVEL_CAP && sk.xp >= prog3XpRequired(sk.level)) {
      sk.xp -= prog3XpRequired(sk.level);
      sk.level++;
      p3.pool++;
      gained++;
    }
    if (sk.level >= PROG3.LEVEL_CAP) sk.xp = 0;
    if (gained > 0) {
      // A trained level-up IS the character level-up (level = Σ), so
      // the celebration moves server-side (§8): recompute + full
      // resource restore (the v2.3.1414 rule), persist, notify.
      this._prog3Recompute(ps);
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      this._saveRpg(playerId, ps);
      const ws = this._wsBySessionId(playerId);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'prog3_level',
            payload: { skill: cat, level: sk.level, pool: p3.pool, charLevel: ps.level },
          }));
        } catch (e) {}
      }
      this._queuePlayerStateFlush(playerId);
    }
  },

  // ═══ Allocation endpoint (§9: server-validated spend) ═══
  //
  // Wire: prog3_allocate { stat }.  Gates: prog3 present, stat in the
  // seven-key whitelist (own-property check — '__proto__' etc. fail),
  // pool ≥ 1, and the §6-C double cap: the stat's own hard cap AND
  // min(100, character level) — replaces _statCap for prog3 players.
  // Invalid spends are silently dropped (the stat_allocate posture);
  // success acks with prog3_allocated + a full player_state echo.
  _handleProg3Allocate(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    const p3 = ps && ps.prog3;
    if (!p3) return;
    const stat = payload && payload.stat;
    if (typeof stat !== 'string' || !Object.prototype.hasOwnProperty.call(PROG3.STATS, stat)) return;
    if (!(p3.pool >= 1)) return;
    const cur = (typeof p3.alloc[stat] === 'number') ? p3.alloc[stat] : 0;
    const cap = Math.min(PROG3.STATS[stat].cap, ps.level || this._prog3CharLevel(ps));
    if (cur >= cap) return;
    p3.alloc[stat] = cur + 1;
    p3.pool -= 1;
    this._prog3Recompute(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'prog3_allocated',
          payload: { stat, pts: p3.alloc[stat], pool: p3.pool },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }
  },
};
