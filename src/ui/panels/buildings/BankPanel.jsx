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
/* v2.3.1235: batch-3 rollout — correction-pass token remap (game.css
   :root). The v2.3.1232 literals were the superseded v2.3.1227
   palette; same roles, approved values. Four depth roles only, so
   wellSoft folds into the well, and the off-token .08/.14 hairlines
   fold into the approved .11 line (.20 borderStrong added for
   secondary buttons). Header strip adopts the #27393F header token. */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23', wellSoft: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)', divider: 'rgba(229,237,233,.11)', wellBorder: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' }; /* v2.3.1235: batch-3 rollout — section headers are 11/700 .14em muted per the locked contract */
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
      style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, fontWeight: 600, textAlign: 'right', color: value === 'None' ? LS.dis : LS.txt1 }
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
      }, React.createElement("span", { style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, color: LS.txt2 } }, "Gold"),
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
