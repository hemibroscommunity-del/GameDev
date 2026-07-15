import React from 'react';
import { COL } from '../dash/common.js';

/* v2.3.1319 (owner: "make the equipped and filters as ROW HEADERS to
   save room — I can't see the inventory slot rows anymore"): the
   v2.3.1315/1317 full-width header lines above the equipped row and
   the filter track cost ~40px the item grid needed on real devices.
   This rail is a spreadsheet-style row header: a 16px column of
   vertical text on the row's LEFT edge — zero added height.  The
   counts those headers carried become corner tags (CornerTag below)
   riding the row's top edge in the qty-badge language.

   Text reads top-to-bottom (writing-mode) at the 10px floor
   (v2.3.1239).  ABSOLUTE inside the row (host sets position:relative +
   paddingLeft:22): a flow rail STRETCHED the row to the rotated
   text's length (~62px for "EQUIPPED" vs ~51px slots — caught by the
   layout probe: the rows inflated and ate the tray's space, the exact
   bug this component exists to fix).  Absolute, the row's height comes
   from its content only; keep labels <= 6 chars ("Equip", "Recent",
   "Filter") so they center without clipping. */
export const RowRail = ({ text }) => (
  <span aria-hidden="true" style={{
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    writingMode: 'vertical-rl',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: COL.text2,
    lineHeight: 1,
    userSelect: 'none',
    pointerEvents: 'none',
  }}>{text}</span>
);

/* The row's count readout — a small tag pinned to the row's top-right
   corner, half-overlapping its top edge (legend style, no layout
   height).  Same visual family as .bt-item-qty. */
export const CornerTag = ({ text }) => (
  <span aria-hidden="true" style={{
    position: 'absolute',
    top: -6,
    right: 2,
    zIndex: 2,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: COL.text2,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    background: 'rgba(9,14,17,.92)',
    border: `1px solid ${COL.tileBor}`,
    borderRadius: 4,
    padding: '2px 5px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  }}>{text}</span>
);
