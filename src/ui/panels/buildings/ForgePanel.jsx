import React from 'react';
import { AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, EQUIP_STAT_MAP, NUGGETS_PER_BAR, REFORGE_BONUSES, SHIELD_EQUIP_STAT, STAT_LABELS, WEAPON_STASH_MAX, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, gemExtractCost, getAmuletSalvageReturns, getGearStatReq, getSalvageReturns, hardenChance, recalcDerived, rollReforgeBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === ForgePanel — blacksmith forge (weapon/armor craft, reforge, harden, salvage) === */
/* v2.3.872: first buildingPanel sub-panel extracted (REBUILD-PLAN UI
   decomposition). Moved verbatim from the buildingPanel === 'forge'
   clause in BroTown.jsx; behavior-frozen. 3 props (rpgState, stateRef,
   setRpgState). Data + babel imports verified real exports.
   _rpgState$lifeSkills21 babel temp hoisted to BroTown top; declared
   locally. setTimeout/localStorage are browser globals. */
export function ForgePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills21;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#b0b0b0',
      marginBottom: 4
    }
  }, "\uD83D\uDD28 Blacksmith"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Blacksmithing Lv", ((_rpgState$lifeSkills21 = rpgState.lifeSkills) === null || _rpgState$lifeSkills21 === void 0 || (_rpgState$lifeSkills21 = _rpgState$lifeSkills21.blacksmithing) === null || _rpgState$lifeSkills21 === void 0 ? void 0 : _rpgState$lifeSkills21.level) || 1, " \xB7 Forge melee weapons from ore. Higher levels unlock gem slots."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [{
    type: 'greatsword',
    label: '⚔️ Greatsword',
    desc: 'Slow, heavy hitter'
  }, {
    type: 'sword',
    label: '🗡️ Sword',
    desc: 'Fast, status pressure'
  }, {
    type: 'shield',
    label: '🛡️ Shield',
    desc: 'Defensive gear'
  }].map(function (wt) {
    var _stateRef$current8, _stateRef$current9, _stateRef$current0;
    return /*#__PURE__*/React.createElement("button", {
      key: wt.type,
      style: {
        flex: 1,
        padding: '4px 6px',
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        background: (((_stateRef$current8 = stateRef.current) === null || _stateRef$current8 === void 0 ? void 0 : _stateRef$current8._bsType) || 'greatsword') === wt.type ? 'rgba(176,176,176,.2)' : 'rgba(255,255,255,.05)',
        border: (((_stateRef$current9 = stateRef.current) === null || _stateRef$current9 === void 0 ? void 0 : _stateRef$current9._bsType) || 'greatsword') === wt.type ? '1px solid rgba(176,176,176,.4)' : '1px solid rgba(255,255,255,.08)',
        color: (((_stateRef$current0 = stateRef.current) === null || _stateRef$current0 === void 0 ? void 0 : _stateRef$current0._bsType) || 'greatsword') === wt.type ? '#d0d0d0' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._bsType = wt.type;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, wt.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 400,
        color: 'rgba(255,255,255,.3)'
      }
    }, wt.desc));
  })), Object.entries(BLACKSMITH_TIERS).filter(function (_ref129) {
    var _rpgState$lifeSkills22;
    var _ref130 = _slicedToArray(_ref129, 2),
      key = _ref130[0],
      bt = _ref130[1];
    var bsLvl = ((_rpgState$lifeSkills22 = rpgState.lifeSkills) === null || _rpgState$lifeSkills22 === void 0 || (_rpgState$lifeSkills22 = _rpgState$lifeSkills22.blacksmithing) === null || _rpgState$lifeSkills22 === void 0 ? void 0 : _rpgState$lifeSkills22.level) || 1;
    /* Show tiers within 10 levels of player skill, plus next locked one */
    return bt.minLvl <= bsLvl + 10;
  }).map(function (_ref131) {
    var _rpgState$lifeSkills23, _rpgState$inventory, _stateRef$current1, _stateRef$current10, _stateRef$current12;
    var _ref132 = _slicedToArray(_ref131, 2),
      key = _ref132[0],
      bt = _ref132[1];
    var bsLvl = ((_rpgState$lifeSkills23 = rpgState.lifeSkills) === null || _rpgState$lifeSkills23 === void 0 || (_rpgState$lifeSkills23 = _rpgState$lifeSkills23.blacksmithing) === null || _rpgState$lifeSkills23 === void 0 ? void 0 : _rpgState$lifeSkills23.level) || 1;
    var canForgeSkill = bsLvl >= bt.minLvl;
    var oreKey = 'ore_' + bt.oreName + '_ore';
    var hasOre = (((_rpgState$inventory = rpgState.inventory) === null || _rpgState$inventory === void 0 ? void 0 : _rpgState$inventory[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    var bsMelee = ((_stateRef$current1 = stateRef.current) === null || _stateRef$current1 === void 0 ? void 0 : _stateRef$current1._bsType) || 'greatsword';
    var gearType = bsMelee === 'shield' ? 'shield' : bsMelee;
    var fullIdx = Object.keys(BLACKSMITH_TIERS).indexOf(key);
    var statReq = getGearStatReq(gearType, fullIdx);
    var meetsStat = statReq.value === 0 || (rpgState[statReq.stat] || 0) >= statReq.value;
    var canForge = canForgeSkill && meetsStat;
    var bsType = ((_stateRef$current10 = stateRef.current) === null || _stateRef$current10 === void 0 ? void 0 : _stateRef$current10._bsType) || 'greatsword';
    var reqStat = EQUIP_STAT_MAP[bsType] || 'power';
    var playerStat = rpgState[reqStat] || 0;
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
        opacity: canForge && meetsStat ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, bt.slots > 0 ? '💠' : '🔨'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canForge && meetsStat ? '#fff' : '#666'
      }
    }, bt.label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, bt.desc, " ", bt.slots > 0 ? "\xB7 ".concat(bt.slots, " gem slot").concat(bt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g", !canForgeSkill && " \xB7 Req BS Lv".concat(bt.minLvl), canForgeSkill && !meetsStat && " \xB7 Req ".concat(STAT_LABELS[statReq.stat] || statReq.stat, " ").concat(statReq.value), bt.statReq > 0 && function (_stateRef$current11) {
      var bsType = ((_stateRef$current11 = stateRef.current) === null || _stateRef$current11 === void 0 ? void 0 : _stateRef$current11._bsType) || 'greatsword';
      var reqStat = bsType === 'shield' ? SHIELD_EQUIP_STAT : EQUIP_STAT_MAP[bsType] || 'power';
      var playerVal = rpgState[reqStat] || 0;
      var met = playerVal >= bt.statReq;
      return /*#__PURE__*/React.createElement("span", {
        style: {
          color: met ? '#3dd497' : '#ff5e6c'
        }
      }, " \xB7 ", bt.statReq, " ", reqStat, " ", met ? '✓' : '✗');
    }())), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && meetsStat ? '#b0b0b0' : 'rgba(255,255,255,.08)',
        color: canForge && hasOre && hasGold && meetsStat ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !meetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        var bsMelee = stateRef.current._bsType || 'greatsword';
        /* Server-authoritative forge in MP: worker mirrors
           BLACKSMITH_TIERS, validates skill + stat + ore + coins,
           consumes + mints + swaps to stash + applies XP.  Local
           mutation stays as snappy visual prediction; player_state
           arrives with authoritative weapon + stash + coins + inv. */
        {
          var _Sfw = stateRef.current;
          if (_Sfw._serverMonsters && _Sfw.channel) {
            try { _Sfw.channel.send({ type: 'forge_weapon', payload: { weaponType: bsMelee, tierKey: key, isWoodwork: false } }); } catch (e) {}
          }
        }
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        var wpnKey = 'weapon';
        var wpnType = bsMelee;
        if (R[wpnKey] && R[wpnKey].name) {
          if (!R.weaponStash) R.weaponStash = [];
          if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(_objectSpread({}, R[wpnKey]));
        }
        R[wpnKey] = {
          type: wpnType,
          tier: 'common',
          tierMult: bt.tierMult,
          element1: null,
          element2: null,
          isVolatile: false,
          name: bt.label + ' ' + WEAPON_TYPES[wpnType].label,
          gearBase: key,
          reforgeBonus: null,
          hardenBonus: null
        };
        var leveled = addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 5);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.forgedWeapon = true;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Forged ' + bt.label + ' ' + WEAPON_TYPES[wpnType].label + '!',
          color: '#b0b0b0',
          ts: Date.now()
        });
        if (bt.slots > 0) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 42,
          text: bt.slots + ' gem slot' + (bt.slots > 1 ? 's' : '') + ' ready!',
          color: '#a855f7',
          ts: Date.now()
        });
        if (leveled) stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 54,
          text: 'Blacksmithing Lv' + R.lifeSkills.blacksmithing.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Forge (", ((_stateRef$current12 = stateRef.current) === null || _stateRef$current12 === void 0 ? void 0 : _stateRef$current12._bsType) === 'sword' ? 'Sword' : 'Greatsword', ")"));
  }), function () {
    /* v2.3.1131: SS4.6c HARDENING -- the server-rolled H0->H5 ladder
       (harden_weapon -> hardening.js).  DISTINCT from the legacy
       "Harden" affix button below (weapon.hardenBonus): this one is
       the numeric damage layer (weapon.hardness), gold-only cost,
       odds fixed by ladder rung (skill gates ACCESS, never odds).
       Result popups arrive via harden_result (gameEvents.js); the
       weapon state itself rides the authoritative player_state echo. */
    var _Sh = stateRef.current;
    if (!(_Sh._serverCaps && _Sh._serverCaps.harden && _Sh.channel)) return null;
    var hw = rpgState.weapon;
    if (!hw) return null;
    var hLvl = typeof hw.hardness === 'number' ? hw.hardness : 0;
    var hMaxed = hLvl >= 5;
    var hOdds = [80, 20, 5, 1, 0.5][Math.min(hLvl, 4)];
    var hCost = 500 * Math.pow(4, hLvl);
    var hTemper = hw.temper || 0;
    var hAfford = (rpgState.coins || 0) >= hCost;
    return /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(245,197,66,.06)', border: '1px solid rgba(245,197,66,.18)' }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 10, fontWeight: 700, color: '#f5c542', marginBottom: 3 }
    }, "\u2692\uFE0F Hardening: ", hw.name, " \u2014 H", hLvl, "/5"), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 8, color: 'rgba(255,255,255,.4)', marginBottom: 4 }
    }, hMaxed ? 'Maximum hardness reached!' : "+1.04 base dmg per level \xB7 Success " + hOdds + "% \xB7 Fail resets hardness (Temper " + hTemper + " softens it)"), !hMaxed && /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%', padding: '5px 0', borderRadius: 5, fontSize: 9, fontWeight: 800,
        border: '1px solid rgba(245,197,66,.3)',
        background: hAfford ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: hAfford ? '#f5c542' : 'rgba(255,255,255,.2)',
        cursor: hAfford ? 'pointer' : 'not-allowed'
      },
      onClick: function onClick() {
        if (!hAfford) return;
        try { _Sh.channel.send({ type: 'broadcast', event: 'harden_weapon', payload: { slot: 'weapon' } }); } catch (e) {}
      }
    }, "Attempt H", hLvl + 1, " (", hCost, "G \xB7 ", hOdds, "%)"));
  }(), function (_rpgState$lifeSkills24) {
    var wpn = rpgState.weapon;
    if (!(wpn !== null && wpn !== void 0 && wpn.gearBase)) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginTop: 8
      }
    }, "Forge a weapon first to unlock Reforge & Harden.");
    var bt = BLACKSMITH_TIERS[wpn.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = 'ore_' + bt.oreName + '_ore';
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills24 = rpgState.lifeSkills) === null || _rpgState$lifeSkills24 === void 0 || (_rpgState$lifeSkills24 = _rpgState$lifeSkills24.blacksmithing) === null || _rpgState$lifeSkills24 === void 0 ? void 0 : _rpgState$lifeSkills24.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(176,176,176,.06)',
        border: '1px solid rgba(176,176,176,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#b0b0b0',
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
        border: '1px solid rgba(91,82,255,.3)',
        background: 'rgba(91,82,255,.12)',
        color: '#a78bfa',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + reforgeCost + 'x ore + ' + reforgeGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        var bonus = rollReforgeBonus(bt.tierMult);
        R.weapon.reforgeBonus = bonus;
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit,
          color: '#a78bfa',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setTimeout(function () {
          return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
        }, 80);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge (", reforgeCost, " ore + ", reforgeGold, "g)"), /*#__PURE__*/React.createElement("button", {
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
        if (R.weapon.hardenBonus) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Already hardened!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (!R.weapon.reforgeBonus) {
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
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need ' + hardenCost + 'x ore + ' + hardenGold + 'g',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          /* SUCCESS — add second bonus */
          var bonus = rollReforgeBonus(bt.tierMult);
          /* Ensure different from first */
          if (bonus.id === R.weapon.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.weapon.hardenBonus = bonus;
          addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 4));
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit,
            color: '#f5c542',
            ts: Date.now()
          });
          stateRef.current.screenShake = 4;
          BT_AUDIO.collect();
          setTimeout(function () {
            return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
          }, 100);
        } else {
          /* FAILED — weapon breaks, reset to base */
          var oldName = R.weapon.name;
          R.weapon.reforgeBonus = null;
          R.weapon.hardenBonus = null;
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
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "% \xB7 ", hardenCost, " ore + ", hardenGold, "g)")));
  }(), /*#__PURE__*/React.createElement("div", {
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
  }, "\uD83D\uDCFF Amulet Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Gold Nuggets: ", rpgState.goldNuggets || 0, " \xB7 Gold Bars: ", rpgState.goldBars || 0, (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#f5c542'
    }
  }, " \xB7 Can smelt!")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '4px 0',
      borderRadius: 5,
      marginBottom: 6,
      border: '1px solid rgba(245,197,66,.3)',
      fontSize: 8,
      fontWeight: 700,
      cursor: 'pointer',
      background: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.04)',
      color: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? '#f5c542' : 'rgba(255,255,255,.25)'
    },
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if ((R.goldNuggets || 0) < NUGGETS_PER_BAR) return;
      R.goldNuggets -= NUGGETS_PER_BAR;
      R.goldBars = (R.goldBars || 0) + 1;
      stateRef.current.dmgNumbers.push({
        x: stateRef.current.player.x,
        y: stateRef.current.player.y - 30,
        text: 'Smelted Gold Bar!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
      }, 100);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "\uD83E\uDE99 Smelt ", NUGGETS_PER_BAR, " Nuggets \u2192 1 Gold Bar"), Object.entries(AMULET_TIERS).map(function (_ref133) {
    var _rpgState$lifeSkills25;
    var _ref134 = _slicedToArray(_ref133, 2),
      key = _ref134[0],
      at = _ref134[1];
    var bsLvl = ((_rpgState$lifeSkills25 = rpgState.lifeSkills) === null || _rpgState$lifeSkills25 === void 0 || (_rpgState$lifeSkills25 = _rpgState$lifeSkills25.blacksmithing) === null || _rpgState$lifeSkills25 === void 0 ? void 0 : _rpgState$lifeSkills25.level) || 1;
    var canCraft = bsLvl >= at.minLvl;
    var hasBars = (rpgState.goldBars || 0) >= at.bars;
    var hasGold = rpgState.coins >= at.goldCost;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        padding: '4px 6px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCraft ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, "\uD83D\uDCFF"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: canCraft ? '#f5c542' : '#666'
      }
    }, at.label, " Amulet ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", at.minLvl, "+ \xB7 ", at.basePower, "\xD7 gem power")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.35)'
      }
    }, at.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, at.bars, " bar", at.bars > 1 ? 's' : '', " + ", at.goldCost, "g", !canCraft && " \xB7 Req Lv".concat(at.minLvl))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCraft && hasBars && hasGold ? '#f5c542' : 'rgba(255,255,255,.08)',
        color: canCraft && hasBars && hasGold ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canCraft || !hasBars || !hasGold) return;
        var R = stateRef.current.rpg;
        R.goldBars -= at.bars;
        R.coins -= at.goldCost;
        R.amulet = {
          tier: key,
          gem: null,
          name: at.label + ' Gold Amulet'
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', at.minLvl * 3);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Crafted ' + at.label + ' Amulet!',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Craft"));
  })), /*#__PURE__*/React.createElement("div", {
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
  }, "\uD83D\uDEE1\uFE0F Shield Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Forge a shield from ore. Same tiers as melee weapons. Slot a gem at the Enchanter for defensive bonuses.", rpgState.shield && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5b52ff'
    }
  }, " \xB7 Equipped: ", rpgState.shield.name)), Object.entries(BLACKSMITH_TIERS).filter(function (_ref135) {
    var _rpgState$lifeSkills26;
    var _ref136 = _slicedToArray(_ref135, 2),
      key = _ref136[0],
      bt = _ref136[1];
    var bsLvl = ((_rpgState$lifeSkills26 = rpgState.lifeSkills) === null || _rpgState$lifeSkills26 === void 0 || (_rpgState$lifeSkills26 = _rpgState$lifeSkills26.blacksmithing) === null || _rpgState$lifeSkills26 === void 0 ? void 0 : _rpgState$lifeSkills26.level) || 1;
    return bt.minLvl <= bsLvl + 10;
  }).slice(0, 8).map(function (_ref137) {
    var _rpgState$lifeSkills27, _rpgState$inventory2;
    var _ref138 = _slicedToArray(_ref137, 2),
      key = _ref138[0],
      bt = _ref138[1];
    var bsLvl = ((_rpgState$lifeSkills27 = rpgState.lifeSkills) === null || _rpgState$lifeSkills27 === void 0 || (_rpgState$lifeSkills27 = _rpgState$lifeSkills27.blacksmithing) === null || _rpgState$lifeSkills27 === void 0 ? void 0 : _rpgState$lifeSkills27.level) || 1;
    var canForge = bsLvl >= bt.minLvl;
    var oreKey = 'ore_' + bt.oreName + '_ore';
    var hasOre = (((_rpgState$inventory2 = rpgState.inventory) === null || _rpgState$inventory2 === void 0 ? void 0 : _rpgState$inventory2[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    var shieldStatVal = rpgState[SHIELD_EQUIP_STAT] || 0;
    var shieldMeetsStat = !bt.statReq || shieldStatVal >= bt.statReq;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
        padding: '4px 6px',
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canForge && shieldMeetsStat ? 1 : 0.4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: canForge && shieldMeetsStat ? '#fff' : '#666'
      }
    }, bt.label, " Shield ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g", bt.statReq > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: shieldMeetsStat ? 'rgba(255,255,255,.3)' : '#ff5e6c'
      }
    }, " \xB7 ", SHIELD_EQUIP_STAT.charAt(0).toUpperCase() + SHIELD_EQUIP_STAT.slice(1), " ", bt.statReq, shieldMeetsStat ? '✓' : ''))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 6px',
        borderRadius: 4,
        border: 'none',
        fontSize: 7,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && shieldMeetsStat ? '#5b52ff' : 'rgba(255,255,255,.08)',
        color: canForge && hasOre && hasGold && shieldMeetsStat ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !shieldMeetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        R.shield = {
          gearBase: key,
          gem: null,
          name: bt.label + ' Shield',
          reforgeBonus: null,
          hardenBonus: null
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 3);
        recalcDerived(R);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Forged ' + bt.label + ' Shield!',
          color: '#5b52ff',
          ts: Date.now()
        });
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Forge"));
  }), function (_rpgState$lifeSkills28) {
    var sh = rpgState.shield;
    if (!(sh !== null && sh !== void 0 && sh.gearBase)) return null;
    var bt = BLACKSMITH_TIERS[sh.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = 'ore_' + bt.oreName + '_ore';
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills28 = rpgState.lifeSkills) === null || _rpgState$lifeSkills28 === void 0 || (_rpgState$lifeSkills28 = _rpgState$lifeSkills28.blacksmithing) === null || _rpgState$lifeSkills28 === void 0 ? void 0 : _rpgState$lifeSkills28.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        padding: 6,
        borderRadius: 6,
        background: 'rgba(91,82,255,.04)',
        border: '1px solid rgba(91,82,255,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#5b52ff',
        marginBottom: 3
      }
    }, "\uD83D\uDD27 ", sh.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 3
      }
    }, sh.reforgeBonus ? "".concat(sh.reforgeBonus.label, " +").concat(sh.reforgeBonus.value).concat(sh.reforgeBonus.unit) : 'No bonus', sh.hardenBonus ? " \xB7 ".concat(sh.hardenBonus.label, " +").concat(sh.hardenBonus.value).concat(sh.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 4,
        border: '1px solid rgba(91,82,255,.25)',
        background: 'rgba(91,82,255,.1)',
        color: '#a78bfa',
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Need materials',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        R.shield.reforgeBonus = rollReforgeBonus(bt.tierMult);
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: R.shield.reforgeBonus.label + ' +' + R.shield.reforgeBonus.value + R.shield.reforgeBonus.unit,
          color: '#a78bfa',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDD27 Reforge"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '3px 0',
        borderRadius: 4,
        border: sh.hardenBonus ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(245,197,66,.25)',
        background: sh.hardenBonus ? 'rgba(255,255,255,.03)' : 'rgba(245,197,66,.08)',
        color: sh.hardenBonus ? 'rgba(255,255,255,.25)' : '#f5c542',
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.shield.hardenBonus || !R.shield.reforgeBonus) return;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) return;
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          var bonus = rollReforgeBonus(bt.tierMult);
          if (bonus.id === R.shield.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.shield.hardenBonus = bonus;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'HARDENED! +' + bonus.label,
            color: '#f5c542',
            ts: Date.now()
          });
          BT_AUDIO.collect();
        } else {
          R.shield.reforgeBonus = null;
          R.shield.hardenBonus = null;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Shield bonuses lost!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u2692\uFE0F Harden (", Math.round(hChance * 100), "%)")));
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.06)',
      border: '1px solid rgba(255,94,108,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u267B\uFE0F Salvage Station"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "Extract gems first, then salvage items for ~60% materials back. Reforge bonuses are lost."), [{
    label: 'Melee Weapon',
    key: 'weapon',
    item: rpgState.weapon,
    gemField: 'element1'
  }, {
    label: 'Ranged Weapon',
    key: 'rangedWeapon',
    item: rpgState.rangedWeapon,
    gemField: 'element1'
  }, {
    label: 'Staff',
    key: 'staffWeapon',
    item: rpgState.staffWeapon,
    gemField: 'element1'
  }, {
    label: 'Shield',
    key: 'shield',
    item: rpgState.shield,
    gemField: 'gem'
  }, {
    label: 'Amulet',
    key: 'amulet',
    item: rpgState.amulet,
    gemField: 'gem'
  }].filter(function (s) {
    return s.item && s.item.gearBase;
  }).map(function (s) {
    var hasGem = s.key === 'amulet' ? !!s.item.gem : s.key === 'shield' ? !!s.item.gem : !!(s.item.element1 || s.item.element2);
    var isAmulet = s.key === 'amulet';
    var salvReturns = isAmulet ? getAmuletSalvageReturns(s.item) : getSalvageReturns(s.item);
    var canSalvage = !hasGem && salvReturns;
    var extractCost = hasGem ? gemExtractCost(s.item) : 0;
    var canAffordExtract = rpgState.coins >= extractCost;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      style: {
        padding: 6,
        borderRadius: 6,
        marginBottom: 4,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#ccc',
        marginBottom: 3
      }
    }, s.label, ": ", s.item.name || 'Unknown', hasGem && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: '#a78bfa'
      }
    }, " \xB7 Has gem(s)")), hasGem && /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '3px 0',
        borderRadius: 4,
        marginBottom: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(167,139,250,.3)',
        background: canAffordExtract ? 'rgba(167,139,250,.12)' : 'rgba(255,255,255,.04)',
        color: canAffordExtract ? '#a78bfa' : 'rgba(255,255,255,.25)'
      },
      onClick: function onClick() {
        var _R$amulet, _R$shield;
        var R = stateRef.current.rpg;
        if (R.coins < extractCost) return;
        R.coins -= extractCost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (s.key === 'amulet' && (_R$amulet = R.amulet) !== null && _R$amulet !== void 0 && _R$amulet.gem) {
          var _AMULET_TIERS$R$amule2;
          var polKey = 'polished_' + R.amulet.gem;
          R.lifeSkills.gems[polKey] = (R.lifeSkills.gems[polKey] || 0) + 1;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Extracted ' + R.amulet.gem + ' gem',
            color: '#a78bfa',
            ts: Date.now()
          });
          R.amulet.gem = null;
          R.amulet.name = (((_AMULET_TIERS$R$amule2 = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule2 === void 0 ? void 0 : _AMULET_TIERS$R$amule2.label) || 'Simple') + ' Gold Amulet';
        } else if (s.key === 'shield' && (_R$shield = R.shield) !== null && _R$shield !== void 0 && _R$shield.gem) {
          var _polKey = 'polished_' + R.shield.gem;
          R.lifeSkills.gems[_polKey] = (R.lifeSkills.gems[_polKey] || 0) + 1;
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Extracted ' + R.shield.gem + ' gem',
            color: '#a78bfa',
            ts: Date.now()
          });
          R.shield.gem = null;
          var bt = BLACKSMITH_TIERS[R.shield.gearBase];
          R.shield.name = ((bt === null || bt === void 0 ? void 0 : bt.label) || 'Basic') + ' Shield';
        } else if (R[s.key]) {
          var _wpn$gearBase2;
          /* Weapon — extract elements as polished gems */
          var wpn = R[s.key];
          if (wpn.element1) {
            var pk = 'polished_' + wpn.element1;
            R.lifeSkills.gems[pk] = (R.lifeSkills.gems[pk] || 0) + 1;
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'Extracted ' + wpn.element1 + ' gem',
              color: '#a78bfa',
              ts: Date.now()
            });
          }
          if (wpn.element2) {
            var _pk = 'polished_' + wpn.element2;
            R.lifeSkills.gems[_pk] = (R.lifeSkills.gems[_pk] || 0) + 1;
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 45,
              text: 'Extracted ' + wpn.element2 + ' gem',
              color: '#a78bfa',
              ts: Date.now()
            });
          }
          wpn.element1 = null;
          wpn.element2 = null;
          wpn.isVolatile = false;
          wpn.tier = 'common';
          /* Rebuild name without elements */
          var isWW = (_wpn$gearBase2 = wpn.gearBase) === null || _wpn$gearBase2 === void 0 ? void 0 : _wpn$gearBase2.startsWith('ww_');
          var tk = isWW ? wpn.gearBase.slice(3) : wpn.gearBase;
          var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
          wpn.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[wpn.type].label;
        }
        recalcDerived(R);
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E Extract Gem (", extractCost, "g)"), canSalvage && /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '3px 0',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.3)',
        background: 'rgba(255,94,108,.12)',
        color: '#ff5e6c'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        /* Apply salvage returns */
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        var returnText = salvReturns.map(function (r) {
          return r.qty + '× ' + r.label;
        }).join(', ');
        /* Destroy the item */
        if (s.key === 'amulet') R.amulet = null;else if (s.key === 'shield') R.shield = null;else if (s.key === 'weapon') R.weapon = {
          type: 'greatsword',
          tier: 'common',
          tierMult: 1.0,
          element1: null,
          element2: null,
          name: 'Fists',
          isVolatile: false
        };else if (s.key === 'rangedWeapon') R.rangedWeapon = null;else if (s.key === 'staffWeapon') R.staffWeapon = null;
        recalcDerived(R);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Salvaged! ' + returnText,
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
        setTimeout(function () {
          return BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u267B\uFE0F Salvage \u2192 ", salvReturns.map(function (r) {
      return r.qty + '× ' + r.label;
    }).join(' + ')), !hasGem && !canSalvage && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "Cannot salvage (no crafting base)"));
  }), (rpgState.weaponStash || []).filter(function (w) {
    return w.gearBase;
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 3
    }
  }, "Stashed weapons:"), (rpgState.weaponStash || []).map(function (sw, si) {
    if (!sw.gearBase) return null;
    var hasGem = !!(sw.element1 || sw.element2);
    var salvReturns = !hasGem ? getSalvageReturns(sw) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3,
        padding: '3px 6px',
        borderRadius: 4,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#aaa'
      }
    }, sw.name), hasGem && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 6,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(167,139,250,.3)',
        background: 'rgba(167,139,250,.1)',
        color: '#a78bfa'
      },
      onClick: function onClick() {
        var _sw$gearBase;
        var R = stateRef.current.rpg;
        var cost = gemExtractCost(sw);
        if (R.coins < cost) return;
        R.coins -= cost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (sw.element1) {
          R.lifeSkills.gems['polished_' + sw.element1] = (R.lifeSkills.gems['polished_' + sw.element1] || 0) + 1;
        }
        if (sw.element2) {
          R.lifeSkills.gems['polished_' + sw.element2] = (R.lifeSkills.gems['polished_' + sw.element2] || 0) + 1;
        }
        sw.element1 = null;
        sw.element2 = null;
        sw.isVolatile = false;
        sw.tier = 'common';
        var isWW = (_sw$gearBase = sw.gearBase) === null || _sw$gearBase === void 0 ? void 0 : _sw$gearBase.startsWith('ww_');
        var tk = isWW ? sw.gearBase.slice(3) : sw.gearBase;
        var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
        sw.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[sw.type].label;
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\uD83D\uDC8E Extract (", gemExtractCost(sw), "g)"), salvReturns && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 6,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.3)',
        background: 'rgba(255,94,108,.1)',
        color: '#ff5e6c'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        R.weaponStash.splice(si, 1);
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Salvaged stash item',
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(200, 0.1, 0.12, 'sawtooth');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "\u267B\uFE0F Salvage"), !hasGem && !salvReturns && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, "No base"));
  }))));
}
