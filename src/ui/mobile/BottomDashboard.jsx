import React, { useEffect, useState } from 'react';
import { chatBubbleBus } from './chatBubbleBus.js';
import { inventoryBus } from './inventoryBus.js';
import { inspectCardBus } from './inspectCardBus.js';
import { moreOverlay } from './MoreOverlay.jsx';

// Bottom-of-screen dashboard.  Replaces the radial UtilityWheel.
// Layout:
//   - Outer fixed container, height = 33vh, anchored to bottom.
//   - Top region (≈70% of dashboard, ≈23% of screen) — character stats:
//       HP / MP / Stamina bars, Level + XP bar, Gold earned.
//   - Bottom region (≈30% of dashboard, ≈10% of screen) — icon row:
//       Chat, Inventory, Self, Journey, Map, Social, More.
//
// Live data is pulled directly from window._gameState.current — same
// pattern the debug bus uses — and we refresh on a 200ms tick so the
// bars track combat without forcing a full BroTown re-render.

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

// Inline-svg icon glyphs (24-unit viewBox).
const ICONS = {
  chat:       'M21 12a8 8 0 0 1-12 6.93L4 20l1.07-5A8 8 0 1 1 21 12z',
  inventory:  'M4 7h16v12H4z M8 7V5a4 4 0 0 1 8 0v2',
  self:       'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
  journey:    'M4 6h16M4 12h16M4 18h10',
  map:        'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16',
  social:     'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21v-1a8 8 0 0 1 16 0v1M19 8v6M22 11h-6',
  more:       'M5 12a1 1 0 1 0 .01 0M12 12a1 1 0 1 0 .01 0M19 12a1 1 0 1 0 .01 0',
};

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={ICON_STROKE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
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

const IconButton = ({ glyph, label, onClick }) => (
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
      background: 'transparent',
      border: 'none',
      borderRight: `1px solid ${COL.divider}`,
      color: COL.text,
      cursor: 'pointer',
      fontFamily: 'VT323, monospace',
    }}
  >
    <Icon d={ICONS[glyph]} size={22} />
    <span style={{ fontSize: 10, color: COL.muted, letterSpacing: '.04em' }}>{label}</span>
  </button>
);

// Try a list of legacy-panel keys until one works. Used for "Self" /
// "Journey" / "Map" / "Social" since those open existing panels.
const callLegacy = (...keys) => {
  const reg = (typeof window !== 'undefined') && window.__broLegacyUI;
  if (!reg) return false;
  for (const k of keys) {
    if (typeof reg[k] === 'function') { reg[k](); return true; }
  }
  return false;
};

export const BottomDashboard = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};

  const hp = R.hp ?? 0, maxHp = R.maxHp || 1;
  const mp = R.mana ?? 0, maxMp = R.maxMana || 1;
  const stam = R.stamina ?? 0, maxStam = R.maxStamina || 1;
  const level = R.level || 1;
  const xp = R.xp || 0;
  const xpReq = (typeof R._xpReq === 'function') ? R._xpReq(level) : null;
  // Fallback xp curve mirrors xpRequired() shape — close enough for a bar.
  const xpNeeded = xpReq || (50 + level * level * 25);
  const goldEarned =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.gold || 0;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: '33vh',
        background: COL.bg,
        borderTop: `1px solid ${COL.border}`,
        color: COL.text,
        fontFamily: 'VT323, monospace',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        // iOS safe area.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Stats — top portion (flex:1 fills the remaining space above the icon row). */}
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

      {/* Icon row — bottom 30% of dashboard ≈ 10% of screen. */}
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
          onClick={() => inventoryBus.setOpen(true)} />
        <IconButton glyph="self"      label="Self"
          onClick={() => {
            // Mirror GameApp's selfInspect wiring — open the spec'd card.
            const s = window._gameState?.current;
            const profile = (s && s.player && window.__broBuildSelfProfile)
              ? window.__broBuildSelfProfile(s) : null;
            if (profile) inspectCardBus.open(profile);
            else callLegacy('selfInspect', 'profile');
          }} />
        <IconButton glyph="journey"   label="Journey"
          onClick={() => callLegacy('journey', 'encyclopedia')} />
        <IconButton glyph="map"       label="Map"
          onClick={() => callLegacy('map', 'encyclopedia')} />
        <IconButton glyph="social"    label="Social"
          onClick={() => callLegacy('social')} />
        <IconButton glyph="more"      label="More"
          onClick={() => moreOverlay.open()} />
      </div>
    </div>
  );
};
