import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const fmtAge = (ts) => {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h';
  return Math.floor(sec / 86400) + 'd';
};

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state (journey icon at .4 + one muted line) and 44px log rows:
   entry text as 13.5 body, age as a right-aligned tabular caption.
   Entry normalization, the reverse/slice(0, 30) window, and the 1s
   refresh interval are unchanged. */
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
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {/* v2.3.1235: batch-1 rollout — empty-state spec: icon ≤40px,
            message 13/700 secondary. */}
        <img src="/icons/ui/nav-journey.webp" alt="" draggable={false}
          style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🧭')); }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>
          Your journey is just beginning.
        </div>
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
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
            padding: '0 8px',
            borderBottom: i < entries.length - 1 ? `1px solid ${COL.divider}` : 'none',
          }}>
            {/* v2.3.1235: batch-1 rollout — body copy is 13px on the
                locked contract ladder (13.5 was the older spec value). */}
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {text}
            </span>
            {ts && <span style={{ fontSize: 11, fontWeight: 600, color: COL.muted, fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>{fmtAge(ts)}</span>}
          </div>
        );
      })}
    </div>
  );
};
