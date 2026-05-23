import React, { useEffect, useRef, useState } from 'react';
import { xpRequired, calcMaxHp, calcMaxStam, calcMaxMana, calcCritChance, calcBlockReduction, WEAPON_TYPES, SWING_COOLDOWN, getActiveWeapon } from '../../data/gameSystems.js';
import { skillXpRequired } from '../../data/items.js';
import { ZONES } from '../../data/zones.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { weaponSwapBus } from './weaponSwapBus.js';
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
  hp:   '/icons/ui/bar-hp.png?v=2.3.115',
  mp:   '/icons/ui/bar-mp.png?v=2.3.115',
  stam: '/icons/ui/bar-stam.png?v=2.3.115',
  xp:   '/icons/ui/bar-xp.png?v=2.3.115',
};

// Toolbar icon source.  Each glyph is a separate PNG sliced from the
// user-supplied mockup screenshots by tools/slice_toolbar_icons.py
// (first batch) and tools/slice_more_icons.py (second batch).
const ICON_SRC = {
  inventory: '/icons/ui/bag.png?v=2.3.115',
  friends:   '/icons/ui/friends.png?v=2.3.115',
  codex:     '/icons/ui/codex.png?v=2.3.115',
  journey:   '/icons/ui/journey.png?v=2.3.115',
  map:       '/icons/ui/map.png?v=2.3.115',
  more:      '/icons/ui/more.png?v=2.3.115',
};

