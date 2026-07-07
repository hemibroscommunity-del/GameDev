/* ═══ v2.3.1192: SERVER AMULET FORGE (handoff item I follow-up) ═══
 *
 * Until this slice amulets were a 100% client-crafted blob: the client
 * consumed its own localStorage nuggets/bars/gold and wrote R.amulet
 * directly, and the server only ever saw the result at join (whitelisted
 * by _sanitizeAmulet, gear.js, since v2.3.1180).  Two problems:
 *   - forgery: a fresh identity could bootstrap a free legit-shaped
 *     mythic flame amulet (+10.5% authoritative elemDmg,
 *     _computeAttackDamage) without paying the 10-bars/1200g cost;
 *   - legit play was BROKEN server-side: a mid-session craft or gem
 *     slot never reached the worker at all, so the elemDmg bonus never
 *     applied and the join player_state echo stomped the client's
 *     crafted amulet back to the stale stored copy on every reconnect.
 *
 * This mixin makes the worker the amulet mint, on the _handleForgeWeapon
 * pattern (gear.js): validate from SERVER state, consume, mint into ps,
 * _saveRpg, echo player_state.  One client->server event,
 * amulet_forge_request { op, ... }, three ops mirroring the three live
 * client flows (ForgePanel smelt/craft, EnchantPanel gem slot):
 *
 *   op 'smelt'            NUGGETS_PER_BAR goldNuggets -> +1 goldBar
 *   op 'craft' {tierKey}  AMULET_FORGE_TIERS gate: blacksmithing level
 *                         >= minLvl, goldBars >= bars, coins >= goldCost
 *                         -> consume both, mint {tier, gem:null, name},
 *                         blacksmithing XP minLvl*3 (client parity)
 *   op 'gem'   {gem}      requires an equipped amulet + one
 *                         lifeSkills.gems['polished_<gem>'] -> consume,
 *                         set amulet.gem + name, enchanting XP 20
 *
 * Ingredient ledger: goldNuggets/goldBars become server-owned rpg-blob
 * fields (persistence.js).  They were client-local before, so join.js
 * captures the client's claimed counts ONCE (clamped, the v2.3.1021
 * weaponSkills adoption posture) when the stored record predates this
 * slice; stored wins forever after.  Nugget INCOME moves server-side
 * too: _amuletNuggetOnKill rides _resolveMonsterKill (combat.js) with
 * the client's exact monster-kill rate -- the client's local roll is
 * gated off under caps.amuletForge (monsterCombat.js) or kills would
 * double-award.
 *
 * Trust posture notes:
 *   - Denials are SILENT (no reject event), matching forge_weapon: the
 *     client's local prediction may briefly diverge; the next
 *     player_state echo / reconnect heals it (handoff rule 20).
 *   - 'craft' and 'gem' mutate equipped gear, so both sit behind the
 *     guard gear lock (_threatGearLocked, threat.js) like the four
 *     v2.3.1129 equip mutators.  'smelt' is resource conversion only.
 *   - ~~The polished-gem economy is STILL client-local~~ -- MIGRATED
 *     v2.3.1198 (this slice, the successor the v2.3.1192 header named):
 *     the raw-gem kill drop is server-rolled (_gemRawOnKill) and the
 *     Gem Cutter's cut is server-settled (_handleGemCut), so the gem
 *     op's deny-by-default consume now sees legitimately-earned gems.
 *     Residuals (documented in docs/specs/amulet-forge.md): ForgePanel
 *     gem EXTRACTION income and the shield/weapon gem-slot consumes are
 *     still client-local lifeSkills.gems edits, echo-stomped as before.
 *   - The join-time amulet bootstrap (first connect only) stays as the
 *     legacy-player migration path; its ceiling is unchanged and
 *     documented in elemental-completion.md.
 *
 * v2.3.1192 added no server-emitted event type; v2.3.1198 adds ONE,
 * gem_cut_result (private, the harvest_credit precedent: a cut's
 * outcome is server-owned RNG the client cannot predict), registered
 * in PRIVILEGED_EVENTS -- wire-audit pins it.  Deploy-order safety:
 * caps.amuletForge gates the forge sends + the legacy nugget roll;
 * caps.gems (narrow flag, NOT reused -- a v2.3.1192 worker advertises
 * amuletForge but has no cut op, so a shared flag would silently kill
 * cutting against it) gates the client's gem_cut_request send + its
 * legacy kill-gem roll + local cut roll (rules 19/20). */

