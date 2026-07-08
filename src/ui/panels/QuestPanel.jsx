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
      color: '#f5c542',
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
      color: '#3dd497',
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
      background: '#5b52ff',
      color: '#fff',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      acceptQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Accept Quest"), questPanel.status === 'active' && questPanel.quest.check(rpgState, stateRef.current) && (
    /* v2.3.1218: a CAPSTONE quest turns in via a four-register moral
       choice (mayor_3) instead of a single button — each branch sends its
       `path` to turnInQuest.  Non-capstone quests keep the single button. */
    questPanel.quest.capstone ? (
      /* v2.3.1218 (rule 19 / TRAPS #9): only offer the four-register moral
         choice when the worker advertises caps.questCapstone — i.e. it owns
         the alignment counter.  Against an old worker the choice would be
         silently dropped AND the quest marked turnedIn forever, permanently
         burning the player's one-per-chain pick.  Hold it back instead. */
      !(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.questCapstone) ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: 'rgba(255,255,255,.5)',
          lineHeight: 1.5,
          padding: '8px',
          borderRadius: 8,
          background: 'rgba(255,255,255,.04)',
          textAlign: 'center'
        }
      }, "Mayor Bro is still mulling this one over. Check back after the next update.") : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.6)',
        marginBottom: 6
      }
    }, questPanel.quest.capstone.prompt), questPanel.quest.capstone.branches.map(function (br) {
      return /*#__PURE__*/React.createElement("button", {
        key: br.path,
        style: {
          width: '100%',
          padding: '8px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(255,255,255,.05)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 11,
          cursor: 'pointer',
          marginBottom: 6,
          textAlign: 'left'
        },
        onClick: function onClick() {
          turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel }, br.path);
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#a78bfa',
          fontSize: 9,
          fontWeight: 800,
          marginRight: 6
        }
      }, br.register), br.label);
    }))) : /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '8px',
        borderRadius: 8,
        border: 'none',
        background: '#3dd497',
        color: '#000',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
        turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
      }
    }, "Turn In Quest")
  )));
}
