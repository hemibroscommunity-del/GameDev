/* ═══ v2.3.1131: QUALITY GRADES + HARDENING v1 (handoff backlog item E;
 * BALANCE-PLAN §4.6b/§4.6c adopted specs; spec in
 * docs/specs/hardening.md) ═══
 *
 * Two new loot layers in their canonical §4.4 positions:
 *
 *   effective_base = (weapon_base + hardness × 1.0417) × quality_mult
 *   damage         = (effective_base + stat × 0.1667 + channel) × tierMult × ...
 *
 * QUALITY (§4.6b): rolled ONCE at server mint, immutable.  Normal
 * 90.1% ×1.0 / Rare 9% ×1.2 / Elite 0.9% ×1.5 / Godly 1-in-400,000
 * ×3.0.  v1 rolled at the FORGE only; v2.3.1141 added the second mint
 * site -- server-rolled monster weapon drops (_rollWeaponDropForKill,
 * index.js), which roll quality at DROP time with the mystery reveal
 * (§4.6b.ii: pile broadcast hides quality; the private loot_credit
 * reveals it).  Join-time strict-strip still applies to client blobs.
 * At Hardness 0 / Normal the formula reduces EXACTLY to the live one
 * (tools/balance-sim.mjs asserts this equivalence at startup; keep the
 * structures matched so they can't drift).
 *
 * HARDENING (§4.6c): the endgame Blacksmith lottery.  H0→5 ladder at
 * 80/20/5/1/0.5%, gold 500×4^level per attempt (v2.3.3139: 500×2^level and
 * level+1 bars -- or, for a bow or a staff, level+1 HARDENED WOOD of its own
 * wood (hardenedwood.js) -- the owner's: HARDEN, hardenMaterialFor), +1.0417 effective base
 * per level (GDD's +5 ÷ 4.8 code scale).  Failure resets hardness by
 * the TEMPER pity band (checked on the temper BEFORE this failure):
 * 0-19 → reset to 0 · 20-49 → -2 · 50-99 → -1 · 100+ → no reset.
 * Temper +1 per fail, 0 on success.  Blacksmith skill gates ACCESS
 * (max hardenable tier index = floor(skill/5)), never odds.
 *
 * NAME COLLISION WARNING: the client already has a DIFFERENT "harden"
 * -- the reforge-affix doubler that writes weapon.hardenBonus
 * (ForgePanel, client-only stat affixes).  This system deliberately
 * uses DISTINCT fields (weapon.hardness int 0-5, weapon.temper int)
 * and a distinct wire verb (harden_weapon); do not merge them.
 *
 * Ledgers (§17.5 / INV-27) live under storage keys, NOT the rpg blob
 * (fixed-field rule): harden_ledger:<pid> (last 50 attempts) and
 * harden_h5_log (global H5 timestamps, 90-day window — monitoring
 * only, never enforcement). */

import { QUALITY_GRADES, BLACKSMITH_TIERS, WOODWORKING_TIERS } from './data.js';
import { HARDENED_WOOD } from './hardenedwood.js';

export const HARDEN = {
  MAX: 5,
  ODDS: [0.80, 0.20, 0.05, 0.01, 0.005], // success chance for H(i) -> H(i+1)
  COST_BASE: 500,
  /* v2.3.3139: the owner: "a doubling gold cost per level ... 500 for lvl 1,
     1000 for lvl 2, 2000 for lvl 3, etc" -- 500 x 2^currentHardness: 500,
     1,000, 2,000, 4,000 and 8,000 for the attempt at H1..H5.  It was x4 (to
     128,000 for the last), which `hardenmats: false` still charges. */
  COST_FACTOR: 2,
  OLD_COST_FACTOR: 4,
  /* v2.3.3139: and a MATERIAL -- "hardening lvl 1 cost 1 bar, hardening lvl 2
     costs 2 bars": the attempt at H(n) takes n of it, every attempt, won or
     lost, like the gold.  Bars for a sword, hardened wood for a bow or a staff
     ("for the number required and gold too"): hardenMaterialFor below. */
  MATS_PER_LEVEL: 1,
  BASE_BONUS: 1.0417,                     // +5 GDD base ÷ 4.8 code scale, per level
  LEDGER_CAP: 50,
  H5_WINDOW_MS: 90 * 24 * 3600 * 1000,    // INV-27 monitoring window
};

