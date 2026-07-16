/* ═══ v2.3.1170 (P4 decomposition): GRIDS + PROGRESSION extracted
 * from index.js ═══
 *
 * Behavior-frozen move of the build/progression stack out of the
 * GameRoom class body (same mixin pattern as market.js): the combat
 * XP curve + build-point level-up, T2 stat allocation, the six-grid
 * channel sanitizers + the 1000-point combat ceiling
 * (_clampBuildTotal), the grid channel multipliers, the pool math
 * (_statCap, the _calcMax trio, _armorHp, _recomputeMaxes), and
 * _handleStatsUpdate (the v2.3.1158 mutation gate preserved
 * verbatim).  Persistence core (_saveRpg/_loadRpg/_pruneBuffs) and
 * the join bootstrap stay in index.js; combat reads
 * (_recoveryMult in second-wind, _evasionDodge in the dodge roll,
 * _recomputeMaxes on level-up) reach these via `this`.
 *
 * The static get members moved to module constants (see below) --
 * the only change that isn't a pure line move; nothing outside this
 * file referenced them via the class. */

import { computeCanonicalPools } from './migrations.js';

// v2.3.1170: these were `static get` members on GameRoom; as module
// constants the mixin methods can reference them without a circular
// import.  Values byte-identical; nothing outside this module read
// them via the class.
const WEAPON_SKILL_CATS = ['sword', 'bow', 'staff'];
const DEFENSE_CHANNEL_KEYS = ['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise'];
// v2.3.1154: HP + Endurance grids (BALANCE-PLAN spec Phases 2/4) — the
// last two build skills get channels.  resilience/reflexes are stored
// but inert ("Soon"): resilience has nothing to consume (monsters
// don't crit), reflexes waits for server-owned dodge-roll timing.
const HP_CHANNEL_KEYS = ['vigor', 'recovery', 'lifeblood', 'resilience', 'laststand']; // v2.3.1314: laststand = the owner-named 5th Vitality category
const ENDURANCE_CHANNEL_KEYS = ['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes'];
// v2.3.1156: level clamps 99 -> 100 and every channel clamp -> the
// uniform 100 cap (owner design: one allocation max everywhere, every
// cap-value landing at exactly 100 points; coefficients rescaled at
// the consumption sites, formerly-50-cap points doubled by the
// uniform-t2-caps migration).
const T2_CHANNEL_CAP = 100;
// v2.3.1157: THE COMBAT CEILING — total ALLOCATED T2 points across
// all six grids cap at 1000 (owner design 2026-07-04: 30 channels ×
// 100 = 3000 slots, so a finished build completes exactly one third
// of the grid — permanent specialization, no maxing everything).
// The cap binds ALLOCATION, not earning, which keeps it order-free
// and deterministic: _clampBuildTotal walks the grids in canonical
// order and truncates whatever crosses the line, same rule on every
// ingest path.  Earning is per-skill: 2 points per level, 200
// lifetime per skill (6 × 200 = 1200 earnable > 1000 spendable — the
// last 200 are the specialization squeeze).
const COMBAT_BUILD_CEILING = 1000;
const WEAPON_CHANNEL_KEYS = {
  sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
  bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
  staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
};

