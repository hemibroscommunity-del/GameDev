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
  /* v2.3.1727: 1.0 -> 0.4.  XP is paid per point of damage DEALT, so
     raising DMG_PER_LEVEL below would have sped levelling up by the same
     factor it sped killing up — the two dials are one system and moving
     either alone regresses the other.  See the pacing note on
     DMG_PER_LEVEL for the measured checkpoints. */
  XP_PER_DMG: 0.4,                   // was the legacy WEAPON_XP_PER_DMG's 1.0
  /* ═══ v2.3.1668: BODY vs ATK (owner, 2026-08-11) ═══
   *
   * "The attack power (crit chance, attack speed, etc) are specific to the
   * combat type (bow melee or magic)."  v2.3.1659 shipped all seven as one
   * global set, following the design paper's §4 collapse table, which
   * folded the three per-weapon crit channels into one.  That reads wrong
   * in play: a bow build's crit has nothing to do with a staff, and the
   * old T2 system was per-weapon for exactly that reason.
   *
   * BODY stats are global — they describe your character, not the thing in
   * your hands, and "Melee HP vs Bow HP" is not a distinction anyone can
   * justify.  ATK stats are allocated PER COMBAT TYPE, so specialising in
   * Bow means investing in Bow's crit specifically.
   *
   * The point pool stays SINGLE and shared, which is what keeps the choice
   * sharp: points spent on Melee's crit are points not spent on Magic's.
   */
  BODY: {
    def:     { cap: 100, per: 0.004 },  // −0.4% damage taken/pt → −40%
    hp:      { cap: 100, per: 8 },      // +8 max HP/pt → +800
    dodge:   { cap: 75,  per: 0.004 },  // +0.4%/pt → 30%
    stam:    { cap: 100, per: 3 },      // +3 max stamina/pt → +300
  },
  ATK: {
    crit:    { cap: 75,  per: 0.004 },  // +0.4%/pt → 30%, PER TYPE
    critDmg: { cap: 100, per: 2 },      // +2 flat on crits/pt → +200, PER TYPE
    aspd:    { cap: 100, per: 0.0035 }, // −0.35% swing period/pt → −35%, PER TYPE
    // aspd note: 600ms base × 0.65 × the 0.7 lag headroom = 273ms >
    // the 210ms server cadence floor (combat.js), so the existing
    // floor already covers a maxed prog3 build.  If the per-point
    // value ever grows past −50%, the floor must move in lockstep.
  },
  /* ═══ v2.3.1727: THE RETUNE PROGRESSION-REDESIGN #13 DEFERRED ═══
   * Owner, after judging: "The players who are level 13 do not feel
   * significantly more powerful than the level 3 players... I DO want
   * leveling to feel more powerful than current is."
   *
   * They were right, and the numbers below were never meant to survive:
   * §7-A shipped +K/level as a FIRST GUESS "pending the balance-sim
   * retune", and that retune never happened.  What the placeholders bought
   * over ten character levels (3 -> 13, one skill trained, wood greatsword)
   * was +17.7% damage and +18.9% max HP — a 58 HP fodder went from six hits
   * to five.  That is not a power fantasy, it is rounding.
   *
   * Measured with tools/verify-prog3-retune.mjs, which imports the SHIPPED
   * spawn/damage formulas rather than restating them (balance-sim's rule):
   *
   *            damage      fodder    brute     max HP
   *   char 3   10.2->11.5   6->6      7->7     106->118
   *   char 6   10.7->16.0   6->4      7->5     112->136
   *   char 13  12.0->26.5   5->3      6->3     126->178
   *   char 20  13.2->37.0   5->2      6->2     140->220
   *
   * 3 -> 13 is now +130% damage and +51% HP.  Staff keeps its ~20% premium
   * for carrying the widest damage variance (0.5–1.5 vs melee's 0.75–1.25).
   *
   * THE COUPLING THAT MAKES THIS SAFE: XP_PER_DMG dropped to 0.4 in the
   * same commit.  Kill XP is invariant to your damage per hit (killing a
   * monster with H hp always pays H × XP_PER_DMG), so the pacing dial is
   * XP_PER_DMG and the quest table, not this constant — but ship one
   * without the other and the owner's second complaint ("the pace is also
   * too quick") gets worse instead of better.  Both moved; the quest table
   * went to 0.7× alongside (server/src/data.js QUEST_REWARDS, mirrored).
   * Measured pacing: the mayor's visit-buildings quest now lands a player
   * at character level 6 (was 8, and 11 for anyone who fought on the way),
   * against the owner's stated target of 5-6.
   *
   * ANTICHEAT LOCKSTEP: _maxWeaponDmg reads this same constant, so the
   * ceiling tracks the roll by construction — but the CLIENT mirror
   * (src/data/prog3.js) must move in the same commit or every predicted
   * number drifts from the wire (the v2.3.1451 rule).
   */
  DMG_PER_LEVEL: { sword: 1.5, bow: 1.5, staff: 1.8 },
  HP_PER_LEVEL: 6,          // §5-B: 100 + level×6 + hp×8 (v2.3.1727: was 2)
  MANA_PER_MAGIC_LEVEL: 1.2, // §4 audit table: mana follows Magic (mind dies)
};

