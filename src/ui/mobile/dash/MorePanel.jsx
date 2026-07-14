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
  /* v2.3.1236: owner feedback — Weapons menu renamed Build (label only;
     the t2 id and the panel-weapons icon asset keep their names). */
  { id: 't2',          src: '/icons/ui/panel-weapons.webp?v=2.3.1224',     label: 'Build',    glyph: '⚔️' },
  /* v2.3.1265: Journey + Codex demoted from the 5-button toolbar. */
  { id: 'journey',     src: '/icons/ui/journey.webp?v=2.3.1224',           label: 'Journey',  glyph: '🛤' },
  { id: 'encyclopedia', src: '/icons/ui/panel-encyclopedia.webp?v=2.3.1224', label: 'Codex',  glyph: '📚' },
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
    {/* v2.3.1235: owner-approved correction — 4-across outlined tiles read
        as ten noisy boxes; the launcher is now a balanced 5×2 grid of BARE
        icon+label buttons (no permanent outline/fill — the icon is the
        identity), gaps on the 8px grid. Every id/handler/src unchanged. */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8,
    }}>
      {TILES.map(t => (
        <button
          key={t.id}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (t.id === 'controls') controlsTutorialBus.open();
            else dashboardPanelBus.push(t.id);
          }}
          /* v2.3.1235: bare button — no outline/fill/shadow (the raised
             boxes are gone per the correction pass); radius kept so any
             future :active tint has a shape, ≥44pt column stays tappable. */
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: 10,
            padding: '8px 2px',
            minHeight: 60,
            minWidth: 44,
            color: COL.text,
            fontFamily: 'Source Sans 3, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          {t.src ? (
            <img
              src={t.src}
              alt={t.label}
              draggable={false}
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 20 }}>{t.glyph}</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: COL.text2 }}>{t.label}</span>
        </button>
      ))}
    </div>
  </div>
);
