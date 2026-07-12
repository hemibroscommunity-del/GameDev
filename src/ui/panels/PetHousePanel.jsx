import React from 'react';
import { BT_AUDIO, ELEMENTS, MAX_PET_SLOTS, PET_EVOLUTION_TIERS, enchantPet, evolvePet } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ PetHousePanel — pet slots, evolve, enchant ═══ */
/* v2.3.861: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 10
   props; ELEMENTS/MAX_PET_SLOTS/PET_EVOLUTION_TIERS/enchantPet/evolvePet/
   BT_AUDIO + babel helpers imported (all verified real exports). The
   `_rpgState$lifeSkills{3,4,5,6,8,9}` babel optional-chaining temps were
   hoisted to BroTown's top-level var list (not declared in the panel);
   declared locally here (reassigned before each read, byte-equivalent). */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: activate/evolve/enchant handlers, index math and
   localStorage writes are unchanged. Segmented 36px tabs, raised
   actionable pet cards with brass-fill active state, #121B20 preview
   well, one brass Evolve primary; the old orange (#ea580c) accent is
   retired (brass = selection, semantic colors elsewhere). Pet/element
   colors stay — they are content color. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
var LS_CARD = {
  background: '#202C32',
  border: '1px solid rgba(238,242,235,.14)',
  borderRadius: 14,
  boxShadow: '0 14px 30px rgba(4,7,9,.38)'
};
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#96A2A0'
};
var LS_WELL = {
  background: '#121B20',
  borderRadius: 10,
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
};
var LS_DIVIDER = '1px solid rgba(238,242,235,.10)';
/* v2.3.1232: UI-Bible icon with emoji fallback (onError replaceWith
   pattern from src/ui/mobile/dash/SkillsPanel.jsx) */
