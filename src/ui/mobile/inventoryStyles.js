// Inventory color and typography canon (spec §8).

export const INV = {
  bg:        '#1A1A1A',
  tabBar:    '#1A1A1A',
  tabBorder: 'rgba(255, 255, 255, 0.1)',
  tileFill:  'rgba(255, 255, 255, 0.04)',
  tileBorder:'rgba(255, 255, 255, 0.15)',
  tileBannerGrad: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.78) 55%)',
  chipActive:   'rgba(255, 255, 255, 0.18)',
  chipInactive: 'rgba(255, 255, 255, 0.06)',
  newBadge:  '#D4594A',
  shortcutBadgeBg:    'rgba(0, 0, 0, 0.6)',
  shortcutBadgeColor: '#E8D4A0',
  textPrimary:  '#F0F0F0',
  textMuted:    'rgba(255, 255, 255, 0.55)',
  textVeryMuted:'rgba(255, 255, 255, 0.35)',
  positive: '#9CCC6B',
  negative: '#DC8060',
  primaryBtn:    '#4A9ACC',
  destructive:   '#E89080',
  destructiveBg: 'rgba(200, 80, 60, 0.1)',
  destructiveBorder: 'rgba(200, 80, 60, 0.25)',
  marketAccent:    '#E8D4A0',
  marketBg:        'rgba(212, 162, 74, 0.06)',
  marketBorder:    'rgba(212, 162, 74, 0.2)',
  godlyBg:    '#0F0715',
  newAccentBorder: 'rgba(212, 162, 74, 0.6)',
  newAccentFill:   'rgba(212, 162, 74, 0.12)',
  // Equipped slot tints
  slotWeaponBorder: 'rgba(80, 140, 200, 0.55)',
  slotArmorBorder:  'rgba(140, 110, 80, 0.4)',
  slotPetBorder:    'rgba(100, 140, 90, 0.4)',
  slotToolBorder:   'rgba(255, 255, 255, 0.2)',
  silhouetteSkin:    '#D4B090',
  silhouetteCloth:   '#6A7A8A',
  silhouetteGradient:'rgba(80, 120, 160, 0.08)',
};

export const FONT = {
  serif: '"Atkinson Hyperlegible", sans-serif',
  sans:  '"Atkinson Hyperlegible", sans-serif',
  mono:  '"Atkinson Hyperlegible", sans-serif',
};

// Quality / rarity tints (Elite + Godly tile borders).
export const RARITY_BORDER = {
  normal: INV.tileBorder,
  rare:   'rgba(80, 140, 200, 0.55)',
  elite:  'rgba(180, 130, 220, 0.6)',
  godly:  'rgba(232, 212, 160, 0.85)',
};
export const RARITY_FILL = {
  normal: INV.tileFill,
  rare:   'rgba(80, 140, 200, 0.08)',
  elite:  'rgba(180, 130, 220, 0.10)',
  godly:  'rgba(232, 212, 160, 0.10)',
};

export const POTION_TINT = {
  hp:    { border: 'rgba(220, 70, 70, 0.30)', fill: 'rgba(220, 70, 70, 0.08)' },
  mana:  { border: 'rgba(70, 120, 220, 0.30)',fill: 'rgba(70, 120, 220, 0.08)' },
  other: { border: 'rgba(120, 180, 90, 0.30)',fill: 'rgba(120, 180, 90, 0.08)' },
};

export const ELEMENT_COLOR = {
  flame: '#E8704A', frost: '#5AA8E8', flora: '#7BC25A', stone: '#9C8B6A',
  wind:  '#A6D9D2', light: '#E8D29B', dark:  '#7E5BA3', volt:  '#E0D85C',
};
