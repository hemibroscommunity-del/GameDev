import React from 'react';

/* ═══ v2.3.3142: THE LAND OFFICE'S WINDOW, A PANEL LIKE THE OTHERS ═══
 *
 * Standing at the Land Office's door and tapping Enter (v2.3.3032) opened
 * `buildingPanel === 'farmhome'`.  Its content was NOT in the building card
 * like every other panel's: BroTown.jsx drew it as a small dialog of its own,
 * a separate overlay at z-index 30, while the card every building opens (z 32,
 * the "bt-inspect" scrim and card) was drawn EMPTY above it.  Nobody noticed
 * because the empty card was a 42 px slab (its 20 px padding and nothing else)
 * across the middle of the dialog.  With the room's picture in the card it is
 * 239 px tall, and it covered "Travel to Farm" altogether -- mp-buildingrooms
 * caught it ("a finger on Travel to Farm reaches it").
 *
 * So it is a panel now, in the card, under the room, in the Lantern Slate of
 * the other twelve.  Its words are the dialog's, and so are its two buttons
 * ("Travel to Farm", "Cancel"); the trip itself is still BroTown's, handed in
 * as `onTravel` -- it warps the zone, which is the game's, not a panel's.
 */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)'
};
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var BTN = {
  width: '100%', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation'
};

export function LandOfficePanel(props) {
  var onTravel = props.onTravel, onCancel = props.onCancel;
  return React.createElement("div", { style: LS_WRAP, "data-land-office": "1" },
    React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }
    }, React.createElement("img", {
      src: '/icons/ui/bldg-farm.webp', alt: '', draggable: false,
      style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
      onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🏡')); }
    }), React.createElement("div", { style: { minWidth: 0 } },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, "Land Office"),
      React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, "Your own farm"))),
    React.createElement("div", { style: { padding: '12px 14px 14px' } },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, lineHeight: 1.5, marginBottom: 12 } },
        "Visit your personal farm to grow crops, rest in bed, and tend your homestead."),
      React.createElement("button", {
        type: 'button', onClick: onTravel,
        style: Object.assign({}, BTN, { minHeight: 48, marginBottom: 8, border: '1px solid ' + LS.brass, background: LS.brassFill, color: LS.brass, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' })
      }, "🚶 Travel to Farm"),
      React.createElement("button", {
        type: 'button', onClick: onCancel,
        style: Object.assign({}, BTN, { minHeight: 40, border: '1px solid ' + LS.borderStrong, background: 'transparent', color: LS.txt2, fontSize: 12 })
      }, "Cancel")));
}
