import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === IncomingTradePanel — the incomingTrade modal === */
/* v2.3.885: extracted verbatim from the incomingTrade && rpgState JSX
   subtree in BroTown.jsx (the inbound trade-request popup: review the
   offer, accept or decline). Behavior-frozen UI decomposition; the
   `incomingTrade && rpgState &&` gate stays in BroTown. 4 props:
   stateRef, incomingTrade (state), setIncomingTrade, setRpgState
   (setters) — rpgState itself is only read in the gate, not the
   subtree. BT_AUDIO verified real export; spread/slice babel helpers
   imported; the one hoisted optional-chaining temp declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface, well tray for the offer chips, brass accept /
   raised decline at 44pt. Styles + static JSX only; the legacy-worker
   local-mint gate and both broadcasts are unchanged. */
/* v2.3.1235: owner-approved design correction — compact decision banner:
   sheet surface (#1E2E34) at radius 14, max-width 340, uppercase 15/700
   title + "wants to trade" line, gold-gradient "Open trade" primary /
   raised secondary Decline, heavier confirmation scrim rgba(4,9,12,0.52).
   Styles + static JSX only; handlers byte-identical. */
export function IncomingTradePanel(props) {
  var stateRef = props.stateRef,
    incomingTrade = props.incomingTrade,
    setIncomingTrade = props.setIncomingTrade,
    setRpgState = props.setRpgState;
  var _incomingTrade$offer;
  return React.createElement("div", {
    className: "bt-inspect",
    style: {
      background: 'rgba(4,9,12,0.52)' /* v2.3.1235: trade-confirmation scrim */
    },
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      /* v2.3.1232: floating world card */
      width: 'min(340px, calc(100vw - 24px))', /* v2.3.1235: banner max-width 340 */
      background: '#1E2E34', /* v2.3.1235: sheet surface, modal radius 14 */
      border: '1px solid rgba(229,237,233,0.20)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setIncomingTrade(null);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 15, /* v2.3.1235: title row 15/700 uppercase */
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.04em',
      color: '#F4F0E7',
      marginBottom: 4,
      paddingRight: 24
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
      e.currentTarget.replaceWith(document.createTextNode('📨'));
    }
  }), /*#__PURE__*/React.createElement("span", null, "Incoming Trade")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13, /* v2.3.1235: "wants to trade" line */
      color: '#B6C1BE',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#F4F0E7'
    }
  }, incomingTrade.fromName), " wants to trade. They offer:"), /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1232: recessed well tray behind the offer chips */
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 10,
      background: '#111E23', /* v2.3.1235: well token */
      borderRadius: 8,
      padding: 6,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
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
        background: '#293B41', /* v2.3.1235: raised chip, radius 999 */
        border: '1px solid rgba(229,237,233,0.11)',
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 12,
        color: '#B6C1BE',
        fontVariantNumeric: 'tabular-nums'
      }
    }, emojis[key] || key, " ×", qty);
  }), (((_incomingTrade$offer = incomingTrade.offer) === null || _incomingTrade$offer === void 0 ? void 0 : _incomingTrade$offer._gold) || 0) > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      /* v2.3.1232: gold amount = icon + 14/700 tabular brass */
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: '#293B41', /* v2.3.1235: raised chip, radius 999 */
      border: '1px solid rgba(229,237,233,0.11)',
      padding: '3px 8px',
      borderRadius: 999,
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#D8AA58' /* v2.3.1235: brass token */
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
  }), incomingTrade.offer._gold)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1235: primary gold gradient, 44pt */
      flex: 1,
      padding: '8px',
      minHeight: 44,
      borderRadius: 10,
      border: '1px solid #EAC675',
      background: 'linear-gradient(180deg, #E2B765, #D2A14D)',
      color: '#172126',
      fontSize: 13,
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Trade accepted!', '#59BF91');
      BT_AUDIO.collect();
      setIncomingTrade(null);
    }
  }, "Open trade"), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1235: raised secondary decline, strong hairline */
      flex: 1,
      padding: '8px',
      minHeight: 44,
      borderRadius: 10,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#293B41',
      color: '#F4F0E7',
      fontSize: 13,
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
  }, "Decline"))));
}
