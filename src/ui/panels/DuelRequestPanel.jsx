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
      width: 280,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 4
    }
  }, "\u2694\uFE0F Duel Challenge!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.7)',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", null, duelRequest.fromName), " challenges you!"), duelRequest.wager > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: '#D8A94D',
      marginBottom: 8
    }
  }, "\uD83D\uDCB0 Wager: ", duelRequest.wager, "g (winner takes all)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 8
    }
  }, "Duels are consensual. No reputation penalty. Loser pays wager (if any). No item loss."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
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
      flex: 0.6,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.6)',
      fontWeight: 700,
      fontSize: 12,
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
