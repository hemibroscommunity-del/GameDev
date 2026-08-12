/* ═══ v2.3.1162 (P4 decomposition): QUESTS extracted from index.js ═══
 *
 * Behavior-frozen move of the quest accept / objective-credit / turn-in
 * handlers out of the GameRoom class body (index.js was 6.4k lines; the
 * OPTIMIZATION-ROADMAP P4 strangler-fig continues).  Nothing here
 * changed: the methods still read/write the same playerState fields
 * (_quests, _questKills, _questFlags), still pay through _addCombatXp /
 * _recomputeMaxes, and still persist via _saveRpg -- all reached
 * through `this` because the object is mixed into GameRoom.prototype
 * (same pattern as market.js, see its header for the re-extraction
 * rationale).
 *
 * Trust model (unchanged, v2.3.1116 + v2.3.1120): the server validates
 * quest STATE transitions (available -> active -> turnedIn) and the
 * declarative objectives in data.js QUEST_REWARDS (kill / gather /
 * collect / flag).  Quests without an objective remain client-trusted
 * on the "actually completed" claim -- see the data.js QUEST_REWARDS
 * header for the whitelist rationale.
 *
 * Callers that stay in index.js (prototype dispatch, untouched):
 *   - _resolveMonsterKill -> _creditQuestObjective(rid, 'kill', arch)
 *   - harvest resolution  -> _creditQuestObjective(id, 'gather', null)
 *   - webSocketMessage cases 'quest_accept' / 'quest_turn_in'
 * (this.QUEST_AP_REWARD stays in the GameRoom constructor; mirrors
 * QUEST_AP_REWARD in src/data/items.js -- 5 AP per quest.) */

import { QUEST_REWARDS } from './data.js';
import { PROG3 } from './prog3.js';

