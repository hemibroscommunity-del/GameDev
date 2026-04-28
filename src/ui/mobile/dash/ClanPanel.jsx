import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

export const ClanPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const clan = S?._clanData || null;

  if (!clan) {
    return (
      <div style={panelStyle}>
        <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '10px 0' }}>
          You aren't in a clan.
        </div>
        <div style={{ fontSize: 11, color: COL.muted, textAlign: 'center' }}>
          Find a clan member in town to join, or use the legacy clan panel
          (`window.__broLegacyUI?.clan?.()`) to create one.
        </div>
      </div>
    );
  }

  const members = clan.members || [];
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        [{clan.tag}] {clan.name}
      </div>
      <div style={{ fontSize: 11, color: COL.muted, marginBottom: 6 }}>
        {members.length} member{members.length === 1 ? '' : 's'}
      </div>
      {members.slice(0, 10).map((m, i) => (
        <div key={m.id || i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          fontSize: 12,
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          <span>{m.name || m.id}</span>
          <span style={{ color: COL.muted }}>Lv {m.level ?? '–'}</span>
        </div>
      ))}
    </div>
  );
};
