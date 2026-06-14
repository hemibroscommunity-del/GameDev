import React from 'react';

/* === BankPanel — buildingPanel === 'bank' sub-panel === */
/* v2.3.878: extracted verbatim from the buildingPanel === 'bank'
   clause in BroTown.jsx (the bank / equipped-gear summary view).
   Behavior-frozen UI decomposition; the gate stays in BroTown. 1 prop
   (rpgState) — read-only, no setters or data tables. 3 hoisted
   optional-chaining temps declared locally. */
export function BankPanel(props) {
  var rpgState = props.rpgState;
  var _rpgState$armor, _rpgState$rangedWeapo, _rpgState$weapon;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83C\uDFE6 Bank"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "Your gold and equipped items are always safe. The bank protects additional items from death scatter."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 10,
      background: 'rgba(245,197,66,.08)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 Gold: ", rpgState.coins), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Gold is never lost on death (only 10% penalty)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 10,
      background: 'rgba(91,82,255,.08)',
      border: '1px solid rgba(91,82,255,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDDE1\uFE0F Equipment"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.5)',
      lineHeight: 1.5
    }
  }, "Melee: ", ((_rpgState$weapon = rpgState.weapon) === null || _rpgState$weapon === void 0 ? void 0 : _rpgState$weapon.name) || 'None', /*#__PURE__*/React.createElement("br", null), "Ranged: ", ((_rpgState$rangedWeapo = rpgState.rangedWeapon) === null || _rpgState$rangedWeapo === void 0 ? void 0 : _rpgState$rangedWeapo.name) || 'None', /*#__PURE__*/React.createElement("br", null), "Armor: ", ((_rpgState$armor = rpgState.armor) === null || _rpgState$armor === void 0 ? void 0 : _rpgState$armor.name) || 'None')));
}
