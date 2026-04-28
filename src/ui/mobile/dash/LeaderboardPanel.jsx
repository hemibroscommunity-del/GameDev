import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const CATS = [
  { id: 'level',      label: 'Level' },
  { id: 'lifeskills', label: 'Skills' },
  { id: 'ap',         label: 'AP' },
  { id: 'kills',      label: 'Kills' },
  { id: 'gold',       label: 'Gold' },
];

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
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, overflowX: 'auto' }}>
        {CATS.map(c => {
          const active = c.id === cat;
          return (
            <button key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                flex: '0 0 auto',
                padding: '3px 8px',
                background: active ? COL.accent : 'transparent',
                color: active ? '#fff' : COL.muted,
                border: `1px solid ${active ? COL.accent : COL.tileBor}`,
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 11,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >{c.label}</button>
          );
        })}
      </div>
      {board.length === 0 ? (
        <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
          No leaderboard data yet.
        </div>
      ) : board.slice(0, 30).map((r, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 8,
          padding: '3px 0',
          fontSize: 12,
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          <span style={{ width: 24, color: COL.muted }}>#{i + 1}</span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || r.id}</span>
          <span style={{ color: COL.text }}>{r.value ?? r.score ?? '-'}</span>
        </div>
      ))}
    </div>
  );
};