export const questMethods = {
  _QUEST_REWARDS_DATA() {
    return QUEST_REWARDS;
  },

  /* v2.3.1680: how many of a `collect` objective's items the player holds.
     A single `invKey` is an exact match; `invPrefix` sums a FAMILY — cooked
     fish are `cooked_fish_<species>` and ore is `ore_<name>`, so "bring me
     cooked fish" cannot be one key without picking a favourite species and
     rejecting the rest of the sea. */
  _collectHeld(ps, obj) {
    const inv = (ps && ps.inventory) || null;
    if (!inv || !obj) return 0;
    if (obj.invKey) return inv[obj.invKey] || 0;
    if (!obj.invPrefix) return 0;
    let n = 0;
    for (const k of Object.keys(inv)) {
      if (k.startsWith(obj.invPrefix)) n += inv[k] || 0;
    }
    return n;
  },

  /* Take `count` items matching the objective, oldest-key-first.  Spreads the
     spend across a family so a player holding three species hands over a mix
     rather than having one stack singled out. */
  _collectConsume(ps, obj, count) {
    const inv = (ps && ps.inventory) || null;
    if (!inv || !obj) return;
    let left = Math.max(0, Math.floor(count));
    const keys = obj.invKey ? [obj.invKey]
      : Object.keys(inv).filter((k) => obj.invPrefix && k.startsWith(obj.invPrefix)).sort();
    for (const k of keys) {
      if (left <= 0) break;
      const have = inv[k] || 0;
      const take = Math.min(have, left);
      left -= take;
      if (have - take > 0) inv[k] = have - take; else delete inv[k];
    }
  },

  _handleQuestAccept(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { questId } = payload || {};
    if (typeof questId !== 'string') return;
    const rewards = this._QUEST_REWARDS_DATA();
    // Own-property check, NOT truthiness: an inherited key like
    // 'constructor'/'toString'/'__proto__' resolves to a truthy
    // Object.prototype member, so `rewards[questId]` would sail through
    // and (in turn-in) hand out the unconditional AP reward on a junk
    // id while polluting _quests.  The amulet.js tierKey hazard
    // (v2.3.1192); reject inherited keys at the gate.
    if (!Object.prototype.hasOwnProperty.call(rewards, questId)) return;
    const reward = rewards[questId];
    if (!reward) return; // unknown quest
    if (!ps._quests) ps._quests = Object.create(null); // rule 4: client-id-keyed map
    const cur = ps._quests[questId];
    // Allow accepting from 'available' (chain entry granted) or
    // from missing (first quest in chain).  Reject if already
    // active / turnedIn.
    if (cur === 'active' || cur === 'turnedIn') return;
    ps._quests[questId] = 'active';
    /* v2.3.1676 (owner: "He'll give you the sword and shield (with
       instructions on how to use)").  A reward paid on ACCEPT, not turn-in —
       the whole point of the starter kit is that you cannot do the quest
       without it, so paying it at the end would be a joke.  Same
       _grantQuestItem path and the same non-fatal posture as turn-in
       rewards: a failed grant (occupied slot, full stash) must not stop the
       quest being accepted, or a player with a full bag could never start.
       Only ever fires on the accept that MOVES the quest into 'active', so
       it cannot be farmed by re-accepting. */
    if (Array.isArray(reward.grantOnAccept)) {
      for (const it of reward.grantOnAccept) this._grantQuestItem(ps, it);
      this._recomputeMaxes(ps);
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // v2.3.1120: increment quest progress counters for every active quest
  // whose declarative objective (data.js QUEST_REWARDS) matches this
  // signal.  kind: 'kill' (arch = monster archetype) | 'gather'.
  // The server is the SOLE writer of _questKills now (client increment
  // sites are gated off by caps.questTrack), so the wholesale
  // player_state echo/adopt of the map is safe.
  /* v2.3.1665: `zone` added.  The kill site (_resolveMonsterKill) always
     knew which zone the monster died in and simply never passed it, so
     "kill 5 in Frost Ridge" was unexpressible and every kill quest was
     "anywhere".  A quest with no `obj.zone` keeps the old any-zone
     behavior, so the legacy chains are untouched.  Callers that omit the
     argument (older call sites) also keep it. */
  _creditQuestObjective(playerId, kind, arch, zone) {
    const ps = this.playerState[playerId];
    if (!ps || !ps._quests) return;
    const table = this._QUEST_REWARDS_DATA();
    let changed = false;
    for (const [qid, status] of Object.entries(ps._quests)) {
      if (status !== 'active') continue;
      const obj = table[qid] && table[qid].objective;
      if (!obj || obj.type !== kind) continue;
      if (kind === 'kill' && obj.arch && obj.arch !== arch) continue;
      if (obj.zone && obj.zone !== zone) continue;
      if (!ps._questKills) ps._questKills = Object.create(null); // rule 4: quest-id-keyed map
      ps._questKills[qid] = Math.min(99999, (ps._questKills[qid] || 0) + 1);
      changed = true;
    }
    if (changed) this._queuePlayerStateFlush(playerId);
  },

  _handleQuestTurnIn(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { questId, xpCat } = payload || {};
    if (typeof questId !== 'string') return;
    const rewards = this._QUEST_REWARDS_DATA();
    // Own-property check (see _handleQuestAccept): an inherited key
    // ('constructor' etc.) otherwise passes and farms the unconditional
    // AP reward below (objective/gold/xp are all undefined on it, so
    // only the AP grant fires).  The amulet.js tierKey hazard.
    if (!Object.prototype.hasOwnProperty.call(rewards, questId)) return;
    const reward = rewards[questId];
    if (!reward) return;
    /* v2.3.1669 (owner: "the xp needs to be funneled within one of the
       three primary combat stats so the player must choose which one").
       A prog3 character has no generic XP bar to pay into — every point
       of XP belongs to Melee, Bow or Magic — so the turn-in must name
       one.  Validated BEFORE any mutation: a turn-in that would pay XP
       with nowhere to put it is refused whole rather than half-applied,
       which is what would strand the quest in 'turnedIn' with the reward
       unpaid and no way to retry. */
    const _needsCat = !!(ps.prog3 && reward.xp > 0);
    if (_needsCat && (typeof xpCat !== 'string' || PROG3.SKILLS.indexOf(xpCat) < 0)) return;
    if (!ps._quests) ps._quests = Object.create(null); // rule 4: client-id-keyed map
    // Must be 'active' to turn in.  This is the spam-defeat:
    // a cheater can't reclaim the reward by spamming the event,
    // and can't claim a quest they never accepted.
    if (ps._quests[questId] !== 'active') return;
    // v2.3.1120: verify the declarative objective before paying.  The
    // old handler validated only the state transition and trusted the
    // completion claim (free gold/XP/AP on request).  Quests without
    // an objective stay client-trusted -- see data.js QUEST_REWARDS
    // header for the whitelist rationale.
    const _obj = reward.objective;
    if (_obj) {
      if (_obj.type === 'kill' || _obj.type === 'gather') {
        if (((ps._questKills && ps._questKills[questId]) || 0) < (_obj.count || 1)) return;
      } else if (_obj.type === 'collect') {
        if (this._collectHeld(ps, _obj) < (_obj.count || 1)) return;
      } else if (_obj.type === 'flag') {
        if (!(ps._questFlags && ps._questFlags[_obj.flag])) return;
      }
    }
    /* v2.3.1673: HAND THE ITEMS OVER.  `collect` used to only CHECK that you
       held the items, never take them — which for the tutorial arc would mean
       one stack of remnants satisfying every step at once, and the whole
       five-quest chain collapsing into a single turn-in.  Opt-in via
       `consume` so any future "just prove you own it" collect quest keeps the
       old behaviour.
       Placed AFTER every gate and BEFORE any payout, so a refused turn-in can
       never take the items, and a paid one can never fail to.  Clamped at 0
       because a concurrent path could in principle have drained the stack
       between the check above and here; going negative would turn a bag into
       a debt that no drop can ever pay off. */
    if (_obj && _obj.type === 'collect' && _obj.consume && ps.inventory) {
      this._collectConsume(ps, _obj, _obj.count || 1);
    }
    ps._quests[questId] = 'turnedIn';
    ps.coins = (ps.coins || 0) + (reward.gold || 0);
    // XP via _addCombatXp so level-up logic runs (including
    // pool restores via _recomputeMaxes inside).
    if (reward.xp > 0) {
      if (_needsCat) {
        /* Straight into the chosen trained skill — same path a monster
           kill uses, so a quest that pushes you over a threshold levels
           you, grants the point, restores your pools and fires
           prog3_level exactly like fighting for it would. */
        this._prog3AwardXp(session.id, ps, xpCat, reward.xp);
      } else {
        const { leveled } = this._addCombatXp(ps, reward.xp);
        if (leveled) {
          this._recomputeMaxes(ps);
          if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
          if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
          if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
        }
      }
    }
    ps.achievementPoints = (ps.achievementPoints || 0) + this.QUEST_AP_REWARD;
    /* v2.3.1665: ITEM rewards.  Until now a quest could only pay gold, xp
       and AP, so "the quest giver hands you armor" was unexpressible.
       Failure to grant is deliberately NON-FATAL: a full weapon stash must
       not swallow the whole turn-in (the player would lose the gold and xp
       too and have no way to retry a quest already marked turnedIn). */
    if (reward.item) this._grantQuestItem(ps, reward.item);
    // Unlock next quest in chain.
    if (reward.next && !ps._quests[reward.next]) {
      ps._quests[reward.next] = 'available';
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  /* ═══ v2.3.1665: quest item grants ═══
   *
   * Mints the same weapon SHAPE as the forge (gear.js _handleForgeWeapon)
   * so nothing downstream can tell a quest reward from a crafted one --
   * with one deliberate difference: quality is fixed at 'normal' rather
   * than rolled.  A guaranteed reward should not be a slot machine, and a
   * rolled 'godly' here would hand out a damage multiplier the anti-cheat
   * ceiling prices as legitimate.
   *
   * TIER SAFETY: callers must use tierIndex 0 items (see the QUEST_REWARDS
   * header).  Since v2.3.1661 equipping is gated on trained level /
   * defense points, so a high-tier gift would be granted and then refused
   * -- the grant path deliberately does NOT bypass those gates, because a
   * quest item that only works because it skipped the rules is worse than
   * one the player can actually earn.
   *
   * Returns true when something was granted.  Never throws.
   */
  _grantQuestItem(ps, item) {
    if (!ps || !item || typeof item !== 'object') return false;
    try {
      if (item.kind === 'armor' || item.kind === 'legs') {
        /* v2.3.1679: two slots now — chest ('armor') and legs ('legs'), the
           upper and lower body pieces the mining quest pays out.  Same
           empty-slot-only rule for both: silently replacing armor the player
           chose would be a reward that takes something away. */
        const slot = item.kind === 'legs' ? 'legsArmor' : 'armor';
        if (ps[slot]) return false;
        const tm = Math.max(0, Math.min(8, Number(item.tierMult) || 1));
        ps[slot] = { name: String(item.name || 'Quest Armor'), tierMult: tm };
        this._recomputeMaxes(ps);
        return true;
      }
      if (item.kind === 'shield') {
        /* v2.3.1676: same empty-slot-only rule as armor — a gift must never
           take away something the player chose.
           v2.3.1683: `ps.shield` is the server's OWNERSHIP record, not a
           statement about what is strapped to the arm.  There is no
           server-side shield stash and handoff rule 1 forbids adding one to
           the rpg blob, so equipped-vs-stashed placement stays where it has
           always lived — the client's `shieldStash` — and wsClient routes a
           newly-granted shield into the BAG rather than onto the arm (the
           owner's "received in inventory first").  Nothing server-side reads
           this field for combat (blocking is computed client-side from
           R._shieldBonus), so the two views cannot disagree about anything
           that affects damage. */
        if (ps.shield) return false;
        ps.shield = {
          tier: 'common',
          tierMult: Math.max(0, Math.min(8, Number(item.tierMult) || 1)),
          gearBase: String(item.gearBase || 'wood'),
          name: String(item.name || 'Quest Shield'),
        };
        this._recomputeMaxes(ps);
        return true;
      }
      if (item.kind === 'weapon') {
        const isWw = item.weaponType === 'bow' || item.weaponType === 'staff';
        const table = isWw ? this._WOODWORKING_TIERS_DATA() : this._BLACKSMITH_TIERS_DATA();
        if (!Object.prototype.hasOwnProperty.call(table, item.tierKey)) return false;
        const tier = table[item.tierKey];
        const minted = {
          type: item.weaponType,
          tier: 'common',
          tierMult: tier.tierMult,
          element1: null, element2: null,
          isVolatile: false,
          name: String(item.name || 'Quest Weapon'),
          gearBase: isWw ? ('ww_' + item.tierKey) : item.tierKey,
          reforgeBonus: null, hardenBonus: null,
          quality: 'normal',                      // fixed, not rolled -- see header
          hardness: 0, temper: 0,
        };
        /* v2.3.1683 (owner: "I want it to be received in inventory first not
           automatically equipped").  This used to drop the weapon straight
           into its matching equipped slot whenever that slot was empty, and
           only fall back to the stash when it was taken.  For the tutorial
           arc that meant EVERY grant auto-equipped, because a fresh character
           has all three slots empty by design (v2.3.1676) -- so the player
           never saw the sword arrive in their bag and never chose to wield
           it.  Quest weapons now always land in the STASH; equipping is the
           player's move.
           Note this also removes the last auto-equip on the accept path, so
           the town gate is now the only thing standing between a new player
           and walking out with the sword still in the bag.  The gate keys on
           the QUEST RECORD, not on what is equipped (zoneTransitions.js), so
           it still opens -- that is a deliberate design call to raise with
           the owner, not something to "fix" here by tightening the gate.
           Rule 3 of the handoff still applies: check capacity FIRST --
           _saveRpg truncates weaponStash at cap, so pushing past it destroys
           the weapon silently. */
        if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
        if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return false;
        ps.weaponStash.push(minted);
        return true;
      }
      /* v2.3.1680: a SET — several pieces in one reward slot, so the mining
         quest can pay upper AND lower body.  Each piece goes through this same
         function, so each keeps the empty-slot-only rule independently: a
         player already wearing a chest piece still receives the legs. */
      if (item.kind === 'armorSet' && Array.isArray(item.pieces)) {
        let any = false;
        for (const piece of item.pieces) { if (this._grantQuestItem(ps, piece)) any = true; }
        return any;
      }
      if (item.kind === 'inv' && typeof item.key === 'string') {
        if (!ps.inventory) ps.inventory = Object.create(null);
        const n = Math.max(1, Math.min(999, Math.floor(Number(item.n) || 1)));
        ps.inventory[item.key] = Math.min(99999, (ps.inventory[item.key] || 0) + n);
        return true;
      }
    } catch (e) { /* a bad reward definition must not break the turn-in */ }
    return false;
  },
};
