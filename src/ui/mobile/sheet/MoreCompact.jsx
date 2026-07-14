import React from 'react';
import { COL } from '../dash/common.js';
import { TILES } from '../dash/MorePanel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { controlsTutorialBus } from '../controlsTutorialBus.js';

/* v2.3.1288: More compact (nav-system PR B) — the whole launcher at a
   glance: the same 12 tiles as the expanded 5×2 grid (dash/MorePanel
   TILES, one shared list), packed 6×2 to match the compact band's grid
   rhythm.  Tapping a tile pushes its child panel, which is a drill and
   therefore opens expanded (bus.push) — same handlers as the panel.
   slice(0, 12) is a guard: a 13th tile must not wrap a third row into
   the fixed-height band (it stays reachable in the expanded grid). */
export const MoreCompact = () => (
  <div style={{
    flex: 1, minHeight: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 4,
    padding: '6px 8px 2px',
    fontFamily: 'Source Sans 3, sans-serif',
  }}>
    {TILES.slice(0, 12).map(t => (
      <button
        key={t.id}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (t.id === 'controls') controlsTutorialBus.open();
          else dashboardPanelBus.push(t.id);
        }}
        /* Bare icon+label buttons per the v2.3.1235 launcher correction
           (the icon is the identity — no outline/fill). */
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          padding: 0,
          minWidth: 0,
          minHeight: 0,
          color: COL.text,
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {t.src ? (
          <img
            src={t.src}
            alt={t.label}
            draggable={false}
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 18 }}>{t.glyph}</span>
        )}
        {/* 10px floor (v2.3.1239) — smallest legal label. */}
        <span style={{ fontSize: 10, fontWeight: 600, color: COL.text2, whiteSpace: 'nowrap' }}>{t.label}</span>
      </button>
    ))}
  </div>
);
