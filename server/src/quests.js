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

export const questMethods = {
  _QUEST_REWARDS_DATA() {
    return QUEST_REWARDS;
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
  _creditQuestObjective(playerId, kind, arch) {
    const ps = this.playerState[playerId];
    if (!ps || !ps._quests) return;
    const table = this._QUEST_REWARDS_DATA();
    let changed = false;
    for (const [qid, status] of Object.entries(ps._quests)) {
      if (status !== 'active') continue;
      const obj = table[qid] && table[qid].objective;
      if (!obj || obj.type !== kind) continue;
      if (kind === 'kill' && obj.arch && obj.arch !== arch) continue;
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
    const { questId } = payload || {};
    if (typeof questId !== 'string') return;
    const rewards = this._QUEST_REWARDS_DATA();
    // Own-property check (see _handleQuestAccept): an inherited key
    // ('constructor' etc.) otherwise passes and farms the unconditional
    // AP reward below (objective/gold/xp are all undefined on it, so
    // only the AP grant fires).  The amulet.js tierKey hazard.
    if (!Object.prototype.hasOwnProperty.call(rewards, questId)) return;
    const reward = rewards[questId];
    if (!reward) return;
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
        if (((ps.inventory && ps.inventory[_obj.invKey]) || 0) < (_obj.count || 1)) return;
      } else if (_obj.type === 'flag') {
        if (!(ps._questFlags && ps._questFlags[_obj.flag])) return;
      }
    }
    ps._quests[questId] = 'turnedIn';
    ps.coins = (ps.coins || 0) + (reward.gold || 0);
    // XP via _addCombatXp so level-up logic runs (including
    // pool restores via _recomputeMaxes inside).
    if (reward.xp > 0) {
      const { leveled } = this._addCombatXp(ps, reward.xp);
      if (leveled) {
        this._recomputeMaxes(ps);
        if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
        if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
        if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      }
    }
    ps.achievementPoints = (ps.achievementPoints || 0) + this.QUEST_AP_REWARD;
    // Unlock next quest in chain.
    if (reward.next && !ps._quests[reward.next]) {
      ps._quests[reward.next] = 'available';
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },
};