import { AMULET_FORGE_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_MONSTER_DROP, AMULET_GEMS, GEM_CUT_TIERS, GEM_RAW_MONSTER_DROP } from './data.js';

// One-time join-capture clamps for the previously client-local ledger.
// Honest values are tiny (nuggets drop at 1-in-10k kills; mythic needs
// 50 nuggets' worth of bars) -- these bound a tampered localStorage
// claim without punishing any realistic legit hoard.
const AMULET_BOOTSTRAP_NUGGET_CAP = 250;
const AMULET_BOOTSTRAP_BAR_CAP = 50;

// v2.3.1198: per-key clamp for the one-time gem capture (and for any
// gems map the server ever ingests).  Raw gems drop at 5% of kills in
// elemental zones and cutting consumes them, so even a dedicated legit
// hoard sits in the low hundreds; 200 per key bounds a tampered
// localStorage claim without punishing anyone real.
const GEM_BOOTSTRAP_PER_KEY_CAP = 200;
// Client parity: GemcutPanel awards addLifeSkillXp('gemCutting', 15)
// per cut, success or shatter (a literal at the call site, no client
// constant to mirror).
const GEM_CUT_XP = 15;

export const amuletMethods = {
  _amuletClampNuggets(v) {
    const n = Math.floor(Number(v) || 0);
    return Math.max(0, Math.min(AMULET_BOOTSTRAP_NUGGET_CAP, n));
  },

  _amuletClampBars(v) {
    const n = Math.floor(Number(v) || 0);
    return Math.max(0, Math.min(AMULET_BOOTSTRAP_BAR_CAP, n));
  },

  // Gold-nugget drop roll for a monster kill.  Called from
  // _resolveMonsterKill (combat.js) for the KILLER only -- mirrors the
  // client's legacy roll site (monsterCombat.js "GOLD NUGGET DROP",
  // which ran on the killing player's machine).  Caller's _saveRpg +
  // player_state flush carry the credit; no popup event (the client
  // detects the goldNuggets increase in its player_state handler).
  _amuletNuggetOnKill(ps) {
    if (!ps) return;
    if (Math.random() < GOLD_NUGGET_MONSTER_DROP) {
      ps.goldNuggets = (ps.goldNuggets || 0) + 1;
    }
  },

  _handleAmuletForge(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const op = payload && payload.op;

    if (op === 'smelt') {
      if ((ps.goldNuggets || 0) < NUGGETS_PER_BAR) return;
      ps.goldNuggets -= NUGGETS_PER_BAR;
      ps.goldBars = (ps.goldBars || 0) + 1;

    } else if (op === 'craft') {
      // Crafting mints INTO the equipped amulet slot -- a gear change,
      // so the guard lock covers it (threat.js, v2.3.1129 posture).
      if (this._threatGearLocked(session.id, ps)) return;
      const tierKey = payload && payload.tierKey;
      // Own-property check, not truthiness: tierKey '__proto__' or
      // 'constructor' resolves to a truthy INHERITED object whose
      // undefined .bars/.goldCost would sail through every `<` gate and
      // NaN-poison coins (the same prototype-key hazard the duel `away`
      // map fix documents, handoff item L).
      const tier = (typeof tierKey === 'string'
        && Object.prototype.hasOwnProperty.call(AMULET_FORGE_TIERS, tierKey))
        ? AMULET_FORGE_TIERS[tierKey] : null;
      if (!tier) return;
      const bsLvl = (ps.lifeSkills && ps.lifeSkills.blacksmithing && ps.lifeSkills.blacksmithing.level) || 1;
      if (bsLvl < tier.minLvl) return;
      if ((ps.goldBars || 0) < tier.bars) return;
      if ((ps.coins || 0) < tier.goldCost) return;
      ps.goldBars -= tier.bars;
      ps.coins -= tier.goldCost;
      // Mint mirrors the client mint at ForgePanel "Amulet Crafting"
      // exactly ({tier, gem:null, name}; the old amulet has no stash --
      // it is replaced, same as the client).  Shape is what
      // _sanitizeAmulet whitelists, by construction.
      ps.amulet = { tier: tierKey, gem: null, name: tier.label + ' Gold Amulet' };
      // Crafting XP -- client parity: addLifeSkillXp('blacksmithing',
      // at.minLvl * 3) at the craft site.
      this._addLifeSkillXp(ps, 'blacksmithing', (tier.minLvl || 1) * 3);

    } else if (op === 'gem') {
      // Slotting mutates the equipped amulet -- gear-locked too.
      if (this._threatGearLocked(session.id, ps)) return;
      // Server-held amulets are server-minted or sanitizer-whitelisted,
      // but own-property check anyway (see the craft op's tier note).
      if (!ps.amulet || typeof ps.amulet.tier !== 'string'
        || !Object.prototype.hasOwnProperty.call(AMULET_FORGE_TIERS, ps.amulet.tier)) return;
      const gem = payload && payload.gem;
      if (typeof gem !== 'string' || !AMULET_GEMS.has(gem)) return;
      // Consume one polished gem from the server-held lifeSkills.gems
      // map (the client's EnchantPanel source, captured at join).
      // Deny-by-default when the server has none -- see the header's
      // trust-posture note on the client-local gem economy.
      const gems = (ps.lifeSkills && ps.lifeSkills.gems) || null;
      const polKey = 'polished_' + gem;
      if (!gems || (gems[polKey] || 0) < 1) return;
      gems[polKey] -= 1;
      if (gems[polKey] <= 0) delete gems[polKey];
      const label = AMULET_FORGE_TIERS[ps.amulet.tier].label;
      ps.amulet.gem = gem;
      ps.amulet.name = label + ' ' + gem.charAt(0).toUpperCase() + gem.slice(1) + ' Amulet';
      // Client parity: addLifeSkillXp('enchanting', 20) at the slot
      // site.  (The client's _questFlags.slottedGem write stays
      // client-side -- rule 18, the server must not write _questFlags
      // mid-session.)
      this._addLifeSkillXp(ps, 'enchanting', 20);

    } else {
      return; // unknown op -- deny by default
    }

    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  /* ═══ v2.3.1198: polished-gem income (the v2.3.1192 successor slice) ═══ */

  // Whitelist + clamp a gems map.  Valid keys are raw_/polished_ ×
  // AMULET_GEMS (the nine elements, 18 keys total) -- anything else is
  // dropped (a tampered localStorage could otherwise stuff thousands of
  // junk keys into the rpg blob, the _questKills bloat posture).
  // Values floor to integers in [1, GEM_BOOTSTRAP_PER_KEY_CAP]; zero /
  // negative / NaN entries are dropped (the live maps delete-at-zero).
  _sanitizeGems(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const k of Object.keys(raw)) {
      let gem = null;
      if (k.startsWith('raw_')) gem = k.slice(4);
      else if (k.startsWith('polished_')) gem = k.slice(9);
      if (!gem || !AMULET_GEMS.has(gem)) continue;
      const n = Math.floor(Number(raw[k]));
      if (!Number.isFinite(n) || n <= 0) continue;
      out[k] = Math.min(GEM_BOOTSTRAP_PER_KEY_CAP, n);
    }
    return out;
  },

  // Join-time adoption of the previously client-local gem economy.
  // Called from _handleJoin for BOTH branches (stored + first-connect
  // bootstrap), before the join path's final _saveRpg:
  //   - always heal/clamp whatever gems map the server currently holds
  //     (the stored blob, or the wholesale lifeSkills bootstrap capture
  //     -- which used to ingest gems UNCLAMPED);
  //   - if the stored record predates this slice (no gemsCaptured
  //     stamp), fold the client's claimed counts in ONCE, per-key
  //     max-merge (max, not add: the stored map already contains
  //     whatever the original bootstrap captured, and adding would
  //     double-count it).  The v2.3.1021 weaponSkills / v2.3.1192
  //     nugget-ledger capture posture.
  //   - stamp ps.gemsCaptured so every later reconnect ignores the
  //     claim (stored wins forever; persisted via the _saveRpg fixed
  //     list, persistence.js).
  _gemsAdoptOnJoin(ps, stored, claimedLifeSkills) {
    if (!ps) return;
    if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') ps.lifeSkills = {};
    ps.lifeSkills.gems = this._sanitizeGems(ps.lifeSkills.gems);
    if (!(stored && stored.gemsCaptured)) {
      const claim = this._sanitizeGems(claimedLifeSkills && claimedLifeSkills.gems);
      for (const k of Object.keys(claim)) {
        ps.lifeSkills.gems[k] = Math.max(ps.lifeSkills.gems[k] || 0, claim[k]);
      }
    }
    ps.gemsCaptured = true;
  },

  // Raw-gem drop roll for a monster kill.  Called from
  // _resolveMonsterKill (combat.js) for the KILLER only, right beside
  // _amuletNuggetOnKill -- mirrors the client's legacy roll site
  // (monsterCombat.js "GEM DROP FROM MONSTER KILL": zone element only,
  // client rate, now gated off under caps.gems).  Caller's _saveRpg +
  // player_state flush carry the credit; the client fires the "Raw X
  // Gem!" popup off the raw_<elem> increase in its player_state
  // handler (the v2.3.1192 goldNuggets-popup pattern).  Dungeon zones
  // have no _getZoneConfig entry -> no roll, matching the reward
  // posture of dungeon.js (instances pay via their own tables).
  _gemRawOnKill(ps, zone) {
    if (!ps) return;
    const cfg = this._getZoneConfig(zone);
    const elem = (cfg && cfg.element) || null;
    if (!elem || !AMULET_GEMS.has(elem)) return;
    if (Math.random() >= GEM_RAW_MONSTER_DROP) return;
    if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') ps.lifeSkills = {};
    if (!ps.lifeSkills.gems || typeof ps.lifeSkills.gems !== 'object') ps.lifeSkills.gems = {};
    const k = 'raw_' + elem;
    ps.lifeSkills.gems[k] = (ps.lifeSkills.gems[k] || 0) + 1;
  },

  // Gem Cutter settle: gem_cut_request { gem }.  Validates the raw gem
  // from SERVER state, consumes it, rolls success against the
  // SERVER-held gemCutting level (GEM_CUT_TIERS -- fixed table walked
  // descending, exactly the GemcutPanel formula), mints the polished
  // gem on success, gemCutting XP either way (client parity).  NOT a
  // timing minigame (single tap + pure RNG), so no cook-style rate
  // limit / physics floor: every attempt consumes a server-held raw
  // gem, which is the supply bound.  No gear mutation -> no gear lock.
  // Outcome feedback rides the private gem_cut_result event (the
  // harvest_credit precedent: server-owned RNG the client cannot
  // predict; registered in PRIVILEGED_EVENTS, index.js).
  _handleGemCut(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const gem = payload && payload.gem;
    if (typeof gem !== 'string' || !AMULET_GEMS.has(gem)) return;
    const gems = (ps.lifeSkills && ps.lifeSkills.gems) || null;
    const rawKey = 'raw_' + gem;
    if (!gems || (gems[rawKey] || 0) < 1) return; // deny-by-default, silent
    gems[rawKey] -= 1;
    if (gems[rawKey] <= 0) delete gems[rawKey];
    // Success rate from the server-held skill level -- a modified
    // client can't claim a Perfect Cut rate at level 1.
    const gcLvl = (ps.lifeSkills.gemCutting && ps.lifeSkills.gemCutting.level) || 1;
    let successRate = 0.6;
    const tierKeys = Object.keys(GEM_CUT_TIERS);
    for (let i = tierKeys.length - 1; i >= 0; i--) {
      if (gcLvl >= GEM_CUT_TIERS[tierKeys[i]].minLvl) {
        successRate = GEM_CUT_TIERS[tierKeys[i]].successRate;
        break;
      }
    }
    const success = Math.random() < successRate;
    if (success) {
      const polKey = 'polished_' + gem;
      gems[polKey] = (gems[polKey] || 0) + 1;
    }
    const { leveled, newLevel } = this._addLifeSkillXp(ps, 'gemCutting', GEM_CUT_XP);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      this._sendPlayerState(ws, session.id);
      try {
        ws.send(JSON.stringify({
          type: 'gem_cut_result',
          payload: { gem, success, leveled, newLevel },
        }));
      } catch (e) {}
    }
  },
};
