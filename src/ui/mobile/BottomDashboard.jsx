import React, { useEffect, useState } from 'react';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { InventoryPanel }    from './dash/InventoryPanel.jsx';
import { SelfPanel }         from './dash/SelfPanel.jsx';
import { JourneyPanel }      from './dash/JourneyPanel.jsx';
import { MapPanel }          from './dash/MapPanel.jsx';
import { SocialPanel }       from './dash/SocialPanel.jsx';
import { MorePanel }         from './dash/MorePanel.jsx';
import { StatsPanel }        from './dash/StatsPanel.jsx';
import { SkillsPanel }       from './dash/SkillsPanel.jsx';
import { EncyclopediaPanel } from './dash/EncyclopediaPanel.jsx';
import { GuildPanel }        from './dash/GuildPanel.jsx';
import { LeaderboardPanel }  from './dash/LeaderboardPanel.jsx';
import { ClanPanel }         from './dash/ClanPanel.jsx';
import { FeedbackPanel }     from './dash/FeedbackPanel.jsx';
import { SettingsPanel }     from './dash/SettingsPanel.jsx';

// Bottom-of-screen dashboard.  Replaces the radial UtilityWheel.
// When idle it renders character stats + a 7-icon row.  When the user
// taps any toolbar icon, the dashboard swaps in a panel component that
// occupies the full 25vh band and the icon row hides.

const COL = {
  bg:        'rgba(13, 14, 22, 0.92)',
  border:    'rgba(255, 255, 255, 0.10)',
  divider:   'rgba(255, 255, 255, 0.06)',
  text:      '#E8EAF8',
  muted:     '#8890b8',
  hp:        '#ff5e6c',
  stam:      '#f5c542',
  mp:        '#3b82f6',
  xp:        '#3ddc97',
  gold:      '#f5c542',
};

// Per-stat colour pairs for the chunky bars — top of the gradient is the
// glossy highlight, bottom is the shadow.
const BAR_COLORS = {
  hp:   { top: '#ff8b94', mid: '#ff5e6c', bot: '#b8323d' },
  mp:   { top: '#7aaff8', mid: '#3b82f6', bot: '#1d54b3' },
  stam: { top: '#fad97a', mid: '#f5c542', bot: '#a98005' },
  xp:   { top: '#7eedb8', mid: '#3ddc97', bot: '#1f8a5c' },
};

// Toolbar icon source.  Single composite PNG — the dashboard mockup the
// user supplied — sliced via CSS background-position into seven equal
// columns.  If the file isn't there yet, buttons fall back to readable
// labels alone (no broken-image glyph).
const SPRITE_URL = '/icons/ui/dashboard-mockup.png';

// Icon column index for each toolbar slot.
const ICON_INDEX = {
  inventory: 0,
  stats:     1,
  skills:    2,
  codex:     3,
  journey:   4,
  map:       5,
  more:      6,
};

// Sprite tuning constants. Source image is roughly 1500 × 700; the
// toolbar strip occupies the bottom ~33 % of the image and is split
// into 7 equal columns.  These percentages mask off the label captions
// baked into the screenshot — adjust if the saved file's exact aspect
// ratio differs.
const SPRITE_BG_SIZE = '700% auto';
const SPRITE_BG_Y    = '78%';

