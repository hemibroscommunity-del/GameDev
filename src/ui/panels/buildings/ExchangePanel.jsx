import React from 'react';
import { BLACKSMITH_TIERS, BT_AUDIO, ELEMENTS, MKT_CATEGORIES, MKT_TIERS, MKT_WOOD_TIERS, WEAPON_TYPES, WOODWORKING_TIERS, estimateMktPrice } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _slicedToArray } from '@/lib/babelHelpers.js';

/* === ExchangePanel — buildingPanel === 'exchange' sub-panel === */
/* v2.3.876: extracted verbatim from the buildingPanel === 'exchange'
   clause in BroTown.jsx (the player marketplace: buy/sell orders,
   price estimation, order matching). Behavior-frozen UI decomposition;
   the gate stays in BroTown. 21 props (rpgState, stateRef, setRpgState
   plus the 9 mkt* state values and their 9 setters). Data imports
   verified real exports; BT_API_BASE re-imported from @/networking
   (byte-identical to BroTown's local var); async/regenerator + spread/
   slice babel helpers imported; hoisted optional-chaining temps declared
   locally. encodeURIComponent and fetch are browser globals. */
export function ExchangePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    mktCategory = props.mktCategory,
    mktElement1 = props.mktElement1,
    mktElement2 = props.mktElement2,
    mktMode = props.mktMode,
    mktOrders = props.mktOrders,
    mktPrice = props.mktPrice,
    mktSellItem = props.mktSellItem,
    mktSubtype = props.mktSubtype,
    mktTier = props.mktTier,
    setMktCategory = props.setMktCategory,
    setMktElement1 = props.setMktElement1,
    setMktElement2 = props.setMktElement2,
    setMktMode = props.setMktMode,
    setMktOrders = props.setMktOrders,
    setMktPrice = props.setMktPrice,
    setMktSellItem = props.setMktSellItem,
    setMktSubtype = props.setMktSubtype,
    setMktTier = props.setMktTier;
  var _BLACKSMITH_TIERS$mkt, _BLACKSMITH_TIERS$mkt2, _MKT_CATEGORIES$mktCa, _R$weaponStash, _WEAPON_TYPES$mktSubt, _WEAPON_TYPES$o, _WEAPON_TYPES$st, _WEAPON_TYPES$st2, _WEAPON_TYPES$sw, _WOODWORKING_TIERS$mk, _WOODWORKING_TIERS$mk2, _data$cancelled, _data$cancelled2, _data$matchedOrder;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#5b52ff',
      marginBottom: 2
    }
  }, "\uD83C\uDFEA Marketplace"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G \xB7 Cross-room buy & sell \xB7 Orders expire in 1hr"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 8,
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['buy', '🛒 Want to Buy'], ['sell', '💰 Want to Sell'], ['orders', '📋 My Orders']].map(function (_ref119) {
    var _ref120 = _slicedToArray(_ref119, 2),
      id = _ref120[0],
      label = _ref120[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setMktMode(id);
      },
      style: {
        flex: 1,
        padding: '5px 2px',
        fontSize: 8,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: mktMode === id ? 'rgba(91,82,255,.2)' : 'rgba(255,255,255,.03)',
        color: mktMode === id ? '#8880ff' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
      }
    }, label);
  })), mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 6
    }
  }, Object.entries(MKT_CATEGORIES).map(function (_ref121) {
    var _ref122 = _slicedToArray(_ref121, 2),
      k = _ref122[0],
      c = _ref122[1];
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: function onClick() {
        setMktCategory(k);
        setMktSubtype(c.subtypes[0]);
      },
      style: {
        flex: 1,
        padding: '4px 2px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1px solid ' + (mktCategory === k ? 'rgba(91,82,255,.4)' : 'rgba(255,255,255,.08)'),
        background: mktCategory === k ? 'rgba(91,82,255,.12)' : 'rgba(255,255,255,.02)',
        color: mktCategory === k ? '#a0a0ff' : 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, c.icon, " ", c.label);
  })), ((_MKT_CATEGORIES$mktCa = MKT_CATEGORIES[mktCategory]) === null || _MKT_CATEGORIES$mktCa === void 0 ? void 0 : _MKT_CATEGORIES$mktCa.subtypes.length) > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 6
    }
  }, MKT_CATEGORIES[mktCategory].subtypes.map(function (st) {
    var _WEAPON_TYPES$st, _WEAPON_TYPES$st2;
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: function onClick() {
        return setMktSubtype(st);
      },
      style: {
        flex: 1,
        padding: '3px 2px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 600,
        border: '1px solid ' + (mktSubtype === st ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
        background: mktSubtype === st ? 'rgba(91,82,255,.1)' : 'transparent',
        color: mktSubtype === st ? '#c0c0ff' : 'rgba(255,255,255,.35)',
        cursor: 'pointer'
      }
    }, ((_WEAPON_TYPES$st = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st === void 0 ? void 0 : _WEAPON_TYPES$st.emoji) || '🛡️', " ", ((_WEAPON_TYPES$st2 = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st2 === void 0 ? void 0 : _WEAPON_TYPES$st2.label) || st);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Material Tier"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6,
      maxHeight: 80,
      overflowY: 'auto'
    }
  }, (mktCategory === 'weapon' && (mktSubtype === 'bow' || mktSubtype === 'staff') ? MKT_WOOD_TIERS : MKT_TIERS).map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        setMktTier(t.id);
        setMktPrice(estimateMktPrice(t.id, mktSubtype));
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (mktTier === t.id ? t.color + '80' : t.color + '20'),
        background: mktTier === t.id ? t.color + '20' : 'transparent',
        color: mktTier === t.id ? t.color : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Element (optional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setMktElement1(null);
      setMktElement2(null);
    },
    style: {
      padding: '2px 5px',
      borderRadius: 3,
      fontSize: 7,
      fontWeight: 700,
      border: '1px solid ' + (mktElement1 === null ? 'rgba(91,82,255,.3)' : 'rgba(255,255,255,.06)'),
      background: mktElement1 === null ? 'rgba(91,82,255,.1)' : 'transparent',
      color: mktElement1 === null ? '#a0a0ff' : 'rgba(255,255,255,.25)',
      cursor: 'pointer'
    }
  }, "Any"), Object.entries(ELEMENTS).filter(function (_ref123) {
    var _ref124 = _slicedToArray(_ref123, 2),
      k = _ref124[0],
      e = _ref124[1];
    return e.type !== 'endgame';
  }).map(function (_ref125) {
    var _ref126 = _slicedToArray(_ref125, 2),
      k = _ref126[0],
      e = _ref126[1];
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: function onClick() {
        return setMktElement1(mktElement1 === k ? null : k);
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (mktElement1 === k ? e.color + '60' : 'rgba(255,255,255,.06)'),
        background: mktElement1 === k ? e.color + '15' : 'transparent',
        color: mktElement1 === k ? e.color : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, k);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, mktMode === 'buy' ? 'Max Bid' : 'Ask Price'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 1,
    max: 99999,
    value: mktPrice,
    onChange: function onChange(e) {
      return setMktPrice(Math.max(1, +e.target.value || 1));
    },
    style: {
      width: 70,
      padding: '4px 6px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 11,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginLeft: 'auto'
    }
  }, "Est: ~", estimateMktPrice(mktTier, mktSubtype), "G")), mktMode === 'sell' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "Select Item from Stash"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 6
    }
  }, (rpgState.weaponStash || []).map(function (sw, i) {
    var _WEAPON_TYPES$sw$type;
    var sel = mktSellItem === i;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function onClick() {
        setMktSellItem(i);
        setMktCategory('weapon');
        setMktSubtype(sw.type);
        if (sw.gearBase) setMktTier(sw.gearBase);
        setMktElement1(sw.element1 || null);
        setMktElement2(sw.element2 || null);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#5b52ff' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(91,82,255,.12)' : 'rgba(255,255,255,.02)',
        color: sel ? '#fff' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, ((_WEAPON_TYPES$sw$type = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type === void 0 ? void 0 : _WEAPON_TYPES$sw$type.emoji) || '⚔️', " ", sw.name);
  }), (!rpgState.weaponStash || rpgState.weaponStash.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.2)',
      fontStyle: 'italic'
    }
  }, "No items in stash to sell"))), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var S, R, _R$weaponStash, sellItem, _BLACKSMITH_TIERS$mkt, _WOODWORKING_TIERS$mk, tierLabel, res, data, execPrice, _data$matchedOrder, refund, ob, obd, _t9, _t0;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.p = _context0.n) {
          case 0:
            S = stateRef.current, R = S.rpg;
            if (R) {
              _context0.n = 1;
              break;
            }
            return _context0.a(2);
          case 1:
            if (!(mktMode === 'buy')) {
              _context0.n = 3;
              break;
            }
            if (!(R.coins < mktPrice)) {
              _context0.n = 2;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Not enough gold!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 2:
            _context0.n = 4;
            break;
          case 3:
            if (!(mktMode === 'sell')) {
              _context0.n = 4;
              break;
            }
            if (!(mktSellItem === null || !((_R$weaponStash = R.weaponStash) !== null && _R$weaponStash !== void 0 && _R$weaponStash[mktSellItem]))) {
              _context0.n = 4;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Select an item first!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 4:
            sellItem = mktMode === 'sell' ? R.weaponStash[mktSellItem] : null;
            /* Call server API */
            _context0.p = 5;
            tierLabel = ((_BLACKSMITH_TIERS$mkt = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt.label) || ((_WOODWORKING_TIERS$mk = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk === void 0 ? void 0 : _WOODWORKING_TIERS$mk.label) || mktTier;
            _context0.n = 6;
            return fetch(BT_API_BASE + '/api/market/place', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: mktMode,
                category: mktCategory,
                subtype: mktSubtype,
                tierKey: mktTier,
                element1: mktElement1,
                element2: mktElement2,
                price: mktPrice,
                item: sellItem,
                tierLabel: tierLabel,
                playerName: S.myName,
                playerId: S.myId
              })
            });
          case 6:
            res = _context0.v;
            _context0.n = 7;
            return res.json();
          case 7:
            data = _context0.v;
            if (data.ok) {
              _context0.n = 8;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: data.error || 'Failed!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context0.a(2);
          case 8:
            /* Apply client-side effects */
            if (mktMode === 'buy') {
              R.coins -= mktPrice; /* escrow */
              if (R._compStats) R._compStats.totalGoldSpent += mktPrice;
            }
            if (mktMode === 'sell' && mktSellItem !== null) {
              R.weaponStash.splice(mktSellItem, 1);
              setMktSellItem(null);
            }
            if (data.matched) {
              execPrice = data.execPrice;
              if (mktMode === 'buy') {
                refund = mktPrice - execPrice;
                if (refund > 0) R.coins += refund;
                if ((_data$matchedOrder = data.matchedOrder) !== null && _data$matchedOrder !== void 0 && _data$matchedOrder.item) {
                  if (!R.weaponStash) R.weaponStash = [];
                  R.weaponStash.push(data.matchedOrder.item);
                }
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Bought for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              } else {
                R.coins += execPrice;
                if (R._compStats) R._compStats.totalGoldEarned += execPrice;
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Sold for ' + execPrice + 'G!',
                  color: '#3dd497',
                  ts: Date.now()
                });
              }
              BT_AUDIO.collect();
            } else {
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 30,
                text: mktMode === 'buy' ? 'Buy order placed!' : 'Listed for sale!',
                color: '#5b52ff',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.05, 0.08, 'sine');
            }
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
            /* Refresh order book from server */
            _context0.p = 9;
            _context0.n = 10;
            return fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier);
          case 10:
            ob = _context0.v;
            _context0.n = 11;
            return ob.json();
          case 11:
            obd = _context0.v;
            if (obd.ok) setMktOrders(obd.orders);
            _context0.n = 13;
            break;
          case 12:
            _context0.p = 12;
            _t9 = _context0.v;
          case 13:
            _context0.n = 15;
            break;
          case 14:
            _context0.p = 14;
            _t0 = _context0.v;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Server error!',
              color: '#ff5e6c',
              ts: Date.now()
            });
          case 15:
            return _context0.a(2);
        }
      }, _callee0, null, [[9, 12], [5, 14]]);
    })),
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 800,
      border: '1.5px solid ' + (mktMode === 'buy' ? 'rgba(91,82,255,.4)' : 'rgba(245,197,66,.4)'),
      background: mktMode === 'buy' ? 'rgba(91,82,255,.15)' : 'rgba(245,197,66,.15)',
      color: mktMode === 'buy' ? '#a0a0ff' : '#f5c542',
      cursor: 'pointer',
      marginBottom: 8
    }
  }, mktMode === 'buy' ? '🛒 Place Buy Order (' + mktPrice + 'G)' : '💰 List for Sale (' + mktPrice + 'G)')), function (_BLACKSMITH_TIERS$mkt2, _WOODWORKING_TIERS$mk2, _WEAPON_TYPES$mktSubt) {
    var S = stateRef.current;
    var orders = mktOrders || [];
    var filtered = mktMode === 'orders' ? orders.filter(function (o) {
      return o.playerId === S.myId;
    }) : orders.filter(function (o) {
      return o.category === mktCategory && o.subtype === mktSubtype && o.tierKey === mktTier;
    });
    var buys = filtered.filter(function (o) {
      return o.type === 'buy';
    }).sort(function (a, b) {
      return b.price - a.price;
    });
    var sells = filtered.filter(function (o) {
      return o.type === 'sell';
    }).sort(function (a, b) {
      return a.price - b.price;
    });

    /* Auto-refresh order book when tab/filters change */
    var refreshKey = mktMode + mktCategory + mktSubtype + mktTier;
    if (S._mktLastRefresh !== refreshKey) {
      S._mktLastRefresh = refreshKey;
      var endpoint = mktMode === 'orders' ? BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId) : BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier;
      fetch(endpoint).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setMktOrders(d.orders);
      }).catch(function () {});
    }
    return /*#__PURE__*/React.createElement("div", null, mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#3dd497',
        flex: 1
      }
    }, "\uD83D\uDCCA Order Book \u2014 ", ((_BLACKSMITH_TIERS$mkt2 = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt2 === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt2.label) || ((_WOODWORKING_TIERS$mk2 = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk2 === void 0 ? void 0 : _WOODWORKING_TIERS$mk2.label) || mktTier, " ", ((_WEAPON_TYPES$mktSubt = WEAPON_TYPES[mktSubtype]) === null || _WEAPON_TYPES$mktSubt === void 0 ? void 0 : _WEAPON_TYPES$mktSubt.label) || mktSubtype), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null; /* force refresh */
        fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      style: {
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        color: 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), sells.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(255,94,108,.6)',
        marginBottom: 2
      }
    }, "SELL ORDERS (lowest first)"), sells.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(255,94,108,.05)',
          border: '1px solid rgba(255,94,108,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#ff5e6c',
          fontWeight: 700
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          flex: 1
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: '#5b52ff'
        }
      }, "(you)"));
    }), buys.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 700,
        color: 'rgba(61,212,151,.6)',
        marginTop: 4,
        marginBottom: 2
      }
    }, "BUY ORDERS (highest first)"), buys.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(61,212,151,.05)',
          border: '1px solid rgba(61,212,151,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#3dd497',
          fontWeight: 700
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          flex: 1
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: '#5b52ff'
        }
      }, "(you)"));
    }), sells.length === 0 && buys.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 8
      }
    }, "No orders yet. Be the first!")), mktMode === 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#5b52ff',
        flex: 1
      }
    }, "Your Active Orders (", filtered.length, ")"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null;
        fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      style: {
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)',
        color: 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No active orders"), filtered.map(function (o) {
      var _WEAPON_TYPES$o$subty;
      var timeLeft = Math.max(0, Math.ceil((o.expires - Date.now()) / 60000));
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: o.type === 'buy' ? '#3dd497' : '#ff5e6c'
        }
      }, o.type === 'buy' ? 'BUY' : 'SELL'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", ((_WEAPON_TYPES$o$subty = WEAPON_TYPES[o.subtype]) === null || _WEAPON_TYPES$o$subty === void 0 ? void 0 : _WEAPON_TYPES$o$subty.label) || o.subtype, " ", o.element1 ? '(' + o.element1 + ')' : ''), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.25)'
        }
      }, timeLeft, "m left")), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: '#f5c542'
        }
      }, o.price, "G"), /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
          var res, data, _data$cancelled, _data$cancelled2, R2, _t1;
          return _regenerator().w(function (_context1) {
            while (1) switch (_context1.p = _context1.n) {
              case 0:
                _context1.p = 0;
                _context1.n = 1;
                return fetch(BT_API_BASE + '/api/market/cancel?id=' + o.id + '&playerId=' + encodeURIComponent(S.myId), {
                  method: 'DELETE'
                });
              case 1:
                res = _context1.v;
                _context1.n = 2;
                return res.json();
              case 2:
                data = _context1.v;
                if (data.ok) {
                  R2 = stateRef.current.rpg;
                  /* Refund gold for buys, return item for sells */
                  if (((_data$cancelled = data.cancelled) === null || _data$cancelled === void 0 ? void 0 : _data$cancelled.type) === 'buy') R2.coins += data.cancelled.price;
                  if (((_data$cancelled2 = data.cancelled) === null || _data$cancelled2 === void 0 ? void 0 : _data$cancelled2.type) === 'sell' && data.cancelled.item) {
                    if (!R2.weaponStash) R2.weaponStash = [];
                    R2.weaponStash.push(data.cancelled.item);
                  }
                  setRpgState(_objectSpread({}, R2));
                  try {
                    localStorage.setItem('bt_rpg', JSON.stringify(R2));
                  } catch (e) {}
                  S.dmgNumbers.push({
                    x: S.player.x,
                    y: S.player.y - 30,
                    text: 'Order cancelled',
                    color: 'rgba(255,255,255,.5)',
                    ts: Date.now()
                  });
                  /* Refresh */
                  S._mktLastRefresh = null;
                  fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
                    return r.json();
                  }).then(function (d) {
                    if (d.ok) setMktOrders(d.orders);
                  }).catch(function () {});
                }
                _context1.n = 4;
                break;
              case 3:
                _context1.p = 3;
                _t1 = _context1.v;
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Cancel failed',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
              case 4:
                return _context1.a(2);
            }
          }, _callee1, null, [[0, 3]]);
        })),
        style: {
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,94,108,.2)',
          background: 'rgba(255,94,108,.08)',
          color: '#ff5e6c',
          cursor: 'pointer'
        }
      }, "\u2715"));
    })));
  }());
}
