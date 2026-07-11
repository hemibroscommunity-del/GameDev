import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state (icon at .4 opacity + one muted line), identity strip
   with the guild icon, module header + 44px rows with right-aligned
   tabular values for guild skills.  Data reads and the 800ms refresh
   interval are unchanged. */
const secHdr = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.12em', color: COL.muted, margin: '12px 8px 4px',
};
const row = {
  display: 'flex', alignItems: 'center', gap: 8,
  minHeight: 44, padding: '0 8px',
  borderBottom: `1px solid ${COL.divider}`,
};

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
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img src="/icons/ui/panel-guild.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4 }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('⚒')); }} />
          <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>
            You haven't joined a guild yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Identity strip — icon + name over rank/member metadata. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px' }}>
        <img src="/icons/ui/panel-guild.webp" alt="" draggable={false}
          style={{ width: 28, height: 28, objectFit: 'contain', flex: '0 0 auto' }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('⚒')); }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{guild.name || 'Guild'}</div>
          <div style={{ fontSize: 12, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
            Rank {guild.rank ?? 1} · Members {guild.memberCount ?? 0}
          </div>
        </div>
      </div>
      {guild.skills && <div style={secHdr}>Guild skills</div>}
      {guild.skills && Object.entries(guild.skills).map(([k, v]) => (
        <div key={k} style={row}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: COL.text2, textTransform: 'capitalize' }}>
            {k}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
            Lv {v.level || 0}
          </span>
        </div>
      ))}
    </div>
  );
};
