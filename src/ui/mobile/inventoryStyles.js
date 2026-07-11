// Inventory color and typography canon (spec §8).
// v2.3.1226: flipped to the light & airy palette (docs/UI-BIBLE.md
// Part 2): Parchment surfaces, Bone wells, Ink text, hairline borders,
// brass accents.  godlyBg stays dark — the Godly tile is the Bible's
// one sanctioned loud exception (1-in-400k prismatic).

export const INV = {
  bg:        '#F7F2E8',                    // Parchment
  tabBar:    '#F7F2E8',
  tabBorder: 'rgba(34, 48, 60, 0.16)',     // Hairline
  tileFill:  '#EFE7D6',                    // Bone well
  tileBorder:'rgba(34, 48, 60, 0.16)',
  /* keeps the dark label scrim — it sits over item ART, not the panel,
     so light-on-dark stays the right call for legibility. */
  tileBannerGrad: 'linear-gradient(180deg, transparent 0%, rgba(34, 48, 60, 0.72) 55%)',
  chipActive:   'rgba(34, 48, 60, 0.14)',
  chipInactive: 'rgba(34, 48, 60, 0.05)',
  newBadge:  '#C0392B',
  shortcutBadgeBg:    'rgba(34, 48, 60, 0.72)',
  shortcutBadgeColor: '#E8D4A0',
  textPrimary:  '#22303C',                 // Ink
  textMuted:    'rgba(34, 48, 60, 0.62)',
  textVeryMuted:'rgba(34, 48, 60, 0.40)',
  positive: '#2F855A',
  negative: '#C0392B',
  primaryBtn:    '#22303C',                // Ink fill (Bible primary button)
  destructive:   '#C0392B',
  destructiveBg: 'rgba(192, 57, 43, 0.08)',
  destructiveBorder: 'rgba(192, 57, 43, 0.30)',
  marketAccent:    '#8A6A3B',              // brass darkened for light bg
  marketBg:        'rgba(176, 141, 87, 0.10)',
  marketBorder:    'rgba(176, 141, 87, 0.35)',
  godlyBg:    '#0F0715',
  newAccentBorder: 'rgba(176, 141, 87, 0.75)',
  newAccentFill:   'rgba(176, 141, 87, 0.14)',
  // Equipped slot tints
  slotWeaponBorder: 'rgba(43, 108, 176, 0.55)',
  slotArmorBorder:  'rgba(140, 110, 80, 0.50)',
  slotPetBorder:    'rgba(47, 133, 90, 0.50)',
  slotToolBorder:   'rgba(34, 48, 60, 0.30)',
  silhouetteSkin:    '#D4B090',
  silhouetteCloth:   '#6A7A8A',
  silhouetteGradient:'rgba(80, 120, 160, 0.08)',
};

export const FONT = {
  serif: '"Source Sans 3", sans-serif',
  sans:  '"Source Sans 3", sans-serif',
  mono:  '"Source Sans 3", sans-serif',
};

// Quality / rarity tints (Elite + Godly tile borders).
// v2.3.1226: hues pulled darker for the light theme (UI-BIBLE rarity
// table: Rare blue, Legendary/elite violet, Godly prismatic gold).
export const RARITY_BORDER = {
  normal: INV.tileBorder,
  rare:   'rgba(43, 108, 176, 0.60)',
  elite:  'rgba(124, 58, 237, 0.55)',
  godly:  'rgba(176, 141, 87, 0.90)',
};
export const RARITY_FILL = {
  normal: INV.tileFill,
  rare:   'rgba(43, 108, 176, 0.08)',
  elite:  'rgba(124, 58, 237, 0.08)',
  godly:  'rgba(176, 141, 87, 0.12)',
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