/* ═══ v2.3.3139: WHAT A WEAPON'S HARDENING TAKES ═══
   METAL -- by the weapon's material tier, the very index the Smithing gate
   reads (_weaponTierIndex): tiers 1-2 copper, tier 3 iron, tier 4 and up black
   steel.  So every metal blade with bars of its own takes its own metal's
   (copper, iron, black steel), and the rest the nearest the forge makes: the
   wood tier copper; titanium and beyond black steel, until their own bars
   exist.
   WOOD -- a bow or a staff takes HARDENED WOOD of its own wood (the owner:
   "5 logs of the raw material can make one 'hardened (name) wood' raw
   material so it mirrors the same structure"): a pine bow Hardened Pine Wood,
   a maple staff Hardened Maple Wood, by its tier in WOODWORKING_TIERS -- the
   woods past maple the last, until their own logs grow.  The first cut put
   bows and staffs on bars by their wood's tier; the owner's answer replaced it.
   What is wood: a `ww_` gearBase, or the bow's and the staff's own slots (an
   old bow with no `ww_` gearBase is ranked by tierMult, as the gate does). */
export const HARDEN_BAR_BY_TIER = ['bar_copper', 'bar_copper', 'bar_iron', 'bar_black_steel'];
export const HARDEN_WOOD_BY_TIER = Object.keys(WOODWORKING_TIERS)
  .map((t) => Object.keys(HARDENED_WOOD.RECIPES).find((k) => HARDENED_WOOD.RECIPES[k].tier === t))
  .filter(Boolean);
/* A material's name, one and many (the refusal says "Need 3 Iron Bars", "Need
   2 Hardened Pine Wood"). */
export const HARDEN_MATERIAL_NAMES = Object.assign(Object.create(null), {
  bar_copper: ['Copper Bar', 'Copper Bars'], bar_iron: ['Iron Bar', 'Iron Bars'], bar_black_steel: ['Black Steel Bar', 'Black Steel Bars'],
});
for (const k of Object.keys(HARDENED_WOOD.RECIPES)) HARDEN_MATERIAL_NAMES[k] = [HARDENED_WOOD.RECIPES[k].name, HARDENED_WOOD.RECIPES[k].name];
export function hardenMaterialWord(key, n) {
  const w = HARDEN_MATERIAL_NAMES[key];
  return n + ' ' + (w ? w[n === 1 ? 0 : 1] : key);
}
/** Is this weapon hardened with wood?  A `ww_` gearBase, or the bow's or the
    staff's slot. */
export function hardenIsWood(w, slot) {
  const gb = w && typeof w.gearBase === 'string' ? w.gearBase : '';
  return gb.indexOf('ww_') === 0 || slot === 'rangedWeapon' || slot === 'staffWeapon';
}
/** The material a weapon of material tier `tierIdx` (1-based) takes: its
    metal's bars, or for wood its wood's hardened wood. */
export function hardenMaterialFor(tierIdx, wood) {
  const table = wood ? HARDEN_WOOD_BY_TIER : HARDEN_BAR_BY_TIER;
  const i = Math.max(1, Math.floor(Number(tierIdx) || 1));
  return table[Math.min(i, table.length) - 1];
}
/** How many the attempt from `hardness` takes: the level it reaches. */
export function hardenAmountFor(hardness) {
  return (Math.max(0, Math.floor(Number(hardness) || 0)) + 1) * HARDEN.MATS_PER_LEVEL;
}
/** The gold the attempt from `hardness` takes; `old` is the ladder before
    v2.3.3139 (the kill switch's). */
