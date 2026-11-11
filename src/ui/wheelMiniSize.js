/**
 * ═══ v2.3.3986: THE WHEEL'S MINIMAP'S SIZE, IN ONE PLACE ═══
 *
 * The owner, playtesting on a computer: "Map system is confusing... make the
 * mini map 100% + bigger/ double the size... and change the look of the mini
 * map".  So on a computer playing wide (deskWide.js deskWideActive) the box is
 * twice as big, WHEEL_MINI_PX x 2 = 264 CSS px, and shows half as much world
 * again (WHEEL_MINI_DESK_WINDOW, 4,800 game px across, against a phone's
 * 3,200): the bigger box shows more, and every mark in it is bigger too.  A
 * phone keeps its 132 px: 264 would be 68% of an upright phone's width.
 *
 * The minimap (rendering/systems/wheelMinimap.js) draws in the phone's units
 * and scales its root by wheelMiniK() (its Graphics are vector, its Texts
 * drawn at a resolution K times higher); what keeps clear of the box asks
 * wheelMiniBox() here instead of writing 132 (NmlAskCard.jsx cardPlace; the
 * Sprint button's clearance, ShieldButton.jsx SPRINT_MAP_CLEAR, is a phone's:
 * the button is hidden on a computer, bt-desktop-hide).
 *
 * deskWideActive() asks a media query (a new MediaQueryList a call), so the
 * answer is kept for half a second: the minimap asks every frame.
 */
/* v2.3.4152: the side column's only (deskWideActive), not the band's: under
   the one band (the default) the world above the band is a third shorter
   (480 px at 1280 x 720), and a 264 px minimap and its plate took two thirds
   of its height and lay over the skateboard's button (mp-oneband's picture).
   The owner's "double the size" is kept for the old layout, ?oneband=0. */
import { deskWideActive } from './deskWide.js';
import { oneBandActive } from './oneBand.js';
import { fineInput } from '../game/deviceProfile.js';   /* v2.3.4804: the device profile */

export const WHEEL_MINI_PX = 132;              /* CSS px a side on a phone (the box's own units) */
/* v2.3.4263 (owner: "Make the desktop version of the minimap somewhat larger"):
   a computer under the one band (the default) draws it 1.35x -- 178 px, its
   frame, plate and markers with it (the world shows the phone's 3,200 game px
   across, so every mark is bigger too).  The old 2x is the side column's. */
export const WHEEL_MINI_BAND_K = 1.35;
export const WHEEL_MINI_DESK_K = 2;            /* ...times this on a computer */
export const WHEEL_MINI_WINDOW = 3200;         /* game px across the box on a phone: about three zones */
export const WHEEL_MINI_DESK_WINDOW = 4800;    /* ...and on a computer: 1.5 times the world */

let _k = 1, _at = -Infinity;

/** The box's scale: 2 on a computer playing wide, 1 anywhere else. */
export function wheelMiniK(now) {
  const t = typeof now === 'number' ? now : Date.now();
  if (t - _at >= 500 || t < _at) {
    _at = t;
    let on = false;
    try { on = deskWideActive(); } catch (e) { on = false; }
    let band = false;
    try {
      band = !on && oneBandActive() && !document.documentElement.classList.contains('bt-band-side')
        && fineInput();   /* v2.3.4804: the device profile */
    } catch (e) { band = false; }
    _k = on ? WHEEL_MINI_DESK_K : band ? WHEEL_MINI_BAND_K : 1;
  }
  return _k;
}

/** The box's side, CSS px (132 on a phone, 264 on a computer). */
export function wheelMiniBox(now) { return WHEEL_MINI_PX * wheelMiniK(now); }

/** Game px across the box. */
export function wheelMiniWindow(now) { return wheelMiniK(now) >= WHEEL_MINI_DESK_K ? WHEEL_MINI_DESK_WINDOW : WHEEL_MINI_WINDOW; }
