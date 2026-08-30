import React from 'react';
import { COL } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { playIsLandscape } from '../playViewport.js'; /* v2.3.2153: the tap decides by shape */
import { navButtonSize } from '../sheet/sheetGeometry.js';

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
  const size = navButtonSize(vw, vh);
  return (
    <div className="bt-navrail" style={{
      /* v2.3.1642: a ROW at the band's top-left, in its own bordered
         section, with the identity strip beside it. */
      /* v2.3.1644 (owner: "make the buttons fill in the extra space").
         The group is CONTENT-SIZED and its buttons carry the new width
         explicitly (navButtonSize).  Letting the group flex:1 and the
         buttons flex inside it was the obvious reading and it was wrong:
         measured, the buttons took every spare pixel and grew to 58 while
         the name and XP bar were crushed to a 25px column.  A number the
         geometry owns can be balanced against what the strip needs; a
         flex grab cannot. */
      flex: 'none',
      boxSizing: 'border-box',
      /* v2.3.1650 (owner: "remove the darker background behind the 3
         dashboard buttons").  The well + border + radius were the
         "its own little section" from v2.3.1642, and they have stopped
         earning their keep: the buttons carry their own fill, their own
         border and a brass active state, so the container was a second
         box drawn around three boxes.  Padding and gap stay — they are
         what keeps the group off the frame edge and off each other. */
      background: 'transparent',
      border: 'none',
      /* v2.3.1637b: BOTTOM-anchored, not centred.  The rail is 189px tall
         at rest and ~439 with a panel open, so centring moved every
         button ~110px up the screen the moment you opened one — the
         controls sliding out from under the thumb that just tapped them.
         This is the same failure v2.3.1307b pinned the old ribbon to fix
         ("toolbar bounces ~20-30px after closing"); bottom-anchoring puts
         each button at the SAME screen position in both modes. */
      display: 'flex', flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center',
      gap: 4, padding: 4,
    }}>
      {items.map((d) => {
        const on = d.id === 'dashboard' ? atRest : (!atRest && litId === d.id);
        const count = dots && dots[d.id];
        return (
          <div key={d.id}
            /* v2.3.2017: a hook that is the destination ID, not its LABEL.
               The label is owner-facing copy and has been rewritten many times
               (Hero -> Character is the one that matters here), and a test that
               selects UI by a renamed label does not fail loudly — it stops
               finding anything and quietly asserts nothing.  That is TRAPS §29,
               and mp-hudface is the fifth scenario it killed. */
            data-nav={d.id}
            role="button" aria-label={d.label} aria-pressed={on} title={d.label}
            onPointerUp={(e) => {
              e.stopPropagation();
              /* ═══ v2.3.2153: SIDEWAYS, THE DASHBOARD BUTTON IS THE BAG ═══
                 Owner, on a real iPhone in landscape: "The one thing I don't
                 understand is where my bag went.  I see the thin bar at the
                 bottom but no inventory slots when dashboard is active."

                 In portrait this button's job is "go to rest", because rest
                 IS the dashboard -- the columns row with the bag preview.
                 Landscape has no columns row (the whole point of the 48px
                 strip), so toBar() here was a lit button that showed
                 nothing: the one thing it promised -- your slots -- was the
                 one thing it could not produce.  Sideways it opens the Bag
                 sheet instead, and a second tap (or tapping it with ANY
                 sheet open) still rests -- so it is the same "give me the
                 world back" button the moment something is open, which is
                 the half of toBar() worth keeping.
                 Decided at TAP TIME from playIsLandscape() rather than from
                 subscribed state: the handler needs the answer only when the
                 finger lands. */
              if (d.id === 'dashboard') {
                if (playIsLandscape() && dashboardPanelBus.state.mode === 'bar') {
                  dashboardPanelBus.open('bag');
                  return;
                }
                dashboardPanelBus.toBar();
                return;
              }
              dashboardPanelBus.open(d.id);
            }}
            style={{
              position: 'relative',
              /* v2.3.1639 (owner): VERTICAL PILL — taller than wide with
                 fully-rounded ends, icon centred on both axes.
                 v2.3.1642: still a vertical pill, now in a horizontal
                 row — navButtonSize returns {w,h} with h from the
                 identity row so the shape survives the move. */
              width: size.w, height: size.h, flex: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? COL.accentFill : COL.wellSoft,
              border: `1px solid ${on ? COL.accent : COL.tileBor}`,
              borderRadius: 999,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            {/* The Hero button is the player's own bust when it has
                rendered — the v2.3.1294 rule, kept: nothing says "my
                character" better than the character. */}
            {d.id === 'hero' && profilePortrait ? (
              <img src={profilePortrait} alt="" draggable={false}
                style={{
                  width: 24, height: 24, objectFit: 'cover',
                  imageRendering: 'pixelated', borderRadius: 5, pointerEvents: 'none',
                }} />
            ) : (
              <img src={d.icon} alt="" draggable={false}
                style={{
                  width: 24, height: 24, objectFit: 'contain',
                  opacity: on ? 1 : 0.82, pointerEvents: 'none',
                }} />
            )}
            {/* v2.3.1649 (owner: "on the active navigation button remove
                the tiny arrow chip but leave the active gold/yellow
                circle"): the chevron is gone.  It was a second active
                marker on a button that already states the same thing three
                ways — brass fill, brass border, aria-pressed — and a 8x5px
                triangle is precisely the size of detail the owner has been
                asking this band to stop relying on. */}
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
