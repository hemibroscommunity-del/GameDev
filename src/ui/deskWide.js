/* ═══ v2.3.3687: A COMPUTER PLAYS THE SIDEWAYS LAYOUT ═══
 *
 * The owner, 2026-10-28: "Yes base desktop off the landscape mode but fix the
 * menu sizes."  Since v2.3.1768b a computer drew the upright phone blown up
 * to the window's height, black bars either side (#root's aspect lock,
 * game.css, `@media (pointer:fine) and (min-width:1000px)`).  The game has a
 * sideways layout of its own (a phone turned on its side: the dashboard a
 * column at the side, the world the rest), chosen by the PLAY AREA's shape
 * (playViewport.js playIsLandscape), so taking the lock off is what turns a
 * computer to it.
 *
 * This only sets `html.bt-desk-wide`; game.css does the rest, inside the same
 * media query as the lock, so a phone and a narrow window never see it.
 * `?narrow` (or `?deskwide=0`) is the upright column as it was, for the tab
 * (`?deskwide=1` the wide layout again); the phone tests' computer pages ask
 * for it unless they pass `wide: true` (tools/qa/mp/harness.mjs).
 *
 * v2.3.4152: the one band is the default (src/ui/oneBand.js), so a computer
 * plays the band at the bottom; this class still frees #root's aspect lock for
 * it, and the side column described above is the old layout, `?oneband=0`. */

import { oneBandActive } from './oneBand.js';   /* v2.3.4072 */
import { COMPUTER_FRAME_QUERY } from '../game/deviceProfile.js';   /* v2.3.4804: the device profile */

export function deskWideWanted(search) {
  let q;
  try { q = new URLSearchParams(search != null ? search : (typeof location !== 'undefined' ? location.search : '')); } catch (e) { return true; }
  const v = q.get('deskwide');
  /* the choice is the TAB's: the game's own reloads (a key typed, a log-out, a
     recovery) go back to a bare address, and the column must not turn wide
     under a page that asked for it */
  if (q.has('narrow') || v === '0' || v === 'off' || v === 'false') {
    try { sessionStorage.setItem('bt_narrow', '1'); } catch (e) { /* no storage: this load only */ }
    return false;
  }
  if (v === '1' || v === 'on' || v === 'true') {
    try { sessionStorage.removeItem('bt_narrow'); } catch (e) { /* nothing kept */ }
    return true;
  }
  try { if (sessionStorage.getItem('bt_narrow') === '1') return false; } catch (e) { /* no storage: wide */ }
  return true;
}

/* The column an upright phone is (playViewport.js's PHONE_FALLBACK_W): the
   width every dashboard page was laid out for.  On a computer playing wide
   the side column is this wide, so the pages look as they do upright --
   sideways on a phone they squeeze into a ~230 px column, sized for a screen
   390 px tall, with the rest of a computer's height left black. */
export const DESK_SHEET_W = 390;

/* ═══ THE CONTROLS' OWN STRIP, ON THE SCREEN'S FAR SIDE ═══
   The owner, seeing the list under the bag: "If you split the keyboard
   shortcuts on its own strip to the right and kept the inventory on the left
   it might look better", and then: "I meant the right side of the screen
   consists of the black strip with the shortcuts.  Not just on the right side
   of the left black strip."  So on a computer the screen is three columns:
   the pages at one edge (DESK_SHEET_W), the world, and the controls at the
   OTHER edge, the window's height, one key a row (DESK_KEYS_W) -- or the
   strip's ⌨ alone when they are hidden (H, or its own button).  The strip is
   there whether the pages are open or folded away, so the world's width only
   changes when one of the two is. */
export const DESK_KEYS_W = 156;
export const DESK_KEYS_FOLDED_W = 40;

/* Are the controls hidden (the ⌨ and H, 'bt_kb_hints_off', BroTown)? */
export function deskKeysHidden() {
  try { return localStorage.getItem('bt_kb_hints_off') === '1'; } catch (e) { return false; }
}

/* The controls' strip's width on a computer playing wide, 0 anywhere else:
   what the world gives up at its far edge (sheetGeometry's bandFootprint). */
export function deskKeysW() {
  if (!deskWideActive()) return 0;
  return deskKeysHidden() ? DESK_KEYS_FOLDED_W : DESK_KEYS_W;
}

const FRAME_QUERY = COMPUTER_FRAME_QUERY;   /* game.css's computer rule (v2.3.4804: written once, in the device profile) */

/* Is a computer playing wide right now: the switch on AND the window one the
   computer's rule applies to (a narrow window has no shell, so it plays as
   whatever shape it is, as before). */
export function deskWideActive() {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return false;
    if (!document.documentElement.classList.contains('bt-desk-wide')) return false;
    /* v2.3.4072: the one band (the default since v2.3.4152) keeps the class -- it frees #root
       from the upright aspect lock (game.css) so the band is the window's
       width -- but a computer then plays the upright layout, not the side
       column and the keys strip (src/ui/oneBand.js) */
    if (oneBandActive()) return false;
    return !!(window.matchMedia && window.matchMedia(FRAME_QUERY).matches);
  } catch (e) { return false; }
}

/* ═══ v2.3.4152: A COMPUTER PLAYING THE BAND ═══
   The one band (the default since v2.3.4152, src/ui/oneBand.js) on a computer
   window the shell rule applies to: the class on, the frame query matching.
   The keys strip is gone there and the nav buttons wear their key caps, so
   the controls list (KeyboardHintsPanel) starts folded to its ⌨ -- it had
   come up over the world's bottom-left, above the band (B3's rough edge) --
   until the player opens it (the ⌨ or H, kept in 'bt_kb_hints_off'). */
export function deskBandActive() {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return false;
    if (!document.documentElement.classList.contains('bt-desk-wide')) return false;
    if (!oneBandActive()) return false;
    return !!(window.matchMedia && window.matchMedia(FRAME_QUERY).matches);
  } catch (e) { return false; }
}

/* v2.3.4152: a computer's window with room, in either layout -- the old side
   column (deskWideActive) or the band (deskBandActive).  For what is a
   COMPUTER'S SIZE rather than the column's: the building windows, the world
   map's key, the swap hint's key words, the coach card's step aside.  The
   column's own geometry keeps asking deskWideActive, and so does the doubled
   minimap (wheelMiniSize.js: the band's world is too short for it). */
export function deskBigActive() {
  return deskWideActive() || deskBandActive();
}

export function applyDeskWide() {
  if (typeof document === 'undefined') return false;
  const on = deskWideWanted();
  try { document.documentElement.classList.toggle('bt-desk-wide', on); } catch (e) { /* no class: the column */ }
  return on;
}

/* the QA probe: is the switch on, and is the play area sideways because of it */
if (typeof window !== 'undefined') {
  window.__btDeskWide = function () {
    const el = document.getElementById('root');
    return {
      on: document.documentElement.classList.contains('bt-desk-wide'),
      fine: !!(window.matchMedia && window.matchMedia(FRAME_QUERY).matches),
      active: deskWideActive(),
      root: el ? { w: el.clientWidth, h: el.clientHeight } : null,
      win: { w: window.innerWidth, h: window.innerHeight },
    };
  };
}
