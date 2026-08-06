import React from 'react';
import { COL } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { railButtonSize } from '../sheet/sheetGeometry.js';

/* v2.3.1637 (owner mockup): the NAV RAIL — the destinations as icon-only
   buttons down the band's left edge, replacing the full-width bottom
   toolbar ribbon.  Owner: "get rid of the toolbar button on the bottom
   and just make them ... on the leftmost handed side", and on the width,
   "just the size of the icons".

   SEVEN buttons, not six.  The owner's own correction to their mockup:
   "it is incorrect to show the bag as the active.  It should be a new
   icon that represent a dashboard".  The resting band IS a destination —
   the three-column dashboard — and until now it was the one state the
   toolbar could not show you were in, because bar mode lights nothing.
   DASHBOARD is that state's button: lit whenever no panel is open, and
   tapping it closes back to rest.  It uses panel-stats (the bar chart
   with the rising arrow), which is the painted set's only "your numbers"
   glyph and was otherwise used on one legacy screen.

   NO LABELS.  The ribbon had them because six buttons across the full
   width had the room; a rail sized to its icon does not, and stacking a
   7px caption under each icon would eat the height the seventh button
   needs.  Every icon here is one a player has already learned from the
   ribbon, in the same order.

   THE RAIL PERSISTS IN BOTH MODES, unlike the identity and columns rows.
   This is not a style choice: the ribbon it replaces stayed visible
   under an open panel (the sheet reserved var(--nav-h) for exactly that),
   and it is how you switch destinations or get out.  A rail that hid with
   the rest of the band would leave an open panel with no navigation. */

export const NavRail = ({ items, litId, atRest, vw, vh, dots, profilePortrait }) => {
  const size = railButtonSize(vw, vh);
  return (
    <div className="bt-navrail" style={{
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: 'var(--rail-w, 48px)',
      zIndex: 3,
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 3, padding: '3px 4px',
      borderRight: `1px solid ${COL.divider}`,
    }}>
      {items.map((d) => {
        const on = d.id === 'dashboard' ? atRest : (!atRest && litId === d.id);
        const count = dots && dots[d.id];
        return (
          <div key={d.id}
            role="button" aria-label={d.label} aria-pressed={on} title={d.label}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (d.id === 'dashboard') { dashboardPanelBus.toBar(); return; }
              dashboardPanelBus.open(d.id);
            }}
            style={{
              position: 'relative',
              width: '100%', height: size, flex: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? COL.accentFill : COL.wellSoft,
              border: `1px solid ${on ? COL.accent : COL.tileBor}`,
              borderRadius: 7,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            {/* The Hero button is the player's own bust when it has
                rendered — the v2.3.1294 rule, kept: nothing says "my
                character" better than the character. */}
            {d.id === 'hero' && profilePortrait ? (
              <img src={profilePortrait} alt="" draggable={false}
                style={{
                  width: size - 10, height: size - 10, objectFit: 'cover',
                  imageRendering: 'pixelated', borderRadius: 5, pointerEvents: 'none',
                }} />
            ) : (
              <img src={d.icon} alt="" draggable={false}
                style={{
                  width: size - 8, height: size - 8, objectFit: 'contain',
                  opacity: on ? 1 : 0.82, pointerEvents: 'none',
                }} />
            )}
            {/* The active marker points INTO the content it opened —
                the mockup's chevron.  Drawn outside the button so it
                never crowds the icon. */}
            {on && (
              <span aria-hidden="true" style={{
                position: 'absolute', right: -5, top: '50%',
                width: 0, height: 0, transform: 'translateY(-50%)',
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: `5px solid ${COL.accent}`,
                pointerEvents: 'none',
              }} />
            )}
            {count ? (
              <span aria-hidden="true" style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 13, height: 13, padding: '0 3px',
                borderRadius: 7, background: COL.accent, color: COL.onAccent,
                fontSize: 9, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
              }}>{count > 9 ? '9+' : count}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