const iconSpriteStyle = (idx) => ({
  width: 36,
  height: 36,
  backgroundImage: `url(${SPRITE_URL})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: SPRITE_BG_SIZE,
  // i out of 0..6 — pan through the 600 % overflow.
  backgroundPosition: `${(idx / 6) * 100}% ${SPRITE_BG_Y}`,
  // Smooth scaling — these are illustrations, not pixel art.
  imageRendering: 'auto',
});

// Chunky stat bar (HP / MP / STA / XP) matching the user's mockup:
// rounded ~24 px, glossy gradient, label embedded centred, current/max
// floated above-right of the strip.
const Bar = ({ label, cur, max, kind, showNumbers = true }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const c = BAR_COLORS[kind];
  return (
    <div style={{ marginBottom: 3 }}>
      {showNumbers && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: COL.muted,
          height: 11,
          lineHeight: '11px',
        }}>
          <span>{label}</span>
          <span>{Math.round(cur)} / {Math.round(max)}</span>
        </div>
      )}
      <div style={{
        position: 'relative',
        height: 22,
        background: 'rgba(0,0,0,.45)',
        borderRadius: 11,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,.5)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,.06)',
      }}>
        {/* Filled portion — glossy gradient. */}
        <div style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: pct + '%',
          background: `linear-gradient(180deg, ${c.top} 0%, ${c.mid} 50%, ${c.bot} 100%)`,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,.35), inset 0 -2px 4px rgba(0,0,0,.35)',
          transition: 'width .15s linear',
        }} />
        {/* Embedded centred label. */}
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '.06em',
          textShadow: '0 1px 2px rgba(0,0,0,.7), 0 0 1px rgba(0,0,0,.9)',
          pointerEvents: 'none',
        }}>{label}</span>
      </div>
    </div>
  );
};

const IconButton = ({ glyph, label, active, onClick }) => {
  const idx = ICON_INDEX[glyph];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 0',
        background: active ? 'rgba(91,82,255,0.18)' : 'transparent',
        border: 'none',
        borderRight: `1px solid ${COL.divider}`,
        color: COL.text,
        cursor: 'pointer',
        fontFamily: 'VT323, monospace',
        opacity: active ? 1 : 0.92,
      }}
    >
      <div style={iconSpriteStyle(idx)} aria-label={label} />
      <span style={{
        fontSize: 10,
        color: active ? '#a8a4ff' : COL.muted,
        letterSpacing: '.04em',
      }}>{label}</span>
    </button>
  );
};

// Map of panel id → { title, Component }.  Children pushed onto the stack
// from MorePanel use the same registry, which is why MorePanel doesn't
// hard-code its child component refs.
const PANELS = {
  inventory:    { title: 'Bag',         Component: InventoryPanel },
  self:         { title: 'Self',        Component: SelfPanel },
  journey:      { title: 'Journey',     Component: JourneyPanel },
  map:          { title: 'Map',         Component: MapPanel },
  social:       { title: 'Social',      Component: SocialPanel },
  more:         { title: 'More',        Component: MorePanel },
  stats:        { title: 'Stats',       Component: StatsPanel },
  skills:       { title: 'Skills',      Component: SkillsPanel },
  encyclopedia: { title: 'Codex',       Component: EncyclopediaPanel },
  guild:        { title: 'Guild',       Component: GuildPanel },
  leaderboard:  { title: 'Leaderboard', Component: LeaderboardPanel },
  clan:         { title: 'Clan',        Component: ClanPanel },
  feedback:     { title: 'Feedback',    Component: FeedbackPanel },
  settings:     { title: 'Settings',    Component: SettingsPanel },
};

export const BottomDashboard = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => dashboardPanelBus.subscribe(() => force(v => v + 1)), []);

  const stack = dashboardPanelBus.state.stack;
  const activeId = stack.length ? stack[stack.length - 1] : null;
  const active = activeId ? PANELS[activeId] : null;

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};

  const hp = R.hp ?? 0, maxHp = R.maxHp || 1;
  const mp = R.mana ?? 0, maxMp = R.maxMana || 1;
  const stam = R.stamina ?? 0, maxStam = R.maxStamina || 1;
  const level = R.level || 1;
  const xp = R.xp || 0;
  const xpReq = (typeof R._xpReq === 'function') ? R._xpReq(level) : null;
  const xpNeeded = xpReq || (50 + level * level * 25);
  const goldEarned =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.gold || 0;

  const Active = active?.Component;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: '25vh',
        background: COL.bg,
        borderTop: `1px solid ${COL.border}`,
        color: COL.text,
        fontFamily: 'VT323, monospace',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {active ? (
        <>
          {/* Header strip — back-chip (only on drilled child), title, ×. */}
          <div style={{
            height: 32,
            flex: '0 0 32px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            borderBottom: `1px solid ${COL.divider}`,
            gap: 8,
          }}>
            {stack.length > 1 && (
              <button
                onClick={() => dashboardPanelBus.pop()}
                style={chipStyle}
              >◂</button>
            )}
            <div style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{active.title}</div>
            <button
              onClick={() => dashboardPanelBus.clear()}
              style={chipStyle}
            >×</button>
          </div>
          {Active && <Active />}
        </>
      ) : (
        <>
          {/* Stats — top portion. */}
          <div style={{
            flex: 1,
            padding: '8px 14px 6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.04em' }}>
                {S?.myName || 'Anon'}
                <span style={{ color: COL.muted, marginLeft: 8, fontSize: 12 }}>Lv {level}</span>
              </div>
              <div style={{ fontSize: 12, color: COL.gold }}>
                🪙 {goldEarned.toLocaleString()}
              </div>
            </div>

            <Bar label="HP"  cur={hp}   max={maxHp}   kind="hp"   showNumbers={false} />
            <Bar label="MP"  cur={mp}   max={maxMp}   kind="mp" />
            <Bar label="STA" cur={stam} max={maxStam} kind="stam" />
            <Bar label={`XP — Lv ${level}`} cur={xp} max={xpNeeded} kind="xp" />
          </div>

          {/* Icon row — bottom 30% of dashboard. */}
          <div style={{
            height: '30%',
            minHeight: 56,
            borderTop: `1px solid ${COL.divider}`,
            display: 'flex',
            alignItems: 'stretch',
          }}>
            <IconButton glyph="inventory" label="Bag"
              onClick={() => dashboardPanelBus.toggle('inventory')} />
            <IconButton glyph="stats"     label="Stats"
              onClick={() => dashboardPanelBus.toggle('stats')} />
            <IconButton glyph="skills"    label="Skills"
              onClick={() => dashboardPanelBus.toggle('skills')} />
            <IconButton glyph="codex"     label="Codex"
              onClick={() => dashboardPanelBus.toggle('encyclopedia')} />
            <IconButton glyph="journey"   label="Journey"
              onClick={() => dashboardPanelBus.toggle('journey')} />
            <IconButton glyph="map"       label="Map"
              onClick={() => dashboardPanelBus.toggle('map')} />
            <IconButton glyph="more"      label="More"
              onClick={() => dashboardPanelBus.toggle('more')} />
          </div>
        </>
      )}
    </div>
  );
};

const chipStyle = {
  width: 24, height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: `1px solid ${COL.divider}`,
  borderRadius: 4,
  color: COL.text,
  fontFamily: 'inherit',
  fontSize: 16,
  cursor: 'pointer',
  flex: '0 0 auto',
};
