/* ═══ v2.3.1128: GUILD-QUEST VERIFICATION (Wave 2 PR11 half 2; spec in
 * docs/specs/guild-quests.md) ═══
 *
 * The life-skill guild quests ("Reach Lv30 in this skill") were a pure
 * client button: GuildPanel checked the level locally and minted the
 * gold + AP itself.  Phantom today (the player_state echo stomps the
 * coins), but a settlement path that ever trusted it would be a
 * faucet.  The verification signals are ALREADY server-owned --
 * ps.lifeSkills[skill].level is advanced by the server's own harvest/
 * craft handlers and ps.achievementPoints is echoed authoritatively --
 * so this is the PR5 declarative-objective pattern with zero new
 * tracking: a data-table ladder, a turn-in handler that checks the
 * server's numbers, and a per-player claims count.
 *
 * Claims live under 'guild_claims:<pid>' ({skillKey: completedCount}),
 * NOT in the rpg blob (fixed-field-list rule) and NOT in the client's
 * _guildProgress (client-merged field; server writes would clobber --
 * the _questFlags lesson).  The ladder is monotonic from the SERVER's
 * count: legacy client-side claims paid nothing real, so server
 * re-claims from rung 0 are fair, not duplication.  Replay-safe by
 * construction -- a resent turn-in meets the next rung's higher level
 * requirement instead of paying twice.  Single-mutation settle on live
 * ps (the gamble pattern): the recipient is this session, online. */

import { GUILD_QUESTS, GUILD_SKILLS } from './data.js';

export const guildMethods = {
  _guildSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  async _handleGuildTurnIn(session, payload) {
    const err = (code, message) => this._guildSend(session.id, 'guild_quest_error', { code, message });
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead) return err('not-now', 'Cannot turn in right now');
    const skill = payload && payload.skill;
    if (typeof skill !== 'string' || !GUILD_SKILLS.includes(skill)) {
      return err('bad-skill', 'Unknown guild');
    }
    const key = 'guild_claims:' + session.id;
    const claims = (await this.state.storage.get(key)) || {};
    const idx = claims[skill] || 0;
    const quest = GUILD_QUESTS[idx];
    if (!quest) return err('done', 'All quests for this guild are complete');
    const lvl = (ps.lifeSkills && ps.lifeSkills[skill] && ps.lifeSkills[skill].level) || 1;
    if (lvl < quest.checkLvl) {
      return err('not-ready', 'Reach Lv' + quest.checkLvl + ' ' + skill + ' first (Lv' + lvl + ')');
    }
    // Persist the claim BEFORE paying: a crash between put and pay
    // costs the player one rung's reward (bounded, visible, re-earnable
    // support-side) -- the reverse order would be a replayable faucet.
    claims[skill] = idx + 1;
    await this.state.storage.put(key, claims);
    ps.coins = (ps.coins || 0) + quest.gold;
    ps.achievementPoints = (ps.achievementPoints || 0) + quest.ap;
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    this._guildSend(session.id, 'guild_quest_result', { skill, index: idx, gold: quest.gold, ap: quest.ap });
  },
};
