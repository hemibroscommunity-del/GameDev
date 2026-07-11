/* ═══ TOWN BUILDINGS ═══
   Positions linearly rescaled from the prior 40×30 town grid into
   the new 32×32 grid (bx *= 32/40, by *= 32/30) so every rectangle
   still fits inside the playable bounds.  These are the collision
   rectangles the player can't walk through; they don't have to
   line up perfectly with the new town image. */
/* v2.3.1224: iconSrc = UI Bible building icons (docs/UI-BIBLE.md Part 4,
   bldg-* set); `icon` emoji kept as the render fallback.  farmhome
   reuses bldg-farm (same building family, different location). */
export const TOWN_BUILDINGS = [
  { id: 'marketplace', bx: 2,  by: 2,  bw: 5, bh: 4, label: 'MARKETPLACE',  icon: '🏪', iconSrc: '/icons/ui/bldg-exchange.webp?v=2.3.1224', desc: 'Buy and sell items',    action: 'exchange', color: '#5b52ff' },
  { id: 'vendor',      bx: 33, by: 2,  bw: 5, bh: 4, label: 'VENDOR',       icon: '🛒', iconSrc: '/icons/ui/bldg-vendor.webp?v=2.3.1224',   desc: 'Buy consumables',       action: 'shop',     color: '#3dd497' },
  { id: 'bank',        bx: 9,  by: 33, bw: 5, bh: 4, label: 'BANK',         icon: '🏦', iconSrc: '/icons/ui/bldg-bank.webp?v=2.3.1224',     desc: 'Safe item storage',     action: 'bank',     color: '#f5c542' },
  { id: 'enchanting',  bx: 33, by: 33, bw: 5, bh: 4, label: 'ENCHANTER',    icon: '✨', iconSrc: '/icons/ui/bldg-enchant.webp?v=2.3.1224',  desc: 'Slot gems into gear',   action: 'enchant',  color: '#a78bfa' },
  { id: 'cooking',     bx: 16, by: 3,  bw: 4, bh: 3, label: 'KITCHEN',      icon: '🍳', iconSrc: '/icons/ui/bldg-cook.webp?v=2.3.1224',     desc: 'Cook food buffs',       action: 'cook',     color: '#ea580c' },
  { id: 'farm',        bx: 27, by: 3,  bw: 4, bh: 3, label: 'FARM',         icon: '🌾', iconSrc: '/icons/ui/bldg-farm.webp?v=2.3.1224',     desc: 'Grow ingredients',      action: 'farm',     color: '#3dd497' },
  { id: 'party',       bx: 16, by: 27, bw: 4, bh: 3, label: 'TAVERN',       icon: '🍺', iconSrc: '/icons/ui/bldg-tavern.webp?v=2.3.1224',   desc: 'Form parties',          action: 'party',    color: '#ff5e6c' },
  { id: 'blacksmith',  bx: 9,  by: 40, bw: 4, bh: 3, label: 'BLACKSMITH',   icon: '🔨', iconSrc: '/icons/ui/bldg-forge.webp?v=2.3.1224',    desc: 'Forge gear bases',      action: 'forge',    color: '#b0b0b0' },
  { id: 'woodworker',  bx: 3,  by: 14,  bw: 4, bh: 3, label: 'WOODWORKER',   icon: '🪚', iconSrc: '/icons/ui/bldg-woodwork.webp?v=2.3.1224', desc: 'Craft bows & staves',   action: 'woodwork', color: '#8B6914' },
  { id: 'gambler',     bx: 39, by: 14,  bw: 4, bh: 3, label: 'GAMBLING DEN', icon: '🎰', iconSrc: '/icons/ui/bldg-gamble.webp?v=2.3.1224',   desc: 'Test your luck',        action: 'gamble',   color: '#9333ea' },
  { id: 'gemcutter',   bx: 33, by: 40, bw: 4, bh: 3, label: 'GEM CUTTER',   icon: '💎', iconSrc: '/icons/ui/bldg-gemcut.webp?v=2.3.1224',   desc: 'Cut raw gems',          action: 'gemcut',   color: '#a855f7' },
  { id: 'farmhome',    bx: 9,  by: 16, bw: 4, bh: 3, label: 'YOUR FARM',    icon: '🏡', iconSrc: '/icons/ui/bldg-farm.webp?v=2.3.1224',     desc: 'Visit your farm',       action: 'farmhome', color: '#4a7a3a' },
];
