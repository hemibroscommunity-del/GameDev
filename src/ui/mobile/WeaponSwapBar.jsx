import React, { useEffect, useRef, useState } from 'react';
import { weaponSwapBus } from './weaponSwapBus.js';
import { WEAPON_TYPES, SWING_COOLDOWN, getActiveWeapon } from '../../data/gameSystems.js';

// Three weapon-slot buttons grouped into a single pill at the bottom-left
// of the screen (the slot the chat icon used to occupy).  Active slot
// gets a highlighted-yellow fill; the inactive two are grayed-out and
// share the pill's dark backdrop so the trio reads as connected options.

const SLOTS = [
  { key: 'melee',  icon: '⚔️' }, // crossed swords
  { key: 'ranged', icon: '🏹' }, // bow and arrow
  { key: 'staff',  icon: '🪄' }, // magic wand
];

// Read both the active slot and the equipped-weapon stats in one pass
// so the pill's highlight and the dmg/dps readout below stay in sync.
// Mirrors the per-slot damage math in gameLoop.js (bow x0.7, staff range
// 0.5x-1.3x, staff has an extra 300ms cooldown penalty).
const readState = () => {
  const g = window._gameState && window._gameState.current;
  const rpg = g && g.rpg;
  const slot = (rpg && rpg.activeSlot) || weaponSwapBus.activeSlot || 'melee';
  const wpn = rpg ? getActiveWeapon(rpg) : null;
  const w = wpn && WEAPON_TYPES[wpn.type];
  if (!rpg || !w) return { slot, dmgMin: 0, dmgMax: 0, dps: '0.0' };
  const base = (w.base + (rpg.power || 0) * 0.8) * (wpn.tierMult || 1);
  let dmgMin, dmgMax, cdMs = SWING_COOLDOWN;
  if (slot === 'ranged') {
    dmgMin = dmgMax = base * 0.7;
  } else if (slot === 'staff') {
    dmgMin = base * 0.5;
    dmgMax = base * 1.3;
    cdMs += 300;
  } else {
    dmgMin = dmgMax = base;
  }
  const avg = (dmgMin + dmgMax) / 2;
  return {
    slot,
    dmgMin: Math.round(dmgMin),
    dmgMax: Math.round(dmgMax),
    dps: (avg / (cdMs / 1000)).toFixed(1),
  };
};

const BUTTON_SIZE = 40;
const GAP = 4;
const PADDING = 4;
// Pill centre lines up with the chat icon's old centre (calc(50% - 140px)).
const PILL_CENTER_X = 'calc(50% - 140px)';
// Sit just above the dashboard top, below the left joystick.  The
// joystick zone bottom is at calc(var(--dash-h) + 70px) so the combined
// buttons+readout pill needs to fit in the ~70px gap between the
// dashboard's top edge and the joystick's bottom edge.
const PILL_BOTTOM = 'calc(var(--dash-h) + 6px)';

