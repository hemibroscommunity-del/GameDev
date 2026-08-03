/* ═══ v2.3.1191 (P4 decomposition): COMBAT extracted from index.js ═══
 *
 * The last large inline system in the GameRoom -- the combat/damage
 * core, moved behavior-frozen (same mixin pattern as market.js):
 *
 *   - _applyDamage -- the ONE place player hp goes down (zone-entry
 *     grace, agility+evasion dodge under the shared 30% cap, resist
 *     buff, Iron Skin, Second Wind), plus the melee-lifesteal pair
 *     _trackMonsterDamage / _applyMeleeLifesteal.
 *   - _maxWeaponDmg / _maxDmgForAttacker -- the weapon-aware
 *     anti-cheat ceilings (assume MAXED channels so legit builds are
 *     never rejected -- the v2.3.1133 pattern).
 *   - _computeAttackDamage -- the server-authoritative player->monster
 *     damage roll (client sends intent, server rolls; v2.3.912).
 *   - _handleMonsterDamage -- the monster_damage handler: hit-cadence
 *     floor (v2.3.1134), server-side elemental status + collision
 *     (v2.3.1114), resonance mana restore (v2.3.1139), sticky aggro,
 *     knockback.
 *   - _resolveMonsterKill -- GDD §7 contribution shares, loot pile
 *     spawn, combat XP + level-ups, Lifeblood, lifesteal settlement.
 *   - _resolvePvPAttack -- §16.12 attacker-favored lag-comp rollback
 *     PvP resolution behind the v2.3.1116 consent gate.
 *
 * Callers that stay in index.js reach these via the prototype, same
 * as every other mixin: _tickMonsters routes monster->player hits
 * through _applyDamage/_trackMonsterDamage and its thorns-reflect +
 * DoT kills through _resolveMonsterKill; the router switch delegates
 * monster_damage / pvp_attack.
 *
 * DELIBERATELY LEFT in index.js: the weapon build-CHANNEL helpers
 * (_wpnCat / _wpnDmgChannel / _wpnCritPts / _wpnCritDmgPts /
 * _attuneMult / _blockStaminaMult).  gear.js's header already
 * documents that boundary; they are read by this module AND the
 * block/stamina paths still in index.js, so they stay put rather
 * than move twice.  Guards: combat-lifecycle, anticheat, elemental2
 * suites (plus tick/persistence for the callers). */

import {
  ELEMENT_STATUS, applyElementStatus, resolveElementCollision,
} from './elemental.js';
import { AMULET_TIER_POWER, t2CounterRate } from './data.js'; // v2.3.1451: t2Accel/T2_UNITS reads replaced by the ps.t2Flat accumulator
import { LIVEOPS } from './liveops.js';

