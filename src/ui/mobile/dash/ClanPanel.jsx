import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state, identity strip with the clan icon, module header +
   44px member rows with right-aligned tabular levels.  Data reads,
   the members slice(0, 10) cap, and the 800ms refresh interval are
   unchanged. */
const secHdr = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.12em', color: COL.muted, margin: '12px 8px 4px',
};

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
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
          <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>
            You aren't in a clan.
          </div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 4, lineHeight: 1.4 }}>
            Find a clan member in town to join, or use the legacy clan panel
            (`window.__broLegacyUI?.clan?.()`) to create one.
          </div>
        </div>
      </div>
    );
  }

  const members = clan.members || [];
  return (
    <div style={panelStyle}>
      {/* Identity strip — icon + [TAG] name over the member count. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px' }}>
        <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
          style={{ width: 28, height: 28, objectFit: 'contain', flex: '0 0 auto' }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>[{clan.tag}] {clan.name}</div>
          <div style={{ fontSize: 12, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <div style={secHdr}>Members</div>
      {members.slice(0, 10).map((m, i) => (
        <div key={m.id || i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13.5, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{m.name || m.id}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
            Lv {m.level ?? '–'}
          </span>
        </div>
      ))}
    </div>
  );
};
