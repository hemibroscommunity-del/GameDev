import React, { useEffect, useState } from 'react';
import { controlsTutorialBus } from './controlsTutorialBus.js';

// "More" overlay: opened by the wheel's 6 o'clock slot. Surfaces every
// legacy panel that doesn't have a dedicated wheel slot, so hiding the
// bottom toolbar doesn't lose access to anything.

/* v2.3.1233: Lantern Slate flip (docs/LANTERN-SLATE-SPEC.md) — this sheet
   was still on the pre-Lantern light-parchment palette.  Panel surface,
   strong border, warm-white text ladder, raised tiles like MorePanel's. */
const COL = {
  bg:       '#202C32',
  border:   'rgba(238,242,235,.24)',
  text:     '#F7F2E7',
  muted:    '#96A2A0',
  pressed:  '#B88643',
};

/* v2.3.1224: src = UI Bible icons (docs/UI-BIBLE.md Part 4); the emoji
   stays as the render fallback if an image fails to load. */
const ITEMS = [
  /* v2.3.224: Controls at the top so the help entry is always
     visible in short preview windows. */
  { e: '?',  src: '/icons/ui/panel-controls.webp?v=2.3.1224',     label: 'Controls',     bus: 'controlsTutorial' },
  { e: '⚔️', src: '/icons/ui/panel-stats.webp?v=2.3.1224',        label: 'Stats',        legacy: 'stats' },
  { e: '📊', src: '/icons/ui/panel-skills.webp?v=2.3.1224',       label: 'Skills',       legacy: 'skills' },
  { e: '📖', src: '/icons/ui/panel-encyclopedia.webp?v=2.3.1224', label: 'Encyclopedia', legacy: 'encyclopedia' },
  { e: '🏛️', src: '/icons/ui/panel-guild.webp?v=2.3.1224',        label: 'Guild',        legacy: 'guild' },
  { e: '🏆', src: '/icons/ui/panel-leaderboard.webp?v=2.3.1224',  label: 'Leaderboard',  legacy: 'leaderboard' },
  { e: '🏰', src: '/icons/ui/panel-clan.webp?v=2.3.1224',         label: 'Clan',         legacy: 'clan' },
  { e: '👥', src: '/icons/ui/nav-friends.webp?v=2.3.1224',        label: 'Friends',      legacy: 'social' },
  { e: '📝', src: '/icons/ui/panel-feedback.webp?v=2.3.1224',     label: 'Feedback',     legacy: 'feedback' },
  { e: '💬', src: '/icons/ui/panel-chat.webp?v=2.3.1224',         label: 'Chat',         legacy: 'chat' },
];

let _open = false;
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const moreOverlay = {
  open()  { _open = true;  emit(); },
  close() { _open = false; emit(); },
  isOpen() { return _open; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export const MoreOverlay = () => {
  const [, setV] = useState(0);
  useEffect(() => moreOverlay.subscribe(() => setV(v => v + 1)), []);
  if (!_open) return null;

  const tap = (item) => {
    moreOverlay.close();
    if (item.bus === 'controlsTutorial') { controlsTutorialBus.open(); return; }
    const fn = window.__broLegacyUI?.[item.legacy];
    if (fn) fn();
    else console.log('[more] no handler for', item.legacy);
  };

  return (
    <div onClick={() => moreOverlay.close()} style={{
      position: 'fixed', inset: 0, zIndex: 9200,
      /* v2.3.1233: spec modal scrim. */
      background: 'rgba(8,16,20,.56)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      {/* v2.3.1233: bottom sheet on the panel surface — strong top border,
          band shadow, radius 14 (panel radius); no backdrop-filter. */}
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: COL.bg,
        borderTop: `1px solid ${COL.border}`,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        boxShadow: '0 -10px 24px rgba(6,10,12,.22)',
        padding: '14px 14px 24px', boxSizing: 'border-box',
        maxHeight: '70vh', overflowY: 'auto',
        animation: 'more-up 220ms ease-out',
      }}>
        <style>{`@keyframes more-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ width: 32, height: 4, background: COL.border, borderRadius: 2, margin: '0 auto 12px' }} />
        {/* v2.3.1233: module header — 11/600 uppercase, Source Sans 3. */}
        <div style={{
          fontFamily: 'Source Sans 3, sans-serif', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.12em',
          color: COL.muted, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center',
        }}>MORE TOOLS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {ITEMS.map(it => (
            /* v2.3.1233: raised tap-target tile (#2B3940, hairline,
               inset top highlight) — matches dash/MorePanel.jsx. */
            <div key={it.label} onClick={() => tap(it)} style={{
              padding: 12, borderRadius: 10, background: '#2B3940',
              border: '1px solid rgba(238,242,235,.14)', cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              userSelect: 'none', touchAction: 'manipulation',
            }}>
              {/* v2.3.1224: UI Bible icon with emoji fallback */}
              {it.src
                ? <img src={it.src} alt="" draggable={false}
                    style={{ width: 28, height: 28, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(it.e)); }} />
                : <div style={{ fontSize: 24, lineHeight: 1 }}>{it.e}</div>}
              {/* v2.3.1233: 11/600 caption in text-2 — icon stays the identity. */}
              <div style={{ fontFamily: 'Source Sans 3, sans-serif', fontSize: 11, fontWeight: 600, color: '#B9C1BF' }}>
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
