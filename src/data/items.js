/* ═══ ZONE-SPECIFIC RESOURCES ═══ */
export const ZONE_RESOURCES = {
  flame: { crystal: 'Ember Crystal', ore: 'Magma Ore', herb: 'Firebloom', seed: 'Ash Root Seed', food: 'Fire Resist', foodStat: 'flameDef', wood: 'Charred Timber', fish: 'Lava Eel', gem: 'Flame Gem', gemColor: '#C0392B' },
  frost: { crystal: 'Frost Shard', ore: 'Glacial Ore', herb: 'Snowpetal', seed: 'Ice Cap Seed', food: 'Frost Resist', foodStat: 'frostDef', wood: 'Frostbark', fish: 'Ice Trout', gem: 'Frost Gem', gemColor: '#2980B9' },
  water: { crystal: 'Tidal Pearl', ore: 'Coral Ore', herb: 'Waterlily', seed: 'Kelp Seed', food: 'Regen Boost', foodStat: 'regen', wood: 'Driftwood', fish: 'Tidal Bass', gem: 'Water Gem', gemColor: '#3498DB' },
  venom: { crystal: 'Toxic Crystal', ore: 'Blight Ore', herb: 'Nightshade', seed: 'Fungus Spore', food: 'Poison Resist', foodStat: 'venomDef', wood: 'Swampwood', fish: 'Bog Catfish', gem: 'Venom Gem', gemColor: '#27AE60' },
  storm: { crystal: 'Spark Crystal', ore: 'Storm Iron', herb: 'Thunderbloom', seed: 'Static Moss Seed', food: 'Speed Boost', foodStat: 'speed', wood: 'Lightning Oak', fish: 'Spark Fin', gem: 'Storm Gem', gemColor: '#8E44AD' },
  stone: { crystal: 'Earth Crystal', ore: 'Dense Ore', herb: 'Rock Vine', seed: 'Cave Lichen Seed', food: 'Defense Boost', foodStat: 'defense', wood: 'Petrified Wood', fish: 'Cave Blindfish', gem: 'Stone Gem', gemColor: '#795548' },
  wind:  { crystal: 'Zephyr Crystal', ore: 'Sky Ore', herb: 'Cloudpetal', seed: 'Whisperleaf Seed', food: 'Agility Boost', foodStat: 'agility', wood: 'Skyroot', fish: 'Cloud Minnow', gem: 'Wind Gem', gemColor: '#7F8C8D' },
  dark:  { crystal: 'Shadow Essence', ore: 'Void Ore', herb: 'Duskbloom', seed: 'Shade Root Seed', food: 'Curse Resist', foodStat: 'darkDef', wood: 'Shadowthorn', fish: 'Void Eel', gem: 'Dark Gem', gemColor: '#2C3E50' },
  light: { crystal: 'Radiant Shard', ore: 'Celestial Ore', herb: 'Sunpetal', seed: 'Lightmoss Seed', food: 'Holy Boost', foodStat: 'lightBuff', wood: 'Gleamwood', fish: 'Sun Koi', gem: 'Light Gem', gemColor: '#F1C40F' },
};

/* ═══ GEM SYSTEM ═══ */
export const GEM_DROP_RATES = {
  woodcutting: 0.35,
  fishing: 0.30,
  mining: 0.40,
  monsterKill: 0.05,
};

/* ═══ GOLD NUGGET + AMULET SYSTEM ═══ */
export const GOLD_NUGGET_DROP = { lifeSkill: 0.001, monsterKill: 0.0001 };
export const NUGGETS_PER_BAR = 5;

