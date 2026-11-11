/* ═══ PLAY VIEWPORT — the size the GAME gets, not the size of the window ═══ */
/* v2.3.1715.  Owner, on desktop: "the layout is super stretched... force the
   main game area 50% of the size if they're a desktop player and make the
   dashboard sized the same width" — and then, after the shell landed, "the
   dashboard is still super stretched and not scaling down correctly with the
   smaller game screen area."

   That second report is this module.  Narrowing the shell (#root, the
   pointer:fine block in game.css) moved the CANVAS, because BroTown's resize()
   measures the shell — but every dashboard component sizes itself from
   window.innerWidth directly, so on a 1920px screen they kept laying out for
   1920 while sitting in a 960 box: columns, slot pitch, the identity strip and
   the item popup all stretched to a width that no longer existed.

   So there are now two different widths and they must not be confused:
     - window.innerWidth — the BROWSER window.  Still correct for anything
       genuinely about the browser (media queries, the surround outside).
     - playVw() — the PLAY AREA.  Correct for anything laying out game UI.
   On a phone the shell IS the viewport, so playVw() === innerWidth and nothing
   about the primary platform changes; the `< vw` guard below is what makes
   that true by construction rather than by luck.

   Landscape is derived here too (playIsLandscape), because it has the same
   bug in a nastier form: a 960x1080 shell on a 1920x1080 screen is PORTRAIT,
   but window.innerWidth > window.innerHeight reports landscape and swings the
   whole control layout to the wrong one. */

import { deskWideActive, DESK_SHEET_W } from '../deskWide.js';   /* v2.3.3687 */
import { oneBandActive } from '../oneBand.js';                   /* v2.3.4072 */

const PHONE_FALLBACK_W = 390;
const PHONE_FALLBACK_H = 844;

/* The shell element, or null before React has mounted it. */
function shell() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root');
}

/* ═══ v2.3.4875: THE SIZES KEPT, NOT MEASURED IN THE MIDDLE OF A SCRIPT ═══
   Reading el.clientWidth (and window.innerWidth) makes the browser lay the
   page out there and then when anything has changed since: 5 to 9 ms as a
   window opens, inside the frame (CLAUDE.md §7: nothing measures the page
   inside a frame; docs/specs/held-sweep.md "The play column's size is
   measured live").  Now the four numbers are kept: the shell's from a
   ResizeObserver (told after the browser's own layout, so reading them
   there costs nothing), the window's from its resize events, which clear
   them all so the first read after a resize measures once, as before.
   What moves the shell: the window (resize, a turn: cleared) and the
   desktop and one-band switches, set once at boot, before the first read
   that keeps anything (the observer starts on the first read with the shell
   mounted).  `?playvwlive=1`: the old way, measured on every read, for one
   tab. */
