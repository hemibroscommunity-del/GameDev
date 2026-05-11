import React, { useEffect, useState } from 'react';
import { weaponSwapBus } from './weaponSwapBus.js';

// Three 40 px round buttons sitting in the bottom-left band where the chat
// icon used to live. Tapping one sets the active weapon slot via
// weaponSwapBus, which BroTown listens to so the in-character logic
// updates. Bow occupies the chat icon's old centre (left: calc(50% - 140px));
// sword and staff flank it ~52 px to each side. Icons match the emoji set
// previously rendered on the right-joystick knob (now blank).

const SLOTS = [
  { key: 'melee',  icon: '⚔️',         offset: -192 }, // crossed swords
  { key: 'ranged', icon: '🏹',         offset: -140 }, // bow and arrow
  { key: 'staff',  icon: '🪄',         offset: -88  }, // magic wand
];

const readActive = () => {
  const g = window._gameState && window._gameState.current;
  return (g && g.rpg && g.rpg.activeSlot) || weaponSwapBus.activeSlot || 'melee';
};

export const WeaponSwapBar = () => {
  const [active, setActive] = useState(readActive);

  useEffect(() => {
    setActive(readActive());
    const off = weaponSwapBus.subscribe(slot => setActive(slot));
    // Poll for slot changes made outside the bus (e.g. inventory equip)
    // so the highlight stays accurate without rewiring every callsite.
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
              border: '1px solid ' + (isActive ? 'rgba(170,210,255,0.75)' : 'rgba(255,255,255,0.15)'),
              borderRadius: '50%',
              opacity: isActive ? 1 : 0.4,
              filter: isActive ? 'none' : 'grayscale(1) brightness(0.6)',
              cursor: 'pointer',
              zIndex: 35,
              fontSize: 20,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity .15s, filter .15s, background .15s, border-color .15s',
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
