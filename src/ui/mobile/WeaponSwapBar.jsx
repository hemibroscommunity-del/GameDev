import React, { useEffect, useState } from 'react';
import { weaponSwapBus } from './weaponSwapBus.js';

// Three 40 px round buttons sitting in the bottom-left band where the chat
// icon used to live. Tapping one sets the active weapon slot via
// weaponSwapBus, which BroTown listens to so the rKnob icon + game logic
// update. Bow occupies the chat icon's old centre (left: calc(50% - 140px));
// sword and staff flank it ~52 px to each side.

const SwordIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 3.5 L20 9 L9.5 19.5 L4 14 L14.5 3.5 Z" />
    <path d="M4 14 L2.5 21.5 L10 20 L14.5 15.5" />
    <path d="M14 14 L20 20" />
  </svg>
);

const BowIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3 Q18 12 6 21" />
    <path d="M6 3 L6 21" />
    <path d="M6 12 L20 12" />
    <path d="M17 9 L20 12 L17 15" />
  </svg>
);

const StaffIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <path d="M12 8 L7 21" />
    <path d="M9 5 L7 3" />
    <path d="M15 5 L17 3" />
  </svg>
);

const SLOTS = [
  { key: 'melee',  icon: SwordIcon, offset: -192 },
  { key: 'ranged', icon: BowIcon,   offset: -140 },
  { key: 'staff',  icon: StaffIcon, offset: -88  },
];

const readActive = () => {
  const g = window._gameState && window._gameState.current;
  return (g && g.rpg && g.rpg.activeSlot) || weaponSwapBus.activeSlot || 'melee';
};

export const WeaponSwapBar = () => {
  const [active, setActive] = useState(readActive);

  useEffect(() => {
    setActive(readActive());
    // Subscribe to swap events. Also poll once per second to catch slot
    // changes made elsewhere (e.g. inventory equip) without re-architecting
    // every callsite to push through this bus.
    const off = weaponSwapBus.subscribe(slot => setActive(slot));
    const poll = setInterval(() => setActive(readActive()), 1000);
    return () => { off(); clearInterval(poll); };
  }, []);

  return (
    <>
      {SLOTS.map(s => {
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => weaponSwapBus.setSlot(s.key)}
            aria-label={s.key}
            style={{
              position: 'fixed',
              left: `calc(50% + ${s.offset}px)`,
              bottom: 'calc(var(--dash-h) + 16px)',
              transform: 'translateX(-50%)',
              width: 40,
              height: 40,
              padding: 0,
              background: isActive ? 'rgba(60, 80, 130, 0.85)' : 'rgba(20, 22, 32, 0.55)',
              border: '1px solid ' + (isActive ? 'rgba(170,210,255,0.7)' : 'rgba(255,255,255,0.18)'),
              borderRadius: '50%',
              opacity: isActive ? 0.95 : 0.55,
              color: '#cfd2e0',
              cursor: 'pointer',
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity .15s, background .15s, border-color .15s',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          >
            {s.icon}
          </button>
        );
      })}
    </>
  );
};
