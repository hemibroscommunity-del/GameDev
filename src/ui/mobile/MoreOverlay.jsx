import React, { useEffect, useState } from 'react';

// "More" overlay: opened by the wheel's 6 o'clock slot. Surfaces every
// legacy panel that doesn't have a dedicated wheel slot, so hiding the
// bottom toolbar doesn't lose access to anything.

const COL = {
  bg:       '#F1EFE8',
  border:   '#E2DCC8',
  text:     '#2C2C2A',
  muted:    '#888780',
  pressed:  '#2C2C2A',
};

const ITEMS = [
  { e: '⚔️', label: 'Stats',        legacy: 'stats' },
  { e: '📊', label: 'Skills',       legacy: 'skills' },
  { e: '📖', label: 'Encyclopedia', legacy: 'encyclopedia' },
  { e: '🏛️', label: 'Guild',        legacy: 'guild' },
  { e: '🏆', label: 'Leaderboard',  legacy: 'leaderboard' },
  { e: '🏰', label: 'Clan',         legacy: 'clan' },
  { e: '👥', label: 'Friends',      legacy: 'social' },
  { e: '📝', label: 'Feedback',     legacy: 'feedback' },
  { e: '💬', label: 'Chat',         legacy: 'chat' },
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
    const fn = window.__broLegacyUI?.[item.legacy];
    if (fn) fn();
    else console.log('[more] no handler for', item.legacy);
  };

  return (
    <div onClick={() => moreOverlay.close()} style={{
      position: 'fixed', inset: 0, zIndex: 9200,
      background: 'rgba(30, 51, 40, 0.55)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: COL.bg,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        padding: '14px 14px 24px', boxSizing: 'border-box',
        maxHeight: '70vh', overflowY: 'auto',
        animation: 'more-up 220ms ease-out',
      }}>
        <style>{`@keyframes more-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ width: 32, height: 4, background: COL.muted, borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{
          fontFamily: 'system-ui, sans-serif', fontSize: 11, letterSpacing: '0.12em',
          color: COL.muted, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center',
        }}>MORE TOOLS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {ITEMS.map(it => (
            <div key={it.label} onClick={() => tap(it)} style={{
              padding: 12, borderRadius: 10, background: '#fff',
              border: `1px solid ${COL.border}`, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              userSelect: 'none', touchAction: 'manipulation',
            }}>
              <div style={{ fontSize: 24, lineHeight: 1 }}>{it.e}</div>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, color: COL.text }}>
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