export const AMULET_TIERS = {
  simple: { minLvl: 1,  label: 'Simple',  bars: 1,  goldCost: 50,   basePower: 1.0, statReq: 0,   desc: 'A thin gold chain' },
  ornate: { minLvl: 15, label: 'Ornate',  bars: 3,  goldCost: 200,  basePower: 1.5, statReq: 30,  desc: 'Decorative filigree' },
  regal:  { minLvl: 35, label: 'Regal',   bars: 6,  goldCost: 500,  basePower: 2.2, statReq: 70,  desc: 'Fit for royalty' },
  mythic: { minLvl: 60, label: 'Mythic',  bars: 10, goldCost: 1200, basePower: 3.0, statReq: 120, desc: 'Radiates ancient power' },
};

export const AMULET_GEM_STATS = {
  flame: { stat: 'elemDmg',      label: 'Elemental Damage',      unit: '%',   base: 3,   perPower: 2.5 },
  frost: { stat: 'maxMana',      label: 'Max Mana',              unit: '',    base: 8,   perPower: 6 },
  water: { stat: 'hpRegen',      label: 'HP Regen',              unit: '%/s', base: 0.5, perPower: 0.4 },
  venom: { stat: 'maxHp',        label: 'Max HP',                unit: '',    base: 10,  perPower: 8 },
  storm: { stat: 'atkSpd',       label: 'Attack Speed',          unit: '%',   base: 2,   perPower: 1.5 },
  stone: { stat: 'elemResist',   label: 'Elemental Resistance',  unit: '%',   base: 3,   perPower: 2 },
  wind:  { stat: 'moveSpd',      label: 'Move Speed',            unit: '%',   base: 2,   perPower: 1.5 },
  dark:  { stat: 'critDmg',      label: 'Crit Damage',           unit: '%',   base: 3,   perPower: 2 },
  light: { stat: 'staminaRegen', label: 'Stamina Regen',         unit: '%',   base: 4,   perPower: 3 },
};

export function getAmuletBonus(amulet) {
  if (!amulet?.gem) return null;
  const gemStat = AMULET_GEM_STATS[amulet.gem];
  if (!gemStat) return null;
  const tierData = AMULET_TIERS[amulet.tier];
  const power = tierData?.basePower || 1.0;
  const value = Math.round((gemStat.base + gemStat.perPower * power) * 10) / 10;
  return { ...gemStat, value, element: amulet.gem };
}

/* ═══ SHIELD GEAR SLOT ═══ */
export const SHIELD_GEM_STATS = {
  flame: { stat: 'blockReduc',    label: 'Block Reduction',     unit: '%', base: 2, perPower: 1.5 },
  frost: { stat: 'thornsDmg',     label: 'Thorns Damage',       unit: '%', base: 3, perPower: 2.0 },
  water: { stat: 'hpOnBlock',     label: 'HP on Block',         unit: '',  base: 3, perPower: 2.5 },
  venom: { stat: 'poisonResist',  label: 'Status Resist',       unit: '%', base: 3, perPower: 2.0 },
  storm: { stat: 'counterDmg',    label: 'Counter Damage',      unit: '%', base: 2, perPower: 1.5 },
  stone: { stat: 'flatDmgReduc',  label: 'Flat Dmg Reduction',  unit: '',  base: 2, perPower: 2.0 },
  wind:  { stat: 'dodgeDist',     label: 'Dodge Distance',      unit: '%', base: 3, perPower: 2.0 },
  dark:  { stat: 'deathResist',   label: 'Death Save',          unit: '%', base: 2, perPower: 1.5 },
  light: { stat: 'shieldRegen',   label: 'Shield Regen',        unit: '%', base: 3, perPower: 2.5 },
};

/* Forward-declared — needs BLACKSMITH_TIERS from rpg.js */
export function getShieldBonus(shield, BLACKSMITH_TIERS) {
  if (!shield?.gem) return null;
  const gemStat = SHIELD_GEM_STATS[shield.gem];
  if (!gemStat) return null;
  const bt = BLACKSMITH_TIERS?.[shield.gearBase];
  const power = bt ? bt.tierMult : 1.0;
  const value = Math.round((gemStat.base + gemStat.perPower * power) * 10) / 10;
  return { ...gemStat, value, element: shield.gem };
}

