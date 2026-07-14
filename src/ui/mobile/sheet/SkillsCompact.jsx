import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { SKILL_ROSTER } from './skillsModel.js';

/* v2.3.1286: Skills compact — all life skills at a glance (nav-system
   spec §Skills Compact): identical square tiles, icon + level badge,
   stable canonical order, no progress bars (that's the expanded view's
   job).  v2.3.1291 (ChatGPT round-3 §2/§4): 5x2 — the game has TEN
   life skills, so five columns fills the grid exactly (no dead cells)
   and every icon gets ~20% more pixels than the old 6x2.  The tiles
   stop being squares and fill the row height instead — width comes
   from the 5-col split, height from the band. */
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
      gridTemplateColumns: 'repeat(5, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: 8,
      padding: '8px 8px',
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
              width: '100%',
              minWidth: 0, minHeight: 0,
            }}>
            {sd.iconSrc
              ? <img src={sd.iconSrc} alt={sd.name} draggable={false}
                  style={{ width: 36, height: 36, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
              : <span style={{ fontSize: 26 }}>{sd.icon}</span>}
            <span className="bt-item-qty">{lvl}</span>
          </div>
        );
      })}
    </div>
  );
};
