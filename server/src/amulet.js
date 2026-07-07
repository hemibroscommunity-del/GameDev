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
 *   - The polished-gem economy (raw gem drops, GemcutPanel polishing)
 *     is STILL client-local inside the opaque lifeSkills.gems map -- the
 *     server's count is whatever the join bootstrap captured.  Denying
 *     on it is deliberate deny-by-default; migrating gem income
 *     server-side is the successor slice (see docs/specs/amulet-forge.md
 *     "Deliberately still client-side").
 *   - The join-time amulet bootstrap (first connect only) stays as the
 *     legacy-player migration path; its ceiling is unchanged and
 *     documented in elemental-completion.md.
 *
 * No new server-EMITTED event type (the echo is player_state), so
 * PRIVILEGED_EVENTS is untouched -- wire-audit stays green by
 * construction.  Deploy-order safety: caps.amuletForge (join.js) gates
 * the client's sends + its legacy nugget roll; old client + new worker
 * and new client + old worker both keep working (rules 19/20). */

import { AMULET_FORGE_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_MONSTER_DROP, AMULET_GEMS } from './data.js';

// One-time join-capture clamps for the previously client-local ledger.
// Honest values are tiny (nuggets drop at 1-in-10k kills; mythic needs
// 50 nuggets' worth of bars) -- these bound a tampered localStorage
// claim without punishing any realistic legit hoard.
const AMULET_BOOTSTRAP_NUGGET_CAP = 250;
const AMULET_BOOTSTRAP_BAR_CAP = 50;

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
};
