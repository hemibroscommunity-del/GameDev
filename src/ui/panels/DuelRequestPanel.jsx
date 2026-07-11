import React from 'react';
import { BT_AUDIO } from '@/data/index.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === DuelRequestPanel — the incoming duel-request modal === */
/* v2.3.891: extracted verbatim from the duelRequest JSX subtree in
   BroTown.jsx (the incoming PvP duel-challenge popup: accept or
   decline). Behavior-frozen UI decomposition; the `duelRequest &&` gate
   stays in BroTown. 3 props: stateRef, duelRequest (state),
   setDuelRequest (setter). BT_AUDIO verified real export; no hoisted
   temps. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface, evt-duel header icon, gold-icon wager, brass
   accept / raised decline at 44pt. Styles + static JSX only; the
   duel_accept/_inDuel/duel_decline handlers are unchanged. */
export function DuelRequestPanel(props) {
  var stateRef = props.stateRef,
    duelRequest = props.duelRequest,
    setDuelRequest = props.setDuelRequest;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setDuelRequest(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      /* v2.3.1232: floating world card, left-aligned per world-HUD language */
      width: 300,
      background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
      border: '1px solid rgba(238,242,235,.24)',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      color: '#F7F2E7',
      marginBottom: 4
    }
  }, /* v2.3.1232: UI Bible event icon with emoji fallback */
  /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/evt-duel.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('⚔️'));
    }
  }), /*#__PURE__*/React.createElement("span", null, "Duel Challenge!")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#F7F2E7'
    }
  }, duelRequest.fromName), " challenges you!"), duelRequest.wager > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1232: gold amount = icon + 14/700 tabular brass */
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#D8A85F',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/popups/gold.webp",
    alt: "",
    draggable: false,
    style: {
      width: 16,
      height: 16,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('💰'));
    }
  }), /*#__PURE__*/React.createElement("span", null, "Wager: ", duelRequest.wager, "g (winner takes all)")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      marginBottom: 10
    }
  }, "Duels are consensual. No reputation penalty. Loser pays wager (if any). No item loss."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: brass accept, 44pt */
      flex: 1,
      padding: '8px',
      minHeight: 44,
      borderRadius: 11,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'duel_accept',
        payload: {
          target: duelRequest.fromId,
          from: S2.myId,
          fromName: S2.myName,
          wager: duelRequest.wager || 0
        }
      });
      S2._inDuel = {
        opponent: duelRequest.fromId,
        opponentName: duelRequest.fromName,
        wager: duelRequest.wager || 0,
        startTime: Date.now()
      };
      setDuelRequest(null);
      pushDmgPopup(S2, S2.player.x, S2.player.y - 40, 'DUEL!', '#a78bfa');
      BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
    }
  }, "Accept", duelRequest.wager > 0 ? ' (' + duelRequest.wager + 'g)' : ''), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: raised secondary decline */
      flex: 0.6,
      padding: '8px',
      minHeight: 44,
      borderRadius: 11,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#2B3940',
      color: '#F7F2E7',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'duel_decline',
        payload: {
          target: duelRequest.fromId,
          from: S2.myId
        }
      });
      setDuelRequest(null);
    }
  }, "Decline"))));
}