/* v2.3.1733: the milestone ladder's stamina rung.  The TABLE lives in
   abilities.js (with the ability kits it unlocks); this import is here
   because _prog3Recompute below is the one place max stamina is computed
   for a prog3 player, and the client mirror (recalcDerived) carries the
   same multiplier.  Move one, move both. */
import { staminaMilestoneMult, MILESTONES } from './abilities.js';

/* XP to go from trained level L to L+1.  The legacy weaponXpRequired
 * curve (280 × 1.16^L, gameSystems.js) reused verbatim (§3-A), shifted
 * one because prog3 skills are 1-based where the legacy track was
 * 0-based: cost(1→2) here == cost(0→1) there, so XP carried by the
 * respec lands on exactly the level it had earned. */
export function prog3XpRequired(level) {
  return Math.ceil(280 * Math.pow(1.16, Math.max(0, (level || 1) - 1)));
}

/* v2.3.1668: the global BODY allocation. */
export function prog3FreshAlloc() {
  return { def: 0, hp: 0, dodge: 0, stam: 0 };
}
/* v2.3.1668: the per-combat-type OFFENSE allocation, one block per skill.
 * Object.create(null) is not needed here — the keys are OUR constants, not
 * client-supplied — but the shape must always carry all three so every
 * read site can index it without a presence check. */
export function prog3FreshAtk() {
  const out = {};
  for (const cat of PROG3.SKILLS) out[cat] = { crit: 0, critDmg: 0, aspd: 0 };
  return out;
}
/* Which table owns a stat name.  Returns null for anything unknown, which
 * is what the allocation endpoint's whitelist leans on. */
export function prog3StatDef(stat) {
  if (Object.prototype.hasOwnProperty.call(PROG3.BODY, stat)) return { def: PROG3.BODY[stat], scope: 'body' };
  if (Object.prototype.hasOwnProperty.call(PROG3.ATK, stat)) return { def: PROG3.ATK[stat], scope: 'atk' };
  return null;
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
  /* v2.3.1733: `ms` starts at 0 so a respecced veteran is paid every
     milestone bonus point they have already earned, once, on their next
     level-up or join (see _prog3GrantMilestones). */
  return { sk, alloc: prog3FreshAlloc(), atk: prog3FreshAtk(), pool, ms: 0 };
}

/* v2.3.1668: fold a v10-shaped prog3 (one global alloc holding all seven
 * stats) into the BODY/ATK split.  The three offense stats are REFUNDED to
 * the pool rather than copied into each type: copying would multiply a
 * player's investment by three for free, and picking one type to receive
 * them would be guessing.  Refunding hands the choice back — which is the
 * whole point of the change.  Idempotent: a blob already carrying `atk` is
 * returned untouched. */
export function prog3SplitAtk(p3) {
  if (!p3 || typeof p3 !== 'object') return p3;
  if (p3.atk && typeof p3.atk === 'object') return p3;
  const a = (p3.alloc && typeof p3.alloc === 'object') ? p3.alloc : {};
  let refund = 0;
  for (const k of Object.keys(PROG3.ATK)) {
    const n = Number(a[k]);
    if (Number.isFinite(n) && n > 0) refund += Math.floor(n);
    delete a[k];
  }
  p3.atk = prog3FreshAtk();
  p3.alloc = {
    def: Math.max(0, Math.floor(Number(a.def) || 0)),
    hp: Math.max(0, Math.floor(Number(a.hp) || 0)),
    dodge: Math.max(0, Math.floor(Number(a.dodge) || 0)),
    stam: Math.max(0, Math.floor(Number(a.stam) || 0)),
  };
  p3.pool = Math.max(0, Math.floor(Number(p3.pool) || 0)) + refund;
  return p3;
}

