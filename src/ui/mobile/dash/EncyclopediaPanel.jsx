import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const TABS = [
  { id: 'bestiary',  label: 'Bestiary' },
  { id: 'codex',     label: 'Codex' },
  { id: 'materials', label: 'Materials' },
  { id: 'zones',     label: 'Zones' },
];

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
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, overflowX: 'auto' }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: '0 0 auto',
                padding: '3px 8px',
                background: active ? COL.accent : 'transparent',
                color: active ? '#fff' : COL.muted,
                border: `1px solid ${active ? COL.accent : COL.tileBor}`,
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 15,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <div style={{ color: COL.muted, fontSize: 15, textAlign: 'center', padding: '14px 0' }}>
          Nothing discovered in this category yet.
        </div>
      ) : rows.map(r => (
        <div key={r.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          fontSize: 15,
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          <span>{r.label}</span>
          {r.count != null && <span style={{ color: COL.muted }}>×{r.count}</span>}
        </div>
      ))}
    </div>
  );
};
