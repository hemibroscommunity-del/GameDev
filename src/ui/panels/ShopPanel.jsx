import React from 'react';
import { BT_AUDIO, SHOP_ITEMS_FOR_SALE, SHOP_PRICES } from '@/data/index.js';
import { syncRpgToServer } from '@/networking/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ ShopPanel — town shop buy/sell ═══ */
/* v2.3.866: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props (rpgState, stateRef, setRpgState, setShowShop). SHOP_ITEMS_FOR_SALE/
   SHOP_PRICES/BT_AUDIO + syncRpgToServer + babel imported (real exports
   verified). No hoisted temps. */
/* v2.3.1232: Lantern Slate restyle — panel surface, section headers,
   sell grid in a recessed well (+ empty state), 44px buy rows, Sell All
   promoted to the brass primary. Styles/structure only; every handler
   body is byte-identical. */
export function ShopPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowShop = props.setShowShop;
  /* v2.3.1232: hoisted the (unchanged) sell-grid filter so the well can
     render an empty state when there is nothing to sell. */
  var sellables = Object.entries(rpgState.inventory || {}).filter(function (_ref222) {
    var _ref223 = _slicedToArray(_ref222, 2),
      k = _ref223[0],
      v = _ref223[1];
    return v > 0 && SHOP_PRICES[k] > 0;
  });
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowShop(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 280 fixed — fill narrow phones, never overflow */
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
      return setShowShop(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-shop.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🏪'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Market")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0'
    }
  }, "Gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#F7F2E7'
    }
  }, "💰 ", rpgState.coins)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Sell Items"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: sell grid lives in a recessed well */
    style: {
      padding: 6,
      borderRadius: 10,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      marginBottom: 12
    }
  }, sellables.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: '#96A2A0',
      textAlign: 'center',
      padding: '14px 8px'
    }
  }, "Nothing to sell yet."), sellables.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4
    }
  }, sellables.map(function (_ref224) {
    var _ref225 = _slicedToArray(_ref224, 2),
      key = _ref225[0],
      qty = _ref225[1];
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
      npc: '💀'
    };
    var price = SHOP_PRICES[key] || 0;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      style: {
        minHeight: 44,
        padding: '6px 4px',
        borderRadius: 8,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        textAlign: 'center',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R.inventory || !R.inventory[key] || R.inventory[key] < 1) return;
        R.inventory[key]--;
        R.coins += price;
        setRpgState(_objectSpread({}, R));
        syncRpgToServer(R);
        BT_AUDIO.beep(500, 0.05, 0.08, 'sine');
        pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + price + 'G', '#D8A94D');
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16
      }
    }, emojis[key] || '📦'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7'
      }
    }, price, "G"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontVariantNumeric: 'tabular-nums',
        color: '#96A2A0'
      }
    }, "\xD7", qty));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Buy Items"), SHOP_ITEMS_FOR_SALE.map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        padding: '6px 10px',
        minHeight: 44,
        borderRadius: 10,
        background: '#182227',
        border: '1px solid rgba(238,242,235,.14)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: '#F7F2E7'
      }
    }, item.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#96A2A0'
      }
    }, item.desc)), /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1232: secondary raised button; well-soft + disabled text
           when unaffordable (was green/grey) */
        minHeight: 32,
        padding: '4px 12px',
        borderRadius: 11,
        border: '1px solid rgba(238,242,235,.14)',
        background: rpgState.coins >= item.cost ? '#2B3940' : '#19252A',
        color: rpgState.coins >= item.cost ? '#F7F2E7' : '#687575',
        fontSize: 13,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (R.coins < item.cost) return;
        R.coins -= item.cost;
        if (item.key === 'potions') {
          R.hp = Math.min(R.maxHp, R.hp + 30);
          pushDmgPopup(S, S.player.x, S.player.y - 30, '+30HP', '#59BF91');
        }
        setRpgState(_objectSpread({}, R));
        BT_AUDIO.collect();
      }
    }, item.cost, "G"));
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: Sell All is the panel's one brass primary (was a
         red-tinted ghost button that read destructive) */
      width: '100%',
      marginTop: 8,
      minHeight: 44,
      padding: '10px',
      borderRadius: 11,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      fontSize: 13,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      var R = S.rpg;
      var total = 0;
      Object.entries(R.inventory || {}).forEach(function (_ref226) {
        var _ref227 = _slicedToArray(_ref226, 2),
          k = _ref227[0],
          v = _ref227[1];
        if (v > 0 && SHOP_PRICES[k] > 0) {
          total += SHOP_PRICES[k] * v;
          R.inventory[k] = 0;
        }
      });
      R.coins += total;
      setRpgState(_objectSpread({}, R));
      if (total > 0) syncRpgToServer(R);
      if (total > 0) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + total + 'G', '#D8A94D');
        BT_AUDIO.collect();
      }
    }
  }, "Sell All (", Object.entries(rpgState.inventory || {}).reduce(function (t, _ref228) {
    var _ref229 = _slicedToArray(_ref228, 2),
      k = _ref229[0],
      v = _ref229[1];
    return t + (SHOP_PRICES[k] || 0) * v;
  }, 0), "G)")));
}
