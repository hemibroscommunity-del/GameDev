import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const TABS = [
  { id: 'bestiary',  label: 'Bestiary' },
  { id: 'codex',     label: 'Codex' },
  { id: 'materials', label: 'Materials' },
  { id: 'zones',     label: 'Zones' },
];

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — category
   buttons become spec chips (32px pill; selected = brass-fill #3B3427
   + brass label instead of a solid brass slab), discovery rows go to
   44px with tabular ×counts right-aligned, and the empty state gets
   the codex icon at .4 opacity.  Tab state, the row-building switch
   and the 800ms refresh interval are unchanged. */
/* v2.3.1235: batch-1 rollout — the tappable chip button is now a
   transparent 44px-tall hitbox (contract: every interactive element
   ≥44×44) wrapping the 32px visual pill, so the approved chip look
   survives without an undersized touch target. */
const chipHit = {
  flex: '0 0 auto',
  minHeight: 44,
  padding: 0,
  margin: 0,
  background: 'transparent',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
const chip = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

export const EncyclopediaPanel = () => {
  const [tab, setTab] = useState('bestiary');
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = S?.rpg || {};
  const seenMonsters  = R._seenMonsters  || R.killedMonsters || {};
  const seenCol       = R._seenCollisions || {};
  const seenMats      = R._seenMaterials || {};
  const seenZones     = R._visitedZones || R._seenZones || [];

  let rows = [];
  if (tab === 'bestiary') {
    rows = Object.entries(seenMonsters).map(([id, n]) => ({ id, label: id, count: n }));
  } else if (tab === 'codex') {
    rows = Object.keys(seenCol).map(id => ({ id, label: id }));
  } else if (tab === 'materials') {
    rows = Object.entries(seenMats).map(([id, n]) => ({ id, label: id, count: n }));
  } else if (tab === 'zones') {
    rows = (seenZones || []).map(z => ({ id: z, label: z }));
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, overflowX: 'auto', padding: '2px 0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={chipHit}>
            <span style={chip(t.id === tab)}>{t.label}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {/* v2.3.1235: batch-1 rollout — empty-state contract: icon ≤40px,
              message 13/700 secondary (was 44px icon + 13/400 muted). */}
          <img src="/icons/ui/nav-codex.webp" alt="" draggable={false}
            style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('📖')); }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>
            Nothing discovered in this category yet.
          </div>
        </div>
      ) : rows.map(r => (
        <div key={r.id} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 44,
          padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          {/* v2.3.1235: batch-1 rollout — type ladder: body 13 (was 13.5),
              row key number 16/700 tabular primary (was 14/700 secondary). */}
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.label}</span>
          {r.count != null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
              ×{r.count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
