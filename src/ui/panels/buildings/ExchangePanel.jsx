import React from 'react';
import { BLACKSMITH_TIERS, BT_AUDIO, ELEMENTS, MKT_CATEGORIES, MKT_TIERS, MKT_WOOD_TIERS, WEAPON_TYPES, WOODWORKING_TIERS, estimateMktPrice } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
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
  /* v2.3.1118: market ops are settled by the GameRoom DO now, so every
     call carries the session's room -- a ?room=qa1 tester's escrow must
     land in the DO that holds their wallet, not brotown-1's. */
  var _mktRoom = function _mktRoom() {
    try {
      return encodeURIComponent(stateRef.current._currentRoom || 'brotown-1');
    } catch (e) {
      return 'brotown-1';
    }
  };
  /* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) \u2014
     panel surface + icon header, segmented buy/sell/orders tabs on a
     #121B20 track with the brass bottom edge, 32px/999 filter chips
     (brass-fill when selected), gold-icon prices, and ONE brass primary
     (the place-order button).  Styles + JSX grouping only \u2014 every
     handler, fetch, and settled/legacy branch is byte-identical. */
  return React.createElement("div", {
    style: {
      margin: -20,
      padding: '16px 14px',
      background: '#202C32',
      borderRadius: 13,
      textAlign: 'left',
      fontFamily: "'Source Sans 3',sans-serif"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      paddingRight: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/bldg-exchange.webp",
    alt: "",
    draggable: false,
    style: {
      width: 26,
      height: 26,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFEA'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Marketplace")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      marginBottom: 10
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
      e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0'));
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#D8A85F'
    }
  }, rpgState.coins), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, "Buy & sell \xB7 Listings last 24h, refunds by mail")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      padding: 2,
      borderRadius: 8,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
    }
  },[['buy', 'Buy'], ['sell', 'Sell'], ['orders', 'My Orders']].map(function (_ref119) {
    var _ref120 = _slicedToArray(_ref119, 2),
      id = _ref120[0],
      label = _ref120[1];
    /* v2.3.1232: segmented tab — active #2B3940 + 2px brass bottom edge */
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setMktMode(id);
      },
      style: {
        flex: 1,
        minHeight: 32,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 700,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        background: mktMode === id ? '#2B3940' : 'transparent',
        boxShadow: mktMode === id ? 'inset 0 -2px 0 #D8A85F' : 'none',
        color: mktMode === id ? '#F7F2E7' : '#96A2A0',
        fontFamily: 'inherit'
      }
    }, label);
  })), mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
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
      /* v2.3.1232: filter chip — 32px/999, selected brass-fill + brass text */
      style: {
        flex: 1,
        minHeight: 32,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktCategory === k ? 'rgba(216,168,95,.4)' : 'rgba(238,242,235,.14)'),
        background: mktCategory === k ? '#3B3427' : 'transparent',
        color: mktCategory === k ? '#D8A85F' : '#96A2A0',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, c.icon, " ", c.label);
  })), ((_MKT_CATEGORIES$mktCa = MKT_CATEGORIES[mktCategory]) === null || _MKT_CATEGORIES$mktCa === void 0 ? void 0 : _MKT_CATEGORIES$mktCa.subtypes.length) > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "Type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, MKT_CATEGORIES[mktCategory].subtypes.map(function (st) {
    var _WEAPON_TYPES$st, _WEAPON_TYPES$st2;
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: function onClick() {
        return setMktSubtype(st);
      },
      /* v2.3.1232: filter chip (see category chips) */
      style: {
        flex: 1,
        minHeight: 32,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktSubtype === st ? 'rgba(216,168,95,.4)' : 'rgba(238,242,235,.14)'),
        background: mktSubtype === st ? '#3B3427' : 'transparent',
        color: mktSubtype === st ? '#D8A85F' : '#96A2A0',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, ((_WEAPON_TYPES$st = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st === void 0 ? void 0 : _WEAPON_TYPES$st.emoji) || '🛡️', " ", ((_WEAPON_TYPES$st2 = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st2 === void 0 ? void 0 : _WEAPON_TYPES$st2.label) || st);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "Material Tier"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 8,
      maxHeight: 112,
      overflowY: 'auto'
    }
  }, (mktCategory === 'weapon' && (mktSubtype === 'bow' || mktSubtype === 'staff') ? MKT_WOOD_TIERS : MKT_TIERS).map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        setMktTier(t.id);
        setMktPrice(estimateMktPrice(t.id, mktSubtype));
      },
      /* v2.3.1232: filter chip (see category chips) */
      style: {
        minHeight: 32,
        padding: '0 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktTier === t.id ? 'rgba(216,168,95,.4)' : 'rgba(238,242,235,.14)'),
        background: mktTier === t.id ? '#3B3427' : 'transparent',
        color: mktTier === t.id ? '#D8A85F' : '#96A2A0',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "Element (optional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setMktElement1(null);
      setMktElement2(null);
    },
    /* v2.3.1232: filter chip (see category chips) */
    style: {
      minHeight: 32,
      padding: '0 12px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      border: '1px solid ' + (mktElement1 === null ? 'rgba(216,168,95,.4)' : 'rgba(238,242,235,.14)'),
      background: mktElement1 === null ? '#3B3427' : 'transparent',
      color: mktElement1 === null ? '#D8A85F' : '#96A2A0',
      cursor: 'pointer',
      fontFamily: 'inherit'
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
      /* v2.3.1232: filter chip (see category chips) */
      style: {
        minHeight: 32,
        padding: '0 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktElement1 === k ? 'rgba(216,168,95,.4)' : 'rgba(238,242,235,.14)'),
        background: mktElement1 === k ? '#3B3427' : 'transparent',
        color: mktElement1 === k ? '#D8A85F' : '#96A2A0',
        cursor: 'pointer',
        fontFamily: 'inherit'
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
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0'
    }
  }, mktMode === 'buy' ? 'Max Bid' : 'Ask Price'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 1,
    max: 99999,
    value: mktPrice,
    onChange: function onChange(e) {
      return setMktPrice(Math.max(1, +e.target.value || 1));
    },
    /* v2.3.1232: input trough — #121B20 well, tabular brass value */
    style: {
      width: 84,
      height: 40,
      padding: '0 10px',
      borderRadius: 8,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)',
      color: '#D8A85F',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none',
      caretColor: '#F0C878'
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "/icons/popups/gold.webp",
    alt: "gold",
    draggable: false,
    style: {
      width: 16,
      height: 16,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🪙'));
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      fontVariantNumeric: 'tabular-nums',
      marginLeft: 'auto'
    }
  }, "Est: ~", estimateMktPrice(mktTier, mktSubtype), "G")), mktMode === 'sell' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 4
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
      /* v2.3.1232: selectable slot — raised when selected, brass edge = selection */
      style: {
        minHeight: 32,
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (sel ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: sel ? '#2B3940' : '#19252A',
        color: sel ? '#F7F2E7' : '#B9C1BF',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, ((_WEAPON_TYPES$sw$type = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type === void 0 ? void 0 : _WEAPON_TYPES$sw$type.emoji) || '⚔️', " ", sw.name);
  }), (!rpgState.weaponStash || rpgState.weaponStash.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#96A2A0',
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Not enough gold!', '#D95C54');
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Select an item first!', '#D95C54');
            return _context0.a(2);
          case 4:
            sellItem = mktMode === 'sell' ? R.weaponStash[mktSellItem] : null;
            /* Call server API */
            _context0.p = 5;
            tierLabel = ((_BLACKSMITH_TIERS$mkt = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt.label) || ((_WOODWORKING_TIERS$mk = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk === void 0 ? void 0 : _WOODWORKING_TIERS$mk.label) || mktTier;
            _context0.n = 6;
            return fetch(BT_API_BASE + '/api/market/place?room=' + _mktRoom(), {
              method: 'POST',
              /* v2.3.1178: session token — the worker rejects mutating
                 economy calls whose playerId isn't backed by the
                 caller's own state_sync token (item-theft fix). Absent
                 against old workers (no token in state_sync). */
              headers: (function () {
                var _h = { 'Content-Type': 'application/json' };
                if (S._httpToken) _h['x-bt-auth'] = S._httpToken;
                return _h;
              })(),
              body: JSON.stringify({
                type: mktMode,
                category: mktCategory,
                subtype: mktSubtype,
                tierKey: mktTier,
                element1: mktElement1,
                element2: mktElement2,
                price: mktPrice,
                item: sellItem,
                /* v2.3.1118: settling workers escrow the weapon out of
                   the SERVER's stash copy by this index and ignore the
                   `item` blob above (kept for legacy workers). */
                stashIndex: mktSellItem,
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, data.error || 'Failed!', '#D95C54');
            return _context0.a(2);
          case 8:
            /* v2.3.1118: settlement is SERVER-SIDE when the worker sends
               settled: true -- escrow was taken at placement from the
               server's own copies, and match payouts/refunds arrive via
               the authoritative player_state echo (or the inbox when a
               party is offline).  The client-side mutations below were
               the self-credit hole (free duplication with devtools);
               they now run ONLY against a legacy worker without the
               flag, keeping both deploy orders safe. */
            if (!data.settled) {
              /* Legacy worker: apply client-side effects */
              if (mktMode === 'buy') {
                R.coins -= mktPrice; /* escrow */
              }
              if (mktMode === 'sell' && mktSellItem !== null) {
                R.weaponStash.splice(mktSellItem, 1);
              }
              if (data.matched) {
                if (mktMode === 'buy') {
                  refund = mktPrice - data.execPrice;
                  if (refund > 0) R.coins += refund;
                  if ((_data$matchedOrder = data.matchedOrder) !== null && _data$matchedOrder !== void 0 && _data$matchedOrder.item) {
                    if (!R.weaponStash) R.weaponStash = [];
                    R.weaponStash.push(data.matchedOrder.item);
                  }
                } else {
                  R.coins += data.execPrice;
                }
              }
              setRpgState(_objectSpread({}, R));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(R));
              } catch (e) {}
            }
            /* _compStats gold tallies stay client-tracked on both paths
               (cosmetic lifetime counters, not wallet state). */
            if (data.matched) {
              if (R._compStats) {
                if (mktMode === 'buy') R._compStats.totalGoldSpent += data.execPrice;
                else R._compStats.totalGoldEarned += data.execPrice;
              }
            } else if (R._compStats && mktMode === 'buy') {
              R._compStats.totalGoldSpent += mktPrice;
            }
            if (mktMode === 'sell' && mktSellItem !== null) setMktSellItem(null);
            if (data.matched) {
              execPrice = data.execPrice;
              pushDmgPopup(S, S.player.x, S.player.y - 30, (mktMode === 'buy' ? 'Bought for ' : 'Sold for ') + execPrice + 'G!', '#59BF91');
              BT_AUDIO.collect();
            } else {
              pushDmgPopup(S, S.player.x, S.player.y - 30, mktMode === 'buy' ? 'Buy order placed!' : 'Listed for sale!', '#D8A85F');
              BT_AUDIO.beep(500, 0.05, 0.08, 'sine');
            }
            /* Refresh order book from server */
            _context0.p = 9;
            _context0.n = 10;
            return fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier + '&room=' + _mktRoom());
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Server error!', '#D95C54');
          case 15:
            return _context0.a(2);
        }
      }, _callee0, null, [[9, 12], [5, 14]]);
    })),
    /* v2.3.1232: THE brass primary of the panel — 44px, #D8A85F on #20170D */
    style: {
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D',
      cursor: 'pointer',
      marginBottom: 10,
      fontFamily: 'inherit'
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
      var endpoint = mktMode === 'orders' ? BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId) + '&room=' + _mktRoom() : BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier + '&room=' + _mktRoom();
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
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        flex: 1
      }
    }, "Order Book \u2014 ", ((_BLACKSMITH_TIERS$mkt2 = BLACKSMITH_TIERS[mktTier]) === null || _BLACKSMITH_TIERS$mkt2 === void 0 ? void 0 : _BLACKSMITH_TIERS$mkt2.label) || ((_WOODWORKING_TIERS$mk2 = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')]) === null || _WOODWORKING_TIERS$mk2 === void 0 ? void 0 : _WOODWORKING_TIERS$mk2.label) || mktTier, " ", ((_WEAPON_TYPES$mktSubt = WEAPON_TYPES[mktSubtype]) === null || _WEAPON_TYPES$mktSubt === void 0 ? void 0 : _WEAPON_TYPES$mktSubt.label) || mktSubtype), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null; /* force refresh */
        fetch(BT_API_BASE + '/api/market/orders?category=' + mktCategory + '&subtype=' + mktSubtype + '&tier=' + mktTier + '&room=' + _mktRoom()).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      /* v2.3.1232: secondary icon button \u2014 raised + hairline */
      style: {
        width: 32,
        height: 32,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#B9C1BF',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), sells.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.12em',
        color: 'rgba(217,92,84,.6)',
        margin: '6px 0 4px'
      }
    }, "SELL ORDERS (lowest first)"), sells.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        /* v2.3.1232: 40px list row on well-soft, gold-icon tabular price */
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
          padding: '4px 8px',
          borderRadius: 8,
          background: '#19252A',
          marginBottom: 3,
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          color: '#D8A85F',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums'
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
          e.currentTarget.replaceWith(document.createTextNode('🪙'));
        }
      }), o.price), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#B9C1BF',
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: '#96A2A0'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: '#D8A85F'
        }
      }, "(you)"));
    }), buys.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.12em',
        color: 'rgba(89,191,145,.6)',
        margin: '8px 0 4px'
      }
    }, "BUY ORDERS (highest first)"), buys.slice(0, 8).map(function (o) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        /* v2.3.1232: 40px list row on well-soft, gold-icon tabular price */
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
          padding: '4px 8px',
          borderRadius: 8,
          background: '#19252A',
          marginBottom: 3,
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          color: '#D8A85F',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums'
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
          e.currentTarget.replaceWith(document.createTextNode('🪙'));
        }
      }), o.price), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#B9C1BF',
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: '#96A2A0'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: '#D8A85F'
        }
      }, "(you)"));
    }), sells.length === 0 && buys.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#96A2A0',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 10
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
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        flex: 1
      }
    }, "Your Active Orders (", filtered.length, ")"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        S._mktLastRefresh = null;
        fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId) + '&room=' + _mktRoom()).then(function (r) {
          return r.json();
        }).then(function (d) {
          if (d.ok) setMktOrders(d.orders);
        }).catch(function () {});
      },
      /* v2.3.1232: secondary icon button \u2014 raised + hairline */
      style: {
        width: 32,
        height: 32,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#B9C1BF',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#96A2A0',
        fontStyle: 'italic'
      }
    }, "No active orders"), filtered.map(function (o) {
      var _WEAPON_TYPES$o$subty;
      var timeLeft = Math.max(0, Math.ceil((o.expires - Date.now()) / 60000));
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        /* v2.3.1232: 44px order row on well-soft */
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '6px 8px',
          borderRadius: 8,
          background: '#19252A',
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.08em',
          color: o.type === 'buy' ? '#59BF91' : '#D95C54'
        }
      }, o.type === 'buy' ? 'BUY' : 'SELL'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          color: '#F7F2E7',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", ((_WEAPON_TYPES$o$subty = WEAPON_TYPES[o.subtype]) === null || _WEAPON_TYPES$o$subty === void 0 ? void 0 : _WEAPON_TYPES$o$subty.label) || o.subtype, " ", o.element1 ? '(' + o.element1 + ')' : ''), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#96A2A0',
          fontVariantNumeric: 'tabular-nums'
        }
      }, timeLeft, "m left")), /*#__PURE__*/React.createElement("span", {
        /* v2.3.1232: gold-icon tabular price */
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#D8A85F'
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
          e.currentTarget.replaceWith(document.createTextNode('🪙'));
        }
      }), o.price),/*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
          var res, data, _data$cancelled, _data$cancelled2, R2, _t1;
          return _regenerator().w(function (_context1) {
            while (1) switch (_context1.p = _context1.n) {
              case 0:
                _context1.p = 0;
                _context1.n = 1;
                return fetch(BT_API_BASE + '/api/market/cancel?id=' + o.id + '&playerId=' + encodeURIComponent(S.myId) + '&room=' + _mktRoom(), {
                  method: 'DELETE',
                  /* v2.3.1178: session token (see /place above). */
                  headers: S._httpToken ? { 'x-bt-auth': S._httpToken } : undefined
                });
              case 1:
                res = _context1.v;
                _context1.n = 2;
                return res.json();
              case 2:
                data = _context1.v;
                if (data.ok) {
                  /* v2.3.1118: settling workers refund the escrow
                     server-side (player_state echo / inbox carries it);
                     the local refund below is the legacy-worker path
                     only -- double-crediting against a settling worker
                     was the duplication hole. */
                  if (!data.settled) {
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
                  }
                  pushDmgPopup(S, S.player.x, S.player.y - 30, 'Order cancelled', 'rgba(255,255,255,.5)');
                  /* Refresh */
                  S._mktLastRefresh = null;
                  fetch(BT_API_BASE + '/api/market/my?playerId=' + encodeURIComponent(S.myId) + '&room=' + _mktRoom()).then(function (r) {
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
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Cancel failed', '#D95C54');
              case 4:
                return _context1.a(2);
            }
          }, _callee1, null, [[0, 3]]);
        })),
        /* v2.3.1232: destructive cancel \u2014 #7C3431 / #FFF1EE */
        style: {
          width: 32,
          height: 32,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          border: '1px solid #C7655F',
          background: '#7C3431',
          color: '#FFF1EE',
          cursor: 'pointer',
          flexShrink: 0
        }
      }, "\u2715"));
    })));
  }());
}