var lsIcon = function lsIcon(src, emoji, size) {
  return React.createElement('img', {
    src: src,
    alt: '',
    draggable: false,
    style: { width: size || 18, height: size || 18, objectFit: 'contain', flex: 'none' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  });
};

export function PetHousePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    petHouseTab = props.petHouseTab,
    setPetHouseTab = props.setPetHouseTab,
    petEvolve1 = props.petEvolve1,
    setPetEvolve1 = props.setPetEvolve1,
    petEvolve2 = props.petEvolve2,
    setPetEvolve2 = props.setPetEvolve2,
    setRpgState = props.setRpgState,
    setShowPetHouse = props.setShowPetHouse;
  var _rpgState$lifeSkills3, _rpgState$lifeSkills4, _rpgState$lifeSkills5, _rpgState$lifeSkills6, _rpgState$lifeSkills8, _rpgState$lifeSkills9;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowPetHouse(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: Object.assign({}, LS_CARD, {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 340 fixed — fill narrow phones, never overflow */
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowPetHouse(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      minHeight: 24
    }
  }, lsIcon('/icons/ui/evt-pets.webp?v=2.3.1232', '🐾', 20), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Pet House")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#96A2A0',
      marginBottom: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, (((_rpgState$lifeSkills3 = rpgState.lifeSkills) === null || _rpgState$lifeSkills3 === void 0 ? void 0 : _rpgState$lifeSkills3.pets) || []).length, "/", MAX_PET_SLOTS, " pets \xB7 Trapping Lv", ((_rpgState$lifeSkills4 = rpgState.lifeSkills) === null || _rpgState$lifeSkills4 === void 0 || (_rpgState$lifeSkills4 = _rpgState$lifeSkills4.trapping) === null || _rpgState$lifeSkills4 === void 0 ? void 0 : _rpgState$lifeSkills4.level) || 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 14,
      borderRadius: 10,
      padding: 3,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)'
    }
  }, [['pets', 'Pets'], ['evolve', 'Evolve'], ['enchant', 'Enchant']].map(function (_ref58) {
    var _ref59 = _slicedToArray(_ref58, 2),
      id = _ref59[0],
      label = _ref59[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setPetHouseTab(id);
      },
      style: {
        flex: 1,
        height: 36,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: petHouseTab === id ? '#2B3940' : 'transparent',
        boxShadow: petHouseTab === id ? 'inset 0 -2px 0 #D8A85F' : 'none',
        color: petHouseTab === id ? '#F7F2E7' : '#96A2A0',
        fontFamily: 'inherit',
        transition: 'all 140ms cubic-bezier(.2,.8,.2,1)'
      }
    }, label);
  })), petHouseTab === 'pets' && /*#__PURE__*/React.createElement("div", null, (((_rpgState$lifeSkills5 = rpgState.lifeSkills) === null || _rpgState$lifeSkills5 === void 0 ? void 0 : _rpgState$lifeSkills5.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_WELL, {
      fontSize: 12,
      color: '#96A2A0',
      padding: '18px 10px',
      textAlign: 'center',
      lineHeight: 1.4
    })
  }, "No pets yet. Weaken monsters to <20% HP and tap 🪤!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 6
    }
  }, (((_rpgState$lifeSkills6 = rpgState.lifeSkills) === null || _rpgState$lifeSkills6 === void 0 ? void 0 : _rpgState$lifeSkills6.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills7, _ELEMENTS$pet$element;
    var isActive = ((_rpgState$lifeSkills7 = rpgState.lifeSkills) === null || _rpgState$lifeSkills7 === void 0 ? void 0 : _rpgState$lifeSkills7.activePet) === pi;
    var tier = PET_EVOLUTION_TIERS[pet.evolutionTier || 0];
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 10,
        borderRadius: 10,
        textAlign: 'center',
        minHeight: 44,
        background: isActive ? '#3B3427' : 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
        border: '1px solid ' + (isActive ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(5,8,10,.18)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        R.lifeSkills.activePet = isActive ? null : pi;
        stateRef.current._petX = null;
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused26) {}
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0',
        fontVariantNumeric: 'tabular-nums'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: (_ELEMENTS$pet$element = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element === void 0 ? void 0 : _ELEMENTS$pet$element.color
      }
    }, pet.element), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: pet.evolutionTier >= 2 ? '#D8A94D' : pet.evolutionTier >= 1 ? '#9A76D3' : '#96A2A0'
      }
    }, tier), pet._enchants && pet._enchants.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        display: 'flex',
        gap: 3,
        justifyContent: 'center',
        marginTop: 3
      }
    }, pet._enchants.map(function (e, i) {
      var _ELEMENTS$e$element;
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          width: 7,
          height: 7,
          borderRadius: 4,
          background: ((_ELEMENTS$e$element = ELEMENTS[e.element]) === null || _ELEMENTS$e$element === void 0 ? void 0 : _ELEMENTS$e$element.color) || '#96A2A0',
          display: 'inline-block'
        }
      });
    })), pet.combatPower && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0',
        fontVariantNumeric: 'tabular-nums'
      }
    }, "⚔️", pet.combatPower), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.12em',
        color: '#D8A85F',
        marginTop: 4
      }
    }, "ACTIVE"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginTop: 8,
      lineHeight: 1.4
    }
  }, "Tap to set active. Active pet follows and auto-loots.")), petHouseTab === 'evolve' && function (_rpgState$lifeSkills8) {
    var pets = ((_rpgState$lifeSkills8 = rpgState.lifeSkills) === null || _rpgState$lifeSkills8 === void 0 ? void 0 : _rpgState$lifeSkills8.pets) || [];
    var canEvolve = petEvolve1 !== null && petEvolve2 !== null && petEvolve1 !== petEvolve2 && pets[petEvolve1] && pets[petEvolve2];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#96A2A0',
        marginBottom: 10,
        lineHeight: 1.4
      }
    }, "Select two pets to merge. Both are consumed. The evolved pet inherits the best traits."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        fontSize: 10,
        marginBottom: 4
      })
    }, "Pet 1"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve1(petEvolve1 === i ? null : i);
        },
        style: {
          minHeight: 32,
          boxSizing: 'border-box',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid ' + (petEvolve1 === i ? '#D8A85F' : 'rgba(238,242,235,.08)'),
          background: petEvolve1 === i ? '#3B3427' : 'transparent',
          color: petEvolve1 === i ? '#D8A85F' : p.color,
          cursor: 'pointer',
          opacity: petEvolve2 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        fontSize: 10,
        marginBottom: 4
      })
    }, "Pet 2"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve2(petEvolve2 === i ? null : i);
        },
        style: {
          minHeight: 32,
          boxSizing: 'border-box',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid ' + (petEvolve2 === i ? '#D8A85F' : 'rgba(238,242,235,.08)'),
          background: petEvolve2 === i ? '#3B3427' : 'transparent',
          color: petEvolve2 === i ? '#D8A85F' : p.color,
          cursor: 'pointer',
          opacity: petEvolve1 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    })))), canEvolve && /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        padding: 10,
        marginBottom: 10,
        textAlign: 'center'
      })
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        fontSize: 10,
        marginBottom: 4
      })
    }, "🧬 Evolution Preview"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: '#F7F2E7'
      }
    }, pets[petEvolve1].emoji, " ", pets[petEvolve1].name, " + ", pets[petEvolve2].emoji, " ", pets[petEvolve2].name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#B9C1BF',
        marginTop: 3,
        fontVariantNumeric: 'tabular-nums'
      }
    }, "→ ", PET_EVOLUTION_TIERS[Math.min((pets[petEvolve1].evolutionTier || 0) + 1, 3)], " form \xB7 Lv", Math.max(pets[petEvolve1].level, pets[petEvolve2].level) + 2)), /*#__PURE__*/React.createElement("button", {
      disabled: !canEvolve,
      onClick: function onClick() {
        if (!canEvolve) return;
        var R = stateRef.current.rpg;
        var p1 = R.lifeSkills.pets[petEvolve1],
          p2 = R.lifeSkills.pets[petEvolve2];
        var evolved = evolvePet(p1, p2);
        /* Remove both pets (higher index first to avoid shifting) */
        var idxs = [petEvolve1, petEvolve2].sort(function (a, b) {
          return b - a;
        });
        idxs.forEach(function (i) {
          return R.lifeSkills.pets.splice(i, 1);
        });
        R.lifeSkills.pets.push(evolved);
        if (R.lifeSkills.activePet === petEvolve1 || R.lifeSkills.activePet === petEvolve2) {
          R.lifeSkills.activePet = R.lifeSkills.pets.length - 1;
        } else if (R.lifeSkills.activePet !== null) {
          /* Count how many removed pets had lower index than activePet */
          var removedBefore = [petEvolve1, petEvolve2].filter(function (i) {
            return i < R.lifeSkills.activePet;
          }).length;
          R.lifeSkills.activePet = Math.max(0, R.lifeSkills.activePet - removedBefore);
        }
        setPetEvolve1(null);
        setPetEvolve2(null);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 40, evolved.name + ' evolved!', '#ea580c');
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused27) {}
      },
      style: {
        width: '100%',
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        background: canEvolve ? '#D8A85F' : '#2B3940',
        color: canEvolve ? '#20170D' : '#687575',
        cursor: canEvolve ? 'pointer' : 'not-allowed'
      }
    }, "🧬 Evolve Pets"));
  }(), petHouseTab === 'enchant' && function (_rpgState$lifeSkills9) {
    var pets = ((_rpgState$lifeSkills9 = rpgState.lifeSkills) === null || _rpgState$lifeSkills9 === void 0 ? void 0 : _rpgState$lifeSkills9.pets) || [];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#96A2A0',
        marginBottom: 10,
        lineHeight: 1.4
      }
    }, "Slot elements onto pets for elemental attacks. Evolved pets have more slots."), pets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        fontSize: 12,
        color: '#96A2A0',
        padding: '18px 10px',
        textAlign: 'center',
        lineHeight: 1.4
      })
    }, "No pets to enchant"), pets.map(function (pet, pi) {
      var maxSlots = pet.enchantSlots || 1;
      var usedSlots = (pet._enchants || []).length;
      var canEnchant = usedSlots < maxSlots;
      return /*#__PURE__*/React.createElement("div", {
        key: pet.id,
        style: {
          padding: '10px 0',
          borderBottom: LS_DIVIDER
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 28,
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, pet.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: pet.color
        }
      }, pet.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#96A2A0',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "Slots: ", usedSlots, "/", maxSlots, " \xB7 ", PET_EVOLUTION_TIERS[pet.evolutionTier || 0]))), (pet._enchants || []).length > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 4,
          marginBottom: 6,
          flexWrap: 'wrap'
        }
      }, pet._enchants.map(function (e, i) {
        var _ELEMENTS$e$element2, _ELEMENTS$e$element3, _ELEMENTS$e$element4;
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            background: ((_ELEMENTS$e$element2 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element2 === void 0 ? void 0 : _ELEMENTS$e$element2.color) + '20',
            border: '1px solid ' + ((_ELEMENTS$e$element3 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element3 === void 0 ? void 0 : _ELEMENTS$e$element3.color) + '40',
            color: (_ELEMENTS$e$element4 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element4 === void 0 ? void 0 : _ELEMENTS$e$element4.color
          }
        }, e.element, " ⚔️", e.power);
      })), canEnchant && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4
        }
      }, Object.entries(ELEMENTS).filter(function (_ref60) {
        var _ref61 = _slicedToArray(_ref60, 2),
          k = _ref61[0],
          e = _ref61[1];
        return e.type !== 'endgame';
      }).map(function (_ref62) {
        var _ref63 = _slicedToArray(_ref62, 2),
          key = _ref63[0],
          el = _ref63[1];
        return /*#__PURE__*/React.createElement("button", {
          key: key,
          onClick: function onClick() {
            var R = stateRef.current.rpg;
            var p = R.lifeSkills.pets[pi];
            if (!p) return;
            if (R.coins < 50) {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need 50G!', '#D95C54');
              return;
            }
            R.coins -= 50;
            enchantPet(p, key);
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, key + ' enchanted!', el.color);
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (_unused28) {}
          },
          style: {
            minHeight: 32,
            boxSizing: 'border-box',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            border: '1px solid ' + el.color + '40',
            background: '#19252A',
            color: el.color,
            cursor: 'pointer'
          }
        }, /* v2.3.1232: elem-*.webp icon; the '●' fallback inherits the
             chip's element color */
        lsIcon('/icons/ui/elem-' + key + '.webp?v=2.3.1232', '●', 13), key, " (50G)");
      })));
    }));
  }()));
}
