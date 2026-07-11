import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — the two
   view buttons become a spec segmented control (36px on the #121B20
   well track; active segment raised #2B3940 + 2px brass bottom edge),
   friend rows go to 44px with spec presence colors (positive #59BF91 /
   disabled #687575 — the old teal/indigo dots were off-palette), and
   empty states get the icon-at-.4 treatment.  showBlocked state,
   presence lookups and the 1s refresh interval are unchanged. */
const seg = (active) => ({
  flex: 1,
  height: 36,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
  touchAction: 'manipulation',
});

const Empty = ({ line }) => (
  <div style={{ textAlign: 'center', padding: '16px 0' }}>
    <img src="/icons/ui/nav-friends.webp" alt="" draggable={false}
      style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4 }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('👥')); }} />
    <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>{line}</div>
  </div>
);

export const SocialPanel = () => {
  const [, force] = useState(0);
  const [showBlocked, setShowBlocked] = useState(false);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const friends = S?.friends || S?._friends || [];
  const blocked = S?.blocked || S?._blocked || [];
  const onlinePlayers = S?.players || {};

  return (
    <div style={panelStyle}>
      <div style={{
        display: 'flex', gap: 2, marginBottom: 8,
        background: COL.well, borderRadius: 10, padding: 2,
        border: `1px solid ${COL.tileBor}`,
      }}>
        <button onClick={() => setShowBlocked(false)} style={seg(!showBlocked)}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setShowBlocked(true)} style={seg(showBlocked)}>
          Blocked ({blocked.length})
        </button>
      </div>

      {!showBlocked ? (
        friends.length === 0 ? (
          <Empty line="No friends added yet." />
        ) : friends.map((f, i) => {
          const fid = f.id || f;
          const online = !!onlinePlayers[fid];
          return (
            <div key={fid} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              minHeight: 44,
              padding: '0 8px',
              borderBottom: i < friends.length - 1 ? `1px solid ${COL.divider}` : 'none',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: online ? '#59BF91' : '#687575',
                flex: '0 0 auto',
              }} />
              <span style={{
                flex: 1, minWidth: 0, fontSize: 13.5, color: COL.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{f.name || fid}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: COL.muted }}>
                {online ? 'online' : 'offline'}
              </span>
            </div>
          );
        })
      ) : (
        blocked.length === 0 ? (
          <Empty line="Nobody blocked." />
        ) : blocked.map((b, i) => (
          <div key={b.id || b} style={{
            display: 'flex', alignItems: 'center',
            minHeight: 44,
            padding: '0 8px',
            fontSize: 13.5, color: COL.text,
            borderBottom: i < blocked.length - 1 ? `1px solid ${COL.divider}` : 'none',
          }}>{b.name || b}</div>
        ))
      )}
    </div>
  );
};
