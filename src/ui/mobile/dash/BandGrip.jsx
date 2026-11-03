import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashMinBus } from '../dashMinBus.js';
import { swallowTapClick } from '../../swallowTapClick.js';
import { BAND_CLOSE_W } from '../sheet/sheetGeometry.js';   /* v2.3.4172: CLOSE's width, kept by the row */

/* ═══ v2.3.4172: THE SLIM HANDLE ON THE BAND'S TOP EDGE ═══
   The owner adopted this from the review of his dashboard: "remove the large
   OPEN/CLOSE button taking up a full navigation slot.  A slim, centered handle
   at the top of the dashboard would communicate that the panel can be expanded
   or collapsed."  So the upright band's fold is a grip: a 36 x 5 bar on a small
   tab of the band's own slate, standing on its top edge, centred -- the
   bottom-sheet handle every phone already teaches -- and the row below it is
   the five buttons' alone (sheetGeometry IDENTITY_MIN_LINE).

   WHAT A TAP DOES is what CLOSE / OPEN did (v2.3.2119, v2.3.2266), unchanged:
   with a page open it closes the page AND folds the band ("get all this out of
   my way"); at rest it folds or unfolds.  `data-dash-fold="open|min"` stays on
   it, because the harness (H.unfoldBand, H.closeDest), the coach's "open the
   dashboard" lessons and the guide arrow all find the fold by that hook.

   THE TAP AREA IS 44 px TALL (the house minimum) and sits ABOVE the band, over
   the world, to 4 px inside it: the band's top 4 px are the nav row's own air
   (the buttons start under it), so the grip never takes a press meant for the
   middle button (Quests) right below it.  64 px wide -- the tab and a margin
   either side of it -- so the patch of world it takes is small and in the
   middle, between the two sticks' usual corners.

   The band moves its top edge when a page opens, so after a tap that closes a
   page the finger is over the world: the click that follows is eaten
   (swallowTapClick, TRAPS §247), or it would land on the game. */
/* ═══ v2.3.4172: ...AND NOW ONLY THE TAB ITSELF ═══
   With CLOSE back in the row (BandClose below: the 44 px fold control the
   owner drew), the grip's tap area shrinks to the tab it draws, 64 x 20 --
   16 px above the band's edge and its 4 px of air.  The 44 px patch over the
   world took the middle of main's weapon pill (v2.3.4130, centred over the
   band's top edge): sideways and on a computer the pill's centre sat inside
   it, so a tap on the bow folded the band (mp-oneband's "a tap at its middle
   reaches it").  The tab still answers a finger on it, and the harness and
   the coach still find the fold by [data-dash-fold]. */
export const GRIP_HIT_W = 64;
export const GRIP_HIT_H = 20;
const GRIP_IN_BAND = 4;   /* the part of the tap area inside the band: the nav row's top air */

export const BandGrip = ({ min, expanded }) => (
  <button
    type="button"
    className="bt-band-grip"
    data-dash-fold={min ? 'min' : 'open'}
    aria-label={min ? 'Expand dashboard' : 'Minimize dashboard'}
    aria-expanded={!min}
    title={min ? 'Expand dashboard' : 'Minimize dashboard'}
    onPointerDown={(e) => e.stopPropagation()}
    onPointerUp={(e) => {
      e.stopPropagation();
      swallowTapClick(e);
      /* no focus ring left on it (v2.3.3481's reason for the old chip) */
      try { e.currentTarget.blur(); } catch (_) { /* fine */ }
      if (expanded) { dashboardPanelBus.toBar(); dashMinBus.set(true); }
      else dashMinBus.set(!dashMinBus.min);
    }}
    /* a key (Enter, Space) makes a click with no pointer behind it */
    onClick={(e) => {
      if (e.detail !== 0) return;
      if (expanded) { dashboardPanelBus.toBar(); dashMinBus.set(true); }
      else dashMinBus.set(!dashMinBus.min);
    }}
    style={{
      position: 'absolute',
      left: `calc(50% - ${GRIP_HIT_W / 2}px)`,
      top: -(GRIP_HIT_H - GRIP_IN_BAND),
      width: GRIP_HIT_W,
      height: GRIP_HIT_H,
      zIndex: 4,
      padding: 0,
      margin: 0,
      border: 'none',
      background: 'transparent',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {/* the tab: the band's slate, its top corners round, standing on the
        edge; the bar in it.  Drawn, not a picture (nothing to preload). */}
    <span aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 56, height: 12 + GRIP_IN_BAND,
      boxSizing: 'border-box',
      background: 'var(--ui-dashboard-tray, #13242B)',
      borderRadius: '9px 9px 0 0',
      boxShadow: '0 -1px 0 0 #0A1419',
      pointerEvents: 'none',
    }}>
      <span style={{
        display: 'block', width: 36, height: 5, borderRadius: 3,
        marginBottom: GRIP_IN_BAND - 1,
        background: min ? '#D8AA58' : 'rgba(229,237,233,.62)',
      }} />
    </span>
  </button>
);

/* ═══ v2.3.4172: AND CLOSE AT THE ROW'S LEFT, AS THE OWNER DREW IT ═══
   His drawing of the Bro page (D474F679-...png) and of the row
   (61C354F2-...png): CLOSE at the left, then the five buttons.  So the word
   comes back beside them on the upright phone too -- the grip above stays
   (the handle every phone's sheets teach, and the hook [data-dash-fold] the
   harness, the coach and the guide arrow find the fold by).  It does what the
   grip does, which is what the CLOSE pill always did (v2.3.2119, v2.3.2266):
   with a page open it closes the page and folds the band ("get all this out
   of my way"); at rest it folds; folded it reads OPEN and unfolds.  Its hook
   is its own (data-dash-close), so a test that finds the fold by
   [data-dash-fold] finds the one control it always did.
   The house chip (.bt-chisel: the frame art owns the corners), as tall as the
   five buttons beside it, its width the word's: sheetGeometry's
   BAND_CLOSE_W is what the row keeps for it. */
export const BandClose = ({ min, expanded, h }) => (
  <button
    type="button"
    className="bt-chisel bt-chisel--chip bt-band-close"
    data-dash-close={min ? 'min' : 'open'}
    aria-label={min ? 'Expand dashboard' : (expanded ? 'Close' : 'Minimize dashboard')}
    aria-expanded={!min}
    onPointerDown={(e) => e.stopPropagation()}
    onPointerUp={(e) => {
      e.stopPropagation();
      swallowTapClick(e);
      try { e.currentTarget.blur(); } catch (_) { /* fine */ }
      if (expanded) { dashboardPanelBus.toBar(); dashMinBus.set(true); }
      else dashMinBus.set(!dashMinBus.min);
    }}
    onClick={(e) => {
      if (e.detail !== 0) return;
      if (expanded) { dashboardPanelBus.toBar(); dashMinBus.set(true); }
      else dashMinBus.set(!dashMinBus.min);
    }}
    style={{
      flex: 'none',
      width: BAND_CLOSE_W,
      height: h || 44,
      padding: 0,
      margin: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#E5EDE9',
      fontFamily: 'inherit',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.08em',
      lineHeight: 1,
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    }}
  >{min ? 'OPEN' : 'CLOSE'}</button>
);
