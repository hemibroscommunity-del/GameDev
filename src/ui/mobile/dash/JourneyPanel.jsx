import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const fmtAge = (ts) => {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h';
  return Math.floor(sec / 86400) + 'd';
};

export const JourneyPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const j = S?.rpg?.journey || S?.journey || {};
  const entries = (j.entries || j.recent || []).slice().reverse().slice(0, 30);

  if (!entries.length) {
    return <div style={panelStyle}>
      <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '18px 0' }}>
        Your journey is just beginning.
      </div>
    </div>;
  }

  return (
    <div style={panelStyle}>
      {entries.map((e, i) => {
        const text = typeof e === 'string' ? e : (e.text || e.label || '');
        const ts   = typeof e === 'object' ? e.ts || e.t : null;
        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '3px 0',
            borderBottom: i < entries.length - 1 ? `1px solid ${COL.divider}` : 'none',
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {text}
            </span>
            {ts && <span style={{ fontSize: 10, color: COL.muted, flex: '0 0 auto' }}>{fmtAge(ts)}</span>}
          </div>
        );
      })}
    </div>
  );
};
