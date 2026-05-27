import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { controlsTutorialBus } from '../controlsTutorialBus.js';
import { COL, panelStyle } from './common.js';

// Sliced from public/icons/ui/dashboard-mockup-new0.jpg via
// tools/slice_more_icons.py.  Falls back to glyph if the image fails.
const TILES = [
  { id: 'self',        src: '/icons/ui/playercard.png',  label: 'Self',     glyph: '🪪' },
  { id: 'stats',       src: null,                        label: 'Stats',    glyph: '📊' },
  /* v2.3.235: Tier 2 specs allocation. */
  { id: 't2',          src: null,                        label: 'Specs',    glyph: '✦' },
  { id: 'leaderboard', src: '/icons/ui/leaderboard.png', label: 'Ranks',    glyph: '🏆' },
  { id: 'clan',        src: '/icons/ui/clan.png',        label: 'Clan',     glyph: '🛡' },
  { id: 'guild',       src: '/icons/ui/guild.png',       label: 'Guild',    glyph: '⚒' },
  { id: 'feedback',    src: '/icons/ui/feedback.png',    label: 'Feedback', glyph: '💬' },
  { id: 'settings',    src: '/icons/ui/settings.png',    label: 'Settings', glyph: '⚙' },
  /* v2.3.225: opens the annotated controls tutorial via its bus
     instead of pushing a dashboard panel. */
  { id: 'controls',    src: null,                        label: 'Controls', glyph: '?' },
];

export const MorePanel = () => (
  <div style={panelStyle}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 6,
    }}>
      {TILES.map(t => (
        <button
          key={t.id}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (t.id === 'controls') controlsTutorialBus.open();
            else dashboardPanelBus.push(t.id);
          }}
          style={{
            background: COL.tile,
            border: `1px solid ${COL.tileBor}`,
            borderRadius: 6,
            padding: '6px 4px',
            color: COL.text,
            fontFamily: 'Source Sans 3, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 20 }}>{t.glyph}</span>
          )}
          <span style={{ fontSize: 15, color: COL.muted }}>{t.label}</span>
        </button>
      ))}
    </div>
  </div>
);