// 5 Tier-1 character stats shown in the middle dashboard column.
// Tooltip phrasing per GDD §1.2 — describes both the effect and the
// specific training source so the player knows what to do.
const CHAR_STATS = [
  { key: 'power',     label: 'Power',     short: 'POW', iconSrc: '/icons/popups/sword.png?v=2.3.109',                       pixelated: false, iconScale: 1.0, tip: 'Power — melee weapon damage scaling. Trains by landing damage with sword / greatsword.' },
  /* v2.3.112 applied iconScale 1.4 to compensate for the heart's
     padded crop in the old 2-col Build grid.  v2.3.126: the merged
     3x5 grid cells are ~33% column width, so the 1.4x heart overflowed
     and pushed its value text off-center.  Back to 1.0 — the cell
     layout below now centers the value regardless of icon size. */
  { key: 'vitality',  label: 'Vitality',  short: 'VIT', iconSrc: '/icons/popups/heart.png?v=2.3.112',                       pixelated: true,  iconScale: 1.0, tip: 'Vitality — health pool size. Trains by taking damage and surviving the fight.' },
  { key: 'endurance', label: 'Endurance', short: 'END', iconSrc: '/sprites/shields/wood-shield-front.png?v=2.1.23',         pixelated: false, iconScale: 1.0, tip: 'Endurance — stamina pool size. Trains by spending stamina on dodge, block, or sprint.' },
  { key: 'agility',   label: 'Agility',   short: 'AGI', iconSrc: '/icons/popups/arrow.png?v=2.3.109',                       pixelated: false, iconScale: 1.0, tip: 'Agility — bow damage + move speed, dodge distance, attack speed. Trains by successful dodges and ranged hits.' },
  { key: 'mind',      label: 'Mind',      short: 'MIN', iconSrc: '/icons/popups/spell.png?v=2.3.109',                       pixelated: false, iconScale: 1.0, tip: 'Mind — staff (magic) damage + mana pool size. Trains by spending mana on staff bolts.' },
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
    /* v2.3.114: -1 fontSize + white text per "everything white". */
    fontSize: 14,
    color: '#E8EAF8',
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
        fontFamily: 'Source Sans 3, sans-serif',
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
        fontFamily: 'Source Sans 3, sans-serif',
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
        fontFamily: 'Source Sans 3, sans-serif',
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
        fontFamily: 'Source Sans 3, sans-serif',
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
        /* v2.3.114: -1 fontSize + inactive labels white. */
        fontSize: 14,
        color: active ? '#a8a4ff' : COL.text,
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
  // Use-trained build threshold (v2.3.113: 5x slower; must mirror
  // BroTown.jsx's threshold formula so the progress fill matches the
  // actual level-up trigger).
  const buildThresh = Math.max(200, Math.floor(xpNeeded));

  // Gold readout — moved from the bag panel into the top-right HUD so
  // the inventory grid has full vertical room.  Use the same fallback
  // chain the bag was using so cached vs canonical fields both work.
  const gold =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.coins || R.gold || 0;

  const Active = active?.Component;

  /* v2.3.114: thin XP strip pinned across the screen flush above the
     bottom dashboard.  Replaces the XP Bar that used to live in the
     bottom-left column so the column can fully host the derived
     combat stats.  zIndex 29 keeps it under the interact-prompt (35)
     and the WeaponSwapBar (35) so it's purely decorative. */
  const xpPct = xpNeeded > 0 ? Math.max(0, Math.min(100, (xp / xpNeeded) * 100)) : 0;

  return (
    <>
      <Tooltip text={tooltip} onClose={() => setTooltip('')} />

      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: 'var(--dash-h)',
        /* v2.3.115: height 6 -> 8 + inner shadow so the XP strip reads
           as a deliberate UI element rather than a thin trim line. */
        height: 8,
        background: 'rgba(0,0,0,0.55)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.35)',
        zIndex: 29,
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: xpPct + '%',
          height: '100%',
          background: 'linear-gradient(90deg, #3ddc97, #5be3aa)',
          transition: 'width .15s linear',
        }} />
      </div>

      {/* Upper-LEFT identity card — 80px portrait + HP/MP/Energy pills.
          v2.3.130: replaces the dashboard's far-left vitals column.
          Pills show current/max live so the player tracks their
          combat resources without scanning the bottom band. */}
      {(() => {
        const hp     = Math.round(R.hp      || 0);
        const maxHp  = R.maxHp     || calcMaxHp(R.level || 1, R.vitality || 0);
        const mana   = Math.round(R.mana    || 0);
        const maxMp  = R.maxMana   || calcMaxMana(R.mind || 0);
        const sta    = Math.round(R.stamina || 0);
        const maxSta = R.maxStamina || calcMaxStam(R.endurance || 0);
        const pills = [
          { key: 'hp',  label: 'HP', cur: hp,   max: maxHp,  color: COL.hp,   tip: `HP — pool grows with Vitality (${R.vitality || 0}).` },
          { key: 'mp',  label: 'MP', cur: mana, max: maxMp,  color: COL.mp,   tip: `Mana — pool grows with Mind (${R.mind || 0}).` },
          { key: 'en',  label: 'EN', cur: sta,  max: maxSta, color: COL.stam, tip: `Energy (Stamina) — pool grows with Endurance (${R.endurance || 0}).` },
        ];
        return (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 6px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 6px)',
              zIndex: 30,
              background: COL.bg,
              border: `1px solid ${COL.border}`,
              borderRadius: 8,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)',
              padding: '4px 6px 5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              touchAction: 'none',
            }}>
            {/* Portrait frame — 80x80, centered. */}
            <div style={{
              width: 80,
              height: 80,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src="/icons/ui/profile.webp?v=2.3.128"
                alt="Portrait"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  imageRendering: 'pixelated',
                  borderRadius: 4,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>
            {/* Pills row — HP / MP / EN, current/max live values. */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 3,
              width: '100%',
            }}>
              {pills.map(p => (
                <div key={p.key}
                  onPointerUp={(e) => { e.stopPropagation(); setTooltip(p.tip); }}
                  title={p.tip}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '2px 4px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    touchAction: 'none',
                    whiteSpace: 'nowrap',
                  }}>
                  <span style={{
                    color: p.color,
                    fontWeight: 800,
                    fontSize: 10,
                    letterSpacing: '.04em',
                  }}>{p.label}</span>
                  <span style={{
                    color: COL.text,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '.02em',
                  }}>{p.cur}/{p.max}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Upper-RIGHT gold card.  v2.3.130: portrait moved to a
          dedicated top-left identity card; this card is now gold-only
          so the right corner reads as the "currency" surface. */}
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
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#f5c542',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '.04em',
          touchAction: 'none',
        }}>
        <img
          src="/icons/popups/gold.png"
          alt=""
          style={{
            width: 16,
            height: 16,
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
        /* v2.3.122: dark bluish-gray vertical gradient behind the
           three column panels so the sections pop against a slightly
           lifted backdrop instead of a flat near-black field. */
        background: 'linear-gradient(180deg, #1e2436 0%, #141826 55%, #0c0f18 100%)',
        borderTop: `1px solid ${COL.border}`,
        color: COL.text,
        fontFamily: 'Source Sans 3, sans-serif',
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
              {/* v2.3.130: far-left vitals column removed.  HP/MP/EN
                  pills now live in the top-left identity card; the
                  Crit/Block/Zone/Kills/Time readouts are hidden (still
                  computed in R._compStats / calcCritChance etc. for
                  any future details panel). */}

              {/* ── Left column — Loadout.  v2.3.130: moved from middle
                  into the spot vacated by the vitals column so weapon
                  + armor sit at the natural thumb-reach side.  Stats +
                  Skills (flex: 2) gets the rest of the band width. */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                padding: 4,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(120,110,255,0.04)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)',
              }}>
                <ColHeader>Loadout</ColHeader>
                {(() => {
                  /* DMG/DPS calc — mirrors WeaponSwapBar.readState() so the
                     numbers match what combat actually rolls.  Stat driver
                     follows EQUIP_STAT_MAP: POW for melee, AGI for bow,
                     MIND for staff.  Damage ranges + staff cooldown penalty
                     mirror calcWeaponDmg in gameLoop.js. */
                  const slot = R.activeSlot || 'melee';
                  const wpn = (S && R) ? getActiveWeapon(R) : null;
                  const wType = wpn && WEAPON_TYPES[wpn.type];
                  const slotLabel = slot === 'ranged' ? 'Ranged'
                                   : slot === 'staff' ? 'Staff' : 'Melee';
                  /* v2.3.129: loadout slot uses the real in-world weapon
                     sprite (same artwork the player sees swinging) instead
                     of the small popup-icon placeholder.  URLs mirror
                     rendering/weaponSprites.js so the dashboard and the
                     Pixi scene stay in sync. */
                  const slotIconSrc = slot === 'ranged' ? '/sprites/weapons/bows/Bow2.png?v=2.1.24'
                                     : slot === 'staff' ? '/sprites/weapons/staffs/Wizard%20Staff2.png?v=2.1.24'
                                     : '/sprites/weapons/swords/Sword1.png?v=2.1.24';
                  let dmgText = '0', dpsText = '0.0';
                  if (wType) {
                    const statVal = (slot === 'ranged') ? (R.agility || 0)
                                  : (slot === 'staff')  ? (R.mind || 0)
                                  : (R.power || 0);
                    const base = (wType.base + statVal * 0.8) * (wpn.tierMult || 1);
                    let dmgMin, dmgMax, cdMs = SWING_COOLDOWN;
                    if (slot === 'ranged')      { dmgMin = base * 0.6;  dmgMax = base * 0.8;  }
                    else if (slot === 'staff')  { dmgMin = base * 0.5;  dmgMax = base * 1.5;  cdMs += 300; }
                    else                        { dmgMin = base * 0.75; dmgMax = base * 1.25; }
                    dmgMin = Math.round(dmgMin); dmgMax = Math.round(dmgMax);
                    dmgText = (dmgMin === dmgMax) ? String(dmgMin) : `${dmgMin}-${dmgMax}`;
                    dpsText = ((dmgMin + dmgMax) / 2 / (cdMs / 1000)).toFixed(1);
                  }
                  /* Equip slot list — order matches the user's wireframe.
                     v2.3.127 reorder: Row 1 reads Shield · Amulet · Weapon
                     so the active weapon sits at the natural thumb-reach
                     position (top-right) while defense-y slots flank it.
                     Row 2: Chest · Legs.  Leg & amulet still placeholder
                     text since there's no PNG art yet. */
                  const shieldSrc = R.shield ? '/sprites/shields/wood-shield-front.png?v=2.1.23' : null;
                  const armorSrc = null; /* No chest-armor PNG sprite yet. */
                  /* Plain function (not a React component) so React doesn't
                     see a fresh component-type identity on every render and
                     remount the cells.  Called as slotCell({...}) below. */
                  const slotCell = ({ k, label, iconSrc, onTap, active, equipped }) => (
                    <div key={k}
                      onPointerUp={onTap ? (e) => { e.stopPropagation(); onTap(); } : undefined}
                      title={label}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        background: active ? 'rgba(245,199,70,0.15)' : 'rgba(255,255,255,0.04)',
                        border: active ? '1px solid rgba(245,199,70,0.7)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: active ? 'inset 0 0 6px rgba(245,199,70,0.3)' : 'none',
                        cursor: onTap ? 'pointer' : 'default',
                        touchAction: 'none',
                        minWidth: 0,
                        minHeight: 0,
                        aspectRatio: '1 / 1',
                      }}>
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={label}
                          draggable={false}
                          style={{
                            width: '85%',
                            height: '85%',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                            opacity: equipped === false ? 0.35 : 1,
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : (
                        <span style={{
                          color: COL.muted,
                          fontWeight: 700,
                          fontSize: 9,
                          letterSpacing: '.06em',
                        }}>{label}</span>
                      )}
                    </div>
                  );
                  const onCycleWeapon = () => {
                    const order = ['melee', 'ranged', 'staff'];
                    const i = order.indexOf(slot);
                    const next = order[(i + 1) % order.length];
                    weaponSwapBus.setSlot(next);
                  };
                  return (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 0,
                      padding: '2px 2px 0',
                    }}>
                      {/* DMG / DPS readout — single centered line. */}
                      <div
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(`${slotLabel} weapon — tap the weapon slot to cycle melee → ranged → staff.`); }}
                        title={`${slotLabel} · DMG ${dmgText} · DPS ${dpsText}`}
                        style={{
                          fontSize: 11,
                          color: COL.text,
                          letterSpacing: '.02em',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          touchAction: 'none',
                        }}>
                        <span style={{ color: COL.muted }}>DMG </span>{dmgText}
                        <span style={{ color: COL.muted }}>  ·  DPS </span>{dpsText}
                      </div>
                      {/* Row 1 — Shield · Amulet · Weapon. */}
                      <div style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 3,
                        minHeight: 0,
                      }}>
                        {slotCell({ k: 'shield', label: 'SHIELD', iconSrc: shieldSrc, equipped: !!R.shield })}
                        {slotCell({ k: 'amulet', label: 'AMULET', iconSrc: null,      equipped: !!R.amulet })}
                        {slotCell({ k: 'weapon', label: slotLabel, iconSrc: slotIconSrc, active: true, onTap: onCycleWeapon })}
                      </div>
                      {/* Row 2 — Chest · Legs.  v2.3.129: row reuses the
                          same 3-column track as Row 1 so chest + legs
                          cells render at the same width as shield /
                          amulet / weapon above.  Third slot is left
                          empty (no third armor piece). */}
                      <div style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 3,
                        minHeight: 0,
                      }}>
                        {slotCell({ k: 'chest', label: 'CHEST', iconSrc: armorSrc, equipped: !!R.armor })}
                        {slotCell({ k: 'legs',  label: 'LEGS',  iconSrc: null })}
                        <div />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Right column — Stats + Life Skills merged.
                  v2.3.130: flex 1 -> 2 (consumes the slack vacated by
                  the deleted vitals column).  Grid flipped to 5 cols x
                  3 rows with default row-major flow: life skills fill
                  rows 1-2, build / combat stats fill row 3.  Each cell
                  is now noticeably wider since the col is 5 across
                  instead of 3. */}
              <div style={{
                flex: 2,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                padding: 4,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(80,200,130,0.04)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)',
              }}>
                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gridTemplateRows: 'repeat(3, 1fr)',
                  gap: 2,
                  minHeight: 0,
                }}>
                  {LIFE_SKILLS.map(sk => {
                    const sk_st = (R.lifeSkills && R.lifeSkills[sk.key]) || {};
                    const lvl = sk_st.level || 0;
                    const xp = sk_st.xp || 0;
                    const need = skillXpRequired(lvl);
                    const sPct = need > 0 ? Math.max(0, Math.min(100, (xp / need) * 100)) : 0;
                    return (
                      <div key={'s_' + sk.key}
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(`${sk.label} · Lv ${lvl} (${Math.round(sPct)}% to next) — ${sk.tip.split('—').slice(1).join('—').trim()}`); }}
                        title={sk.tip}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          fontSize: 11,
                          minHeight: 0,
                          cursor: 'pointer',
                          touchAction: 'none',
                          overflow: 'hidden',
                        }}>
                        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{sk.icon}</span>
                        <span style={{ flex: 1, textAlign: 'center', color: COL.text, fontWeight: 700, fontSize: 14 }}>{lvl}</span>
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0, bottom: 0,
                          height: 2,
                          background: 'rgba(255,255,255,0.06)',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: sPct + '%',
                            height: '100%',
                            background: 'rgba(61,220,151,0.85)',
                            transition: 'width .15s linear',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  {CHAR_STATS.map(s => {
                    const val = R[s.key] ?? 0;
                    const prog = (R._buildProg && R._buildProg[s.key]) || 0;
                    const pct = Math.max(0, Math.min(100, (prog / buildThresh) * 100));
                    let bonusTxt = '';
                    if (s.key === 'vitality')       bonusTxt = `${calcMaxHp(R.level || 1, val)} HP`;
                    else if (s.key === 'endurance') bonusTxt = `${R.maxStamina || calcMaxStam(val)} STA`;
                    else if (s.key === 'power')     bonusTxt = `+${Math.round(val * 0.8)} melee dmg`;
                    else if (s.key === 'agility')   bonusTxt = `+${Math.round(val * 0.8)} bow dmg`;
                    else if (s.key === 'mind')      bonusTxt = `+${Math.round(val * 0.8)} magic dmg`;
                    const tipFull = `${s.label} ${val} → ${bonusTxt}. ${s.tip}`;
                    return (
                      <div key={'b_' + s.key}
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(tipFull); }}
                        title={tipFull}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: 'rgba(91,82,255,0.06)',
                          border: '1px solid rgba(91,82,255,0.18)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          touchAction: 'none',
                          minHeight: 0,
                        }}>
                        <img
                          src={s.iconSrc}
                          alt={s.label}
                          draggable={false}
                          style={{
                            width: 18 * (s.iconScale || 1),
                            height: 18 * (s.iconScale || 1),
                            objectFit: 'contain',
                            imageRendering: s.pixelated ? 'pixelated' : 'auto',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            flexShrink: 0,
                          }}
                        />
                        {/* v2.3.126: flex:1 + textAlign:center so the value
                            sits in the cell's remaining horizontal space.
                            Previously justify-content:space-between pinned
                            the value to the right edge, which read as
                            crowded when icons were wide (heart at 1.4x). */}
                        <span style={{ flex: 1, textAlign: 'center', color: COL.text, fontWeight: 700, fontSize: 13 }}>{val}</span>
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0, bottom: 0,
                          height: 2,
                          background: 'rgba(255,255,255,0.06)',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: pct + '%',
                            height: '100%',
                            background: 'rgba(91,82,255,0.85)',
                            transition: 'width .15s linear',
                          }} />
                        </div>
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
