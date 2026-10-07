import React from 'react';
import { GemcutPanel } from './GemcutPanel.jsx';
import { EnchantPanel } from './EnchantPanel.jsx';

/* ═══ v2.3.3143: THE GEM WORKS -- CUTTING AND SETTING, ONE WINDOW ═══
 *
 * Owner, 2026-10-07, after the Assay Office's name came up ("what does that
 * even mean"): "I think one gem building is enough and can do both the gem
 * cutting and gem setting maybe with two different NPCs in the same building".
 * The Assay Office is gone from the town (plan.js); the Gem Cutter's building
 * is the Gem Works, and its door opens this: the two windows the town had,
 * under two tabs.
 *
 *   Cut gems   GemcutPanel     raw gems into polished, slottable ones
 *   Set gems   EnchantPanel    the polished gems into a weapon, shield or amulet
 *
 * NEITHER PANEL IS TOUCHED.  Each draws its own header strip and a root that
 * bleeds into the card's 20 px padding with `margin: -20` (the card's
 * load-bearing padding, game.css), so the body here is padded 20 px all round
 * to take that margin back: the panel then fills the body exactly, and a
 * panel's own rework (the enchanter's gem slots, the cutter's rates) cannot
 * collide with this file.  The tabs are the window's own `buildingPanel` --
 * 'gemcut' or 'enchant', as before -- so anything that opens either one still
 * does, on its own tab.
 *
 * When the rooms can be walked in, each tab is a counter with its own
 * keeper (the cutter, the setter) and this strip is the shortcut between
 * them.
 */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41',
  border: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)'
};
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
/* the padding is game.css's (.bt-gw-tabs): the card's ✕ lies over this strip's right end only
   when no room picture sits above it (a sideways phone drops the picture, and a picture that
   cannot be loaded takes its box with it), so only then does the strip keep clear of it */
var TABS_BAR = { display: 'flex', gap: 6, background: LS.strip, borderBottom: '1px solid ' + LS.border };

var TABS = [
  { key: 'gemcut', label: 'Cut gems', desc: 'Raw to polished' },
  { key: 'enchant', label: 'Set gems', desc: 'Polished into gear' }
];

export function GemWorksPanel(props) {
  var tab = props.tab === 'enchant' ? 'enchant' : 'gemcut';
  var inner = { rpgState: props.rpgState, stateRef: props.stateRef, setRpgState: props.setRpgState };
  return React.createElement("div", { style: LS_WRAP, "data-gem-works": tab },
    React.createElement("div", { role: 'tablist', className: 'bt-gw-tabs', style: TABS_BAR }, TABS.map(function (t) {
      var on = t.key === tab;
      return React.createElement("button", {
        key: t.key, type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false', 'data-gem-tab': t.key,
        onClick: function onClick() { if (!on && props.onTab) props.onTab(t.key); },
        style: {
          flex: 1, minWidth: 0, minHeight: 44, padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 13, fontWeight: 700, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          background: on ? LS.brassFill : LS.raised,
          border: '1px solid ' + (on ? LS.brass : LS.border),
          color: on ? LS.brass : LS.txt2
        }
      }, t.label, React.createElement("div", { style: { fontSize: 11, fontWeight: 400, color: LS.txt3, marginTop: 2 } }, t.desc));
    })),
    /* padded to take back the panel's own `margin: -20` (see the header);
       `.bt-gw-body > div` squares its corners (game.css) */
    React.createElement("div", { className: 'bt-gw-body', style: { padding: 20 } },
      tab === 'enchant' ? React.createElement(EnchantPanel, inner) : React.createElement(GemcutPanel, inner)));
}