export const gridMethods = {
  // ═══ Combat XP + level (server-authoritative) ═══
  //
  // Mirrors xpRequired() in src/data/gameSystems.js so the worker
  // computes the same level-up threshold the client used to.  Three
  // segments (lvl <= 30, <= 65, <= 100) plus a post-100 prestige
  // ramp -- keep this byte-identical with the client if you ever
  // tune the curve.
  _xpRequiredForLevel(level) {
    const L = level || 1;
    if (L <= 30) return Math.ceil(500 * Math.pow(1.10, L - 1));
    const at30 = Math.ceil(500 * Math.pow(1.10, 29));
    if (L <= 65) return Math.ceil(at30 * Math.pow(1.07, L - 30));
    const at65 = Math.ceil(at30 * Math.pow(1.07, 35));
    if (L <= 100) return Math.ceil(at65 * Math.pow(1.04, L - 65));
    const at100 = Math.ceil(at65 * Math.pow(1.04, 35));
    return Math.ceil(at100 * Math.pow(1.08, L - 100));
  },

  // Accumulate combat XP for the bar / analytics only.  Per
  // docs/specs/build-points-gate-server.md, combat level-up is now
  // gated purely on build points (5 BP = 1 level, fired by the
  // build_point_earned event), not on XP thresholds.  killXp still
  // accumulates on ps.xp so the XP bar can repurpose into a BP bar
  // or analytics without losing the running total.
  _addCombatXp(ps, xpAmt) {
    if (!ps) return { leveled: false, levelsGained: 0, newLevel: 1 };
    ps.level = ps.level || 1;
    ps.xp = (ps.xp || 0) + (xpAmt || 0);
    return { leveled: false, levelsGained: 0, newLevel: ps.level };
  },

  // Drain build points into combat levels: every 5 BP = +1 level +
  // 5 unspentT2 + full pool restore.  Carries excess (10 BP → +2
  // levels).  Returns { leveled, levelsGained, newLevel } matching
  // the old _addCombatXp shape so combat_credit consumers keep
  // working unchanged.
  _tryLevelUpFromBuildPoints(ps) {
    if (!ps) return { leveled: false, levelsGained: 0, newLevel: 1 };
    ps.level = ps.level || 1;
    ps.unspentT2 = ps.unspentT2 || 0;
    ps.buildPointsThisLvl = ps.buildPointsThisLvl || 0;
    let levelsGained = 0;
    const LEVEL_CAP = 100;
    while (ps.level < LEVEL_CAP && ps.buildPointsThisLvl >= 5) {
      ps.buildPointsThisLvl -= 5;
      ps.level += 1;
      ps.unspentT2 += 5;
      levelsGained += 1;
    }
    if (levelsGained > 0) {
      this._recomputeMaxes(ps);
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
    }
    return { leveled: levelsGained > 0, levelsGained, newLevel: ps.level };
  },

  _handleBuildPointEarned(session) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    // v2.3.910: a build-skill stat went up on the client.  Combat level is now
    // derived from the stat sum, so recompute maxes (which re-derives level)
    // and, on a level gain, top off the pools.  The exact stat values arrive
    // via stats_update; this is a best-effort early recompute, and the
    // authoritative new level reaches the client via the player_state flush.
    const prevLevel = ps.level || 1;
    this._recomputeMaxes(ps);
    if ((ps.level || 1) > prevLevel) {
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
    }
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
  },

  // ═══ T2 stat allocation (server-validated) ═══
  //
  // Client sends stat_allocate { stat }; worker validates that
  // ps.unspentT2 > 0 and the stat name is in the 10-stat list,
  // decrements unspentT2 by 1, persists, and emits a private
  // stat_allocated event so the client applies R[stat]++ + recalc.
  // Closes the "spend more T2 points than you have" cheat -- the
  // client can no longer mint phantom unspentT2 via localStorage
  // because the server is the source of truth for the counter.
  //
  // What's NOT closed: directly writing R.power = 999 in DevTools.
  // T1 use-trained increments also still flow client-side.  Closing
  // those needs server-tracked stat VALUES (with T1 mutations also
  // server-mediated); a bigger slice -- this one just enforces the
  // T2 spend gate.
  // v2.3.1155: T1-only — the five retired T2 stats (ferocity /
  // elementalMastery / fortification / restoration / influence) are no
  // longer allocatable (BALANCE-PLAN §8; pinned 0 for every live player
  // since v2.3.910, deleted from the save/wire this slice).
  _isValidStat(stat) {
    return stat === 'power' || stat === 'vitality' || stat === 'endurance'
        || stat === 'agility' || stat === 'mind';
  },

  _handleStatAllocate(session, payload) {
    if (!session || !session.id) return;
    const { stat } = payload || {};
    if (!this._isValidStat(stat)) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if ((ps.unspentT2 || 0) <= 0) return;
    ps.unspentT2 -= 1;
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'stat_allocated',
          payload: { stat, newUnspentT2: ps.unspentT2 },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }
  },

  // v2.3.1021: weapon/defense SKILL-TRACK persistence (level / xp / unspent
  // points / channel allocations).  Previously these lived ONLY in the
  // browser's localStorage -- never saved server-side, loaded on join, or
  // echoed in player_state -- so a reconnect, device switch, or cache clear
  // reset a player's trained weapon-skill levels to 0.  Now the server is
  // the durable store: the client trains (awardWeaponXp) + spends locally and
  // reports via stats_update / the join payload; the server clamps + stores +
  // echoes.  Pure store-and-echo -- the only field that affects combat is
  // weaponSpecs, which keeps its own authoritative [0,99] clamp in
  // _handleStatsUpdate / _computeAttackDamage, so trusting client level/xp
  // here opens no damage exploit beyond what weaponSpecs already allows.
  _clampBuildTotal(ps) {
    if (!ps) return 0;
    let total = 0;
    const walk = (spec, keys) => {
      if (!spec || typeof spec !== 'object') return;
      for (const k of keys) {
        if (typeof spec[k] !== 'number') continue;
        let v = spec[k];
        if (total + v > COMBAT_BUILD_CEILING) {
          v = Math.max(0, COMBAT_BUILD_CEILING - total);
          spec[k] = v;
        }
        total += v;
      }
    };
    const WCH = WEAPON_CHANNEL_KEYS;
    for (const cat of WEAPON_SKILL_CATS) walk(ps.weaponSpecs && ps.weaponSpecs[cat], WCH[cat]);
    walk(ps.defenseSpec, DEFENSE_CHANNEL_KEYS);
    walk(ps.hpSpec, HP_CHANNEL_KEYS);
    walk(ps.enduranceSpec, ENDURANCE_CHANNEL_KEYS);
    return total;
  },
  _sanitizeWeaponSkills(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of WEAPON_SKILL_CATS) {
      const s = src[cat];
      if (!s || typeof s !== 'object') continue;
      out[cat] = {
        level: Math.max(0, Math.min(100, Math.floor(Number(s.level) || 0))),
        xp: Math.max(0, Math.min(1e8, Number(s.xp) || 0)),
      };
    }
    return out;
  },
  _sanitizeWeaponUnspent(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of WEAPON_SKILL_CATS) {
      if (typeof src[cat] === 'number') out[cat] = Math.max(0, Math.min(999, Math.floor(src[cat])));
    }
    return out;
  },
  _sanitizeDefenseSkill(src) {
    if (!src || typeof src !== 'object') return { level: 0, xp: 0 };
    return {
      level: Math.max(0, Math.min(100, Math.floor(Number(src.level) || 0))),
      xp: Math.max(0, Math.min(1e8, Number(src.xp) || 0)),
    };
  },
  _sanitizeDefenseSpec(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const k of DEFENSE_CHANNEL_KEYS) {
      if (typeof src[k] === 'number') out[k] = Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(src[k])));
    }
    return out;
  },
  // v2.3.1154: HP/Endurance grid sanitizer — [0,50] per channel like the
  // defense grid, PLUS a budget clamp the weapon grids never had:
  // sum(spec) <= the governing stat (points accrue 1/stat-level, and
  // vitality/endurance are server-clamped via _statCap, so INV-26 is
  // ENFORCEABLE here at zero extra trust).  Overspend is truncated in
  // canonical key order, deterministically on both sides.
  _sanitizeGridSpec(src, keys, budget) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    const cap = (typeof budget === 'number') ? Math.max(0, Math.floor(budget)) : Infinity;
    let sum = 0;
    for (const k of keys) {
      if (typeof src[k] !== 'number') continue;
      let v = Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(src[k])));
      if (sum + v > cap) v = Math.max(0, cap - sum);
      out[k] = v;
      sum += v;
    }
    return out;
  },
  // v2.3.1156: grid budget doubled in lockstep with the point-doubling
  // migration (coefficients halved, so 2 pts now buy what 1 did) and
  // capped at the per-skill 200 lifetime pool of the uniform economy.
  _sanitizeHpSpec(src, ps) {
    return this._sanitizeGridSpec(src, HP_CHANNEL_KEYS, ps ? Math.min(200, 2 * (ps.vitality || 0)) : undefined);
  },
  _sanitizeEnduranceSpec(src, ps) {
    return this._sanitizeGridSpec(src, ENDURANCE_CHANNEL_KEYS, ps ? Math.min(200, 2 * (ps.endurance || 0)) : undefined);
  },
  // Grid channel multipliers, mirrored in src/data/gameSystems.js.
  // Vigor +0.5%/pt maxHp (cap +25%); Recovery +1%/pt on DISCRETE heals
  // (cap +50%) — deliberately NOT on the melee-lifesteal refund, which
  // already returns 90% of damage taken (any boost pushes it past 100%
  // and mints infinite melee sustain); Stamina +1%/pt maxStamina (cap
  // +50%); Conditioning +1%/pt stamina regen (cap +50%); Evasion
  // +0.2%/pt dodge SHARING the 30% cap with agility (BALANCE-PLAN §4
  // shared-caps hard rule); Lifeblood on-kill heal 0.5%/pt maxHp (cap
  // 25%).
  // v2.3.1156: all grid coefficients halved with the 50 -> 100 cap
  // raise — cap values unchanged, stored points doubled by migration.
  _vigorMult(ps) {
    return 1 + Math.min(0.25, ((ps && ps.hpSpec && ps.hpSpec.vigor) || 0) * 0.0025);
  },
  _recoveryMult(ps) {
    return 1 + Math.min(0.50, ((ps && ps.hpSpec && ps.hpSpec.recovery) || 0) * 0.005);
  },
  _staminaGridMult(ps) {
    return 1 + Math.min(0.50, ((ps && ps.enduranceSpec && ps.enduranceSpec.stamina) || 0) * 0.005);
  },
  _conditioningMult(ps) {
    return 1 + Math.min(0.50, ((ps && ps.enduranceSpec && ps.enduranceSpec.conditioning) || 0) * 0.005);
  },
  _evasionDodge(ps) {
    return ((ps && ps.enduranceSpec && ps.enduranceSpec.evasion) || 0) * 0.001;
  },
  _lifebloodFrac(ps) {
    return Math.min(0.25, ((ps && ps.hpSpec && ps.hpSpec.lifeblood) || 0) * 0.0025);
  },
  // Mirror of the WCH clamp in _handleStatsUpdate, factored out so the join /
  // migration paths apply the SAME [0,99] channel clamp (weaponSpecs feeds the
  // authoritative damage roll, so it can't be stored raw from a join payload).
  _sanitizeWeaponSpecs(src) {
    const WCH = {
      sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
      bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
      staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
    };
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of Object.keys(WCH)) {
      const s = src[cat];
      if (!s || typeof s !== 'object') continue;
      out[cat] = {};
      for (const k of WCH[cat]) {
        if (typeof s[k] === 'number') out[cat][k] = Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(s[k])));
      }
    }
    return out;
  },

  // Apply stats_update payload to playerState.  Client sends after
  // every recalcDerived (BroTown.jsx mutation sites listed in the plan).
  // Clamps current hp to the new maxHp so re-derives that shrink the
  // pool don't leave hp > maxHp.
  // ═══ Stat validation (clamp raw stats to per-level cap) ═══
  //
  // Without this, a client could push stats_update { maxHp: 99999 } and
  // the worker would believe it -- effectively giving themselves an
  // infinite HP bar.  We close this by tracking the 10 raw stats
  // (vit / end / mind / power / etc.) ourselves, clamping each to a
  // per-level cap, and computing maxHp / maxStamina / maxMana from the
  // formulas in src/data/gameSystems.js (calcMaxHp / Stam / Mana).
  //
  // Cap formula: level * 10 + 20.  Each level grants 5 T2 stat points
  // (one stat could legitimately reach level*5+1 just from T2), plus
  // T1 use-trained increments, plus amulet stat bonuses.  level*10+20
  // is ~2x the realistic per-stat ceiling -- generous enough for legit
  // play (preserves T1 + amulet contributions), tight enough to block
  // R.vit = 99999 cheats.
  //
  // Client's pushed maxHp / maxStamina / maxMana are IGNORED -- the
  // worker computes its own from the clamped raw stats.
  _statCap(level) {
    return Math.max(20, (level || 1) * 10 + 20);
  },

  _clampStat(value, level) {
    const cap = this._statCap(level);
    return Math.max(0, Math.min(cap, Math.floor(value || 0)));
  },

  _calcMaxHp(level, vitality) {
    // v2.3.910: flat per-combat-level HP 12 -> 2.5 (mirrors the client
    // HP_PER_COMBAT_LEVEL in gameSystems.js) because combat level now climbs
    // ~5x faster -- it is the sum of the build-skill levels.
    return Math.floor(100 + ((level || 1) - 1) * 2.5 + (vitality || 0) * 10);
  },

  // Armor HP contribution -- mirrors getArmorHp() in
  // src/data/gameSystems.js per docs/specs/t1-t2-stat-redesign-server.md.
  // Phase 1: armor went from damage-reduction (def) to flat-HP.
  // tierMult is clamped to a defensive ceiling (8) so a forged-shape
  // armor with `tierMult: 999` can't inflate maxHp out of bounds.
  _armorHp(armor, vitality) {
    if (!armor) return 0;
    const ARMOR_HP_BASE = 20;
    const ARMOR_TIER_MULT_CAP = 8;  // legit armor tops out around 6×
    const tmRaw = (typeof armor.tierMult === 'number' && armor.tierMult > 0) ? armor.tierMult : 1.0;
    const tm = Math.min(ARMOR_TIER_MULT_CAP, tmRaw);
    return Math.floor(ARMOR_HP_BASE * tm * (1 + (vitality || 0) * 0.01));
  },

  _calcMaxStamina(endurance) {
    return Math.floor(100 + (endurance || 0) * 3);
  },

  _calcMaxMana(mind) {
    return Math.floor(100 + (mind || 0) * 3.5);
  },

  _recomputeMaxes(ps) {
    if (!ps) return;
    // v2.3.910: combat level is DERIVED -- the sum of the use-trained
    // build-skill levels, clamped to 500.  Mirrors recalcDerived on the
    // client and replaces the old 5-build-point gate.
    // v2.3.1138: + defenseSkill.level (the 6th skill; spec Phase 2).
    // Trust posture: defenseSkill is client-trained-but-clamped [0,99]
    // (_sanitizeDefenseSkill), same known-loose class as weaponSkills --
    // a forged claim buys <= +99 level (~ +247 maxHp).  Documented, not
    // fixed here; tightens when training moves fully server-side.
    ps.level = Math.max(1, Math.min(500,
      (ps.power || 0) + (ps.vitality || 0) + (ps.endurance || 0)
      + (ps.agility || 0) + (ps.mind || 0)
      + ((ps.defenseSkill && ps.defenseSkill.level) || 0)));
    const lvl = ps.level;
    const oldMaxHp = ps.maxHp || 100;
    const oldMaxStam = ps.maxStamina || 100;
    const oldMaxMana = ps.maxMana || 100;
    // v2.3.1154: HP-grid Vigor (+0.5%/pt, cap +25%) multiplies the WHOLE
    // pool including armor HP; Endurance-grid Stamina (+1%/pt, cap +50%)
    // multiplies maxStamina.  Mirrors recalcDerived on the client.
    ps.maxHp = Math.floor((this._calcMaxHp(lvl, ps.vitality || 0) + this._armorHp(ps.armor, ps.vitality || 0)) * this._vigorMult(ps));
    ps.maxStamina = Math.floor(this._calcMaxStamina(ps.endurance || 0) * this._staminaGridMult(ps));
    ps.maxMana = this._calcMaxMana(ps.mind || 0);
    // Clamp current values into the new ranges.
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.hp, ps.maxHp);
    if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
    ps.stamina = Math.min(ps.stamina, ps.maxStamina);
    if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
    ps.mana = Math.min(ps.mana, ps.maxMana);
  },

  _handleStatsUpdate(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    const lvl = ps.level || 1;
    // v2.3.1158: mutation gate.  This handler used to _saveRpg AND echo
    // player_state unconditionally, so a client re-sending identical
    // stats (or a stale pre-1156 client disagreeing about derived
    // values) turned every stats_update into a storage put + a full
    // echo — the amplification behind the live "coins flashing / panels
    // thrashing" playtest report.  Snapshot every field this handler
    // can store; persist + echo at the tail ONLY when one changed.
    const relevantSig = () => JSON.stringify([
      ps.power, ps.vitality, ps.endurance, ps.agility, ps.mind,
      ps.weaponSpecs, ps.weaponSkills, ps.weaponUnspent,
      ps.defenseSkill, ps.defenseUnspent, ps.defenseSpec,
      ps.hpSpec, ps.hpUnspent, ps.enduranceSpec, ps.enduranceUnspent,
      ps.armor, ps.def, ps.amuletHpRegen, ps.amuletStaminaRegen,
    ]);
    const preSig = relevantSig();
    // Raw stats: accept client value, clamp to bounds.  T1 stats use
    // the per-level cap (max(20, level*10+20)) since they grow via
    // use-training.  Server computes its own pool maxes from these and
    // ignores any maxHp / maxStamina / maxMana the client tries to push.
    // v2.3.1155: the retired T2 stats are IGNORED, not rejected — old
    // clients keep sending the five keys in every stats_update, and
    // dropping the message would break their T1 syncs too.  They are
    // simply never stored (the strip-retired-t2 migration cleaned the
    // blobs; nothing re-injects them).
    const T1_STATS = ['power', 'vitality', 'endurance', 'agility', 'mind'];
    let statsChanged = false;
    for (const s of T1_STATS) {
      if (typeof payload[s] === 'number') {
        const clamped = this._clampStat(payload[s], lvl);
        if (ps[s] !== clamped) {
          ps[s] = clamped;
          statsChanged = true;
        }
      }
    }
    // v2.3.912: per-weapon-category build channels.  Client-trusted-but-clamped
    // (same posture as the T1 stats above): copy the known channel keys per
    // category, each clamped to [0,99] (mirror WEAPON_CHANNEL_CAP), so the
    // damage + crit channels in _computeAttackDamage are server-authoritative.
    if (payload.weaponSpecs && typeof payload.weaponSpecs === 'object') {
      const WCH = {
        sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
        bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
        staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
      };
      if (!ps.weaponSpecs) ps.weaponSpecs = {};
      for (const cat of Object.keys(WCH)) {
        const src = payload.weaponSpecs[cat];
        if (!src || typeof src !== 'object') continue;
        if (!ps.weaponSpecs[cat]) ps.weaponSpecs[cat] = {};
        for (const k of WCH[cat]) {
          if (typeof src[k] === 'number') {
            const c = Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(src[k]))); // v2.3.1156: 99 -> 100
            if (ps.weaponSpecs[cat][k] !== c) { ps.weaponSpecs[cat][k] = c; statsChanged = true; }
          }
        }
      }
    }
    // v2.3.1021: weapon/defense SKILL TRACK (level / xp / unspent points and
    // the defense channels).  Pure persistence -- client-trained, the server
    // just stores the reported value (sanitized) so it survives reconnect.
    // These don't feed _recomputeMaxes, so they don't toggle statsChanged
    // (no pool refill); _saveRpg below persists them regardless.
    if (payload.weaponSkills && typeof payload.weaponSkills === 'object') {
      ps.weaponSkills = this._sanitizeWeaponSkills(payload.weaponSkills);
    }
    if (payload.weaponUnspent && typeof payload.weaponUnspent === 'object') {
      ps.weaponUnspent = this._sanitizeWeaponUnspent(payload.weaponUnspent);
    }
    if (payload.defenseSkill && typeof payload.defenseSkill === 'object') {
      ps.defenseSkill = this._sanitizeDefenseSkill(payload.defenseSkill);
    }
    if (typeof payload.defenseUnspent === 'number') {
      ps.defenseUnspent = Math.max(0, Math.min(999, Math.floor(payload.defenseUnspent)));
    }
    if (payload.defenseSpec && typeof payload.defenseSpec === 'object') {
      ps.defenseSpec = this._sanitizeDefenseSpec(payload.defenseSpec);
    }
    // v2.3.1154: HP/Endurance grid track.  Same client-trained-but-
    // clamped posture as weaponSpecs, plus the grid budget clamp
    // (sum <= governing stat; see _sanitizeGridSpec).  UNLIKE the
    // v2.3.1021 store-and-echo fields these FLIP statsChanged: vigor
    // and stamina feed _recomputeMaxes, so a spend must recompute the
    // pools the same tick it lands.
    if (payload.hpSpec && typeof payload.hpSpec === 'object') {
      const next = this._sanitizeHpSpec(payload.hpSpec, ps);
      if (JSON.stringify(next) !== JSON.stringify(ps.hpSpec || {})) {
        ps.hpSpec = next;
        statsChanged = true;
      }
    }
    if (typeof payload.hpUnspent === 'number') {
      ps.hpUnspent = Math.max(0, Math.min(999, Math.floor(payload.hpUnspent)));
    }
    if (payload.enduranceSpec && typeof payload.enduranceSpec === 'object') {
      const next = this._sanitizeEnduranceSpec(payload.enduranceSpec, ps);
      if (JSON.stringify(next) !== JSON.stringify(ps.enduranceSpec || {})) {
        ps.enduranceSpec = next;
        statsChanged = true;
      }
    }
    if (typeof payload.enduranceUnspent === 'number') {
      ps.enduranceUnspent = Math.max(0, Math.min(999, Math.floor(payload.enduranceUnspent)));
    }
    // v2.3.1157: the 1000-point combat ceiling — after every per-grid
    // clamp above, truncate whatever pushes the TOTAL allocation past
    // the line (canonical grid order; see _clampBuildTotal).
    // v2.3.1158: whenever any spec/skill input arrived, recompute every
    // unspent pool to the canonical earned-minus-spent (the migration-v7
    // formula, shared via computeCanonicalPools).  Before this, points
    // truncated by the grid-budget clamp or the ceiling above simply
    // VANISHED until the next reconnect re-ran v7 — mid-session the
    // client displayed pools the server no longer agreed with (the
    // "points aren't updating" playtest report).  This also makes the
    // client-reported *Unspent stores above advisory: pools are derived
    // state, and the server derives them.
    if (payload.weaponSpecs || payload.defenseSpec || payload.hpSpec || payload.enduranceSpec) {
      this._clampBuildTotal(ps);
    }
    if (payload.weaponSpecs || payload.weaponSkills || payload.defenseSpec || payload.defenseSkill
        || payload.hpSpec || payload.enduranceSpec || statsChanged) {
      computeCanonicalPools(ps);
    }
    // Armor swap routes through stats_update (not equip_request) because
    // armor lives in a client-only armorStash and the popup mutates it
    // locally before pushing.  Worker accepts the new armor object (or
    // null on unequip), clamps tierMult defensively, recomputes maxHp.
    // Without this, the worker's ps.armor stays stale, its echoed
    // player_state re-applies the old armor on the client, and the
    // local unequip silently undoes itself.
    if ('armor' in payload) {
      const incoming = payload.armor;
      let newArmor = null;
      if (incoming && typeof incoming === 'object' && incoming.name !== 'Leather Armor') {
        // Shallow copy + clamp tierMult.  Mirror the cap from _armorHp
        // so a forged blob with tierMult: 999 can't inflate maxHp.
        // Leather Armor rejected outright per v2.3.249 removal.
        newArmor = { ...incoming };
        if (typeof newArmor.tierMult === 'number') {
          newArmor.tierMult = Math.max(0, Math.min(8, newArmor.tierMult));
        }
      }
      // JSON-compare so an identical re-send doesn't trigger spurious
      // recompute + flush.
      const oldSig = ps.armor ? JSON.stringify(ps.armor) : 'null';
      const newSig = newArmor ? JSON.stringify(newArmor) : 'null';
      if (oldSig !== newSig) {
        // v2.3.1129: guard gear lock -- reject the swap; the
        // player_state echo from the gate snaps the client's local
        // armorStash mutation back (see the comment block above: the
        // echo re-applying ps.armor is exactly the documented
        // self-correction behavior).
        if (this._threatGearLocked(session.id, ps)) {
          // locked: keep the old armor
        } else {
          ps.armor = newArmor;
          statsChanged = true;
        }
      }
    }
    if (statsChanged) {
      // v2.3.910: stats grew -> derived combat level may have risen; refill
      // pools on a gain so a level-up restores HP/stamina/mana as before.
      const prevLevel = ps.level || 1;
      this._recomputeMaxes(ps);
      if ((ps.level || 1) > prevLevel) {
        if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
        if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
        if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      }
    }
    // Session-only equipment-derived values flow from client but are
    // capped to per-level bounds.  Without a cap, a cheater can push
    // def: 999999 and take 1 damage forever (since _applyDamage's
    // `max(1, ceil(r - def * 0.3))` floors at 1).  Same risk for
    // amulet regen mults (60k HP/regen tick).
    //
    // def cap: max armor tier mult is 5 + endurance contribution. At
    // level N, max endurance = level*10+20, contributing 0.5x.  Max
    // armor.tierMult = 5, contributing 3x.  So legit max def = (level*10+20)*0.5 + 15.
    // Cap at 4x that to leave headroom for unknown equipment additions.
    const defCap = lvl * 20 + 100;
    if (typeof payload.def === 'number') {
      ps.def = Math.max(0, Math.min(defCap, payload.def));
    }
    // Amulet regen mults are percentages.  Real amulets cap around 30%
    // per tier; 100% is double, well above any realistic stack.
    if (typeof payload.amuletHpRegen === 'number') {
      ps.amuletHpRegen = Math.max(0, Math.min(100, payload.amuletHpRegen));
    }
    if (typeof payload.amuletStaminaRegen === 'number') {
      ps.amuletStaminaRegen = Math.max(0, Math.min(100, payload.amuletStaminaRegen));
    }
    // v2.3.1158: persist + echo ONLY on real mutation (see preSig at the
    // top).  A no-op stats_update — identical re-send, stale-client
    // disagreement about server-derived values — gets silence, not a
    // full player_state echo, so client/server skew can no longer
    // self-amplify into a visible sync storm.
    if (statsChanged || relevantSig() !== preSig) {
      this._saveRpg(session.id, ps);
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
    }
  },
};
