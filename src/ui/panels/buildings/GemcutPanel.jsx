import React from 'react';
import { BT_AUDIO, ELEMENTS, GEM_CUT_TIERS, ZONE_RESOURCES, addLifeSkillXp } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === GemcutPanel — buildingPanel === 'gemcut' sub-panel === */
/* v2.3.875: extracted verbatim from the buildingPanel === 'gemcut' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
export function GemcutPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills33, _rpgState$lifeSkills36;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a855f7',
      marginBottom: 4
    }
  }, "\uD83D\uDC8E Gem Cutter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Gem Cutting Lv", ((_rpgState$lifeSkills33 = rpgState.lifeSkills) === null || _rpgState$lifeSkills33 === void 0 || (_rpgState$lifeSkills33 = _rpgState$lifeSkills33.gemCutting) === null || _rpgState$lifeSkills33 === void 0 ? void 0 : _rpgState$lifeSkills33.level) || 1, " \xB7 Cut raw gems into polished slottable gems. Higher skill = better success rate."), Object.entries(ELEMENTS).map(function (_ref143) {
    var _rpgState$lifeSkills34, _rpgState$lifeSkills35, _ZONE_RESOURCES$elem, _ZONE_RESOURCES$elem2;
    var _ref144 = _slicedToArray(_ref143, 2),
      elem = _ref144[0],
      edef = _ref144[1];
    var gems = ((_rpgState$lifeSkills34 = rpgState.lifeSkills) === null || _rpgState$lifeSkills34 === void 0 ? void 0 : _rpgState$lifeSkills34.gems) || {};
    var rawKey = 'raw_' + elem;
    var polKey = 'polished_' + elem;
    var rawCount = gems[rawKey] || 0;
    var polCount = gems[polKey] || 0;
    if (rawCount <= 0 && polCount <= 0) return null;
    var gcLvl = ((_rpgState$lifeSkills35 = rpgState.lifeSkills) === null || _rpgState$lifeSkills35 === void 0 || (_rpgState$lifeSkills35 = _rpgState$lifeSkills35.gemCutting) === null || _rpgState$lifeSkills35 === void 0 ? void 0 : _rpgState$lifeSkills35.level) || 1;
    /* Success rate from GEM_CUT_TIERS */
    var successRate = 0.6;
    var tierKeys = Object.keys(GEM_CUT_TIERS);
    for (var i = tierKeys.length - 1; i >= 0; i--) {
      if (gcLvl >= GEM_CUT_TIERS[tierKeys[i]].minLvl) {
        successRate = GEM_CUT_TIERS[tierKeys[i]].successRate;
        break;
      }
    }
    var gemName = ((_ZONE_RESOURCES$elem = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem === void 0 ? void 0 : _ZONE_RESOURCES$elem.gem) || elem + ' Gem';
    var gemCol = ((_ZONE_RESOURCES$elem2 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem2 === void 0 ? void 0 : _ZONE_RESOURCES$elem2.gemColor) || edef.color;
    return /*#__PURE__*/React.createElement("div", {
      key: elem,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: gemCol + '10',
        border: '1px solid ' + gemCol + '25'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: gemCol
      }
    }, gemName), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "\u25C7 Raw: ", rawCount, " \xB7 \u25C6 Polished: ", polCount), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Success: ", Math.round(successRate * 100), "%")), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: rawCount > 0 ? gemCol : 'rgba(255,255,255,.08)',
        color: rawCount > 0 ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer',
        opacity: rawCount > 0 ? 1 : 0.4
      },
      onClick: function onClick() {
        if (rawCount <= 0) return;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        sk.gems[rawKey] = (sk.gems[rawKey] || 1) - 1;
        if (sk.gems[rawKey] <= 0) delete sk.gems[rawKey];
        /* Roll for success */
        if (Math.random() < successRate) {
          sk.gems[polKey] = (sk.gems[polKey] || 0) + 1;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Polished ' + gemName + '!', gemCol);
          BT_AUDIO.collect();
        } else {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Gem shattered!', '#ff5e6c');
          BT_AUDIO.beep(200, 0.06, 0.1, 'square');
        }
        var leveled = addLifeSkillXp(sk, 'gemCutting', 15);
        if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 50, 'Gem Cutting Lv' + sk.gemCutting.level + '!', '#f5c542');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Cut"));
  }), Object.entries(((_rpgState$lifeSkills36 = rpgState.lifeSkills) === null || _rpgState$lifeSkills36 === void 0 ? void 0 : _rpgState$lifeSkills36.gems) || {}).every(function (_ref145) {
    var _ref146 = _slicedToArray(_ref145, 2),
      k = _ref146[0],
      v = _ref146[1];
    return v <= 0;
  }) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      textAlign: 'center',
      padding: 8
    }
  }, "No gems yet. Harvest resources in elemental zones to collect raw gems!"));
}
