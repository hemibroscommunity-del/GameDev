import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COL, panelStyle } from './common.js';

// v2.3.1224: swapped to the UI Bible icon set (docs/UI-BIBLE.md Part 4,
// sliced by tools/process_icon_sheets.py); every tile has a real icon.
// Falls back to glyph if the image fails.
/* v2.3.1291 (ChatGPT round-3 §1, owner-approved): More owns genuinely
   SECONDARY systems only — six tiles.  Self / Stats / Build left (Hero
   owns identity, stats and build now; Build stays reachable as Hero's
   spend flow).  Account / Controls / Feedback folded into Settings.
   Clan and Guild both stay: they are genuinely different server
   systems (clans = player groups/wars; guilds = profession guilds
   with sponsorship).  MoreCompact renders this same list 3x2 — one
   roster, no drift. */
export const TILES = [
  { id: 'journey',     src: '/icons/ui/journey.webp?v=2.3.1224',           label: 'Journey',  glyph: '🛤', group: 'Progress' },
  { id: 'encyclopedia', src: '/icons/ui/panel-encyclopedia.webp?v=2.3.1224', label: 'Codex',  glyph: '📚', group: 'Progress' },
  { id: 'leaderboard', src: '/icons/ui/panel-leaderboard.webp?v=2.3.1224', label: 'Ranks',    glyph: '🏆', group: 'Progress' },
  { id: 'clan',        src: '/icons/ui/panel-clan.webp?v=2.3.1224',        label: 'Clan',     glyph: '🛡', group: 'Community' },
  { id: 'guild',       src: '/icons/ui/panel-guild.webp?v=2.3.1224',       label: 'Guild',    glyph: '⚒', group: 'Community' },
  { id: 'settings',    src: '/icons/ui/panel-settings.webp?v=2.3.1224',    label: 'Settings', glyph: '⚙', group: 'System' },
];

const GROUPS = ['Progress', 'Community', 'System'];

const secHdr = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.10em',
  textTransform: 'uppercase',
  color: COL.muted,
  padding: '10px 4px 4px',
};

/* v2.3.1291: the expanded launcher is GROUPED (round-3 §4 More):
   short headings, three-column rows of the same bare icon+label
   buttons (v2.3.1235 correction: no outline/fill — the icon is the
   identity).  Every id/handler/src unchanged. */
export const MorePanel = () => (
  <div style={panelStyle}>
    {GROUPS.map(g => (
      <div key={g}>
        <div style={secHdr}>{g}</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {TILES.filter(t => t.group === g).map(t => (
            <button
              key={t.id}
              onPointerUp={(e) => {
                e.stopPropagation();
                dashboardPanelBus.push(t.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px 2px',
                minHeight: 64,
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
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: 22 }}>{t.glyph}</span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: COL.text2 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);