export function hardenGoldFor(hardness, old) {
  return HARDEN.COST_BASE * Math.pow(old ? HARDEN.OLD_COST_FACTOR : HARDEN.COST_FACTOR, Math.max(0, Math.floor(Number(hardness) || 0)));
}

// §4.6b drop table, cumulative from the rare end.
/* v2.3.2664: godly 1 in 400,000 → 1 in 2,000,000 (owner: "literally one in
   millions"), paid for by what godly now does (data.js QUALITY_GRADES). */
const Q_GODLY = 1 / 2000000;
const Q_ELITE = 0.009;
const Q_RARE = 0.09;

export const hardeningMethods = {
  _rollWeaponQuality() {
    const r = Math.random();
    if (r < Q_GODLY) return 'godly';
    if (r < Q_GODLY + Q_ELITE) return 'elite';
    if (r < Q_GODLY + Q_ELITE + Q_RARE) return 'rare';
    return 'normal';
  },

  // The §4.4 effective base: what the damage sites feed in place of
  // the raw _weaponBase.  Missing fields = legacy weapon = identity.
  /* v2.3.2664: HARDNESS only.  Quality moved OUT of the base to multiply the
     whole hit (data.js weaponQualityMult, applied by _computeAttackDamage and
     _maxWeaponDmg after tierMult) — on the base alone it faded to nothing as
     the skill term grew. */
  _weaponEffBase(type, w) {
    const raw = this._weaponBase(type);
    const h = (w && typeof w.hardness === 'number') ? Math.max(0, Math.min(HARDEN.MAX, w.hardness)) : 0;
    return raw + h * HARDEN.BASE_BONUS;
  },

  // Material-tier index for the Blacksmith access gate.  gearBase
  // carries the forge tier key ('iron' / 'ww_oak'); legacy or dropped
  // weapons without one are ranked by tierMult against the blacksmith
  // ladder (approximate, always >= 1 so a level-5 smith can start).
  _weaponTierIndex(w) {
    if (!w) return 1;
    const gb = typeof w.gearBase === 'string' ? w.gearBase : '';
    const ww = gb.startsWith('ww_');
    const table = ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
    const key = ww ? gb.slice(3) : gb;
    const keys = Object.keys(table);
    const idx = keys.indexOf(key);
    if (idx >= 0) return idx + 1;
    const tm = w.tierMult || 1;
    return Math.max(1, Object.values(BLACKSMITH_TIERS).filter((t) => t.tierMult <= tm).length);
  },

  /* v2.3.3139: the kill switch, read the smelting way (smelting.js
     _smeltOff): `hardenmats: false` in liveflags puts hardening back on its
     old gold ladder (500 x 4^H) with no bars or hardened wood, and
     un-advertises caps.hardenmats so the game shows that ladder again.
     Nothing held is touched.  (`hardenedwood: false` does the same for bows
     and staffs alone: hardenedwood.js.) */
  _hardenMatsOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'hardenmats') && !f.hardenmats);
  },

  _hardenSend(playerId, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'harden_result', payload })); } catch (e) {}
  },

  async _handleHardenWeapon(session, payload) {
    const err = (code, message) => this._hardenSend(session.id, { success: false, error: code, message });
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return err('not-now', 'Cannot harden right now');
    // The guard gear lock covers hardening too -- it mutates the
    // equipped weapon (threat.js).
    if (this._threatGearLocked && this._threatGearLocked(session.id, ps)) return;
    const slot = payload && payload.slot;
    if (slot !== 'weapon' && slot !== 'rangedWeapon' && slot !== 'staffWeapon') return err('bad-slot', 'No such slot');
    const w = ps[slot];
    if (!w) return err('no-weapon', 'Nothing equipped in that slot');
    const hardness = (typeof w.hardness === 'number') ? Math.max(0, Math.min(HARDEN.MAX, Math.floor(w.hardness))) : 0;
    if (hardness >= HARDEN.MAX) return err('maxed', 'Already at maximum hardness');
    // Access gate: floor(blacksmithing / 5) >= the weapon's material
    // tier index.  Skill never changes the odds (§4.6c).
    const smithLvl = (ps.lifeSkills && ps.lifeSkills.blacksmithing && ps.lifeSkills.blacksmithing.level) || 1;
    const tierIdx = this._weaponTierIndex(w);
    if (Math.floor(smithLvl / 5) < tierIdx) {
      return err('skill-gate', 'Need Blacksmithing Lv' + (tierIdx * 5) + ' for this tier');
    }
    /* v2.3.3139: the owner's ladder -- doubling gold, and as many of the
       weapon's material as the level the attempt reaches: its metal's bars,
       or a bow's or a staff's own hardened wood.  Wood only while hardened
       wood can be made (`hardenedwood: false` puts bows and staffs back on
       gold alone, so nothing asks for a material no one can make). */
    const wood = hardenIsWood(w, slot);
    const matsOn = !this._hardenMatsOff() && !(wood && this._hardenedWoodOff());
    const cost = hardenGoldFor(hardness, !matsOn);
    const material = matsOn ? hardenMaterialFor(tierIdx, wood) : null;
    const amount = material ? hardenAmountFor(hardness) : 0;
    if ((ps.coins || 0) < cost) return err('no-gold', 'Need ' + cost + 'g');
    if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
    const haveMats = material && Object.prototype.hasOwnProperty.call(ps.inventory, material) ? Math.floor(Number(ps.inventory[material]) || 0) : 0;
    if (amount > 0 && haveMats < amount) {
      return err('no-materials', 'Need ' + hardenMaterialWord(material, amount));
    }

    // Single-mutation settle (the gamble pattern): one input-gated
    // event on live ps, roll after the debit, no crash window.
    ps.coins -= cost;
    if (amount > 0) {
      ps.inventory[material] = haveMats - amount;
      if (ps.inventory[material] <= 0) delete ps.inventory[material];
    }
    const success = Math.random() < HARDEN.ODDS[hardness];
    const temperBefore = (typeof w.temper === 'number' && w.temper >= 0) ? Math.floor(w.temper) : 0;
    if (success) {
      w.hardness = hardness + 1;
      w.temper = 0;
    } else {
      // Pity band uses the temper BEFORE this failure.
      if (temperBefore < 20) w.hardness = 0;
      else if (temperBefore < 50) w.hardness = Math.max(0, hardness - 2);
      else if (temperBefore < 100) w.hardness = Math.max(0, hardness - 1);
      else w.hardness = hardness; // 100+: no reset
      w.temper = temperBefore + 1;
    }
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    this._hardenSend(session.id, {
      success, slot, cost,
      /* v2.3.3139: the material it took and how many (none on the old ladder) */
      ...(amount > 0 ? { material, amount } : {}),
      hardness: w.hardness, temper: w.temper || 0,
      odds: HARDEN.ODDS[Math.min(w.hardness, HARDEN.MAX - 1)],
    });
    // Ledgers -- best-effort, after the reply (output gates coalesce).
    try {
      const lkey = 'harden_ledger:' + session.id;
      const ledger = (await this.state.storage.get(lkey)) || [];
      ledger.push({ ts: Date.now(), slot, type: w.type, from: hardness, to: w.hardness, success, cost, ...(amount > 0 ? { material, amount } : {}), temper: w.temper || 0 });
      await this.state.storage.put(lkey, ledger.slice(-HARDEN.LEDGER_CAP));
      if (success && w.hardness === HARDEN.MAX) {
        // INV-27: global H5 mint log, pruned to the 90-day window.
        const now = Date.now();
        const log = ((await this.state.storage.get('harden_h5_log')) || []).filter((t) => now - t < HARDEN.H5_WINDOW_MS);
        log.push(now);
        await this.state.storage.put('harden_h5_log', log);
      }
    } catch (e) { /* monitoring only */ }
  },
};
