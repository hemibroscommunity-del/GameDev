import React, { useEffect, useRef, useState } from 'react';
import { weaponSwapBus } from './weaponSwapBus.js';

// Three weapon-slot buttons grouped into a single pill at the bottom-left
// of the screen (the slot the chat icon used to occupy).  Active slot
// gets a highlighted-yellow fill; the inactive two are grayed-out and
// share the pill's dark backdrop so the trio reads as connected options.

const SLOTS = [
  { key: 'melee',  icon: '⚔️' }, // crossed swords
  { key: 'ranged', icon: '🏹' }, // bow and arrow
  { key: 'staff',  icon: '🪄' }, // magic wand
];

const readActive = () => {
  const g = window._gameState && window._gameState.current;
  return (g && g.rpg && g.rpg.activeSlot) || weaponSwapBus.activeSlot || 'melee';
};

const BUTTON_SIZE = 40;
const GAP = 4;
const PADDING = 5;
// Pill centre lines up with the chat icon's old centre (calc(50% - 140px)).
const PILL_CENTER_X = 'calc(50% - 140px)';

export const WeaponSwapBar = () => {
  const [active, setActive] = useState(readActive);
  const barRef = useRef(null);

  useEffect(() => {
    setActive(readActive());
    const off = weaponSwapBus.subscribe(slot => setActive(slot));
    // Poll once per second to catch slot changes made outside the bus
    // (e.g. inventory equip) without re-architecting every callsite.
    const poll = setInterval(() => setActive(readActive()), 1000);
    return () => { off(); clearInterval(poll); };
  }, []);

  // Native non-passive touchmove preventDefault — stops iOS from
  // interpreting an upward swipe across the pill as a page pan,
  // which caused the same rubber-band shake the dashboard had.
  // React's onTouchMove is passive on Safari so preventDefault there
  // is ignored; this listener is explicitly passive: false.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const onMove = (e) => { if (e.cancelable) e.preventDefault(); };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        left: PILL_CENTER_X,
        bottom: 'calc(var(--dash-h) + 16px)',
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
        // touch-action: none on the whole pill — combined with the
        // native touchmove listener above, blocks iOS's pan/rubber-band
        // gesture from initiating at touchstart. Without this, Safari
        // marks the touch as a scroll candidate before the listener
        // fires and the shake still happens.
        touchAction: 'none',
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
              touchAction: 'none',
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
  );
};
