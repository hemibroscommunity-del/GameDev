import React from 'react';
import { BT_AUDIO, FURNITURE_RECIPES, addLifeSkillXp } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ FurniturePanel — furniture crafting workshop ═══ */
/* v2.3.862: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props; FURNITURE_RECIPES/addLifeSkillXp/BT_AUDIO + babel imported (real
   exports verified). `_R$lifeSkills2` / `_rpgState$lifeSkills0` babel temps
   were hoisted to BroTown's top-level var list; declared locally here
   (reassigned before each read, byte-equivalent). */
export function FurniturePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowFurniture = props.setShowFurniture;
  var _R$lifeSkills2, _rpgState$lifeSkills0;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowFurniture(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 320,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowFurniture(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8B6914',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83E\uDE91 Furniture Workshop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Woodworking Lv", ((_rpgState$lifeSkills0 = rpgState.lifeSkills) === null || _rpgState$lifeSkills0 === void 0 || (_rpgState$lifeSkills0 = _rpgState$lifeSkills0.woodworking) === null || _rpgState$lifeSkills0 === void 0 ? void 0 : _rpgState$lifeSkills0.level) || 1, " \xB7 Craft furniture for stat buffs"), function (_R$lifeSkills2) {
    var R = rpgState;
    var owned = R._furniture || {};
    var wcLvl = ((_R$lifeSkills2 = R.lifeSkills) === null || _R$lifeSkills2 === void 0 || (_R$lifeSkills2 = _R$lifeSkills2.woodworking) === null || _R$lifeSkills2 === void 0 ? void 0 : _R$lifeSkills2.level) || 1;
    var inv = R.inventory || {};
    /* Count total wood across all types */
    var totalWood = Object.entries(inv).filter(function (_ref64) {
      var _ref65 = _slicedToArray(_ref64, 1),
        k = _ref65[0];
      return k.includes('wood') || k.includes('lumber') || k.includes('bark') || k.includes('timber');
    }).reduce(function (s, _ref66) {
      var _ref67 = _slicedToArray(_ref66, 2),
        v = _ref67[1];
      return s + v;
    }, 0);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginBottom: 6
      }
    }, "\uD83E\uDEB5 Wood: ", totalWood, " \xB7 \uD83D\uDCB0 ", R.coins, "G \xB7 Placed: ", Object.keys(owned).length, "/", FURNITURE_RECIPES.length), FURNITURE_RECIPES.map(function (f) {
      var isOwned = owned[f.id];
      var canCraft = wcLvl >= f.wcLvl && totalWood >= f.woodCost && R.coins >= f.goldCost;
      return /*#__PURE__*/React.createElement("div", {
        key: f.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 3,
          background: isOwned ? 'rgba(89,191,145,.06)' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (isOwned ? 'rgba(89,191,145,.2)' : 'rgba(255,255,255,.06)'),
          opacity: !isOwned && wcLvl < f.wcLvl ? 0.4 : 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, f.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: isOwned ? '#59BF91' : '#fff'
        }
      }, f.name, " ", isOwned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, f.desc), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, "WC Lv", f.wcLvl, " \xB7 ", f.woodCost, " wood \xB7 ", f.goldCost, "G", f.statBuff && Object.entries(f.statBuff).map(function (_ref68) {
        var _ref69 = _slicedToArray(_ref68, 2),
          k = _ref69[0],
          v = _ref69[1];
        return /*#__PURE__*/React.createElement("span", {
          key: k,
          style: {
            color: '#D8A94D',
            marginLeft: 4
          }
        }, "+", typeof v === 'number' && v < 1 ? '-' + Math.round((1 - v) * 100) + '% cost' : typeof v === 'number' && v > 1 ? '+' + Math.round((v - 1) * 100) + '%' : v);
      }))), !isOwned && /*#__PURE__*/React.createElement("button", {
        disabled: !canCraft,
        onClick: function onClick() {
          var R2 = stateRef.current.rpg;
          if (!canCraft) return;
          R2.coins -= f.goldCost;
          /* Deduct wood — take from any wood type */
          var woodLeft = f.woodCost;
          Object.keys(R2.inventory || {}).forEach(function (k) {
            if (woodLeft <= 0) return;
            if (k.includes('wood') || k.includes('lumber') || k.includes('bark') || k.includes('timber')) {
              var take = Math.min(R2.inventory[k], woodLeft);
              R2.inventory[k] -= take;
              woodLeft -= take;
              if (R2.inventory[k] <= 0) delete R2.inventory[k];
            }
          });
          if (!R2._furniture) R2._furniture = {};
          R2._furniture[f.id] = {
            built: Date.now()
          };
          addLifeSkillXp(R2.lifeSkills, 'woodworking', f.wcLvl * 10);
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, f.icon + ' ' + f.name + ' crafted!', '#8B6914');
          BT_AUDIO.collect();
          setRpgState(_objectSpread({}, R2));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R2));
          } catch (_unused29) {}
        },
        style: {
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (canCraft ? 'rgba(139,105,20,.4)' : 'rgba(255,255,255,.06)'),
          background: canCraft ? 'rgba(139,105,20,.15)' : 'rgba(255,255,255,.02)',
          color: canCraft ? '#8B6914' : 'rgba(255,255,255,.15)',
          cursor: canCraft ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDD28 Craft"));
    }));
  }()));
}
