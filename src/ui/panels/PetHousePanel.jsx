import React from 'react';
import { BT_AUDIO, ELEMENTS, MAX_PET_SLOTS, PET_EVOLUTION_TIERS } from '@/data/index.js'; /* v2.3.3111: enchantPet, evolvePet retired */
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ PetHousePanel — pet slots ═══ */
/* ═══ v2.3.3111: THE OLD PET HOUSE, KEPT ONLY FOR AN OLD WORKER ═══
   Against a worker that keeps the pets record (caps.petbook) the farm's Pet
   House opens the Pets page instead (ui/mobile/dash/PetsPanel.jsx); this
   panel is the deploy-order fallback, reading the old lifeSkills.pets.
   EVOLVE AND ENCHANT ARE GONE: both changed only this phone's copy of a pet,
   which the worker's next update undid, and Enchant's 50 coins came off only
   on screen (docs/PET-TRAPPING-PLAN.md, "Let go"). */
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
  }, [['pets', 'Pets']].map(   /* v2.3.3111: Evolve and Enchant RETIRED -- see the header */
  function (_ref58) {
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
  }, "No pets yet. Target a monster out in the lands and tap TRAP, then kill it."), /*#__PURE__*/React.createElement("div", {
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
        fontSize: 11,
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
  }, "Tap to set active. Active pet follows and auto-loots."))));
}
