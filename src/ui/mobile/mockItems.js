// Throwaway item generator for development. Use 'inv mock' from the debug
// console to seed the inventory until the live state binding lands.

const NAMES = {
  weapon: ['Iron Sword', 'Oathkeeper', 'Frost Edge', 'Ember Bow', 'Thornstaff', 'Dawn Blade', 'Stonecleaver'],
  armor:  ['Hide Vest', 'Iron Vest', 'Steel Mail', 'Bronze Plate', 'Frostweave', 'Sunscale Mail'],
  pet:    ['Bramble', 'Tinder', 'Mist', 'Pebble', 'Dusk', 'Cinder'],
  tool:   ['Pickaxe', 'Hatchet', 'Fishing Rod', 'Sickle'],
  potion: ['Health Vial', 'Mana Vial', 'Ironroot Tonic'],
  gem:    ['Flame Gem', 'Frost Gem', 'Flora Gem', 'Stone Gem', 'Light Gem', 'Dark Gem'],
  material:['Iron Ore', 'Copper Ore', 'Oak Log', 'Pine Log', 'Wool', 'Hide'],
};
const QUALITIES = ['normal', 'normal', 'normal', 'rare', 'rare', 'elite', 'godly'];
const ELEMENTS = ['flame', 'frost', 'flora', 'stone', 'light', 'dark', 'wind', 'volt'];
const CRAFTERS = ['Mason', 'Reed', 'Toma', 'Vee', 'Quill'];

let seq = 0;
const id = () => `mock_${Date.now().toString(36)}_${seq++}`;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const makeItem = (type, opts = {}) => {
  const tier = opts.tier ?? ri(1, 9);
  const quality = opts.quality ?? pick(QUALITIES);
  const stats = {};
  if (type === 'weapon') stats.atk = tier * 4 + ri(-2, 4);
  if (type === 'armor')  stats.def = tier * 3 + ri(-1, 3);
  if (type === 'pet')    { stats.atk = tier * 2; stats.def = tier; }
  if (type === 'weapon' || type === 'armor') stats.spd = ri(-2, 2);

  return {
    id: id(),
    type,
    subtype: type === 'weapon' ? pick(['sword', 'sword', 'bow', 'staff']) : null,
    name: opts.name || pick(NAMES[type] || ['Thing']),
    tier,
    quality,
    hardness: ri(0, 5),
    temper: ri(0, 4),
    count: ['potion', 'gem', 'material'].includes(type) ? ri(1, 24) : null,
    acquiredAt: Date.now() - ri(0, 30) * 86400000,
    crafter: Math.random() < 0.5 ? pick(CRAFTERS) : null,
    gems: type === 'weapon' || type === 'armor'
      ? Array.from({ length: ri(0, 3) }, () => pick(ELEMENTS))
      : [],
    gemSlots: type === 'weapon' || type === 'armor' ? ri(0, 4) : 0,
    element: type === 'gem' ? pick(ELEMENTS) : null,
    potionKind: type === 'potion' ? pick(['hp', 'mana', 'other']) : null,
    stats,
    isNew: Math.random() < 0.15,
  };
};

export const generateMockInventory = (n = 30) => {
  const items = [];
  for (let i = 0; i < n; i++) {
    const t = pick(['weapon', 'armor', 'pet', 'tool', 'potion', 'gem', 'material']);
    items.push(makeItem(t));
  }
  return items;
};

export const generateMockEquipped = () => ({
  weapon: makeItem('weapon', { name: 'Iron Greatsword', tier: 4, quality: 'rare' }),
  armor:  makeItem('armor',  { name: 'Iron Vest',       tier: 4, quality: 'normal' }),
  pet:    makeItem('pet',    { name: 'Bramble',         tier: 3, quality: 'normal' }),
  tool:   null,
});
