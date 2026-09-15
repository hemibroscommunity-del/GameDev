import React, { useEffect, useState } from 'react';
import { storeToastBus, STORE_TOAST_MS } from './storeToastBus.js';

/* ═══ v2.3.2476: THE SALE NOTICE ═══
 *
 * "You sold X for Y" as a chat-shaped card, for a few seconds, above the
 * dashboard.  It exists because the chat line the mail already wrote
 * (gameEvents.js `inbox_delivered`) is unreadable on a phone mid-fight, and
 * a sale is the one delivery you are actually waiting for.
 *
 * DELIBERATELY SMALL AND DELIBERATELY RARE.  The mastery toast was
 * unmounted at the owner's request for being noisy (GameApp.jsx v2.3.820),
 * so this one only ever fires for a store sale -- not for daily gold, not
 * for trades, not for quest payouts -- and it dismisses itself.  Tap to
 * send it away sooner.  It is presentation only: the gold is already in the
 * wallet by the time this draws, carried by the player_state echo.
 *
 * Positioned above the band rather than at the top of the screen: the top
 * is where the zone header and the quest coach live, and a card there
 * covers them.  Lantern Slate floating-card tokens (border-strong, the
 * near-opaque slate fill -- no backdrop blur, iOS). */

export const StoreToast = () => {
  const [items, setItems] = useState(storeToastBus.get());

  useEffect(() => storeToastBus.subscribe(setItems), []);

  /* One timer per toast, cleared on unmount. A re-render while a toast is
     live must not restart its clock, which is why this keys off the id. */
  useEffect(() => {
    if (!items.length) return undefined;
    const timers = items.map((i) => setTimeout(() => storeToastBus.dismiss(i.id), Math.max(0, i.at + STORE_TOAST_MS - Date.now())));
    return () => { for (const t of timers) clearTimeout(t); };
  }, [items]);

  if (!items.length) return null;

  return (
    <div style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(var(--dash-h) + 14px)',
      width: 'min(320px, calc(100vw - 28px))',
      display: 'flex', flexDirection: 'column', gap: 6,
      zIndex: 22, pointerEvents: 'auto',
    }}>
      {items.map((i) => (
        <div key={i.id} onPointerUp={() => storeToastBus.dismiss(i.id)}
          className="bt-noselect"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            background: 'rgba(17,25,29,.94)',
            border: '1px solid rgba(238,242,235,.24)',
            borderRadius: 10,
            boxShadow: '0 14px 30px rgba(4,7,9,.38)',
            fontFamily: 'Source Sans 3, sans-serif',
            cursor: 'pointer',
          }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{'\u{1F4EB}'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F7F2E7', lineHeight: 1.35 }}>{i.text}</span>
        </div>
      ))}
    </div>
  );
};
