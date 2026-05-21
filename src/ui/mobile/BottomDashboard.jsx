import React, { useEffect, useRef, useState } from 'react';
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
  bg:        'rgba(13, 14, 22, 1)',
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
// PNG has dark padding baked into both ends; the Bar component
// over-stretches the image and clips the parent so the colored middle
// fills edge-to-edge with flat corners (no rounded pill).
//
// v=2.3.68: cache-bust suffix added because users reported the bars
// + toolbar icons missing in-game.  Cloudflare's edge had served the
// PNGs for ~weeks; the new ?v= query string forces a fresh fetch on
// every browser (the bytes haven't changed -- the suffix just busts
// the URL-based cache key).
const BAR_IMG = {
  hp:   '/icons/ui/bar-hp.png?v=2.3.68',
  mp:   '/icons/ui/bar-mp.png?v=2.3.68',
  stam: '/icons/ui/bar-stam.png?v=2.3.68',
  xp:   '/icons/ui/bar-xp.png?v=2.3.68',
};

// Toolbar icon source.  Each glyph is a separate PNG sliced from the
// user-supplied mockup screenshots by tools/slice_toolbar_icons.py
// (first batch) and tools/slice_more_icons.py (second batch).
const ICON_SRC = {
  inventory: '/icons/ui/bag.png?v=2.3.68',
  friends:   '/icons/ui/friends.png?v=2.3.68',
  codex:     '/icons/ui/codex.png?v=2.3.68',
  journey:   '/icons/ui/journey.png?v=2.3.68',
  map:       '/icons/ui/map.png?v=2.3.68',
  more:      '/icons/ui/more.png?v=2.3.68',
};

// 5 Tier-1 character stats shown in the middle dashboard column.
// Tooltip phrasing per GDD §1.2 — describes both the effect and the
// specific training source so the player knows what to do.
const CHAR_STATS = [
  { key: 'power',     label: 'Power',     short: 'POW', tip: 'Power — base weapon damage scaling. Trains by landing damage with melee or ranged weapons.' },
  { key: 'vitality',  label: 'Vitality',  short: 'VIT', tip: 'Vitality — health pool size. Trains by taking damage and surviving the fight.' },
  { key: 'endurance', label: 'Endurance', short: 'END', tip: 'Endurance — stamina pool size. Trains by spending stamina on dodge, block, or sprint.' },
  { key: 'agility',   label: 'Agility',   short: 'AGI', tip: 'Agility — move speed, dodge distance, and attack speed. Trains by successful dodges and movement under threat.' },
  { key: 'mind',      label: 'Mind',      short: 'MIN', tip: 'Mind — mana pool size and magic strength. Trains by spending mana on staff bolts and absorbing collision restores.' },
];

// 10 life skills — names match the canonical labels in BroTown.jsx
// (Woodcutting, Fishing, Mining, Cooking, Blacksmithing, Woodworking,
// Gem Cutting, Enchanting, Farming, Trapping).
const LIFE_SKILLS = [
  { key: 'cooking',       icon: '🍳', label: 'Cooking',       tip: 'Cooking — turn raw ingredients into stat-boosting food.' },
  { key: 'fishing',       icon: '🎣', label: 'Fishing',       tip: 'Fishing — catch fish from water tiles for cooking + alchemy.' },
  { key: 'mining',        icon: '⛏',  label: 'Mining',        tip: 'Mining — break ore + zone gems with a pickaxe.' },
  { key: 'woodcutting',   icon: '🪓', label: 'Woodcutting',   tip: 'Woodcutting — chop trees for logs and twigs.' },
  { key: 'farming',       icon: '🌾', label: 'Farming',       tip: 'Farming — plant + harvest crops on owned plots.' },
  { key: 'blacksmithing', icon: '🔨', label: 'Blacksmithing', tip: 'Blacksmithing — forge weapons, armour, tools.' },
  { key: 'woodworking',   icon: '🛠',  label: 'Woodworking',   tip: 'Woodworking — craft bows, staves, furniture from logs.' },
  { key: 'gemCutting',    icon: '💎', label: 'Gem Cutting',   tip: 'Gem Cutting — refine raw gems into polished sockets.' },
  { key: 'enchanting',    icon: '✨', label: 'Enchanting',    tip: 'Enchanting — infuse equipment with elemental effects.' },
  { key: 'trapping',      icon: '🪤', label: 'Trapping',      tip: 'Trapping — hunt animals + monsters with set traps.' },
];

