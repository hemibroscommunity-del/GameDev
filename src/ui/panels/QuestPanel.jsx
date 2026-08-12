import React from 'react';
import { acceptQuest, turnInQuest } from '@/game/quests.js';
import { NPC_DATA } from '@/data/gameDisplay.js';

/* v2.3.1681 (owner: "Add thumbnail of mayor bro's profile picture in quest
   dialog box and also thumbnail of the quest items (sword and shield)").
   Looked up by the NAME the quest chain stores — the same key getNpcQuest
   matches on — so there is no second id to keep in sync.  Null for a giver
   with no art, which falls back to the initial-letter disc below. */
function npcPortrait(name) {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  return (npc && npc.portrait) || null;
}

/* One item chip: art over its name.  Small (40px) — this is a "here is what
   it looks like" cue beside the text, not a shop listing.  A missing file
   removes the whole chip rather than leaving a broken-image glyph in the
   middle of the dialogue. */
function ItemChip(props) {
  const it = props.item;
  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 52 },
  }, React.createElement('img', {
    src: it.icon,
    alt: it.label || '',
    draggable: false,
    style: {
      width: 40, height: 40, objectFit: 'contain',
      borderRadius: 9,
      background: '#121B20',
      /* Same recessed well as the objective block, so the chips read as part
         of the panel's material rather than pasted on. */
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      padding: 3,
    },
    onError: function onError(e) {
      const box = e.currentTarget.parentNode;
      if (box && box.parentNode) box.parentNode.removeChild(box);
    },
  }), React.createElement('div', {
    style: { fontSize: 9, lineHeight: 1.15, color: '#96A2A0', textAlign: 'center' },
  }, it.label || ''));
}

/* === QuestPanel — NPC quest accept / turn-in dialog === */
/* v2.3.870: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. The
   accept/turn-in transition logic already lives in src/game/quests.js
   (REBUILD-PLAN Phase 3) and is imported here. 5 props (rpgState,
   stateRef, questPanel, setQuestPanel, setRpgState). The
   `_questPanel$npcRef` babel optional-chaining temp was hoisted to
   BroTown top; declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) — panel
   surface + 11/600 section headers + recessed objective well + 44px
   brass primary. Styles/structure only; handlers untouched. */
export function QuestPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    questPanel = props.questPanel,
    setQuestPanel = props.setQuestPanel,
    setRpgState = props.setRpgState;
  var _questPanel$npcRef;
  /* v2.3.1681: the giver's face, and the kit on offer. */
  var _portrait = npcPortrait(questPanel.npc);
  /* Which payout to illustrate: an offer shows what saying yes hands over,
     an accepted quest shows what coming back pays.  Showing both at once
     would promise the turn-in reward as if it were already yours. */
  var _giveWhen = questPanel.status === 'available' ? 'accept' : 'complete';
  var _gives = (questPanel.quest.gives || []).filter(function (g) {
    return g && g.icon && g.when === _giveWhen;
  });
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
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — UI-Bible icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-quests.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('📜'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Quest")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      marginBottom: 8
    }
  }, _portrait ? /*#__PURE__*/React.createElement("img", {
    /* v2.3.1681: his actual face.  Same head crop the sheet's quest page
       uses, so the portrait can never drift from the figure in the street.
       On error the <img> swaps itself for the letter disc rather than leaving
       a broken-image icon where the quest giver should be. */
    src: _portrait,
    alt: questPanel.npc,
    draggable: false,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      objectFit: 'cover',
      background: '#121B20',
      border: '1px solid rgba(238,242,235,.16)',
      flexShrink: 0
    },
    onError: function onError(e) {
      var d = document.createElement('div');
      d.textContent = questPanel.npc.charAt(0);
      d.setAttribute('style', 'width:44px;height:44px;border-radius:50%;background:'
        + (((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888')
        + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#F7F2E7;flex-shrink:0');
      e.currentTarget.replaceWith(d);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: ((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 900,
      color: '#F7F2E7',
      flexShrink: 0
    }
  }, questPanel.npc.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7'
    }
  }, questPanel.npc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, questPanel.status === 'available' ? 'New Quest!' : questPanel.status === 'active' ? 'Quest Active' : ''))), _gives.length > 0 && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1681: the kit, pictured.  Sits high — directly under his name,
       above the dialogue — because the card scrolls on a phone and anything
       below the quest text is behind the fold.  The owner asked to SEE the
       sword and shield; putting them where the reward line goes would have
       meant scrolling to find them. */
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      paddingTop: 12,
      flexShrink: 0
    }
  }, _giveWhen === 'accept' ? 'He gives you' : 'You receive'), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 8, flexWrap: 'wrap' }
  }, _gives.map(function (g, i) {
    return /*#__PURE__*/React.createElement(ItemChip, { key: g.icon + i, item: g });
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7',
      marginBottom: 4
    }
  }, questPanel.quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: '#B9C1BF',
      lineHeight: 1.5,
      marginBottom: 10
    }
  }, questPanel.status === 'available' ? questPanel.quest.dialogue.start : questPanel.quest.check(rpgState, stateRef.current) ? questPanel.quest.dialogue.complete : questPanel.quest.dialogue.progress), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: objective sits in a recessed well */
    style: {
      padding: 10,
      borderRadius: 8,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 3
    }
  }, "Objective"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: '#F7F2E7'
    }
  }, questPanel.quest.desc), questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#59BF91',
      marginTop: 4
    }
  }, "✓ Complete!")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0'
    }
  }, "Reward"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#F7F2E7'
    }
  }, "💰", questPanel.quest.reward.gold, "g \xB7 ⭐", questPanel.quest.reward.xp, "XP")), /*#__PURE__*/React.createElement("div", {
    /* ═══ v2.3.1681: THE BUTTON STAYS ON SCREEN ═══
       The card is already a scroll container (game.css clamps it to the game
       area, above the dashboard band).  That was fine when the dialogue was
       three lines; it is not fine now that the opening quest carries the
       control instructions AND a row of item thumbnails, which push "Accept
       Quest" below the fold on a phone.  It was still reachable by scrolling,
       and the scrollbar is deliberately hidden, so the very first interaction
       in the game was a button a new player had no reason to believe existed.
       Sticky footer instead: the text scrolls, the one action never leaves.
       The negative margins bleed the card's own surface to the card's edges
       so scrolling text passes UNDER an opaque strip rather than beside it. */
    style: {
      position: 'sticky',
      bottom: -16,
      background: '#202C32',
      marginLeft: -16, marginRight: -16, marginBottom: -16,
      padding: '8px 16px 16px',
      boxShadow: '0 -10px 12px rgba(32,44,50,.92)'
    }
  }, questPanel.status === 'available' && /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: brass primary — the region's one primary action */
      width: '100%',
      minHeight: 44,
      padding: '10px',
      borderRadius: 11,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      acceptQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Accept Quest"), questPanel.status === 'active' && questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: brass primary (only one button renders per status) */
      width: '100%',
      minHeight: 44,
      padding: '10px',
      borderRadius: 11,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Turn In Quest"))));
}
