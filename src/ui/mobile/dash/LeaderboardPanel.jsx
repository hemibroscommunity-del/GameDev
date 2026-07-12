import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const CATS = [
  { id: 'level',      label: 'Level' },
  { id: 'lifeskills', label: 'Skills' },
  { id: 'ap',         label: 'AP' },
  { id: 'kills',      label: 'Kills' },
  { id: 'gold',       label: 'Gold' },
];

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — category
   buttons become spec chips (32px / pill radius; selected = brass-fill
   #3B3427 + brass label, NOT solid brass: brass is an accent, never a
   slab), rows go to 44px with tabular rank/value columns, and the empty
   state gets the icon-at-.4 treatment.  Category switching and the
   1.5s refresh interval are unchanged. */
/* v2.3.1235: batch-1 rollout — the tappable chip button is now a
   transparent 44px-tall hitbox (contract: every interactive element
   ≥44×44) wrapping the 32px visual pill, so the approved chip look
   survives without an undersized touch target. */
const chipHit = {
  flex: '0 0 auto',
  minHeight: 44,
  padding: 0,
  margin: 0,
  background: 'transparent',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
const chip = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

export const LeaderboardPanel = () => {
  const [cat, setCat] = useState('level');
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const board = (S?._leaderboard && S._leaderboard[cat]) || [];

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, overflowX: 'auto', padding: '2px 0' }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={chipHit}>
            <span style={chip(c.id === cat)}>{c.label}</span>
          </button>
        ))}
      </div>
      {board.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {/* v2.3.1235: batch-1 rollout — empty-state contract: icon ≤40px,
              message 13/700 secondary (was 44px icon + 13/400 muted). */}
          <img src="/icons/ui/leaderboard.webp" alt="" draggable={false}
            style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🏆')); }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>
            No leaderboard data yet.
          </div>
        </div>
      ) : board.slice(0, 30).map((r, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          {/* v2.3.1235: batch-1 rollout — contract allows rank as a key
              number (16/700 tabular, brass text for top-3 only — never a
              filled gold row); name drops to body 13, value goes to the
              16/700 key-number size (was 12/600 rank + 13.5 name + 14 value). */}
          <span style={{
            width: 36, flex: '0 0 auto', fontSize: 16, fontWeight: 700,
            color: i < 3 ? COL.accent : COL.muted, fontVariantNumeric: 'tabular-nums',
          }}>#{i + 1}</span>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.name || r.id}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
            {r.value ?? r.score ?? '-'}
          </span>
        </div>
      ))}
    </div>
  );
};
