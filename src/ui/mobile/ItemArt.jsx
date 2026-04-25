import React from 'react';
import { ELEMENT_COLOR } from './inventoryStyles.js';

// Per spec §1.7a, tiles render the OBJECT not an icon abstraction.
// Until real art is wired in, these are stylized SVG silhouettes that
// vary by item type, tier, quality, and equipped gems — enough visual
// signal that two tiles for different items don't look identical.

const RARITY_TINT = {
  normal: { fill: '#3a3833', stroke: '#857d6a' },
  rare:   { fill: '#2c4a6a', stroke: '#7aaecf' },
  elite:  { fill: '#3a2a52', stroke: '#b88dd4' },
  godly:  { fill: '#3a2c0a', stroke: '#e8d4a0' },
};

const Sword = ({ tint }) => (
  <g>
    <rect x="11" y="2" width="2" height="14" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.5" />
    <polygon points="11,2 13,2 12,0" fill={tint.stroke} />
    <rect x="8" y="15" width="8" height="1.5" fill={tint.stroke} />
    <rect x="11.3" y="16.5" width="1.4" height="3" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.4" />
    <circle cx="12" cy="20.5" r="1.2" fill={tint.stroke} />
  </g>
);
const Bow = ({ tint }) => (
  <g>
    <path d="M6 4 Q 18 12 6 20" fill="none" stroke={tint.stroke} strokeWidth="1.4" />
    <line x1="6" y1="4" x2="6" y2="20" stroke={tint.fill} strokeWidth="0.6" />
  </g>
);
const Staff = ({ tint }) => (
  <g>
    <line x1="12" y1="3" x2="12" y2="22" stroke={tint.stroke} strokeWidth="1.2" />
    <circle cx="12" cy="4" r="2.4" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.6" />
  </g>
);
const Armor = ({ tint }) => (
  <g>
    <path d="M6 4 L12 6 L18 4 L17 18 Q 12 21 7 18 Z" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.6" />
    <line x1="12" y1="6" x2="12" y2="20" stroke={tint.stroke} strokeWidth="0.4" />
  </g>
);
const Potion = ({ tint, color }) => (
  <g>
    <path d="M10 3 H14 V6 L17 11 V19 Q 12 22 7 19 V11 Z" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.5" />
    <path d="M8 13 H16 V19 Q 12 21 8 19 Z" fill={color || '#9C2A2A'} opacity="0.85" />
  </g>
);
const Gem = ({ tint, color }) => (
  <g>
    <polygon points="12,3 20,10 16,21 8,21 4,10" fill={color || tint.fill} stroke={tint.stroke} strokeWidth="0.6" />
    <polygon points="12,3 16,10 12,15 8,10" fill="rgba(255,255,255,.15)" />
  </g>
);
const Material = ({ tint }) => (
  <g>
    <polygon points="4,18 8,8 16,8 20,18 18,21 6,21" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.5" />
  </g>
);
const Pet = ({ tint }) => (
  <g>
    <ellipse cx="12" cy="14" rx="6" ry="5" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.6" />
    <circle cx="9" cy="9" r="2.6" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.6" />
    <circle cx="9" cy="9" r="0.7" fill={tint.stroke} />
    <polygon points="6.5,7 8,4 9,7" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.4" />
  </g>
);
const Tool = ({ tint }) => (
  <g>
    <rect x="11" y="3" width="2" height="13" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.5" />
    <path d="M6 16 H18 L16 19 H8 Z" fill={tint.fill} stroke={tint.stroke} strokeWidth="0.5" />
  </g>
);

const ART_BY_TYPE = {
  weapon:   ({ tint, item }) =>
    item.subtype === 'bow'   ? <Bow tint={tint} /> :
    item.subtype === 'staff' ? <Staff tint={tint} /> : <Sword tint={tint} />,
  armor:    ({ tint }) => <Armor tint={tint} />,
  pet:      ({ tint }) => <Pet tint={tint} />,
  tool:     ({ tint }) => <Tool tint={tint} />,
  potion:   ({ tint, item }) => <Potion tint={tint} color={
    item.potionKind === 'mana'  ? '#3A6FB8' :
    item.potionKind === 'other' ? '#3A8E55' : '#A82E2E' } />,
  gem:      ({ tint, item }) => <Gem tint={tint} color={ELEMENT_COLOR[item.element] || tint.stroke} />,
  material: ({ tint }) => <Material tint={tint} />,
};

// Gem dots in top-right corner of weapons/armor (spec §"Carrying").
const GemDots = ({ gems }) => {
  if (!gems || !gems.length) return null;
  return (
    <g>
      {gems.slice(0, 4).map((g, i) => (
        <circle key={i} cx={20 - i * 2.4} cy={3.5} r={1.1}
          fill={ELEMENT_COLOR[g] || '#888'} stroke="rgba(0,0,0,.4)" strokeWidth="0.3" />
      ))}
    </g>
  );
};

export const ItemArt = ({ item, size = 48 }) => {
  if (!item) return null;
  const tint = RARITY_TINT[item.quality] || RARITY_TINT.normal;
  const Comp = ART_BY_TYPE[item.type] || ART_BY_TYPE.material;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <Comp tint={tint} item={item} />
      <GemDots gems={item.gems} />
    </svg>
  );
};
