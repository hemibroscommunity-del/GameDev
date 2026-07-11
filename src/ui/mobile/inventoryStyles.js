// Inventory color and typography canon (spec §8).
// v2.3.1227: Lantern Slate (docs/LANTERN-SLATE-SPEC.md) — charcoal
// surfaces, warm-white text, brass primary, thin rarity edges.

export const INV = {
  bg:        '#202C32',
  tabBar:    '#182227',
  tabBorder: 'rgba(238, 242, 235, 0.14)',
  tileFill:  '#19252A',
  tileBorder:'rgba(238, 242, 235, 0.08)',
  /* dark label scrim over item ART — stays dark by design. */
  tileBannerGrad: 'linear-gradient(180deg, transparent 0%, rgba(9, 14, 17, 0.78) 55%)',
  chipActive:   '#3B3427',
  chipInactive: 'rgba(238, 242, 235, 0.06)',
  newBadge:  '#D95C54',
  shortcutBadgeBg:    'rgba(9, 14, 17, 0.72)',
  shortcutBadgeColor: '#D8A85F',
  textPrimary:  '#F7F2E7',
  textMuted:    '#B9C1BF',
  textVeryMuted:'#96A2A0',
  positive: '#59BF91',
  negative: '#D95C54',
  primaryBtn:    '#D8A85F',                // brass; pair with onAccent text
  onPrimaryBtn:  '#20170D',
  destructive:   '#C7655F',
  destructiveBg: '#7C3431',
  destructiveBorder: '#C7655F',
  marketAccent:    '#D8A85F',
  marketBg:        '#3B3427',
  marketBorder:    'rgba(216, 168, 95, 0.45)',
  godlyBg:    '#0F0715',
  newAccentBorder: 'rgba(216, 168, 95, 0.75)',
  newAccentFill:   '#3B3427',
  // Equipped slot tints
  slotWeaponBorder: 'rgba(91, 153, 222, 0.55)',
  slotArmorBorder:  'rgba(160, 130, 95, 0.50)',
  slotPetBorder:    'rgba(89, 191, 145, 0.50)',
  slotToolBorder:   'rgba(238, 242, 235, 0.20)',
  silhouetteSkin:    '#D4B090',
  silhouetteCloth:   '#6A7A8A',
  silhouetteGradient:'rgba(80, 120, 160, 0.08)',
};

export const FONT = {
  serif: '"Source Sans 3", sans-serif',
  sans:  '"Source Sans 3", sans-serif',
  mono:  '"Source Sans 3", sans-serif',
};

// Quality / rarity tints — Lantern Slate §11: thin edges + faint fill.
export const RARITY_BORDER = {
  normal: 'rgba(139, 150, 149, 0.55)',
  rare:   '#5B99DE',
  elite:  '#A477DF',
  godly:  '#F0C45F',
};
export const RARITY_FILL = {
  normal: INV.tileFill,
  rare:   'rgba(91, 153, 222, 0.08)',
  elite:  'rgba(164, 119, 223, 0.10)',
  godly:  'rgba(240, 196, 95, 0.12)',
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
