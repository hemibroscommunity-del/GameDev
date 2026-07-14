import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { skillXpRequired } from '../../../data/items.js';
import { SKILL_ROSTER } from '../sheet/skillsModel.js';

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive).  v2.3.1286 (nav-system): the roster moved to the shared
   sheet/skillsModel.js (canonical lifeSkills.js order — this panel's
   local cooking-first order retired) and the layout becomes the spec's
   3-column card grid: icon, name, level, XP progress toward next.

   XP CURVE FIX: the old local xpForLevel (50 + lvl²·25) never matched
   the real award loop — awardSkillXp levels against skillXpRequired
   (items.js, 500·1.08^(level-1)), so the progress bars here were
   cosmetically wrong from mid levels on.  Now the same function. */
export const SkillsPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}>
        {SKILL_ROSTER.map(sd => {
          const sk = ls[sd.key] || { level: 1, xp: 0 };
          const need = Math.max(1, skillXpRequired(sk.level));
          const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
          return (
            <div key={sd.key} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 6px 8px',
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 8,
              minWidth: 0,
            }}>
              {sd.iconSrc
                ? <img src={sd.iconSrc} alt="" draggable={false}
                    style={{ width: 26, height: 26, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
                : <span style={{ fontSize: 22 }}>{sd.icon}</span>}
              <span style={{
                fontSize: 11, fontWeight: 600, color: COL.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{sd.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                Lv {sk.level || 0}
              </span>
              <div style={{
                alignSelf: 'stretch',
                height: 5,
                background: COL.wellDeep,
                borderRadius: 999,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
              }}>
                <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />
              </div>
              {/* v2.3.1293: 10px floor (round-3 §5) */}
              <span style={{ fontSize: 10, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(sk.xp || 0)} / {need}
              </span>
            </div>
          );
        })}
        {/* 2 pad cells keep the 3x4 card grid square with 10 skills. */}
        {[0, 1].map(i => (
          <div key={`pad-${i}`} aria-hidden="true" style={{
            background: 'rgba(0,0,0,0.18)',
            border: `1px dashed ${COL.tileBor}`,
            borderRadius: 8,
            minHeight: 84,
          }} />
        ))}
      </div>
    </div>
  );
};
