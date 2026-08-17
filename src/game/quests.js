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
import { QUEST_STATUS, QUEST_AP_REWARD, createDefaultCompStats, BT_AUDIO, getNpcQuest } from '@/data/index.js';
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
    /* ═══ v2.3.1684: THE GATE WAS `_serverMonsters`, AND IT IS FALSE IN TOWN ═══
       Owner: "The character never receives the sword and shield ... I tried on
       a fresh character using a private browser."
       `_serverMonsters` means "this zone's monsters are server-driven"; it is
       set from `zone_state.monsters.length > 0` (wsClient) and TOWN HAS NO
       MONSTERS, so it is false there.  Every quest giver in the tutorial arc
       stands in town -- so accepting from the IN-WORLD dialogue set the quest
       active on the client and told the worker NOTHING.  The worker therefore
       never ran grantOnAccept, and the sword and shield were never minted at
       all: not misplaced, never created.
       It read as a multiplayer check because it usually coincides with one,
       which is exactly the legacy client-local remnant rule zero warns about
       (ARCHITECTURE-HANDOFF: a "SP mode" proxy is never a reason to skip a
       server message).  The quest-log path (QuestDetailPanel) always sent
       unconditionally, which is why the Quests panel worked and tapping the
       Mayor did not -- the same button, two code paths, one of them mute.
       Gate on the CHANNEL only, like the panel does. */
    if (_Sqa.channel) {
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
  /* v2.3.1745: ...and the screen-space banner over the dialogue.  The world
     popup above is drawn in the Pixi world, UNDER the modal's scrim — at the
     moment you accept, the dialogue is still open and covering it, so the
     one piece of feedback the player could actually see was the sound. */
  showQuestBanner('accepted', questPanel.quest.title);
}

/* v2.3.1745: the QUEST ACCEPTED! / QUEST COMPLETED! banner.
   Same window bridge the level-up banner uses (BroTown sets
   window._setQuestMsg next to window._setLevelUpMsg) — this module is
   plain, non-React, and both accept and turn-in run from a button handler
   rather than from render.  Wrapped because a missing bridge must never
   cost the player their quest: the state transitions above have already
   run and been sent by the time we get here. */
export function showQuestBanner(kind, title, sub) {
  try {
    if (typeof window !== 'undefined' && window._setQuestMsg) {
      window._setQuestMsg({ kind: kind, title: title || '', sub: sub || '', ts: Date.now() });
    }
  } catch (e) {}
}

/* v2.3.1685: `xpCat` — which trained skill this turn-in's XP goes into
   ('sword' | 'bow' | 'staff'), supplied by the dialogue's picker
   (QuestPanel's XpChooser). Optional so any caller for a quest that pays no
   XP, or a pre-prog3 character, can keep omitting it; the worker only
   requires it when it would otherwise have XP with nowhere to put it. */
export function turnInQuest(S, questPanel, deps, xpCat) {
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
    /* v2.3.1684: same dead `_serverMonsters` gate as accept above (see the
       block there).  Turn-ins happen at the giver, and every giver in the
       tutorial arc stands in TOWN, so this message was mute exactly where it
       was needed -- the client self-credited the gold and XP locally and the
       worker never paid, so the reward evaporated on the next player_state.
       v2.3.1685 closes the other half: _handleQuestTurnIn refuses a turn-in
       that pays XP without an `xpCat` naming Melee/Bow/Magic, so fixing the
       gate alone only got the message REFUSED instead of unsent.  The
       dialogue now carries a picker (QuestPanel's XpChooser) and passes its
       choice through here, matching what the quest log has sent since
       v2.3.1669.  Never guessed on the player's behalf: with no choice the
       button does not fire at all. */
    if (_Sqt.channel) {
      try {
        _Sqt.channel.send({ type: 'quest_turn_in', payload: {
          questId: questPanel.quest.id,
          xpCat: typeof xpCat === 'string' ? xpCat : undefined,
        } });
      } catch (e) {}
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
  /* ═══ v2.3.1746: the owner's quest fanfare ═══
     Owner: "play this sound upon quest completion."  It REPLACES the synth
     levelUp() arpeggio here rather than stacking with it — two fanfares at
     once is mush — but levelUp() stays as the fallback for the one frame
     before the sample is decoded, and for any browser that refuses it.
     BT_AUDIO.play returns null (not false) when the sample is not loaded;
     testing `!== false` would count "not loaded" as success and ship the
     turn-in silent, which is exactly how 19 SFX shipped mute before
     v2.3.1610. */
  var _qcSfx = null;
  try { _qcSfx = BT_AUDIO.play('quest-complete', { vol: 0.9 }); } catch (e) { _qcSfx = null; }
  if (!_qcSfx) BT_AUDIO.levelUp();
  /* v2.3.1745: the banner carries the REWARD on the completed side — it is
     the one moment the numbers are worth reading, and the world popup that
     used to carry them is behind the dialogue, which stays open through the
     hand-in (v2.3.1713 below). */
  showQuestBanner('completed', questPanel.quest.title,
    '+' + questPanel.quest.reward.gold + 'g'
    + (questPanel.quest.reward.xp ? '  ·  +' + questPanel.quest.reward.xp + ' XP' : ''));
  /* ═══ v2.3.1713: THE DIALOGUE SURVIVES THE HAND-IN ═══
     Owner: "make it so that turning in the quest after completion launches
     the quest dialog window (same behavior as when you first begin a quest)."
     acceptQuest above keeps the card up and just flips its status to active;
     this path closed it outright with setQuestPanel(null).  That left the
     giver's NEXT quest unoffered until the player walked 110px away and came
     back, because the proximity opener's latch (S._npcProxLatch in
     BroTown.jsx) is still armed from this same visit — standing right in
     front of him with a blank screen, which reads as "he has nothing for
     me".  So re-open on whatever he has next.
     getNpcQuest is the SAME lookup the proximity opener uses, deliberately:
     the card you get by standing still now matches the one you would have
     got by walking away and back, instead of being a second opinion about
     what he offers.  It reads the local R, which lines 99-110 above have
     already advanced (this quest turnedIn, the chain's next one made
     available), so it sees the post-hand-in world.
     Only close when the lookup comes back empty — his chain is genuinely
     finished, and an empty screen is then the truth rather than a dead end. */
  var _nextFromGiver = getNpcQuest(R, questPanel.npc);
  if (_nextFromGiver) {
    setQuestPanel(_objectSpread(_objectSpread({}, questPanel), {}, {
      quest: _nextFromGiver.quest,
      status: _nextFromGiver.status
    }));
  } else {
    setQuestPanel(null);
  }
}
