import React from 'react';
import { BT_AUDIO, SHOP_ITEMS_FOR_SALE, SHOP_PRICES } from '@/data/index.js';
import { syncRpgToServer } from '@/networking/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* ═══ ShopPanel — town shop buy/sell ═══ */
/* v2.3.866: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props (rpgState, stateRef, setRpgState, setShowShop). SHOP_ITEMS_FOR_SALE/
   SHOP_PRICES/BT_AUDIO + syncRpgToServer + babel imported (real exports
   verified). No hoisted temps. */
export function ShopPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowShop = props.setShowShop;
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
      width: 280
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowShop(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "\uD83C\uDFEA Market"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 10
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, " Gold"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "Sell Items"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4,
      marginBottom: 10
    }
  }, Object.entries(rpgState.inventory || {}).filter(function (_ref222) {
    var _ref223 = _slicedToArray(_ref222, 2),
      k = _ref223[0],
      v = _ref223[1];
    return v > 0 && SHOP_PRICES[k] > 0;
  }).map(function (_ref224) {
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
        padding: '6px 4px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
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
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: '+' + price + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14
      }
    }, emojis[key] || '📦'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: '#f5c542'
      }
    }, price, "G"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "\xD7", qty));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "Buy Items"), SHOP_ITEMS_FOR_SALE.map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        padding: '6px 8px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#fff'
      }
    }, item.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, item.desc)), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '4px 10px',
        borderRadius: 6,
        border: 'none',
        background: rpgState.coins >= item.cost ? '#3dd497' : 'rgba(60,60,60,.5)',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (R.coins < item.cost) return;
        R.coins -= item.cost;
        if (item.key === 'potions') {
          R.hp = Math.min(R.maxHp, R.hp + 30);
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: '+30HP',
            color: '#3dd497',
            ts: Date.now()
          });
        }
        setRpgState(_objectSpread({}, R));
        BT_AUDIO.collect();
      }
    }, item.cost, "G"));
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: 6,
      padding: '8px',
      borderRadius: 8,
      border: '1px solid rgba(255,92,108,.3)',
      background: 'rgba(255,92,108,.15)',
      color: '#ff5e6c',
      fontSize: 11,
      fontWeight: 700,
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
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: '+' + total + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
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
