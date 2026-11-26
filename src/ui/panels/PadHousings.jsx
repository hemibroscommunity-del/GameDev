import React from 'react';
import { padArtUrl } from './controlSkin.jsx';
import { PAD_ART } from '@/data/padArt.js';
import { PAD, REF } from '@/game/padSkin.js';

/* ═══ v2.3.6641: THE CONTROLLER'S ONE SHELL (card PAD part 3; `?padskin=0` none) ═══
 * The owner, 2026-11-25: "The controller is too large and doesn't connect in
 * a seamless way to the dashboard. The shape also doesn't make much sense."
 * Part 1's two grips are gone: ONE housing (public/ui/pad/housing.png) spans
 * the play column, its bottom edge ON the band's top edge (the controls'
 * own --sheet-h over --dash-h, so it rides the band open or folded), drawn
 * as THREE CUTS of the one picture by CSS border-image: the stick's lobe and
 * the right lobe at their own shape, the rail between them stretched, so
 * any width keeps the gold outline whole and nothing is squeezed.
 * Pictures only: the shell takes no touch (pointer-events none), so a tap on
 * its empty space reaches the world as before; every control is its own
 * element above it, in its well (game/padSkin.js padLayout).  Drawn here:
 *   the EMPTY WELL (action_socket) under each right-lobe well, seen when the
 *          game hides that control right now (a face covers it otherwise);
 *   the STICK's base, always, and its thumb at the middle at rest: while a
 *          thumb walks, the stick itself (TouchControls) draws over them in
 *          the same place and moves its thumb as today.
 * Hidden on a computer as every touch control is (bt-desktop-hide), and
 * stepped aside with the controls while the sideways band is open (game.css
 * html.bt-band-side-open, [data-padhousing]).  Drawn once a layout: nothing
 * here moves per frame.  html.bt-padskin while mounted: game.css undoes the
 * sideways band's nudges of the attack disc and the stick.
 */
export function PadHousings(props) {
  var L = props.layout;
  React.useEffect(function () {
    var el = typeof document !== 'undefined' ? document.documentElement : null;
    if (el) el.classList.add('bt-padskin');
    return function () { if (el) el.classList.remove('bt-padskin'); };
  }, []);
  if (!L) return null;
  /* QA's probe (mp-padskin): the layout this shell was drawn from */
  if (typeof window !== 'undefined') window.__btPad = { layout: L };
  var H = PAD_ART.housing;
  var k = H.w / REF.W;   /* the picture's px a reference px */
  var cutL = Math.round(PAD.CUT_L * k), cutR = Math.round(PAD.CUT_R * k);
  var sh = L.shell;
  var pic = function (name, w, extra) {
    var d = Math.round(w.d);
    return React.createElement('img', {
      key: name + (extra || ''), src: padArtUrl(name), alt: '', draggable: false, width: d, height: d, 'data-pic': name,
      'data-well-pic': extra || undefined,
      style: { position: 'absolute', display: 'block', width: d, height: d, left: Math.round(w.x - d / 2), bottom: Math.round(w.y - d / 2), pointerEvents: 'none' },
    });
  };
  var W = L.wells;
  var thumb = { x: W.stick.x, y: W.stick.y, d: L.thumb };
  return React.createElement('div', {
    className: 'bt-desktop-hide bt-pad-shell', 'data-padhousing': 'shell', 'aria-hidden': 'true',
    style: {
      position: 'fixed', left: 0, bottom: 'var(--sheet-h, var(--dash-h))', width: sh.w, height: sh.h, zIndex: 7, pointerEvents: 'none',
      boxSizing: 'border-box', borderStyle: 'solid', borderColor: 'transparent',
      borderWidth: '0 ' + sh.cutR + 'px 0 ' + sh.cutL + 'px',
      borderImage: 'url(' + padArtUrl('housing') + ') 0 ' + cutR + ' 0 ' + cutL + ' fill / 0 ' + sh.cutR + 'px 0 ' + sh.cutL + 'px stretch',
    },
  },
  /* the wells are placed from the column's left; the border box's content
     starts after the left cut, so they sit in a layer over the whole shell */
  React.createElement('div', { style: { position: 'absolute', left: -sh.cutL, bottom: 0, width: sh.w, height: sh.h, pointerEvents: 'none' } },
    pic('socket', W.mobility, 'mobility'), pic('socket', W.mid, 'mid'), pic('socket', W.special, 'special'),
    pic('socket', W.big, 'big'), pic('socket', W.attack, 'attack'),
    pic('stick-base', W.stick, 'stick'), pic('stick-thumb', thumb, 'thumb')));
}
