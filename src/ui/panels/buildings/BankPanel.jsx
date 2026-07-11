import React from 'react';

/* === BankPanel — buildingPanel === 'bank' sub-panel === */
/* v2.3.878: extracted verbatim from the buildingPanel === 'bank'
   clause in BroTown.jsx (the bank / equipped-gear summary view).
   Behavior-frozen UI decomposition; the gate stays in BroTown. 1 prop
   (rpgState) — read-only, no setters or data tables. 3 hoisted
   optional-chaining temps declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon, gold in a recessed well, equipment as
   a divided passive list. Style/JSX only; all data reads unchanged.
   The LS token block + header/gold builders are duplicated per
   building panel to keep the decomposed files dependency-free. */
var LS = {
  txt1: '#F7F2E7', txt2: '#B9C1BF', txt3: '#96A2A0', dis: '#687575',
  panel: '#202C32', strip: '#182227', raised: '#2B3940', well: '#121B20', wellSoft: '#19252A',
  border: 'rgba(238,242,235,.14)', divider: 'rgba(238,242,235,.10)', wellBorder: 'rgba(238,242,235,.08)',
  brass: '#D8A85F', brassFill: '#3B3427', onBrass: '#20170D'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: LS.txt3, margin: '0 0 6px' };
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }
  }, /* v2.3.1224 pattern: UI Bible icon with emoji fallback */
  React.createElement("img", {
    src: '/icons/ui/bldg-' + icon + '.webp', alt: '', draggable: false,
    style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  }), React.createElement("div", { style: { minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, title),
    subtitle ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, subtitle) : null));
}
function lsGold(amount, size) {
  return React.createElement("span", {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 }
  }, React.createElement("img", {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 16, height: 16, objectFit: 'contain' },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
  }), amount);
}
export function BankPanel(props) {
  var rpgState = props.rpgState;
  var _rpgState$armor, _rpgState$rangedWeapo, _rpgState$weapon;
  /* v2.3.1232: display-only string temps (identical optional chains to
     the pre-restyle inline expressions) so the 'None' state can dim. */
  var meleeName = ((_rpgState$weapon = rpgState.weapon) === null || _rpgState$weapon === void 0 ? void 0 : _rpgState$weapon.name) || 'None';
  var rangedName = ((_rpgState$rangedWeapo = rpgState.rangedWeapon) === null || _rpgState$rangedWeapo === void 0 ? void 0 : _rpgState$rangedWeapo.name) || 'None';
  var armorName = ((_rpgState$armor = rpgState.armor) === null || _rpgState$armor === void 0 ? void 0 : _rpgState$armor.name) || 'None';
  var gearRow = function gearRow(label, value, isLast) {
    return React.createElement("div", {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        minHeight: 44, padding: '0 12px',
        borderBottom: isLast ? 'none' : '1px solid ' + LS.divider
      }
    }, React.createElement("span", { style: { fontSize: 12, color: LS.txt3 } }, label),
    React.createElement("span", {
      style: { fontSize: 13.5, fontWeight: 600, textAlign: 'right', color: value === 'None' ? LS.dis : LS.txt1 }
    }, value));
  };
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('bank', '🏦', "Bank", "Vault & equipment"),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 12, lineHeight: 1.5 } },
        "Your gold and equipped items are always safe. The bank protects additional items from death scatter."),
      React.createElement("div", { style: LS_MOD }, "Gold on hand"),
      React.createElement("div", {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          minHeight: 44, padding: '8px 12px', borderRadius: 8,
          background: LS.wellSoft, border: '1px solid ' + LS.wellBorder, marginBottom: 4
        }
      }, React.createElement("span", { style: { fontSize: 13.5, color: LS.txt2 } }, "Gold"),
      lsGold(rpgState.coins, 18)),
      React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginBottom: 12 } },
        "Gold is never lost on death (only 10% penalty)"),
      React.createElement("div", { style: LS_MOD }, "Equipped"),
      React.createElement("div", {
        style: { borderRadius: 8, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder }
      }, gearRow('Melee', meleeName, false),
      gearRow('Ranged', rangedName, false),
      gearRow('Armor', armorName, true))));
}
