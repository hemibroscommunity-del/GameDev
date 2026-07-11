import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1224: iconSrc = UI Bible skill icons where one exists; alchemy /
   tailoring / taming keep emoji (not in the canonical LIFE_SKILLS set,
   so no icons were generated for them).  Roster left as-is on purpose —
   this change is icons only. */
const SKILL_DEFS = [
  { key: 'cooking',       icon: '🍳', iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',       name: 'Cooking',       color: '#f59e0b' },
  { key: 'fishing',       icon: '🎣', iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',       name: 'Fishing',       color: '#3b82f6' },
  { key: 'farming',       icon: '🌾', iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',       name: 'Farming',       color: '#84cc16' },
  { key: 'blacksmithing', icon: '🔨', iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', name: 'Smithing',      color: '#a3a3a3' },
  { key: 'gemCutting',    icon: '💎', iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',    name: 'Gem cutting',   color: '#a855f7' },
  { key: 'alchemy',       icon: '⚗',  name: 'Alchemy',       color: '#22d3ee' },
  { key: 'woodworking',   icon: '🪓', iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',   name: 'Woodworking',   color: '#92400e' },
  { key: 'tailoring',     icon: '🧵', name: 'Tailoring',     color: '#ec4899' },
  { key: 'taming',        icon: '🐾', name: 'Taming',        color: '#10b981' },
  { key: 'mining',        icon: '⛏',  iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',        name: 'Mining',        color: '#8a8a8a' },
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
              background: 'rgba(255,255,255,.06)',
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