export function getShieldStats(shield, BLACKSMITH_TIERS) {
  if (!shield) return { blockBonus: 0, staminaBonus: 0, flatDef: 0, gemBonus: null };
  const tierMult = shield.tierMult || BLACKSMITH_TIERS?.[shield.gearBase]?.tierMult || 1.0;
  const blockBonus = Math.round(2 * tierMult * 10) / 10;
  const staminaBonus = Math.round(15 * tierMult);
  const flatDef = Math.round(tierMult * 1.5 * 10) / 10;
  let gemBonus = null;
  if (shield.gem && SHIELD_GEM_STATS[shield.gem]) {
    const gs = SHIELD_GEM_STATS[shield.gem];
    const val = Math.round((gs.base + gs.perPower * tierMult) * 10) / 10;
    gemBonus = { ...gs, value: val, element: shield.gem };
  }
  return { blockBonus, staminaBonus, flatDef, gemBonus };
}

/* ═══ GEM EXTRACTION + SALVAGE ═══ */
export const SALVAGE_RETURN_RATE = 0.6;
export const GEM_EXTRACT_BASE_COST = 25;

export function gemExtractCost(item, BLACKSMITH_TIERS, WOODWORKING_TIERS) {
  if (!item) return 0;
  const tierMult = item.tierMult
    || BLACKSMITH_TIERS?.[item.gearBase]?.tierMult
    || WOODWORKING_TIERS?.[item.gearBase?.replace('ww_', '')]?.tierMult
    || 1;
  return Math.ceil(GEM_EXTRACT_BASE_COST * tierMult);
}

export function getSalvageReturns(item, BLACKSMITH_TIERS, WOODWORKING_TIERS) {
  if (!item?.gearBase || item.gem) return null;
  const isWood = item.gearBase.startsWith('ww_');
  const tierKey = isWood ? item.gearBase.slice(3) : item.gearBase;
  const tierTable = isWood ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
  const tier = tierTable?.[tierKey];
  if (!tier) return null;
  const returns = [];
  if (isWood) {
    returns.push({ key: 'wood_' + tier.wood, label: tier.wood.replace(/_/g, ' '), qty: Math.max(1, Math.floor((tier.woodCost || 3) * SALVAGE_RETURN_RATE)), type: 'wood' });
  } else {
    returns.push({ key: 'ore_' + tier.oreName + '_ore', label: tier.oreName + ' ore', qty: Math.max(1, Math.floor((tier.oreCost || 3) * SALVAGE_RETURN_RATE)), type: 'ore' });
  }
  returns.push({ key: '_gold', label: 'gold', qty: Math.max(1, Math.floor((tier.goldCost || 10) * SALVAGE_RETURN_RATE)), type: 'gold' });
  return returns;
}

/* ═══ RARE DROPS + ACHIEVEMENT POINTS ═══ */
export const RARE_DROP_CHANCE = 0.001;
export const RARE_DROP_ITEMS = [
  { id: 'rare_crystal', name: 'Prismatic Shard', emoji: '🌈', points: 5, desc: 'A shimmering crystal fragment' },
  { id: 'rare_fossil',  name: 'Ancient Fossil',  emoji: '🦴', points: 3, desc: 'Preserved from a forgotten age' },
  { id: 'rare_star',    name: 'Fallen Star',     emoji: '⭐', points: 8, desc: 'Still warm from the heavens' },
  { id: 'rare_eye',     name: 'Dragon Eye',      emoji: '👁️', points: 10, desc: 'Seems to watch you' },
  { id: 'rare_feather', name: 'Phoenix Feather',  emoji: '🪶', points: 7, desc: 'Glows with inner fire' },
];
export const QUEST_AP_REWARD = 5;

/* ═══ GAMBLING SYSTEM ═══ */
export const GAMBLE_WIN_CHANCE = 0.40;
export const GAMBLE_MIN_BET = 10;
export const GAMBLE_MAX_BET = 10000;
export const JACKPOT_HOUSE_CUT = 0.10;
export const JACKPOT_MIN_DEPOSIT = 50;

