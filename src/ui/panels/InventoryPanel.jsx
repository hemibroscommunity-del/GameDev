import React from 'react';
import { AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, COLLISION_TABLE, ELEMENTS, MAX_PET_SLOTS, NUGGETS_PER_BAR, PET_LOOT_RADIUS, RARITY_TIERS, WEAPON_STASH_MAX, WEAPON_TYPES, calcDisplayDmgRange, calcDisplayDps, calcDisplayHeal, canEquipItem, discoveredCollisions, getAmuletBonus, getEquipReqLabel, getShieldBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === InventoryPanel — the showInventory modal === */
/* v2.3.883: extracted verbatim from the showInventory && rpgState JSX
   subtree in BroTown.jsx (the full inventory / equipment screen: equip
   and compare gear, weapon stash, amulet/shield slots, pet slots, item
   actions). Behavior-frozen UI decomposition; the
   `showInventory && rpgState &&` gate stays in BroTown. 6 props:
   rpgState, stateRef, setRpgState, setShowInventory, plus the two
   BroTown-local bindings the subtree reads — gearWorn (a useState
   value) and toggleGearSlot (a useCallback). All 18 data/helper imports
   verified real exports; spread/slice/spread-array babel helpers
   imported; the hoisted optional-chaining temp set declared locally. */
export function InventoryPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowInventory = props.setShowInventory,
    gearWorn = props.gearWorn,
    toggleGearSlot = props.toggleGearSlot;
  var _AMULET_TIERS$rpgStat, _BLACKSMITH_TIERS$rpg, _BLACKSMITH_TIERS$rpg2, _ELEMENTS$pet, _ELEMENTS$pet$element2, _ELEMENTS$rpgState, _ELEMENTS$rpgState$am3, _ELEMENTS$rpgState$am4, _ELEMENTS$rpgState$am5, _ELEMENTS$rpgState$am6, _ELEMENTS$rpgState$sh3, _ELEMENTS$sw, _ELEMENTS$sw$element, _ELEMENTS$sw$element2, _ELEMENTS$sw$element3, _ELEMENTS$sw$element4, _ELEMENTS$sw$element5, _ELEMENTS$sw$element6, _ELEMENTS$wpn, _ELEMENTS$wpn$element0, _ELEMENTS$wpn$element1, _ELEMENTS$wpn$element10, _ELEMENTS$wpn$element5, _ELEMENTS$wpn$element6, _ELEMENTS$wpn$element7, _ELEMENTS$wpn$element8, _ELEMENTS$wpn$element9, _RARITY_TIERS$rpgStat, _WEAPON_TYPES$current, _WEAPON_TYPES$sold, _WEAPON_TYPES$sold$ty2, _WEAPON_TYPES$sw, _WEAPON_TYPES$sw$type2, _rpgState$armor2, _rpgState$armor3, _rpgState$armor4, _rpgState$lifeSkills37, _rpgState$lifeSkills38, _rpgState$lifeSkills39, _rpgState$lifeSkills40, _rpgState$lifeSkills41, _rpgState$lifeSkills42;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowInventory(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowInventory(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#D8A94D',
      marginBottom: 8
    }
  }, "\uD83C\uDF92 Equipment"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Active: ", rpgState.activeSlot === 'ranged' ? 'Ranged' : 'Melee', " \xB7 \uD83D\uDCB0 ", rpgState.coins, "g"), [{
    label: 'Melee Weapon',
    wpn: rpgState.weapon,
    slot: 'melee'
  }, {
    label: 'Ranged Weapon',
    wpn: rpgState.rangedWeapon,
    slot: 'ranged'
  }].map(function (_ref159) {
    var _ELEMENTS$wpn$element5, _ELEMENTS$wpn$element6, _ELEMENTS$wpn$element7, _ELEMENTS$wpn$element8, _ELEMENTS$wpn$element9, _ELEMENTS$wpn$element0, _ELEMENTS$wpn$element1, _ELEMENTS$wpn$element10;
    var label = _ref159.label,
      wpn = _ref159.wpn,
      slot = _ref159.slot;
    if (!wpn) return null;
    var wt = WEAPON_TYPES[wpn.type];
    var rt = RARITY_TIERS[wpn.tier];
    var isActive = rpgState.activeSlot === slot || slot === 'melee' && rpgState.activeSlot !== 'ranged';
    /* v2.3.1207: deterministic DMG range via the shared display helper
       — this was a single RANDOM calcWeaponDmg roll (a different number
       every render) off the STALE rpgState snapshot.  Live state via
       stateRef, the v2.3.1206 stash-compare convention below. */
    var dmgRange = calcDisplayDmgRange((stateRef.current && stateRef.current.rpg) || rpgState || {}, wpn);
    var dmg = dmgRange ? dmgRange.text : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: slot,
      style: {
        marginBottom: 8,
        padding: 10,
        borderRadius: 10,
        background: isActive ? 'rgba(216,169,77,.08)' : 'rgba(255,255,255,.03)',
        border: "1.5px solid ".concat(isActive ? 'rgba(216,169,77,.3)' : 'rgba(255,255,255,.08)'),
        position: 'relative'
      }
    }, isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 4,
        right: 8,
        fontSize: 7,
        fontWeight: 700,
        color: '#D8A94D'
      }
    }, "ACTIVE"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: (rt === null || rt === void 0 ? void 0 : rt.color) || '#888'
      }
    }, wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, rt === null || rt === void 0 ? void 0 : rt.label, " ", wt === null || wt === void 0 ? void 0 : wt.label, " \xB7 ", wpn.tierMult, "\xD7 mult", wpn.quality && wpn.quality !== 'normal' ? ' \xB7 ' + wpn.quality.toUpperCase() + (wpn.quality === 'godly' ? ' \u2728' : wpn.quality === 'elite' ? ' \u2B50' : '') : '', wpn.hardness ? ' \xB7 H' + wpn.hardness : ''))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        fontSize: 8,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, dmg)), /*#__PURE__*/React.createElement("span", null, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.speed) || 1)), /*#__PURE__*/React.createElement("span", null, "RNG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.range) || 0))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center'
      }
    }, wpn.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element5 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element5 === void 0 ? void 0 : _ELEMENTS$wpn$element5.color) + '22',
        color: (_ELEMENTS$wpn$element6 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element6 === void 0 ? void 0 : _ELEMENTS$wpn$element6.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element7 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element7 === void 0 ? void 0 : _ELEMENTS$wpn$element7.color) + '44'
      }
    }, "E1: ", wpn.element1, " (", (_ELEMENTS$wpn$element8 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element8 === void 0 ? void 0 : _ELEMENTS$wpn$element8.status, ")"), wpn.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element9 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element9 === void 0 ? void 0 : _ELEMENTS$wpn$element9.color) + '22',
        color: (_ELEMENTS$wpn$element0 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element0 === void 0 ? void 0 : _ELEMENTS$wpn$element0.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element1 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element1 === void 0 ? void 0 : _ELEMENTS$wpn$element1.color) + '44'
      }
    }, "E2: ", wpn.element2, " (", (_ELEMENTS$wpn$element10 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element10 === void 0 ? void 0 : _ELEMENTS$wpn$element10.status, ")"), wpn.isVolatile && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(217,92,84,.2)',
        color: '#D95C54',
        border: '1px solid rgba(217,92,84,.3)'
      }
    }, "\u26A1VOLATILE +30%"), !wpn.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No elements")));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: 'rgba(255,255,255,.55)',
      margin: '10px 0 6px',
      letterSpacing: 0.5
    }
  }, "WORN ARMOR"), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 8, marginBottom: 8 }
  }, [
    { slot: 'chest', name: 'Steel Plate', sub: 'Chest', icon: '/sprites/gear/icons/steelplate.webp' },
    { slot: 'legs', name: 'Steel Greaves', sub: 'Legs', icon: '/sprites/gear/icons/steelgreaves.webp' },
    /* v2.3.756: the t-shirt layer -- worn UNDER the chest armour (both can
       be on at once; armour always renders on top). */
    { slot: 'shirt', name: 'T-Shirt', sub: 'Chest \u00b7 under armor', icon: '/sprites/gear/icons/tshirt.webp' }
  ].map(function (it) {
    var on = gearWorn[it.slot];
    return /*#__PURE__*/React.createElement("div", {
      key: 'wornarmor-' + it.slot,
      style: {
        flex: 1,
        padding: 8,
        borderRadius: 10,
        background: on ? 'rgba(89,191,145,.07)' : 'rgba(255,255,255,.03)',
        border: "1.5px solid ".concat(on ? 'rgba(89,191,145,.35)' : 'rgba(255,255,255,.08)'),
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: it.icon,
      alt: it.name,
      draggable: false,
      style: {
        width: 40,
        height: 40,
        imageRendering: 'pixelated',
        filter: on ? 'none' : 'grayscale(1) brightness(.6)',
        userSelect: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: on ? '#59BF91' : 'rgba(255,255,255,.55)'
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 5
      }
    }, it.sub), /*#__PURE__*/React.createElement("button", {
      type: 'button',
      onClick: function onClick() { toggleGearSlot(it.slot); },
      style: {
        width: '100%',
        padding: '4px 0',
        fontSize: 9,
        fontWeight: 700,
        borderRadius: 7,
        border: '1px solid rgba(255,255,255,.2)',
        background: on ? 'rgba(217,92,84,.25)' : 'rgba(89,191,145,.25)',
        color: '#fff',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }
    }, on ? 'Unequip' : 'Equip'));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: ((_RARITY_TIERS$rpgStat = RARITY_TIERS[(_rpgState$armor2 = rpgState.armor) === null || _rpgState$armor2 === void 0 ? void 0 : _rpgState$armor2.tier]) === null || _RARITY_TIERS$rpgStat === void 0 ? void 0 : _RARITY_TIERS$rpgStat.color) || '#888'
    }
  }, ((_rpgState$armor3 = rpgState.armor) === null || _rpgState$armor3 === void 0 ? void 0 : _rpgState$armor3.name) || 'No Armor'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, (_rpgState$armor4 = rpgState.armor) !== null && _rpgState$armor4 !== void 0 && _rpgState$armor4.attunement ? "Attuned: ".concat(rpgState.armor.attunement) : 'No attunement')))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: rpgState.amulet ? 'rgba(216,169,77,.05)' : 'rgba(255,255,255,.03)',
      border: rpgState.amulet ? '1px solid rgba(216,169,77,.2)' : '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDCFF"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.amulet ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#D8A94D'
    }
  }, rpgState.amulet.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_AMULET_TIERS$rpgStat = AMULET_TIERS[rpgState.amulet.tier]) === null || _AMULET_TIERS$rpgStat === void 0 ? void 0 : _AMULET_TIERS$rpgStat.label) || 'Simple', " Amulet", rpgState.amulet.gem && function (_ELEMENTS$rpgState$am3) {
    var bonus = getAmuletBonus(rpgState.amulet);
    if (!bonus) return null;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        color: ((_ELEMENTS$rpgState$am3 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am3 === void 0 ? void 0 : _ELEMENTS$rpgState$am3.color) || '#fff'
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit);
  }()), rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 4px',
      borderRadius: 3,
      background: ((_ELEMENTS$rpgState$am4 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am4 === void 0 ? void 0 : _ELEMENTS$rpgState$am4.color) + '22',
      color: (_ELEMENTS$rpgState$am5 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am5 === void 0 ? void 0 : _ELEMENTS$rpgState$am5.color,
      border: '1px solid ' + ((_ELEMENTS$rpgState$am6 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am6 === void 0 ? void 0 : _ELEMENTS$rpgState$am6.color) + '44'
    }
  }, rpgState.amulet.gem, " gem")), !rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)',
      marginTop: 2
    }
  }, "No gem \u2014 visit the Enchanter to slot one")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#888'
    }
  }, "No Amulet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Craft at Blacksmith from gold bars (nuggets: ", rpgState.goldNuggets || 0, "/", NUGGETS_PER_BAR, ", bars: ", rpgState.goldBars || 0, ")"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      background: rpgState.shield ? 'rgba(216,168,95,.05)' : 'rgba(255,255,255,.03)',
      border: rpgState.shield ? '1px solid rgba(216,168,95,.2)' : '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.shield ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#D8A85F'
    }
  }, rpgState.shield.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_BLACKSMITH_TIERS$rpg = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg.label) || 'Basic', " \xB7 ", ((_BLACKSMITH_TIERS$rpg2 = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg2 === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg2.tierMult) || 1, "\xD7", rpgState.shield.gem && function (_ELEMENTS$rpgState$sh3) {
    var bonus = getShieldBonus(rpgState.shield);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$rpgState$sh3 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh3 === void 0 ? void 0 : _ELEMENTS$rpgState$sh3.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.35)'
    }
  }, rpgState.shield.reforgeBonus ? rpgState.shield.reforgeBonus.label + ' +' + rpgState.shield.reforgeBonus.value + rpgState.shield.reforgeBonus.unit : '', rpgState.shield.hardenBonus ? ' · ' + rpgState.shield.hardenBonus.label + ' +' + rpgState.shield.hardenBonus.value + rpgState.shield.hardenBonus.unit : '', !rpgState.shield.reforgeBonus && !rpgState.shield.gem && 'No bonuses yet')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#888'
    }
  }, "No Shield"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Craft at the Blacksmith from ore"))))), function () {
    var inv = rpgState.inventory || {};
    var cookedFish = Object.entries(inv).filter(function (_ref160) {
      var _ref161 = _slicedToArray(_ref160, 2),
        k = _ref161[0],
        v = _ref161[1];
      return v > 0 && k.startsWith('cooked_');
    });
    if (cookedFish.length === 0) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#59BF91',
        marginTop: 4,
        marginBottom: 4
      }
    }, "\uD83C\uDF7D\uFE0F Food (", cookedFish.reduce(function (s, e) {
      return s + e[1];
    }, 0), ")"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap',
        marginBottom: 6
      }
    }, cookedFish.map(function (_ref162) {
      var _ref163 = _slicedToArray(_ref162, 2),
        key = _ref163[0],
        qty = _ref163[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      /* v2.3.1207: calcDisplayHeal — folds the HP-grid Recovery mult the
         way the server's _handleEatRequest does, so the button label,
         the optimistic heal, and the popup all match the authoritative
         heal in the player_state echo.  Live rpg via stateRef (Recovery
         points can be spent without a setRpgState). */
      var healAmt = calcDisplayHeal((stateRef.current && stateRef.current.rpg) || rpgState, key);
      var atFull = rpgState.hp >= rpgState.maxHp;
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        style: {
          padding: '3px 6px',
          borderRadius: 5,
          fontSize: 8,
          cursor: 'pointer',
          background: atFull ? 'rgba(255,255,255,.04)' : 'rgba(61,220,151,.1)',
          border: atFull ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(61,220,151,.2)',
          color: atFull ? 'rgba(255,255,255,.3)' : '#59BF91',
          fontWeight: 700,
          textTransform: 'capitalize'
        },
        onClick: function onClick() {
          if (atFull) return;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          var healed = Math.min(healAmt, R.maxHp - R.hp);
          R.hp = Math.min(R.maxHp, R.hp + healAmt);
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '+' + healed + ' HP', '#59BF91');
          /* (Eat handler patched to send eat_request -- see block above.) */
          if (stateRef.current._serverMonsters && stateRef.current.channel) {
            try { stateRef.current.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
          }
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "\uD83D\uDC1F ", fishName, " \xD7", qty, " (+", healAmt, "HP)");
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#a78bfa',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCE6 Weapon Stash (", (rpgState.weaponStash || []).length, "/", WEAPON_STASH_MAX, ")"), (rpgState.weaponStash || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Empty. Weapon drops are auto-stashed here for comparison."), (rpgState.weaponStash || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginBottom: 8
    }
  }, (rpgState.weaponStash || []).map(function (sw, si) {
    var _WEAPON_TYPES$current, _ELEMENTS$sw$element, _ELEMENTS$sw$element2, _ELEMENTS$sw$element3, _ELEMENTS$sw$element4, _ELEMENTS$sw$element5, _ELEMENTS$sw$element6, _WEAPON_TYPES$sw$type2;
    var swt = WEAPON_TYPES[sw.type];
    var srt = RARITY_TIERS[sw.tier];
    var isRanged = (swt === null || swt === void 0 ? void 0 : swt.type) === 'ranged';
    var current = isRanged ? rpgState.rangedWeapon : rpgState.weapon;
    /* v2.3.1206: read LIVE state for the compare numbers — rpgState is a
       React snapshot that lags in-place S.rpg mutations (SpendPointConfirm
       deliberately skips setRpgState; documented pattern, do not "fix"),
       so a fresh channel spend moved combat but not this panel until the
       next unrelated setRpgState.  stateRef.current.rpg is the same live
       object the game loop reads. */
    var liveRpg = (stateRef.current && stateRef.current.rpg) || rpgState || {};
    /* v2.3.1207: deterministic band midpoints from the shared display
       helper — these were single RANDOM calcWeaponDmg rolls, so the
       compare (and its ▲/▼ diff) jittered between renders and could
       flip sign on identical weapons. */
    var stashRange = calcDisplayDmgRange(liveRpg, sw);
    var curRange = current ? calcDisplayDmgRange(liveRpg, current) : null;
    var stashDmg = stashRange ? Math.round((stashRange.min + stashRange.max) / 2) : 0;
    var curDmg = curRange ? Math.round((curRange.min + curRange.max) / 2) : 0;
    var dmgDiff = stashDmg - curDmg;
    var stashSpd = (swt === null || swt === void 0 ? void 0 : swt.speed) || 1;
    var curSpd = current ? ((_WEAPON_TYPES$current = WEAPON_TYPES[current.type]) === null || _WEAPON_TYPES$current === void 0 ? void 0 : _WEAPON_TYPES$current.speed) || 1 : 1;
    var spdDiff = stashSpd - curSpd;
    /* v2.3.1206: DPS via the shared calcDisplayDps (the dashboard's
       formula: real attack period + crit-channel fold) instead of
       dmg × the coarse WEAPON_TYPES.speed scalar, which ignored crit
       entirely — crit-channel points now move BOTH sides of the stash
       compare.  SPD keeps the legacy scalar as a feel label. */
    var stashDps = Math.round(calcDisplayDps(liveRpg, sw));
    var curDps = current ? Math.round(calcDisplayDps(liveRpg, current)) : 0;
    var dpsDiff = stashDps - curDps;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, (swt === null || swt === void 0 ? void 0 : swt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: (srt === null || srt === void 0 ? void 0 : srt.color) || '#888'
      }
    }, sw.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, srt === null || srt === void 0 ? void 0 : srt.label, " ", swt === null || swt === void 0 ? void 0 : swt.label, " \xB7 ", sw.tierMult, "\xD7 \xB7 ", isRanged ? 'Ranged' : 'Melee'))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        fontSize: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashDmg), dmgDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dmgDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, dmgDiff > 0 ? '▲' : '▼', Math.abs(dmgDiff))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashSpd), spdDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: spdDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, spdDiff > 0 ? '▲' : '▼', Math.abs(spdDiff).toFixed(1))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.5)'
      }
    }, "DPS: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#fff'
      }
    }, stashDps), dpsDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dpsDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, dpsDiff > 0 ? '▲' : '▼', Math.abs(dpsDiff)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        marginBottom: 4
      }
    }, sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element === void 0 ? void 0 : _ELEMENTS$sw$element.color) + '22',
        color: (_ELEMENTS$sw$element2 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element2 === void 0 ? void 0 : _ELEMENTS$sw$element2.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element3 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element3 === void 0 ? void 0 : _ELEMENTS$sw$element3.color) + '44'
      }
    }, sw.element1), sw.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element4 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element4 === void 0 ? void 0 : _ELEMENTS$sw$element4.color) + '22',
        color: (_ELEMENTS$sw$element5 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element5 === void 0 ? void 0 : _ELEMENTS$sw$element5.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element6 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element6 === void 0 ? void 0 : _ELEMENTS$sw$element6.color) + '44'
      }
    }, sw.element2), sw.isVolatile && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: '#D95C54'
      }
    }, "\u26A1VOL"), !sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "No elements"), function () {
      var req = getEquipReqLabel(sw, sw.type);
      if (!req) return null;
      var met = (rpgState[req.stat] || 0) >= req.req;
      return /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: met ? '#59BF91' : '#D95C54',
          marginLeft: 4
        }
      }, req.label, " ", rpgState[req.stat] || 0, "/", req.req, " ", met ? '✓' : '✗');
    }()), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 5,
        border: '1px solid rgba(216,168,95,.4)',
        background: 'rgba(216,168,95,.15)',
        color: '#a78bfa',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var swapWpn = R.weaponStash[si];
        /* Check stat requirement */
        if (!canEquipItem(R, swapWpn, swapWpn.type)) {
          var req = getEquipReqLabel(swapWpn, swapWpn.type);
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + req.req + ' ' + req.label + ' (have ' + (R[req.stat] || 0) + ')', '#D95C54');
          return;
        }
        var wDef = WEAPON_TYPES[swapWpn.type];
        var swIsRanged = (wDef === null || wDef === void 0 ? void 0 : wDef.type) === 'ranged';
        var old = swIsRanged ? R.rangedWeapon : R.weapon;
        /* Equip from stash, put old weapon in stash */
        if (swIsRanged) R.rangedWeapon = swapWpn;else R.weapon = swapWpn;
        R.weaponStash[si] = old;
        /* Server-authoritative equipment in MP: tell the worker to
           perform the same swap so its view stays in sync.  The
           swap above is local prediction; player_state arrives
           shortly with the worker's authoritative weapon + stash. */
        {
          var _Seq = stateRef.current;
          if (_Seq._serverMonsters && _Seq.channel) {
            try { _Seq.channel.send({ type: 'equip_request', payload: { stashIdx: si, slot: swIsRanged ? 'rangedWeapon' : 'weapon' } }); } catch (e) {}
          }
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "\u2694\uFE0F Equip"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 5,
        border: '1px solid rgba(216,169,77,.3)',
        background: 'rgba(216,169,77,.1)',
        color: '#D8A94D',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _WEAPON_TYPES$sold$ty2;
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var sold = R.weaponStash[si];
        var sellVal = Math.ceil((sold.tierMult || 1) * (((_WEAPON_TYPES$sold$ty2 = WEAPON_TYPES[sold.type]) === null || _WEAPON_TYPES$sold$ty2 === void 0 ? void 0 : _WEAPON_TYPES$sold$ty2.base) || 30) * 0.5);
        /* Server-authoritative stash sell in MP: worker validates the
           stash entry exists, computes the same sell value, credits
           coins, splices the stash.  Local mutation stays as snappy
           visual prediction; player_state arrives shortly with the
           authoritative stash + coins. */
        {
          var _Ssw = stateRef.current;
          if (_Ssw._serverMonsters && _Ssw.channel) {
            try { _Ssw.channel.send({ type: 'sell_weapon', payload: { stashIdx: si } }); } catch (e) {}
          }
        }
        R.coins += sellVal;
        if (R._compStats) R._compStats.totalGoldEarned += sellVal;
        R.weaponStash.splice(si, 1);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        var S = stateRef.current;
        pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + sellVal + 'G', '#D8A94D');
        BT_AUDIO.beep(400, 0.05, 0.08, 'sine');
      }
    }, "\uD83D\uDCB0 Sell (", Math.ceil((sw.tierMult || 1) * (((_WEAPON_TYPES$sw$type2 = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type2 === void 0 ? void 0 : _WEAPON_TYPES$sw$type2.base) || 30) * 0.5), "g)")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#00d4b8',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCD6 Codex: ", discoveredCollisions.size, " collisions discovered"), discoveredCollisions.size > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap',
      marginBottom: 6
    }
  }, _toConsumableArray(discoveredCollisions).slice(0, 20).map(function (cid) {
    var coll = Object.values(COLLISION_TABLE).find(function (c) {
      return c.id === cid;
    });
    return coll ? /*#__PURE__*/React.createElement("span", {
      key: cid,
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(0,212,184,.1)',
        color: '#00d4b8',
        border: '1px solid rgba(0,212,184,.2)'
      }
    }, coll.name) : null;
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginTop: 8,
      marginBottom: 4
    }
  }, "\uD83E\uDEA4 Pets: ", ((_rpgState$lifeSkills37 = rpgState.lifeSkills) === null || _rpgState$lifeSkills37 === void 0 || (_rpgState$lifeSkills37 = _rpgState$lifeSkills37.pets) === null || _rpgState$lifeSkills37 === void 0 ? void 0 : _rpgState$lifeSkills37.length) || 0, "/", MAX_PET_SLOTS, ((_rpgState$lifeSkills38 = rpgState.lifeSkills) === null || _rpgState$lifeSkills38 === void 0 ? void 0 : _rpgState$lifeSkills38.trapping) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, " \xB7 Trapping Lv", rpgState.lifeSkills.trapping.level)), (((_rpgState$lifeSkills39 = rpgState.lifeSkills) === null || _rpgState$lifeSkills39 === void 0 ? void 0 : _rpgState$lifeSkills39.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "No pets. Weaken a monster to <20% HP then tap \uD83E\uDEA4 to capture!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4,
      marginBottom: 6
    }
  }, (((_rpgState$lifeSkills40 = rpgState.lifeSkills) === null || _rpgState$lifeSkills40 === void 0 ? void 0 : _rpgState$lifeSkills40.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills41, _ELEMENTS$pet$element2;
    var isActive = ((_rpgState$lifeSkills41 = rpgState.lifeSkills) === null || _rpgState$lifeSkills41 === void 0 ? void 0 : _rpgState$lifeSkills41.activePet) === pi;
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 6,
        borderRadius: 8,
        textAlign: 'center',
        background: isActive ? 'rgba(216,169,77,.1)' : 'rgba(255,255,255,.03)',
        border: "1px solid ".concat(isActive ? 'rgba(216,169,77,.3)' : 'rgba(255,255,255,.08)'),
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        R.lifeSkills.activePet = isActive ? null : pi;
        stateRef.current._petX = null; /* reset pet position */
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: ((_ELEMENTS$pet$element2 = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element2 === void 0 ? void 0 : _ELEMENTS$pet$element2.color) || '#888'
      }
    }, pet.element), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        fontWeight: 700,
        color: '#D8A94D'
      }
    }, "ACTIVE"));
  })), (((_rpgState$lifeSkills42 = rpgState.lifeSkills) === null || _rpgState$lifeSkills42 === void 0 ? void 0 : _rpgState$lifeSkills42.pets) || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)'
    }
  }, "Tap a pet to set active. Active pet follows you and auto-collects loot within ", PET_LOOT_RADIUS, "px.")));
}
