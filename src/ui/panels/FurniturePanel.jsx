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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface, well-soft recipe rows, gold-icon coin readout,
   brass craft action (44pt), off-palette #8B6914 brown → spec tokens.
   Styles + static JSX only; the craft handler (wood deduction, XP,
   localStorage persist) is unchanged. */
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
      /* v2.3.1232: floating world card */
      width: 320,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left',
      background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
      border: '1px solid rgba(238,242,235,.24)',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowFurniture(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#F7F2E7',
      marginBottom: 2,
      textAlign: 'left'
    }
  }, "🪑 Furniture Workshop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      textAlign: 'left',
      marginBottom: 8
    }
  }, "Woodworking Lv", ((_rpgState$lifeSkills0 = rpgState.lifeSkills) === null || _rpgState$lifeSkills0 === void 0 || (_rpgState$lifeSkills0 = _rpgState$lifeSkills0.woodworking) === null || _rpgState$lifeSkills0 === void 0 ? void 0 : _rpgState$lifeSkills0.level) || 1, " · Craft furniture for stat buffs"), function (_R$lifeSkills2) {
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
        /* v2.3.1232: resource readout — gold icon + tabular values */
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: '#B9C1BF',
        fontVariantNumeric: 'tabular-nums',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", null, "🪵 Wood: ", totalWood), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 14,
        fontWeight: 700,
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
        e.currentTarget.replaceWith(document.createTextNode('💰'));
      }
    }), R.coins), /*#__PURE__*/React.createElement("span", null, "Placed: ", Object.keys(owned).length, "/", FURNITURE_RECIPES.length)), FURNITURE_RECIPES.map(function (f) {
      var isOwned = owned[f.id];
      var canCraft = wcLvl >= f.wcLvl && totalWood >= f.woodCost && R.coins >= f.goldCost;
      return /*#__PURE__*/React.createElement("div", {
        key: f.id,
        style: {
          /* v2.3.1232: well-soft row cell */
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 8,
          marginBottom: 3,
          background: isOwned ? 'rgba(89,191,145,.08)' : '#19252A',
          border: '1px solid ' + (isOwned ? 'rgba(89,191,145,.25)' : 'rgba(238,242,235,.08)'),
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
          fontSize: 12,
          fontWeight: 700,
          color: isOwned ? '#59BF91' : '#F7F2E7'
        }
      }, f.name, " ", isOwned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: '#96A2A0'
        }
      }, f.desc), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: '#96A2A0',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "WC Lv", f.wcLvl, " · ", f.woodCost, " wood · ", f.goldCost, "G", f.statBuff && Object.entries(f.statBuff).map(function (_ref68) {
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
          /* v2.3.1232: brass confirm when craftable; quiet disabled state */
          padding: '4px 10px',
          minHeight: 44,
          borderRadius: 11,
          fontSize: 12,
          fontWeight: 700,
          border: canCraft ? 'none' : '1px solid rgba(238,242,235,.08)',
          background: canCraft ? '#D8A85F' : '#19252A',
          color: canCraft ? '#20170D' : '#687575',
          cursor: canCraft ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap'
        }
      }, "Craft"));
    }));
  }()));
}
