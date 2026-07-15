import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { skillXpRequired } from '../../../data/items.js';
import { SKILL_DISPLAY_10 } from './skillsModel.js';
import { skillDetailBus } from './skillDetailBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1286: Skills compact — all life skills at a glance.
   v2.3.1312 (owner lifeskills spec): clean 5x2 grid of the TEN
   playable skills — the two SOON cells are gone ('they consume space,
   make the game look unfinished, and force six narrow columns').
   Row 1 gathering, row 2 crafting; one permanent canonical order,
   never resorted.
   Each tile: larger icon, Lv N, and a very thin XP track along the
   bottom.  DISTINCT signals (the old per-skill accent hairline read
   as either selection or progress — ambiguous):
   - brass BORDER = selected / last-viewed skill (skillDetailBus,
     persisted);
   - green LINE   = XP progress within the current level;
   - dark empty track = zero XP.
   Tapping a tile expands the sheet AND opens that skill's in-panel
   detail view directly (skillDetailBus.open). */
export const SkillsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => skillDetailBus.subscribe(() => force(v => v + 1)), []);

  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};
  const lastViewed = skillDetailBus.selected();

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: 6,
      padding: '8px 8px',
    }}>
      {SKILL_DISPLAY_10.map(sd => {
        const sk = ls[sd.key] || { level: 0, xp: 0 };
        const lvl = sk.level || 0;
        const need = Math.max(1, skillXpRequired(lvl));
        const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
        const isLast = sd.key === lastViewed;
        const iconPx = Math.round(34 * (sd.iconScale || 1));
        return (
          <button key={sd.key}
            title={`${sd.name} · Lv ${lvl}`}
            onPointerUp={(e) => {
              e.stopPropagation();
              skillDetailBus.open(sd.key);
              dashboardPanelBus.expand();
            }}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              borderRadius: 8,
              background: COL.wellSoft,
              border: `1px solid ${isLast ? COL.accent : COL.tileBor}`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,.30)',
              width: '100%',
              minWidth: 0, minHeight: 0,
              padding: '0 0 5px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              fontFamily: 'Source Sans 3, sans-serif',
              overflow: 'hidden',
            }}>
            {sd.iconSrc
              ? <img src={sd.iconSrc} alt={sd.name} draggable={false}
                  style={{ width: iconPx, height: iconPx, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
              : <span style={{ fontSize: 24 }}>{sd.icon}</span>}
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
            {/* Very thin XP track along the tile bottom: green = XP
                progress, dark = zero.  Selection never touches this
                line (it lives on the border). */}
            <div style={{
              position: 'absolute', left: 4, right: 4, bottom: 2,
              height: 3, borderRadius: 999, overflow: 'hidden',
              background: '#0A1318',
              pointerEvents: 'none',
            }}>
              {pct > 0 && (
                <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
