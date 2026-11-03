import React from 'react';
import { REVEAL_BLUE } from '@/game/revealBag.js';

/* ═══ v2.3.4012: THE "?" OVER A MYSTERY PIECE IN THE BAG ═══
 * The bag tile and the item card draw a piece still waiting to be revealed
 * (game/revealBag.js) as the reveal itself does (RevealOverlay.jsx): its own
 * picture as a dark silhouette, a question mark over it in the rare blue.
 * No new art and no new texture: a CSS filter on the picture already loaded
 * and one character of text (the memory law costs nothing here).  Not
 * interactive: the tap goes through to the tile or card under it. */
export const UnrevealedMark = ({ size = 22 }) => (
  <span aria-hidden="true" data-unrevealed-mark="" style={{
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size, fontWeight: 900, lineHeight: 1,
    color: REVEAL_BLUE,
    textShadow: '0 2px 6px rgba(0,0,0,.9)',
    pointerEvents: 'none',
    touchAction: 'manipulation',
  }}>?</span>
);
