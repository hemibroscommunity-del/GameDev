import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const SKILL_DEFS = [
  { key: 'cooking',       icon: '🍳', name: 'Cooking',       color: '#f59e0b' },
  { key: 'fishing',       icon: '🎣', name: 'Fishing',       color: '#3b82f6' },
  { key: 'farming',       icon: '🌾', name: 'Farming',       color: '#84cc16' },
  { key: 'blacksmithing', icon: '🔨', name: 'Smithing',      color: '#a3a3a3' },
  { key: 'gemCutting',    icon: '💎', name: 'Gem cutting',   color: '#a855f7' },
  { key: 'alchemy',       icon: '⚗',  name: 'Alchemy',       color: '#22d3ee' },
  { key: 'woodworking',   icon: '🪓', name: 'Woodworking',   color: '#92400e' },
  { key: 'tailoring',     icon: '🧵', name: 'Tailoring',     color: '#ec4899' },
  { key: 'taming',        icon: '🐾', name: 'Taming',        color: '#10b981' },
  { key: 'mining',        icon: '⛏',  name: 'Mining',        color: '#8a8a8a' },
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
              <span style={{ color: COL.text }}>{sd.icon} {sd.name}</span>
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
