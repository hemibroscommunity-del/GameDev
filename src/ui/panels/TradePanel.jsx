import React from 'react';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === TradePanel — the showTrade modal === */
/* v2.3.884: extracted verbatim from the showTrade && tradeTarget &&
   rpgState JSX subtree in BroTown.jsx (the outgoing player-to-player
   trade window: pick items + quantities to offer, send/cancel the
   trade). Behavior-frozen UI decomposition; the
   `showTrade && tradeTarget && rpgState &&` gate stays in BroTown. 6
   props: rpgState, stateRef, tradeTarget, tradeOffer (state) and
   setShowTrade, setTradeOffer (setters). No data-table imports; only
   the spread/slice babel helpers; no hoisted temps. */
export function TradePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    tradeTarget = props.tradeTarget,
    tradeOffer = props.tradeOffer,
    setShowTrade = props.setShowTrade,
    setTradeOffer = props.setTradeOffer;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowTrade(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowTrade(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83E\uDD1D Trade with ", tradeTarget.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Select items to offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 4,
      marginBottom: 8
    }
  }, Object.entries(rpgState.inventory || {}).filter(function (_ref149) {
    var _ref150 = _slicedToArray(_ref149, 2),
      k = _ref150[0],
      v = _ref150[1];
    return v > 0 && k !== 'potions';
  }).map(function (_ref151) {
    var _ref152 = _slicedToArray(_ref151, 2),
      key = _ref152[0],
      qty = _ref152[1];
    var offered = tradeOffer[key] || 0;
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
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      style: {
        padding: '4px 2px',
        borderRadius: 6,
        border: offered > 0 ? '2px solid #3dd497' : '1px solid rgba(255,255,255,.1)',
        background: offered > 0 ? 'rgba(61,212,151,.15)' : 'rgba(255,255,255,.04)',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative'
      },
      onClick: function onClick() {
        return setTradeOffer(function (prev) {
          var n = _objectSpread({}, prev);
          n[key] = ((n[key] || 0) + 1) % (qty + 1);
          if (n[key] === 0) delete n[key];
          return n;
        });
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16
      }
    }, emojis[key] || '📦'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, qty), offered > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -2,
        right: -2,
        fontSize: 8,
        fontWeight: 900,
        color: '#fff',
        background: '#3dd497',
        borderRadius: 6,
        padding: '0 3px',
        minWidth: 12
      }
    }, offered));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)'
    }
  }, "\uD83D\uDCB0 Gold:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    max: rpgState.coins || 0,
    value: tradeOffer._gold || 0,
    onChange: function onChange(e) {
      return setTradeOffer(function (prev) {
        return _objectSpread(_objectSpread({}, prev), {}, {
          _gold: Math.min(rpgState.coins, Math.max(0, parseInt(e.target.value) || 0))
        });
      });
    },
    style: {
      width: 60,
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 4,
      color: '#fff',
      fontSize: 11,
      padding: '3px 6px',
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)'
    }
  }, "/ ", rpgState.coins)), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
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
      if (S.channel) {
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'trade_offer',
          payload: {
            from: S.myId,
            fromName: S.myName,
            target: tradeTarget.id,
            offer: tradeOffer
          }
        });
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Trade sent!', '#3dd497');
        setShowTrade(false);
      }
    }
  }, "\uD83D\uDCE8 Send Trade Offer")));
}
