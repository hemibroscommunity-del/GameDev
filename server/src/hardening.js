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
 * ×3.0.  v1 rolls at the FORGE (the only server-side weapon mint);
 * client-side monster weapon drops are still client-minted and are
 * stripped of quality fields on ingest -- drop-time quality ships with
 * the server-side weapon-drop migration (successor note in the spec).
 * At Hardness 0 / Normal the formula reduces EXACTLY to the live one
 * (tools/balance-sim.mjs asserts this equivalence at startup; keep the
 * structures matched so they can't drift).
 *
 * HARDENING (§4.6c): the endgame Blacksmith lottery.  H0→5 ladder at
 * 80/20/5/1/0.5%, gold 500×4^level per attempt, +1.0417 effective base
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

export const HARDEN = {
  MAX: 5,
  ODDS: [0.80, 0.20, 0.05, 0.01, 0.005], // success chance for H(i) -> H(i+1)
  COST_BASE: 500,
  COST_FACTOR: 4,                         // cost = 500 × 4^currentHardness
  BASE_BONUS: 1.0417,                     // +5 GDD base ÷ 4.8 code scale, per level
  LEDGER_CAP: 50,
  H5_WINDOW_MS: 90 * 24 * 3600 * 1000,    // INV-27 monitoring window
};

// §4.6b drop table, cumulative from the rare end.
const Q_GODLY = 1 / 400000;
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
  _weaponEffBase(type, w) {
    const raw = this._weaponBase(type);
    const h = (w && typeof w.hardness === 'number') ? Math.max(0, Math.min(HARDEN.MAX, w.hardness)) : 0;
    const q = (w && QUALITY_GRADES[w.quality]) ? QUALITY_GRADES[w.quality].mult : 1;
    return (raw + h * HARDEN.BASE_BONUS) * q;
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
    const cost = HARDEN.COST_BASE * Math.pow(HARDEN.COST_FACTOR, hardness);
    if ((ps.coins || 0) < cost) return err('no-gold', 'Need ' + cost + 'g');

    // Single-mutation settle (the gamble pattern): one input-gated
    // event on live ps, roll after the debit, no crash window.
    ps.coins -= cost;
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
      hardness: w.hardness, temper: w.temper || 0,
      odds: HARDEN.ODDS[Math.min(w.hardness, HARDEN.MAX - 1)],
    });
    // Ledgers -- best-effort, after the reply (output gates coalesce).
    try {
      const lkey = 'harden_ledger:' + session.id;
      const ledger = (await this.state.storage.get(lkey)) || [];
      ledger.push({ ts: Date.now(), slot, type: w.type, from: hardness, to: w.hardness, success, cost, temper: w.temper || 0 });
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
