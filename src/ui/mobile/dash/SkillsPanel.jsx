import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive) — the panel previously listed alchemy / tailoring / taming,
   which don't exist in src/data/lifeSkills.js, and was missing
   woodcutting / enchanting / trapping.  Order matches the dashboard's
   LIFE_SKILLS list.  iconSrc = UI Bible skill icons; emoji is the
   image-failure fallback. */
const SKILL_DEFS = [
  { key: 'cooking',       icon: '🍳', iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',       name: 'Cooking',       color: '#f59e0b' },
  { key: 'fishing',       icon: '🎣', iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',       name: 'Fishing',       color: '#3b82f6' },
  { key: 'mining',        icon: '⛏',  iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',        name: 'Mining',        color: '#8a8a8a' },
  { key: 'woodcutting',   icon: '🪓', iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224',   name: 'Woodcutting',   color: '#92400e' },
  { key: 'farming',       icon: '🌾', iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',       name: 'Farming',       color: '#84cc16' },
  { key: 'blacksmithing', icon: '🔨', iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', name: 'Smithing',      color: '#a3a3a3' },
  { key: 'woodworking',   icon: '🛠',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',   name: 'Woodworking',   color: '#b45309' },
  { key: 'gemCutting',    icon: '💎', iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',    name: 'Gem cutting',   color: '#a855f7' },
  { key: 'enchanting',    icon: '✨', iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224',    name: 'Enchanting',    color: '#22d3ee' },
  { key: 'trapping',      icon: '🪤', iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224',      name: 'Trapping',      color: '#10b981' },
];

const xpForLevel = (lvl) => Math.floor(50 + lvl * lvl * 25);

export const SkillsPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const ls = S?.rpg?.lifeSkills || {};

  return (
    <div style={panelStyle}>
      {SKILL_DEFS.map(sd => {
        const sk = ls[sd.key] || { level: 1, xp: 0 };
        const need = xpForLevel(sk.level);
        const pct = Math.min(100, (sk.xp / need) * 100);
        return (
          <div key={sd.key} style={{ marginBottom: 4 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 15,
            }}>
              <span style={{ color: COL.text, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {/* v2.3.1224: UI Bible icon with emoji fallback */}
                {sd.iconSrc
                  ? <img src={sd.iconSrc} alt="" draggable={false}
                      style={{ width: 16, height: 16, objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
                  : <span>{sd.icon}</span>}
                {sd.name}
              </span>
              <span style={{ color: COL.muted }}>Lv {sk.level}</span>
            </div>
            <div style={{
              height: 4,
              background: 'rgba(238, 242, 235, .06)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{ width: pct + '%', height: '100%', background: sd.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
