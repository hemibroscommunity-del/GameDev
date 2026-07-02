import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === IncomingTradePanel — the incomingTrade modal === */
/* v2.3.885: extracted verbatim from the incomingTrade && rpgState JSX
   subtree in BroTown.jsx (the inbound trade-request popup: review the
   offer, accept or decline). Behavior-frozen UI decomposition; the
   `incomingTrade && rpgState &&` gate stays in BroTown. 4 props:
   stateRef, incomingTrade (state), setIncomingTrade, setRpgState
   (setters) — rpgState itself is only read in the gate, not the
   subtree. BT_AUDIO verified real export; spread/slice babel helpers
   imported; the one hoisted optional-chaining temp declared locally. */
export function IncomingTradePanel(props) {
  var stateRef = props.stateRef,
    incomingTrade = props.incomingTrade,
    setIncomingTrade = props.setIncomingTrade,
    setRpgState = props.setRpgState;
  var _incomingTrade$offer;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 260
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCE8 Trade from ", incomingTrade.fromName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 6
    }
  }, "They offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 8
    }
  }, Object.entries(incomingTrade.offer || {}).filter(function (_ref153) {
    var _ref154 = _slicedToArray(_ref153, 1),
      k = _ref154[0];
    return k !== '_gold';
  }).map(function (_ref155) {
    var _ref156 = _slicedToArray(_ref155, 2),
      key = _ref156[0],
      qty = _ref156[1];
    var emojis = {
      slime: '🟢',
      bat: '🦇',
      skeleton: '💀',
      crab: '🦀',
      golem: '🪨',
      logs: '🪵',
      oakLogs: '🟤',
      magicLogs: '✨',
      rawFish: '🐟',
      cookedFish: '🍳',
      rareFish: '⭐',
      burntFish: '🔥'
    };
    return /*#__PURE__*/React.createElement("span", {
      key: key,
      style: {
        background: 'rgba(255,255,255,.08)',
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11
      }
    }, emojis[key] || key, " \xD7", qty);
  }), (((_incomingTrade$offer = incomingTrade.offer) === null || _incomingTrade$offer === void 0 ? void 0 : _incomingTrade$offer._gold) || 0) > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'rgba(245,197,66,.15)',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      color: '#f5c542'
    }
  }, "\uD83D\uDCB0 ", incomingTrade.offer._gold, "G")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#3dd497',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      /* v2.3.1119: settlement-aware workers (caps.trade) move the goods
         server-side when they relay our accept -- the credit arrives via
         inbox_delivered + the authoritative player_state echo.  The
         local mint below was HALF of the trade duplication engine (the
         sender was never debited); it now runs only against a legacy
         worker. */
      if (!(S._serverCaps && S._serverCaps.trade)) {
        /* Accept: add offered items to our inventory */
        Object.entries(incomingTrade.offer || {}).forEach(function (_ref157) {
          var _ref158 = _slicedToArray(_ref157, 2),
            k = _ref158[0],
            v = _ref158[1];
          if (k === '_gold') R.coins += v;else if (R.inventory) R.inventory[k] = (R.inventory[k] || 0) + v;
        });
        setRpgState(_objectSpread({}, R));
      }
      /* Notify sender */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'trade_accept',
        payload: {
          from: S.myId,
          target: incomingTrade.from,
          offer: incomingTrade.offer
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Trade accepted!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setIncomingTrade(null);
    }
  }, "\u2705 Accept"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.15)',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'trade_reject',
        payload: {
          from: S.myId,
          target: incomingTrade.from
        }
      });
      setIncomingTrade(null);
    }
  }, "\u274C Decline"))));
}
