/* ═══ TOWN BUILDINGS ═══
   Positions linearly rescaled from the prior 40×30 town grid into
   the new 32×32 grid (bx *= 32/40, by *= 32/30) so every rectangle
   still fits inside the playable bounds.  These are the collision
   rectangles the player can't walk through; they don't have to
   line up perfectly with the new town image. */
export const TOWN_BUILDINGS = [
  { id: 'marketplace', bx: 1,  by: 1,  bw: 5, bh: 4, label: 'MARKETPLACE',  icon: '🏪', desc: 'Buy and sell items',    action: 'exchange', color: '#5b52ff' },
  { id: 'vendor',      bx: 22, by: 1,  bw: 5, bh: 4, label: 'VENDOR',       icon: '🛒', desc: 'Buy consumables',       action: 'shop',     color: '#3dd497' },
  { id: 'bank',        bx: 6,  by: 22, bw: 5, bh: 4, label: 'BANK',         icon: '🏦', desc: 'Safe item storage',     action: 'bank',     color: '#f5c542' },
  { id: 'enchanting',  bx: 22, by: 22, bw: 5, bh: 4, label: 'ENCHANTER',    icon: '✨', desc: 'Slot gems into gear',   action: 'enchant',  color: '#a78bfa' },
  { id: 'cooking',     bx: 11, by: 2,  bw: 4, bh: 3, label: 'KITCHEN',      icon: '🍳', desc: 'Cook food buffs',       action: 'cook',     color: '#ea580c' },
  { id: 'farm',        bx: 18, by: 2,  bw: 4, bh: 3, label: 'FARM',         icon: '🌾', desc: 'Grow ingredients',      action: 'farm',     color: '#3dd497' },
  { id: 'party',       bx: 11, by: 18, bw: 4, bh: 3, label: 'TAVERN',       icon: '🍺', desc: 'Form parties',          action: 'party',    color: '#ff5e6c' },
  { id: 'blacksmith',  bx: 6,  by: 27, bw: 4, bh: 3, label: 'BLACKSMITH',   icon: '🔨', desc: 'Forge gear bases',      action: 'forge',    color: '#b0b0b0' },
  { id: 'woodworker',  bx: 2,  by: 9,  bw: 4, bh: 3, label: 'WOODWORKER',   icon: '🪚', desc: 'Craft bows & staves',   action: 'woodwork', color: '#8B6914' },
  { id: 'gambler',     bx: 26, by: 9,  bw: 4, bh: 3, label: 'GAMBLING DEN', icon: '🎰', desc: 'Test your luck',        action: 'gamble',   color: '#9333ea' },
  { id: 'gemcutter',   bx: 22, by: 27, bw: 4, bh: 3, label: 'GEM CUTTER',   icon: '💎', desc: 'Cut raw gems',          action: 'gemcut',   color: '#a855f7' },
  { id: 'farmhome',    bx: 6,  by: 11, bw: 4, bh: 3, label: 'YOUR FARM',    icon: '🏡', desc: 'Visit your farm',       action: 'farmhome', color: '#4a7a3a' },
];
