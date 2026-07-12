import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive) — the panel previously listed alchemy / tailoring / taming,
   which don't exist in src/data/lifeSkills.js, and was missing
   woodcutting / enchanting / trapping.  Order matches the dashboard's
   LIFE_SKILLS list.  iconSrc = UI Bible skill icons; emoji is the
   image-failure fallback. */
/* v2.3.1235: batch-2 rollout — the ten per-skill tailwind hexes
   (#f59e0b/#3b82f6/…) were off the approved correction-pass token list
   and made ten differently-coloured progress bars on one sheet; every
   skill bar is XP progress, so they all use the single COL.xp token
   (locked contract: bars carry semantic colors only). */
const SKILL_DEFS = [
  { key: 'cooking',       icon: '🍳', iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',       name: 'Cooking' },
  { key: 'fishing',       icon: '🎣', iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',       name: 'Fishing' },
  { key: 'mining',        icon: '⛏',  iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',        name: 'Mining' },
  { key: 'woodcutting',   icon: '🪓', iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224',   name: 'Woodcutting' },
  { key: 'farming',       icon: '🌾', iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',       name: 'Farming' },
  { key: 'blacksmithing', icon: '🔨', iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', name: 'Smithing' },
  { key: 'woodworking',   icon: '🛠',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',   name: 'Woodworking' },
  { key: 'gemCutting',    icon: '💎', iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',    name: 'Gem cutting' },
  { key: 'enchanting',    icon: '✨', iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224',    name: 'Enchanting' },
  { key: 'trapping',      icon: '🪤', iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224',      name: 'Trapping' },
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
          /* v2.3.1235: batch-2 rollout — rows onto the contract ladder:
             13/600 body name + 13/700 tabular value (was a loose 15),
             6px bar on the well-deep track at pill radius (the shared
             bar recipe; the old rgba(.06) track was an off-token gray),
             and enough row height that ten rows still scan cleanly. */
          <div key={sd.key} style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, minHeight: 22,
            }}>
              <span style={{ color: COL.text, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {/* v2.3.1224: UI Bible icon with emoji fallback */}
                {sd.iconSrc
                  ? <img src={sd.iconSrc} alt="" draggable={false}
                      style={{ width: 16, height: 16, objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
                  : <span>{sd.icon}</span>}
                {sd.name}
              </span>
              <span style={{ color: COL.text, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                Lv {sk.level}
              </span>
            </div>
            <div style={{
              height: 6,
              background: COL.wellDeep,
              borderRadius: 999,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
            }}>
              <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
