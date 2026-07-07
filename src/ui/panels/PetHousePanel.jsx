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
    style: {
      width: 340,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowPetHouse(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#ea580c',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDC3E Pet House"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, (((_rpgState$lifeSkills3 = rpgState.lifeSkills) === null || _rpgState$lifeSkills3 === void 0 ? void 0 : _rpgState$lifeSkills3.pets) || []).length, "/", MAX_PET_SLOTS, " pets \xB7 Trapping Lv", ((_rpgState$lifeSkills4 = rpgState.lifeSkills) === null || _rpgState$lifeSkills4 === void 0 || (_rpgState$lifeSkills4 = _rpgState$lifeSkills4.trapping) === null || _rpgState$lifeSkills4 === void 0 ? void 0 : _rpgState$lifeSkills4.level) || 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['pets', '🐾 Pets'], ['evolve', '🧬 Evolve'], ['enchant', '✨ Enchant']].map(function (_ref58) {
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
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: petHouseTab === id ? 'rgba(234,88,12,.2)' : 'rgba(255,255,255,.03)',
        color: petHouseTab === id ? '#ea580c' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
      }
    }, label);
  })), petHouseTab === 'pets' && /*#__PURE__*/React.createElement("div", null, (((_rpgState$lifeSkills5 = rpgState.lifeSkills) === null || _rpgState$lifeSkills5 === void 0 ? void 0 : _rpgState$lifeSkills5.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.2)',
      fontStyle: 'italic',
      padding: 8,
      textAlign: 'center'
    }
  }, "No pets yet. Weaken monsters to <20% HP and tap \uD83E\uDEA4!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 4
    }
  }, (((_rpgState$lifeSkills6 = rpgState.lifeSkills) === null || _rpgState$lifeSkills6 === void 0 ? void 0 : _rpgState$lifeSkills6.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills7, _ELEMENTS$pet$element;
    var isActive = ((_rpgState$lifeSkills7 = rpgState.lifeSkills) === null || _rpgState$lifeSkills7 === void 0 ? void 0 : _rpgState$lifeSkills7.activePet) === pi;
    var tier = PET_EVOLUTION_TIERS[pet.evolutionTier || 0];
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 8,
        borderRadius: 8,
        textAlign: 'center',
        background: isActive ? 'rgba(245,197,66,.1)' : 'rgba(255,255,255,.03)',
        border: '1.5px solid ' + (isActive ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.08)'),
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
        fontSize: 22
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: (_ELEMENTS$pet$element = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element === void 0 ? void 0 : _ELEMENTS$pet$element.color
      }
    }, pet.element), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: pet.evolutionTier >= 2 ? '#f5c542' : pet.evolutionTier >= 1 ? '#a855f7' : 'rgba(255,255,255,.25)'
      }
    }, tier), pet._enchants && pet._enchants.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        display: 'flex',
        gap: 2,
        justifyContent: 'center',
        marginTop: 2
      }
    }, pet._enchants.map(function (e, i) {
      var _ELEMENTS$e$element;
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          width: 6,
          height: 6,
          borderRadius: 3,
          background: ((_ELEMENTS$e$element = ELEMENTS[e.element]) === null || _ELEMENTS$e$element === void 0 ? void 0 : _ELEMENTS$e$element.color) || '#888',
          display: 'inline-block'
        }
      });
    })), pet.combatPower && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)'
      }
    }, "\u2694\uFE0F", pet.combatPower), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 800,
        color: '#f5c542',
        marginTop: 2
      }
    }, "ACTIVE"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.2)',
      marginTop: 6
    }
  }, "Tap to set active. Active pet follows and auto-loots.")), petHouseTab === 'evolve' && function (_rpgState$lifeSkills8) {
    var pets = ((_rpgState$lifeSkills8 = rpgState.lifeSkills) === null || _rpgState$lifeSkills8 === void 0 ? void 0 : _rpgState$lifeSkills8.pets) || [];
    var canEvolve = petEvolve1 !== null && petEvolve2 !== null && petEvolve1 !== petEvolve2 && pets[petEvolve1] && pets[petEvolve2];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 6
      }
    }, "Select two pets to merge. Both are consumed. The evolved pet inherits the best traits."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Pet 1"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve1(petEvolve1 === i ? null : i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          border: '1.5px solid ' + (petEvolve1 === i ? '#ea580c' : 'rgba(255,255,255,.08)'),
          background: petEvolve1 === i ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
          color: petEvolve1 === i ? '#fff' : p.color,
          cursor: 'pointer',
          opacity: petEvolve2 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Pet 2"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, pets.map(function (p, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: function onClick() {
          return setPetEvolve2(petEvolve2 === i ? null : i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          border: '1.5px solid ' + (petEvolve2 === i ? '#ea580c' : 'rgba(255,255,255,.08)'),
          background: petEvolve2 === i ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
          color: petEvolve2 === i ? '#fff' : p.color,
          cursor: 'pointer',
          opacity: petEvolve1 === i ? 0.3 : 1
        }
      }, p.emoji, " ", p.name);
    })))), canEvolve && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 6,
        background: 'rgba(234,88,12,.08)',
        border: '1px solid rgba(234,88,12,.2)',
        marginBottom: 6,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#ea580c',
        marginBottom: 2
      }
    }, "\uD83E\uDDEC Evolution Preview"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#fff'
      }
    }, pets[petEvolve1].emoji, " ", pets[petEvolve1].name, " + ", pets[petEvolve2].emoji, " ", pets[petEvolve2].name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginTop: 2
      }
    }, "\u2192 ", PET_EVOLUTION_TIERS[Math.min((pets[petEvolve1].evolutionTier || 0) + 1, 3)], " form \xB7 Lv", Math.max(pets[petEvolve1].level, pets[petEvolve2].level) + 2)), /*#__PURE__*/React.createElement("button", {
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
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 800,
        border: '1.5px solid ' + (canEvolve ? 'rgba(234,88,12,.4)' : 'rgba(255,255,255,.06)'),
        background: canEvolve ? 'rgba(234,88,12,.15)' : 'rgba(255,255,255,.02)',
        color: canEvolve ? '#ea580c' : 'rgba(255,255,255,.15)',
        cursor: canEvolve ? 'pointer' : 'not-allowed'
      }
    }, "\uD83E\uDDEC Evolve Pets"));
  }(), petHouseTab === 'enchant' && function (_rpgState$lifeSkills9) {
    var pets = ((_rpgState$lifeSkills9 = rpgState.lifeSkills) === null || _rpgState$lifeSkills9 === void 0 ? void 0 : _rpgState$lifeSkills9.pets) || [];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.35)',
        marginBottom: 6
      }
    }, "Slot elements onto pets for elemental attacks. Evolved pets have more slots."), pets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No pets to enchant"), pets.map(function (pet, pi) {
      var maxSlots = pet.enchantSlots || 1;
      var usedSlots = (pet._enchants || []).length;
      var canEnchant = usedSlots < maxSlots;
      return /*#__PURE__*/React.createElement("div", {
        key: pet.id,
        style: {
          padding: 8,
          borderRadius: 6,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 4
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
      }, pet.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: pet.color
        }
      }, pet.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Slots: ", usedSlots, "/", maxSlots, " \xB7 ", PET_EVOLUTION_TIERS[pet.evolutionTier || 0]))), (pet._enchants || []).length > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 2,
          marginBottom: 4
        }
      }, pet._enchants.map(function (e, i) {
        var _ELEMENTS$e$element2, _ELEMENTS$e$element3, _ELEMENTS$e$element4;
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            padding: '2px 5px',
            borderRadius: 3,
            fontSize: 7,
            fontWeight: 700,
            background: ((_ELEMENTS$e$element2 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element2 === void 0 ? void 0 : _ELEMENTS$e$element2.color) + '20',
            border: '1px solid ' + ((_ELEMENTS$e$element3 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element3 === void 0 ? void 0 : _ELEMENTS$e$element3.color) + '40',
            color: (_ELEMENTS$e$element4 = ELEMENTS[e.element]) === null || _ELEMENTS$e$element4 === void 0 ? void 0 : _ELEMENTS$e$element4.color
          }
        }, e.element, " \u2694\uFE0F", e.power);
      })), canEnchant && /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2
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
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need 50G!', '#ff5e6c');
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
            padding: '2px 5px',
            borderRadius: 3,
            fontSize: 7,
            fontWeight: 700,
            border: '1px solid ' + el.color + '40',
            background: el.color + '10',
            color: el.color,
            cursor: 'pointer'
          }
        }, key, " (50G)");
      })));
    }));
  }()));
}
