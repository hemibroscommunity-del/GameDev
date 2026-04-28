import React, { useEffect, useState } from 'react';
import { chatBubbleBus } from './chatBubbleBus.js';
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
// taps any toolbar icon (except Chat), the dashboard swaps in a panel
// component that occupies the full 25vh band and the icon row hides.

const ICON_STROKE = '#E8EAF8';
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

const ICONS = {
  chat:       'M21 12a8 8 0 0 1-12 6.93L4 20l1.07-5A8 8 0 1 1 21 12z',
  inventory:  'M4 7h16v12H4z M8 7V5a4 4 0 0 1 8 0v2',
  self:       'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
  journey:    'M4 6h16M4 12h16M4 18h10',
  map:        'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16',
  social:     'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21v-1a8 8 0 0 1 16 0v1M19 8v6M22 11h-6',
  more:       'M5 12a1 1 0 1 0 .01 0M12 12a1 1 0 1 0 .01 0M19 12a1 1 0 1 0 .01 0',
};

const Icon = ({ d, size = 22, color = ICON_STROKE }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Bar = ({ label, cur, max, color, showNumbers = true }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: COL.muted, marginBottom: 2,
      }}>
        <span style={{ fontWeight: 700, color: COL.text }}>{label}</span>
        {showNumbers && <span>{Math.round(cur)} / {Math.round(max)}</span>}
      </div>
      <div style={{
        height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: pct + '%', height: '100%', background: color,
          transition: 'width .15s linear',
        }} />
      </div>
    </div>
  );
};

const IconButton = ({ glyph, label, active, onClick }) => (
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
    }}
  >
    <Icon d={ICONS[glyph]} size={22} color={active ? '#a8a4ff' : ICON_STROKE} />
    <span style={{ fontSize: 10, color: active ? '#a8a4ff' : COL.muted, letterSpacing: '.04em' }}>{label}</span>
  </button>
);

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
            padding: '10px 14px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.04em' }}>
                {S?.myName || 'You'}
                <span style={{ color: COL.muted, marginLeft: 8, fontSize: 12 }}>Lv {level}</span>
              </div>
              <div style={{ fontSize: 12, color: COL.gold }}>
                🪙 {goldEarned.toLocaleString()}
              </div>
            </div>

            <Bar label="HP"  cur={hp}   max={maxHp}   color={COL.hp} />
            <Bar label="MP"  cur={mp}   max={maxMp}   color={COL.mp} />
            <Bar label="STA" cur={stam} max={maxStam} color={COL.stam} />
            <Bar label={`XP — Lv ${level}`} cur={xp} max={xpNeeded} color={COL.xp} />
          </div>

          {/* Icon row — bottom 30% of dashboard. */}
          <div style={{
            height: '30%',
            minHeight: 56,
            borderTop: `1px solid ${COL.divider}`,
            display: 'flex',
            alignItems: 'stretch',
          }}>
            <IconButton glyph="chat"      label="Chat"
              onClick={() => chatBubbleBus.toggle()} />
            <IconButton glyph="inventory" label="Bag"
              onClick={() => dashboardPanelBus.toggle('inventory')} />
            <IconButton glyph="self"      label="Self"
              onClick={() => dashboardPanelBus.toggle('self')} />
            <IconButton glyph="journey"   label="Journey"
              onClick={() => dashboardPanelBus.toggle('journey')} />
            <IconButton glyph="map"       label="Map"
              onClick={() => dashboardPanelBus.toggle('map')} />
            <IconButton glyph="social"    label="Social"
              onClick={() => dashboardPanelBus.toggle('social')} />
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
