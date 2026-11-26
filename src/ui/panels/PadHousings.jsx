import React from 'react';
import { padArtUrl } from './controlSkin.jsx';
import { PAD_ART } from '@/data/padArt.js';
import { PAD, REF, TIER_BAND, specialLayout } from '@/game/padSkin.js';
import { padTierBus } from './padTier.js';   /* v2.3.6642: the right lobe's tier while Whirlwind or Shield Bash shows (card PAD part 6) */

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
  var tierShown = React.useSyncExternalStore(padTierBus.subscribe, padTierBus.get, padTierBus.get);   /* v2.3.6642 */
  React.useEffect(function () {
    var el = typeof document !== 'undefined' ? document.documentElement : null;
    if (el) el.classList.add('bt-padskin');
    return function () { if (el) el.classList.remove('bt-padskin'); };
  }, []);
  if (!L) return null;

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
  /* ═══ v2.3.6642: THE TIER (card PAD part 6; padSkin.js specialLayout) ═══
     While Whirlwind or Shield Bash shows, the right lobe is drawn `rise` px
     taller: the same picture's right lobe (from the right cut) over the
     shell's own, its rows over TIER_BAND unmoved in shape and lifted, the
     band stretched, the rows under it where the shell's are (border-image:
     the left slice is everything left of the cut, drawn 0 wide).  A child of
     the shell, before the wells' layer: over the shell's outline, under its
     empty wells.  No well picture in the tier: each button wears its own
     face, and an unshown one leaves the housing's dark. */
  var T = specialLayout(L, tierShown);
  /* QA's probe (mp-padskin): the layout this shell was drawn from; v2.3.6642: + the tier's (null: none) */
  if (typeof window !== 'undefined') window.__btPad = { layout: L, tier: T };
  var tier = null;
  if (T && T.rise > 0) {
    var tTop = TIER_BAND.top * L.s, tBot = (REF.H - TIER_BAND.bottom) * L.s;
    var iTop = Math.round(TIER_BAND.top * k), iBot = Math.round((REF.H - TIER_BAND.bottom) * k);
    tier = React.createElement('div', {
      'data-padhousing': 'tier', 'data-rise': T.rise,
      style: {
        position: 'absolute', left: sh.w - sh.cutR - sh.cutL, bottom: 0, width: sh.cutR, height: sh.h + T.rise, pointerEvents: 'none',
        boxSizing: 'border-box', borderStyle: 'solid', borderColor: 'transparent',
        borderWidth: tTop + 'px 0 ' + tBot + 'px 0',
        /* slices top 0 bottom left(everything left of the cut) fill / widths top 0 bottom 0 */
        borderImage: ['url(' + padArtUrl('housing') + ')', iTop, 0, iBot, H.w - cutR, 'fill', '/', tTop + 'px', 0, tBot + 'px', 0, 'stretch'].join(' '),
      },
    });
  }
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
  tier,
  React.createElement('div', { style: { position: 'absolute', left: -sh.cutL, bottom: 0, width: sh.w, height: sh.h, pointerEvents: 'none' } },
    pic('socket', W.mobility, 'mobility'), pic('socket', W.mid, 'mid'), pic('socket', W.special, 'special'),
    pic('socket', W.big, 'big'), pic('socket', W.attack, 'attack'),
    pic('stick-base', W.stick, 'stick'), pic('stick-thumb', thumb, 'thumb')));
}
