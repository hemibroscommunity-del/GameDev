import React from 'react';
import { padArtUrl } from './controlSkin.jsx';

/* ═══ v2.3.6640: THE CONTROLLER'S TWO HOUSINGS (card PAD; `?padskin=0` none) ═══
 * The owner's mockup of 2026-11-25: two grips docked to the top edge of the
 * dashboard band, the middle open so the world shows.  Pictures only: a
 * housing's plate takes no touch (pointer-events none), so a tap that
 * reached the world before still does, and the controls that sit in its
 * sockets are their own elements above it (game/padSkin.js lays both out).
 *   LEFT   the stick's housing (pad-art-01's piece, its socket a hole), a
 *          dark well behind the hole and the stick's gold ring over it: the
 *          EMPTY SOCKET while the stick is hidden (controlVisibility.js: it
 *          shows while a thumb walks), the arrow disc and the knob drawn over
 *          it by the stick itself (TouchControls) when it shows;
 *   RIGHT  the buttons' housing (pad-art-04), its five sockets its own gold
 *          rings and wells: a control the game hides leaves its socket empty.
 * They ride the band as the controls do (--sheet-h over --dash-h), are hidden
 * on a computer as every touch control is (bt-desktop-hide), and step aside
 * with the controls while the sideways band is open (game.css
 * html.bt-band-side-open, [data-padhousing]).  Drawn once a layout: nothing
 * here moves per frame.
 * html.bt-padskin while mounted: game.css undoes the sideways band's nudges
 * of the attack disc and the stick, which were for their old places.
 */
export function PadHousings(props) {
  var L = props.layout;
  React.useEffect(function () {
    var el = typeof document !== 'undefined' ? document.documentElement : null;
    if (el) el.classList.add('bt-padskin');
    return function () { if (el) el.classList.remove('bt-padskin'); };
  }, []);
  if (!L) return null;
  /* QA's probe (mp-padskin): the layout these housings were drawn from */
  if (typeof window !== 'undefined') window.__btPad = { layout: L };
  var bottom = 'var(--sheet-h, var(--dash-h))';
  var st = L.stick;
  var plate = function (h) {
    var s = { position: 'fixed', bottom: bottom, width: h.w, height: h.h, zIndex: 7, pointerEvents: 'none' };
    s[h.side] = 0;
    return s;
  };
  var img = function (name, w, h, extra) {
    return React.createElement('img', {
      src: padArtUrl(name), alt: '', draggable: false, width: w, height: h, 'data-pic': name,
      style: Object.assign({ position: 'absolute', display: 'block', width: w, height: h, pointerEvents: 'none' }, extra || null),
    });
  };
  /* a mirrored controller draws each housing flipped (padSkin.js: its shares
     hold from its own side) */
  var right = React.createElement('div', {
    key: 'R', className: 'bt-desktop-hide', 'data-padhousing': 'R', 'aria-hidden': 'true', style: plate(L.right),
  }, img('housing-r', L.right.w, L.right.h, { left: 0, top: 0, transform: L.right.side === 'left' ? 'scaleX(-1)' : undefined }));
  var ringAt = { left: st.side === 'left' ? st.x - st.d / 2 : L.left.w - st.x - st.d / 2, bottom: st.y - st.d / 2 };
  var left = React.createElement('div', {
    key: 'L', className: 'bt-desktop-hide', 'data-padhousing': 'L', 'aria-hidden': 'true', style: plate(L.left),
  },
  /* the well behind the hole: the empty socket's dark */
  React.createElement('span', { className: 'bt-pad-well', style: {
    position: 'absolute', left: ringAt.left + (st.d - st.hole) / 2 - 1, bottom: ringAt.bottom + (st.d - st.hole) / 2 - 1,
    width: st.hole + 2, height: st.hole + 2, borderRadius: '50%', pointerEvents: 'none',
  } }),
  img('housing-l', L.left.w, L.left.h, { left: 0, top: 0, transform: L.left.side === 'right' ? 'scaleX(-1)' : undefined }),
  img('ring', st.d, st.d, { left: ringAt.left, bottom: ringAt.bottom }));
  return React.createElement(React.Fragment, null, left, right);
}
