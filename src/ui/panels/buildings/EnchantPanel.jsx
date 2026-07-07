import React from 'react';
import { AMULET_GEM_STATS, AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, ELEMENTS, RARITY_TIERS, SHIELD_GEM_STATS, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, getAmuletBonus, getShieldBonus, recalcDerived } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === EnchantPanel — buildingPanel === 'enchant' sub-panel === */
/* v2.3.874: extracted verbatim from the buildingPanel === 'enchant' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
export function EnchantPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _ELEMENTS$rpgState$am, _ELEMENTS$rpgState$am2, _ELEMENTS$rpgState$sh, _ELEMENTS$rpgState$sh2, _rpgState$lifeSkills1;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 4
    }
  }, "\u2728 Enchanter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Enchanting Lv", ((_rpgState$lifeSkills1 = rpgState.lifeSkills) === null || _rpgState$lifeSkills1 === void 0 || (_rpgState$lifeSkills1 = _rpgState$lifeSkills1.enchanting) === null || _rpgState$lifeSkills1 === void 0 ? void 0 : _rpgState$lifeSkills1.level) || 1, " \xB7 Slot polished gems into gear with open gem slots."), [{
    label: 'Melee',
    key: 'weapon',
    wpn: rpgState.weapon
  }, {
    label: 'Ranged',
    key: 'rangedWeapon',
    wpn: rpgState.rangedWeapon
  }, {
    label: 'Staff',
    key: 'staffWeapon',
    wpn: rpgState.staffWeapon
  }].map(function (_ref84) {
    var _wpn$gearBase, _WOODWORKING_TIERS$ww, _BLACKSMITH_TIERS$wpn, _rpgState$lifeSkills10, _RARITY_TIERS$wpn$tie, _RARITY_TIERS$wpn$tie2, _ELEMENTS$wpn$element3, _ELEMENTS$wpn$element4;
    var label = _ref84.label,
      key = _ref84.key,
      wpn = _ref84.wpn;
    /* Determine available slots: crafted gear uses BLACKSMITH_TIERS/WOODWORKING_TIERS slots, dropped gear gets 2 free slots */
    var wwKey = wpn !== null && wpn !== void 0 && (_wpn$gearBase = wpn.gearBase) !== null && _wpn$gearBase !== void 0 && _wpn$gearBase.startsWith('ww_') ? wpn.gearBase.slice(3) : null;
    var maxSlots = wwKey ? ((_WOODWORKING_TIERS$ww = WOODWORKING_TIERS[wwKey]) === null || _WOODWORKING_TIERS$ww === void 0 ? void 0 : _WOODWORKING_TIERS$ww.slots) || 0 : wpn !== null && wpn !== void 0 && wpn.gearBase ? ((_BLACKSMITH_TIERS$wpn = BLACKSMITH_TIERS[wpn.gearBase]) === null || _BLACKSMITH_TIERS$wpn === void 0 ? void 0 : _BLACKSMITH_TIERS$wpn.slots) || 0 : wpn ? 2 : 0;
    var usedSlots = (wpn !== null && wpn !== void 0 && wpn.element1 ? 1 : 0) + (wpn !== null && wpn !== void 0 && wpn.element2 ? 1 : 0);
    var openSlots = Math.max(0, maxSlots - usedSlots);
    /* Fusion requires enchanting Lv20+, fusion-compatible gear base for volatile */
    var enchLvl = ((_rpgState$lifeSkills10 = rpgState.lifeSkills) === null || _rpgState$lifeSkills10 === void 0 || (_rpgState$lifeSkills10 = _rpgState$lifeSkills10.enchanting) === null || _rpgState$lifeSkills10 === void 0 ? void 0 : _rpgState$lifeSkills10.level) || 1;
    var canAddSecond = enchLvl >= 20 && maxSlots >= 2;
    var isFusionReady = (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'worldbreaker' || (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'ww_worldbreaker';
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 10,
        background: 'rgba(167,139,250,.06)',
        border: '1px solid rgba(167,139,250,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 4
      }
    }, label, ": ", (wpn === null || wpn === void 0 ? void 0 : wpn.name) || 'None'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: ((_RARITY_TIERS$wpn$tie = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie === void 0 ? void 0 : _RARITY_TIERS$wpn$tie.color) || '#888'
      }
    }, ((_RARITY_TIERS$wpn$tie2 = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie2 === void 0 ? void 0 : _RARITY_TIERS$wpn$tie2.label) || 'Common', " (", (wpn === null || wpn === void 0 ? void 0 : wpn.tierMult) || 1, "\xD7)"), (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$wpn$element3 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element3 === void 0 ? void 0 : _ELEMENTS$wpn$element3.color
      }
    }, "\u25C6 ", wpn.element1), (wpn === null || wpn === void 0 ? void 0 : wpn.element2) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$wpn$element4 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element4 === void 0 ? void 0 : _ELEMENTS$wpn$element4.color
      }
    }, "\u25C6 ", wpn.element2), (wpn === null || wpn === void 0 ? void 0 : wpn.isVolatile) && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ff5e6c',
        fontSize: 8
      }
    }, "\u26A1VOLATILE")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, "Gem slots: ", usedSlots, "/", maxSlots, " used", maxSlots === 0 && ' · Craft slotted gear at the Blacksmith or Woodworker first', (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && !(wpn !== null && wpn !== void 0 && wpn.element2) && maxSlots >= 2 && !canAddSecond && ' · Req Enchanting Lv20 for 2nd slot'), wpn && openSlots > 0 && !wpn.element1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, "Choose a polished gem for Slot 1:"), wpn && wpn.element1 && !wpn.element2 && openSlots > 0 && canAddSecond && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, "Choose a polished gem for Slot 2 (Fusion):"), wpn && openSlots > 0 && (!wpn.element1 || wpn.element1 && !wpn.element2 && canAddSecond) && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap'
      }
    }, Object.entries(ELEMENTS).filter(function (_ref85) {
      var _ref86 = _slicedToArray(_ref85, 1),
        e = _ref86[0];
      return e !== (wpn === null || wpn === void 0 ? void 0 : wpn.element1);
    }).map(function (_ref87) {
      var _rpgState$lifeSkills11;
      var _ref88 = _slicedToArray(_ref87, 2),
        elem = _ref88[0],
        edef = _ref88[1];
      var gems = ((_rpgState$lifeSkills11 = rpgState.lifeSkills) === null || _rpgState$lifeSkills11 === void 0 ? void 0 : _rpgState$lifeSkills11.gems) || {};
      var polKey = 'polished_' + elem;
      var polCount = gems[polKey] || 0;
      if (polCount <= 0) return null;
      /* Check volatile compatibility — only allowed on fusionReady gear */
      var wouldBeVolatile = (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && function () {
        var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
        return volPairs.some(function (_ref89) {
          var _ref90 = _slicedToArray(_ref89, 2),
            a = _ref90[0],
            b = _ref90[1];
          return wpn.element1 === a && elem === b || wpn.element1 === b && elem === a;
        });
      }();
      var blockedVolatile = wouldBeVolatile && !isFusionReady;
      return /*#__PURE__*/React.createElement("button", {
        key: elem,
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          border: '1px solid ' + edef.color + '40',
          background: blockedVolatile ? 'rgba(255,60,60,.1)' : edef.color + '20',
          color: blockedVolatile ? 'rgba(255,255,255,.3)' : edef.color,
          fontSize: 8,
          fontWeight: 700,
          cursor: 'pointer'
        },
        title: blockedVolatile ? 'Volatile combo requires Fusion-Compatible gear base' : '',
        onClick: function onClick() {
          if (blockedVolatile) {
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Needs Fusion-Compatible gear!', '#ff5e6c');
            return;
          }
          var R = stateRef.current.rpg;
          var sk = R.lifeSkills;
          sk.gems[polKey]--;
          if (sk.gems[polKey] <= 0) delete sk.gems[polKey];
          var w = R[key];
          if (!w.element1) {
            w.element1 = elem;
            w.tier = 'elemental';
            w.tierMult = 1.5;
            w.name = elem.charAt(0).toUpperCase() + elem.slice(1) + ' ' + WEAPON_TYPES[w.type].label;
          } else if (!w.element2) {
            w.element2 = elem;
            w.tier = 'fusion';
            w.tierMult = 2.25;
            var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
            w.isVolatile = volPairs.some(function (_ref91) {
              var _ref92 = _slicedToArray(_ref91, 2),
                a = _ref92[0],
                b = _ref92[1];
              return w.element1 === a && w.element2 === b || w.element1 === b && w.element2 === a;
            });
            var e1n = w.element1.charAt(0).toUpperCase() + w.element1.slice(1);
            var e2n = elem.charAt(0).toUpperCase() + elem.slice(1);
            w.name = e1n + e2n.toLowerCase() + ' ' + WEAPON_TYPES[w.type].label;
          }
          var leveled = addLifeSkillXp(sk, 'enchanting', w.tier === 'fusion' ? 50 : 25);
          if (!R._questFlags) R._questFlags = {};
          R._questFlags.enchantedWeapon = true;
          R._questFlags.slottedGem = true;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, elem + ' enchanted!', edef.color);
          if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 50, 'Enchanting Lv' + sk.enchanting.level + '!', '#f5c542');
          BT_AUDIO.collect();
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
        }
      }, blockedVolatile ? '⚡' : '◆', " ", elem, " (", polCount, ")");
    })), usedSlots >= maxSlots && maxSlots > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "All gem slots filled"));
  }), rpgState.amulet && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCFF Amulet: ", rpgState.amulet.name, rpgState.amulet.gem && function (_ELEMENTS$rpgState$am) {
    var bonus = getAmuletBonus(rpgState.amulet);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: (_ELEMENTS$rpgState$am = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am === void 0 ? void 0 : _ELEMENTS$rpgState$am.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), rpgState.amulet.gem ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: (_ELEMENTS$rpgState$am2 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am2 === void 0 ? void 0 : _ELEMENTS$rpgState$am2.color
    }
  }, rpgState.amulet.gem, " gem"), ". Slot a new gem to replace (old gem lost).") : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slot a polished gem to activate the amulet."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap'
    }
  }, Object.entries(ELEMENTS).map(function (_ref93) {
    var _rpgState$lifeSkills12;
    var _ref94 = _slicedToArray(_ref93, 2),
      elem = _ref94[0],
      edef = _ref94[1];
    var gems = ((_rpgState$lifeSkills12 = rpgState.lifeSkills) === null || _rpgState$lifeSkills12 === void 0 ? void 0 : _rpgState$lifeSkills12.gems) || {};
    var polKey = 'polished_' + elem;
    var polCount = gems[polKey] || 0;
    if (polCount <= 0) return null;
    var gemStat = AMULET_GEM_STATS[elem];
    if (!gemStat) return null;
    var tierData = AMULET_TIERS[rpgState.amulet.tier];
    var previewVal = Math.round((gemStat.base + gemStat.perPower * ((tierData === null || tierData === void 0 ? void 0 : tierData.basePower) || 1)) * 10) / 10;
    return /*#__PURE__*/React.createElement("button", {
      key: elem,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid ' + edef.color + '40',
        background: edef.color + '20',
        color: edef.color,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _AMULET_TIERS$R$amule;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        if ((sk.gems[polKey] || 0) < 1) return;
        sk.gems[polKey]--;
        R.amulet.gem = elem;
        R.amulet.name = (((_AMULET_TIERS$R$amule = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule === void 0 ? void 0 : _AMULET_TIERS$R$amule.label) || 'Simple') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Amulet';
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.slottedGem = true;
        addLifeSkillXp(sk, 'enchanting', 20);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, gemStat.label + ' +' + previewVal + gemStat.unit, edef.color);
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E", elem, " (", polCount, ") +", previewVal, gemStat.unit);
  }))), !rpgState.amulet && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 8,
      color: 'rgba(255,255,255,.25)'
    }
  }, "\uD83D\uDCFF Craft an amulet at the Blacksmith to slot gems here."), rpgState.shield && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(91,82,255,.06)',
      border: '1px solid rgba(91,82,255,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDEE1\uFE0F Shield: ", rpgState.shield.name, rpgState.shield.gem && function (_ELEMENTS$rpgState$sh) {
    var bonus = getShieldBonus(rpgState.shield);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: (_ELEMENTS$rpgState$sh = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh === void 0 ? void 0 : _ELEMENTS$rpgState$sh.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), rpgState.shield.gem ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: (_ELEMENTS$rpgState$sh2 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh2 === void 0 ? void 0 : _ELEMENTS$rpgState$sh2.color
    }
  }, rpgState.shield.gem, " gem"), ". Slot new gem to replace.") : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Slot a polished gem for defensive power."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap'
    }
  }, Object.entries(ELEMENTS).map(function (_ref95) {
    var _rpgState$lifeSkills13;
    var _ref96 = _slicedToArray(_ref95, 2),
      elem = _ref96[0],
      edef = _ref96[1];
    var gems = ((_rpgState$lifeSkills13 = rpgState.lifeSkills) === null || _rpgState$lifeSkills13 === void 0 ? void 0 : _rpgState$lifeSkills13.gems) || {};
    var polKey = 'polished_' + elem;
    var polCount = gems[polKey] || 0;
    if (polCount <= 0) return null;
    var gemStat = SHIELD_GEM_STATS[elem];
    if (!gemStat) return null;
    var bt = BLACKSMITH_TIERS[rpgState.shield.gearBase];
    var previewVal = Math.round((gemStat.base + gemStat.perPower * ((bt === null || bt === void 0 ? void 0 : bt.tierMult) || 1)) * 10) / 10;
    return /*#__PURE__*/React.createElement("button", {
      key: elem,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid ' + edef.color + '40',
        background: edef.color + '20',
        color: edef.color,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _BLACKSMITH_TIERS$R$s;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (!sk.gems) sk.gems = {};
        if ((sk.gems[polKey] || 0) < 1) return;
        sk.gems[polKey]--;
        R.shield.gem = elem;
        R.shield.name = (((_BLACKSMITH_TIERS$R$s = BLACKSMITH_TIERS[R.shield.gearBase]) === null || _BLACKSMITH_TIERS$R$s === void 0 ? void 0 : _BLACKSMITH_TIERS$R$s.label) || 'Basic') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Shield';
        recalcDerived(R);
        addLifeSkillXp(sk, 'enchanting', 20);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, gemStat.label + ' +' + previewVal + gemStat.unit, edef.color);
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E", elem, " (", polCount, ") +", previewVal, gemStat.unit);
  }))), !rpgState.shield && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 8,
      color: 'rgba(255,255,255,.25)'
    }
  }, "\uD83D\uDEE1\uFE0F Forge a shield at the Blacksmith to slot defensive gems here."));
}
