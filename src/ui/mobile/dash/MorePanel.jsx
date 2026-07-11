import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { controlsTutorialBus } from '../controlsTutorialBus.js';
import { COL, panelStyle } from './common.js';

// v2.3.1224: swapped to the UI Bible icon set (docs/UI-BIBLE.md Part 4,
// sliced by tools/process_icon_sheets.py); every tile has a real icon
// now (stats/t2/account/controls previously had only glyphs).  Falls
// back to glyph if the image fails.
const TILES = [
  { id: 'self',        src: '/icons/ui/panel-self.webp?v=2.3.1224',        label: 'Self',     glyph: '🪪' },
  { id: 'stats',       src: '/icons/ui/panel-stats.webp?v=2.3.1224',       label: 'Stats',    glyph: '📊' },
  /* v2.3.609: per-weapon-category build allocation (replaces generic specs). */
  { id: 't2',          src: '/icons/ui/panel-weapons.webp?v=2.3.1224',     label: 'Weapons',  glyph: '⚔️' },
  { id: 'leaderboard', src: '/icons/ui/panel-leaderboard.webp?v=2.3.1224', label: 'Ranks',    glyph: '🏆' },
  { id: 'clan',        src: '/icons/ui/panel-clan.webp?v=2.3.1224',        label: 'Clan',     glyph: '🛡' },
  { id: 'guild',       src: '/icons/ui/panel-guild.webp?v=2.3.1224',       label: 'Guild',    glyph: '⚒' },
  { id: 'feedback',    src: '/icons/ui/panel-feedback.webp?v=2.3.1224',    label: 'Feedback', glyph: '💬' },
  /* v2.3.1143: account panel -- Login Key display + device transfer. */
  { id: 'account',     src: '/icons/ui/panel-account.webp?v=2.3.1224',     label: 'Account',  glyph: '🔑' },
  { id: 'settings',    src: '/icons/ui/panel-settings.webp?v=2.3.1224',    label: 'Settings', glyph: '⚙' },
  /* v2.3.225: opens the annotated controls tutorial via its bus
     instead of pushing a dashboard panel. */
  { id: 'controls',    src: '/icons/ui/panel-controls.webp?v=2.3.1224',    label: 'Controls', glyph: '?' },
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
