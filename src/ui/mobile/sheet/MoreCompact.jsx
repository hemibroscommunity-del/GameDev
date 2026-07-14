import React from 'react';
import { COL } from '../dash/common.js';
import { TILES } from '../dash/MorePanel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1288: More compact (nav-system PR B).  v2.3.1291 (ChatGPT
   round-3 §2/§4): the twelve-tile micro-grid is gone — More owns six
   SECONDARY destinations now, shown 3x2 with launcher-scale icons
   (32px) and 12px labels.  Six strong choices is a glance; twelve
   equal ones wasn't.  Same TILES roster as the expanded grouped
   launcher — one list in code, no drift.  Tapping a tile drills
   straight into that panel (expanded, back-chip returns). */
export const MoreCompact = () => (
  <div style={{
    flex: 1, minHeight: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 4,
    padding: '6px 12px 2px',
    fontFamily: 'Source Sans 3, sans-serif',
  }}>
    {TILES.map(t => (
      <button
        key={t.id}
        onPointerUp={(e) => {
          e.stopPropagation();
          dashboardPanelBus.push(t.id);
        }}
        /* Bare icon+label buttons per the v2.3.1235 launcher correction
           (the icon is the identity — no outline/fill). */
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          padding: 0,
          minWidth: 44,
          minHeight: 44,
          color: COL.text,
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {t.src ? (
          <img
            src={t.src}
            alt={t.label}
            draggable={false}
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 22 }}>{t.glyph}</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: COL.text2, whiteSpace: 'nowrap' }}>{t.label}</span>
      </button>
    ))}
  </div>
);