export const prog3Methods = {
  // Shape-normalize a SERVER-stored prog3 (join adoption, admin
  // restores).  Never fed client input — the join payload is not a
  // source by construction (see header).  Merges onto the fresh shape
  // so every key exists and is bounded.
  _sanitizeProg3(src) {
    const out = prog3FromLegacy(null);
    if (!src || typeof src !== 'object') return out;
    /* v2.3.1668 BOUNDARY HEAL (the v2.3.1152 pattern).  Migration v11 folds
       v10-shaped blobs into the BODY/ATK split, but migrations FAIL OPEN —
       and if v11 didn't run, the loops below would read a missing `atk`,
       write zeros, and the player's offense points would vanish with no
       refund.  Splitting here too makes that unreachable.  Idempotent:
       prog3SplitAtk returns immediately when `atk` already exists.
       Mutates a shallow copy so a caller's stored object is never edited
       as a side effect of sanitizing it. */
    if (!src.atk) src = prog3SplitAtk({ ...src, alloc: { ...(src.alloc || {}) } });
    for (const cat of PROG3.SKILLS) {
      const s = src.sk && src.sk[cat];
      if (s && typeof s === 'object') {
        out.sk[cat].level = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(Number(s.level) || 1)));
        out.sk[cat].xp = Math.max(0, Math.min(1e8, Number(s.xp) || 0));
      }
    }
    for (const k of Object.keys(out.alloc)) {
      const n = src.alloc && Number(src.alloc[k]);
      if (Number.isFinite(n) && n > 0) out.alloc[k] = Math.min(PROG3.BODY[k].cap, Math.floor(n));
    }
    /* v2.3.1668: per-type offense.  Unknown categories and unknown stat
       keys are dropped by construction — the loops walk OUR constants. */
    for (const cat of PROG3.SKILLS) {
      const s = src.atk && src.atk[cat];
      if (!s || typeof s !== 'object') continue;
      for (const k of Object.keys(PROG3.ATK)) {
        const n = Number(s[k]);
        if (Number.isFinite(n) && n > 0) out.atk[cat][k] = Math.min(PROG3.ATK[k].cap, Math.floor(n));
      }
    }
    const p = Number(src.pool);
    if (Number.isFinite(p) && p > 0) out.pool = Math.min(999, Math.floor(p));
    /* v2.3.1733: `ms` = the highest character level whose MILESTONE rewards
       have already been paid (abilities.js _prog3GrantMilestones).  It has
       to survive this sanitizer or every join would re-pay the bonus point
       — a sanitizer that drops a field is how a one-off grant becomes an
       infinite one.  Bounded by the char-level cap. */
    const ms = Number(src.ms);
    if (Number.isFinite(ms) && ms > 0) out.ms = Math.min(PROG3.CHAR_LEVEL_CAP, Math.floor(ms));
    return out;
  },

  /* Allocated points in a PER-TYPE offense stat, bounded read. */
  _prog3AtkPts(ps, cat, stat) {
    const a = ps && ps.prog3 && ps.prog3.atk && ps.prog3.atk[cat];
    const v = a && a[stat];
    const def = PROG3.ATK[stat];
    return (typeof v === 'number' && def) ? Math.max(0, Math.min(def.cap, v)) : 0;
  },

  /* The offense stats for the weapon TYPE being swung.  greatsword shares
     the sword/melee category, matching _wpnCat. */
  _prog3CatFor(type) {
    return type === 'bow' ? 'bow' : type === 'staff' ? 'staff' : 'sword';
  },

  // Allocated points in a stat, bounded read (the caps are enforced at
  // spend time; this re-clamps so a corrupt snapshot stays bounded at
  // every consumption site).
  /* Allocated points in a GLOBAL body stat (def/hp/dodge/stam). */
  _prog3Pts(ps, stat) {
    const p3 = ps && ps.prog3;
    const v = p3 && p3.alloc && p3.alloc[stat];
    const def = PROG3.BODY[stat];
    return (typeof v === 'number' && def) ? Math.max(0, Math.min(def.cap, v)) : 0;
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
  // terms (endurance→stam points, mind→Magic level).
  //
  // v2.3.1697: the armor flat-HP term is GONE from this line too (owner:
  // armor "shouldn't add max hp contribution anymore, just surface real
  // damage mitigation").  It was easy to miss that there are TWO maxHp
  // formulas — this one serves every respecced player, so dropping the
  // fold only in grids.js would have left the live path still paying
  // armor twice (HP here, mitigation in _armorDrMult since v2.3.1679).
  // Mirrored by the prog3 branch of recalcDerived (client) in the same
  // version.  Armor's ONLY combat effect is now the damage reduction.
  _prog3Recompute(ps) {
    if (!ps || !ps.prog3) return;
    ps.level = this._prog3CharLevel(ps);
    ps.maxHp = Math.floor(100 + ps.level * PROG3.HP_PER_LEVEL
      + this._prog3Pts(ps, 'hp') * PROG3.BODY.hp.per);
    /* v2.3.1733: the char-10 "Second Wind" milestone multiplies the whole
       pool (+25%), AFTER the allocated stam points — a milestone that only
       scaled the flat 100 would shrink in value the more you invested,
       which is the opposite of what a level-10 reward should feel like.
       Mirrored by recalcDerived's prog3 branch (src/data/gameSystems.js);
       both read staminaMilestoneMult so the number has one home. */
    ps.maxStamina = Math.floor((100 + this._prog3Pts(ps, 'stam') * PROG3.BODY.stam.per)
      * staminaMilestoneMult(ps.level));
    const magicLvl = (ps.prog3.sk && ps.prog3.sk.staff && ps.prog3.sk.staff.level) || 1;
    ps.maxMana = Math.floor(100 + magicLvl * PROG3.MANA_PER_MAGIC_LEVEL);
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.hp, ps.maxHp);
    if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
    ps.stamina = Math.min(ps.stamina, ps.maxStamina);
    if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
    ps.mana = Math.min(ps.mana, ps.maxMana);
  },

  // ═══ v2.3.1661: tier-gate primitive (PROGRESSION-REDESIGN §6) ═══
  //
  // kind 'sword'|'bow'|'staff' → the trained skill's level;
  // 'defense' → allocated defense POINTS; 'magic' → the staff skill
  // (amulets).  reqValue = tierIndex × 5 (20 tiers → 0..95 against
  // the level-100 cap).  Gates apply AT EQUIP/FORGE TIME only —
  // already-equipped gear is grandfathered (the respec zeroed
  // everyone's defense points; stripping worn armor for it would
  // read as theft).  Non-prog3 players pass (legacy gates apply).
  _prog3GearOk(ps, kind, reqValue) {
    if (!(reqValue > 0)) return true;
    const p3 = ps && ps.prog3;
    if (!p3) return true;
    if (kind === 'defense') return this._prog3Pts(ps, 'def') >= reqValue;
    const cat = kind === 'magic' ? 'staff' : kind;
    const lvl = (p3.sk && p3.sk[cat] && p3.sk[cat].level) || 1;
    return lvl >= reqValue;
  },

  // Per-hit dodge chance (§4: replaces agility×0.0008 + the evasion
  // accumulator; cap 30% at the 75-pt stat cap).
  _prog3DodgePct(ps) {
    return this._prog3Pts(ps, 'dodge') * PROG3.BODY.dodge.per;
  },

  // Incoming-damage multiplier (§4 decision 9-B: % reduction, the
  // game's first real mitigation stat; cap −40%).  Consumed in
  // _applyDamage AFTER the resist buff, floor 1 preserved there.
  _prog3DefMult(ps) {
    return 1 - this._prog3Pts(ps, 'def') * PROG3.BODY.def.per;
  },

  // ═══ Trained XP accrual (§9-A: server-authoritative) ═══
  //
  // Called from _handleMonsterDamage with the CREDITED damage
  // (actualDmg — clamped to the monster's remaining hp, so overkill
  // farming can't inflate the rate) after every landed hit.  cat is
  // resolved server-side from the effective slot (never the raw wire
  // string).  v2.3.1710: specials credit their OWN weapon too (owner
  // decision) — Magic's cross-weapon value is the mana pool every
  // special spends, not the special's skill credit.  See combat.js
  // _maxWeaponDmg for the full note.
  // XP mutations ride in memory between saves — persistence lands on
  // level-up here and on the kill-path _saveRpg like every other
  // combat mutation (the v2.3.1619b write-amplification lesson: no
  // per-hit storage puts).
  /* v2.3.1727: `amount` is DAMAGE by default and XP when opts.flat is set.
     The two were conflated from the start — quests.js hands this method a
     quest's xp reward and it was multiplied by XP_PER_DMG like everything
     else — and the bug was invisible for as long as XP_PER_DMG was exactly
     1.0.  Dropping the rate to 0.4 made it visible and load-bearing: a
     quest advertising 105 xp would quietly have paid 42.  A constant named
     "xp per point of damage" has no business scaling a quest reward, so
     the flat callers now say so and the table's numbers mean what they
     say — which is what makes the quest XP dial safe for the owner to
     tune later without reasoning about the damage rate. */
  _prog3AwardXp(playerId, ps, cat, amount, opts) {
    const p3 = ps && ps.prog3;
    if (!p3 || !p3.sk || !p3.sk[cat] || !(amount > 0)) return;
    const sk = p3.sk[cat];
    if (sk.level >= PROG3.LEVEL_CAP) return;
    sk.xp += (opts && opts.flat) ? amount : amount * PROG3.XP_PER_DMG;
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
      /* v2.3.1733: ...and a character level-up is the ONLY moment a
         milestone rung can be crossed, so this is where the ladder pays
         out (bonus points at 5, the +25% stamina at 10).  It runs BEFORE
         the full-restore below on purpose: crossing 10 raises maxStamina,
         and the restore should hand over the NEW, bigger bar. */
      const _msPts = this._prog3GrantMilestones(playerId, ps);
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      this._saveRpg(playerId, ps);
      const ws = this._wsBySessionId(playerId);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'prog3_level',
            payload: {
              skill: cat, level: sk.level, pool: p3.pool, charLevel: ps.level,
              /* v2.3.1733: what THIS level unlocked, if anything, so the
                 level-up celebration can name it ("Shield Bash unlocked!")
                 instead of the player discovering a new button by accident.
                 Extra fields on an existing PRIVILEGED event — an old
                 client ignores them, so no caps flag is needed. */
              milestone: (MILESTONES[ps.level] && MILESTONES[ps.level].label) || undefined,
              bonusPoints: _msPts || undefined,
              abilities: this._abilityUnlockList(ps),
            },
          }));
        } catch (e) {}
      }
      this._queuePlayerStateFlush(playerId);
      /* v2.3.1664: a level-up is the only moment a chain milestone can be
         crossed, so this is where the on-chain checkpoint is considered.
         FIRE-AND-FORGET BY CONTRACT — this is a combat path, and nothing in
         it may await the network.  A chain outage, an unfunded relayer or a
         missing secret all no-op silently and retry on the next level-up. */
      this._chainScoreOnLevelUp(playerId, ps);
    }
  },

  // ═══ Allocation endpoint (§9: server-validated spend) ═══
  //
  // Wire: prog3_allocate { stat, cat? }.  Gates: prog3 present, stat in
  // the BODY or ATK whitelist (own-property check — '__proto__' etc.
  // fail), pool ≥ 1, and the §6-C double cap: the stat's own hard cap AND
  // min(100, character level) — replaces _statCap for prog3 players.
  //
  // v2.3.1668: an ATK stat additionally requires `cat` (sword|bow|staff),
  // because offense is allocated PER COMBAT TYPE.  A missing or unknown
  // cat is a REJECT, not a default — silently spending a point into Melee
  // because the client forgot to say which weapon it meant is exactly the
  // kind of "helpful" fallback a player would experience as theft.
  //
  // Invalid spends are silently dropped (the stat_allocate posture);
  // success acks with prog3_allocated + a full player_state echo.
  _handleProg3Allocate(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    const p3 = ps && ps.prog3;
    if (!p3) return;
    const stat = payload && payload.stat;
    if (typeof stat !== 'string') return;
    const sd = prog3StatDef(stat);
    if (!sd) return;
    if (!(p3.pool >= 1)) return;

    const levelCap = ps.level || this._prog3CharLevel(ps);
    const cap = Math.min(sd.def.cap, levelCap);

    let cur, apply;
    if (sd.scope === 'atk') {
      const cat = payload && payload.cat;
      if (typeof cat !== 'string' || PROG3.SKILLS.indexOf(cat) < 0) return;
      if (!p3.atk || typeof p3.atk !== 'object') p3.atk = prog3FreshAtk();
      if (!p3.atk[cat] || typeof p3.atk[cat] !== 'object') p3.atk[cat] = { crit: 0, critDmg: 0, aspd: 0 };
      cur = (typeof p3.atk[cat][stat] === 'number') ? p3.atk[cat][stat] : 0;
      if (cur >= cap) return;
      apply = () => { p3.atk[cat][stat] = cur + 1; return { stat, cat, pts: cur + 1 }; };
    } else {
      cur = (typeof p3.alloc[stat] === 'number') ? p3.alloc[stat] : 0;
      if (cur >= cap) return;
      apply = () => { p3.alloc[stat] = cur + 1; return { stat, cat: null, pts: cur + 1 }; };
    }

    const applied = apply();
    p3.pool -= 1;
    this._prog3Recompute(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'prog3_allocated',
          payload: { ...applied, pool: p3.pool },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }
  },
};
