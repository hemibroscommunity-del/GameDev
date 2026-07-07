/* ═══ QUESTS — accept / turn-in transition logic ═══ */
/* v2.3.782: moved verbatim from the quest panel's Accept/Turn-In onClick
   bodies in src/ui/BroTown.jsx (REBUILD-PLAN Phase 3, behavior-frozen).
   The quest *data* and gating already live in the data layer
   (QUESTS/QUEST_STATUS/getNpcQuest in src/data/gameSystems.js); the quest
   panel JSX and the NPC-tap open-panel wiring stay in BroTown — this module
   owns the state transitions.
   `questPanel` is the open panel descriptor { npc, quest, status, npcRef };
   deps = { setRpgState, setQuestPanel }. S is stateRef.current (the
   original code read stateRef.current at click time; callers pass it at
   click time — identical semantics). Imports are explicit per the
   extracted-module rule. */
import { QUEST_STATUS, QUEST_AP_REWARD, createDefaultCompStats, BT_AUDIO } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
export function acceptQuest(S, questPanel, deps) {
  var setRpgState = deps.setRpgState,
    setQuestPanel = deps.setQuestPanel;
  var R = S.rpg;
  if (!R._quests) R._quests = {};
  R._quests[questPanel.quest.id] = QUEST_STATUS.active;
  /* Server-authoritative quest state in MP -- worker tracks the
     _quests transitions so a cheater can't activate a quest they
     haven't been offered.  Local mutation stays as snappy UI
     feedback; player_state arrives with authoritative _quests. */
  {
    var _Sqa = S;
    if (_Sqa._serverMonsters && _Sqa.channel) {
      try { _Sqa.channel.send({ type: 'quest_accept', payload: { questId: questPanel.quest.id } }); } catch (e) {}
    }
  }
  setRpgState(_objectSpread({}, R));
  try {
    localStorage.setItem('bt_rpg', JSON.stringify(R));
  } catch (e) {}
  setQuestPanel(_objectSpread(_objectSpread({}, questPanel), {}, {
    status: 'active'
  }));
  pushDmgPopup(S, S.player.x, S.player.y - 40, 'Quest Accepted: ' + questPanel.quest.title, '#5b52ff');
  BT_AUDIO.collect();
}

export function turnInQuest(S, questPanel, deps) {
  var setRpgState = deps.setRpgState,
    setQuestPanel = deps.setQuestPanel;
  var R = S.rpg;
  if (!R._quests) R._quests = {};
  /* Server-authoritative quest reward in MP -- worker validates
     the quest is 'active', looks up reward gold + xp from its
     own QUEST_REWARDS table, applies, unlocks next.  Local
     mutation stays as snappy popup feedback; player_state
     arrives with authoritative _quests + coins + xp + level. */
  {
    var _Sqt = S;
    if (_Sqt._serverMonsters && _Sqt.channel) {
      try { _Sqt.channel.send({ type: 'quest_turn_in', payload: { questId: questPanel.quest.id } }); } catch (e) {}
    }
  }
  R._quests[questPanel.quest.id] = QUEST_STATUS.turnedIn;
  R.coins += questPanel.quest.reward.gold;
  R.xp += questPanel.quest.reward.xp;
  /* Achievement points for quest completion */
  R.achievementPoints = (R.achievementPoints || 0) + QUEST_AP_REWARD;
  if (!R._compStats) R._compStats = createDefaultCompStats();
  R._compStats.questsCompleted++;
  R._compStats.totalGoldEarned += questPanel.quest.reward.gold;
  /* Unlock next quest in chain */
  if (questPanel.quest.next && !R._quests[questPanel.quest.next]) {
    R._quests[questPanel.quest.next] = QUEST_STATUS.available;
  }
  setRpgState(_objectSpread({}, R));
  try {
    localStorage.setItem('bt_rpg', JSON.stringify(R));
  } catch (e) {}
  pushDmgPopup(S, S.player.x, S.player.y - 40, 'Quest Complete! +' + questPanel.quest.reward.gold + 'G +' + questPanel.quest.reward.xp + 'XP', '#f5c542');
  BT_AUDIO.levelUp();
  setQuestPanel(null);
}
