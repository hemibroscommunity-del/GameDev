import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

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
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button onClick={() => setShowBlocked(false)} style={{
          flex: 1, padding: '4px',
          background: !showBlocked ? COL.accent : 'transparent',
          color: !showBlocked ? '#fff' : COL.muted,
          border: `1px solid ${!showBlocked ? COL.accent : COL.tileBor}`,
          borderRadius: 4, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
        }}>Friends ({friends.length})</button>
        <button onClick={() => setShowBlocked(true)} style={{
          flex: 1, padding: '4px',
          background: showBlocked ? COL.accent : 'transparent',
          color: showBlocked ? '#fff' : COL.muted,
          border: `1px solid ${showBlocked ? COL.accent : COL.tileBor}`,
          borderRadius: 4, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
        }}>Blocked ({blocked.length})</button>
      </div>

      {!showBlocked ? (
        friends.length === 0 ? (
          <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
            No friends added yet.
          </div>
        ) : friends.map((f, i) => {
          const fid = f.id || f;
          const online = !!onlinePlayers[fid];
          return (
            <div key={fid} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 0',
              borderBottom: i < friends.length - 1 ? `1px solid ${COL.divider}` : 'none',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: online ? '#3dd497' : '#4d5580',
                flex: '0 0 auto',
              }} />
              <span style={{ flex: 1, fontSize: 12 }}>{f.name || fid}</span>
              <span style={{ fontSize: 10, color: COL.muted }}>{online ? 'online' : 'offline'}</span>
            </div>
          );
        })
      ) : (
        blocked.length === 0 ? (
          <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
            Nobody blocked.
          </div>
        ) : blocked.map((b, i) => (
          <div key={b.id || b} style={{
            fontSize: 12, padding: '4px 0',
            borderBottom: i < blocked.length - 1 ? `1px solid ${COL.divider}` : 'none',
          }}>{b.name || b}</div>
        ))
      )}
    </div>
  );
};