/* ═══ ZONE-SPECIFIC MECHANICS ═══ */
export const SLED_WOOD_COST = 10;
export const SLED_SPEED_MULT = 3.0;
export const SLED_DURATION = 4000;
export const SNOWBALL_DMG_BASE = 15;
export const SNOWBALL_STUN_MS = 800;
export const SNOWBALL_CD = 1500;
export const SNOWBALL_RANGE = 150;
export const SNOWBALL_SPEED = 6;
export const SNOWMAN_AGGRO_RADIUS = 80;
export const SNOWMAN_DURATION = 30000;
export const SNOWMAN_SNOW_COST = 5;
export const TIDE_CYCLE_MS = 60000;
export const RAFT_WOOD_COST = 10;
export const RAFT_WATER_SPEED = 2.0;
export const SWIM_SPEED_MULT = 0.4;
export const TORCH_WOOD_COST = 3;
export const TORCH_DURATION = 120000;
export const TORCH_RADIUS_BASE = 320;
export const DARKNESS_RADIUS = 160;
export const ECHO_AGGRO_MULT = 2.0;

/* ═══ PVP THREAT SYSTEM ═══ */
export const THREAT_BASE_DURATION = 120000;
export const THREAT_PER_LEVEL_DIFF = 120000;
export const THREAT_COOLDOWN = 1800000;
export const GUARD_CONFISCATION_TIME = 1800000;
export const GUARD_GOLD_LEVY = 0.10;

/* ═══ DEPTH TIERS ═══ */
export const DEPTH_TIERS = [
  { id: 'shallow', label: 'Shallow', gatherLvl: 1,  resourceTier: 1, gate: null },
  { id: 'mid',     label: 'Mid',     gatherLvl: 15, resourceTier: 2, gate: 'shallow_dungeon' },
  { id: 'deep',    label: 'Deep',    gatherLvl: 35, resourceTier: 3, gate: 'mid_dungeon' },
  { id: 'abyss',   label: 'Abyss',   gatherLvl: 60, resourceTier: 4, gate: 'deep_dungeon' },
  { id: 'core',    label: 'Core',    gatherLvl: 85, resourceTier: 5, gate: 'abyss_dungeon' },
];

/* ═══ COMPREHENSIVE PLAYER STATS ═══ */
export function createDefaultCompStats() {
  return {
    monstersKilled: 0, deaths: 0, pvpKills: 0, pvpDeaths: 0,
    lawlessKills: 0, lawlessDeaths: 0, duelsWon: 0, duelsLost: 0,
    critLanded: 0, totalDamageDealt: 0, totalDamageTaken: 0,
    collisionsTriggered: 0, grandSlams: 0, highestMonsterKill: 0, bossesKilled: 0,
    fishCaught: 0, treesFelled: 0, oresMined: 0, itemsCrafted: 0, itemsSalvaged: 0,
    gemsSlotted: 0, cookSuccess: 0, cookBurns: 0,
    reforgeAttempts: 0, hardenSuccess: 0, hardenFails: 0,
    totalGoldEarned: 0, totalGoldSpent: 0, goldLostToDeath: 0,
    totalGambled: 0, totalGambleWon: 0, totalGambleLost: 0,
    jackpotDeposited: 0, jackpotWins: 0,
    questsCompleted: 0, achievementPoints: 0, rareDropsFound: 0,
    zonesExplored: 0, dungeonsCleared: 0, petsCapured: 0,
    deepestZone: '', playtimeSeconds: 0,
    _sessionStart: Date.now(),
  };
}

export function skillXpRequired(level) {
  if (level <= 100) return Math.ceil(500 * Math.pow(1.08, level - 1));
  const at100 = Math.ceil(500 * Math.pow(1.08, 99));
  return Math.ceil(at100 * Math.pow(1.10, level - 100));
}
