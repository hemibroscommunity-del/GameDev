import React from 'react';
import { acceptQuest, turnInQuest } from '@/game/quests.js';

/* === QuestPanel — NPC quest accept / turn-in dialog === */
/* v2.3.870: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. The
   accept/turn-in transition logic already lives in src/game/quests.js
   (REBUILD-PLAN Phase 3) and is imported here. 5 props (rpgState,
   stateRef, questPanel, setQuestPanel, setRpgState). The
   `_questPanel$npcRef` babel optional-chaining temp was hoisted to
   BroTown top; declared locally. */
export function QuestPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    questPanel = props.questPanel,
    setQuestPanel = props.setQuestPanel,
    setRpgState = props.setRpgState;
  var _questPanel$npcRef;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: ((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 900,
      color: '#fff'
    }
  }, questPanel.npc.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: '#fff'
    }
  }, questPanel.npc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, questPanel.status === 'available' ? 'New Quest!' : questPanel.status === 'active' ? 'Quest Active' : ''))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#D8A94D',
      marginBottom: 4
    }
  }, questPanel.quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.6)',
      lineHeight: 1.5,
      marginBottom: 8
    }
  }, questPanel.status === 'available' ? questPanel.quest.dialogue.start : questPanel.quest.check(rpgState, stateRef.current) ? questPanel.quest.dialogue.complete : questPanel.quest.dialogue.progress), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,255,255,.04)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)'
    }
  }, "Objective:"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fff'
    }
  }, questPanel.quest.desc), questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#59BF91',
      marginTop: 4
    }
  }, "\u2713 Complete!")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Reward: \uD83D\uDCB0", questPanel.quest.reward.gold, "g \xB7 \u2B50", questPanel.quest.reward.xp, "XP"), questPanel.status === 'available' && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#D8A85F',
      color: '#fff',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      acceptQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Accept Quest"), questPanel.status === 'active' && questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#59BF91',
      color: '#000',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Turn In Quest")));
}
