import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState, openGameWindow } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state, identity strip with the clan icon, module header +
   44px member rows with right-aligned tabular levels.  Data reads,
   the members slice(0, 10) cap, and the 800ms refresh interval are
   unchanged. */
const secHdr = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.12em', color: COL.muted, margin: '12px 8px 4px',
};
/* v2.3.3066: the way into the clan window (src/ui/panels/ClanPanel.jsx),
   where a clan is made, run and joined -- this page only reads.  The
   no-clan state told players to call `window.__broLegacyUI?.clan?.()`. */
const btn = {
  font: 'inherit',   /* first: after fontSize/fontWeight the shorthand would reset them */
  display: 'block', width: 'calc(100% - 16px)', margin: '10px 8px 2px', minHeight: 44, borderRadius: 10,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const btnBrass = { ...btn, background: COL.accent, color: COL.onAccent, border: `1px solid ${COL.accent}` };
const btnRaised = { ...btn, background: COL.raised, color: COL.text, border: `1px solid ${COL.borderStrong}` };

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
      <div style={panelStyle} data-dash-clan="none">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
          <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>
            You aren't in a clan.
          </div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 4, lineHeight: 1.4, padding: '0 12px' }}>
            Make one, or join one when a clan leader invites you. Clans meet at
            the Guild Hall in Brotown.
          </div>
        </div>
        <button type="button" data-dash-open-clan="" style={btnBrass} onClick={() => openGameWindow('clanOpen')}>
          Make a clan
        </button>
      </div>
    );
  }

  const members = clan.members || [];
  return (
    <div style={panelStyle} data-dash-clan={clan.tag || 'clan'}>
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
      <button type="button" data-dash-open-clan="" style={btnRaised} onClick={() => openGameWindow('clanOpen')}>
        Open the clan window
      </button>
    </div>
  );
};
