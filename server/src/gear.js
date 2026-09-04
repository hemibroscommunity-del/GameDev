/* ═══ v2.3.1169 (P4 decomposition): GEAR extracted from index.js ═══
 *
 * Behavior-frozen move of the equipment store out of the GameRoom
 * class body (same mixin pattern as market.js): weapon base table +
 * blob sanitizers (v2.3.1104 anti-forge posture preserved verbatim),
 * sell value + sell handler, the blacksmith/woodworker forge
 * (v2.3.1131 quality mint via this._rollWeaponQuality from
 * hardening.js), equip/unequip (threat gear-lock gates intact), and
 * _handleSetActiveSlot -- hoisted from the inline set_active_slot
 * switch case (the one router edit in this slice; the case now
 * delegates like every other gear case).
 *
 * DELIBERATELY LEFT in index.js: the weapon build-CHANNEL helpers
 * (_wpnCat / _wpnDmgChannel / _wpnCritPts / _wpnCritDmgPts /
 * _attuneMult / _blockStaminaMult).  They are combat-damage inputs
 * read by _computeAttackDamage and the block paths -- the combat
 * region is being reworked in a parallel session and owns them.
 *
 * BLACKSMITH_TIERS / WOODWORKING_TIERS / QUALITY_GRADES mirrors move
 * with their only consumers (mirror-audit still pins them). */

import { BLACKSMITH_TIERS, WOODWORKING_TIERS, QUALITY_GRADES, AMULET_TIER_POWER, AMULET_GEMS } from './data.js';