export const WeaponSwapBar = () => {
  const [state, setState] = useState(readState);
  const active = state.slot;
  const wrapRef = useRef(null);
  // Track per-touch state so we can distinguish a tap (negligible
  // movement) from a swipe.  Keyed by touch.identifier so multi-touch
  // (e.g. joystick on another finger) doesn't interfere.
  const touchesRef = useRef(new Map());

  useEffect(() => {
    setState(readState());
    const off = weaponSwapBus.subscribe(() => setState(readState()));
    // Re-read 4x/sec so power/tier changes from equipping or stat-ups
    // show in the dmg/dps readout without needing a slot swap.
    const poll = setInterval(() => setState(readState()), 250);
    return () => { off(); clearInterval(poll); };
  }, []);

  /* Native non-passive touchmove on the pill wrapper.  preventDefaults
     the gesture so iOS doesn't interpret an upward swipe across the
     pill as a page-pan / URL-bar transition (the "rubber band").
     Prior attempts (v2.1.78-80) attached this in various forms and were
     reverted because they broke neighbouring interactions; this version
     scopes the listener strictly to the pill element and only acts when
     a touch that started inside the pill is still active, so a swipe
     that originated elsewhere (e.g. the joystick) is never blocked. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e) => {
      if (touchesRef.current.size === 0) return; // no tap-in-progress on the pill
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const dmgText = state.dmgMin === state.dmgMax
    ? String(state.dmgMin)
    : `${state.dmgMin}-${state.dmgMax}`;

  const TAP_THRESHOLD_PX = 10;
  const handleTouchStart = (e, slot) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchesRef.current.set(t.identifier, { slot, x: t.clientX, y: t.clientY, moved: false });
    }
  };
  const handleTouchMove = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const rec = touchesRef.current.get(t.identifier);
      if (!rec) continue;
      const dx = t.clientX - rec.x;
      const dy = t.clientY - rec.y;
      if (dx * dx + dy * dy > TAP_THRESHOLD_PX * TAP_THRESHOLD_PX) rec.moved = true;
    }
  };
  const handleTouchEnd = (e, slot) => {
    let fired = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const rec = touchesRef.current.get(t.identifier);
      touchesRef.current.delete(t.identifier);
      if (!rec || rec.moved) continue;
      if (rec.slot !== slot) continue;
      weaponSwapBus.setSlot(slot);
      fired = true;
    }
    /* preventDefault here suppresses the synthetic onClick iOS would
       otherwise dispatch ~300ms after touchend.  Without this, a touch
       tap would fire the swap twice (once from touchend, once from the
       click). Mouse clicks on desktop still hit the onClick handler
       since they don't go through touchend. */
    if (fired && e.cancelable) e.preventDefault();
  };
  const handleTouchCancel = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchesRef.current.delete(e.changedTouches[i].identifier);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        left: PILL_CENTER_X,
        bottom: PILL_BOTTOM,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'rgba(20, 22, 32, 0.65)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 35,
        touchAction: 'none',
      }}
    >
      {/* Buttons row */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: GAP,
          padding: PADDING,
        }}
      >
        {SLOTS.map(s => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              /* Tap-only: record the touch on start, mark as moved on
                 touchmove past 10 px, fire swap on touchend only if not
                 marked moved.  An accidental upward swipe across the
                 pill no longer changes the weapon.  Keyed by touch
                 identifier so a finger mid-drag on the right joystick
                 doesn't block a tap from a second finger. */
              onTouchStart={(e) => handleTouchStart(e, s.key)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, s.key)}
              onTouchCancel={handleTouchCancel}
              /* Mouse path (desktop) -- onPointerUp with no significant
                 movement.  Click events still work as a fallback. */
              onClick={(e) => { e.stopPropagation(); weaponSwapBus.setSlot(s.key); }}
              aria-label={s.key}
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                padding: 0,
                background: isActive ? 'rgba(245, 199, 70, 0.95)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(255, 230, 130, 0.95)'
                  : '1px solid transparent',
                borderRadius: '50%',
                opacity: isActive ? 1 : 0.45,
                filter: isActive ? 'none' : 'grayscale(1) brightness(0.65)',
                boxShadow: isActive
                  ? '0 0 8px rgba(245, 199, 70, 0.55), inset 0 1px 1px rgba(255,255,255,0.4)'
                  : 'none',
                color: '#cfd2e0',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity .15s, filter .15s, background .15s, border-color .15s, box-shadow .15s',
                touchAction: 'manipulation',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
            >
              {s.icon}
            </button>
          );
        })}
      </div>

      {/* DMG / DPS row — connected beneath the buttons, single line.
          Pointer-events: none so it never blocks the buttons above or
          the joystick beside it. */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '2px 8px 3px',
          fontFamily: 'VT323, monospace',
          fontSize: 14,
          lineHeight: 1,
          color: '#E8EAF8',
          letterSpacing: '.03em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#8890b8' }}>DMG </span>{dmgText}
        <span style={{ color: '#8890b8' }}>  ·  DPS </span>{state.dps}
      </div>
    </div>
  );
};
