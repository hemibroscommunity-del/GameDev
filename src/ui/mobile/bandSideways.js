/* ═══ v2.3.4152: THE ONE BAND ON A PHONE ON ITS SIDE ═══
 *
 * The owner, 2026-11-03, on the one band (docs/specs/one-band.md): "The new
 * universal dashboard system will need to adapt to the new redesign we're
 * adding for "gear" and "bro." Go recommended on default behavior going into
 * landscape mode and recommendations on anything else for that".  Decided:
 *
 *   - a phone on its side RESTS FOLDED to the band's button row: the world
 *     above a 130 px band is 260 px tall, too short to play under the
 *     joysticks and the combat buttons;
 *   - a nav button opens its page as upright (BottomDashboard's mode effect
 *     unfolds); CLOSE, or closing the page any other way, folds it again;
 *   - while the band is open sideways the controls step aside (game.css's
 *     `html.bt-band-side-open` block: hidden and not touchable), and come
 *     back when it folds -- no control is ever over an open band;
 *   - folded, the controls take the sideways geometry the side column's
 *     world had, inside the world's box (`html.bt-band-side`: game.css, and
 *     BroTown's controls' `isLandscape`).
 *
 * WHAT "SIDEWAYS" IS.  The one band on (oneBand.js), the window wider than
 * tall, at most ONE_BAND_SIDE_MAX_H tall (a phone: 320-430 px; an iPad on its
 * side is 768+ and keeps the band open, as a computer does), and not a mouse
 * (`pointer:fine`: a computer's short window keeps its band open, its
 * controls are its keys).
 *
 * THE FOLD IS THE MOMENT'S, NOT THE DEVICE'S.  Going sideways (or loading
 * sideways) folds the band WITHOUT writing bt_dash_min (dashMinBus.sideways);
 * a player's unfold sideways stands until they fold it or turn the phone;
 * turning upright gives the band back the upright's own remembered choice
 * (dashMinBus.stored()).  So sideways never re-folds behind a player who
 * opened it, and never changes how the band rests upright.
 *
 * Two classes on <html>, the one place CSS and JS agree (as oneBand.js and
 * deskWide.js do): `bt-band-side` (a phone on its side, the band on) and
 * `bt-band-side-open` (that, and the band unfolded: a page or the resting
 * columns showing). */
import { oneBandActive } from '../oneBand.js';
import { dashMinBus } from './dashMinBus.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { shopBus } from './shopBus.js';
import { tradeBagBus } from './tradeBagBus.js';
import { playIsLandscape } from './playViewport.js';

export const ONE_BAND_SIDE_MAX_H = 500;
const SIDE = 'bt-band-side';
const OPEN = 'bt-band-side-open';

/* the shape alone, for node tests and the probe */
export function bandSidewaysShape(w, h, fine) {
  return w > h && h <= ONE_BAND_SIDE_MAX_H && !fine;
}

/* a class read, cheap (the controls ask it every render) */
export function bandSideways() {
  try { return typeof document !== 'undefined' && document.documentElement.classList.contains(SIDE); }
  catch (e) { return false; }
}

/* The controls' one question (BroTown's `isLandscape` for TouchControls and
   its siblings, ElementBurstButton, SpecialChargePie): the side column's
   sideways geometry, or a phone on its side over the one band. */
export function ctlLandscape() {
  return playIsLandscape() || bandSideways();
}

function wantSideways() {
  if (typeof window === 'undefined' || !oneBandActive()) return false;
  let fine = false;
  try { fine = !!(window.matchMedia && window.matchMedia('(pointer:fine)').matches); } catch (e) { /* a phone */ }
  return bandSidewaysShape(window.innerWidth, window.innerHeight, fine);
}

let _side = null;
function stampOpen() {
  try { document.documentElement.classList.toggle(OPEN, !!_side && !dashMinBus.min); } catch (e) { /* no page */ }
}

/* every resize (and once at start): the shape, and on a change the fold */
export function syncBandSideways() {
  const side = wantSideways();
  if (side !== _side) {
    const first = _side === null;
    _side = side;
    try { document.documentElement.classList.toggle(SIDE, side); } catch (e) { /* no page */ }
    dashMinBus.sideways = side;
    if (side) {
      /* sideways rests folded: a page already open closes to it (the
         rotation rule, BottomDashboard's v2.3.2157 note) */
      if (dashboardPanelBus.state.mode === 'expanded') dashboardPanelBus.toBar();
      /* ...unless Diego's drawer or a trade is open: it sells from the bag's
         tiles (it folds when the deal shuts, below) */
      if (!shopBus.open && !tradeBagBus.open) dashMinBus.set(true);
    } else if (!first) {
      /* upright again: the upright's own remembered fold */
      dashMinBus.set(dashMinBus.stored());
    }
  }
  stampOpen();
  return side;
}

let _started = false;
/* main.jsx, after applyOneBand(): before the render, so the first layout is
   already folded.  The listener is registered before BroTown's resize(), so
   its geometry reads the fold this event decided (and set() re-dispatches). */
export function startBandSideways() {
  if (_started || typeof window === 'undefined') return;
  _started = true;
  syncBandSideways();
  window.addEventListener('resize', syncBandSideways);
  window.addEventListener('orientationchange', syncBandSideways);
  dashMinBus.subscribe(stampOpen);
  /* CLOSING A PAGE SIDEWAYS FOLDS THE BAND.  The CLOSE chip already folds
     (toBar, then set(true)); this is every other way a page closes (a panel
     closing itself, a window that clears the band), so the band does not
     rest on its columns with the controls away.  (The bag button, pressed
     with a page open, still shows the bag's columns, as upright: NavRail
     unfolds after its toBar.)  Synchronous, on the bus's own emit:
     a caller that closes the page and then unfolds on purpose (StorePanel's
     "List an Item", toBar() then set(false)) has the last word.  Not while
     Diego's drawer or a trade is open: they work through the bag's tiles. */
  let was = dashboardPanelBus.state.mode;
  dashboardPanelBus.subscribe(() => {
    const now = dashboardPanelBus.state.mode;
    if (_side && was === 'expanded' && now === 'bar' && !shopBus.open && !tradeBagBus.open) dashMinBus.set(true);
    was = now;
  });
  /* ...and so does Diego's drawer or a trade shutting: they unfold the band
     for its bag (BottomDashboard's v2.3.3399 rule); shut, sideways rests
     folded again (a page left open stays open) */
  let dealt = !!(shopBus.open || tradeBagBus.open);
  const onDeal = () => {
    const now = !!(shopBus.open || tradeBagBus.open);
    if (_side && dealt && !now && dashboardPanelBus.state.mode === 'bar') dashMinBus.set(true);
    dealt = now;
  };
  shopBus.subscribe(onDeal);
  tradeBagBus.subscribe(onDeal);
}

/* the QA probe (mp-oneband) */
if (typeof window !== 'undefined') {
  window.__btBandSide = () => ({ side: bandSideways(), open: (() => { try { return document.documentElement.classList.contains(OPEN); } catch (e) { return false; } })(), min: dashMinBus.min, stored: dashMinBus.stored() });
}
