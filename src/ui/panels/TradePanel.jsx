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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface, recessed item tray, brass selection + primary
   action, gold icon amounts. Styles + static JSX only; every handler
   and payload is unchanged. */
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
      /* v2.3.1232: floating world card — gradient, strong border, panel shadow */
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
      border: '1px solid rgba(238,242,235,.24)',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowTrade(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
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
    src: "/icons/ui/evt-trade.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🤝'));
    }
  }), /*#__PURE__*/React.createElement("span", null, "Trade with ", tradeTarget.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#B9C1BF',
      marginBottom: 8
    }
  }, "Select items to offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1232: recessed well tray behind the item grid */
      background: '#121B20',
      borderRadius: 8,
      padding: 4,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
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
        /* v2.3.1232: well-soft cell; brass = selection (spec: accent, not green) */
        padding: '4px 2px',
        borderRadius: 8,
        border: offered > 0 ? '2px solid #D8A85F' : '1px solid rgba(238,242,235,.08)',
        background: offered > 0 ? '#243137' : '#19252A',
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
        fontSize: 10,
        color: '#96A2A0',
        fontVariantNumeric: 'tabular-nums'
      }
    }, qty), offered > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -2,
        right: -2,
        fontSize: 10,
        fontWeight: 700,
        color: '#20170D',
        background: '#D8A85F',
        borderRadius: 6,
        padding: '0 3px',
        minWidth: 12,
        fontVariantNumeric: 'tabular-nums'
      }
    }, offered));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10
    }
  }, /* v2.3.1232: gold icon + label replaces the 💰 emoji label */
  /*#__PURE__*/React.createElement("img", {
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
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#B9C1BF'
    }
  }, "Gold"), /*#__PURE__*/React.createElement("input", {
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
      width: 76,
      background: '#121B20',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 8,
      color: '#D8A85F',
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      padding: '6px 8px',
      textAlign: 'right'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "/ ", rpgState.coins)), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: brass primary action, 44pt */
      width: '100%',
      minHeight: 44,
      padding: '8px',
      borderRadius: 11,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      fontSize: 13,
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Trade sent!', '#59BF91');
        setShowTrade(false);
      }
    }
  }, "Send Trade Offer")));
}