// Tiny column-header used at the top of each of the three dashboard
// columns.  Centered above its column.
const ColHeader = ({ children }) => (
  <div style={{
    fontSize: 15,
    color: '#8890b8',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    padding: '0 2px 2px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}>{children}</div>
);

// Tooltip popup module — taps on stat / skill rows show a short
// description above the dashboard.  One active tooltip at a time;
// auto-dismisses after 3s or on next tap.
const Tooltip = ({ text, onClose }) => {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [text]);
  if (!text) return null;
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(var(--dash-h) + 12px)',
        transform: 'translateX(-50%)',
        maxWidth: '88vw',
        padding: '8px 12px',
        background: 'rgba(15, 17, 26, 0.96)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 8,
        color: '#E8EAF8',
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
        fontSize: 15,
        lineHeight: 1.3,
        zIndex: 36,
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      }}
    >
      {text}
    </div>
  );
};

// Stat bar — uses the mockup's clean rounded-capsule artwork.  We
// stretch the PNG to full width, slide a depletion overlay over the
// right-hand portion (sharp left edge, rounded right cap), and lay
// two text overlays on top: a metric label on the left and live
// current/max on the right.
const Bar = ({ label, cur, max, kind, tip, onTip }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const src = BAR_IMG[kind];
  return (
    <div
      onPointerUp={tip && onTip ? (e) => { e.stopPropagation(); onTip(tip); } : undefined}
      title={tip}
      style={{
        position: 'relative',
        width: '100%',
        height: 28,
        overflow: 'hidden',
        cursor: tip ? 'pointer' : 'default',
        touchAction: 'none',
      }}>
      <img
        src={src}
        alt={label}
        draggable={false}
        style={{
          position: 'absolute',
          top: 0,
          left: '-7%',
          width: '114%',
          height: '100%',
          objectFit: 'fill',
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
        fontSize: 15,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>{label}</span>
      {/* Live current / max (right side). */}
      <span style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 15,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>{Math.round(cur)} / {Math.round(max)}</span>
    </div>
  );
};

const IconButton = ({ glyph, label, active, onClick }) => {
  const src = ICON_SRC[glyph];
  // Use onPointerUp instead of onClick so iOS fires it even when
  // another finger is mid-drag on a joystick.  stopPropagation
  // prevents the event reaching the dashboard's outer pointerdown
  // handler (which only stops further bubbling, not local).
  const fire = (e) => { e.stopPropagation(); onClick && onClick(); };
  return (
    <button
      onPointerUp={fire}
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
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
        opacity: active ? 1 : 0.95,
        touchAction: 'none',
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
          imageRendering: 'auto',
        }}
      />
      <span style={{
        fontSize: 15,
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
  const [tooltip, setTooltip] = useState('');
  const dashRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => dashboardPanelBus.subscribe(() => force(v => v + 1)), []);
  /* Native non-passive touchmove preventDefault on the dashboard.
     Stops iOS from interpreting an upward swipe over the bars/buttons
     as a page pan -- which previously caused the dashboard area to
     shake (rubber-band / URL-bar transition).  React's synthetic
     onTouchMove is passive on some Safari versions so preventDefault
     there is ignored; this listener is explicitly passive: false.
     Touches that started inside a scrollable panel (overflow auto/scroll)
     are allowed to bubble untouched so panel content can still scroll. */
  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;
    const onMove = (e) => {
      let node = e.target;
      while (node && node !== el && node.nodeType === 1) {
        try {
          const cs = window.getComputedStyle(node);
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return;
        } catch (_) {}
        node = node.parentNode;
      }
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const stack = dashboardPanelBus.state.stack;
  const activeId = stack.length ? stack[stack.length - 1] : null;
  const active = activeId ? PANELS[activeId] : null;

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};

  const level = R.level || 1;
  const xp = R.xp || 0;
  // Use the canonical xpRequired curve so the dashboard's bar agrees
  // with the game-loop level-up threshold.
  const xpNeeded = xpRequired(level);
  // Use-trained build threshold per GDD §1.4 (5 T1 points per level).
  const buildThresh = Math.max(50, Math.floor(xpNeeded / 5));

  // Gold readout — moved from the bag panel into the top-right HUD so
  // the inventory grid has full vertical room.  Use the same fallback
  // chain the bag was using so cached vs canonical fields both work.
  const gold =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.coins || R.gold || 0;

  const Active = active?.Component;

  return (
    <>
      <Tooltip text={tooltip} onClose={() => setTooltip('')} />

      {/* Gold HUD — pinned to upper-right.  Always visible, even when
          a panel is open. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 6px)',
          zIndex: 30,
          background: COL.bg,
          border: `1px solid ${COL.border}`,
          borderRadius: 8,
          padding: '4px 10px',
          color: '#f5c542',
          fontFamily: 'Atkinson Hyperlegible, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '.04em',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
        <img
          src="/icons/popups/gold.png"
          alt=""
          style={{
            width: 18,
            height: 18,
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
        {Number(gold).toLocaleString()}
      </div>

    <div
      ref={dashRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: 'var(--dash-h)',
        background: COL.bg,
        borderTop: `1px solid ${COL.border}`,
        color: COL.text,
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom)',
        /* touch-action: none swallows browser default gestures (pan,
           zoom, swipe) on the dashboard chrome.  Inner scrollable panels
           use panelStyle.touchAction = 'pan-y' to opt back in to
           vertical scrolling. Without this, an accidental horizontal
           swipe on the dashboard area was being interpreted as a page
           pan and the viewport visibly juddered. */
        touchAction: 'none',
      }}
    >
      {active ? (
        <>
          {/* Header strip — back-chip (only on drilled child), title, ×. */}
          <div style={{
            height: 38,
            flex: '0 0 38px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            borderBottom: `1px solid ${COL.divider}`,
            gap: 8,
          }}>
            {stack.length > 1 && (
              <button
                onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.pop(); }}
                style={chipStyle}
              >◂</button>
            )}
            <div style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{active.title}</div>
            <button
              onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.clear(); }}
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
              {/* Left column — character portrait stacked over the
                  XP bar (v2.3.107).  HP / Mana / Energy now render as
                  the above-player Pixi HUD (v2.3.106), so this slot is
                  reserved for player identity + XP progression. */}
              <div style={{
                flex: 5,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                gap: 4,
              }}>
                <ColHeader>{S?.myName || 'Anon'} · Lv {level}</ColHeader>
                {/* Portrait -- fills the remaining vertical space
                    above the XP bar.  Pixel-art so use crisp
                    nearest-neighbor scaling. */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  overflow: 'hidden',
                }}>
                  <img
                    src="/icons/ui/profile.webp"
                    alt="Profile"
                    draggable={false}
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      borderRadius: 8,
                      border: `1px solid ${COL.border}`,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  />
                </div>
                {/* XP bar sits beneath the portrait. */}
                <div style={{ flexShrink: 0 }}>
                  <Bar label="XP" cur={xp} max={xpNeeded} kind="xp"
                    tip={`XP — combat experience. Fill to ${xpNeeded.toLocaleString()} to reach level ${level + 1}.`}
                    onTip={setTooltip} />
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
                    const prog = (R._buildProg && R._buildProg[s.key]) || 0;
                    const pct = Math.max(0, Math.min(100, (prog / buildThresh) * 100));
                    return (
                      <div key={s.key}
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(s.tip); }}
                        title={s.tip}
                        style={{
                          position: 'relative',
                          height: 22,
                          borderRadius: 3,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          touchAction: 'none',
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
                          padding: '0 6px',
                          fontSize: 15,
                        }}>
                          <span style={{ color: COL.text, letterSpacing: '.04em', fontWeight: 700 }}>{s.short}</span>
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
                      <div key={sk.key}
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(`${sk.label} · Lv ${lvl} — ${sk.tip.split('—').slice(1).join('—').trim()}`); }}
                        title={sk.tip}
                        style={{
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
                          cursor: 'pointer',
                          touchAction: 'none',
                        }}>
                        <span style={{ fontSize: 15, lineHeight: 1 }}>{sk.icon}</span>
                        <span style={{ color: COL.muted, fontWeight: 700, fontSize: 15 }}>{lvl}</span>
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
            <IconButton glyph="friends"   label="Friends"
              onClick={() => dashboardPanelBus.toggle('social')} />
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
    </>
  );
};

const chipStyle = {
  width: 32, height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: `1px solid ${COL.divider}`,
  borderRadius: 4,
  color: COL.text,
  fontFamily: 'inherit',
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  flex: '0 0 auto',
};
