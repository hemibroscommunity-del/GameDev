import React, { useEffect, useState } from 'react';
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
const PADDING = 5;
// Pill centre lines up with the chat icon's old centre (calc(50% - 140px)).
const PILL_CENTER_X = 'calc(50% - 140px)';
const PILL_WIDTH = BUTTON_SIZE * 3 + GAP * 2 + PADDING * 2; // 138px
// Pill is lifted 40px to leave room for the dmg/dps readout below it.
const PILL_BOTTOM   = 'calc(var(--dash-h) + 56px)';
const READOUT_BOTTOM = 'calc(var(--dash-h) + 16px)';

export const WeaponSwapBar = () => {
  const [state, setState] = useState(readState);
  const active = state.slot;

  useEffect(() => {
    setState(readState());
    const off = weaponSwapBus.subscribe(() => setState(readState()));
    // Re-read 4x/sec so power/tier changes from equipping or stat-ups
    // show in the dmg/dps readout without needing a slot swap.
    const poll = setInterval(() => setState(readState()), 250);
    return () => { off(); clearInterval(poll); };
  }, []);

  const dmgText = state.dmgMin === state.dmgMax
    ? String(state.dmgMin)
    : `${state.dmgMin}-${state.dmgMax}`;

  return (
    <>
    <div
      style={{
        position: 'fixed',
        left: PILL_CENTER_X,
        bottom: PILL_BOTTOM,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: GAP,
        padding: PADDING,
        background: 'rgba(20, 22, 32, 0.65)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: (BUTTON_SIZE + PADDING * 2) / 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        zIndex: 35,
      }}
    >
      {SLOTS.map(s => {
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            // Fire on pointer/touch down (not onClick) so the swap works
            // even while another finger is mid-drag on the right joystick.
            onPointerDown={(e) => {
              e.stopPropagation();
              weaponSwapBus.setSlot(s.key);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              weaponSwapBus.setSlot(s.key);
            }}
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

    {/* Damage / DPS readout — sits directly below the pill, matching its
        width and X-centre.  Shows the equipped weapon's per-hit damage
        (range for staff, fixed for melee/bow) and a derived DPS.  Polled
        4x/sec by the same useEffect that drives the pill. */}
    <div
      style={{
        position: 'fixed',
        left: PILL_CENTER_X,
        bottom: READOUT_BOTTOM,
        transform: 'translateX(-50%)',
        width: PILL_WIDTH,
        height: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 6px',
        background: 'rgba(20, 22, 32, 0.65)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        fontFamily: 'VT323, monospace',
        fontSize: 13,
        lineHeight: 1.05,
        color: '#E8EAF8',
        letterSpacing: '.03em',
        whiteSpace: 'nowrap',
        zIndex: 35,
        pointerEvents: 'none',
      }}
    >
      <div><span style={{ color: '#8890b8' }}>DMG </span>{dmgText}</div>
      <div><span style={{ color: '#8890b8' }}>DPS </span>{state.dps}</div>
    </div>
    </>
  );
};
