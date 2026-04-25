// Throwaway profile generator for the inspect card. Use 'card mock' from
// the debug console until the live state binding lands.

const ARCHETYPES = ['Berserker', 'Scholar', 'Balanced', 'Ranger', 'Sentinel'];
const POLES = ['light', 'dark', 'flame', 'flora', 'stone', 'wind', 'volt'];
const NAMES = ['Mason', 'Reed', 'Toma', 'Vee', 'Quill', 'Ash', 'Briar', 'Cale'];
const TITLES = ['Ash-walker', 'Twin-Stone Bearer', 'Reed-Friend', 'Storm-Breaker'];
const QUESTS = [
  'Find the relic in the ash valley',
  'Speak with Reed at the old well',
  'Clear the bramble dungeon',
  'Recover the twin stone from Vee',
];
const JOURNEY_LINES = [
  '"You walk lightly for a stranger." — Reed',
  '"The bramble bleeds when struck."',
  '"Mason said the gem was lost. He lied."',
  '"I keep the third stone in my coat."',
];
const FOLKLORE = [
  'They say her shadow lingers near the old well.',
  'No one names the third stone.',
  'The flame remembers what the flame ate.',
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export const generateMockProfile = (overrides = {}) => {
  const stats = {
    power: ri(8, 50), vitality: ri(8, 50), endurance: ri(8, 50),
    agility: ri(8, 50), mind: ri(8, 50),
  };
  const skills = {
    cooking: ri(0, 99), fishing: ri(0, 99), farming: ri(0, 99),
    blacksmithing: ri(0, 99), gemCutting: ri(0, 99),
    alchemy: ri(0, 99), woodworking: ri(0, 99), tailoring: ri(0, 99),
    taming: ri(0, 99), scribing: ri(0, 99),
  };
  const baseEntry = (txt, day) => ({ day, text: txt });

  return {
    name: pick(NAMES),
    level: ri(1, 50),
    archetype: pick(ARCHETYPES),
    pole: pick(POLES),
    clanTag: Math.random() < 0.4 ? 'WOLVES' : null,
    questLine: pick(QUESTS),
    recentJourneyLine: pick(JOURNEY_LINES),
    logo: null,
    stats,
    tier2: {
      ferocity: { crit: 0.18, mult: 1.6 },
      fortification: stats.vitality * 6,
      stamina: stats.endurance * 4,
      evasion: stats.agility * 0.005,
      focus: stats.mind * 2,
    },
    vows: Math.random() < 0.5
      ? [{ stat: pick(['power','vitality','agility']), days: ri(7, 90),
           partner: Math.random() < 0.7 ? pick(NAMES) : null }]
      : [],
    weapon: { id: 'mw', type: 'weapon', subtype: pick(['sword','bow','staff']),
      name: 'Iron Greatsword', tier: 5, quality: 'rare', gems: ['flame','flora'], gemSlots: 3 },
    armor:  { id: 'ma', type: 'armor', name: 'Iron Vest', tier: 5, quality: 'rare', gems: [] },
    pet:    { id: 'mp', type: 'pet', name: 'Bramble', tier: 3, quality: 'normal' },
    skills,
    history: {
      displayedTitle: Math.random() < 0.6 ? pick(TITLES) : null,
      titles: Math.random() < 0.6 ? [pick(TITLES), pick(TITLES)] : [],
      capstones: Math.random() < 0.5 ? ['Light', 'Stone'] : [],
      zonesCleared: ri(0, 30),
      apexKills: ri(0, 8),
      ascendant: Math.random() < 0.1,
    },
    journey: {
      count: ri(0, 300),
      folklore: Math.random() < 0.5 ? pick(FOLKLORE) : null,
      entries: Array.from({ length: 8 }, (_, i) => baseEntry(pick(JOURNEY_LINES), i + 1)),
    },
    ...overrides,
  };
};