export const gearMethods = {
  // ═══ Equipment store (opaque blobs + equip_request) ═══
  //
  // Slots tracked on playerState:
  //   weapon         -- active melee weapon
  //   rangedWeapon   -- active ranged weapon (bow / crossbow)
  //   staffWeapon    -- active staff weapon
  //   activeSlot     -- 'melee' | 'ranged' | 'staff' (which is "in hand")
  //   armor          -- equipped armor
  //   shield         -- equipped shield (with off-hand)
  //   amulet         -- equipped amulet
  //   weaponStash    -- array of stored weapons (max WEAPON_STASH_MAX = 8)
  //
  // This slice stores equipment as opaque objects the client provided.
  // v2.3.1104: no longer fully opaque -- weapon blobs pass through
  // _sanitizeWeapon (tierMult clamp) at every entry point (first-connect
  // bootstrap, stored-record load), because server-computed damage
  // (v2.3.912) and sell value both multiply by tierMult.  Sales are
  // paid from the server-tracked stash entry, never a client-supplied
  // object.
  //
  // Mirror of WEAPON_TYPES base damage values from
  // src/data/gameSystems.js.  Used for sell-value math and (later)
  // server-computed weapon damage.  Keep in sync if new weapon types
  // ship to the client.
  _weaponBase(type) {
    // Baseline-10 rescale (÷4.8): greatsword 48->10 (stays hardest).
    // Mirrors WEAPON_TYPES base in src/data/gameSystems.js (the client
    // mirror divides the same table).  Shared by _computeAttackDamage,
    // the _maxWeaponDmg cap, and _weaponSellValue -- sell values scale
    // down 4.8x in lockstep with the client (coins are NOT rescaled).
    /* v2.3.2259 (owner: "Bump up the default weapon DPS of magic and bow.
       They should both start roughly 20% lower than the default melee weapon
       DPS"): bow 7.29 -> 12.80, staff 8.54 -> 13.44.  The full derivation --
       why the reference is the Copper Great Sword, and why the bow's number
       has to be higher than its DPS suggests (its 0.6-0.8 variance band means
       0.70) -- lives on WEAPON_TYPES.bow in src/data/gameSystems.js.  THIS
       TABLE IS THE AUTHORITATIVE ONE: _computeAttackDamage rolls from it, so
       a one-sided edit there would change the item card and nothing else.
       Sell value rides it too (_weaponSellValue): a pine bow goes 4 -> 7
       coins, a pine staff 5 -> 7. */
    const T = { greatsword: 10, sword: 6.67, bow: 12.80, staff: 13.44 };
    /* v2.3.1626: own-property lookup.  The comment below used to
       justify not validating `type` on the grounds that an unknown one
       "already falls back to the fists base" -- true for 'banana',
       FALSE for 'constructor'/'toString'/'valueOf', which resolve to
       truthy INHERITED members and were returned as the base damage.
       A function where a number belongs makes every downstream product
       NaN, and _sanitizeWeapon preserves `type` in both strict and
       default modes, so the poison reached _computeAttackDamage, the
       _maxWeaponDmg cap and _weaponSellValue -- and NaN damage lands in
       SHARED monster hp, so one crafted weapon is everyone's problem.
       Same class as the quests.js AP-farm hole handoff item H closed;
       this table was missed in that sweep (TRAPS #6). */
    return Object.prototype.hasOwnProperty.call(T, type) ? T[type] : 6.25;  // fists fallback (was 30)
  },

  // v2.3.1104: weapon-blob sanitizer (P2 of docs/OPTIMIZATION-ROADMAP.md).
  // Weapon objects enter server state from the client on first-connect
  // bootstrap (and legacy stored blobs predate any validation).  Since
  // v2.3.912 the server's own damage roll multiplies by tierMult, so a
  // forged { tierMult: 9999 } blob inflates AUTHORITATIVE damage and
  // sell value -- the old "opaque blobs are harmless" comment stopped
  // being true when server-computed damage shipped.
  //
  // Clamp tierMult to [0, 8] (max legit forge tier is worldbreaker at
  // 7.84; mirrors the armor clamp in _handleStatsUpdate).  Deliberately
  // does NOT reject unknown weapon types: they already fall back to the
  // fists base (6.25) in _weaponBase, and nulling them would destroy
  // legit items if the client ships a new type before this table learns
  // about it.
  // v2.3.1131: the sanitizer now KNOWS the quality/hardness/temper
  // fields (BALANCE-PLAN's "sanitizers must learn the new fields"
  // warning).  Two postures:
  //   - default (stored blob / server-held stash): CLAMP -- quality to
  //     the enum, hardness to [0,5], temper to [0,9999].  The server
  //     wrote these; keep them.
  //   - strict (client-supplied join bootstrap): STRIP -- quality and
  //     hardness multiply the anti-cheat damage ceiling, so a forged
  //     "godly H5" blob from a fresh client would raise its own cap.
  //     v2.3.1141: drops are server-minted now, so every legit weapon
  //     with quality was minted HERE (forge or drop) and persists via
  //     _saveRpg -- a join blob carrying quality is by definition not
  //     ours.  Strict stays strip.
  _sanitizeWeapon(w, strict) {
    if (!w || typeof w !== 'object') return null;
    const out = { ...w };
    out.tierMult = (typeof out.tierMult === 'number' && out.tierMult > 0)
      ? Math.min(8, out.tierMult) : 1;
    if (strict) {
      delete out.quality;
      delete out.hardness;
      delete out.temper;
    } else {
      if (out.quality !== undefined && !QUALITY_GRADES[out.quality]) delete out.quality;
      if (out.hardness !== undefined) {
        out.hardness = (typeof out.hardness === 'number' && out.hardness > 0)
          ? Math.min(5, Math.floor(out.hardness)) : 0;
      }
      if (out.temper !== undefined) {
        out.temper = (typeof out.temper === 'number' && out.temper > 0)
          ? Math.min(9999, Math.floor(out.temper)) : 0;
      }
    }
    return out;
  },

  _sanitizeWeaponList(arr, strict) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, this.WEAPON_STASH_CAP)
      .map((w) => this._sanitizeWeapon(w, strict))
      .filter(Boolean);
  },

  // v2.3.1180: amulet-blob sanitizer.  Amulets are a client-crafted
  // blob (there is no server amulet forge -- see
  // docs/specs/elemental-completion.md), so ps.amulet arrives at join
  // wholly untrusted from BOTH the bootstrap payload and a stored
  // record (which was itself an unvalidated bootstrap before this
  // slice).  Since v2.3.1139 _computeAttackDamage reads amulet.gem +
  // amulet.tier into the AUTHORITATIVE damage roll (AMULET_TIER_POWER),
  // so a forged blob was a free damage boost.  Whitelist strictly:
  //   - tier MUST be a known AMULET_TIERS key; an unknown tier means we
  //     can't trust the blob -> drop the whole amulet (a forged
  //     'godtier' can't ride the `|| 1.0` fallback while keeping the
  //     rest of the object).
  //   - gem must be one of the nine real elements, else nulled (no
  //     elemDmg bonus; the amulet stays equipped cosmetically).
  //   - keep only the legit {tier, gem, name} shape (name bounded);
  //     strip every other client-supplied field.
  // Applied at both join load sites, so a legacy forged amulet heals on
  // the next reconnect (the v2.3.1104 weapon heal-on-load posture).
  // The residual forgery ceiling is a legit mythic flame amulet
  // (+10.5%) -- accepted until a server amulet-forge handler exists.
  _sanitizeAmulet(a) {
    if (!a || typeof a !== 'object') return null;
    /* v2.3.1626: own-property gate -- what the comment above already
       PROMISED ("we can't trust the blob -> drop the whole amulet", so a
       forged tier "can't ride the || 1.0 fallback").  Truthiness broke
       that promise: AMULET_TIER_POWER['constructor'] is a truthy
       inherited member, so the amulet was KEPT with tier:'constructor'
       and rode into the authoritative damage roll as NaN.  Also heals
       an already-poisoned stored blob on the next reconnect, per the
       v2.3.1104 sanitize-on-load posture (TRAPS #6). */
    if (!Object.prototype.hasOwnProperty.call(AMULET_TIER_POWER, a.tier)) return null;
    const gem = (typeof a.gem === 'string' && AMULET_GEMS.has(a.gem)) ? a.gem : null;
    const out = { tier: a.tier, gem };
    if (typeof a.name === 'string') out.name = a.name.slice(0, 40);
    return out;
  },

  // Sell value mirrors the client at BroTown.jsx ~26613:
  //   ceil((tierMult || 1) * (WEAPON_TYPES[type].base || 30) * 0.5)
  // v2.3.1104: tierMult bounded via _sanitizeWeapon at every entry
  // point; clamp again here so a stale stored blob can't overpay.
  _weaponSellValue(weapon) {
    if (!weapon) return 0;
    const tierMult = (typeof weapon.tierMult === 'number' && weapon.tierMult > 0)
      ? Math.min(8, weapon.tierMult) : 1;
    const base = this._weaponBase(weapon.type);
    return Math.max(1, Math.ceil(tierMult * base * 0.5));
  },

  _handleSellWeapon(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { stashIdx } = payload || {};
    if (!Number.isInteger(stashIdx) || stashIdx < 0) return;
    if (!Array.isArray(ps.weaponStash) || stashIdx >= ps.weaponStash.length) return;
    const weapon = ps.weaponStash[stashIdx];
    if (!weapon) return;
    const sellVal = this._weaponSellValue(weapon);
    ps.weaponStash.splice(stashIdx, 1);
    ps.coins = (ps.coins || 0) + sellVal;
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // equip_request swaps a stash entry with an active equipment slot.
  // Server validates stashIdx is in range + slot name is known.
  // (WEAPON_STASH_CAP set in constructor; mirrors WEAPON_STASH_MAX
  // in src/data/gameSystems.js.)
  _isValidEquipSlot(slot) {
    return slot === 'weapon' || slot === 'rangedWeapon' || slot === 'staffWeapon'
        || slot === 'armor' || slot === 'shield' || slot === 'amulet';
  },

  // ═══ v2.3.1661: THE server equip gate (PROGRESSION-REDESIGN §6) ═══
  //
  // The tier gate was CLIENT-ONLY until now (canEquipItem /
  // meetsStatReq in gameSystems.js) — a modified client could equip
  // any tier at level 1 and the worker's damage roll would happily
  // multiply the forged tierMult.  Resolution order mirrors the
  // client's meetsStatReq: a known gearBase resolves its exact tier
  // index; anything else estimates from tierMult (the same ×6 curve).
  // Weapons gate on the matching trained skill, armor + shield on
  // allocated defense points, amulets on Magic — requirement =
  // tierIndex × 5.  Applies to prog3 players only (_prog3GearOk
  // passes legacy blobs; their client-side gates stay as they were).
  /* ═══ v2.3.1765: THE LADDER STARTS AT THE TIER THE GAME HANDS YOU ═══
   *
   * Owner, on the auto-unequip report: "Copper counts as rung zero."
   *
   * The requirement is the tier's POSITION times five, and both tier tables
   * open with rungs the game no longer starts anyone on.  BLACKSMITH_TIERS
   * begins `wood, copper, iron, …` and WOODWORKING_TIERS begins
   * `wood, softwood, hardwood, pine, …` — while v2.3.1760 made copper the
   * first metal weapon and v2.3.1763 made pine the first wooden one, and
   * tut_1 hands out exactly those three.  So the tutorial's own reward
   * demanded trained sword level 5, and its bow demanded bow level 15, from
   * a character who is level 1 in everything: the sword you are given in the
   * first five minutes cannot be equipped, and the quest text telling you to
   * switch to the bow describes something you cannot do.
   *
   * Measuring from the first tier the game actually starts you on restores
   * the ladder's original SHAPE — copper is rung 0 as iron used to be, iron
   * is rung 1, and each rung above keeps its five-level step.  Everything
   * above the starter slides down by exactly the number of rungs that were
   * inserted below it, which is the owner's call, made explicitly.
   *
   * Mirror: canEquipItem in src/data/gameSystems.js reaches the same numbers
   * by a different road (statReq / 2, where statReq is tierIndex × 10), so
   * the same subtraction has to happen there — pinned by a test. */
  _prog3BaseTier(isWw) {
    return isWw ? 'pine' : 'copper';
  },
  _prog3BaseIdx(table, isWw) {
    const i = Object.keys(table).indexOf(this._prog3BaseTier(isWw));
    return i > 0 ? i : 0;
  },
  /* ═══ v2.3.2124: IRON CARRIES NO REQUIREMENT ═══
   * Owner: "There should not be a 30 defense requirement on iron chest plate.
   * Maybe an early build.  Remove any defense requirement for all iron."
   *
   * The 30 came from the fallback below rather than from any table.  A
   * MONSTER_ARMOR_DROPS piece is minted as `{name, tierMult, slot, mat}` with
   * no `gearBase` (v2.3.1924), so the tier lookup misses and the tierMult
   * curve fires: round((2.0 - 1) x 6) = rung 6, x5 = 30.  Through the TABLE
   * the same metal is rung 2 against copper's rung 1, i.e. 5.  So the drop was
   * asking six times what a forged iron piece asks, purely for lacking a field
   * -- and the client never gated it at all (canEquipItem returns true for
   * anything without a gearBase), so the player equipped it, the worker
   * refused, and until v2.3.2122 the refusal destroyed the piece.
   *
   * The owner's answer is simpler than reconciling those two roads, and it
   * applies to the metal rather than to the drop: iron is free.  Matched on
   * `mat` AND `gearBase` because a dropped piece names its metal in the first
   * and a forged one in the second, and half a fix here reads as the rule
   * working for loot and not for craft. */
  _isIronGear(item) {
    if (!item || typeof item !== 'object') return false;
    return item.mat === 'iron' || item.material === 'iron' || item.gearBase === 'iron';
  },
  _prog3EquipOk(ps, slot, item) {
    if (!ps || !ps.prog3 || !item || typeof item !== 'object') return true;
    /* ═══ v2.3.2125: EVERY SLOT, NOT JUST THE DEFENCE ONES ═══
       v2.3.2124 read "remove any DEFENSE requirement for all iron" narrowly
       and exempted armour and shields alone, on the reasoning that an iron
       greatsword is gated on the SWORD ladder and had not been asked about.
       The owner then said it directly: "Allow iron weapons to be equipped at
       any level.  Exempt iron weapons from requirement too."  So the metal is
       free in every slot, and prog3.test.mjs's "iron still asks for something"
       was pinning a decision that has since been made the other way -- it is
       updated in the same change rather than worked around.
       The ladder itself is untouched above iron: steel and everything past it
       still gate, which drops.test.mjs and prog3.test.mjs both pin so that
       "make iron work" cannot quietly become "delete the gate". */
    if (this._isIronGear(item)) return true;
    let tierIdx = -1;
    let baseIdx = 0;
    if (typeof item.gearBase === 'string') {
      const isWw = item.gearBase.startsWith('ww_');
      const key = isWw ? item.gearBase.slice(3) : item.gearBase;
      const table = isWw ? this._WOODWORKING_TIERS_DATA() : this._BLACKSMITH_TIERS_DATA();
      if (Object.prototype.hasOwnProperty.call(table, key)) {
        tierIdx = Object.keys(table).indexOf(key);
        baseIdx = this._prog3BaseIdx(table, isWw);
      }
    }
    if (tierIdx < 0) {
      const tm = (typeof item.tierMult === 'number' && item.tierMult > 0) ? item.tierMult : 1;
      // Capped at index 19 (20-tier tables): the raw ×6 curve reads
      // 30 at tierMult 6, which would demand trained level 150 on a
      // 100-cap skill — the top tier must stay reachable (req 95).
      tierIdx = Math.max(0, Math.min(19, Math.round((tm - 1) * 6)));
    }
    /* v2.3.1765: rungs above the starting tier, never below zero.  The
       tierMult fallback above keeps baseIdx 0 on purpose — it only fires for
       an item whose gearBase names no tier at all, where there is no table to
       measure a starting rung in, and guessing one would be harsher or looser
       than the table path at random. */
    const req = Math.max(0, tierIdx - baseIdx) * 5;
    if (slot === 'armor' || slot === 'shield') return this._prog3GearOk(ps, 'defense', req);
    if (slot === 'amulet') return this._prog3GearOk(ps, 'magic', req);
    const cat = item.type === 'bow' ? 'bow' : item.type === 'staff' ? 'staff' : 'sword';
    return this._prog3GearOk(ps, cat, req);
  },

  // ═══ Weapon crafting (blacksmith + woodworker) ═══
  //
  // Mirrors BLACKSMITH_TIERS + WOODWORKING_TIERS from src/data/
  // gameSystems.js (20 tiers each).  Only the fields the worker
  // needs are mirrored (minLvl / tierMult / statReq / *Cost +
  // wood resource key for ww).  Display fields (label / color /
  // desc) stay client-only since the worker doesn't render UI.
  //
  // Client sends forge_weapon { weaponType, tierKey, isWoodwork }.
  // Server validates:
  //   - tierKey exists in the matching tier table
  //   - ps.lifeSkills.[blacksmithing|woodworking].level >= minLvl
  //   - ps[required stat] >= statReq (per EQUIP_STAT_MAP)
  //   - ps.inventory has required ore/wood
  //   - ps.coins >= goldCost
  // Then consumes ingredients + coins, mints the new weapon
  // (matches the client weapon shape exactly), swaps old active
  // weapon to stash (rejected if stash full), applies crafting XP,
  // and emits player_state.  Closes the "forge max-tier weapon for
  // free" cheat: a cheater bypassing the local resource consume
  // still gets stomped because the worker re-validates + applies.
  _BLACKSMITH_TIERS_DATA() {
    // 20 tiers from BLACKSMITH_TIERS.  Keep in sync if the client
    // ships new tiers (greatsword/sword forge use these via
    // gearBase = tier key).
    return BLACKSMITH_TIERS;
  },

  _WOODWORKING_TIERS_DATA() {
    return WOODWORKING_TIERS;
  },

  // EQUIP_STAT_MAP mirror.  Used for the forge statReq gate.
  _equipStatFor(weaponType) {
    if (weaponType === 'greatsword') return 'power';
    if (weaponType === 'sword') return 'agility';
    if (weaponType === 'bow') return 'agility';
    if (weaponType === 'staff') return 'mind';
    return 'power';
  },

  _handleForgeWeapon(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: forging mints INTO the active slot -- that's a gear
    // change, so the guard lock covers it (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { weaponType, tierKey, isWoodwork } = payload || {};
    if (weaponType !== 'greatsword' && weaponType !== 'sword' && weaponType !== 'bow' && weaponType !== 'staff') return;
    if (typeof tierKey !== 'string') return;

    // Validate woodwork-vs-blacksmith match with weapon type.
    // Blacksmith forges melee (greatsword/sword); woodworking
    // forges ranged (bow/staff).  Reject mismatches.
    const wantWw = (weaponType === 'bow' || weaponType === 'staff');
    if (wantWw !== !!isWoodwork) return;

    const table = wantWw ? this._WOODWORKING_TIERS_DATA() : this._BLACKSMITH_TIERS_DATA();
    /* v2.3.1626: own-property gate.  With a truthiness check a tierKey
       of 'constructor' resolved to a truthy inherited member, and then
       EVERY gate below compared against undefined and passed:
         skillLvl < tier.minLvl        -> n < undefined -> false
         ps[reqStat] < (tier.statReq||0) -> n < 0       -> false
         (ps.coins||0) < tier.goldCost -> n < undefined -> false
       i.e. a free, unlimited weapon mint with no level, stat, coin or
       resource cost, plus the unconditional crafting XP.  Identical to
       the hole handoff item H closed in quests.js / amulet.js:139 --
       the forge was missed there (TRAPS #6). */
    if (!Object.prototype.hasOwnProperty.call(table, tierKey)) return;
    const tier = table[tierKey];
    if (!tier) return;

    // Skill level gate
    const skillName = wantWw ? 'woodworking' : 'blacksmithing';
    const skillLvl = (ps.lifeSkills && ps.lifeSkills[skillName] && ps.lifeSkills[skillName].level) || 1;
    if (skillLvl < tier.minLvl) return;

    // Stat gate (per EQUIP_STAT_MAP)
    // v2.3.1661 (prog3): the rebuild gates on the matching TRAINED
    // skill at tierIndex × 5 (§6) — this is also where the standing
    // sword mismatch dies (agility vs power: both are Melee now).
    // Client mirror: getGearStatReq/meetsGearReq (gameSystems.js).
    if (ps.prog3) {
      const tierIdx = Object.keys(table).indexOf(tierKey);
      const cat = weaponType === 'bow' ? 'bow' : weaponType === 'staff' ? 'staff' : 'sword';
      if (!this._prog3GearOk(ps, cat, tierIdx * 5)) return;
    } else {
      const reqStat = this._equipStatFor(weaponType);
      if ((ps[reqStat] || 0) < (tier.statReq || 0)) return;
    }

    // Coin + resource validation.
    if ((ps.coins || 0) < tier.goldCost) return;
    if (!ps.inventory) ps.inventory = {};
    /* v2.3.2123: `tier.wood` decides, not `wantWw`.  The blacksmith's first
       tier is a WOODEN weapon and carries a `wood` field now (see
       BLACKSMITH_TIERS.wood) -- keying off which BENCH you are at sent it
       looking for `ore_wood_ore`, which nothing produces. */
    const resourceKey = tier.wood ? ('wood_' + tier.wood) : ('ore_' + tier.oreName + '_ore');
    const have = ps.inventory[resourceKey] || 0;
    const cost = wantWw ? tier.woodCost : tier.oreCost;
    if (have < cost) return;

    // Active slot for the new weapon (matches client logic).
    const slot = (weaponType === 'bow') ? 'rangedWeapon'
               : (weaponType === 'staff') ? 'staffWeapon'
               : 'weapon';

    // Stash full check -- if existing active weapon would need to
    // be stashed but stash is full, reject (matches client where
    // stash.push silently no-ops at cap).  Future: auto-sell oldest.
    const current = ps[slot];
    if (current) {
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return;
    }

    // Apply: consume resources, mint new weapon, swap old to stash.
    ps.inventory[resourceKey] -= cost;
    if (ps.inventory[resourceKey] <= 0) delete ps.inventory[resourceKey];
    ps.coins -= tier.goldCost;

    if (current) {
      ps.weaponStash.push(current);
    }
    ps[slot] = {
      type: weaponType,
      tier: 'common',
      tierMult: tier.tierMult,
      element1: null,
      element2: null,
      isVolatile: false,
      // Name is built client-side from display label; server stores
      // gearBase so the client can reconstruct.
      name: tierKey + ' ' + weaponType,
      gearBase: wantWw ? ('ww_' + tierKey) : tierKey,
      reforgeBonus: null,
      hardenBonus: null,
      // v2.3.1131: §4.6b quality rolled ONCE at mint, immutable
      // (90.1/9/0.9% + godly 1-in-400k); §4.6c hardness starts 0.
      quality: this._rollWeaponQuality(),
      hardness: 0,
      temper: 0,
    };

    // Crafting XP -- mirrors client at the forge sites:
    //   blacksmithing: tier.minLvl * 5
    //   woodworking:   tier.minLvl * 5  (same formula)
    this._addLifeSkillXp(ps, skillName, (tier.minLvl || 1) * 5);

    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // Unequip an active equipment slot.  Weapons move to stash (if
  // room); armor/shield/amulet simply null out since they don't have
  // a stash today.  Closes the cheat where a client unequips locally
  // and gets "lost" gear that server still thinks is equipped --
  // future damage/def math would diverge from client view otherwise.
  _handleUnequipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: guard gear lock (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { slot } = payload || {};
    if (!this._isValidEquipSlot(slot)) return;
    const current = ps[slot];
    if (!current) return;
    // Weapons go to stash; armor/shield/amulet just null out.
    if (slot === 'weapon' || slot === 'rangedWeapon' || slot === 'staffWeapon') {
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return; // stash full -- reject
      ps.weaponStash.push(current);
    }
    ps[slot] = null;
    // v2.3.1159: active-slot repair.  Unequipping the weapon the
    // activeSlot points at used to leave the pointer dangling — the
    // live playtest bug where a player unequips their bow yet the
    // character keeps swinging it: _computeAttackDamage resolved the
    // empty slot's weapon as null and fell back to a default type
    // while ps.activeSlot stayed 'ranged'.  Reset to 'melee' (the
    // fists fallback) so server damage resolution and the client's
    // in-hand display agree.  'weapon' needs no repair: an empty
    // melee slot IS the fists fallback.
    if ((slot === 'rangedWeapon' && ps.activeSlot === 'ranged')
        || (slot === 'staffWeapon' && ps.activeSlot === 'staff')) {
      ps.activeSlot = 'melee';
    }
    // v2.3.1697: armor no longer folds into maxHp (the _armorHp term left
    // _recomputeMaxes this version — armor pays out as damage reduction
    // now, _armorDrMult).  The recompute is KEPT anyway: it is cheap, it
    // is the one place the pools are re-derived after any equipment
    // mutation, and dropping it would leave a stale maxHp behind the day
    // some future armor piece does carry a pool stat.
    if (slot === 'armor') this._recomputeMaxes(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  _handleEquipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: guard gear lock (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { stashIdx, slot } = payload || {};
    if (!this._isValidEquipSlot(slot)) return;
    if (!Number.isInteger(stashIdx) || stashIdx < 0) return;
    if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
    if (stashIdx >= ps.weaponStash.length) return;
    // Swap stash entry with current active slot.  If active slot
    // empty, the stash item moves in and the stash entry becomes
    // null (which we then splice out so stash stays compact).
    const stashItem = ps.weaponStash[stashIdx];
    // Guard against a stash entry that is null/undefined (could
    // happen from a corrupted stored blob from before the
    // splice-on-empty logic existed).  Without this, a cheater
    // could equip a "null" stash entry to wipe the active slot.
    if (!stashItem) return;
    // v2.3.1661 (prog3): the tier gate, server-enforced at last —
    // see _prog3EquipOk above.  Silent reject (the stat_allocate
    // posture); the client's own gate shows the requirement.
    if (!this._prog3EquipOk(ps, slot, stashItem)) return;
    const activeItem = ps[slot] || null;
    ps[slot] = stashItem;
    if (activeItem) {
      ps.weaponStash[stashIdx] = activeItem;
    } else {
      ps.weaponStash.splice(stashIdx, 1);
    }
    // Sanity cap so stash can't grow past the client-side limit even
    // if a cheater somehow inflates it via prior bootstrap.
    if (ps.weaponStash.length > this.WEAPON_STASH_CAP) {
      ps.weaponStash.length = this.WEAPON_STASH_CAP;
    }
    // v2.3.1697: armor no longer changes maxHp (see _handleUnequipRequest
    // above and grids.js _recomputeMaxes) — the recompute stays as the
    // single post-equipment re-derive of the pools.
    if (slot === 'armor') this._recomputeMaxes(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // Persist the player's chosen weapon slot (set_active_slot).
  // Without this, any subsequent player_state (loot / kill / credit
  // event) would carry the worker's stale activeSlot and revert the
  // client's local cycle.  No broadcast back -- the client already
  // updated locally, and the next server-driven player_state will
  // carry the now-fresh persisted value.  (v2.3.1169: hoisted from
  // the inline switch case, byte-identical body.)
  _handleSetActiveSlot(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    const slot = payload && payload.slot;
    if (slot === 'melee' || slot === 'ranged' || slot === 'staff') {
      ps.activeSlot = slot;
      this._saveRpg(session.id, ps);
    }
  },
};
