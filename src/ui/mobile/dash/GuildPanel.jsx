import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

export const GuildPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = S?.rpg || {};
  const guild = R.guild || S?._guild || null;

  if (!guild) {
    return (
      <div style={panelStyle}>
        <div style={{ color: COL.muted, fontSize: 15, textAlign: 'center', padding: '14px 0' }}>
          You haven't joined a guild yet.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{guild.name || 'Guild'}</div>
      <div style={{ fontSize: 15, color: COL.muted, marginBottom: 6 }}>
        Rank {guild.rank ?? 1} · Members {guild.memberCount ?? 0}
      </div>
      {guild.skills && Object.entries(guild.skills).map(([k, v]) => (
        <div key={k} style={{ fontSize: 15, color: COL.text, padding: '2px 0' }}>
          {k}: Lv {v.level || 0}
        </div>
      ))}
    </div>
  );
};
