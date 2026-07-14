import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { SKILL_ROSTER } from './skillsModel.js';

/* v2.3.1286: Skills compact — all life skills at a glance (nav-system
   spec §Skills Compact): a 6x2 grid of identical square tiles, icon +
   level badge, stable canonical order, no progress bars (that's the
   expanded view's job).  10 real skills + 2 clean empty cells. */
export const SkillsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: 8,
      padding: '8px 8px',
      alignContent: 'start',
    }}>
      {SKILL_ROSTER.map(sd => {
        const lvl = (ls[sd.key] && ls[sd.key].level) || 0;
        return (
          <div key={sd.key}
            title={`${sd.name} · Lv ${lvl}`}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,.30)',
              aspectRatio: '1 / 1',
              width: '100%',
              minWidth: 0, minHeight: 0,
            }}>
            {sd.iconSrc
              ? <img src={sd.iconSrc} alt={sd.name} draggable={false}
                  style={{ width: '68%', height: '68%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
              : <span style={{ fontSize: 22 }}>{sd.icon}</span>}
            <span className="bt-item-qty">{lvl}</span>
          </div>
        );
      })}
      {/* 2 empty cells square out the 6x2 grid (10 real skills). */}
      {[0, 1].map(i => (
        <div key={`pad-${i}`} aria-hidden="true" style={{
          aspectRatio: '1 / 1', width: '100%',
          background: COL.wellSoft,
          border: `1px solid ${COL.tileBor}`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)',
          borderRadius: 8,
        }} />
      ))}
    </div>
  );
};
