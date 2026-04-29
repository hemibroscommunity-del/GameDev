import React, { useEffect, useState } from 'react';
import { xpRequired } from '../../data/gameSystems.js';
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

// Bar artwork sliced from the user-supplied mockup screenshot.  Each
// PNG is the full-width rounded capsule with the metric label baked in.
// The image stretches to the dashboard's full width; an overlay handles
// the empty / depleted portion to the right of the fill.
const BAR_IMG = {
  hp:   '/icons/ui/bar-hp.png',
  mp:   '/icons/ui/bar-mp.png',
  stam: '/icons/ui/bar-stam.png',
  xp:   '/icons/ui/bar-xp.png',
};

// Toolbar icon source.  Each glyph is a separate PNG sliced from the
// user-supplied mockup screenshot by tools/slice_toolbar_icons.py.
const ICON_SRC = {
  inventory: '/icons/ui/bag.png',
  skills:    '/icons/ui/skills.png',
  codex:     '/icons/ui/codex.png',
  journey:   '/icons/ui/journey.png',
  map:       '/icons/ui/map.png',
  more:      '/icons/ui/more.png',
};

// 5 character stats shown in the middle dashboard column.
const CHAR_STATS = [
  { key: 'power',     label: 'POW' },
  { key: 'vitality',  label: 'VIT' },
  { key: 'endurance', label: 'END' },
  { key: 'agility',   label: 'AGI' },
  { key: 'mind',      label: 'MND' },
];

// 10 life skills shown in the right dashboard column.
const LIFE_SKILLS = [
  { key: 'cooking',       icon: '🍳' },
  { key: 'fishing',       icon: '🎣' },
  { key: 'farming',       icon: '🌾' },
  { key: 'blacksmithing', icon: '🔨' },
  { key: 'gemCutting',    icon: '💎' },
  { key: 'alchemy',       icon: '⚗' },
  { key: 'woodworking',   icon: '🪓' },
  { key: 'tailoring',     icon: '🧵' },
  { key: 'taming',        icon: '🐾' },
  { key: 'mining',        icon: '⛏' },
];

// Tiny column-header used at the top of each of the three dashboard
// columns (Combat / Build / Life Skills).
const ColHeader = ({ children }) => (
  <div style={{
    fontSize: 10,
    color: '#8890b8',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    padding: '0 2px 2px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}>{children}</div>
);

// Stat bar — uses the mockup's clean rounded-capsule artwork.  We
// stretch the PNG to full width, slide a depletion overlay over the
// right-hand portion (sharp left edge, rounded right cap), and lay
// two text overlays on top: a metric label on the left and live
// current/max on the right.
const Bar = ({ label, cur, max, kind }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const src = BAR_IMG[kind];
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 28,
    }}>
      <img
        src={src}
        alt={label}
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          borderRadius: 14,
        }}
      />
      {pct < 100 && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: pct + '%',
          right: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.72))',
          // Round only the right corners — the left edge is the visible
          // drain line and should be a sharp vertical cut, not a "U".
          borderTopRightRadius: 14,
          borderBottomRightRadius: 14,
          transition: 'left .15s linear',
          pointerEvents: 'none',
        }} />
      )}
      {/* Metric label (left side). */}
      <span style={{
        position: 'absolute',
        left: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'VT323, monospace',
      }}>{label}</span>
      {/* Live current / max (right side). */}
      <span style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'VT323, monospace',
      }}>{Math.round(cur)} / {Math.round(max)}</span>
    </div>
  );
};

const IconButton = ({ glyph, label, active, onClick }) => {
  const src = ICON_SRC[glyph];
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
        opacity: active ? 1 : 0.95,
      }}
    >
      <img
        src={src}
        alt={label}
        draggable={false}
        style={{
          width: 38,
          height: 38,
          objectFit: 'contain',
          // Smooth scaling — these are illustrations, not pixel art.
          imageRendering: 'auto',
        }}
      />
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
  // Use the canonical xpRequired curve so the dashboard's bar agrees
  // with the game-loop level-up threshold.
  const xpNeeded = xpRequired(level);
  // Per-stat soft cap used to scale the build progression mini-bars.
  const buildCap = Math.max(20, level * 5);

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
          {/* 3-column body with section headers; gold moved to the Bag. */}
          <div style={{
            flex: 1,
            padding: '4px 12px 6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
              {/* Left column — combat resource bars. */}
              <div style={{
                flex: 5,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}>
                <ColHeader>{S?.myName || 'Anon'} · Lv {level}</ColHeader>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'space-between' }}>
                  <Bar label="HP"     cur={hp}   max={maxHp}    kind="hp"   />
                  <Bar label="Mana"   cur={mp}   max={maxMp}    kind="mp"   />
                  <Bar label="Energy" cur={stam} max={maxStam}  kind="stam" />
                  <Bar label="XP"     cur={xp}   max={xpNeeded} kind="xp"   />
                </div>
              </div>

              {/* Middle column — build (5 character stats with progression). */}
              <div style={{
                flex: 2,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}>
                <ColHeader>Build</ColHeader>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2 }}>
                  {CHAR_STATS.map(s => {
                    const val = R[s.key] ?? 0;
                    const pct = Math.max(0, Math.min(100, (val / buildCap) * 100));
                    return (
                      <div key={s.key} style={{
                        position: 'relative',
                        height: 16,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          width: pct + '%',
                          background: 'linear-gradient(90deg, rgba(91,82,255,0.50), rgba(123,113,255,0.40))',
                          transition: 'width .15s linear',
                        }} />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0 5px',
                          fontSize: 11,
                        }}>
                          <span style={{ color: COL.muted, letterSpacing: '.04em' }}>{s.label}</span>
                          <span style={{ color: COL.text, fontWeight: 700 }}>{val}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column — 10 life skills with xp progression. */}
              <div style={{
                flex: 3,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}>
                <ColHeader>Life Skills</ColHeader>
                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gridTemplateRows: 'repeat(5, 1fr)',
                  gap: 2,
                }}>
                  {LIFE_SKILLS.map(sk => {
                    const lvl = (R.lifeSkills && R.lifeSkills[sk.key] && R.lifeSkills[sk.key].level) || 0;
                    return (
                      <div key={sk.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 3,
                        padding: '0 4px',
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: 11,
                        minHeight: 0,
                      }}>
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{sk.icon}</span>
                        <span style={{ color: COL.muted, fontWeight: 700 }}>{lvl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
