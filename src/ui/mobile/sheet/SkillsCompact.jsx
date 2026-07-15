import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { SKILL_DISPLAY_12 } from './skillsModel.js';
import { skillsFocusBus } from './skillsFocusBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1286: Skills compact — all life skills at a glance.
   v2.3.1296 (ChatGPT round-5, owner: keep placeholders for the two
   future skills): back to a 6x2 twelve-cell grid, but DESIGNED for
   twelve — top row gathering, bottom row processing, two quiet "soon"
   cells padding the roster.  One permanent canonical order (display
   order in skillsModel), never resorted.
   - Rect "Lv N" tag replaces the circular badge: the circle was the
     Bag QUANTITY language, and a skill level is not an item count.
   - Per-skill accent hairline along the tile bottom (restrained; the
     tiles stay dark), iconScale evens out optical sizes.
   - Tapping a tile expands Skills and scrolls that card into view
     (skillsFocusBus) — the icons become a way to learn the symbols. */
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
      gap: 6,
      padding: '8px 8px',
    }}>
      {SKILL_DISPLAY_12.map(sd => {
        if (sd.placeholder) {
          return (
            <div key={sd.key} aria-hidden="true" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: 'rgba(0,0,0,.18)',
              border: `1px dashed ${COL.tileBor}`,
              minWidth: 0, minHeight: 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: COL.disabled }}>SOON</span>
            </div>
          );
        }
        const lvl = (ls[sd.key] && ls[sd.key].level) || 0;
        const iconPx = Math.round(30 * (sd.iconScale || 1));
        return (
          <button key={sd.key}
            title={`${sd.name} · Lv ${lvl}`}
            onPointerUp={(e) => {
              e.stopPropagation();
              skillsFocusBus.focus(sd.key);
              dashboardPanelBus.expand();
            }}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              borderRadius: 8,
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              /* accent hairline: identifying, not loud */
              borderBottom: `2px solid ${sd.accent}55`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,.30)',
              width: '100%',
              minWidth: 0, minHeight: 0,
              padding: 0,
              cursor: 'pointer',
              touchAction: 'manipulation',
              fontFamily: 'Source Sans 3, sans-serif',
            }}>
            {sd.iconSrc
              ? <img src={sd.iconSrc} alt={sd.name} draggable={false}
                  style={{ width: iconPx, height: iconPx, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
              : <span style={{ fontSize: 22 }}>{sd.icon}</span>}
            {/* Rect level tag — NOT the circular bag-quantity badge. */}
            <span style={{
              fontSize: 10, fontWeight: 700, lineHeight: 1.2,
              color: COL.text2,
              background: 'rgba(0,0,0,.42)',
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 4,
              padding: '0 4px',
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
            }}>Lv {lvl}</span>
          </button>
        );
      })}
    </div>
  );
};
