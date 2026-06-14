import React from 'react';
import { BT_AUDIO, REFORGE_BONUSES, STAT_LABELS, WEAPON_STASH_MAX, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, getGearStatReq, hardenChance, rollReforgeBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === WoodworkPanel — buildingPanel === 'woodwork' sub-panel === */
/* v2.3.873: extracted verbatim from the buildingPanel === 'woodwork' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
export function WoodworkPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills29, _rpgState$lifeSkills32, _stateRef$current17, _wpn$gearBase3;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#8B6914',
      marginBottom: 4
    }
  }, "\uD83E\uDE9A Woodworker"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Woodworking Lv", ((_rpgState$lifeSkills29 = rpgState.lifeSkills) === null || _rpgState$lifeSkills29 === void 0 || (_rpgState$lifeSkills29 = _rpgState$lifeSkills29.woodworking) === null || _rpgState$lifeSkills29 === void 0 ? void 0 : _rpgState$lifeSkills29.level) || 1, " \xB7 Craft bows and staves from harvested wood. Higher tiers unlock gem slots."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [{
    type: 'bow',
    label: '🏹 Bow',
    desc: 'Ranged single-target'
  }, {
    type: 'staff',
    label: '🪄 Staff',
    desc: 'Ranged AOE swipe'
  }].map(function (wt) {
    var _stateRef$current13, _stateRef$current14, _stateRef$current15;
    return /*#__PURE__*/React.createElement("button", {
      key: wt.type,
      style: {
        flex: 1,
        padding: '4px 6px',
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        background: ((_stateRef$current13 = stateRef.current) === null || _stateRef$current13 === void 0 ? void 0 : _stateRef$current13._wwType) === wt.type ? 'rgba(139,105,20,.3)' : 'rgba(255,255,255,.05)',
        border: ((_stateRef$current14 = stateRef.current) === null || _stateRef$current14 === void 0 ? void 0 : _stateRef$current14._wwType) === wt.type ? '1px solid rgba(139,105,20,.5)' : '1px solid rgba(255,255,255,.08)',
        color: ((_stateRef$current15 = stateRef.current) === null || _stateRef$current15 === void 0 ? void 0 : _stateRef$current15._wwType) === wt.type ? '#d4a020' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._wwType = wt.type;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, wt.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 400,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.desc));
  })), Object.entries(WOODWORKING_TIERS).filter(function (_ref139) {
    var _rpgState$lifeSkills30;
    var _ref140 = _slicedToArray(_ref139, 2),
      key = _ref140[0],
      wt = _ref140[1];
    var wwLvl = ((_rpgState$lifeSkills30 = rpgState.lifeSkills) === null || _rpgState$lifeSkills30 === void 0 || (_rpgState$lifeSkills30 = _rpgState$lifeSkills30.woodworking) === null || _rpgState$lifeSkills30 === void 0 ? void 0 : _rpgState$lifeSkills30.level) || 1;
    return wt.minLvl <= wwLvl + 10;
  }).map(function (_ref141) {
    var _rpgState$lifeSkills31, _rpgState$inventory3, _stateRef$current16;
    var _ref142 = _slicedToArray(_ref141, 2),
      key = _ref142[0],
      wt = _ref142[1];
    var wwLvl = ((_rpgState$lifeSkills31 = rpgState.lifeSkills) === null || _rpgState$lifeSkills31 === void 0 || (_rpgState$lifeSkills31 = _rpgState$lifeSkills31.woodworking) === null || _rpgState$lifeSkills31 === void 0 ? void 0 : _rpgState$lifeSkills31.level) || 1;
    var canCraftSkill = wwLvl >= wt.minLvl;
    var woodKey = 'wood_' + wt.wood;
    var hasWood = (((_rpgState$inventory3 = rpgState.inventory) === null || _rpgState$inventory3 === void 0 ? void 0 : _rpgState$inventory3[woodKey]) || 0) >= wt.woodCost;
    var hasGold = rpgState.coins >= wt.goldCost;
    var craftType = ((_stateRef$current16 = stateRef.current) === null || _stateRef$current16 === void 0 ? void 0 : _stateRef$current16._wwType) || 'bow';
    var wwFullIdx = Object.keys(WOODWORKING_TIERS).indexOf(key);
    var wwStatReq = getGearStatReq(craftType, wwFullIdx);
    var wwMeetsStat = wwStatReq.value === 0 || (rpgState[wwStatReq.stat] || 0) >= wwStatReq.value;
    var canCraft = canCraftSkill && wwMeetsStat;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCraft ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, wt.slots > 0 ? '💠' : '🪵'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canCraft ? '#fff' : '#666'
      }
    }, wt.label, " ", craftType === 'bow' ? 'Bow' : 'Staff', " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", wt.minLvl, "+ \xB7 ", wt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, wt.desc, " ", wt.slots > 0 ? "\xB7 ".concat(wt.slots, " gem slot").concat(wt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.woodCost, "\xD7 ", wt.wood.replace(/_/g, ' '), " + ", wt.goldCost, "g", !canCraftSkill && " \xB7 Req WW Lv".concat(wt.minLvl), canCraftSkill && !wwMeetsStat && " \xB7 Req ".concat(STAT_LABELS[wwStatReq.stat] || wwStatReq.stat, " ").concat(wwStatReq.value))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCraft && hasWood && hasGold ? '#8B6914' : 'rgba(255,255,255,.08)',
        color: canCraft && hasWood && hasGold ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canCraft || !hasWood || !hasGold) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        var wpnType = craftType === 'bow' ? 'bow' : 'staff';
        /* Server-authoritative forge in MP -- mirrors WOODWORKING_TIERS.
           See blacksmith forge (~line 22273) for the predict + sync flow. */
        {
          var _Sww = stateRef.current;
          if (_Sww._serverMonsters && _Sww.channel) {
            try { _Sww.channel.send({ type: 'forge_weapon', payload: { weaponType: wpnType, tierKey: key, isWoodwork: true } }); } catch (e) {}
          }
        }
        R.inventory[woodKey] = (R.inventory[woodKey] || 0) - wt.woodCost;
        if (R.inventory[woodKey] <= 0) delete R.inventory[woodKey];
        R.coins -= wt.goldCost;
        var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        if (R[wpnKey] && R[wpnKey].name) {
          if (!R.weaponStash) R.weaponStash = [];
          if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(_objectSpread({}, R[wpnKey]));
        }
        R[wpnKey] = {
          type: wpnType,
          tier: 'common',
          tierMult: wt.tierMult,
          element1: null,
          element2: null,
          isVolatile: false,
          name: wt.label + ' ' + WEAPON_TYPES[wpnType].label,
          gearBase: 'ww_' + key,
          reforgeBonus: null,
          hardenBonus: null
        };
        var leveled = addLifeSkillXp(R.lifeSkills, 'woodworking', wt.minLvl * 5);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.craftedWoodWeapon = true;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Crafted ' + wt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
          color: '#8B6914',
          ts: Date.now()
        });
        if (wt.slots > 0) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 42,
          text: wt.slots + ' gem slot' + (wt.slots > 1 ? 's' : '') + ' ready!',
          color: '#a855f7',
          ts: Date.now()
        });
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 54,
          text: 'Woodworking Lv' + R.lifeSkills.woodworking.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Craft"));
  }), function (_stateRef$current17, _wpn$gearBase3, _rpgState$lifeSkills32) {
    var craftType = ((_stateRef$current17 = stateRef.current) === null || _stateRef$current17 === void 0 ? void 0 : _stateRef$current17._wwType) || 'bow';
    var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
    var wpn = rpgState[wpnKey];
    if (!(wpn !== null && wpn !== void 0 && (_wpn$gearBase3 = wpn.gearBase) !== null && _wpn$gearBase3 !== void 0 && _wpn$gearBase3.startsWith('ww_'))) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginTop: 8
      }
    }, "Craft a weapon first to unlock Reforge & Harden.");
    var wwKey = wpn.gearBase.slice(3);
    var wt = WOODWORKING_TIERS[wwKey];
    if (!wt) return null;
    var reforgeCost = Math.ceil(wt.woodCost * 0.5);
    var reforgeWoodKey = 'wood_' + wt.wood;
    var reforgeGold = Math.ceil(wt.goldCost * 0.3);
    var hardenCost = wt.woodCost;
    var hardenGold = Math.ceil(wt.goldCost * 0.5);
    var hChance = hardenChance(wt.tierMult, ((_rpgState$lifeSkills32 = rpgState.lifeSkills) === null || _rpgState$lifeSkills32 === void 0 || (_rpgState$lifeSkills32 = _rpgState$lifeSkills32.woodworking) === null || _rpgState$lifeSkills32 === void 0 ? void 0 : _rpgState$lifeSkills32.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(139,105,20,.06)',
        border: '1px solid rgba(139,105,20,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#8B6914',
        marginBottom: 4
      }
    }, "\uD83D\uDD27 Reforge & Harden: ", wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 4
      }
    }, "Current: ", wpn.reforgeBonus ? "".concat(wpn.reforgeBonus.label, " +").concat(wpn.reforgeBonus.value).concat(wpn.reforgeBonus.unit) : 'No bonus', wpn.hardenBonus ? " \xB7 ".concat(wpn.hardenBonus.label, " +").concat(wpn.hardenBonus.value).concat(wpn.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: '1px solid rgba(139,105,20,.3)',
        background: 'rgba(139,105,20,.12)',
        color: '#d4a020',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeWoodKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + reforgeCost + 'x wood + ' + reforgeGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeWoodKey] -= reforgeCost;
        if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
        R.coins -= reforgeGold;
        var bonus = rollReforgeBonus(wt.tierMult);
        R[wpnKey].reforgeBonus = bonus;
        addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
          color: '#d4a020',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge (", reforgeCost, " wood + ", reforgeGold, "g)"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        border: wpn.hardenBonus ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(245,197,66,.3)',
        background: wpn.hardenBonus ? 'rgba(255,255,255,.04)' : 'rgba(245,197,66,.1)',
        color: wpn.hardenBonus ? 'rgba(255,255,255,.3)' : '#f5c542',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R[wpnKey].hardenBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Already hardened!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R[wpnKey].reforgeBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Reforge first!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeWoodKey] || 0) < hardenCost || R.coins < hardenGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + hardenCost + 'x wood + ' + hardenGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeWoodKey] -= hardenCost;
        if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          var bonus = rollReforgeBonus(wt.tierMult);
          if (bonus.id === R[wpnKey].reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R[wpnKey].hardenBonus = bonus;
          addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 4));
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
            color: '#f5c542',
            ts: Date.now()
          });
          stateRef.current.screenShake = 4;
          BT_AUDIO.collect();
        } else {
          var oldName = R[wpnKey].name;
          R[wpnKey].reforgeBonus = null;
          R[wpnKey].hardenBonus = null;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'BROKE! ' + oldName + ' lost all bonuses',
            color: '#ff5e6c',
            ts: Date.now()
          });
          stateRef.current.screenShake = 6;
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "% \xB7 ", hardenCost, " wood + ", hardenGold, "g)")));
  }());
}
