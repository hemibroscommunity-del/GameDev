import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COL, panelStyle } from './common.js';

const TILES = [
  { id: 'self',         glyph: '🪪', label: 'Self' },
  { id: 'social',       glyph: '👥', label: 'Social' },
  { id: 'leaderboard',  glyph: '🏆', label: 'Ranks' },
  { id: 'clan',         glyph: '🛡',  label: 'Clan' },
  { id: 'guild',        glyph: '⚒',  label: 'Guild' },
  { id: 'feedback',     glyph: '💬', label: 'Feedback' },
  { id: 'settings',     glyph: '⚙',  label: 'Settings' },
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
          onClick={() => dashboardPanelBus.push(t.id)}
          style={{
            background: COL.tile,
            border: `1px solid ${COL.tileBor}`,
            borderRadius: 6,
            padding: '6px 4px',
            color: COL.text,
            fontFamily: 'VT323, monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20 }}>{t.glyph}</span>
          <span style={{ fontSize: 11, color: COL.muted }}>{t.label}</span>
        </button>
      ))}
    </div>
  </div>
);