export const combatMethods = {
  // ═══ HP store + damage application (server-authoritative) ═══
  //
  // Server owns current hp; clamps to [0, maxHp].  Damage flows through
  // Per docs/specs/t1-t2-stat-redesign-server.md:
  //   - Phase 1: `def` reduction retired -- armor now folds into maxHp
  //     via _armorHp, no per-hit damage reduction.  Resist cooking buff
  //     still applies (separate mechanic).
  //   - Phase 4: Agility rolls a per-hit passive dodge, capped at 30%.
  //     A successful roll zeros the hit; the caller emits a dodged: true
  //     event so the client can render the popup.
  //   - Phase 2: Full block invuln stays for the monster→player path
  //     (caller short-circuits when blocking) and is enforced here via
  //     isBlock=true (PvP partial-block path callers can opt in).
  //
  // Returns { dmgTaken, dodged } -- dmgTaken is 0 for both block and
  // dodge, dodged disambiguates so the caller can route to the right
  // popup.
  _applyDamage(ps, rawDmg, isBlock) {
    if (!ps) return { dmgTaken: 0, dodged: false, graced: false };
    const r = Math.max(1, Math.round(rawDmg || 0));
    // Zone-entry damage immunity (replaces the prior monster-shove on
    // zone entry).  Short grace window after the player drops into a
    // combat zone so they can orient before hits land.  Returns
    // graced:true so the caller can still track the would-be damage
    // into dmgFromMonster -- otherwise the player kills the monster
    // before any hits register and lifesteal silently produces
    // reason:'no-this-mon' on the kill.
    if (ps._zoneEntryGraceUntil && Date.now() < ps._zoneEntryGraceUntil) {
      return { dmgTaken: 0, dodged: false, graced: true, dmgIntent: r };
    }
    if (isBlock) {
      ps.lastDamageAt = Date.now();
      return { dmgTaken: 0, dodged: false };
    }
    // v2.3.1345 (counter skills): Agility keeps its dice roll (capped
    // 50%); the Evasion CHANNEL is a deterministic accumulator — "a
    // hit MISSES you every N hits", rate 0.005/pt (every 2nd at the
    // cap).  In-memory only (rule 11).  Mirrors client
    // passiveDodgeChance's expected value.
    const dodgePct = Math.min((ps.agility || 0) * 0.0008, 0.50);
    let dodged = Math.random() < dodgePct;
    const _evRate = t2CounterRate((ps.enduranceSpec && ps.enduranceSpec.evasion) || 0);
    if (!dodged && _evRate > 0) {
      ps._evadeAcc = (ps._evadeAcc || 0) + _evRate;
      if (ps._evadeAcc >= 1) { ps._evadeAcc -= 1; dodged = true; }
    }
    if (dodged) {
      ps.lastDamageAt = Date.now();
      return { dmgTaken: 0, dodged: true };
    }
    let dmgTaken = Math.max(1, r);  // def reduction removed (Phase 1)
    // Resist buff (cooking recipe with buff:'resist', power 0.05 = 5%
    // reduction).  Cooking recipe power values are stored as the
    // fractional reduction; mirror the client's intent here.
    if (this._buffActive(ps, 'resist')) {
      dmgTaken = Math.max(1, Math.ceil(dmgTaken * (1 - 0.05)));
    }
    // v2.3.1113: Iron Skin (defense channel, -0.5%/pt, cap -25%) -- mirror
    // of applyIronSkin in src/data/gameSystems.js.  ps.defenseSpec is
    // client-trained but server-clamped [0,50] via _sanitizeDefenseSpec,
    // so the cut is bounded.  Part of the defense-loop revival: the
    // channel existed since v2.3.1021 but was never consumed anywhere.
    const _ironskin = (ps.defenseSpec && ps.defenseSpec.ironskin) || 0;
    if (_ironskin > 0) {
      dmgTaken = Math.max(1, Math.round(dmgTaken - this._t2Flat(ps, 'defense', 'ironskin'))); // v2.3.1451: bench-locked banked soak (was t2Accel), floor 1
    }
    if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    // v2.3.1314: RESILIENCE (HP grid) goes live — big-hit taming only:
    // hits above 20% of max HP are reduced 0.25%/pt (cap 25%), same
    // scale as Iron Skin but spike-selective so the two channels stay
    // distinct.  ps.hpSpec is server-clamped via _sanitizeGridSpec.
    const _resil = (ps.hpSpec && ps.hpSpec.resilience) || 0;
    if (_resil > 0 && dmgTaken > 0.20 * ps.maxHp) {
      dmgTaken = Math.max(1, Math.round(dmgTaken - this._t2Flat(ps, 'hp', 'resilience'))); // v2.3.1451: bench-locked banked soak on big hits (was t2Accel)
    }
    // v2.3.1314: LAST STAND (HP grid, owner-named 5th category) — a
    // killing blow leaves the player at exactly 1 HP instead, once per
    // internal cooldown (120s, -0.5s/pt, floor 70s).  Fires BEFORE the
    // hp write so the death flow never starts; Second Wind below may
    // then top up from 1 (they stack — both are defensive celebrations).
    // _lastStandReadyAt is in-memory only (rule 11): a deploy re-arms it.
    let lastStand = false;
    const _ls = (ps.hpSpec && ps.hpSpec.laststand) || 0;
    if (_ls > 0 && dmgTaken >= ps.hp) {
      const _nowLs = Date.now();
      if (!ps._lastStandReadyAt || _nowLs >= ps._lastStandReadyAt) {
        dmgTaken = Math.max(0, ps.hp - 1);
        // v2.3.1343 (kid-simple reprice): -1s/pt, floor 20s at the cap.
        ps._lastStandReadyAt = _nowLs + Math.max(20000, 120000 - _ls * 1000);
        lastStand = true;
      }
    }
    ps.hp = Math.max(0, ps.hp - dmgTaken);
    ps.lastDamageAt = Date.now();
    // v2.3.1137: SECOND WIND — after SURVIVING an unblocked hit, heal
    // 1% of maxHp per point (cap 50% at the [0,50] defenseSpec clamp)
    // on a 10s internal cooldown.  1%/pt, not 0.5: the balance-sim DF-02
    // gate prices 50 pts vs a band-brute at ~+27% EHP, inside Iron
    // Skin's +33% yardstick band (0.5%/pt bought only +12%).  Never
    // fires on the lethal hit (hp 0 routes to the death flow untouched).
    // Applies to monster AND PvP damage — that's the channel's identity.
    // _secondWindReadyAt is in-memory only (rule 11): a DO restart just
    // re-arms it.
    let secondWind = 0;
    const _sw = (ps.defenseSpec && ps.defenseSpec.secondwind) || 0;
    if (ps.hp > 0 && _sw > 0) {
      const _nowSw = Date.now();
      if (!ps._secondWindReadyAt || _nowSw >= ps._secondWindReadyAt) {
        // v2.3.1451: bench-locked banked heal (was t2Accel) plus
        // Recovery's banked per-heal bonus; Math.min(maxHp) bounds it.
        secondWind = this._t2Flat(ps, 'defense', 'secondwind') + this._recoveryFlat(ps);
        if (secondWind > 0) {
          ps.hp = Math.min(ps.maxHp, ps.hp + secondWind);
          ps._secondWindReadyAt = _nowSw + 10000;
        }
      }
    }
    return { dmgTaken, dodged: false, secondWind, lastStand };
  },

  // ═══ Melee lifesteal (per docs/specs/lifesteal-server.md) ═══
  //
  // Track net damage each monster has dealt to a player; on a melee
  // kill, refund 90% of that accumulated amount as healing.  Only
  // melee kills qualify (ranged/staff use a separate vitality-progress
  // path, not health).  Ephemeral session state -- not persisted.
  _trackMonsterDamage(ps, monsterId, amount) {
    if (!ps || !monsterId || !(amount > 0)) return;
    if (!ps.dmgFromMonster) ps.dmgFromMonster = {};  // proto-ok: keyed by server-minted monster ids
    ps.dmgFromMonster[monsterId] = (ps.dmgFromMonster[monsterId] || 0) + amount;
  },

  // slotOverride: if the client passed an explicit slot in monster_damage
  // (the slot the killing hit was actually struck with), trust that
  // over ps.activeSlot.  ps.activeSlot only updates when the client
  // sends set_active_slot, which the desktop slot-select UI skips --
  // a stale 'ranged' value there silently kills lifesteal for what the
  // player sees as a melee swing.
  //
  // Returns { refund, reason }.  reason is one of:
  //   'ok'           — heal applied, refund > 0
  //   'no-ps'        — attackerPs missing (player disconnected mid-kill)
  //   'not-melee'    — slot resolved to ranged/staff (denied by design)
  //   'no-damage'    — dmgFromMonster map empty (player took no damage from any monster)
  //   'no-this-mon'  — player took damage but not from this specific monster
  // Caller can use reason to surface debug info in the lifesteal_credit
  // event so a "no heal" outcome is diagnosable.
  _applyMeleeLifesteal(ps, monsterId, slotOverride) {
    if (!ps || !monsterId) return { refund: 0, reason: 'no-ps' };
    const slot = slotOverride || ps.activeSlot || 'melee';
    if (slot !== 'melee') return { refund: 0, reason: 'not-melee' };
    if (!ps.dmgFromMonster) return { refund: 0, reason: 'no-damage' };
    const taken = ps.dmgFromMonster[monsterId] || 0;
    if (taken <= 0) return { refund: 0, reason: 'no-this-mon' };
    const refund = Math.ceil(taken * 0.9);
    const maxHp = ps.maxHp || 100;
    ps.hp = Math.min(maxHp, (ps.hp || 0) + refund);
    delete ps.dmgFromMonster[monsterId];
    return { refund, reason: 'ok' };
  },

  // Process player damage to a monster
  // Weapon-aware damage cap.  Replaces the prior level-only cap
  // ((level+5)*100) with a tighter bound computed from the attacker's
  // actual equipped weapon + governing stat (all server-tracked
  // since slices 12 / stat-validation).  Closes the "claim huge
  // damage to one-shot tough monsters" cheat with much less false-
  // positive headroom -- a level 1 player with a wood weapon can no
  // longer claim 600 dmg, only ~350.
  //
  // Formula mirrors calcWeaponDmg in src/data/gameSystems.js:
  //   base = (effBase + stat × 0.1667) × 1.495 × weapon.tierMult
  // then _maxDmgForAttacker multiplies the crit ceiling and a generous
  // 5x "combo + status + amulet + lunge" boost to cover the legit
  // upper bound without rejecting real hits.
  _maxWeaponDmg(ps, isSpecial) {
    if (!ps) return 0;
    const candidates = [ps.weapon, ps.rangedWeapon, ps.staffWeapon].filter(Boolean);
    if (candidates.length === 0) return 6.25; // fists fallback (baseline-10: 30 ÷ 4.8)
    let max = 0;
    // Phase 4a of the T1/T2 spec: Mind scales special attacks; Power
    // still scales normal swings.  Coefficient baseline-10 rescaled
    // (0.8 ÷ 4.8 = 0.1667) so the cap tracks the new damage scale.
    const statBonus = isSpecial ? ((ps.mind || 0) * 0.1667) : ((ps.power || 0) * 0.1667);
    // v2.3.1451 (bench-locked T2): the ceiling reads the attacker's
    // ACTUAL banked damage flat per candidate weapon — the exact
    // number _computeAttackDamage adds, so the cap is lockstep BY
    // CONSTRUCTION (tighter than the old "assume maxed t2Accel"
    // v2.3.1133 pattern, and safe to tighten because the accumulator
    // is server-owned: the client never supplies it, so a cheater
    // can't shrink or inflate their own cap).  Specials stay
    // channel-free, matching _computeAttackDamage.  FORGETTING this
    // term rejects every legit invested-build hit (anticheat.test
    // pins it).
    for (const w of candidates) {
      // v2.3.1131: §4.4 effective base -- (raw + hardness×1.0417) ×
      // quality, BEFORE stat/channel/tierMult.  Identity for legacy
      // weapons (H0/Normal); keeps godly/hardened hits from being
      // rejected as cheats.
      const channelFlat = isSpecial ? 0 : this._wpnDmgFlat(ps, w.type);
      const base = (this._weaponEffBase(w.type, w) + statBonus) * (w.tierMult || 1) + channelFlat;
      if (base > max) max = base;
    }
    return max;
  },

  _maxDmgForAttacker(ps, isSpecial) {
    if (!ps) return 21; // baseline-10: 100 ÷ 4.8
    const maxWpn = this._maxWeaponDmg(ps, isSpecial);
    // v2.3.1345: crit is power-mult + a FLAT accelerating bonus; the
    // ceiling assumes both MAXED (the v2.3.1133 pattern) — forgetting
    // either term rejects legit maxed-build hits.
    const critMult = 1.5 + (ps.power || 0) * 0.001;
    // v2.3.1451: the attacker's ACTUAL banked crit-dmg flat, max
    // across the three categories (the candidate loop in
    // _maxWeaponDmg doesn't know which weapon wins, so cover the
    // largest).  Server-owned accumulator — see _maxWeaponDmg note.
    const critFlatCeil = Math.max(
      this._t2Flat(ps, 'sword', 'executioner'),
      this._t2Flat(ps, 'bow', 'headshot'),
      this._t2Flat(ps, 'staff', 'focus'));
    const comboBoost = 5; // covers combo + status amplifier + amulet elemDmg + lunge mult
    // v2.3.1397: per-weapon special mult (client specialAtkMultFor) —
    // melee/bow 3.0, staff 2.0.  The cap covers the LARGEST so no legit
    // special is rejected.
    const specialMult = isSpecial ? 3.0 : 1.0;
    // Floor baseline-10 rescaled (100 ÷ 4.8 ≈ 21) so it doesn't sit ~10x
    // above a real hit.  Now a sanity backstop on the server's own roll
    // (monster damage is server-computed) AND the PvP dmgBase cap.
    return Math.max(21, Math.ceil((maxWpn * critMult + critFlatCeil) * comboBoost * specialMult));
  },

  // Server-authoritative player->monster damage roll.  Mirrors the
  // client's calcWeaponDmg / calcSpecialDmg (src/data/gameSystems.js)
  // plus calcCritChance / calcCritMult, on the baseline-10 (÷4.8) scale.
  // The client now sends an INTENT (which slot, special or not) instead
  // of a damage number -- the server rolls the actual value here so the
  // last client-trusted-damage cheat vector is closed.
  //
  // NOTE (scoped per the server-computed-damage spec): this roll covers
  // weapon base + governing stat + per-type variance + special (2x) +
  // volatile (1.3x) + cooked damage buff (1.2x) + crit.  It deliberately
  // omits amulet elemDmg / elementalMastery / curse / elemental-collision
  // combo damage -- those stay client-side for now and are a follow-up
  // slice (the server has no elemental-status model).  So an elemental
  // combo build's authoritative damage is weapon-only until then.
  _computeAttackDamage(ps, slot, isSpecial) {
    if (!ps) return { dmg: 1, isCrit: false };
    // Trust the wire slot when it's a known value, else fall back to the
    // server's tracked activeSlot (mirrors the lifesteal slot resolution).
    const eff = (slot === 'melee' || slot === 'ranged' || slot === 'staff')
      ? slot : (ps.activeSlot || 'melee');
    const w = eff === 'ranged' ? ps.rangedWeapon
            : eff === 'staff'  ? ps.staffWeapon
            :                    ps.weapon;
    const type = (w && w.type) || 'greatsword';
    const tierMult = (w && w.tierMult) || 1;
    // Governing stat mirrors client EQUIP_STAT_MAP: melee (greatsword +
    // sword) = power, bow = agility, staff = mind.  All specials scale on
    // Mind regardless of weapon (client calcSpecialDmg).
    const stat = isSpecial ? (ps.mind || 0)
               : type === 'bow'   ? (ps.agility || 0)
               : type === 'staff' ? (ps.mind || 0)
               :                    (ps.power || 0);
    // v2.3.912: + weapon damage channel (edge/drawPower/spellPower) so spent
    // build points raise authoritative damage.  Specials stay channel-free
    // (mirrors client calcSpecialDmg).
    // v2.3.1153: repriced flat-in-tierMult -> multiplier (+49.5% at 99).
    // v2.3.1343 (kid-simple reprice): FLAT +DAMAGE_CHANNEL_FLAT/pt
    // again, added AFTER tier AND variance, before the crit/buff
    // multipliers — "+N damage on every swing", the same number the
    // panel promises, on every roll.  Mirrors client calcWeaponDmg.
    // v2.3.1451 (bench-locked T2): the damage channel's value is the
    // BANKED accumulator for the weapon's category (priced at each
    // point's spend time against that day's benchmark monster), no
    // longer a formula over point counts.  Specials stay channel-free.
    const dmgFlat = isSpecial ? 0 : this._wpnDmgFlat(ps, type);
    // v2.3.1131: _weaponBase -> _weaponEffBase (quality × hardness
    // layers, BALANCE-PLAN §4.4 order: pre-stat, pre-tier).  Reduces
    // exactly to the old formula at Hardness 0 / Normal quality --
    // tools/balance-sim.mjs asserts that equivalence.
    let base = (this._weaponEffBase(type, w) + stat * 0.1667) * tierMult; // 0.8 ÷ 4.8
    // Per-type variance -- same rolls as the client.
    const v = type === 'staff' ? (0.5  + Math.random() * 1.0)
            : type === 'bow'   ? (0.6  + Math.random() * 0.2)
            :                    (0.75 + Math.random() * 0.5);
    base *= v;
    base += dmgFlat; // v2.3.1451: bench-locked banked flat (post-tier post-variance slot unchanged)
    // v2.3.1397 (owner): per-weapon special multiplier — melee (sword/
    // greatsword) and bow specials hit 3x, each staff orb 2x.  Mirrors
    // client specialAtkMultFor (src/data/gameSystems.js).
    if (isSpecial) base *= (type === 'staff' ? 2.0 : 3.0);
    if (w && w.isVolatile) base *= 1.30;               // §4.7 volatile weapon
    if (this._buffActive(ps, 'damage')) base *= 1.20;  // cooked damage buff (client gameLoop.js:2346)
    // Crit (calcCritChance + calcCritMult).
    // v2.3.1345 (counter skills): the crit CHANNEL is a deterministic
    // accumulator — "a LUCKY hit every N hits", never streaky.  Power's
    // baseline stays a dice roll; the channel adds rate 0.005/pt to the
    // per-player accumulator and GUARANTEES a lucky hit each time it
    // crosses 1 (every 2nd hit at the 100-pt cap).  In-memory only
    // (rule 11): a deploy just restarts the count.
    const P = ps.power || 0;
    const baseCrit = Math.max(0, Math.min(1, 40 * P / (P + 200) / 100));
    let isCrit = Math.random() < baseCrit;
    const _critRate = t2CounterRate(this._wpnCritPts(ps, type));
    if (_critRate > 0) {
      ps._luckyAcc = (ps._luckyAcc || 0) + _critRate;
      if (ps._luckyAcc >= 1) { ps._luckyAcc -= 1; isCrit = true; }
    }
    // v2.3.1451: the crit-DMG channel adds its BANKED bench-locked
    // flat on lucky hits (after the power multiplier) — was t2Accel.
    if (isCrit) base = base * (1.5 + P * 0.001) + this._wpnCritDmgFlat(ps, type);
    // v2.3.1139 (item I): the two multipliers the v2.3.912 scope note
    // deliberately omitted, now server-side (the client applies both
    // locally and its numbers finally match the wire truth):
    //   - amulet elemDmg: FLAME-gem amulets boost ELEMENTAL weapons by
    //     1 + (3 + 2.5×tierPower)/100 (monsterCombat.js:76 verbatim;
    //     the _maxDmgForAttacker comboBoost explicitly reserves
    //     headroom for this).
    //   - hexer curse: -30% outgoing damage for 4s after a hexer's
    //     hit lands (ps._cursedUntil stamped in the monster-attack
    //     path).
    if (ps.amulet && ps.amulet.gem === 'flame' && w && w.element1) {
      const tierPower = AMULET_TIER_POWER[ps.amulet.tier] || 1.0;
      const elemDmgPct = Math.round((3 + 2.5 * tierPower) * 10) / 10;
      base *= 1 + elemDmgPct / 100;
    }
    if (ps._cursedUntil && Date.now() < ps._cursedUntil) base *= 0.7;
    return { dmg: Math.max(1, Math.round(base)), isCrit };
  },

  _handleMonsterDamage(session, payload) {
    // Client damage number is no longer trusted -- ignore payload.dmg /
    // payload.isCrit; we keep only the intent (slot + special) + element.
    const { monsterId, zone, element, slot } = payload;
    if (!monsterId || !zone) return;
    const monsters = this.monsters[zone];
    if (!monsters) return;
    const m = monsters.find(x => x.id === monsterId);
    if (!m || !m.alive) return;

    // Apply damage. Clamp the credited amount to the monster's remaining
    // HP so the overkill on the final blow doesn't inflate the killer's
    // contribution share (GDD §7: DPS = damage / monster_max_hp).
    // Also clamp the incoming value to the per-level cap so a cheater
    // can't claim 99999 damage to one-shot tough monsters.
    const attackerPs = this.playerState[session.id];
    const isSpecial = !!payload.special;

    // v2.3.1134: HIT-CADENCE FLOOR.  Until now damage-per-hit was capped
    // but hit FREQUENCY was not -- a hacked client could spam
    // monster_damage far faster than any weapon swings.  Now that Tempo
    // makes cadence a build stat, give it a server backstop keyed per
    // (player, monster) so Cleave/pierce fan-out (many monsters, one
    // swing) can never false-positive.  Two classes:
    //  - normal hits: min gap = 600ms swing x the Tempo CAP (not live
    //    points -- needs no client sync) x ~0.7 lag headroom (mobile
    //    bunches sends).  v2.3.1343: Tempo cap -20% -> -50% (kid-simple
    //    reprice), so the floor resizes 335 -> 210ms IN LOCKSTEP with
    //    client swingCooldownMultFor — ship them together or legit
    //    fast swings get rejected.
    //  - specials: <=3 hits per 1200ms per monster.  The staff special is
    //    a 3-bolt cone that can land all 3 on one target within ~100ms,
    //    and the melee special bypasses the swing cooldown entirely
    //    (playerActions.js resets swingTimer), so specials can't share
    //    the normal floor.  Swipe itself has a 1500ms client cooldown.
    // Excess hits are silently dropped (no reject event -- a cheater
    // learns nothing, a laggy legit client just loses a ghost hit its
    // next authoritative tick corrects).  In-memory only (rule 11).
    if (attackerPs) {
      const nowTs = Date.now();
      if (!attackerPs._monHitCad) attackerPs._monHitCad = new Map();
      let cad = attackerPs._monHitCad.get(monsterId);
      if (!cad) { cad = { n: 0, s: [] }; attackerPs._monHitCad.set(monsterId, cad); }
      if (isSpecial) {
        cad.s = cad.s.filter(t => nowTs - t < 1200);
        if (cad.s.length >= 3) return;
        cad.s.push(nowTs);
      } else {
        if (nowTs - cad.n < 210) return; // v2.3.1343: 335 -> 210 (Tempo cap -50%)
        cad.n = nowTs;
      }
      // Bound the map (fighting packs cycles monsters; oldest-in first-out).
      if (attackerPs._monHitCad.size > 32) {
        for (const k of attackerPs._monHitCad.keys()) {
          if (attackerPs._monHitCad.size <= 24) break;
          attackerPs._monHitCad.delete(k);
        }
      }
    }

    // Server computes the actual damage from server-tracked stats +
    // weapon + the client's intent (slot/special).  _maxDmgForAttacker
    // stays as a cheap sanity clamp on our OWN roll (weapon-aware, slice
    // 16 / T1-T2): special hits get the 2x cap headroom.
    const rolled = this._computeAttackDamage(attackerPs, slot, isSpecial);
    const dmgCap = this._maxDmgForAttacker(attackerPs, isSpecial);
    const rawDmg = Math.max(1, Math.min(dmgCap, rolled.dmg));
    const actualDmg = Math.min(rawDmg, Math.max(0, m.hp));
    // Subtract actualDmg (capped at remaining hp) so m.hp doesn't go
    // negative on overkill -- otherwise the broadcast hpPct goes < 0
    // and any subsequent code reading m.hp sees a nonsensical value.
    m.hp -= actualDmg;

    // Track per-player damage contribution for the kill-time share.
    // dmgByPlayer is created lazily so existing monster snapshots
    // without it stay compatible.
    if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null); // v2.3.1202: player-id-keyed
    m.dmgByPlayer[session.id] = (m.dmgByPlayer[session.id] || 0) + actualDmg;

    // v2.3.1114: SERVER-AUTHORITATIVE ELEMENTAL.  The wire already carried
    // `element` (destructured above) but the server ignored it -- burns,
    // roots and collision detonations only ever mutated the client's local
    // hp prediction, which the next authoritative tick overwrote.  Mirror
    // of the client order (monsterCombat.js:1478/1548): the hit's own
    // status applies first, then a collision consumes the OLDEST
    // different-element status already on the monster.
    if (m.hp > 0 && element && ELEMENT_STATUS[element] && attackerPs) {
      const _now = Date.now();
      applyElementStatus(m, element, session.id, attackerPs.power || 0, _now,
        this._attuneMult(attackerPs));
      // Volatile mirrors _computeAttackDamage's slot resolution.
      const _eff = (slot === 'melee' || slot === 'ranged' || slot === 'staff')
        ? slot : (attackerPs.activeSlot || 'melee');
      const _w = _eff === 'ranged' ? attackerPs.rangedWeapon
               : _eff === 'staff' ? attackerPs.staffWeapon
               : attackerPs.weapon;
      const col = resolveElementCollision(m, element, attackerPs, !!(_w && _w.isVolatile), _now);
      if (col) {
        const colDmg = Math.min(col.dmg, Math.max(0, m.hp));
        m.hp -= colDmg;
        m.dmgByPlayer[session.id] += colDmg;
        this.eventBuffer.push({
          type: 'monster_hit',
          payload: {
            monsterId: m.id, zone, dmg: colDmg, isCrit: false,
            attackerId: session.id, collision: col.id,
            hpPct: Math.max(0, m.hp / m.maxHp),
          },
        });
        // v2.3.1139 (item I): resonance-streak mana restore, finally
        // REAL -- the client has always computed this locally
        // (gameSystems.js §3.5/§5.7) but mana is server-authoritative,
        // so the echo stomped it every flush.  Constants verbatim:
        // 10s streak window, +10%/step capped +50%, restore
        // 4% maxMana × restoration mult, throttled to once per 3s.
        if (attackerPs) {
          if (col.resonating) {
            const streak = attackerPs._resonanceStreak || { count: 0, lastTs: 0 };
            streak.count = (_now - streak.lastTs <= 10000) ? Math.min(streak.count + 1, 5) : 1;
            streak.lastTs = _now;
            attackerPs._resonanceStreak = streak;
            if (!attackerPs._lastCollisionMana || _now - attackerPs._lastCollisionMana >= 3000) {
              attackerPs._lastCollisionMana = _now;
              const streakMult = 1 + Math.min(streak.count * 0.10, 0.50);
              // v2.3.1155: restoration mult deleted with the stat (×1.0
              // for every live player; client mirror deleted in lockstep).
              const restore = Math.round(0.04 * (attackerPs.maxMana || 100) * streakMult);
              if (restore > 0) {
                attackerPs.mana = Math.min(attackerPs.maxMana || 100, (attackerPs.mana || 0) + restore);
                // v2.3.1619b: mana only -> coalesced (see _saveRpgPools).
                this._saveRpgPools(session.id, attackerPs);
                this._queuePlayerStateFlush(session.id);
              }
            }
          } else if (attackerPs._resonanceStreak) {
            attackerPs._resonanceStreak.count = 0; // non-resonating collision breaks the streak
          }
        }
      }
    }

    // Sticky-aggro override -- being hit pulls the monster onto its
    // attacker regardless of proximity, so a player sniping with a bow
    // from outside MONSTER_AGGRO_RANGE doesn't just see the mummy
    // shrug it off and keep wandering.  Re-stamped on every hit, so
    // an active fight keeps the target locked even between proximity
    // checks.  _tickMonsters checks _aggroOverrideUntil first when
    // choosing a target.
    m._aggroOverrideTarget = session.id;
    m._aggroOverrideUntil = Date.now() + 10000;

    // Knockback (client v2.3.222+).  Push the monster directly away
    // from the attacker by kbForce px.  Force ramps with hit type:
    // 60 on special (was 180, reduced 66% per user request), 45 on
    // crit, 30 otherwise.  Clamped to zone bounds so a corner-shove
    // doesn't fling the monster off the map.
    //
    // No AI freeze: the 200 ms _kbUntil lockout used to prevent the
    // monster from chasing back, but combined with monster speed
    // (~22 px/sec) and the player swing cooldown (600 ms), the shove
    // pushed monsters out of the 45 px attack range and they never
    // landed hits between swings -- dmgFromMonster stayed at 0 and
    // lifesteal silently broke.  Monster now resumes chase
    // immediately; visual bounce is briefer but the damage economy
    // works.
    /* v2.3.1435 (owner: "arrow special causes knockback with each chip
       damage — only the first hit should knock back"): the stuck-arrow
       chip ticks declare noKb:true and get no shove.  Player-benefit
       only shrinks (knockback pushes monsters away), so honoring the
       client flag is cheat-neutral. */
    if (attackerPs && payload.noKb !== true) {
      const kbForce = payload.special ? 60 : (rolled.isCrit ? 45 : 30);
      const kbAng = Math.atan2(m.y - attackerPs.y, m.x - attackerPs.x);
      m.x += Math.cos(kbAng) * kbForce;
      m.y += Math.sin(kbAng) * kbForce;
      const zoneCfg = this._getZoneConfig(zone);
      if (zoneCfg) {
        const W = zoneCfg.w * this.TILE;
        const H = zoneCfg.h * this.TILE;
        const edgePad = this.TILE;
        m.x = Math.max(edgePad, Math.min(W - edgePad, m.x));
        m.y = Math.max(edgePad, Math.min(H - edgePad, m.y));
      }
    }

    this._markMonsterDirty(zone, m.id);

    // Push damage event for all clients to see
    this.eventBuffer.push({
      type: 'monster_hit',
      payload: {
        monsterId: m.id,
        zone,
        dmg: actualDmg,
        isCrit: rolled.isCrit,
        attackerId: session.id,
        hpPct: Math.max(0, m.hp / m.maxHp),
      }
    });

    // Kill check -- resolution moved VERBATIM to _resolveMonsterKill
    // (v2.3.1114) so the elemental DoT/collision path can share the same
    // contribution/loot/XP/lifesteal pipeline.
    if (m.hp <= 0) this._resolveMonsterKill(zone, m, session.id, attackerPs, slot);
  },

  // v2.3.1114: kill resolution -- moved verbatim from _handleMonsterDamage
  // (session.id -> killerId, attackerPs -> killerPs; behavior-frozen).
  // Shared by weapon kills and elemental DoT/collision kills.  DoT kills
  // pass slot 'dot' so melee lifesteal correctly denies ('not-melee').
  _resolveMonsterKill(zone, m, killerId, killerPs, slot) {
      m.alive = false;
      // v2.3.1127: dungeon-instance monsters never respawn -- a cleared
      // wave must STAY cleared or _tickDungeons can't advance (the
      // respawn check requires respawnAt > 0, so 0 means "stay dead").
      m.respawnAt = m.noRespawn ? 0 : Date.now() + this.RESPAWN_TIME;

      // GDD §7 — contribution-weighted XP/gold distribution.
      // DPS share = dmgByPlayer[id] / m.maxHp.  We also require the
      // recipient to be alive, connected, and still in the kill zone
      // (anyone who tagged the monster then walked away or died forfeits).
      const contributions = m.dmgByPlayer || {};
      const totalShareDenom = Object.values(contributions).reduce((a, b) => a + b, 0) || 1;
      const xpRecipients = [];
      const goldRecipients = [];
      const shares = {}; // proto-ok: player-keyed transient; join ids gate-hardened v2.3.1202
      for (const [pid, contributed] of Object.entries(contributions)) {
        const ps = this.playerState[pid];
        if (!ps || ps.dead || ps.disconnected || ps.z !== zone) continue;
        const share = contributed / totalShareDenom;
        shares[pid] = share;
        xpRecipients.push(pid);
        // GDD §7: gold cutoff at 0.05 contribution; below → no gold
        if (share >= 0.05) goldRecipients.push(pid);
      }
      // Fallback: if every contributor dropped out (dead/left zone),
      // fall back to last-hit credit so the loot doesn't vanish.
      if (xpRecipients.length === 0) {
        xpRecipients.push(killerId);
        goldRecipients.push(killerId);
        shares[killerId] = 1.0;
      }

      this.eventBuffer.push({
        type: 'monster_kill',
        payload: {
          monsterId: m.id,
          zone,
          killerId: killerId,
          xp: m.xp,
          gold: m.gold,
          level: m.level,
          arch: m.arch,
          element: m.element,
          x: m.x,
          y: m.y,
          // GDD §7 contribution-weighted recipients.  Each gets
          // xp_per_player = m.xp * shares[id], gold_per_player =
          // m.gold * shares[id] if their share >= 0.05.
          recipients: xpRecipients,
          goldRecipients,
          shares,
        }
      });

      // Server-authoritative loot drop.  The pile lives on the worker;
      // clients render it from the broadcast and request pickup via
      // loot_pickup.  Cheaters can't credit themselves coins/inventory
      // without a server-emitted loot_credit acknowledging a valid
      // pickup request (range + recipient + single-claim gates in
      // _handleLootPickup).  The client still applies the credit to
      // local rpg state -- moving that store to the worker is a
      // follow-up slice.
      const pile = this._spawnLootForKill(zone, m, killerId, goldRecipients, shares);
      if (pile) {
        this.eventBuffer.push({
          type: 'loot_drop',
          payload: { pile: this._serializePile(pile) },
        });
      }

      // Server-authoritative combat XP.  For every contribution-weighted
      // recipient (xpRecipients above), apply their share of m.xp to
      // playerState[id].xp + run the level-up loop.  Emit a private
      // combat_credit event so the picker's "+N XP" popup + level-up
      // SFX fire on receive; player_state then carries the new
      // authoritative totals so the client overwrites R.xp / R.level /
      // R.unspentT2.
      for (const rid of xpRecipients) {
        const recipPs = this.playerState[rid];
        if (!recipPs) continue;
        // v2.3.1120: server-authoritative quest kill counters.  Every XP
        // recipient with an active kill-objective quest gets credit (the
        // client used to count EVERY active quest on ANY kill -- kills
        // were advancing trader_2, a gathering quest).  Quest-id keyed,
        // exactly the shape the client predicates read; the flush below
        // echoes it, so the progress UI updates on the same tick.
        this._creditQuestObjective(rid, 'kill', m.arch);
        const share = shares[rid] || 0;
        // v2.3.1150: xp_mult live-ops flag -- the "2x weekend" lever.
        // Clamped [1,4] at read; monster_kill's payload.xp stays base
        // (client prediction is corrected by the player_state echo,
        // rule 20) while combat_credit carries the multiplied truth.
        const xpForRecipient = Math.round((m.xp || 0) * share * this._flagNum('xp_mult', 1, LIVEOPS.XP_MULT_MIN, LIVEOPS.XP_MULT_MAX));
        if (xpForRecipient <= 0) continue;
        const { leveled, levelsGained, newLevel } = this._addCombatXp(recipPs, xpForRecipient);
        // Level-up restores all three pools to max (mirrors the client's
        // existing level-up restore at BroTown.jsx:8973 / 8504 / 9851).
        // Also recompute maxes since level bumps the maxHp formula
        // (each level adds 12 base HP).
        if (leveled) {
          this._recomputeMaxes(recipPs);
          if (typeof recipPs.maxHp === 'number') recipPs.hp = recipPs.maxHp;
          if (typeof recipPs.maxStamina === 'number') recipPs.stamina = recipPs.maxStamina;
          if (typeof recipPs.maxMana === 'number') recipPs.mana = recipPs.maxMana;
        }
        // v2.3.1192 (amulet forge): gold-nugget drop roll, server-rolled
        // now that nuggets are the server-owned forge ingredient
        // (amulet.js).  Killer-only, mirroring the client's legacy roll
        // site (monsterCombat.js "GOLD NUGGET DROP", now gated off under
        // caps.amuletForge).  Rides this recipient's _saveRpg +
        // player_state flush below.
        if (rid === killerId) this._amuletNuggetOnKill(recipPs);
        // v2.3.1198 (gem income): raw-gem drop roll, server-rolled now
        // that gems feed the server-settled Gem Cutter + amulet gem op
        // (amulet.js).  Killer-only, zone-element only, mirroring the
        // client's legacy roll site (monsterCombat.js "GEM DROP FROM
        // MONSTER KILL", now gated off under caps.gems).  Rides the
        // same _saveRpg + player_state flush as the nugget roll above.
        if (rid === killerId) this._gemRawOnKill(recipPs, zone);
        this._saveRpg(rid, recipPs);
        const recipWs = this._wsBySessionId(rid);
        if (recipWs) {
          try {
            recipWs.send(JSON.stringify({
              type: 'combat_credit',
              payload: {
                monsterId: m.id,
                zone,
                xpAmt: xpForRecipient,
                leveled,
                levelsGained,
                newLevel,
              },
            }));
          } catch (e) {}
        }
        this._queuePlayerStateFlush(rid);
      }

      // v2.3.1154: LIFEBLOOD (HP grid) -- on-kill heal, 0.5%/pt of maxHp
      // (cap 25% at 50 pts), killing-blow attribution like lifesteal
      // below.  Applied BEFORE lifesteal so both heals ride the same
      // _saveRpg/player_state flush; deliberately NOT multiplied by
      // Recovery (a %-maxHp heal scaling with another %-heal channel
      // would double-dip the same grid's budget).  Skips dead killers.
      if (killerPs && killerPs.hp > 0) {
        // v2.3.1345: flat accelerating on-kill heal (+15,150 at cap).
        const _lbFlat = this._lifebloodFlat(killerPs);
        if (_lbFlat > 0) {
          const _lbMax = killerPs.maxHp || 100;
          killerPs.hp = Math.min(_lbMax, killerPs.hp + _lbFlat);
        }
      }
      // Melee lifesteal -- refund 90% of net damage the killer took
      // from this monster, if the kill was struck with melee.  Heals
      // the killer (last-hit attribution); party members who tagged
      // but didn't land the kill get nothing.  Mirrors the client's
      // existing applyMeleeLifesteal (slated for removal once this
      // server path is the source of truth).
      // Pass the wire-sent slot through so a desktop slot-select user
      // whose server-side activeSlot didn't get the set_active_slot
      // update still gets the heal on a real melee swing.
      // (v2.3.1154: the 90% refund is deliberately NOT Recovery-boosted
      // -- see _recoveryMult's comment; >100% refunds mint sustain.)
      const { refund, reason } = this._applyMeleeLifesteal(killerPs, m.id, slot);
      // Emit lifesteal_credit even when refund is 0 so the client can
      // log the reason and the user can tell whether the gate failed
      // (vs. the heal landing silently because they were already at
      // max hp).
      const killerWs = this._wsBySessionId(killerId);
      if (killerWs) {
        try {
          killerWs.send(JSON.stringify({
            type: 'lifesteal_credit',
            payload: {
              playerId: killerId,
              monsterId: m.id,
              refund,
              reason,
              // Echo the resolved slot + activeSlot so a stale-state
              // debug session has the full picture.
              slot: slot || null,
              activeSlot: (killerPs && killerPs.activeSlot) || null,
            },
          }));
        } catch (e) {}
        if (refund > 0) {
          // Persist the post-heal hp.  Without a fresh _saveRpg the
          // xpRecipients loop above already wrote the pre-heal hp to
          // storage, so a reconnect would reload the lower value.
          this._saveRpg(killerId, killerPs);
          // Push player_state synchronously so the bumped hp lands the
          // same tick instead of waiting for _flushPendingPlayerStates.
          this._sendPlayerState(killerWs, killerId);
        }
      }

      // Clear contribution tracking for the next life of this monster.
      m.dmgByPlayer = Object.create(null); // v2.3.1202: player-id-keyed
  },

  // §16.12 — Attacker-favored rollback PvP resolution
  //
  // v2.3.1302 PvP tuning (owner decision 2026-07-15, "Both"):
  //   - DMG_SCALE 0.5: PvE dmgBase numbers are balanced against monster
  //     HP pools (thousands); player pools are ~100-300, so a raw
  //     special+crit one-shot both duelists (owner's two-player report).
  //   - DEF mitigation 100/(100+def), PvP ONLY: Phase 1 retired def from
  //     the monster→player path (armor folds into maxHp) but ps.def is
  //     still tracked + clamped in grids.js (defCap = lvl*20+100), so
  //     PvP can consume it without touching PvE math.
  //   - Per-kind range: ranged/staff PvP hits are reported by the CLIENT
  //     at projectile impact (src/game/projectiles.js), which can be up
  //     to the 900px arrow travel limit away — the old flat 250 cap
  //     silently rejected every legitimate bow/magic duel hit (the
  //     "only melee hurts" bug).  kind absent = melee (legacy payload,
  //     byte-identical behavior).
  PVP_TUNING: {
    DMG_SCALE: 0.5,
    RANGE_CAP: { melee: 250, ranged: 950, staff: 950 },
    /* v2.3.1306 hardening (repo-review of v2.3.1302, findings I/II):
       DEF_CAP bounds the def value the mitigation formula will consume.
       ps.def is client-computed (equipment-derived, session-only): the
       grids.js stats_update clamp (lvl*20+100) was deliberately sized
       4x above legit max back when def was INERT (Phase 1 retired it
       from PvE damage), and the join path ingested it with no upper
       bound at all — v2.3.1302 unknowingly turned that into a wagered-
       duel advantage (spoofed def -> near-immunity -> pot by attrition).
       150 caps mitigation at 60%: legit low-level def (~50-75) keeps
       its intended bite, spoofed values gain nothing past the cap.
       CADENCE: _resolvePvPAttack had no hit-rate floor (the monster
       path has had lanes since v2.3.1134) — one socket loop could land
       capped hits every tick.  Same lane shape as monsters: normal
       hits >= 300ms apart per attacker->target pair; specials get a
       burst lane (the staff heavy is 3 bolts per cast) of 3 per 1200ms. */
    DEF_CAP: 150,
    CADENCE_MS: 300,
    SPECIAL_LANE_MAX: 3,
    SPECIAL_LANE_MS: 1200,
  },
  _resolvePvPAttack(attackerSession, payload) {
    const attackerId = attackerSession.id;
    const attackerPs = this.playerState[attackerId];
    if (!attackerPs) return;

    // Calculate rewind depth from attacker's RTT
    const halfRtt = attackerSession.rtt / 2;
    const rewindTicks = Math.min(Math.ceil(halfRtt / this.TICK_RATE), this.LAGCOMP_BUFFER_TICKS);

    // Gate: dead / dying / disconnected attackers can't keep firing
    // PvP hits.  Other handlers (ability_use, eat_request, etc.) all
    // gate on these flags; PvP was missing the check.
    if (attackerPs.dying || attackerPs.dead || attackerPs.disconnected) return;
    // Bound the client-supplied attack geometry so a cheater can't
    // claim a 99999-pixel range or full-circle arc to hit every player
    // in the room.  Realistic max: greatsword arc = PI*0.85 ≈ 2.67 rad;
    // melee reach tops out ~200.  v2.3.1302: ranged/staff hits are
    // reported at projectile impact, so their cap matches the 900px
    // arrow travel limit (projectiles.js) + lag slack.  Unknown kinds
    // fall back to the tight melee cap (fail closed).
    /* v2.3.1306: the projectile-scale cap is honored only when the
       server knows the attacker actually carries the matching weapon
       (join/stats ingest both run _sanitizeWeapon, so these fields are
       shape-validated).  A bare kind:'ranged' claim from a weaponless
       attacker falls back to the melee clamp — the widened cap was a
       zone-scale forgery surface in lawless zones otherwise (repo-review
       finding II: 950px x PI*1.1 arc covers most of a 1024px zone). */
    const kind = (payload.kind === 'ranged' && attackerPs.rangedWeapon) ? 'ranged'
      : (payload.kind === 'staff' && attackerPs.staffWeapon) ? 'staff'
      : 'melee';
    const rangeCap = this.PVP_TUNING.RANGE_CAP[kind];
    const range = Math.max(10, Math.min(rangeCap, payload.range || 40));
    /* v2.3.1306: optional single-target hint.  The new-client projectile
       path always aims at ONE intended player (duel opponent / tap-lock)
       and now says so — the server then skips every other player in the
       cone, closing the honest-fire bystander-collateral gap the client
       comment promised but only the client enforced.  Absent (old
       clients, melee) = cone behavior unchanged. */
    const onlyTarget = typeof payload.target === 'string' ? payload.target : null;
    /* v2.3.1343: arc clamp PI*1.1 -> PI*1.41 — it was sized to the
       greatsword's PI*0.85 base + the old +45° Cleave cap; the
       kid-simple reprice raises Cleave to +100° (253° ≈ PI*1.406). */
    const arc = Math.max(0.1, Math.min(Math.PI * 1.41, payload.arc || 1.2));
    const angle = payload.angle || 0;
    // Weapon-aware cap (slice 16) -- mirrors monster_damage cap above.
    // Server now owns the weapon table so the bound is tighter than
    // the previous level-only formula.  Pass payload.special if the
    // PvP attack is a swipe so the Mind-scaled cap applies.
    const dmgCap = this._maxDmgForAttacker(attackerPs, !!payload.special);
    const dmgBase = Math.max(1, Math.min(dmgCap, payload.dmgBase || 10));
    const critChance = Math.max(0, Math.min(100, payload.critChance || 0));

    // Check all players in room for hits
    for (const [targetId, targetPs] of Object.entries(this.playerState)) {
      if (targetId === attackerId) continue;
      if (onlyTarget && targetId !== onlyTarget) continue; // v2.3.1306: declared single target
      if (targetPs.z !== attackerPs.z) continue; // different zone
      if (targetPs.dead || targetPs.disconnected) continue;
      // v2.3.1116: consent gate.  Damage lands only in lawless zones
      // (data.js ZONES flag) or between a consented pair (duel /
      // accepted threat).  Town and any unknown zone fail CLOSED --
      // town was never in ZONES, and before this gate that meant "no
      // rule at all": anyone could gank anyone in town with a full
      // death-pile drop.  Duels still work in town via the pair.
      if (!this._pvpAllowed(attackerId, targetId, attackerPs.z)) continue;

      // §16.12 — Look up target's historical state
      const history = this.stateHistory[targetId];
      let checkState = targetPs; // fallback: current state
      if (history && history.length > 0) {
        const idx = Math.max(0, history.length - 1 - rewindTicks);
        checkState = history[idx] || targetPs;
      }

      // Range check against historical position
      const dx = checkState.x - attackerPs.x;
      const dy = checkState.y - attackerPs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;

      // Arc check
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > arc / 2) continue;

      /* v2.3.1306: per-(attacker,target) hit-cadence floor — mirrors
         the monster-damage lanes (v2.3.1134).  In-memory only (rule 11:
         a deploy wipe just re-opens the lane, loss costs nothing).
         Map, not {}, per the '__proto__' key rule — both ids are
         client-supplied. */
      if (!this._pvpHitLanes) this._pvpHitLanes = new Map();
      if (this._pvpHitLanes.size > 2000) this._pvpHitLanes.clear(); // stale-pair backstop
      {
        const laneKey = attackerId + '>' + targetId;
        const now = Date.now();
        let lane = this._pvpHitLanes.get(laneKey);
        if (!lane) { lane = { lastTs: 0, spStart: 0, spCount: 0 }; this._pvpHitLanes.set(laneKey, lane); }
        if (payload.special) {
          if (now - lane.spStart > this.PVP_TUNING.SPECIAL_LANE_MS) { lane.spStart = now; lane.spCount = 0; }
          if (lane.spCount >= this.PVP_TUNING.SPECIAL_LANE_MAX) continue;
          lane.spCount++;
        } else {
          if (now - lane.lastTs < this.PVP_TUNING.CADENCE_MS) continue;
          lane.lastTs = now;
        }
      }

      // §16.12 — Resolve dodge/block against historical state
      if (checkState.dodging) continue; // was in i-frames from attacker's perspective

      let blocked = false;
      if (checkState.blocking) blocked = true;

      // Crit roll
      const isCrit = Math.random() * 100 < critChance;

      // Apply HP damage server-side.  Per Phase 2 of the T1/T2 spec,
      // a blocked hit is full invuln (was 0.25× partial), so pass
      // isBlock=true straight through.  Phase 4 dodge rolls inside
      // _applyDamage independently of block.
      // v2.3.1302: PvP-only balance pass — 0.5× global scale plus
      // 100/(100+def) mitigation from the target's server-clamped def
      // stat (see PVP_TUNING above).  _applyDamage floors at 1 so a
      // maxed-def target still takes chip damage.
      /* v2.3.1306: DEF_CAP bounds the consumed def (see PVP_TUNING) —
         ps.def is client-derived and its ingest clamps were sized for
         the retired Phase-1 formula, not for use as a damage divisor. */
      const effDef = Math.min(this.PVP_TUNING.DEF_CAP, Math.max(0, targetPs.def || 0));
      const defMit = 100 / (100 + effDef);
      const rawDmg = dmgBase * (isCrit ? 1.5 : 1) * this.PVP_TUNING.DMG_SCALE * defMit;
      const dmgResult = this._applyDamage(targetPs, rawDmg, blocked);
      const dmgTaken = dmgResult.dmgTaken;

      // Build hit event — server-authoritative hp now mirrors via
      // player_state below, but dmgTaken in the payload drives the
      // damage popup so it doesn't have to wait a round-trip.
      const hitEvent = {
        type: 'pvp_hit',
        payload: {
          attacker: attackerId,
          attackerName: attackerSession.name,
          target: targetId,
          dmgBase: dmgBase,
          dmgTaken,
          isCrit: isCrit,
          blocked: blocked,
          dodged: dmgResult.dodged,
          // v2.3.1137: Second Wind fires in PvP too (channel identity);
          // undefined when 0 so the field stays off the wire.
          secondWind: dmgResult.secondWind || undefined,
          // v2.3.1314: Last Stand fires in PvP too.
          lastStand: dmgResult.lastStand || undefined,
          // v2.3.1306: authoritative death flag.  The target client's
          // "would die" prediction ran stale local hp against dmgTaken
          // and fed the attacker's pvpKills ledger via pvp_confirmed —
          // multi-bolt casts (3 pvp_hits before one player_state flush)
          // made both under-count (staggered kill) and phantom-kill
          // (Second Wind saved the target mid-window) routine.  New
          // clients prefer this flag; old clients ignore it.
          died: targetPs.hp <= 0,
          ts: Date.now(),
          rewindTicks: rewindTicks,
        }
      };
      this.eventBuffer.push(hitEvent);

      // Echo authoritative hp + death check.
      this._saveRpgVitals(targetId, targetPs); // v2.3.1623: coalesced unless near death
      this._queuePlayerStateFlush(targetId);
      if (targetPs.hp <= 0 && !targetPs.dying) {
        this._handlePlayerDeath(targetPs, targetId, 'pvp:' + attackerId);
      }
    }
  },
};
