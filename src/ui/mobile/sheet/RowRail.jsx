import React from 'react';
import { COL } from '../dash/common.js';

/* v2.3.1319 introduced vertical text rails as row headers; v2.3.1320
   (owner: "understood without using language") retired them — the
   equip/filter meanings moved onto per-tile icon badges (SlotTile
   wornSrc, the per-chip funnel in InventoryPanel).  What remains here
   is the row's count readout — a small tag pinned to the row's
   top-right corner, half-overlapping its top edge (legend style, no
   layout height), numbers only.  Same visual family as .bt-item-qty. */
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
