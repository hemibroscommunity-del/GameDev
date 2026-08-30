import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { bagFilterBus, CATEGORIES } from './bagFilterBus.js';
import { DASH_GAP } from '../sheet/sheetGeometry.js';

/* v2.3.1649: the bag's category filter, restored (retired at v2.3.1645 for
   want of room) and re-homed into the band's top row — the space the
   identity strip vacates whenever a panel is open.  Owner: "you can put
   all of the filter chips there to sort the inventory items".

   ICON-ONLY, and that is a size decision rather than a minimalism one.
   Five chips share ~240px beside the nav group; with a caption each they
   would be 44px-wide columns holding 8px text, which is the exact
   too-small-to-read failure this whole pass exists to fix.  Without one
   each chip is a 24px icon on a 44pt-tall target — the same icon-only
   language the nav buttons beside them already use, with the label carried
   by aria-label and title for anyone who needs it announced.

   The chips fill their row: no fixed width, so five categories or eight
   both divide the space evenly instead of overflowing it. */
export const BagFilterChips = ({ height, gutter, width }) => {
  const [sel, setSel] = useState(bagFilterBus.get());
  useEffect(() => bagFilterBus.subscribe(setSel), []);
  return (
    <div style={{
      /* v2.3.1652 (owner: "put the filters on their own header row above
         the inventory slots but spanning the whole width of the slot rows
         — in my view it's 5 slots wide"): the chips left the band's top
         row for the Bag panel itself, so `width` is the slot grid's own
         width and the flex:1 chips below divide it into exactly as many
         parts as there are slot columns.  Each chip lands one slot wide,
         and the header lines up with the grid it filters instead of
         merely sitting near it.
         gridColumn survives for the retired top-row placement only when
         no width is given — there are no callers left, but the prop is
         the switch, not a second component. */
      ...(width ? {
        width, flex: 'none',
        /* Measured: without this the header sat at x 6..342 while the slot
           cells ran 27..363 — the grid CENTRES its columns inside a tray
           that is wider than they are, so matching the grid's width is not
           the same as matching its position.  Centre in the same box and
           the two line up by construction. */
        alignSelf: 'center',
      } : { gridColumn: '1 / 3' }),
      minWidth: 0,
      /* v2.3.1649: the nav group is wider than its own track and overhangs
         this one from the right (see BottomDashboard).  Measured, that
         buried the fifth chip under the Dashboard button — the chips are
         drawn first and lose.  `gutter` is exactly that overhang, so the
         track the chips actually get is the track that is actually free. */
      marginRight: gutter || 0,
      display: 'flex', alignItems: 'center',
      /* One slot per chip: the SAME gap the grid puts between columns and
         no padding of its own, so chip N sits exactly over column N. */
      gap: width ? DASH_GAP : 4,
      /* v2.3.1650 (owner: "remove darker background behind filter buttons
         on bag full view"): transparent, matching the nav group opposite
         it in the same row — the two ends of this row must read as the
         same kind of thing, and one of them having a recessed tray while
         the other floats is exactly the mismatch that made this row look
         like two different components. */
      background: 'transparent',
      border: 'none',
      padding: width ? 0 : 4, boxSizing: 'border-box',
      height: height || '100%',
    }}>
      {CATEGORIES.map((c) => {
        const on = c.id === sel;
        return (
          <div key={c.id}
            role="button" aria-label={c.label} aria-pressed={on} title={c.label}
            onPointerUp={(e) => { e.stopPropagation(); bagFilterBus.set(c.id); }}
            style={{
              position: 'relative',
              flex: '1 1 0', minWidth: 0, height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? COL.accentFill : COL.wellSoft,
              border: `1px solid ${on ? COL.accent : COL.tileBor}`,
              borderRadius: 7,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            {/* v2.3.1650 (owner: "put the little filter icon next to each
                filter button").  This is v2.3.1320's funnel mark, restored
                verbatim from the design it shipped in — the owner's own
                suggestion at the time, for the reason recorded then:
                "understood without using language".  Five category
                pictograms in a row do not say WHAT they do to the list;
                the funnel does, in nine pixels and no words.  Brass on the
                active chip, so it doubles as the selected marker now that
                the recessed track is gone. */}
            <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true" style={{
              position: 'absolute', top: 2, right: 2, pointerEvents: 'none',
            }}>
              <path d="M1 1.5 H9 L6.2 5 V8.6 L3.8 7.4 V5 Z"
                fill={on ? COL.accent : 'none'}
                stroke={on ? COL.accent : COL.muted} strokeWidth="1.1" strokeLinejoin="round" />
            </svg>
            <img src={c.iconSrc} alt="" draggable={false}
              style={{
                width: 24, height: 24, objectFit: 'contain',
                /* v2.3.2160: the landscape dashboard's header is only two
                   slots wide, so five chips land ~23px each — narrower than
                   this fixed icon.  The cap lets the glyph shrink with its
                   chip there and is inert everywhere the chip is >= 28px
                   (portrait chips are one 63px slot each). */
                maxWidth: '86%',
                opacity: on ? 1 : 0.7, pointerEvents: 'none',
              }} />
          </div>
        );
      })}
    </div>
  );
};
