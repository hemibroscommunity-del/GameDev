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
  /* v2.3.1235: owner design correction §7 (Marketplace) — the Material
     Tier + Element chip walls are collapsed behind one "Filters" summary
     row.  Open/closed is pure LOCAL UI state (the filter VALUES stay in
     the lifted mkt* props from BroTown, untouched). */
  var _React$useState = React.useState(false),
    _React$useState2 = _slicedToArray(_React$useState, 2),
    mktFiltersOpen = _React$useState2[0],
    setMktFiltersOpen = _React$useState2[1];
  /* v2.3.1235: summary strings for the collapsed Filters row, built from
     the live mktTier / mktElement1 / mktElement2 props (same tier-label
     fallback chain the order-book heading uses). */
  var _mktTierBS = BLACKSMITH_TIERS[mktTier];
  var _mktTierWW = WOODWORKING_TIERS[mktTier === null || mktTier === void 0 ? void 0 : mktTier.replace('ww_', '')];
  var mktTierSummary = (_mktTierBS === null || _mktTierBS === void 0 ? void 0 : _mktTierBS.label) || (_mktTierWW === null || _mktTierWW === void 0 ? void 0 : _mktTierWW.label) || mktTier;
  var mktElemSummary = mktElement1 === null ? 'Any element' : mktElement1 + (mktElement2 ? ' + ' + mktElement2 : '');
  /* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) \u2014
     panel surface + icon header, segmented buy/sell/orders tabs on a
     #121B20 track with the brass bottom edge, 32px/999 filter chips
     (brass-fill when selected), gold-icon prices, and ONE brass primary
     (the place-order button).  Styles + JSX grouping only \u2014 every
     handler, fetch, and settled/legacy branch is byte-identical. */
  /* v2.3.1235: batch-3 rollout — correction-pass compliance
     (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
     every handler/fetch byte-identical. Remaining v2.3.1232 tokens
     remapped onto the approved set (sheet #1E2E34, well #111E23,
     raised #293B41, card #24363C, text #F4F0E7/#B6C1BE/#8D9B98/#667875,
     lines rgba(229,237,233,.11/.20), brass #D8AA58); order-book and
     my-order rows move off per-row cards into one recessed well with
     hairline dividers (contract: dividers over row cards); cancel
     becomes a danger OUTLINE (filled red is never used); refresh 🔄
     emoji chrome becomes a text glyph; refresh/cancel hit the 44px
     hitbox floor. The Checkpoint-B §6 fixes (filters summary row +
     sheet, 16px scroll tail, 12px copy) are preserved untouched. */
  var LS_WELL235 = {
    background: '#111E23',
    borderRadius: 10,
    padding: 4,
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
    marginBottom: 4
  };
  var LS_DIV235 = '1px solid rgba(229,237,233,.11)';
  return React.createElement("div", {
    style: {
      margin: -20,
      /* v2.3.1235: Checkpoint B — +16px bottom breathing room so the last
         order-book row never ends flush against the modal edge. */
      padding: '16px 14px 32px',
      background: '#1E2E34' /* v2.3.1235: batch-3 rollout — sheet token */,
      borderRadius: 14,
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
      color: '#F4F0E7'
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
      fontSize: 16 /* v2.3.1235: batch-3 rollout — wallet is a key number (16-18/700 tabular) */,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#D8AA58'
    }
  }, rpgState.coins), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12, /* v2.3.1235: Checkpoint B — hint copy floor 12px */
      color: '#8D9B98'
    }
  }, "Buy & sell \xB7 Listings last 24h, refunds by mail")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      padding: 2,
      borderRadius: 8,
      /* v2.3.1235: batch-3 rollout — well token + shared .ui-well recipe */
      background: '#111E23',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
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
        minHeight: 44 /* v2.3.1235: batch-3 rollout — 44px hitbox floor on tab segments */,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 700,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        /* v2.3.1235: batch-3 rollout — raised/brass/text tokens */
        background: mktMode === id ? '#293B41' : 'transparent',
        boxShadow: mktMode === id ? 'inset 0 -2px 0 #D8AA58' : 'none',
        color: mktMode === id ? '#F4F0E7' : '#8D9B98',
        fontFamily: 'inherit'
      }
    }, label);
  })), mktMode !== 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
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
      /* v2.3.1235: filter chip restyle (design correction §7) — 44px
         touch target, active = brass-soft fill + brass text + brass
         hairline, inactive = line border + secondary text; emoji icon
         dropped from the label (text only). */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktCategory === k ? '#D8AA58' : 'rgba(229,237,233,0.20)'),
        background: mktCategory === k ? 'rgba(216,170,88,0.15)' : 'transparent',
        color: mktCategory === k ? '#D8AA58' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, c.label);
  })), ((_MKT_CATEGORIES$mktCa = MKT_CATEGORIES[mktCategory]) === null || _MKT_CATEGORIES$mktCa === void 0 ? void 0 : _MKT_CATEGORIES$mktCa.subtypes.length) > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, "Type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, MKT_CATEGORIES[mktCategory].subtypes.map(function (st) {
    var _WEAPON_TYPES$st2;
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: function onClick() {
        return setMktSubtype(st);
      },
      /* v2.3.1235: filter chip restyle (see category chips); weapon
         emoji dropped from the label (design correction §7). */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktSubtype === st ? '#D8AA58' : 'rgba(229,237,233,0.20)'),
        background: mktSubtype === st ? 'rgba(216,170,88,0.15)' : 'transparent',
        color: mktSubtype === st ? '#D8AA58' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, ((_WEAPON_TYPES$st2 = WEAPON_TYPES[st]) === null || _WEAPON_TYPES$st2 === void 0 ? void 0 : _WEAPON_TYPES$st2.label) || st);
  }))), /* v2.3.1235: Filters disclosure row (design correction §7) — the
     Material Tier + Element chip walls collapse behind this single
     44px raised row so Max Bid + the primary stay above the fold.
     Summary is built from the live mktTier/mktElement1/mktElement2
     selections; text chevron, no emoji. */
  /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return setMktFiltersOpen(!mktFiltersOpen);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      marginBottom: 8,
      borderRadius: 10,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#293B41',
      color: '#F4F0E7',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#B6C1BE'
    }
  }, "Filters:"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, mktTierSummary, " \xB7 ", mktElemSummary), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: '#D8AA58',
      transform: mktFiltersOpen ? 'rotate(90deg)' : 'none',
      transition: 'transform .15s ease'
    }
  }, "›")), mktFiltersOpen && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: inline secondary filter sheet — sheet surface holding
       the MOVED tier/element chip groups (tap handlers byte-identical
       to the pre-collapse chips) plus a Done secondary. */
    style: {
      padding: '10px 10px 12px',
      marginBottom: 8,
      borderRadius: 10,
      border: '1px solid rgba(229,237,233,0.11)',
      background: '#1E2E34'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, "Material Tier"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 8,
      maxHeight: 152,
      overflowY: 'auto'
    }
  }, (mktCategory === 'weapon' && (mktSubtype === 'bow' || mktSubtype === 'staff') ? MKT_WOOD_TIERS : MKT_TIERS).map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        setMktTier(t.id);
        setMktPrice(estimateMktPrice(t.id, mktSubtype));
      },
      /* v2.3.1235: filter chip restyle (see category chips) */
      style: {
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktTier === t.id ? '#D8AA58' : 'rgba(229,237,233,0.20)'),
        background: mktTier === t.id ? 'rgba(216,170,88,0.15)' : 'transparent',
        color: mktTier === t.id ? '#D8AA58' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, "Element (optional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      setMktElement1(null);
      setMktElement2(null);
    },
    /* v2.3.1235: filter chip restyle (see category chips) */
    style: {
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      border: '1px solid ' + (mktElement1 === null ? '#D8AA58' : 'rgba(229,237,233,0.20)'),
      background: mktElement1 === null ? 'rgba(216,170,88,0.15)' : 'transparent',
      color: mktElement1 === null ? '#D8AA58' : '#B6C1BE',
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
      /* v2.3.1235: filter chip restyle (see category chips) */
      style: {
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (mktElement1 === k ? '#D8AA58' : 'rgba(229,237,233,0.20)'),
        background: mktElement1 === k ? 'rgba(216,170,88,0.15)' : 'transparent',
        color: mktElement1 === k ? '#D8AA58' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, k);
  })), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return setMktFiltersOpen(false);
    },
    /* v2.3.1235: Done — secondary button closes the inline filter sheet */
    style: {
      width: '100%',
      minHeight: 44,
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#293B41',
      color: '#F4F0E7',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, "Done")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98'
    }
  }, mktMode === 'buy' ? 'Max Bid' : 'Ask Price'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 1,
    max: 99999,
    value: mktPrice,
    onChange: function onChange(e) {
      return setMktPrice(Math.max(1, +e.target.value || 1));
    },
    /* v2.3.1235: batch-3 rollout — input trough on the approved well
       token with the strong hairline, 44px input height, brass value,
       brass-highlight caret (shared LS_INPUT recipe). */
    style: {
      width: 84,
      height: 44,
      padding: '0 10px',
      borderRadius: 8,
      border: '1px solid rgba(229,237,233,.20)',
      background: '#111E23',
      color: '#D8AA58',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none',
      caretColor: '#EAC675'
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
      fontSize: 12, /* v2.3.1235: Checkpoint B — meta copy floor 12px */
      color: '#8D9B98',
      fontVariantNumeric: 'tabular-nums',
      marginLeft: 'auto'
    }
  }, "Est: ~", estimateMktPrice(mktTier, mktSubtype), "G")), mktMode === 'sell' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
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
      /* v2.3.1235: batch-3 rollout — stash chips adopt the corrected
         chip recipe (brass-soft fill + brass edge when selected, line
         border + secondary text idle) and the 44px hitbox floor. */
      style: {
        minHeight: 44,
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (sel ? '#D8AA58' : 'rgba(229,237,233,.20)'),
        background: sel ? 'rgba(216,170,88,.15)' : 'transparent',
        color: sel ? '#D8AA58' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, ((_WEAPON_TYPES$sw$type = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type === void 0 ? void 0 : _WEAPON_TYPES$sw$type.emoji) || '⚔️', " ", sw.name);
  }), (!rpgState.weaponStash || rpgState.weaponStash.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
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
    /* v2.3.1235: THE filled-gold primary of the surface — gradient
       brass on #172126 ink, #EAC675 edge, radius 10 (exact committed
       tokens, design correction §7); label emoji dropped. */
    style: {
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      border: '1px solid #EAC675',
      background: 'linear-gradient(180deg,#E2B765,#D2A14D)',
      color: '#172126',
      cursor: 'pointer',
      marginBottom: 10,
      fontFamily: 'inherit'
    }
  }, mktMode === 'buy' ? 'Place Buy Order (' + mktPrice + 'G)' : 'List for Sale (' + mktPrice + 'G)')), function (_BLACKSMITH_TIERS$mkt2, _WOODWORKING_TIERS$mk2, _WEAPON_TYPES$mktSubt) {
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
        fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
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
      /* v2.3.1235: batch-3 rollout \u2014 44px hitbox floor, strong hairline
         secondary on the raised token; \uD83D\uDD04 emoji chrome replaced with a
         text glyph (no emoji in button chrome). */
      style: {
        width: 44,
        height: 44,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 700,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#B6C1BE',
        cursor: 'pointer'
      }
    }, "\u21BB")), sells.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700 /* v2.3.1235: batch-3 rollout — header weight floor */,
        letterSpacing: '.14em',
        color: 'rgba(216,99,93,.6)' /* v2.3.1235: danger-token SELL tint (order-book semantic red) */,
        margin: '6px 0 4px'
      }
      /* v2.3.1235: batch-3 rollout — order rows move off per-row cards
         into ONE recessed well with hairline dividers (contract:
         dividers over row cards); handlers untouched (rows have none). */
    }, "SELL ORDERS (lowest first)"), sells.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: LS_WELL235
    }, sells.slice(0, 8).map(function (o, _ri) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '4px 8px',
          borderTop: _ri > 0 ? LS_DIV235 : 'none',
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          color: '#D8AA58' /* v2.3.1235: batch-3 rollout — brass token */,
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
          color: '#B6C1BE',
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12, /* v2.3.1235: Checkpoint B — row meta floor 12px */
          color: '#8D9B98'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
          fontWeight: 700,
          color: '#D8AA58'
        }
      }, "(you)"));
    })) /* v2.3.1235: batch-3 rollout — closes the sells list well */, buys.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700 /* v2.3.1235: batch-3 rollout — header weight floor */,
        letterSpacing: '.14em',
        color: 'rgba(85,185,138,.6)' /* v2.3.1235: positive-token BUY tint (order-book semantic green) */,
        margin: '8px 0 4px'
      }
      /* v2.3.1235: batch-3 rollout — one well + dividers (see sells) */
    }, "BUY ORDERS (highest first)"), buys.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: LS_WELL235
    }, buys.slice(0, 8).map(function (o, _ri) {
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '4px 8px',
          borderTop: _ri > 0 ? LS_DIV235 : 'none',
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          color: '#D8AA58' /* v2.3.1235: batch-3 rollout — brass token */,
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
          color: '#B6C1BE',
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", o.element1 || ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12, /* v2.3.1235: Checkpoint B — row meta floor 12px */
          color: '#8D9B98'
        }
      }, o.playerName), o.playerId === S.myId && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
          fontWeight: 700,
          color: '#D8AA58'
        }
      }, "(you)"));
    })) /* v2.3.1235: batch-3 rollout — closes the buys list well */, sells.length === 0 && buys.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#8D9B98',
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
        fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
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
      /* v2.3.1235: batch-3 rollout \u2014 44px hitbox floor, strong hairline
         secondary on the raised token; \uD83D\uDD04 emoji chrome replaced with a
         text glyph (no emoji in button chrome). */
      style: {
        width: 44,
        height: 44,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 700,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#B6C1BE',
        cursor: 'pointer'
      }
    }, "\u21BB")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#8D9B98',
        fontStyle: 'italic'
      }
      /* v2.3.1235: batch-3 rollout — my-order rows join the one-well +
         dividers pattern (contract: dividers over row cards); the
         cancel handler inside is byte-identical. */
    }, "No active orders"), filtered.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: LS_WELL235
    }, filtered.map(function (o, _oi) {
      var _WEAPON_TYPES$o$subty;
      var timeLeft = Math.max(0, Math.ceil((o.expires - Date.now()) / 60000));
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '6px 8px',
          borderTop: _oi > 0 ? LS_DIV235 : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px floor */,
          fontWeight: 700,
          letterSpacing: '.08em',
          /* v2.3.1235: BUY/SELL order-book semantics on the approved
             positive/danger tokens */
          color: o.type === 'buy' ? '#55B98A' : '#D8635D'
        }
      }, o.type === 'buy' ? 'BUY' : 'SELL'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13 /* v2.3.1235: batch-3 rollout — body size (12.5 off-scale) */,
          fontWeight: 600,
          color: '#F4F0E7',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, o.tierLabel, " ", ((_WEAPON_TYPES$o$subty = WEAPON_TYPES[o.subtype]) === null || _WEAPON_TYPES$o$subty === void 0 ? void 0 : _WEAPON_TYPES$o$subty.label) || o.subtype, " ", o.element1 ? '(' + o.element1 + ')' : ''), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12, /* v2.3.1235: Checkpoint B — row meta floor 12px */
          color: '#8D9B98',
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
          color: '#D8AA58' /* v2.3.1235: batch-3 rollout — brass token */
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
        /* v2.3.1235: batch-3 rollout \u2014 danger is OUTLINE only (filled
           red retired by the correction pass); 44px hitbox floor. */
        style: {
          width: 44,
          height: 44,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          border: '1px solid #D8635D',
          background: 'transparent',
          color: '#D8635D',
          cursor: 'pointer',
          flexShrink: 0
        }
      }, "\u2715"));
    })) /* v2.3.1235: batch-3 rollout \u2014 closes the my-orders well */));
  }());
}