const _live = (() => { try { return /(^|[?&])playvwlive=1(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
let _vw = -1, _vh = -1, _sw = -1, _sh = -1, _ro = null, _roEl = null, _wired = false;
const _sizes = { reads: 0, measured: 0 };
function _clear() { _vw = -1; _vh = -1; _sw = -1; _sh = -1; }
function _wire(el) {
  if (_live || typeof window === 'undefined') return;
  if (!_wired) {
    _wired = true;
    try {
      window.addEventListener('resize', _clear, true);
      window.addEventListener('orientationchange', _clear, true);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', _clear);
    } catch (e) { /* kept as long as nothing clears it: measured each read instead */ _wired = false; }
  }
  if (el && el !== _roEl && typeof ResizeObserver === 'function') {
    try {
      if (_ro) _ro.disconnect();
      _roEl = el;
      _ro = new ResizeObserver(() => { _sw = el.clientWidth; _sh = el.clientHeight; });
      _ro.observe(el);
    } catch (e) { _ro = null; _roEl = null; }
  }
}
/* the shell's size and the window's, kept where they can be (above) */
function _dims() {
  _sizes.reads++;
  const el = shell();
  if (_live || !_wired || !el || el !== _roEl || !_ro) {
    _wire(el);
    _sizes.measured++;
    return { vw: window.innerWidth, vh: window.innerHeight, sw: el ? el.clientWidth : 0, sh: el ? el.clientHeight : 0 };
  }
  if (_vw < 0 || _sw < 0) {
    _sizes.measured++;
    _vw = window.innerWidth; _vh = window.innerHeight; _sw = el.clientWidth; _sh = el.clientHeight;
  }
  return { vw: _vw, vh: _vh, sw: _sw, sh: _sh };
}
if (typeof window !== 'undefined') window.__btPlaySizes = () => ({ ..._sizes, kept: !_live && !!_ro });   /* QA */

export function playVw() {
  if (typeof window === 'undefined') return PHONE_FALLBACK_W;
  /* window.innerWidth, NOT visualViewport — see playVh for why. */
  const d = _dims();
  const vw = d.vw;
  const sw = d.sw;
  /* Only ever NARROWS.  A shell wider than the viewport (or an unmounted one
     reporting 0) must never win, or a phone would start laying out for a size
     it does not have. */
  return sw > 0 && sw < vw ? sw : vw;
}

export function playVh() {
  if (typeof window === 'undefined') return PHONE_FALLBACK_H;
  /* ═══ window.innerHeight, NOT visualViewport.height ═══
     This is the iOS keyboard trap, and it is the reason this function is
     four lines longer than it looks like it needs to be.  BroTown's own
     resize() carries the warning: when the chat input pops the iOS
     keyboard, visualViewport.height shrinks by ~300px while innerHeight
     stays at its original value — which is why resize() SKIPS entirely on
     that gap rather than resizing the canvas out from under the player.
     Six of the seven call sites this helper replaced read innerHeight, so
     sourcing visualViewport here would have made the dashboard re-derive
     its whole geometry every time a phone player opened chat: a regression
     on the PRIMARY platform, introduced by a desktop-only feature.
     The shell narrowing below is the only thing this helper adds, and the
     shell only exists on pointer:fine + min-width:1000px. */
  const d = _dims();   /* v2.3.4875: kept, not measured mid-script */
  const vh = d.vh;
  const sh = d.sh;
  return sh > 0 && sh < vh ? sh : vh;
}

export function playIsLandscape() {
  /* v2.3.4072: with the one band on (?oneband=1, src/ui/oneBand.js) every
     screen plays the upright layout -- the band at the bottom, whatever the
     shape -- so the one question every sideways path asks answers "no". */
  if (oneBandActive()) return false;
  return playVw() > playVh();
}

/* ═══ v2.3.2157: THE WIDTH A DASHBOARD PANEL ACTUALLY HAS ═══
 *
 * A third width joins the two above, for the same reason each of them
 * exists: a panel laying itself out from the wrong container stretched.
 *
 * In portrait the expanded sheet spans the play area, so playVw() and "my
 * container's width" were the same number by coincidence.  The landscape
 * side sheet ends the coincidence: a panel inside a 400px column that sizes
 * its grid from a 844px playVw() lays out ten tiles in a four-tile box --
 * the v2.3.1715 desktop stretch, one level down.
 *
 * resize() stamps --sheet-w whenever it stamps the rest of the geometry;
 * a panel is hosted by the side sheet exactly when the play area is
 * landscape, so that is the whole test.  Portrait (or a missing stamp, on
 * an older boot) falls through to playVw() -- the primary platform cannot
 * be changed by this function existing. */
export function panelVw() {
  /* v2.3.3687: on a computer playing wide the panel is the page column and
     the controls' strip; a page has the column (deskWide.js) */
  if (deskWideActive()) return DESK_SHEET_W;
  if (playIsLandscape()) {
    try {
      const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sheet-w'), 10);
      if (v > 0) return v;
    } catch (e) { /* fall through */ }
  }
  return playVw();
}
