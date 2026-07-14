import { LIFE_SKILLS } from '../../../data/lifeSkills.js';

/* v2.3.1286: shared roster for the Skills destination.  Order is the
   CANONICAL src/data/lifeSkills.js order (the spec's "stable order" —
   the old SkillsPanel used its own cooking-first order while claiming
   to match; unified here).  10 real skills; the compact 6x2 grid pads
   with 2 empty cells (the spec's "12" was corrected by the owner). */

const META = {
  woodcutting:   { icon: '🪓', name: 'Woodcutting',  iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224' },
  fishing:       { icon: '🎣', name: 'Fishing',      iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224' },
  mining:        { icon: '⛏',  name: 'Mining',       iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224' },
  farming:       { icon: '🌾', name: 'Farming',      iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224' },
  cooking:       { icon: '🍳', name: 'Cooking',      iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224' },
  blacksmithing: { icon: '🔨', name: 'Smithing',     iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224' },
  woodworking:   { icon: '🛠',  name: 'Woodworking',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224' },
  gemCutting:    { icon: '💎', name: 'Gem Cutting',  iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224' },
  enchanting:    { icon: '✨', name: 'Enchanting',   iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224' },
  trapping:      { icon: '🪤', name: 'Trapping',     iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224' },
};

export const SKILL_ROSTER = LIFE_SKILLS.map(key => ({ key, ...META[key] })).filter(s => s.name);
