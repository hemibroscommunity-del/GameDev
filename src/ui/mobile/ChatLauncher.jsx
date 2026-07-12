import React, { useEffect, useState } from 'react';
import { chatBubbleBus } from './chatBubbleBus.js';

// A small, intentionally low-contrast chat icon pinned at the
// bottom-center of the playfield (just above the dashboard).  Tapping it
// toggles the floating ChatBubble — including closing it again.
export const ChatLauncher = () => {
  const [, force] = useState(0);
  useEffect(() => chatBubbleBus.subscribe(() => force(v => v + 1)), []);
  const open = chatBubbleBus.open;

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => chatBubbleBus.toggle()}
      aria-label="Chat"
      style={{
        position: 'fixed',
        // Pinned to the far right of the playfield, same vertical band as
        // the weapon-swap bar (which now occupies the old bottom-centre slot).
        right: 16,
        bottom: 'calc(var(--dash-h) + 16px)',
        /* v2.3.1233: Lantern Slate world-HUD circle button — 44×44 (spec §10
           back/zone button), rgba(17,25,29,.88) fill + strong border, and the
           §10 opacity ladder (.62 rest / .92 engaged) instead of .45/.95. */
        /* v2.3.1235: batch-4 rollout — corrected world-chrome tokens
           (rgba(13,22,27,.88) fill, strong hairline, text-2 glyph). */
        width: 44,
        height: 44,
        padding: 0,
        background: 'rgba(13,22,27,.88)',
        border: '1px solid rgba(229,237,233,.20)',
        borderRadius: '50%',
        // Grayed out when closed, full-strength when the bubble is open.
        opacity: open ? 0.92 : 0.62,
        color: '#B6C1BE',
        cursor: 'pointer',
        zIndex: 35,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity .15s',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-12 6.93L4 20l1.07-5A8 8 0 1 1 21 12z" />
      </svg>
    </button>
  );
};
