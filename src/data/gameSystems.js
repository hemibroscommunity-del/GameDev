/* ═══ GAME SYSTEMS — Bulk extracted from index.html lines 2886-9050 ═══ */
/* This file contains: blacksmithing, woodworking, reforge/harden, pets,  */
/* furniture, clans, arena, guilds, diving, minigames, masks, stats,      */
/* map generation, RPG system, status effects, collision, encyclopedia,   */
/* marketplace, audio engine, NPC quests, and more.                       */
/* TODO: Further decompose into smaller modules as needed.                */

import { TILE } from './constants.js';
import { ZONES } from './zones.js';
import { ELEMENTS } from './elements.js';
import { TOWN_BUILDINGS } from './buildings.js';
import { TOWN_EXITS } from './effects.js';
/* v2.3.1189: DEPTH_TIERS…skillXpRequired were eslint-grandfathered
   globals (resolved via BroTown's Object.assign(globalThis, DATA) at
   runtime — latent ReferenceErrors under plain node / before boot).
   Now imported from where they live; the eslint LEGACY DEBT block for
   this file is gone. */
import { AMULET_TIERS, SALVAGE_RETURN_RATE, DEPTH_TIERS, ZONE_RESOURCES, getAmuletBonus, getShieldBonus, getShieldStats, skillXpRequired } from './items.js';
import { FISHING_TIERS } from './lifeSkills.js';
import { applyZoneVariant } from './monsterVariants.js';

/* v2.3.1186: pure-display exports (BT_AUDIO, BT_ACHIEVEMENTS, MASKS,
   tile colors, generateZoneMap, emote/NPC tables) moved to
   gameDisplay.js and re-exported here so importers are untouched.
   This file now holds the ECONOMY MIRROR — the tables
   server/test/mirror-audit.test.mjs pins against server/src/data.js —
   plus game-logic helpers.  Keep display-only additions in
   gameDisplay.js so drift-sensitive diffs stay reviewable. */
export * from './gameDisplay.js';

/* ── Babel helper polyfills (from pre-transpiled source) ── */
function _slicedToArray(r, e) { if (Array.isArray(r)) return r; if (Symbol.iterator in Object(r)) { const a = []; let f = true; const t = r[Symbol.iterator](); for (let n; !(f = (n = t.next()).done) && (a.push(n.value), a.length !== e); f = true); return a; } }
function _toConsumableArray(r) { return Array.isArray(r) ? [...r] : Array.from(r); }
function _defineProperty(e, r, t) { return (r in e) ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }

/* Calculate salvage returns for an amulet */
export function getAmuletSalvageReturns(amulet) {
  if (!amulet) return null;
  if (amulet.gem) return null; /* must extract gem first */
  var tier = AMULET_TIERS[amulet.tier];
  if (!tier) return null;
  var barReturn = Math.max(1, Math.floor(tier.bars * SALVAGE_RETURN_RATE));
  var goldReturn = Math.max(1, Math.floor(tier.goldCost * SALVAGE_RETURN_RATE));
  return [{
    key: '_goldBars',
    label: 'gold bars',
    qty: barReturn,
    type: 'goldBars'
  }, {
    key: '_gold',
    label: 'gold',
    qty: goldReturn,
    type: 'gold'
  }];
}

/* Blacksmithing tiers — one new material every 5 levels */
/* Equipment gated by Tier 1 stat: Greatsword=Power, Sword=Agility. statReq = tierIndex × 5 */
/* minLvl = crafting skill level needed. statReq = Tier 1 stat needed to EQUIP. */
/* All tiers have gem slots — gems gated by life skill progression, not material tier */
/* color = material display color for UI and sprite tinting */
/* Each tier spans 5 levels (20 tiers × 5 levels = level 1–100) */
export const BLACKSMITH_TIERS = {
  wood: {
    minLvl: 1,
    label: 'Wood',
    slots: 1,
    oreName: 'wood',
    oreCost: 3,
    goldCost: 8,
    tierMult: 1.00,
    statReq: 0,
    color: '#6b4226',
    desc: 'Deep earthy brown, rough but workable'
  },
  copper: {
    minLvl: 6,
    label: 'Copper',
    slots: 1,
    oreName: 'copper',
    oreCost: 3,
    goldCost: 20,
    tierMult: 1.12,
    statReq: 10,
    color: '#c87533',
    desc: 'Warm reddish-orange'
  },
  iron: {
    minLvl: 11,
    label: 'Iron',
    slots: 1,
    oreName: 'iron',
    oreCost: 4,
    goldCost: 35,
    tierMult: 1.25,
    statReq: 20,
    color: '#8a8a8a',
    desc: 'Dull metallic gray'
  },
  steel: {
    minLvl: 16,
    label: 'Steel',
    slots: 1,
    oreName: 'steel',
    oreCost: 5,
    goldCost: 55,
    tierMult: 1.40,
    statReq: 30,
    color: '#c0c0c8',
    desc: 'Polished silver'
  },
  titanium: {
    minLvl: 21,
    label: 'Titanium',
    slots: 1,
    oreName: 'titanium',
    oreCost: 5,
    goldCost: 85,
    tierMult: 1.56,
    statReq: 40,
    color: '#9aaab8',
    desc: 'Brushed metallic gray with subtle blue tint'
  },
  obsidian: {
    minLvl: 26,
    label: 'Obsidian',
    slots: 1,
    oreName: 'obsidian',
    oreCost: 6,
    goldCost: 120,
    tierMult: 1.74,
    statReq: 50,
    color: '#1a1a2e',
    desc: 'Glossy jet black'
  },
  mythril: {
    minLvl: 31,
    label: 'Mythril',
    slots: 2,
    oreName: 'mythril',
    oreCost: 7,
    goldCost: 170,
    tierMult: 1.94,
    statReq: 60,
    color: '#a8c8e8',
    desc: 'Luminous silver-blue'
  },
  diamond: {
    minLvl: 36,
    label: 'Diamond',
    slots: 2,
    oreName: 'diamond',
    oreCost: 8,
    goldCost: 240,
    tierMult: 2.16,
    statReq: 70,
    color: '#e8f0ff',
    desc: 'Brilliant crystalline white'
  },
  abyssal: {
    minLvl: 41,
    label: 'Abyssal',
    slots: 2,
    oreName: 'abyssal',
    oreCost: 9,
    goldCost: 330,
    tierMult: 2.40,
    statReq: 80,
    color: '#1a0a2e',
    desc: 'Deep midnight purple-black'
  },
  dragonbone: {
    minLvl: 46,
    label: 'Dragonbone',
    slots: 2,
    oreName: 'dragonbone',
    oreCost: 10,
    goldCost: 440,
    tierMult: 2.68,
    statReq: 90,
    color: '#f0e8c8',
    desc: 'Pale ivory with faint gold veins'
  },
  shadowsteel: {
    minLvl: 51,
    label: 'Shadowsteel',
    slots: 2,
    oreName: 'shadowsteel',
    oreCost: 11,
    goldCost: 570,
    tierMult: 2.98,
    statReq: 100,
    color: '#3a3a4a',
    desc: 'Dark smoky gunmetal'
  },
  bloodstone: {
    minLvl: 56,
    label: 'Bloodstone',
    slots: 2,
    oreName: 'bloodstone',
    oreCost: 12,
    goldCost: 720,
    tierMult: 3.32,
    statReq: 110,
    color: '#8b1a1a',
    desc: 'Deep crimson with dark flecks'
  },
  runestone: {
    minLvl: 61,
    label: 'Runestone',
    slots: 2,
    oreName: 'runite',
    oreCost: 13,
    goldCost: 900,
    tierMult: 3.70,
    statReq: 120,
    color: '#7a7a8a',
    desc: 'Carved gray with glowing etched lines'
  },
  sunstone: {
    minLvl: 66,
    label: 'Sunstone',
    slots: 2,
    oreName: 'sunstone',
    oreCost: 14,
    goldCost: 1100,
    tierMult: 4.12,
    statReq: 130,
    color: '#e8a830',
    desc: 'Warm radiant gold-orange'
  },
  demonite: {
    minLvl: 71,
    label: 'Demonite',
    slots: 2,
    oreName: 'demonite',
    oreCost: 15,
    goldCost: 1350,
    tierMult: 4.58,
    statReq: 140,
    color: '#4a0a0a',
    desc: 'Sinister dark red-black'
  },
  spiritforge: {
    minLvl: 76,
    label: 'Spiritforge',
    slots: 2,
    oreName: 'spiritore',
    oreCost: 16,
    goldCost: 1650,
    tierMult: 5.10,
    statReq: 150,
    color: '#c8d8f0',
    desc: 'Ghostly pale blue-white'
  },
  starforged: {
    minLvl: 81,
    label: 'Starforged',
    slots: 2,
    oreName: 'starite',
    oreCost: 18,
    goldCost: 2000,
    tierMult: 5.68,
    statReq: 160,
    color: '#d0d8e8',
    desc: 'Shimmering silver with cosmic sparkle'
  },
  celestial: {
    minLvl: 86,
    label: 'Celestial',
    slots: 2,
    oreName: 'celestite',
    oreCost: 20,
    goldCost: 2500,
    tierMult: 6.32,
    statReq: 170,
    color: '#f0e8d0',
    desc: 'Soft glowing platinum-gold'
  },
  antimatter: {
    minLvl: 91,
    label: 'Antimatter',
    slots: 2,
    oreName: 'antimatter',
    oreCost: 22,
    goldCost: 3200,
    tierMult: 7.04,
    statReq: 180,
    color: '#2a1a3a',
    desc: 'Flecks of red, green, and blue'
  },
  worldbreaker: {
    minLvl: 96,
    label: 'Worldbreaker',
    slots: 2,
    oreName: 'voidcrystal',
    oreCost: 25,
    goldCost: 4200,
    tierMult: 7.84,
    statReq: 190,
    color: '#3a0a4a',
    desc: 'Pulsing unstable dark violet'
  }
};

/* Stat that drives weapon damage by weapon type (v2.3.109+).
   POW scales melee (sword + greatsword), AGI scales bow,
   MIND scales staff. */
export const EQUIP_STAT_MAP = {
  greatsword: 'power',
  sword: 'power',     /* v2.3.109: was 'agility'; consolidates all melee onto POW */
  bow: 'agility',
  staff: 'mind'
};
export const SHIELD_EQUIP_STAT = 'endurance';
export const ARMOR_EQUIP_STAT = 'vitality';
export const AMULET_EQUIP_STAT = 'mind';

/* Check if player meets stat requirement for an item */
export function canEquipItem(rpg, item, slotType) {
  var _item$gearBase2;
  if (!item || !item.gearBase) return true; /* non-crafted items have no stat gate */
  var isWood = (_item$gearBase2 = item.gearBase) === null || _item$gearBase2 === void 0 ? void 0 : _item$gearBase2.startsWith('ww_');
  var tierKey = isWood ? item.gearBase.slice(3) : item.gearBase;
  var tierTable = isWood ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
  var tier = tierTable[tierKey];
  /* Amulet uses AMULET_TIERS */
  if (slotType === 'amulet') tier = AMULET_TIERS[item.tier];
  if (!tier || !tier.statReq) return true;
  var reqStat, playerVal;
  if (slotType === 'shield') {
    reqStat = SHIELD_EQUIP_STAT;
    playerVal = rpg[reqStat] || 0;
  } else if (slotType === 'amulet') {
    reqStat = AMULET_EQUIP_STAT;
    playerVal = rpg[reqStat] || 0;
  } else if (slotType === 'armor') {
    reqStat = ARMOR_EQUIP_STAT;
    playerVal = rpg[reqStat] || 0;
  } else {
    /* Weapon — stat depends on weapon type */
    reqStat = EQUIP_STAT_MAP[item.type] || 'power';
    playerVal = rpg[reqStat] || 0;
  }
  return playerVal >= tier.statReq;
}
export function getEquipReqLabel(item, slotType) {
  var _item$gearBase3;
  if (!item || !item.gearBase) return null;
  var isWood = (_item$gearBase3 = item.gearBase) === null || _item$gearBase3 === void 0 ? void 0 : _item$gearBase3.startsWith('ww_');
  var tierKey = isWood ? item.gearBase.slice(3) : item.gearBase;
  var tierTable = isWood ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
  var tier = tierTable[tierKey];
  if (slotType === 'amulet') tier = AMULET_TIERS[item.tier];
  if (!tier || !tier.statReq) return null;
  var reqStat;
  if (slotType === 'shield') reqStat = SHIELD_EQUIP_STAT;else if (slotType === 'amulet') reqStat = AMULET_EQUIP_STAT;else if (slotType === 'armor') reqStat = ARMOR_EQUIP_STAT;else reqStat = EQUIP_STAT_MAP[item.type] || 'power';
  return {
    stat: reqStat,
    req: tier.statReq,
    label: reqStat.charAt(0).toUpperCase() + reqStat.slice(1)
  };
}

/* §18 Woodworking — bows and staves. Equip stat: Bow=Agility, Staff=Mind. statReq = tierIndex * 10 */
export const WOODWORKING_TIERS = {
  wood: {
    minLvl: 1,
    label: 'Wood',
    slots: 1,
    wood: 'wood',
    woodCost: 3,
    goldCost: 8,
    tierMult: 1.00,
    statReq: 0,
    color: '#6b4226',
    desc: 'Common timber, rough but workable'
  },
  softwood: {
    minLvl: 6,
    label: 'Softwood',
    slots: 1,
    wood: 'softwood',
    woodCost: 3,
    goldCost: 20,
    tierMult: 1.12,
    statReq: 10,
    color: '#a08050',
    desc: 'Smooth and flexible'
  },
  hardwood: {
    minLvl: 11,
    label: 'Hardwood',
    slots: 1,
    wood: 'hardwood',
    woodCost: 4,
    goldCost: 35,
    tierMult: 1.25,
    statReq: 20,
    color: '#7a5a30',
    desc: 'Dense and sturdy'
  },
  pine: {
    minLvl: 16,
    label: 'Pine',
    slots: 1,
    wood: 'pine_lumber',
    woodCost: 5,
    goldCost: 55,
    tierMult: 1.40,
    statReq: 30,
    color: '#c8b080',
    desc: 'Lightweight and springy'
  },
  maple: {
    minLvl: 21,
    label: 'Maple',
    slots: 1,
    wood: 'maple_wood',
    woodCost: 5,
    goldCost: 85,
    tierMult: 1.56,
    statReq: 40,
    color: '#d0a060',
    desc: 'Rich golden grain'
  },
  ironbark: {
    minLvl: 26,
    label: 'Ironbark',
    slots: 1,
    wood: 'ironbark',
    woodCost: 6,
    goldCost: 120,
    tierMult: 1.74,
    statReq: 50,
    color: '#5a4a3a',
    desc: 'Iron-hard and unyielding'
  },
  crystalwood: {
    minLvl: 31,
    label: 'Crystal Wood',
    slots: 2,
    wood: 'crystal_wood',
    woodCost: 7,
    goldCost: 170,
    tierMult: 1.94,
    statReq: 60,
    color: '#90b8d0',
    desc: 'Channels elemental energy'
  },
  elder: {
    minLvl: 36,
    label: 'Elder Wood',
    slots: 2,
    wood: 'elder_wood',
    woodCost: 8,
    goldCost: 240,
    tierMult: 2.16,
    statReq: 70,
    color: '#8a7a5a',
    desc: 'Ancient growth, deep resonance'
  },
  spiritwood: {
    minLvl: 41,
    label: 'Spirit Wood',
    slots: 2,
    wood: 'spirit_wood',
    woodCost: 9,
    goldCost: 330,
    tierMult: 2.40,
    statReq: 80,
    color: '#b8c8e0',
    desc: 'Hums with latent power'
  },
  dragonwood: {
    minLvl: 46,
    label: 'Dragonwood',
    slots: 2,
    wood: 'dragon_wood',
    woodCost: 10,
    goldCost: 440,
    tierMult: 2.68,
    statReq: 90,
    color: '#c8a060',
    desc: 'Scaled bark, fire-resistant'
  },
  shadowthorn: {
    minLvl: 51,
    label: 'Shadowthorn',
    slots: 2,
    wood: 'shadowthorn',
    woodCost: 11,
    goldCost: 570,
    tierMult: 2.98,
    statReq: 100,
    color: '#3a2a3a',
    desc: 'Thorns of pure shadow'
  },
  bloodoak: {
    minLvl: 56,
    label: 'Bloodoak',
    slots: 2,
    wood: 'bloodoak',
    woodCost: 12,
    goldCost: 720,
    tierMult: 3.32,
    statReq: 110,
    color: '#7a2a1a',
    desc: 'Sap runs deep crimson'
  },
  runewood: {
    minLvl: 61,
    label: 'Runewood',
    slots: 2,
    wood: 'runewood',
    woodCost: 13,
    goldCost: 900,
    tierMult: 3.70,
    statReq: 120,
    color: '#8a8a70',
    desc: 'Runes form naturally in the grain'
  },
  sunbark: {
    minLvl: 66,
    label: 'Sunbark',
    slots: 2,
    wood: 'sunbark',
    woodCost: 14,
    goldCost: 1100,
    tierMult: 4.12,
    statReq: 130,
    color: '#d8b040',
    desc: 'Warm to the touch, always'
  },
  demonwood: {
    minLvl: 71,
    label: 'Demonwood',
    slots: 2,
    wood: 'demonwood',
    woodCost: 15,
    goldCost: 1350,
    tierMult: 4.58,
    statReq: 140,
    color: '#4a1a1a',
    desc: 'Twisted, sinister grain'
  },
  ghostwood: {
    minLvl: 76,
    label: 'Ghostwood',
    slots: 2,
    wood: 'ghostwood',
    woodCost: 16,
    goldCost: 1650,
    tierMult: 5.10,
    statReq: 150,
    color: '#d0d8e8',
    desc: 'Translucent, almost weightless'
  },
  starwood: {
    minLvl: 81,
    label: 'Starwood',
    slots: 2,
    wood: 'starwood',
    woodCost: 18,
    goldCost: 2000,
    tierMult: 5.68,
    statReq: 160,
    color: '#c0c8e0',
    desc: 'Glimmers with trapped starlight'
  },
  worldtree: {
    minLvl: 86,
    label: 'Worldtree',
    slots: 2,
    wood: 'worldtree',
    woodCost: 20,
    goldCost: 2500,
    tierMult: 6.32,
    statReq: 170,
    color: '#a0c880',
    desc: 'From the roots of the World Tree'
  },
  voidtimber: {
    minLvl: 91,
    label: 'Void Timber',
    slots: 2,
    wood: 'void_timber',
    woodCost: 22,
    goldCost: 3200,
    tierMult: 7.04,
    statReq: 180,
    color: '#2a1a3a',
    desc: 'Warps light around it'
  },
  worldbreaker: {
    minLvl: 96,
    label: 'Worldbreaker',
    slots: 2,
    wood: 'voidwood',
    woodCost: 25,
    goldCost: 4200,
    tierMult: 7.84,
    statReq: 190,
    color: '#3a0a4a',
    desc: 'Pulsing unstable dark violet'
  }
};

/* ═══ REFORGE + HARDEN SYSTEM — RNG crafting depth ═══ */
/* Reforge: re-roll a random bonus on crafted gear (replaces previous bonus). Costs materials. */
/* Harden: attempt to add a SECOND bonus. Risk of breaking the item on failure. */
export const REFORGE_BONUSES = [{
  id: 'atkSpd',
  label: 'Attack Speed',
  unit: '%',
  min: 1,
  max: 5,
  scale: 0.03
}, {
  id: 'critCh',
  label: 'Crit Chance',
  unit: '%',
  min: 1,
  max: 4,
  scale: 0.025
}, {
  id: 'critDmg',
  label: 'Crit Damage',
  unit: '%',
  min: 2,
  max: 8,
  scale: 0.04
}, {
  id: 'baseDmg',
  label: 'Base Damage',
  unit: '',
  min: 3,
  max: 15,
  scale: 0.8
}, {
  id: 'moveSpd',
  label: 'Move Speed',
  unit: '%',
  min: 1,
  max: 3,
  scale: 0.02
}, {
  id: 'hp',
  label: 'Max HP',
  unit: '',
  min: 5,
  max: 30,
  scale: 1.5
}, {
  id: 'mana',
  label: 'Max Mana',
  unit: '',
  min: 3,
  max: 20,
  scale: 1.0
}, {
  id: 'elemDmg',
  label: 'Elemental Dmg',
  unit: '%',
  min: 1,
  max: 5,
  scale: 0.03
}];

/* Roll a reforge bonus — higher tier items get better ranges */
export function rollReforgeBonus(tierMult) {
  var bonus = REFORGE_BONUSES[Math.floor(Math.random() * REFORGE_BONUSES.length)];
  var tierScale = Math.max(1, tierMult);
  var value = bonus.min + Math.floor(Math.random() * (bonus.max - bonus.min + 1));
  var scaled = Math.round(value * tierScale * 10) / 10;
  return {
    id: bonus.id,
    label: bonus.label,
    unit: bonus.unit,
    value: scaled
  };
}

/* Harden success chance — decreases with tier, increases with skill level */
export function hardenChance(tierMult, skillLevel) {
  var base = 0.75; /* 75% at tier 1 */
  var tierPenalty = Math.max(0, (tierMult - 1) * 0.08); /* -8% per tier mult above 1 */
  var skillBonus = skillLevel * 0.003; /* +0.3% per skill level */
  return Math.max(0.15, Math.min(0.90, base - tierPenalty + skillBonus));
}

/* Gem cutting tiers — quality of cut gems */
export const GEM_CUT_TIERS = {
  rough: {
    minLvl: 1,
    successRate: 0.6,
    label: 'Rough Cut'
  },
  fine: {
    minLvl: 15,
    successRate: 0.75,
    label: 'Fine Cut'
  },
  flawless: {
    minLvl: 35,
    successRate: 0.90,
    label: 'Flawless Cut'
  },
  perfect: {
    minLvl: 60,
    successRate: 0.98,
    label: 'Perfect Cut'
  }
};

/* Mining ore tiers — what ore you get at each mining level */
export const MINING_ORE_TIERS = {
  iron: {
    minLvl: 1,
    maxLvl: 5,
    label: 'Iron Ore',
    color: '#8a8a8a'
  },
  steel: {
    minLvl: 6,
    maxLvl: 10,
    label: 'Steel Ore',
    color: '#b0b0b0'
  }
};

/* Resource tier names */
export const RESOURCE_TIER_NAMES = ['', 'Rough', 'Refined', 'Pure', 'Resonant', 'Elemental Heart'];
export const RESOURCE_TIER_COLORS = ['', '#8B9695', '#3b82f6', '#a855f7', '#f5c542', '#ff5e6c'];

/* §18.2 Gathering node definition — placed in combat zones */
export function createGatheringNodes(zoneId, map) {
  var zone = ZONES[zoneId];
  if (!zone || !zone.element || zone.safe) return [];
  var nodes = [];
  var res = ZONE_RESOURCES[zone.element];
  if (!res) return [];
  var W = zone.w,
    H = zone.h;

  /* Place nodes on grass tiles, avoiding edges */
  var nodeCount = 8;
  var placed = 0;
  for (var attempt = 0; attempt < 200 && placed < nodeCount; attempt++) {
    var _map$ty;
    var tx = 3 + Math.floor(Math.random() * (W - 6));
    var ty = 3 + Math.floor(Math.random() * (H - 6));
    if (((_map$ty = map[ty]) === null || _map$ty === void 0 ? void 0 : _map$ty[tx]) === 0) {
      var _DEPTH_TIERS;
      /* grass only */
      /* Determine tier based on position (deeper = further from entrance) */
      var depthPct = Math.min(1, Math.sqrt(tx * tx + ty * ty) / Math.sqrt(W * W + H * H) * 1.5);
      var tier = Math.min(5, Math.max(1, Math.ceil(depthPct * 3)));
      var gatherLvlReq = ((_DEPTH_TIERS = DEPTH_TIERS[tier - 1]) === null || _DEPTH_TIERS === void 0 ? void 0 : _DEPTH_TIERS.gatherLvl) || 1;
      nodes.push({
        id: 'node-' + zoneId + '-' + placed,
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE / 2,
        tier: tier,
        element: zone.element,
        resourceType: Math.random() < 0.5 ? 'crystal' : Math.random() < 0.5 ? 'ore' : 'herb',
        gatherLvlReq: gatherLvlReq,
        depleted: false,
        respawnAt: 0,
        respawnTime: 30000 + tier * 15000 /* higher tier = longer respawn */
      });
      placed++;
    }
  }
  return nodes;
}

/* §18.1 Cooking recipes — combine ingredients into food buffs */
export const COOKING_RECIPES = [{
  name: 'Herb Bread',
  tier: 1,
  ingredients: {
    herb_firebloom: 1
  },
  buff: 'regen',
  power: 0.02,
  duration: 60,
  cookLvl: 1,
  desc: 'Regen 2%/s for 60s'
}, {
  name: 'Root Stew',
  tier: 1,
  ingredients: {
    herb_rock_vine: 1,
    herb_cloudpetal: 1
  },
  buff: 'resist',
  power: 0.05,
  duration: 60,
  cookLvl: 3,
  desc: '5% resist for 60s'
}, {
  name: 'Firebloom Tea',
  tier: 2,
  ingredients: {
    herb_firebloom: 2
  },
  buff: 'damage',
  power: 0.05,
  duration: 90,
  cookLvl: 6,
  desc: '+5% dmg for 90s'
}];

/* §18 Fish Healing — fish must be COOKED via minigame to become edible */
/* Raw fish → cooking minigame → cooked fish (heals) or burnt fish (wasted) */
export function getFishHealAmount(fishKey) {
  var name = fishKey.replace(/^(fish_|cooked_)/, '').toLowerCase();
  var tier = FISHING_TIERS.find(function (t) {
    return name.includes(t.name.toLowerCase().replace(/\s+/g, '_'));
  });
  if (!tier) return 20;
  return Math.ceil(15 + tier.lvl * 8);
}
export function getFishTierLevel(fishKey) {
  var name = fishKey.replace(/^fish_/, '').toLowerCase();
  var tier = FISHING_TIERS.find(function (t) {
    return name.includes(t.name.toLowerCase().replace(/\s+/g, '_'));
  });
  return tier ? tier.lvl : 1;
}

/* Cooking minigame sweet spot: cookingLevel widens it, fishTier narrows it */
/* Returns {center: 0-1, width: 0-1} — center is random, width is the green zone fraction */
export function getCookingSweetSpot(cookingLevel, fishTierLvl) {
  /* Base width: 40% of bar. Cooking level adds up to +30%. Fish tier subtracts up to -25%. */
  var baseWidth = 0.40;
  var skillBonus = Math.min(0.30, cookingLevel * 0.004); /* +0.4% per level, max +30% */
  var tierPenalty = Math.min(0.25, fishTierLvl * 0.003); /* -0.3% per fish tier level, max -25% */
  var width = Math.max(0.10, Math.min(0.65, baseWidth + skillBonus - tierPenalty));
  /* Center is random but always allows the full sweet spot to fit */
  var halfW = width / 2;
  var center = halfW + Math.random() * (1 - width);
  return {
    center: center,
    width: width
  };
}

/* §18.2 Farming — plant seeds, harvest after time */
export const FARM_GROWTH_TIMES = [0, 3600, 14400, 43200, 86400, 172800]; /* seconds per tier */

/* Create default life skills state */
export function createDefaultLifeSkills() {
  return {
    /* Harvesting skills */
    woodcutting: {
      level: 0,
      xp: 0
    },
    fishing: {
      /* v2.3.224: back to 0 -- tier progression is now the canonical
         path. New players must train fishing to unlock higher-tier
         fish spots. */
      level: 0,
      xp: 0
    },
    mining: {
      level: 0,
      xp: 0
    },
    /* Processing skills */
    cooking: {
      level: 0,
      xp: 0
    },
    blacksmithing: {
      level: 0,
      xp: 0
    },
    woodworking: {
      level: 0,
      xp: 0
    },
    gemCutting: {
      level: 0,
      xp: 0
    },
    enchanting: {
      level: 0,
      xp: 0
    },
    /* Utility skills */
    farming: {
      level: 0,
      xp: 0
    },
    trapping: {
      level: 0,
      xp: 0
    },
    /* Inventories */
    resources: {},
    /* element_type_tier → count (ore, herbs, crystals) */
    gems: {},
    /* raw_flame → count, polished_frost → count, etc */
    farmPlots: {},
    dungeonClears: {},
    /* Legacy compat — old gathering skill migrates to mining */
    gathering: null,
    /* Pet system */
    pets: [],
    activePet: null
  };
}

/* Migrate old saves — convert gathering → mining, ensure new skills exist */
export function migrateLifeSkills(sk) {
  if (!sk) return createDefaultLifeSkills();
  /* v2.3.767: heal saves corrupted by the pre-fix player_state merge, which
     object-spread ARRAYS into plain objects ({0:..}) and null into {}.
     pets must be an array; activePet must be an object-with-fields or null. */
  if (sk.pets && !Array.isArray(sk.pets) && typeof sk.pets === 'object') {
    sk.pets = Object.values(sk.pets);
  }
  if (sk.activePet && typeof sk.activePet === 'object' && Object.keys(sk.activePet).length === 0) {
    sk.activePet = null;
  }
  /* Migrate gathering → mining if old save */
  if (sk.gathering && sk.gathering.level && !sk.mining) {
    sk.mining = {
      level: sk.gathering.level,
      xp: sk.gathering.xp || 0
    };
    sk.gathering = null;
  }
  /* Ensure all new skills exist (start at 0 to match createDefaultLifeSkills). */
  if (!sk.woodcutting) sk.woodcutting = {
    level: 0,
    xp: 0
  };
  if (!sk.fishing) sk.fishing = {
    level: 0,
    xp: 0
  };
  if (!sk.mining) sk.mining = {
    level: 0,
    xp: 0
  };
  if (!sk.blacksmithing) sk.blacksmithing = {
    level: 0,
    xp: 0
  };
  if (!sk.woodworking) sk.woodworking = {
    level: 0,
    xp: 0
  };
  if (!sk.gemCutting) sk.gemCutting = {
    level: 0,
    xp: 0
  };
  if (!sk.gems) sk.gems = {};
  if (!sk.resources) sk.resources = {};
  if (!sk.farmPlots) sk.farmPlots = {};
  if (!sk.dungeonClears) sk.dungeonClears = {};
  if (!sk.pets) sk.pets = [];
  return sk;
}

/* §18.1 PET / TRAPPING SYSTEM */
export const PET_LOOT_RADIUS = 80; /* pixels — pet auto-collects loot within this range */
export const MAX_PET_SLOTS = 6;
export const TRAP_HP_THRESHOLD = 0.20; /* monster must be below 20% HP to trap */

/* ═══ PET EVOLUTION — merge two pets to create evolved form ═══ */
export const PET_EVOLUTION_TIERS = ['Base', 'Evolved', 'Ascended', 'Mythic'];
export const PET_EVOLVE_LEVEL_REQ = [1, 10, 25, 50]; /* min level for each tier */

export function evolvePet(pet1, pet2) {
  /* Both pets consumed, new evolved pet created */
  var higherLvl = Math.max(pet1.level, pet2.level);
  var tier = (pet1.evolutionTier || 0) >= (pet2.evolutionTier || 0) ? pet1.evolutionTier || 0 : pet2.evolutionTier || 0;
  var newTier = Math.min(tier + 1, PET_EVOLUTION_TIERS.length - 1);
  /* Inherit best traits */
  var names = ['Omega', 'Prime', 'Ultra', 'Mega', 'Nova', 'Rex', 'Alpha', 'Apex', 'Zenith', 'Arcane'];
  var prefix = PET_EVOLUTION_TIERS[newTier];
  return {
    id: 'pet-evo-' + Date.now() + '-' + Math.floor(Math.random() * 999),
    archetype: pet1.archetype,
    /* keep primary archetype */
    secondaryArchetype: pet2.archetype !== pet1.archetype ? pet2.archetype : null,
    element: pet1.element || pet2.element,
    secondaryElement: pet1.element && pet2.element && pet1.element !== pet2.element ? pet2.element : null,
    name: prefix + ' ' + names[Math.floor(Math.random() * names.length)],
    level: higherLvl + 2,
    /* evolution bonus */
    emoji: pet1.emoji,
    color: pet1.color,
    captured_at: Date.now(),
    personality: pet1.personality,
    evolutionTier: newTier,
    /* Combat stats scale with tier */
    combatPower: Math.ceil((higherLvl * 2 + newTier * 15) * (1 + newTier * 0.3)),
    /* Inherited element for enchanted attacks */
    enchantElement: null,
    /* set by enchantment system */
    enchantSlots: 1 + newTier /* higher tier = more enchant slots */
  };
}

/* ═══ PET ENCHANTMENT — slot elements for elemental attacks ═══ */
export const PET_ENCHANT_COST = {
  /* gem cost per enchant */
  common: {
    gem: 1,
    gold: 50
  },
  rare: {
    gem: 3,
    gold: 200
  },
  epic: {
    gem: 5,
    gold: 500
  }
};
export function enchantPet(pet, element, gemCount) {
  if (!pet || !element || !ELEMENTS[element]) return null;
  var maxSlots = pet.enchantSlots || 1;
  if (!pet._enchants) pet._enchants = [];
  if (pet._enchants.length >= maxSlots) return null;
  pet._enchants.push({
    element: element,
    power: 10 + (pet.level || 1) * 2 + (pet.evolutionTier || 0) * 15,
    ts: Date.now()
  });
  pet.enchantElement = element; /* primary attack element */
  return pet;
}

/* ═══ FURNITURE CRAFTING — woodworking expansion for farm house ═══ */
export const FURNITURE_RECIPES = [{
  id: 'bed',
  name: 'Wooden Bed',
  icon: '🛏️',
  woodCost: 5,
  goldCost: 30,
  wcLvl: 1,
  desc: 'Rest in style',
  statBuff: {
    wellRestedMult: 1.05
  }
}, {
  id: 'table',
  name: 'Oak Table',
  icon: '🪑',
  woodCost: 8,
  goldCost: 50,
  wcLvl: 5,
  desc: 'Organized workspace',
  statBuff: {
    craftSpeedMult: 1.1
  }
}, {
  id: 'bookshelf',
  name: 'Bookshelf',
  icon: '📚',
  woodCost: 12,
  goldCost: 80,
  wcLvl: 10,
  desc: 'Knowledge collection',
  statBuff: {
    xpMult: 1.03
  }
}, {
  id: 'forge_mini',
  name: 'Mini Forge',
  icon: '🔥',
  woodCost: 15,
  goldCost: 120,
  wcLvl: 15,
  desc: 'Forge at home',
  statBuff: {
    forgeCostMult: 0.9
  }
}, {
  id: 'trophy_case',
  name: 'Trophy Case',
  icon: '🏆',
  woodCost: 10,
  goldCost: 100,
  wcLvl: 12,
  desc: 'Display achievements',
  statBuff: {
    apMult: 1.05
  }
}, {
  id: 'enchant_table',
  name: 'Enchant Table',
  icon: '✨',
  woodCost: 20,
  goldCost: 200,
  wcLvl: 20,
  desc: 'Enchant at home',
  statBuff: {
    enchantBonus: 1
  }
}, {
  id: 'alchemy_set',
  name: 'Alchemy Set',
  icon: '⚗️',
  woodCost: 18,
  goldCost: 180,
  wcLvl: 18,
  desc: 'Brew potions',
  statBuff: {
    potionPower: 1.2
  }
}, {
  id: 'wardrobe',
  name: 'Wardrobe',
  icon: '👔',
  woodCost: 14,
  goldCost: 100,
  wcLvl: 14,
  desc: 'Cosmetic storage',
  statBuff: null
}, {
  id: 'pet_bed',
  name: 'Pet Bed',
  icon: '🐾',
  woodCost: 8,
  goldCost: 60,
  wcLvl: 8,
  desc: 'Pets recover faster',
  statBuff: {
    petPowerMult: 1.1
  }
}, {
  id: 'chandelier',
  name: 'Chandelier',
  icon: '💡',
  woodCost: 25,
  goldCost: 300,
  wcLvl: 25,
  desc: 'Brilliant illumination',
  statBuff: {
    luckMult: 1.02
  }
}, {
  id: 'weapon_rack',
  name: 'Weapon Rack',
  icon: '⚔️',
  woodCost: 16,
  goldCost: 150,
  wcLvl: 16,
  desc: 'Display weapons',
  statBuff: {
    stashSizeMult: 2
  }
}, {
  id: 'garden_box',
  name: 'Garden Box',
  icon: '🌱',
  woodCost: 6,
  goldCost: 40,
  wcLvl: 6,
  desc: 'Indoor growing',
  statBuff: {
    farmYieldMult: 1.1
  }
}];

/* Aggregate all owned furniture buffs into a single object */
export function getFurnitureBuffs(rpg) {
  var buffs = {
    wellRestedMult: 1,
    craftSpeedMult: 1,
    xpMult: 1,
    forgeCostMult: 1,
    apMult: 1,
    enchantBonus: 0,
    potionPower: 1,
    petPowerMult: 1,
    luckMult: 1,
    stashSizeMult: 1,
    farmYieldMult: 1
  };
  var owned = (rpg === null || rpg === void 0 ? void 0 : rpg._furniture) || {};
  FURNITURE_RECIPES.forEach(function (f) {
    if (owned[f.id] && f.statBuff) {
      Object.entries(f.statBuff).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
          k = _ref2[0],
          v = _ref2[1];
        if (typeof v === 'number') {
          if (k.includes('Mult')) buffs[k] = (buffs[k] || 1) * v;else buffs[k] = (buffs[k] || 0) + v;
        }
      });
    }
  });
  return buffs;
}

/* ═══ CLAN WARS — large-scale PvP territory system ═══ */
export const CLAN_WAR_DURATION = 1800000; /* 30 min */
export const CLAN_WAR_MIN_MEMBERS = 2; /* min clan members to start a war */
export const CLAN_WAR_ZONES = ['meadow', 'ember', 'mist', 'frost', 'thunder', 'hollows', 'sky', 'tidal'];
export const CLAN_WAR_REWARDS = {
  winner: {
    gold: 500,
    ap: 100
  },
  loser: {
    gold: 50,
    ap: 10
  },
  mvp: {
    gold: 200,
    ap: 50
  }
};
export function createClanWar(challengerClan, defenderClan, zoneId) {
  return {
    id: 'war-' + Date.now(),
    challenger: {
      tag: challengerClan.tag,
      name: challengerClan.name,
      score: 0,
      members: [],
      color1: challengerClan.color1
    },
    defender: {
      tag: defenderClan.tag,
      name: defenderClan.name,
      score: 0,
      members: [],
      color1: defenderClan.color1
    },
    zone: zoneId,
    status: 'active',
    startTime: Date.now(),
    endTime: Date.now() + CLAN_WAR_DURATION,
    killLog: [],
    winner: null
  };
}

/* ═══ GLADIATOR ARENA — cross-room single elimination tournament ═══ */
export const ARENA_ENTRY_FEE = 100; /* gold */
export const ARENA_CHAMPION_REWARD = {
  gold: 2000,
  ap: 500,
  title: 'Gladiator'
};
export const ARENA_WIN_REWARD = {
  gold: 50,
  ap: 10
}; /* per round win */
export const ARENA_POLL_INTERVAL = 3000; /* check server every 3s */

/* ═══ LIFE SKILL GUILDS — §GUILD ═══ */
/* Each life skill has its own guild with NPC guildmaster, rank progression, quests, titles */
export const SKILL_GUILDS = {
  woodcutting: {
    name: "Lumberjack's Lodge",
    icon: '🪓',
    color: '#8B6914',
    master: 'Guildmaster Oak',
    masterColor: '#6b4226'
  },
  fishing: {
    name: "Angler's Circle",
    icon: '🎣',
    color: '#3498DB',
    master: 'Guildmaster Marina',
    masterColor: '#2980B9'
  },
  mining: {
    name: "Stonecutter's Union",
    icon: '⛏️',
    color: '#795548',
    master: 'Guildmaster Flint',
    masterColor: '#5D4037'
  },
  farming: {
    name: "Grower's Guild",
    icon: '🌾',
    color: '#4CAF50',
    master: 'Guildmaster Sage',
    masterColor: '#2E7D32'
  },
  cooking: {
    name: "Chef's Academy",
    icon: '🍳',
    color: '#ea580c',
    master: 'Guildmaster Ember',
    masterColor: '#BF360C'
  },
  blacksmithing: {
    name: "Anvil Brotherhood",
    icon: '🔨',
    color: '#b0b0b0',
    master: 'Guildmaster Forge',
    masterColor: '#757575'
  },
  woodworking: {
    name: "Carpenter's Circle",
    icon: '🪚',
    color: '#A1887F',
    master: 'Guildmaster Cedar',
    masterColor: '#795548'
  },
  gemCutting: {
    name: "Jeweler's Eye",
    icon: '💎',
    color: '#a855f7',
    master: 'Guildmaster Prism',
    masterColor: '#7E57C2'
  },
  enchanting: {
    name: "Arcane Order",
    icon: '✨',
    color: '#9333ea',
    master: 'Guildmaster Rune',
    masterColor: '#6A1B9A'
  },
  trapping: {
    name: "Beastmaster's Lodge",
    icon: '🪤',
    color: '#f97316',
    master: 'Guildmaster Claw',
    masterColor: '#E65100'
  }
};
export const GUILD_RANKS = [{
  rank: 0,
  title: 'Novice',
  minLvl: 1,
  ap: 0,
  color: '#8B9695'
}, {
  rank: 1,
  title: 'Apprentice',
  minLvl: 10,
  ap: 25,
  color: '#8B9695'
}, {
  rank: 2,
  title: 'Journeyman',
  minLvl: 25,
  ap: 50,
  color: '#3b82f6'
}, {
  rank: 3,
  title: 'Adept',
  minLvl: 40,
  ap: 100,
  color: '#22c55e'
}, {
  rank: 4,
  title: 'Expert',
  minLvl: 55,
  ap: 150,
  color: '#a855f7'
}, {
  rank: 5,
  title: 'Master',
  minLvl: 70,
  ap: 250,
  color: '#f5c542'
}, {
  rank: 6,
  title: 'Grandmaster',
  minLvl: 85,
  ap: 400,
  color: '#ff5e6c'
}, {
  rank: 7,
  title: 'Legendary',
  minLvl: 100,
  ap: 500,
  color: '#F1C40F'
}, {
  rank: 8,
  title: 'Transcendent',
  minLvl: 150,
  ap: 750,
  color: '#00d4b8'
}];

/* Guild quest templates — each skill gets these at specific ranks */
export const GUILD_QUESTS = [{
  rankReq: 0,
  title: 'First Steps',
  desc: 'Reach Lv5 in this skill',
  checkLvl: 5,
  reward: {
    gold: 30,
    ap: 10
  }
}, {
  rankReq: 1,
  title: 'Finding Your Rhythm',
  desc: 'Reach Lv15 in this skill',
  checkLvl: 15,
  reward: {
    gold: 80,
    ap: 25
  }
}, {
  rankReq: 2,
  title: 'Dedicated Practice',
  desc: 'Reach Lv30 in this skill',
  checkLvl: 30,
  reward: {
    gold: 150,
    ap: 40
  }
}, {
  rankReq: 3,
  title: 'True Calling',
  desc: 'Reach Lv50 in this skill',
  checkLvl: 50,
  reward: {
    gold: 300,
    ap: 75
  }
}, {
  rankReq: 4,
  title: 'Master\'s Trial',
  desc: 'Reach Lv70 in this skill',
  checkLvl: 70,
  reward: {
    gold: 500,
    ap: 150
  }
}, {
  rankReq: 5,
  title: 'Beyond Mastery',
  desc: 'Reach Lv90 in this skill',
  checkLvl: 90,
  reward: {
    gold: 800,
    ap: 250
  }
}, {
  rankReq: 6,
  title: 'Legendary Artisan',
  desc: 'Reach Lv100 in this skill',
  checkLvl: 100,
  reward: {
    gold: 1200,
    ap: 400
  }
}, {
  rankReq: 7,
  title: 'Transcendence',
  desc: 'Reach Lv150 in this skill',
  checkLvl: 150,
  reward: {
    gold: 2000,
    ap: 750
  }
}];
export function getGuildRank(skillLevel) {
  var rank = GUILD_RANKS[0];
  for (var _i11 = 0, _GUILD_RANKS = GUILD_RANKS; _i11 < _GUILD_RANKS.length; _i11++) {
    var r = _GUILD_RANKS[_i11];
    if (skillLevel >= r.minLvl) rank = r;
  }
  return rank;
}
export function getGuildQuest(skillKey, rpg) {
  var _rpg$lifeSkills2;
  var skill = rpg === null || rpg === void 0 || (_rpg$lifeSkills2 = rpg.lifeSkills) === null || _rpg$lifeSkills2 === void 0 ? void 0 : _rpg$lifeSkills2[skillKey];
  if (!skill) return null;
  var guildProgress = rpg._guildProgress || {};
  var completed = guildProgress[skillKey] || 0; /* index of last completed quest */
  var quest = GUILD_QUESTS[completed];
  if (!quest) return null; /* all done */
  return { ...quest,
    skillKey: skillKey,
    currentLvl: skill.level,
    complete: skill.level >= quest.checkLvl
  };
}

/* ═══ UNDERWATER DIVING — §DIVE ═══ */
/* Tidal zone swimming becomes 2D side-scroller with air meter */
export const DIVE_MAX_AIR = 100; /* 100 units = ~20 seconds underwater */
export const DIVE_AIR_DRAIN = 0.08; /* per frame (~60fps) = ~20s of air */
export const DIVE_AIR_REFILL = 2.0; /* per frame at surface */
export const DIVE_DAMAGE_RATE = 2; /* HP per second when out of air */
export const DIVE_DEPTH_LAYERS = 3; /* visual parallax layers */
export const DIVE_TREASURE_CHANCE = 0.002; /* per frame, chance of finding underwater treasure */

/* ═══ ARENA SPECTATOR BETTING — §BET ═══ */
export const ARENA_BET_MIN = 10;
export const ARENA_BET_MAX = 5000;

/* ═══ COMMUNITY FEEDBACK — §FEED ═══ */
export const FEEDBACK_CATEGORIES = [{
  id: 'bug',
  label: '🐛 Bug',
  color: '#ff5e6c',
  desc: 'Something broken'
}, {
  id: 'balance',
  label: '⚖️ Balance',
  color: '#f5c542',
  desc: 'Too strong/weak'
}, {
  id: 'remove',
  label: '🗑️ Remove',
  color: '#8B9695',
  desc: 'Take this out'
}, {
  id: 'add',
  label: '➕ Add',
  color: '#3dd497',
  desc: 'New feature idea'
}, {
  id: 'qol',
  label: '✨ QoL',
  color: '#a78bfa',
  desc: 'Quality of life'
}, {
  id: 'praise',
  label: '❤️ Praise',
  color: '#ea580c',
  desc: 'Something great'
}];
export const FEEDBACK_TOPICS = [{
  id: 'combat',
  label: '⚔️ Combat',
  desc: 'Fighting, weapons, elements'
}, {
  id: 'arena',
  label: '🏟️ Arena',
  desc: 'Gladiator tournament'
}, {
  id: 'guilds',
  label: '🏛️ Guilds',
  desc: 'Life skill guilds + ranks'
}, {
  id: 'pets',
  label: '🐾 Pets',
  desc: 'Capture, evolution, enchant'
}, {
  id: 'crafting',
  label: '🔨 Crafting',
  desc: 'Blacksmith, woodwork, cooking'
}, {
  id: 'marketplace',
  label: '🏪 Marketplace',
  desc: 'Trading, buy/sell orders'
}, {
  id: 'dungeons',
  label: '🐉 Dungeons',
  desc: 'Dungeons + custom workshop'
}, {
  id: 'clans',
  label: '🏰 Clans',
  desc: 'Clans + clan wars'
}, {
  id: 'pvp',
  label: '💀 PvP',
  desc: 'PvP and duels'
}, {
  id: 'zones',
  label: '🗺️ Zones',
  desc: 'Zones, biomes, diving'
}, {
  id: 'farm',
  label: '🌾 Farm',
  desc: 'Farm, house, furniture'
}, {
  id: 'ui',
  label: '🖥️ UI/Controls',
  desc: 'Interface, mobile, desktop'
}, {
  id: 'social',
  label: '👥 Social',
  desc: 'Chat, emotes, friends'
}, {
  id: 'progression',
  label: '📊 Progression',
  desc: 'Leveling, XP, achievements'
}, {
  id: 'other',
  label: '💭 Other',
  desc: 'Anything else'
}];

/* ═══ ANNIVERSARY ITEMS — §ANNIV ═══ */
/* Discontinued tradeable cosmetics. One per account. Drop on anniversary date. */
export const ANNIVERSARY_ITEMS = [{
  id: 'og_bro_cape',
  year: 1,
  name: 'OG Bro Cape',
  emoji: '🏴',
  desc: 'Black and gold cape — awarded to players present on the first anniversary.',
  colors: {
    primary: '#1a1a1a',
    accent: '#d4a030',
    trim: '#f5c542',
    glow: 'rgba(212,160,48,.3)'
  },
  type: 'cape',
  rarity: 'legendary',
  /* Drop window: anniversary date ± 24 hours */
  dropMonth: null,
  dropDay: null /* set to actual launch date when known */
}
/* Future years — add entries here */
/* { id:'year2_wings', year:2, name:'Celestial Wings', emoji:'🪽', ... }, */];

/* Check if an anniversary item should drop today */
export function checkAnniversaryDrop(rpg) {
  if (!rpg) return null;
  if (!rpg._anniversaryItems) rpg._anniversaryItems = [];
  var now = new Date();
  var _loop = function _loop() {
      var item = _ANNIVERSARY_ITEMS[_i12];
      /* Skip if already owned */
      if (rpg._anniversaryItems.find(function (a) {
        return a.id === item.id;
      })) return 0; // continue
      /* For Year 1: drop is always available until first anniversary passes */
      /* In production, check: now.getMonth()===item.dropMonth && now.getDate()===item.dropDay */
      /* For now: Year 1 cape drops for everyone (first launch period) */
      if (item.year === 1 && !rpg._anniversaryItems.find(function (a) {
        return a.id === item.id;
      })) {
        return {
          v: item
        };
      }
    },
    _ret;
  for (var _i12 = 0, _ANNIVERSARY_ITEMS = ANNIVERSARY_ITEMS; _i12 < _ANNIVERSARY_ITEMS.length; _i12++) {
    _ret = _loop();
    if (_ret === 0) continue;
    if (_ret) return _ret.v;
  }
  return null;
}

/* ═══ ELEMENTAL MINIGAMES — §MINI ═══ */
/* 2-4 player timed minigames on the farm, one theme per element */
export const MINIGAME_DURATION = 45000; /* 45 seconds */
export const MINIGAME_MIN_PLAYERS = 1; /* 1 for testing, 2 for production */
export const MINIGAME_MAX_PLAYERS = 4;
export const MINIGAME_ENTRY_FEE = 25; /* gold */

export const ELEMENTAL_MINIGAMES = [{
  id: 'flame_dodge',
  element: 'flame',
  name: 'Lava Dodge',
  icon: '🌋',
  color: '#C0392B',
  desc: 'Dodge falling lava rocks. Last one standing wins!',
  mechanic: 'dodge',
  /* timing-based dodge */
  spawnRate: 800,
  /* ms between hazards */
  scoreType: 'survival' /* score = time survived */
}, {
  id: 'frost_reflect',
  element: 'frost',
  name: 'Ice Deflect',
  icon: '❄️',
  color: '#2980B9',
  desc: 'Block incoming ice shards with precise timing.',
  mechanic: 'block',
  spawnRate: 600,
  scoreType: 'blocks' /* score = successful blocks */
}, {
  id: 'storm_strike',
  element: 'storm',
  name: 'Lightning Strike',
  icon: '⚡',
  color: '#8E44AD',
  desc: 'Hit targets when they flash. Speed and accuracy!',
  mechanic: 'attack',
  spawnRate: 700,
  scoreType: 'hits' /* score = targets hit */
}, {
  id: 'venom_rhythm',
  element: 'venom',
  name: 'Poison Pulse',
  icon: '🧪',
  color: '#27AE60',
  desc: 'Match the rhythm of poison pulses. Don\'t miss a beat!',
  mechanic: 'rhythm',
  spawnRate: 500,
  scoreType: 'streak' /* score = longest combo */
}, {
  id: 'stone_smash',
  element: 'stone',
  name: 'Rock Crusher',
  icon: '🪨',
  color: '#795548',
  desc: 'Smash rocks in order from smallest to largest.',
  mechanic: 'sequence',
  spawnRate: 900,
  scoreType: 'correct' /* score = correct sequences */
}, {
  id: 'wind_catch',
  element: 'wind',
  name: 'Gust Catcher',
  icon: '🌬️',
  color: '#7F8C8D',
  desc: 'Catch wind orbs as they fly across. Don\'t grab decoys!',
  mechanic: 'catch',
  spawnRate: 400,
  scoreType: 'caught' /* score = orbs caught minus decoys */
}, {
  id: 'water_dive',
  element: 'water',
  name: 'Pearl Diver',
  icon: '🫧',
  color: '#3498DB',
  desc: 'Dive for pearls. Surface for air before drowning!',
  mechanic: 'resource',
  /* manage air while collecting */
  spawnRate: 1000,
  scoreType: 'pearls' /* score = pearls collected */
}];
export function createMinigameInstance(gameId, hostId, hostName) {
  var game = ELEMENTAL_MINIGAMES.find(function (g) {
    return g.id === gameId;
  });
  if (!game) return null;
  return {
    id: 'mg-' + Date.now(),
    gameId: gameId,
    gameName: game.name,
    element: game.element,
    icon: game.icon,
    color: game.color,
    mechanic: game.mechanic,
    host: {
      id: hostId,
      name: hostName
    },
    players: [{
      id: hostId,
      name: hostName,
      score: 0,
      alive: true
    }],
    status: 'waiting',
    /* waiting | countdown | active | ended */
    startTime: null,
    endTime: null,
    hazards: [],
    /* active hazards/targets */
    _nextSpawn: 0,
    winner: null
  };
}


/* Create a pet from a defeated/weakened monster */
export function createPet(monster) {
  var names = ['Nibbles', 'Chompy', 'Sparky', 'Dusty', 'Wispy', 'Bubbles', 'Frosty', 'Ember', 'Shade', 'Glimmer', 'Mossy', 'Rocky', 'Zippy', 'Gloop', 'Rumble'];
  return {
    id: 'pet-' + Date.now() + '-' + Math.floor(Math.random() * 999),
    archetype: monster.archetype || monster.type || 'fodder',
    element: monster.element || null,
    name: names[Math.floor(Math.random() * names.length)],
    level: monster.level || 1,
    emoji: monster.emoji || '🟢',
    color: monster.color || '#3dd497',
    captured_at: Date.now(),
    /* Pet personality — affects idle behavior */
    personality: ['playful', 'lazy', 'curious', 'anxious', 'bold'][Math.floor(Math.random() * 5)]
  };
}

/* §18.3 Minigame system — timing bar used by gathering, cooking, enchanting, trapping */
/* Returns: 'perfect' (center), 'good' (near center), 'ok' (hit zone), 'miss' (outside) */
export function evaluateMinigame(progress, target, targetSize) {
  var dist = Math.abs(progress - target);
  if (dist <= targetSize * 0.2) return 'perfect';
  if (dist <= targetSize * 0.5) return 'good';
  if (dist <= targetSize) return 'ok';
  return 'miss';
}
export const MINIGAME_REWARDS = {
  perfect: {
    xpMult: 2.0,
    yieldMult: 2,
    label: 'PERFECT!',
    color: '#f5c542'
  },
  good: {
    xpMult: 1.5,
    yieldMult: 1,
    label: 'Good!',
    color: '#3dd497'
  },
  ok: {
    xpMult: 1.0,
    yieldMult: 1,
    label: 'OK',
    color: '#8B9695'
  },
  miss: {
    xpMult: 0.3,
    yieldMult: 0,
    label: 'Miss!',
    color: '#ff5e6c'
  }
};

/* ═══ EXTRACTION (v2.3.229+) ═══
   Replaces the modal minigames with an in-world windowed-swipe loop.
   Variable open delay creates the dynamic event window; high-level
   players see it compress, low-level players see it stretch. Jitter
   keeps the exact ms non-deterministic so the loop can't be cleanly
   timed by a bot. */
export const EXTRACT_WINDOW_MS = 3500;       /* phase-2 gesture window once cue appears
                                                (widened from 1500 for the sustained
                                                "keep the motion going" meter) */
export const EXTRACT_CANCEL_R  = 110;        /* px from node before walk-away cancel.
                                                v2.3.854: 90 -> 110 so the mining
                                                stance (~86px above the vein, to line
                                                the swing up with the ore) doesn't sit
                                                on the cancel boundary. Matches the
                                                server NODE_STRIKE_RANGE (110). */
export const EXTRACT_OPEN_MIN  = 2000;       /* floor at fully over-leveled */
export const EXTRACT_OPEN_MAX  = 10000;      /* ceiling at very under-leveled */
export const EXTRACT_OPEN_BASE = 4000;       /* level == tier */
export const EXTRACT_JITTER    = 0.15;       /* ±15% jitter on each open delay */
/* Phase-2 is a sustained gesture: the player repeats the skill motion to fill a
   meter. REPS_TARGET reps complete the extraction. Per-skill so each can be tuned
   independently (e.g. fishing reels feel right a touch shorter). */
export const EXTRACT_REPS_TARGET = { mining: 3, woodcutting: 3, fishing: 2, cooking: 1 };
export const EXTRACT_REPS_DEFAULT = 3;

export function computeOpenDelay(skillLevel, nodeTier) {
  var lvl = Number(skillLevel) || 0;
  var tier = Number(nodeTier) || 1;
  var gap = tier - lvl;
  var base;
  if (gap > 0) {
    base = EXTRACT_OPEN_BASE + gap * 1200;
  } else if (gap < 0) {
    base = EXTRACT_OPEN_BASE + gap * 250;
  } else {
    base = EXTRACT_OPEN_BASE;
  }
  if (base < EXTRACT_OPEN_MIN) base = EXTRACT_OPEN_MIN;
  if (base > EXTRACT_OPEN_MAX) base = EXTRACT_OPEN_MAX;
  var j = 1 + (Math.random() * 2 - 1) * EXTRACT_JITTER;
  return Math.round(base * j);
}

/* Award life skill XP */
export function awardSkillXp(skills, skillName, amount) {
  var skill = skills[skillName];
  if (!skill) return false;
  skill.xp += amount;
  var leveled = false;
  while (skill.xp >= skillXpRequired(skill.level)) {
    skill.xp -= skillXpRequired(skill.level);
    skill.level++;
    leveled = true;
  }
  return leveled;
}
export const addLifeSkillXp = awardSkillXp;

/* Add resource to inventory */
export function addResource(skills, element, type, tier, amount) {
  var key = element + '_' + type + '_' + tier;
  skills.resources[key] = (skills.resources[key] || 0) + (amount || 1);
}

/* Get resource count */
export function getResource(skills, element, type, tier) {
  return skills.resources[element + '_' + type + '_' + tier] || 0;
}

/* Check if player has cleared a dungeon depth for a zone */
export function hasDungeonClear(skills, zoneId, depthId) {
  return !!skills.dungeonClears[zoneId + '_' + depthId];
}

/* Get maximum accessible depth tier for a zone */
export function getMaxDepth(skills, zoneId) {
  for (var i = DEPTH_TIERS.length - 1; i >= 0; i--) {
    var dt = DEPTH_TIERS[i];
    if (!dt.gate) return i; /* shallow is always accessible */
    if (hasDungeonClear(skills, zoneId, dt.gate)) return i;
  }
  return 0;
}


export const TILE_SOLID = new Set([2, 3, 4, 7, 11, 13]); /* can't walk through (fence + house are solid) */

/* ═══ ZONE TRANSITION ═══ */
export function spawnMonstersForZone(zone, levelMod) {
  var monsters = [];
  if (!zone.spawns) return monsters;
  var W = zone.w * TILE,
    H = zone.h * TILE;
  var margin = 4 * TILE;
  var lm = levelMod || 0;
  var idx = 0;
  zone.spawns.forEach(function (_ref3) {
    var arch = _ref3.arch,
      count = _ref3.count;
    for (var i = 0; i < count; i++) {
      var x = margin + Math.random() * (W - margin * 2);
      var y = margin + Math.random() * (H - margin * 2);
      var depthPct = Math.max(0, Math.min(1, y / H));
      var baseLvl = (zone.level[0] || 1) + lm;
      var maxLvl = (zone.level[1] || 10) + lm;
      /* v2.3.1147: entrance ramp -- mirrors _spawnZoneMonsters in
         server/src/index.js (shallowest 15% spawns up to -4 below the
         band floor so zone entries aren't an instant wall). */
      var ramp = depthPct < 0.15 ? Math.round((1 - depthPct / 0.15) * 4) : 0;
      var lvl = Math.max(1, Math.round(baseLvl + depthPct * (maxLvl - baseLvl)) - ramp);
      var m = createMonster('m-' + zone.id + '-' + idx, arch, lvl, x, y, zone.element);
      m.curHp = m.hp;
      m.type = arch;
      /* Zone variant skin (e.g. fodder -> fireGoblin in ember).  Pure
         archetype-name swap; stats are already done by createMonster
         since the variant is also a real ARCHETYPES entry. */
      applyZoneVariant(m, zone.id);
      monsters.push(m);
      idx++;
    }
  });
  return monsters;
}

/* Legacy compat — old code references these */
export const SPEED = 2.5;
export const ANIM_LERP = 0.3;
export const SAFE_ZONE_RADIUS = 300;
export const RESPAWN_INVULN = 20000;
/* §5.5 Death penalty — escalating respawn + inventory scatter */
export const RESPAWN_BASE = 5000; /* 5s base respawn */
export const RESPAWN_ESCALATE = 2000; /* +2s per recent death */
export const RESPAWN_ESCALATE_WINDOW = 120000; /* 120s window for escalation */
export const RESPAWN_MAX = 15000; /* 15s max respawn */
export const DEATH_SCATTER_RECOVERY = 30000; /* 30s to recover scattered items */
export const DEATH_GOLD_PENALTY = 0.10; /* lose 10% gold */
/* §4 Weapon stash — hold dropped weapons for compare/swap */
export const WEAPON_STASH_MAX = 8;

/* Legacy BUILDINGS array mapped from TOWN_BUILDINGS for render code */
export const BUILDINGS = TOWN_BUILDINGS.map(function (b) {
  return { ...b };
});

/* ═══ CUSTOM DUNGEON CREATOR — §DNG ═══ */
/* Content packs — built-in catalog of monster skins, terrain themes, decorations */
export const DUNGEON_TERRAIN_PACKS = [{
  id: 'stone_halls',
  name: 'Stone Halls',
  free: true,
  icon: '🏰',
  ground: '#3a3a3a',
  path: '#5a5a5a',
  wall: '#2a2a2a',
  accent: '#6a5a4a',
  desc: 'Classic dungeon corridors'
}, {
  id: 'lava_pit',
  name: 'Lava Pit',
  free: true,
  icon: '🌋',
  ground: '#4a2a1a',
  path: '#6a4a2a',
  wall: '#2a1a0a',
  accent: '#c04020',
  desc: 'Molten rivers and charred stone',
  reqBoss: 'ember'
}, {
  id: 'ice_cavern',
  name: 'Ice Cavern',
  free: true,
  icon: '❄️',
  ground: '#4a5a6a',
  path: '#7a8a9a',
  wall: '#2a3a4a',
  accent: '#90c0e0',
  desc: 'Frozen crystalline caves',
  reqBoss: 'frost'
}, {
  id: 'toxic_swamp',
  name: 'Toxic Swamp',
  free: true,
  icon: '🧪',
  ground: '#2a3a1a',
  path: '#4a5a2a',
  wall: '#1a2a0a',
  accent: '#40a030',
  desc: 'Bubbling poison pools',
  reqBoss: 'mist'
}, {
  id: 'thunder_spire',
  name: 'Thunder Spire',
  free: true,
  icon: '⚡',
  ground: '#3a3a4a',
  path: '#5a5a6a',
  wall: '#2a2a3a',
  accent: '#8060c0',
  desc: 'Crackling storm energy',
  reqBoss: 'thunder'
}, {
  id: 'crystal_mine',
  name: 'Crystal Mine',
  free: true,
  icon: '💎',
  ground: '#3a3a3a',
  path: '#4a4a5a',
  wall: '#2a2a2a',
  accent: '#80a0c0',
  desc: 'Glittering gem deposits',
  reqBoss: 'hollows'
}, {
  id: 'sky_temple',
  name: 'Sky Temple',
  free: true,
  icon: '☁️',
  ground: '#5a6a7a',
  path: '#8a9aaa',
  wall: '#4a5a6a',
  accent: '#b0c0d0',
  desc: 'Floating island ruins',
  reqBoss: 'sky'
}, {
  id: 'coral_reef',
  name: 'Coral Reef',
  free: true,
  icon: '🐚',
  ground: '#2a4a5a',
  path: '#3a6a7a',
  wall: '#1a3a4a',
  accent: '#40a0c0',
  desc: 'Underwater caverns',
  reqBoss: 'tidal'
}, {
  id: 'void_realm',
  name: 'Void Realm',
  free: false,
  icon: '🕳️',
  ground: '#0a0a1a',
  path: '#1a1a2a',
  wall: '#050510',
  accent: '#4020a0',
  desc: 'Reality-warped dimension',
  cost: 500
}, {
  id: 'golden_palace',
  name: 'Golden Palace',
  free: false,
  icon: '👑',
  ground: '#5a4a2a',
  path: '#8a7a4a',
  wall: '#3a3018',
  accent: '#d4a030',
  desc: 'Opulent treasure vaults',
  cost: 800
}, {
  id: 'bone_crypt',
  name: 'Bone Crypt',
  free: false,
  icon: '💀',
  ground: '#2a2218',
  path: '#3a3228',
  wall: '#1a1a10',
  accent: '#a0906a',
  desc: 'Ossuary of fallen warriors',
  cost: 300
}];
export const DUNGEON_MONSTER_PACKS = [{
  id: 'basic_beasts',
  name: 'Basic Beasts',
  free: true,
  icon: '🐺',
  archetypes: ['fodder', 'swarm'],
  desc: 'Slimes and swarms'
}, {
  id: 'heavy_hitters',
  name: 'Heavy Hitters',
  free: true,
  icon: '🪨',
  archetypes: ['brute', 'sentinel'],
  desc: 'Brutes and sentinels'
}, {
  id: 'dark_arts',
  name: 'Dark Arts',
  free: true,
  icon: '🔮',
  archetypes: ['hexer', 'stalker'],
  desc: 'Hexers and stalkers'
}, {
  id: 'explosive_pack',
  name: 'Volatile Pack',
  free: true,
  icon: '💥',
  archetypes: ['volatile'],
  desc: 'Explosive enemies'
}, {
  id: 'flame_legion',
  name: 'Flame Legion',
  free: false,
  icon: '🔥',
  element: 'flame',
  cost: 200,
  desc: 'Fire-infused monsters',
  reqBoss: 'ember'
}, {
  id: 'frost_horde',
  name: 'Frost Horde',
  free: false,
  icon: '🧊',
  element: 'frost',
  cost: 200,
  desc: 'Ice-themed creatures',
  reqBoss: 'frost'
}, {
  id: 'venom_brood',
  name: 'Venom Brood',
  free: false,
  icon: '🐍',
  element: 'venom',
  cost: 200,
  desc: 'Poison monsters',
  reqBoss: 'mist'
}, {
  id: 'storm_legion',
  name: 'Storm Legion',
  free: false,
  icon: '🌩️',
  element: 'storm',
  cost: 200,
  desc: 'Lightning enemies',
  reqBoss: 'thunder'
}, {
  id: 'earth_golems',
  name: 'Earth Golems',
  free: false,
  icon: '🗿',
  element: 'stone',
  cost: 200,
  desc: 'Stone creatures',
  reqBoss: 'hollows'
}, {
  id: 'wind_spirits',
  name: 'Wind Spirits',
  free: false,
  icon: '🌬️',
  element: 'wind',
  cost: 200,
  desc: 'Air elementals',
  reqBoss: 'sky'
}, {
  id: 'deep_horrors',
  name: 'Deep Horrors',
  free: false,
  icon: '🐙',
  element: 'water',
  cost: 200,
  desc: 'Aquatic nightmares',
  reqBoss: 'tidal'
}, {
  id: 'boss_pack',
  name: 'Boss Blueprints',
  free: false,
  icon: '🐉',
  cost: 1000,
  desc: 'Design custom bosses with abilities'
}];

/* Dungeon Creator rules engine */
export function getDungeonCreatorUnlocks(rpg) {
  var _rpg$lifeSkills3;
  var unlocks = {
    terrains: [],
    /* unlocked terrain pack IDs */
    monsters: [],
    /* unlocked monster pack IDs */
    maxLevel: (rpg === null || rpg === void 0 ? void 0 : rpg.level) || 1,
    maxWaves: Math.min(10, 2 + Math.floor(((rpg === null || rpg === void 0 ? void 0 : rpg.level) || 1) / 10)),
    maxRooms: Math.min(5, 1 + Math.floor(((rpg === null || rpg === void 0 ? void 0 : rpg.level) || 1) / 15)),
    bossesDefeated: {} /* zoneId → true */
  };
  var clears = (rpg === null || rpg === void 0 || (_rpg$lifeSkills3 = rpg.lifeSkills) === null || _rpg$lifeSkills3 === void 0 ? void 0 : _rpg$lifeSkills3.dungeonClears) || (rpg === null || rpg === void 0 ? void 0 : rpg.dungeonClears) || {};

  /* Check which zone bosses have been beaten (any depth clear counts) */
  Object.keys(clears).forEach(function (key) {
    var zone = key.split('_')[0];
    if (clears[key]) unlocks.bossesDefeated[zone] = true;
  });

  /* Unlock terrains */
  DUNGEON_TERRAIN_PACKS.forEach(function (p) {
    var _rpg$_ownedPacks;
    var owned = rpg === null || rpg === void 0 || (_rpg$_ownedPacks = rpg._ownedPacks) === null || _rpg$_ownedPacks === void 0 ? void 0 : _rpg$_ownedPacks.includes(p.id);
    if (p.free && !p.reqBoss) unlocks.terrains.push(p.id);else if (p.free && p.reqBoss && unlocks.bossesDefeated[p.reqBoss]) unlocks.terrains.push(p.id);else if (!p.free && owned) unlocks.terrains.push(p.id);
  });

  /* Unlock monster packs */
  DUNGEON_MONSTER_PACKS.forEach(function (p) {
    var _rpg$_ownedPacks2;
    var owned = rpg === null || rpg === void 0 || (_rpg$_ownedPacks2 = rpg._ownedPacks) === null || _rpg$_ownedPacks2 === void 0 ? void 0 : _rpg$_ownedPacks2.includes(p.id);
    if (p.free) unlocks.monsters.push(p.id);else if (p.reqBoss && unlocks.bossesDefeated[p.reqBoss] && owned) unlocks.monsters.push(p.id);else if (!p.reqBoss && owned) unlocks.monsters.push(p.id);
  });
  return unlocks;
}

/* Validate a custom dungeon config against rules */
export function validateCustomDungeon(config, rpg) {
  var errors = [];
  var unlocks = getDungeonCreatorUnlocks(rpg);
  if (!config.terrain) errors.push('Select a terrain');else if (!unlocks.terrains.includes(config.terrain)) errors.push('Terrain not unlocked');
  if (!config.waves || config.waves < 1) errors.push('Need at least 1 wave');
  if (config.waves > unlocks.maxWaves) errors.push('Max ' + unlocks.maxWaves + ' waves at your level');
  if (config.monsterLevel > unlocks.maxLevel) errors.push('Monster level cannot exceed your level (' + unlocks.maxLevel + ')');
  if (config.monsters) {
    config.monsters.forEach(function (m) {
      var pack = DUNGEON_MONSTER_PACKS.find(function (p) {
        var _p$archetypes;
        return (_p$archetypes = p.archetypes) === null || _p$archetypes === void 0 ? void 0 : _p$archetypes.includes(m.archetype);
      });
      if (pack && !unlocks.monsters.includes(pack.id)) errors.push(m.archetype + ' requires ' + pack.name);
      if (m.element) {
        var elemPack = DUNGEON_MONSTER_PACKS.find(function (p) {
          return p.element === m.element;
        });
        if (elemPack && !unlocks.monsters.includes(elemPack.id)) errors.push(m.element + ' element requires ' + elemPack.name);
      }
    });
  }
  return errors;
}

/* Create default custom dungeon config */
export function createDefaultDungeonConfig() {
  return {
    name: 'My Dungeon',
    terrain: 'stone_halls',
    width: 25,
    height: 20,
    waves: 3,
    monsterLevel: 1,
    element: null,
    monsters: [/* per-wave monster configs */
    {
      archetype: 'fodder',
      count: 4,
      element: null
    }, {
      archetype: 'swarm',
      count: 3,
      element: null
    }],
    hasBoss: false,
    bossArchetype: 'brute',
    bossMultiplier: 4,
    /* HP multiplier */
    decorations: [],
    /* terrain features */
    created: Date.now()
  };
}
/* Legacy dimension compat — code throughout references these. They dynamically reflect current zone. */
/* These are functions disguised as constants via getter, but simpler to just set reasonable defaults */
/* and update them on zone transition. For now, default to town size. */
export let TOWN_W = ZONES.town.w * TILE;
export let TOWN_H = ZONES.town.h * TILE;
export let COLS = ZONES.town.w;
export let ROWS = ZONES.town.h;
export function updateZoneDimensions(zoneId) {
  var z = ZONES[zoneId];
  TOWN_W = z.w * TILE;
  TOWN_H = z.h * TILE;
  COLS = z.w;
  ROWS = z.h;
}

/* ═══ RPG SYSTEM ═══ */
/* ═══ GDD v8.0 — STAT SYSTEM ═══ */
/* Tier 1: Capacity (permanent) */
/* Tier 2: Technique (respecable) */
export const STAT_POINTS_PER_LEVEL = 10; /* 5 Tier1 + 5 Tier2 */
/* v2.3.910: combat level is now the SUM of the build-skill levels (the five
   use-trained stats), so it climbs ~5x faster than the old 5-build-point gate.
   Cap raised 100 -> 500 (≈ five skills × ~100) so a fully-built character
   isn't frozen. See docs/specs/build-skill-progression.md.
   v2.3.1342: level = total T2 points PLACED (owner directive 2026-07-16:
   every point spent = +1 combat level), so the cap rises to the
   1000-point COMBAT_BUILD_CEILING — max level 1000 IS a finished build. */
export const LEVEL_CAP = 1000;

/* ═══ GEAR STAT REQUIREMENTS — Tier 1 stat thresholds replace level gating ═══ */
/* Each gear type requires a specific Tier 1 stat. Threshold = tierIndex × 10. */
export const GEAR_STAT_REQ = {
  greatsword: 'power',
  /* Heavy hitter identity */
  sword: 'agility',
  /* Fast pressure identity */
  bow: 'agility',
  /* Ranged precision */
  staff: 'mind',
  /* Mana-dependent caster */
  shield: 'endurance',
  /* Stamina-based blocking */
  armor: 'vitality',
  /* HP-based survival */
  amulet: 'mind' /* Enhancement/utility */
};

/* Calculate the stat requirement for a given crafting tier */
/* tierIndex: 0-based position in the tier table (0=first tier, 19=last) */
export function getGearStatReq(gearType, tierIndex) {
  var stat = GEAR_STAT_REQ[gearType];
  if (!stat) return {
    stat: 'power',
    value: 0
  };
  return {
    stat: stat,
    value: tierIndex * 10
  };
}

/* Check if player meets the stat requirement for a piece of gear */
export function meetsGearReq(rpg, gearType, tierIndex) {
  var req = getGearStatReq(gearType, tierIndex);
  return (rpg[req.stat] || 0) >= req.value;
}

/* Get the stat name for display.
   v2.3.910: the five use-trained stats are relabeled as the player-facing
   "build skills".  Internal keys are unchanged (power/vitality/agility/mind)
   to avoid a repo-wide rename + keep the forge stat-gates working; only the
   display labels move to Melee/Bow/Magic/HP. */
export const STAT_LABELS = {
  power: 'Melee',
  vitality: 'HP',
  endurance: 'Endurance',
  agility: 'Bow',
  mind: 'Magic'
};

/* Check stat requirement for a specific item (works with crafted gearBase or dropped tierMult) */
export function meetsStatReq(rpg, item, weaponType) {
  if (!item || !weaponType) return true;
  var gearType = GEAR_STAT_REQ[weaponType] ? weaponType : 'greatsword';
  var stat = GEAR_STAT_REQ[gearType];
  if (!stat) return true;

  /* For crafted items with gearBase — look up tier index */
  if (item.gearBase) {
    var isWW = item.gearBase.startsWith('ww_');
    var tierKey = isWW ? item.gearBase.slice(3) : item.gearBase;
    var table = isWW ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
    var tierIdx = Object.keys(table).indexOf(tierKey);
    if (tierIdx < 0) return true;
    return (rpg[stat] || 0) >= tierIdx * 10;
  }

  /* For dropped items — estimate tier from tierMult */
  var tierMult = item.tierMult || 1;
  /* Approximate: tierMult 1.0=tier0, 1.5=tier5, 2.0=tier8, 3.0=tier12, 6.0=tier19 */
  var estIdx = Math.max(0, Math.round((tierMult - 1) * 6));
  return (rpg[stat] || 0) >= estIdx * 10;
}

/* §4.2 Weapon Types */
export const WEAPON_TYPES = {
  greatsword: {
    base: 10,
    speed: 0.7,
    range: 50,
    type: 'melee',
    arc: Math.PI * 0.85,
    label: 'Great Sword',
    emoji: '⚔️'
  },
  sword: {
    base: 6.67,
    speed: 1.4,
    range: 40,
    type: 'melee',
    arc: Math.PI * 0.6,
    label: 'Sword',
    emoji: '🗡️'
  },
  bow: {
    base: 7.29,
    speed: 1.2,
    range: 200,
    type: 'ranged',
    label: 'Bow',
    emoji: '🏹'
  },
  staff: {
    base: 8.54,
    speed: 1.0,
    range: 120,
    type: 'ranged',
    aoeCap: 3,
    aoeCone: Math.PI / 4,
    label: 'Staff',
    emoji: '🪄'
  }
};

/* ═══ Tier-2 per-weapon-CATEGORY builds ═══
   Each item-level WEAPON_TYPES key maps to a category.  A category owns
   one skill level + one point pool shared by every weapon type inside it,
   so a fast `sword` and a heavy `greatsword` train the same Sword build
   while keeping their own base/speed/range combat math. */
export const WEAPON_CATEGORY = {
  greatsword: 'sword',
  sword: 'sword',
  bow: 'bow',
  staff: 'staff',
};
/* Stable category list for UI iteration. */
export const WEAPON_CATEGORIES = ['sword', 'bow', 'staff'];
/* v2.3.910: weapon categories are relabeled to match the build-skill names
   (Melee/Bow/Magic).  Internal category keys stay sword/bow/staff. */
export const WEAPON_CATEGORY_META = {
  sword: { label: 'Melee', emoji: '⚔️', blurb: 'Melee blades — fast sword + heavy greatsword.' },
  bow:   { label: 'Bow',   emoji: '🏹', blurb: 'Ranged physical — precision at distance.' },
  staff: { label: 'Magic', emoji: '✨', blurb: 'Magic — AoE detonation, high variance.' },
};

/* Points granted per weapon-skill level, and the per-channel cap.
   v2.3.910: 5 -> 1.  Each build-skill level now grants exactly ONE Tier-2
   point (and +1 combat level), so the per-category choice is meaningful. */
/* v2.3.1157: 1 -> 2 points per skill level — each skill earns up to
   200 lifetime (level cap 100), 1200 earnable across all six, against
   the 1000-point COMBAT_BUILD_CEILING below: the last 200 are the
   specialization squeeze (you cannot fully develop everything). */
export const WEAPON_PTS_PER_LEVEL = 2;
/* v2.3.1156: ONE allocation cap for every T2 channel in the game (owner
   design 2026-07-04).  The old 99/50 split was historical accident, and
   several coefficients hid silent traps (crit capped at 60 pts, tempo at
   80, cleave at 75 — points past those bought nothing).  Now every
   channel caps at 100 AND every cap-value lands at exactly 100 points
   (coefficients rescaled below; the sim's UN-04 gate proves it). */
export const T2_CHANNEL_CAP = 100;
export const WEAPON_CHANNEL_CAP = T2_CHANNEL_CAP;
/* v2.3.1157: THE COMBAT CEILING — total allocated T2 points across all
   six grids (30 channels × 100 = 3000 slots) cap at 1000: a finished
   build completes exactly one third of the grid.  Server-enforced
   (_clampBuildTotal, canonical grid order); the client blocks spends at
   the line and shows the build meter from combatBuildTotal below. */
export const COMBAT_BUILD_CEILING = 1000;
export function combatBuildTotal(rpg) {
  if (!rpg) return 0;
  var total = 0;
  var walk = function (spec, defs) {
    if (!spec) return;
    defs.forEach(function (ch) {
      if (typeof spec[ch.key] === 'number') total += Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(spec[ch.key])));
    });
  };
  ['sword', 'bow', 'staff'].forEach(function (cat) {
    walk(rpg.weaponSpecs && rpg.weaponSpecs[cat], WEAPON_CHANNELS[cat] || []);
  });
  walk(rpg.defenseSpec, DEFENSE_CHANNELS);
  walk(rpg.hpSpec, HP_CHANNELS);
  walk(rpg.enduranceSpec, ENDURANCE_CHANNELS);
  return total;
}
/* v2.3.911: maps a dashboard build-skill stat key to its weapon-category
   point pool, so the dashboard can flash a skill that has unspent Tier-2
   points and open the Builds menu to the right tab. */
export const STAT_TO_WEAPON_CAT = { power: 'sword', agility: 'bow', mind: 'staff' };

/* Unspent Tier-2 points available for a dashboard build-skill cell.
   power/agility/mind -> weaponUnspent[cat]; defense -> defenseUnspent;
   v2.3.1154: vitality/endurance -> the HP/Endurance grid pools. */
export function buildSkillUnspent(rpg, statKey) {
  if (!rpg) return 0;
  if (statKey === 'defense') return rpg.defenseUnspent || 0;
  if (statKey === 'vitality') return rpg.hpUnspent || 0;
  if (statKey === 'endurance') return rpg.enduranceUnspent || 0;
  var cat = STAT_TO_WEAPON_CAT[statKey];
  if (!cat) return 0;
  return (rpg.weaponUnspent && rpg.weaponUnspent[cat]) || 0;
}
/* Weapon skill levels are damage-driven: each point of damage dealt by a
   weapon of the category adds this much XP to that category's skill.  1.0
   keeps "xp == damage dealt"; tune here without touching combat code. */
export const WEAPON_XP_PER_DMG = 1.0;
export const WEAPON_LEVEL_CAP = 100; /* v2.3.1156: 99 -> 100 (uniform round caps) */

/* XP to go from `level` to `level+1`.  Gentle geometric curve so the first
   few levels land within a handful of fights and later levels stretch out;
   ~99 levels fills the full 5×99 channel budget, matching the old T2 arc.
   Tunable in isolation. */
export function weaponXpRequired(level) {
  return Math.ceil(280 * Math.pow(1.16, level || 0));
}

/* v2.3.1153: damage channels were repriced flat-inside-tierMult -> a
   ×(1 + pts × 0.005) multiplier (the flat version was ~+725% DPS at
   99 pts mid-band).
   v2.3.1343 (owner directive 2026-07-16, kid-simple reprice): FLAT
   again, but added AFTER tier and variance, BEFORE crit — "+1 damage
   per point" is the sentence a 7-year-old understands, and post-roll
   flat can't compound with tier the way the pre-1153 version did.
   Imbalance is accepted by design (fun-first).  Mirrors server
   data.js DAMAGE_CHANNEL_FLAT — the mirror-audit suite compares them
   and ties the damage-role perPt below to this constant so the panel
   readout can't drift from the formula. */
export var DAMAGE_CHANNEL_FLAT = 1;
/* Legacy export kept at 0 so any stale reader adds nothing instead of
   double-pricing; deleted once nothing imports it. */
export var DAMAGE_CHANNEL_PCT = 0;

/* ═══ v2.3.1345 (owner round 2): ACCELERATING FLAT POINTS ═══
   "Each level should matter — about a 20% advantage over the previous
   level."  True ×1.2 compounding over 1000 levels overflows every
   number in the game, so growth is ACCELERATING-FLAT instead: point N
   in a channel is worth 2·UNIT·N — always bigger than the point before
   it — and a channel's cumulative value is UNIT · p · (p+1).  Early
   and mid points land ~20%+ relative jumps; late points are huge
   absolute chunks (edge point 100 alone is +202 damage).
   One helper both sides (server twin in data.js): strictly increasing
   per point, so the sim's UN-04 trap-free gate still holds. */
export function t2Accel(pts, unit) {
  var p = Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(pts || 0)));
  return Math.round(unit * p * (p + 1));
}
/* What the NEXT point buys (the spend-confirm "After" delta). */
export function t2AccelNext(pts, unit) {
  var p = Math.max(0, Math.min(T2_CHANNEL_CAP - 1, Math.floor(pts || 0)));
  return Math.round(2 * unit * (p + 1));
}
/* Per-channel UNITs — the one tuning table (server data.js mirrors). */
export var T2_UNITS = {
  damage: 1,      /* edge/drawPower/spellPower: +10,100 dmg at 100   */
  /* v2.3.1415 (owner: "increasing base damage is way better than some
     of the other melee options — bring the other values up, don't
     nerf base damage").  critDmg 1.5 -> 4: at the full crit pair
     (100 counter + 100 critDmg = 200 pts, LUCKY every 2nd hit) the
     average is +40,400/2 = +20,200 per hit — 101 dmg per invested
     point, exact parity with the damage channel's 101/pt.  Applies to
     executioner/headshot/focus alike (shared unit).  Supersedes the
     BALANCE-PLAN §4c "imbalance accepted" posture for this channel;
     server data.js mirror updated in lockstep, and the server's
     critFlatCeil anticheat clamp derives from this same constant. */
  critDmg: 4,     /* executioner/headshot/focus: +40,400 on luckies  */
  ironskin: 0.5,  /* flat damage soak: −5,050 per hit at 100         */
  resilience: 1,  /* big-hit soak: −10,100 at 100                    */
  thorns: 1,      /* flat payback on block: 10,100 at 100            */
  secondwind: 2.5,/* flat heal on surviving: 25,250 at 100           */
  vigor: 2,       /* flat max HP: +20,200 at 100                     */
  recovery: 1,    /* flat bonus on every heal: +10,100 at 100        */
  lifeblood: 1.5, /* flat heal on kill: +15,150 at 100               */
  stamina: 1,     /* flat max energy: +10,100 at 100                 */
};
/* ═══ COUNTER SKILLS (owner round 2): crits and dodges are no longer
   dice — they are deterministic accumulators ("every Nth hit is
   LUCKY", "every Nth monster hit misses you").  rate = 0.005/pt; the
   accumulator adds `rate` per hit and fires when it crosses 1, i.e.
   exactly every ceil(1/rate)-ish hits — countable, never streaky, and
   strictly better every point (UN-04).  The SERVER owns the real
   counters (in-memory, rule 11); client math uses the same rate as an
   expected value for prediction/DPS displays. */
export function t2CounterRate(pts) {
  return Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(pts || 0))) * 0.005;
}
export function t2CounterEvery(pts) {
  var r = t2CounterRate(pts);
  return r > 0 ? Math.max(2, Math.ceil(1 / r)) : 0; /* 0 = never */
}

/* ═══ v2.3.1451: BENCH-LOCKED T2 PRICING (owner directive 2026-07-24) ═══
   "Make the strength of that skill relative to current level monsters
   (and lower) with decaying power carried to the next level up...
   each stat point needs to offer an immediate noticeable improvement
   similar to an increase in base damage."

   The 10 FLAT channels (the T2_UNITS set) become BENCH-LOCKED: a
   point, at the moment it is spent, converts to a permanent flat
   amount sized as a percentage of the BENCHMARK MONSTER's stats at
   the buyer's level (a level-(combatLevel/10) sentinel).  The number
   never shrinks (owner: locked-in, no explicit decay) — monsters
   simply outgrow old points.  Flat PER POINT, not accelerating: the
   benchmark itself grows ~5%/monster-level, so later points are
   still bigger without the absurd absolute flats t2Accel produced.
   Mechanical channels and the counters are untouched; t2Accel /
   T2_UNITS stay as the legacy fallback until caps.t2bench flips the
   live paths (deploy-order safety).
   THE SERVER OWNS the accumulated values (ps.t2Flat, priced in
   grids.js from post-clamp spec diffs — the client's copy here is
   prediction only, corrected by every player_state echo).  MIRRORED
   in server/src/data.js; mirror-audit pins the tables and probes the
   functions at several benchmarks.
   NOTE: monsterStat / monsterHpFlat / MONSTER_HP_CURVE are declared
   further down this file (function declarations hoist; the const is
   initialized long before any runtime call). */
export function t2BenchLevel(playerLevel) {
  /* Combat level 1-1000 -> benchmark monster level 1-100.  CEIL: the
     yardstick monster grows a level exactly every 10 points placed. */
  return Math.max(1, Math.min(100, Math.ceil((playerLevel || 1) / 10)));
}
export function t2BenchStats(B) {
  /* Benchmark SENTINEL at level B — real spawn math (dmg curve
     constants match _spawnZoneMonsters / createMonster: base 12,
     ramps 1.045/1.025/1.018), so the benchmark can't drift from what
     actually spawns. */
  return {
    hp: Math.ceil(monsterStat(MONSTER_HP_CURVE.base, B, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame)) + monsterHpFlat(B),
    dmg: Math.ceil(monsterStat(12, B, 1.045, 1.025, 1.018)),
  };
}
/* The one tuning table.  ref 'hp' = fraction of benchmark sentinel HP
   (offense = "bites out of the monster"); ref 'dmg' = fraction of its
   damage (defense/heals/pools = "monster hits soaked/healed/
   survived").  Tuned via tools/balance-sim.mjs --bench. */
export var T2_BENCH = {
  damage:     { ref: 'hp',  pct: 0.04 }, /* 1 pt = a 4% bite of today's monster, every swing */
  critDmg:    { ref: 'hp',  pct: 0.16 }, /* 4x the damage point — v2.3.1415 crit-pair parity kept */
  thorns:     { ref: 'hp',  pct: 0.05 },
  ironskin:   { ref: 'dmg', pct: 0.05 }, /* 20 at-level pts ≈ one sentinel hit fully soaked */
  resilience: { ref: 'dmg', pct: 0.08 },
  secondwind: { ref: 'dmg', pct: 0.15 },
  recovery:   { ref: 'dmg', pct: 0.05 },
  lifeblood:  { ref: 'dmg', pct: 0.10 },
  vigor:      { ref: 'dmg', pct: 0.25 }, /* 4 pts ≈ +1 enemy hit survived */
  stamina:    { ref: 'dmg', pct: 0.10 },
};
/* The 30 channels in THE canonical order (the server's
   _clampBuildTotal walk).  role = T2_BENCH entry for the 10
   bench-priced channels; null = mechanical (occupies a level slot,
   banks no flat).  Drives prediction AND the shared replay below —
   one order everywhere or client/server replays diverge. */
export var T2_BENCH_CANONICAL = [
  { grid: 'sword', key: 'edge',        role: 'damage' },
  { grid: 'sword', key: 'precision',   role: null },
  { grid: 'sword', key: 'executioner', role: 'critDmg' },
  { grid: 'sword', key: 'tempo',       role: null },
  { grid: 'sword', key: 'cleave',      role: null },
  { grid: 'bow',   key: 'drawPower',   role: 'damage' },
  { grid: 'bow',   key: 'marksmanship', role: null },
  { grid: 'bow',   key: 'headshot',    role: 'critDmg' },
  { grid: 'bow',   key: 'piercing',    role: null },
  { grid: 'bow',   key: 'longshot',    role: null },
  { grid: 'staff', key: 'spellPower',  role: 'damage' },
  { grid: 'staff', key: 'overload',    role: null },
  { grid: 'staff', key: 'detonation',  role: null },
  { grid: 'staff', key: 'attunement',  role: null },
  { grid: 'staff', key: 'focus',       role: 'critDmg' },
  { grid: 'defense', key: 'bulwark',    role: null },
  { grid: 'defense', key: 'ironskin',   role: 'ironskin' },
  { grid: 'defense', key: 'thorns',     role: 'thorns' },
  { grid: 'defense', key: 'secondwind', role: 'secondwind' },
  { grid: 'defense', key: 'poise',      role: null },
  { grid: 'hp', key: 'vigor',      role: 'vigor' },
  { grid: 'hp', key: 'recovery',   role: 'recovery' },
  { grid: 'hp', key: 'lifeblood',  role: 'lifeblood' },
  { grid: 'hp', key: 'resilience', role: 'resilience' },
  { grid: 'hp', key: 'laststand',  role: null },
  { grid: 'endurance', key: 'stamina',      role: 'stamina' },
  { grid: 'endurance', key: 'conditioning', role: null },
  { grid: 'endurance', key: 'swiftness',    role: null },
  { grid: 'endurance', key: 'evasion',      role: null },
  { grid: 'endurance', key: 'reflexes',     role: null },
];
export function emptyT2Flat() {
  var out = {};
  T2_BENCH_CANONICAL.forEach(function (ch) {
    if (!ch.role) return;
    if (!out[ch.grid]) out[ch.grid] = {};
    out[ch.grid][ch.key] = 0;
  });
  return out;
}
/* T2_BENCH role for a grid+key pair (null = mechanical channel).  The
   channel tables' own `role` strings (maxhp/dmgreduce/…) predate the
   bench table and stay untouched — this is the pricing-side mapping. */
export function t2BenchRoleOf(grid, key) {
  for (var i = 0; i < T2_BENCH_CANONICAL.length; i++) {
    if (T2_BENCH_CANONICAL[i].grid === grid && T2_BENCH_CANONICAL[i].key === key) return T2_BENCH_CANONICAL[i].role;
  }
  return null;
}
/* What ONE point buys at benchmark B.  CEIL (server twin has the full
   why): a point is always AT LEAST its promised fraction, making the
   4-vigor-points-per-enemy-hit / 20-ironskin-points-per-full-soak
   anchors hold by algebra at every benchmark (sim gates BN-03/04). */
export function t2PointValue(role, B) {
  var r = T2_BENCH[role];
  if (!r) return 0;
  var s = t2BenchStats(B);
  return Math.max(1, Math.ceil(r.pct * (r.ref === 'hp' ? s.hp : s.dmg)));
}
/* Level at spend time = level BEFORE the point lands = 1 + points
   already placed — derived from the build total on both sides. */
export function t2SpendLevel(buildTotalBefore) {
  return Math.min(1000, 1 + Math.max(0, buildTotalBefore || 0));
}
/* Safe accumulator read for all the consumption sites below. */
export function t2FlatOf(rpg, grid, key) {
  return (rpg && rpg.t2Flat && rpg.t2Flat[grid] && typeof rpg.t2Flat[grid][key] === 'number')
    ? rpg.t2Flat[grid][key] : 0;
}
/* Deploy-order gate (the setT2SimpleEnabled pattern): wsClient flips
   this from state_sync.caps.t2bench.  Against an old worker the flag
   is absent, the gate stays off, and every helper below keeps the
   legacy t2Accel math — matching that worker's authoritative rolls
   and echoes.  Defaults ON (offline/tests). */
var _t2BenchEnabled = true;
export function setT2BenchEnabled(on) { _t2BenchEnabled = !!on; }
export function isT2BenchEnabled() { return _t2BenchEnabled; }
/* PRESENCE-gated live check: the accumulator is only used when the
   worker claims the capability AND the echo has actually delivered
   rpg.t2Flat — the frames between join and the first player_state,
   and any fixture without an accumulator, fall back to legacy math
   instead of reading everything as zero. */
export function t2BenchLive(rpg) {
  return _t2BenchEnabled && !!(rpg && rpg.t2Flat && typeof rpg.t2Flat === 'object');
}
/* Banked weapon-channel flat by weapon TYPE (greatsword shares sword). */
var _T2_WPN_FLAT_KEYS = {
  damage:  { sword: 'edge',        bow: 'drawPower', staff: 'spellPower' },
  critDmg: { sword: 'executioner', bow: 'headshot',  staff: 'focus' },
};
export function t2WpnBankedFlat(rpg, weaponType, role) {
  var cat = WEAPON_CATEGORY[weaponType] || 'sword';
  var keys = _T2_WPN_FLAT_KEYS[role];
  return keys ? t2FlatOf(rpg, cat, keys[cat]) : 0;
}
/* Replay-at-benchmark (twin of server t2ReplayFlat — the v9 migration
   / boundary heal / fixture builder).  Purchase history was never
   stored, so each channel's p points are assumed uniformly
   interleaved across the N total purchases: point j prices at global
   position ceil((2j-1)·N/(2p)) (midpoint stratification — exact when
   one channel holds every point; order-independent; idempotent). */
export function t2ReplayFlat(blob) {
  var out = emptyT2Flat();
  if (!blob || typeof blob !== 'object') return out;
  var pts = function (ch) {
    var spec = (ch.grid === 'sword' || ch.grid === 'bow' || ch.grid === 'staff')
      ? (blob.weaponSpecs && blob.weaponSpecs[ch.grid])
      : ch.grid === 'defense' ? blob.defenseSpec
      : ch.grid === 'hp' ? blob.hpSpec
      : blob.enduranceSpec;
    var v = (spec && typeof spec[ch.key] === 'number') ? spec[ch.key] : 0;
    return Math.max(0, Math.min(100, Math.floor(v)));
  };
  var N = 0;
  T2_BENCH_CANONICAL.forEach(function (ch) { N += pts(ch); });
  if (N <= 0) return out;
  T2_BENCH_CANONICAL.forEach(function (ch) {
    if (!ch.role) return;
    var p = pts(ch);
    var v = 0;
    for (var j = 1; j <= p; j++) {
      var pos = Math.ceil(((2 * j - 1) * N) / (2 * p));
      v += t2PointValue(ch.role, t2BenchLevel(t2SpendLevel(pos - 1)));
    }
    out[ch.grid][ch.key] = v;
  });
  return out;
}

/* Per-category channel definitions.  `role` drives the combat wiring
   (damage/crit are LIVE this slice; the rest are `active:false` and shown
   as "Soon" in the UI so points are never wasted on inert channels).
   `perPt` is the live combat coefficient for the active channels.
   `derive(v)` returns a short readout for the allocation panel. */
/* v2.3.1343 (owner directive 2026-07-16): the KID-SIMPLE reprice.
   Every channel is one sentence a 7-year-old understands, every value
   is a chunky whole number, and every cap lands at exactly 100 points
   (or the round 25/50/75/100 pierce breakpoints) — the v2.3.1156
   "no silent traps" rule stands.  Imbalance is accepted by design
   (fun-first, not competitive); BALANCE-PLAN §4c documents the
   posture so nobody "fixes" it back.  Prior pricing history lives in
   git — the derive() strings below are the player-facing contract. */
/* v2.3.1345 (owner round 2): ALL-FLAT + ACCELERATING.  Every readout
   is a flat number (damage, HP, ms, degrees, hit-counts — no percent
   signs), and the free-running channels accelerate (each point worth
   more than the last, t2Accel above).  Mechanically-capped channels
   (tempo/cleave/longshot/piercing) stay linear but read in flat units.
   Crit channels are COUNTERS: "LUCKY hit every N hits". */
/* v2.3.1451 (bench-locked): every flat-role derive accepts an optional
   ctx = { flat, next, bench } — the BANKED total, the next point's
   value, and the benchmark monster level, built by T2Panel from the
   live rpg when caps.t2bench is on.  Without ctx (old worker, stale
   panel) the legacy t2Accel string renders unchanged. */
var _dmgDerive = function (v, ctx) {
  if (ctx) {
    return v > 0
      ? 'hits +' + ctx.flat + ' harder · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)'
      : 'first point: +' + ctx.next + ' damage — a bite of a Lv-' + ctx.bench + ' monster';
  }
  return v > 0
    ? 'hits +' + t2Accel(v, T2_UNITS.damage) + ' harder · next +' + t2AccelNext(v, T2_UNITS.damage)
    : 'first point: +' + t2AccelNext(0, T2_UNITS.damage) + ' damage';
};
var _critDerive = function (v) {
  var n = t2CounterEvery(v);
  return n > 0 ? 'LUCKY hit every ' + n + ' hits' + (v >= 100 ? ' (MAX)' : '') : 'first point starts the counter';
};
var _critDmgDerive = function (v, ctx) {
  if (ctx) {
    return v > 0
      ? 'LUCKY hits hit +' + ctx.flat + ' harder · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)'
      : 'first point: +' + ctx.next + ' on luckies — sized to Lv-' + ctx.bench + ' monsters';
  }
  return v > 0
    ? 'LUCKY hits hit +' + t2Accel(v, T2_UNITS.critDmg) + ' harder · next +' + t2AccelNext(v, T2_UNITS.critDmg)
    : 'first point: +' + t2AccelNext(0, T2_UNITS.critDmg) + ' on luckies';
};
export const WEAPON_CHANNELS = {
  sword: [
    { key: 'edge',        label: 'Sharpened Edge', role: 'damage',  active: true,  perPt: DAMAGE_CHANNEL_FLAT,
      blurb: 'Your sword hits harder — and every point is bigger than the last.',
      derive: _dmgDerive },
    { key: 'precision',   label: 'Precision',      role: 'crit',    active: true,  perPt: 0.5,
      blurb: 'A guaranteed LUCKY hit every few swings — count to it!',
      derive: _critDerive },
    { key: 'executioner', label: 'Executioner',    role: 'critDmg', active: true, perPt: 2,
      blurb: 'Your LUCKY hits hit WAY harder — every point bigger than the last.',
      derive: _critDmgDerive },
    /* Capped mechanic (server cadence floor) — linear, shown in ms. */
    { key: 'tempo',       label: 'Tempo',          role: 'atkspd',  active: true, perPt: 0.5,
      blurb: 'Swing sooner — twice as fast at max!',
      derive: (v) => 'swings ' + Math.min(300, v * 3) + 'ms sooner' + (v >= 100 ? ' (MAX — 2x speed!)' : '') },
    /* v2.3.1345: cap 100° -> 207° — a maxed swing is the FULL CIRCLE. */
    { key: 'cleave',      label: 'Cleave',         role: 'cleave',  active: true, perPt: 2.07,
      blurb: 'Swing wider — a full spin attack at max!',
      derive: (v) => v >= 100 ? 'FULL-CIRCLE SPIN (MAX)' : 'swing +' + Math.round(Math.min(207, v * 2.07)) + '° wider' },
  ],
  bow: [
    { key: 'drawPower',    label: 'Draw Power',    role: 'damage',  active: true,  perPt: DAMAGE_CHANNEL_FLAT,
      blurb: 'Your arrows hit harder — and every point is bigger than the last.',
      derive: _dmgDerive },
    { key: 'marksmanship', label: 'Marksmanship',  role: 'crit',    active: true,  perPt: 0.5,
      blurb: 'A guaranteed LUCKY hit every few shots — count to it!',
      derive: _critDerive },
    { key: 'headshot',     label: 'Headshot',      role: 'critDmg', active: true, perPt: 2,
      blurb: 'Your LUCKY hits hit WAY harder — every point bigger than the last.',
      derive: _critDmgDerive },
    /* v2.3.1345: +1 through every 10 points — 10 bad guys at max. */
    { key: 'piercing',     label: 'Piercing',      role: 'pierce',  active: true, perPt: 0,
      blurb: 'Arrows fly THROUGH bad guys (+1 every 10 pts, 10 at max).',
      derive: (v) => { var n = Math.min(10, Math.floor(v / 10)); return n > 0 ? 'flies through ' + n + ' bad guys' + (n >= 10 ? ' (MAX)' : '') : 'next at 10 pts'; } },
    { key: 'longshot',     label: 'Longshot',      role: 'range',   active: true, perPt: 1,
      blurb: 'Arrows fly farther and faster — twice as far at max.',
      derive: (v) => 'flies +' + Math.min(400, v * 4) + ' farther' + (v >= 100 ? ' (MAX — 2x range!)' : '') },
  ],
  staff: [
    { key: 'spellPower',  label: 'Spell Power',    role: 'damage',  active: true,  perPt: DAMAGE_CHANNEL_FLAT,
      blurb: 'Your spells hit harder — and every point is bigger than the last.',
      derive: _dmgDerive },
    { key: 'overload',    label: 'Overload',       role: 'crit',    active: true,  perPt: 0.5,
      blurb: 'A guaranteed LUCKY hit every few casts — count to it!',
      derive: _critDerive },
    { key: 'detonation',  label: 'Detonation',     role: 'aoe',     active: true, perPt: 1,
      blurb: 'BIGGER BOOM — double the blast at max.',
      derive: (v) => 'boom +' + Math.min(100, v) + ' bigger' + (v >= 100 ? ' (MAX — 2x blast!)' : '') },
    { key: 'attunement',  label: 'Attunement',     role: 'status',  active: true, perPt: 1,
      blurb: 'Fire and ice stick to bad guys longer — twice as long at max.',
      derive: (v) => 'fire & ice last +' + Math.round(Math.min(100, v) * 0.04 * 10) / 10 + 's longer' + (v >= 100 ? ' (MAX)' : '') },
    /* Key stays 'focus' — the server's stats_update clamp and _saveRpg
       already know it, so no wire/storage change. */
    { key: 'focus',       label: 'Arcane Focus',   role: 'critDmg', active: true, perPt: 2,
      blurb: 'Your LUCKY hits hit WAY harder — every point bigger than the last.',
      derive: _critDmgDerive },
  ],
};

/* The category whose build is currently in effect (resolved from the
   equipped weapon).  Falls back to 'sword'. */
export function activeWeaponCategory(rpg) {
  if (!rpg) return 'sword';
  var wpn = getActiveWeapon(rpg);
  return (wpn && WEAPON_CATEGORY[wpn.type]) || 'sword';
}

/* Look up the live spec point total for a channel role in a category. */
function weaponChannelValueByRole(rpg, category, role) {
  var defs = WEAPON_CHANNELS[category];
  if (!defs || !rpg || !rpg.weaponSpecs || !rpg.weaponSpecs[category]) return 0;
  for (var i = 0; i < defs.length; i++) {
    if (defs[i].role === role && defs[i].active) {
      return rpg.weaponSpecs[category][defs[i].key] || 0;
    }
  }
  return 0;
}

/* Damage-channel POINT total for a specific weapon type's CATEGORY
   (used inside calcWeaponDmg so per-weapon readouts are accurate).
   v2.3.1153: returns raw points, not pts×perPt — the reprice made the
   channel multiplicative, so callers apply ×(1 + pts × DAMAGE_CHANNEL_PCT)
   instead of adding a flat term.  Mirrors server _wpnDmgChannel. */
export function weaponDamageBonusFor(rpg, weaponType) {
  var cat = WEAPON_CATEGORY[weaponType] || 'sword';
  var defs = WEAPON_CHANNELS[cat];
  if (!defs || !rpg || !rpg.weaponSpecs || !rpg.weaponSpecs[cat]) return 0;
  for (var i = 0; i < defs.length; i++) {
    if (defs[i].role === 'damage' && defs[i].active) {
      return rpg.weaponSpecs[cat][defs[i].key] || 0;
    }
  }
  return 0;
}

/* Crit-channel point total for a specific weapon type's CATEGORY (parallel to
   weaponDamageBonusFor, so per-slot loadout readouts + the server resolve the
   same crit channel by weapon type rather than only the active weapon). */
export function weaponCritStatFor(rpg, weaponType) {
  var cat = WEAPON_CATEGORY[weaponType] || 'sword';
  return weaponChannelValueByRole(rpg, cat, 'crit');
}

/* v2.3.1133: crit-DAMAGE-channel point total by weapon type (Executioner /
   Headshot / Arcane Focus) — parallel to weaponCritStatFor, fed as the 2nd
   arg into calcCritMult (+0.8% per point). */
export function weaponCritDmgStatFor(rpg, weaponType) {
  var cat = WEAPON_CATEGORY[weaponType] || 'sword';
  return weaponChannelValueByRole(rpg, cat, 'critDmg');
}

/* Flat base-damage bonus from the equipped category's damage channel. */
export function getWeaponDamageBonus(rpg) {
  return weaponDamageBonusFor(rpg, (getActiveWeapon(rpg) || {}).type);
}

/* Crit-channel point total for the equipped category — fed as the T2 amp
   (2nd arg) into calcCritChance/calcCritMult, replacing the old generic
   Ferocity stat. */
export function getWeaponCritStat(rpg) {
  return weaponChannelValueByRole(rpg, activeWeaponCategory(rpg), 'crit');
}

/* v2.3.1133: crit-dmg channel total for the equipped category — 2nd arg
   of calcCritMult, the way getWeaponCritStat feeds calcCritChance. */
export function getWeaponCritDmgStat(rpg) {
  return weaponChannelValueByRole(rpg, activeWeaponCategory(rpg), 'critDmg');
}

/* v2.3.1134: Tempo — swing-cooldown multiplier from the equipped
   category's atkspd channel.  Reads by role so a future bow/staff
   cadence channel plugs in free.  v2.3.1343: cap -20% -> -50% (floor
   0.50, kid-simple reprice) — the worker's monster_damage cadence
   floor was RESIZED in lockstep (600 × 0.50 × lag headroom); see
   swingCooldownMultFor. */
export function swingCooldownMult(rpg) {
  var wpn = rpg && getActiveWeapon(rpg);
  return swingCooldownMultFor(rpg, wpn && wpn.type);
}
/* v2.3.1207: per-type twin (the weaponDamageBonusFor convention) so
   display previews price the PREVIEWED weapon's own Tempo — a stash
   sword reads sword Tempo even while a bow is active.  Same formula +
   -20% cap as the combat gates (playerActions.js tap gate,
   monsterCombat.js auto-attack); swingCooldownMult above delegates
   here, so the cadence and the display can never drift apart.  Only
   the sword category has an atkspd channel today — bow/staff resolve
   to 0 pts (mult 1), identical to before. */
export function swingCooldownMultFor(rpg, weaponType) {
  /* v2.3.1343 (kid-simple reprice): -0.5%/pt, floor 0.50 — swing twice
     as fast at the 100-pt cap.  SERVER LOCKSTEP: the worker's
     monster_damage hit-cadence floor is sized to THIS cap (600 × 0.50
     × lag headroom) — change them together or legit fast swings get
     rejected. */
  var pts = weaponChannelValueByRole(rpg, WEAPON_CATEGORY[weaponType] || 'sword', 'atkspd');
  return Math.max(0.50, 1 - pts * 0.005);
}

/* v2.3.1135: Piercing — extra monsters a bow arrow passes through.
   v2.3.1156: breakpoints 34/67/100 (was /25, trap past 75) so the 3rd
   pierce lands at the 100-pt cap.  Special arrows keep their unlimited
   pierce (pierceLeft stays undefined on them). */
export function bowPierceCount(rpg) {
  /* v2.3.1345: +1 pierce every 10 points — 10 bad guys at the cap. */
  var pts = weaponChannelValueByRole(rpg, 'bow', 'pierce');
  return Math.min(10, Math.floor(pts / 10));
}

/* v2.3.1135: Longshot — arrow speed + max-flight multiplier.  +0.5%/pt,
   cap +50% at the 100-pt channel cap (v2.3.1156).  PvP reach is clamped
   to the server's 250px cap at the player_attack send site (and again
   server-side — belt and braces). */
export function bowRangeMult(rpg) {
  /* v2.3.1343: +1%/pt — arrows fly twice as far/fast at the cap. */
  var pts = weaponChannelValueByRole(rpg, 'bow', 'range');
  return 1 + Math.min(100, pts) * 0.01;
}

/* v2.3.1136: Detonation — staff bolt hit-radius multiplier.  +0.7%/pt,
   cap +70% at the 100-pt channel cap (v2.3.1156).  Applied to the
   per-archetype staff radii in projectiles (the ×3 special-radius
   multiplier stacks on top, as before). */
export function staffAoeMult(rpg) {
  /* v2.3.1343: +1%/pt — double the blast radius at the cap. */
  var pts = weaponChannelValueByRole(rpg, 'staff', 'aoe');
  return 1 + Math.min(100, pts) * 0.01;
}

/* v2.3.1136: Attunement point total — stamped onto S.player._rpgAttune
   (replacing the retired Influence stamp) so applyStatus scales status
   duration at +0.5%/pt.  Global across weapons, like Influence was. */
export function getAttunementPts(rpg) {
  return weaponChannelValueByRole(rpg, 'staff', 'status');
}

/* v2.3.1134: Cleave — extra radians on the melee forward swing arc.
   +0.6°/pt, cap +45° (on GS_FORWARD_ARC's 180°).  Shared by the hit test
   (monsterCombat) AND the aim indicator (effectsRenderer) so the preview
   keeps matching the damage — that pairing is a contract (v2.3.939). */
export function cleaveArcBonus(rpg) {
  /* v2.3.1345: +2.07°/pt, cap +207° — a maxed swing is the FULL
     CIRCLE (153° greatsword base + 207 = 360).  SERVER LOCKSTEP: the
     PvP melee-arc validation accepts 2π. */
  var pts = weaponChannelValueByRole(rpg, 'sword', 'cleave');
  return Math.min(207, pts * 2.07) * Math.PI / 180;
}

/* Award damage-proportional XP to the equipped category and resolve any
   weapon-skill level-ups (each grants WEAPON_PTS_PER_LEVEL into that
   category's pool).  Returns {cat, level, points} when a level-up fired,
   else null, so callers can surface a toast. */
export function awardWeaponXp(rpg, dmg) {
  if (!rpg || !(dmg > 0)) return null;
  var cat = activeWeaponCategory(rpg);
  if (!rpg.weaponSkills) rpg.weaponSkills = {};
  var sk = rpg.weaponSkills[cat] || (rpg.weaponSkills[cat] = { level: 0, xp: 0 });
  if (sk.level >= WEAPON_LEVEL_CAP) return null;
  sk.xp += dmg * WEAPON_XP_PER_DMG;
  var gained = 0;
  while (sk.level < WEAPON_LEVEL_CAP && sk.xp >= weaponXpRequired(sk.level)) {
    sk.xp -= weaponXpRequired(sk.level);
    sk.level++;
    gained++;
    if (!rpg.weaponUnspent) rpg.weaponUnspent = {};
    rpg.weaponUnspent[cat] = (rpg.weaponUnspent[cat] || 0) + WEAPON_PTS_PER_LEVEL;
  }
  if (sk.level >= WEAPON_LEVEL_CAP) sk.xp = 0;
  /* v2.3.1414 (owner): a combat-skill level-up fully restores hp/stamina/
     mana.  Local for instant bars; the server mirrors authoritatively
     when the level lands via stats_update (grids._handleStatsUpdate). */
  if (gained > 0) restoreCombatResources(rpg);
  return gained > 0 ? { cat: cat, level: sk.level, points: gained * WEAPON_PTS_PER_LEVEL } : null;
}

/* v2.3.1414: full combat-resource restore — level-up reward + the shared
   helper for anything else that wants a clean top-off. */
export function restoreCombatResources(rpg) {
  if (!rpg) return;
  if (typeof rpg.maxHp === 'number') rpg.hp = rpg.maxHp;
  if (typeof rpg.maxStamina === 'number') rpg.stamina = rpg.maxStamina;
  if (typeof rpg.maxMana === 'number') rpg.mana = rpg.maxMana;
}

/* Fresh per-category skill/spec/pool scaffolding for a new character. */
export function createDefaultWeaponT2() {
  var skills = {}, specs = {}, unspent = {};
  WEAPON_CATEGORIES.forEach(function (cat) {
    skills[cat] = { level: 0, xp: 0 };
    unspent[cat] = 0;
    var s = {};
    WEAPON_CHANNELS[cat].forEach(function (ch) { s[ch.key] = 0; });
    specs[cat] = s;
  });
  return { weaponSkills: skills, weaponSpecs: specs, weaponUnspent: unspent };
}

/* Backfill the per-category fields on an existing save and WIPE the retired
   generic Tier-2 (per the redesign: defense/sustain/CC move to a future
   gear track, weapons stay pure offense).  Idempotent. */
export function migrateWeaponT2(rpg) {
  if (!rpg) return rpg;
  var def = createDefaultWeaponT2();
  if (!rpg.weaponSkills)  rpg.weaponSkills  = def.weaponSkills;
  if (!rpg.weaponSpecs)   rpg.weaponSpecs   = def.weaponSpecs;
  if (!rpg.weaponUnspent) rpg.weaponUnspent = def.weaponUnspent;
  /* Fill any missing per-category sub-objects / channel keys. */
  WEAPON_CATEGORIES.forEach(function (cat) {
    if (!rpg.weaponSkills[cat])  rpg.weaponSkills[cat]  = { level: 0, xp: 0 };
    if (rpg.weaponUnspent[cat] == null) rpg.weaponUnspent[cat] = 0;
    if (!rpg.weaponSpecs[cat])   rpg.weaponSpecs[cat]   = {};
    WEAPON_CHANNELS[cat].forEach(function (ch) {
      if (rpg.weaponSpecs[cat][ch.key] == null) rpg.weaponSpecs[cat][ch.key] = 0;
    });
  });
  /* Wipe-and-reset the old generic T2 unless it has already been retired. */
  if (!rpg._t2Retired) {
    rpg.ferocity = 0;
    rpg.elementalMastery = 0;
    rpg.fortification = 0;
    rpg.restoration = 0;
    rpg.influence = 0;
    rpg.unspentT2 = 0;
    rpg._t2Retired = true;
  }
  return rpg;
}

/* ═══════════════════════════════════════════════════════════════════════
   DEFENSE — a 4th Tier-2 build category (v2.3.693), parallel to the weapon
   categories but TRAINED BY DEFENSIVE PLAY rather than damage dealt.

   Design mandate (user): formulas an 8th grader can do in their head, and the
   value a point buys is visible in the panel.  So every ACTIVE channel uses a
   ROUND per-point number with a clear cap:
     • Bulwark  — +1% block per point  (base block 25% → 75% cap at 50 pts)
     • Iron Skin — −0.5% damage taken per point  (−25% cap at 50 pts)
   Thorns / Second Wind / Poise ship as "Soon" so points are never wasted.
   Monsters have NO defense stat — player damage stays raw; these channels are
   purely the PLAYER's mitigation. ═══════════════════════════════════════ */
export const DEFENSE_PTS_PER_LEVEL = WEAPON_PTS_PER_LEVEL;
/* v2.3.1156: 50 -> the uniform 100 cap; every per-point coefficient
   below HALVED so cap-values are identical (power-neutral — stored
   points were doubled by the uniform-t2-caps migration). */
export const DEFENSE_CHANNEL_CAP = T2_CHANNEL_CAP;
export const DEFENSE_LEVEL_CAP = WEAPON_LEVEL_CAP;           // 100
/* XP weighting at the damage-taken sites: a blocked/mitigated hit trains at
   full rate; an unblocked hit trains at a quarter (so active blocking is the
   fast path and you can't AFK-tank your way up).  The caller multiplies the
   damage amount by one of these before calling awardDefenseXp. */
export const DEFENSE_XP_BLOCKED = 1.0;
export const DEFENSE_XP_TAKEN = 0.25;

/* v2.3.1345 (owner round 2): all-flat + accelerating (see the
   WEAPON_CHANNELS header).  Iron Skin/Thorns/Second Wind are FLAT
   accelerating numbers now; Bulwark and Poise are capped mechanics
   shown in flat energy/ms.  Bulwark's floor: blocking always drains
   at least 1. */
export const DEFENSE_CHANNELS = [
  { key: 'bulwark',   label: 'Bulwark',     role: 'blockstam', active: true,  perPt: 1,
    blurb: 'Blocking costs less energy — only 1 per block at max.',
    derive: (v) => v >= 100 ? 'blocks cost only 1 energy (MAX)' : 'blocks cost −' + Math.round(Math.min(100, v) * 0.14) + ' energy' },
  { key: 'ironskin',  label: 'Iron Skin',   role: 'dmgreduce', active: true,  perPt: 0.5,
    blurb: 'Every hit on you does flat less — each point bigger than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'every hit does −' + ctx.flat + ' to you · next −' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: −' + ctx.next + ' per hit from Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'every hit does −' + t2Accel(v, T2_UNITS.ironskin) + ' to you · next −' + t2AccelNext(v, T2_UNITS.ironskin) : 'first point: −' + t2AccelNext(0, T2_UNITS.ironskin) + ' per hit') },
  { key: 'thorns',    label: 'Thorns',      role: 'reflect',   active: true, perPt: 1,
    blurb: 'Blocked monsters hurt THEMSELVES — each point bigger than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'blocked monsters take ' + ctx.flat + ' back · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: ' + ctx.next + ' payback — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'blocked monsters take ' + t2Accel(v, T2_UNITS.thorns) + ' back · next +' + t2AccelNext(v, T2_UNITS.thorns) : 'first point: ' + t2AccelNext(0, T2_UNITS.thorns) + ' payback') },
  { key: 'secondwind', label: 'Second Wind', role: 'regen',    active: true, perPt: 1,
    blurb: 'Survive a hit, heal a flat chunk right back (every 10s).',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'survive a hit → heal +' + ctx.flat + ' HP · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: +' + ctx.next + ' HP — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'survive a hit → heal +' + t2Accel(v, T2_UNITS.secondwind) + ' HP · next +' + t2AccelNext(v, T2_UNITS.secondwind) : 'first point: +' + t2AccelNext(0, T2_UNITS.secondwind) + ' HP') },
  { key: 'poise',     label: 'Poise',       role: 'poise',     active: true, perPt: 1,
    blurb: 'Shrug off stuns — never stunned at max.',
    derive: (v) => v >= 100 ? 'NEVER stunned (MAX)' : 'stuns are ' + Math.min(300, v * 3) + 'ms shorter' },
];

/* Spend point total for a defense channel key. */
export function getDefenseSpec(rpg, key) {
  return (rpg && rpg.defenseSpec && rpg.defenseSpec[key]) || 0;
}
/* v2.3.1153: Bulwark no longer adds block % (see the channel entry) —
   this returns 0 so every legacy readout ("Block: X%") reports the real
   base+shield block figure without touching its call sites. */
export function getDefenseBlockBonus() { return 0; }
/* v2.3.1153: Bulwark — multiplier on block stamina costs (−1%/pt, cap
   −50%).  Mirror of server _blockStaminaMult; used by the legacy local
   shield-drain path (BroTown rAF loop) for prediction. */
export function getBlockStaminaMult(rpg) {
  /* v2.3.1343: -1%/pt, cap -100% — free blocking at max.  Safe ONLY
     because both stamina-cost sites keep their Math.max(1, …) floor
     (blocking always drains at least 1 — no permanent-invuln turtle). */
  return 1 - Math.min(1.00, getDefenseSpec(rpg, 'bulwark') * 0.01);
}
/* v2.3.1345: Iron Skin is a FLAT accelerating soak now — every hit
   does this much less (floor 1 at the apply sites).  −5,050 at 100. */
export function getIronSkinFlat(rpg) {
  /* v2.3.1451: bench-locked banked value when the worker + echo
     support it; legacy accelerating flat otherwise. */
  if (t2BenchLive(rpg)) return t2FlatOf(rpg, 'defense', 'ironskin');
  return t2Accel(getDefenseSpec(rpg, 'ironskin'), T2_UNITS.ironskin);
}
/* Legacy fraction shape kept at 0 for stale readers. */
export function getIronSkinReduction() { return 0; }
/* v2.3.1137: Poise — multiplier on player stun/stagger durations.
   Client-owned: _playerStunUntil only gates the local player's input,
   so there is nothing to mirror.
   v2.3.1343: -1%/pt, floor 0 — never stunned at the 100-pt cap. */
export function poiseStunMult(rpg) {
  return 1 - Math.min(1.00, getDefenseSpec(rpg, 'poise') * 0.01);
}
/* v2.3.1345: flat variant — milliseconds shaved off a stun (3ms/pt,
   300 at the cap; base stuns are 250-300ms so max = immune). */
export function poiseStunFlatMs(rpg) {
  return Math.min(300, getDefenseSpec(rpg, 'poise') * 3);
}

/* Award defense-skill XP (already weighted by the caller) and resolve
   level-ups; each level grants DEFENSE_PTS_PER_LEVEL into defenseUnspent.
   Returns {level, points} on a level-up (for a toast), else null. */
export function awardDefenseXp(rpg, weightedAmount) {
  if (!rpg || !(weightedAmount > 0)) return null;
  if (!rpg.defenseSkill) rpg.defenseSkill = { level: 0, xp: 0 };
  var sk = rpg.defenseSkill;
  if (sk.level >= DEFENSE_LEVEL_CAP) return null;
  sk.xp += weightedAmount;
  var gained = 0;
  while (sk.level < DEFENSE_LEVEL_CAP && sk.xp >= weaponXpRequired(sk.level)) {
    sk.xp -= weaponXpRequired(sk.level);
    sk.level++;
    gained++;
    rpg.defenseUnspent = (rpg.defenseUnspent || 0) + DEFENSE_PTS_PER_LEVEL;
  }
  if (sk.level >= DEFENSE_LEVEL_CAP) sk.xp = 0;
  /* v2.3.1414: combat-skill level-up = full resource restore (see
     awardWeaponXp / restoreCombatResources). */
  if (gained > 0) restoreCombatResources(rpg);
  return gained > 0 ? { level: sk.level, points: gained * DEFENSE_PTS_PER_LEVEL } : null;
}

/* Apply Iron Skin to a raw post-block damage number (flat % cut, integers
   in → integers out; identity when the player has 0 Iron Skin points). */
/* v2.3.1314: Resilience mirror for client-local damage paths (legacy
   zones) — the server applies the same cut in _applyDamage.  Only hits
   above 20% of max HP qualify. */
export function applyResilience(rpg, dmg) {
  /* v2.3.1345: FLAT accelerating soak on big hits (>20% max HP) —
     −10,100 at the cap, floor 1. */
  var pts = (rpg && rpg.hpSpec && rpg.hpSpec.resilience) || 0;
  var maxHp = (rpg && rpg.maxHp) || 100;
  if (!(pts > 0) || !(dmg > 0.20 * maxHp)) return dmg;
  /* v2.3.1451: bench-locked banked soak when live; legacy otherwise. */
  var soak = t2BenchLive(rpg) ? t2FlatOf(rpg, 'hp', 'resilience') : t2Accel(pts, T2_UNITS.resilience);
  return Math.max(1, Math.round(dmg - soak));
}

export function applyIronSkin(rpg, dmg) {
  if (!(dmg > 0)) return dmg;
  /* v2.3.1345: flat soak, floor 1. */
  return Math.max(1, Math.round(dmg - getIronSkinFlat(rpg)));
}

/* Train Defense from a damage event.  `prevented` = damage the block stopped
   (trains at full rate), `taken` = damage that still landed (quarter rate).
   Returns the awardDefenseXp result (level-up info) or null.
   v2.3.1342: the GDD §1.4 "valid threat" ±5-level gate is REMOVED —
   under level-is-build (level = T2 points placed, cap 1000) a player's
   level races far past every monster's, so the gate would permanently
   freeze defense training the moment you spent your first few dozen
   points.  Fun-first, owner-approved.  Signature keeps attackerLevel/
   isBoss so the call sites don't churn (and a future re-gate is easy). */
export function trainDefense(rpg, prevented, taken, attackerLevel, isBoss) {
  if (!rpg) return null;
  void attackerLevel; void isBoss;
  var amt = (prevented > 0 ? prevented * DEFENSE_XP_BLOCKED : 0)
          + (taken > 0 ? taken * DEFENSE_XP_TAKEN : 0);
  return awardDefenseXp(rpg, amt);
}

/* Fresh defense scaffolding for a new character. */
export function createDefaultDefenseT2() {
  var spec = {};
  DEFENSE_CHANNELS.forEach(function (ch) { spec[ch.key] = 0; });
  return { defenseSkill: { level: 0, xp: 0 }, defenseSpec: spec, defenseUnspent: 0 };
}

/* Backfill defense fields on an existing save.  Idempotent. */
export function migrateDefenseT2(rpg) {
  if (!rpg) return rpg;
  if (!rpg.defenseSkill)  rpg.defenseSkill  = { level: 0, xp: 0 };
  if (rpg.defenseUnspent == null) rpg.defenseUnspent = 0;
  if (!rpg.defenseSpec)   rpg.defenseSpec   = {};
  DEFENSE_CHANNELS.forEach(function (ch) {
    if (rpg.defenseSpec[ch.key] == null) rpg.defenseSpec[ch.key] = 0;
  });
  /* Hard cap the active channels so a tampered save can't exceed the
     advertised maxima (server re-validates too). */
  rpg.defenseSpec.bulwark = Math.min(DEFENSE_CHANNEL_CAP, rpg.defenseSpec.bulwark || 0);
  rpg.defenseSpec.ironskin = Math.min(DEFENSE_CHANNEL_CAP, rpg.defenseSpec.ironskin || 0);
  return rpg;
}

/* ═══ v2.3.1154: HP + ENDURANCE GRIDS (BALANCE-PLAN spec Phases 2/4) ═══
   The last two build skills get channels.  Points accrue +1 per stat
   level (vitality for HP, endurance for Endurance — WEAPON_PTS_PER_LEVEL
   parity, granted in addBuildProg at the stat-increment crossing) with a
   retroactive backfill for existing saves (migrateGrids + the server's
   backfill-grid-points migration).  Channel cap 50 like the Defense
   grid; the SERVER additionally budget-clamps sum(spec) <= stat.
   Consumption is server-authoritative for everything that touches the
   authoritative pools/damage (vigor, recovery, lifeblood, stamina,
   conditioning, evasion); swiftness is client-owned movement (safe under
   the worker's 500 px/s anti-teleport bound — +10% lifts max legit speed
   ~276 -> ~304 px/s).  resilience/reflexes ship "Soon": resilience has
   nothing to consume (monsters don't crit), reflexes waits for
   server-owned dodge-roll timing. */
/* v2.3.1156: 50 -> the uniform 100 cap; coefficients halved so
   cap-values are identical (points doubled by migration). */
export const GRID_CHANNEL_CAP = T2_CHANNEL_CAP;
/* v2.3.1345 (owner round 2): all-flat + accelerating (see the
   WEAPON_CHANNELS header).  Vigor/Recovery/Lifeblood/Resilience are
   FLAT accelerating numbers (armor HP still doesn't scale with Vigor);
   Last Stand keeps its flat-seconds cooldown. */
export const HP_CHANNELS = [
  { key: 'vigor',      label: 'Vigor',      role: 'maxhp',    active: true,  perPt: 2,
    blurb: 'More health — each point gives more HP than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? '+' + ctx.flat + ' HP · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: +' + ctx.next + ' HP — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? '+' + t2Accel(v, T2_UNITS.vigor) + ' HP · next +' + t2AccelNext(v, T2_UNITS.vigor) : 'first point: +' + t2AccelNext(0, T2_UNITS.vigor) + ' HP') },
  { key: 'recovery',   label: 'Recovery',   role: 'healboost', active: true, perPt: 1,
    blurb: 'Every heal gives a flat bonus on top — each point bigger than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'every heal gives +' + ctx.flat + ' extra HP · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: +' + ctx.next + ' per heal — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'every heal gives +' + t2Accel(v, T2_UNITS.recovery) + ' extra HP · next +' + t2AccelNext(v, T2_UNITS.recovery) : 'first point: +' + t2AccelNext(0, T2_UNITS.recovery) + ' per heal') },
  { key: 'lifeblood',  label: 'Lifeblood',  role: 'killheal', active: true,  perPt: 1.5,
    blurb: 'Beat a monster, heal a flat chunk — each point bigger than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'beat a monster → heal +' + ctx.flat + ' HP · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: +' + ctx.next + ' HP — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'beat a monster → heal +' + t2Accel(v, T2_UNITS.lifeblood) + ' HP · next +' + t2AccelNext(v, T2_UNITS.lifeblood) : 'first point: +' + t2AccelNext(0, T2_UNITS.lifeblood) + ' HP') },
  { key: 'resilience', label: 'Resilience', role: 'resilience', active: true, perPt: 1,
    blurb: 'REALLY big hits do flat less — each point bigger than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? 'big hits do −' + ctx.flat + ' to you · next −' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: −' + ctx.next + ' off big hits from Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? 'big hits do −' + t2Accel(v, T2_UNITS.resilience) + ' to you · next −' + t2AccelNext(v, T2_UNITS.resilience) : 'first point: −' + t2AccelNext(0, T2_UNITS.resilience) + ' off big hits') },
  /* v2.3.1313: owner-named 5th Vitality category; server-authoritative
     (_applyDamage); T2Panel gates spending on caps.laststand. */
  { key: 'laststand', label: 'Last Stand', role: 'laststand', active: true, perPt: 1,
    blurb: 'A deadly hit leaves you at 1 HP instead — once per cooldown.',
    derive: (v) => 'survive at 1 HP · ready every ' + Math.max(20, Math.round(120 - Math.min(100, v))) + 's' + (v >= 100 ? ' (MAX)' : '') },
];
/* v2.3.1345 (owner round 2): all-flat + accelerating.  Deep Lungs is
   FLAT accelerating energy; Conditioning refills a flat amount more
   per tick; Swiftness reads in flat speed (capped mechanic — the
   anti-teleport audit in movement.js still clears 500 px/s: flat +2.0
   speed at max is LOWER than the old ×1.5 cap); Evasion is a COUNTER
   ("a monster hit misses you every N"); Reflexes stays flat ms. */
export const ENDURANCE_CHANNELS = [
  { key: 'stamina',      label: 'Deep Lungs',   role: 'maxstam',   active: true,  perPt: 1,
    blurb: 'More energy — each point gives more than the last.',
    derive: (v, ctx) => ctx
      ? (v > 0 ? '+' + ctx.flat + ' energy · next +' + ctx.next + ' (Lv-' + ctx.bench + ' monsters)' : 'first point: +' + ctx.next + ' energy — sized to Lv-' + ctx.bench + ' monsters')
      : (v > 0 ? '+' + t2Accel(v, T2_UNITS.stamina) + ' energy · next +' + t2AccelNext(v, T2_UNITS.stamina) : 'first point: +' + t2AccelNext(0, T2_UNITS.stamina) + ' energy') },
  { key: 'conditioning', label: 'Conditioning', role: 'stamregen', active: true,  perPt: 0.5,
    blurb: 'Energy refills faster — a flat chunk more every beat.',
    derive: (v) => 'energy refills +' + Math.floor(Math.min(100, v) / 2) + ' extra per beat' + (v >= 100 ? ' (MAX)' : '') },
  { key: 'swiftness',    label: 'Swiftness',    role: 'movespd',   active: true,  perPt: 0.02,
    blurb: 'Run faster everywhere — speed 5.0 to 7.0 at max.',
    derive: (v) => 'run +' + (Math.min(100, v) * 0.02).toFixed(1) + ' faster' + (v >= 100 ? ' (MAX — speed 7.0!)' : '') },
  { key: 'evasion',      label: 'Evasion',      role: 'dodge',     active: true,  perPt: 0.5,
    blurb: 'Monster hits MISS you on a counter — every 2nd at max!',
    derive: (v) => { var n = t2CounterEvery(v); return n > 0 ? 'a hit MISSES you every ' + n + ' hits' + (v >= 100 ? ' (MAX)' : '') : 'first point starts the counter'; } },
  { key: 'reflexes',     label: 'Reflexes',     role: 'reflexes',  active: true, perPt: 2,
    blurb: 'Your dodge-roll shield lasts longer.',
    derive: (v) => 'roll shield +' + Math.min(200, v * 2) + 'ms longer' + (v >= 100 ? ' (MAX)' : '') },
];

/* Fresh grid scaffolding for a new character. */
export function createDefaultGrids() {
  var hp = {}, en = {};
  HP_CHANNELS.forEach(function (ch) { hp[ch.key] = 0; });
  ENDURANCE_CHANNELS.forEach(function (ch) { en[ch.key] = 0; });
  return { hpSpec: hp, hpUnspent: 0, enduranceSpec: en, enduranceUnspent: 0 };
}

/* Backfill grid fields on an existing save.  Idempotent — only fills
   ABSENT pools; the retroactive grant is 1 point per stat level minus
   points already spent (mirror of the server's backfill-grid-points
   migration). */
export function migrateGrids(rpg) {
  if (!rpg) return rpg;
  if (!rpg.hpSpec) rpg.hpSpec = {};
  if (!rpg.enduranceSpec) rpg.enduranceSpec = {};
  var sum = function (spec, defs) {
    return defs.reduce(function (a, ch) {
      var v = spec[ch.key];
      return a + (typeof v === 'number' ? Math.max(0, Math.min(GRID_CHANNEL_CAP, Math.floor(v))) : 0);
    }, 0);
  };
  HP_CHANNELS.forEach(function (ch) {
    rpg.hpSpec[ch.key] = Math.max(0, Math.min(GRID_CHANNEL_CAP, Math.floor(rpg.hpSpec[ch.key] || 0)));
  });
  ENDURANCE_CHANNELS.forEach(function (ch) {
    rpg.enduranceSpec[ch.key] = Math.max(0, Math.min(GRID_CHANNEL_CAP, Math.floor(rpg.enduranceSpec[ch.key] || 0)));
  });
  if (rpg.hpUnspent == null) rpg.hpUnspent = Math.max(0, Math.floor(rpg.vitality || 0) - sum(rpg.hpSpec, HP_CHANNELS));
  if (rpg.enduranceUnspent == null) rpg.enduranceUnspent = Math.max(0, Math.floor(rpg.endurance || 0) - sum(rpg.enduranceSpec, ENDURANCE_CHANNELS));
  return rpg;
}

/* v2.3.1156: one-time LOCAL-save migration for the uniform-cap reprice
   (twin of the server's uniform-t2-caps registry migration — the client
   blob lives in localStorage and never passes through the server
   registry).  Gated on the _t2uniform flag so it runs exactly once:
   - doubles the formerly-50-cap grids (defense/HP/endurance) — power-
     neutral, since every coefficient halved;
   - refunds the materially-repriced weapon channels (crit trio, tempo,
     cleave, piercing) into weaponUnspent, matching the server refund
     so the echo and the local blob agree. */
export function migrateUniformT2(rpg) {
  if (!rpg || rpg._t2uniform) return rpg;
  var dbl = function (spec, defs) {
    if (!spec) return;
    defs.forEach(function (ch) {
      if (typeof spec[ch.key] === 'number' && spec[ch.key] > 0) {
        spec[ch.key] = Math.min(T2_CHANNEL_CAP, Math.floor(spec[ch.key]) * 2);
      }
    });
  };
  dbl(rpg.defenseSpec, DEFENSE_CHANNELS);
  dbl(rpg.hpSpec, HP_CHANNELS);
  dbl(rpg.enduranceSpec, ENDURANCE_CHANNELS);
  var REFUND = { sword: ['precision', 'tempo', 'cleave'], bow: ['marksmanship', 'piercing'], staff: ['overload'] };
  Object.keys(REFUND).forEach(function (cat) {
    var spec = rpg.weaponSpecs && rpg.weaponSpecs[cat];
    if (!spec) return;
    REFUND[cat].forEach(function (k) {
      var pts = (typeof spec[k] === 'number') ? Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(spec[k]))) : 0;
      if (pts > 0) {
        if (!rpg.weaponUnspent) rpg.weaponUnspent = {};
        rpg.weaponUnspent[cat] = Math.min(999, (rpg.weaponUnspent[cat] || 0) + pts);
      }
      if (spec[k]) spec[k] = 0;
    });
  });
  /* v2.3.1157: pools recompute to the canonical earned − spent at the
     doubled earn rate (2/level, 200 lifetime per skill) — the twin of
     the server's uniform-t2-pools migration.  Every pre-fix character
     only GAINS here (old rate was 1/level). */
  var spent = function (spec, defs) {
    return defs.reduce(function (a, ch) {
      var v = spec && spec[ch.key];
      return a + (typeof v === 'number' ? Math.max(0, Math.min(T2_CHANNEL_CAP, Math.floor(v))) : 0);
    }, 0);
  };
  var pool = function (level, used) {
    return Math.max(0, Math.min(200, 2 * Math.max(0, Math.floor(level || 0))) - used);
  };
  if (!rpg.weaponUnspent) rpg.weaponUnspent = {};
  ['sword', 'bow', 'staff'].forEach(function (cat) {
    var lvl = rpg.weaponSkills && rpg.weaponSkills[cat] && rpg.weaponSkills[cat].level;
    rpg.weaponUnspent[cat] = pool(lvl, spent(rpg.weaponSpecs && rpg.weaponSpecs[cat], WEAPON_CHANNELS[cat] || []));
  });
  rpg.defenseUnspent = pool(rpg.defenseSkill && rpg.defenseSkill.level, spent(rpg.defenseSpec, DEFENSE_CHANNELS));
  rpg.hpUnspent = pool(rpg.vitality, spent(rpg.hpSpec, HP_CHANNELS));
  rpg.enduranceUnspent = pool(rpg.endurance, spent(rpg.enduranceSpec, ENDURANCE_CHANNELS));
  rpg._t2uniform = true;
  return rpg;
}

/* Deploy-order gate (the v2.3.1119 caps pattern): recalcDerived applies
   the grid pool multipliers only while the connected worker advertises
   caps.hpEndGrids — an old worker's player_state echo would stomp a
   locally-boosted maxHp/maxStamina every flush otherwise.  Defaults ON
   so offline tools (balance sim, tests) and the pre-join window compute
   full values; wsClient flips it from state_sync. */
var _gridCapsEnabled = true;
export function setGridCapsEnabled(on) { _gridCapsEnabled = !!on; }
export function isGridCapsEnabled() { return _gridCapsEnabled; }

/* v2.3.1342: same deploy-order gate for the level-is-build derivation
   (level = T2 points placed, cap 1000).  Against an old worker the
   client keeps the legacy stat-sum formula, because the worker's
   player_state echo carries ITS derivation verbatim (wsClient accepts
   server level as authoritative) and the two formulas fighting would
   make the level flicker every flush.  Defaults ON (offline/tests);
   wsClient flips it from state_sync.caps.t2simple. */
var _t2SimpleEnabled = true;
export function setT2SimpleEnabled(on) { _t2SimpleEnabled = !!on; }
export function isT2SimpleEnabled() { return _t2SimpleEnabled; }

/* Grid channel FLATS — mirror the server helpers in grids.js.
   v2.3.1345 (owner round 2): accelerating flat everywhere the number
   can run free; legacy multiplier shapes kept as identity for any
   stale reader. */
export function getVigorFlat(rpg) {
  /* v2.3.1451: bench-locked banked HP when live; legacy accelerating
     flat against an old worker (whose echo would stomp anything else). */
  if (t2BenchLive(rpg)) return t2FlatOf(rpg, 'hp', 'vigor');
  return t2Accel((rpg && rpg.hpSpec && rpg.hpSpec.vigor) || 0, T2_UNITS.vigor);
}
export function getVigorMult() { return 1; }
/* Recovery: FLAT bonus added to every discrete heal. */
export function getRecoveryFlat(rpg) {
  if (t2BenchLive(rpg)) return t2FlatOf(rpg, 'hp', 'recovery'); /* v2.3.1451 */
  return t2Accel((rpg && rpg.hpSpec && rpg.hpSpec.recovery) || 0, T2_UNITS.recovery);
}
export function getRecoveryMult() { return 1; }
/* Deep Lungs: FLAT max-energy add. */
export function getStaminaFlat(rpg) {
  if (t2BenchLive(rpg)) return t2FlatOf(rpg, 'endurance', 'stamina'); /* v2.3.1451 */
  return t2Accel((rpg && rpg.enduranceSpec && rpg.enduranceSpec.stamina) || 0, T2_UNITS.stamina);
}
export function getStaminaGridMult() { return 1; }
/* Conditioning: FLAT extra regen per beat (+50/beat at cap). */
export function getConditioningFlat(rpg) {
  return Math.floor(Math.min(100, ((rpg && rpg.enduranceSpec && rpg.enduranceSpec.conditioning) || 0)) / 2);
}
export function getConditioningMult() { return 1; }
export function getSwiftnessMult() { return 1; }
/* Swiftness: FLAT speed units (+0.02/pt, +2.0 at cap: 5.0 -> 7.0).
   Anti-teleport audit: LOWER than the retired ×1.5 cap, so the 500
   px/s bound clears with more margin than v2.3.1343. */
export function getSwiftnessFlat(rpg) {
  return Math.min(2.0, ((rpg && rpg.enduranceSpec && rpg.enduranceSpec.swiftness) || 0) * 0.02);
}
export function getEvasionPts(rpg) {
  return (rpg && rpg.enduranceSpec && rpg.enduranceSpec.evasion) || 0;
}

/* §4.6 Rarity Tiers */
export const RARITY_TIERS = {
  common: {
    mult: 1.00,
    /* v2.3.1233: was #8B9695 — the old navy palette's neutral, which
       reads as RARE-blue on Lantern Slate surfaces (QA caught "Common"
       rendered blue in the Enchanter). Lantern common grey instead. */
    color: '#8B9695',
    label: 'Common',
    elements: 0
  },
  elemental: {
    mult: 1.50,
    color: '#3b82f6',
    label: 'Elemental',
    elements: 1
  },
  fusion: {
    mult: 2.25,
    color: '#a855f7',
    label: 'Fusion',
    elements: 2
  },
  shift: {
    mult: 3.00,
    color: '#f5c542',
    label: 'Shift',
    elements: 'adaptive'
  }
};

/* §10.1 Nine Elements */

/* §9.2 Status Definitions */
export const STATUS_DEFS = {
  burn: {
    dur: 4.0,
    refresh: 1.0,
    maxDur: 6.0,
    tick: 0.5,
    type: 'dot'
  },
  freeze: {
    dur: 3.0,
    refresh: 0.5,
    maxDur: 5.0,
    tick: null,
    type: 'cc'
  },
  soak: {
    dur: 5.0,
    refresh: 1.0,
    maxDur: 7.0,
    tick: null,
    type: 'debuff'
  },
  root: {
    dur: 5.0,
    refresh: 0.5,
    maxDur: 7.0,
    tick: 1.0,
    type: 'cc_dot'
  },
  shock: {
    dur: 4.0,
    refresh: 0,
    maxDur: 4.0,
    tick: null,
    type: 'amplifier'
  },
  fracture: {
    dur: 6.0,
    refresh: 0,
    maxDur: 6.0,
    tick: null,
    type: 'stacking',
    maxStacks: 5
  },
  slow: {
    dur: 5.0,
    refresh: 1.0,
    maxDur: 7.0,
    tick: null,
    type: 'soft_cc'
  },
  curse: {
    dur: 6.0,
    refresh: 1.0,
    maxDur: 8.0,
    tick: null,
    type: 'force_mult'
  },
  reveal: {
    dur: 5.0,
    refresh: 1.0,
    maxDur: 7.0,
    tick: null,
    type: 'debuff_heal'
  }
};

/* §10.2 Effectiveness Circle */
export const EFFECTIVENESS = [['flame', 'frost'], ['frost', 'storm'], ['storm', 'stone'], ['stone', 'wind'], ['wind', 'venom'], ['venom', 'water'], ['water', 'flame']];
export function getEffectiveness(attackElem, targetElem) {
  if (!attackElem || !targetElem || attackElem === targetElem) return 1.0;
  /* Dark <-> Light mutual bonus */
  if (attackElem === 'dark' && targetElem === 'light' || attackElem === 'light' && targetElem === 'dark') return 1.25;
  for (var _i27 = 0, _EFFECTIVENESS = EFFECTIVENESS; _i27 < _EFFECTIVENESS.length; _i27++) {
    var _EFFECTIVENESS$_i = _slicedToArray(_EFFECTIVENESS[_i27], 2),
      strong = _EFFECTIVENESS$_i[0],
      weak = _EFFECTIVENESS$_i[1];
    if (attackElem === strong && targetElem === weak) return 1.25;
    if (attackElem === weak && targetElem === strong) return 0.75;
  }
  return 1.0;
}

/* ═══ STATUS EFFECT SYSTEM — §9 ═══ */

/* Apply a status to a target. Returns true if applied. */
export function applyStatus(target, statusId, source, now) {
  if (!target.statuses) target.statuses = {};
  var def = STATUS_DEFS[statusId];
  if (!def) return false;
  var existing = target.statuses[statusId];
  if (existing) {
    /* Refresh — extend or reset duration */
    if (def.refresh > 0) {
      existing.remaining = Math.min(existing.remaining + def.refresh, def.maxDur);
    } else {
      existing.remaining = def.dur; /* reset */
    }
    /* Stack if applicable (Fracture) */
    if (def.maxStacks && existing.stacks < def.maxStacks) {
      existing.stacks++;
    }
    existing.lastRefresh = now;
    return true;
  }

  /* New application */
  /* v2.3.1136: Attunement channel scales status duration — the
     successor to the retired §2.6 Influence bonus.
     v2.3.1343: +1%/pt, cap ×2.0 — fire & ice last twice as long at
     the 100-pt cap.  Mirrors server _attuneMult / elemental durMult. */
  var attuneBonus = source !== null && source !== void 0 && source._rpgAttune ? Math.min(2.0, 1 + source._rpgAttune * 0.01) : 1.0;
  target.statuses[statusId] = {
    id: statusId,
    remaining: def.dur * attuneBonus,
    maxDur: (def.maxDur || def.dur) * attuneBonus,
    stacks: 1,
    source: source,
    appliedAt: now,
    lastRefresh: now,
    lastTick: now,
    element: Object.keys(ELEMENTS).find(function (e) {
      return ELEMENTS[e].status === statusId;
    }) || null
  };
  return true;
}

/* Tick all statuses on a target. Applies DoT damage. Returns array of expired status IDs.
   v2.3.1114: opts.applyHp=false keeps duration bookkeeping + FX timing but
   skips the local curHp mutation and DoT popup -- used for SERVER-driven
   monsters now that the worker ticks authoritative DoT and its monster_hit
   events carry the damage (the local mutation was a misprediction the next
   tick overwrote, and would now double the popups). */
export function tickStatuses(target, dt, now, rpg, opts) {
  if (!target.statuses) return [];
  var applyHp = !opts || opts.applyHp !== false;
  var expired = [];
  var emMult = rpg ? 1 + (rpg.elementalMastery || 0) * 0.0015 : 1;
  for (var _i28 = 0, _Object$entries = Object.entries(target.statuses); _i28 < _Object$entries.length; _i28++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i28], 2),
      id = _Object$entries$_i[0],
      status = _Object$entries$_i[1];
    status.remaining -= dt;

    /* DoT ticking */
    var def = STATUS_DEFS[id];
    if (def.tick && now - status.lastTick >= def.tick * 1000) {
      status.lastTick = now;
      var dotDmg = 0;
      if (id === 'burn') dotDmg = (5 + ((rpg === null || rpg === void 0 ? void 0 : rpg.power) || 0) * 0.3) * emMult;
      if (id === 'root') dotDmg = (3 + ((rpg === null || rpg === void 0 ? void 0 : rpg.power) || 0) * 0.15) * emMult;
      if (dotDmg > 0 && applyHp) {
        target.curHp = (target.curHp || target.hp) - Math.round(dotDmg);
        target._lastDotDmg = {
          amount: Math.round(dotDmg),
          statusId: id,
          ts: now
        };
      }
    }
    if (status.remaining <= 0) {
      expired.push(id);
      delete target.statuses[id];
    }
  }
  return expired;
}

/* Get the element of the oldest status on a target (for collision detection) */
export function getOldestStatusElement(target) {
  if (!target.statuses) return null;
  var oldest = null,
    oldestTime = Infinity;
  for (var _i29 = 0, _Object$entries2 = Object.entries(target.statuses); _i29 < _Object$entries2.length; _i29++) {
    var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i29], 2),
      id = _Object$entries2$_i[0],
      status = _Object$entries2$_i[1];
    if (status.appliedAt < oldestTime) {
      oldestTime = status.appliedAt;
      oldest = status;
    }
  }
  return oldest ? oldest.element : null;
}

/* ═══ COLLISION RESOLVER — §10.3 ═══ */

/* Collision lookup — maps "setupElement|triggerElement" to collision data */
export const COLLISION_TABLE = {
  'flame|frost': {
    id: 'steam',
    name: 'Steam',
    base: 40,
    coeff: 0.8,
    stat: 'power',
    type: 'burst'
  },
  'flame|water': {
    id: 'quench',
    name: 'Quench',
    base: 45,
    coeff: 0.9,
    stat: 'power',
    type: 'burst'
  },
  'flame|venom': {
    id: 'toxic_fumes',
    name: 'Toxic Fumes',
    base: 30,
    coeff: 0.6,
    stat: 'power',
    type: 'dot'
  },
  'flame|storm': {
    id: 'overcharge',
    name: 'Overcharge',
    base: 70,
    coeff: 1.2,
    stat: 'agility',
    type: 'burst'
  },
  'flame|stone': {
    id: 'magma',
    name: 'Magma',
    base: 50,
    coeff: 1.0,
    stat: 'power',
    type: 'burst'
  },
  'flame|wind': {
    id: 'firestorm',
    name: 'Firestorm',
    base: 35,
    coeff: 0.7,
    stat: 'power',
    type: 'spread'
  },
  'frost|water': {
    id: 'flash_freeze',
    name: 'Flash Freeze',
    base: 25,
    coeff: 0.5,
    stat: 'vitality',
    type: 'cc'
  },
  'frost|venom': {
    id: 'shatter',
    name: 'Shatter',
    base: 70,
    coeff: 1.2,
    stat: 'agility',
    type: 'burst'
  },
  'frost|storm': {
    id: 'hailstorm',
    name: 'Hailstorm',
    base: 50,
    coeff: 0.8,
    stat: 'agility',
    type: 'aoe'
  },
  'frost|stone': {
    id: 'permafrost',
    name: 'Permafrost',
    base: 20,
    coeff: 0.4,
    stat: 'vitality',
    type: 'cc'
  },
  'frost|wind': {
    id: 'blizzard',
    name: 'Blizzard',
    base: 45,
    coeff: 0.7,
    stat: 'agility',
    type: 'aoe'
  },
  'water|venom': {
    id: 'dilute',
    name: 'Dilute',
    base: 30,
    coeff: 0.6,
    stat: 'vitality',
    type: 'heal'
  },
  'water|storm': {
    id: 'conduit',
    name: 'Conduit',
    base: 55,
    coeff: 1.0,
    stat: 'agility',
    type: 'chain'
  },
  'water|stone': {
    id: 'mudslide',
    name: 'Mudslide',
    base: 40,
    coeff: 0.7,
    stat: 'vitality',
    type: 'aoe'
  },
  'water|wind': {
    id: 'monsoon',
    name: 'Monsoon',
    base: 25,
    coeff: 0.5,
    stat: 'agility',
    type: 'spread'
  },
  'venom|storm': {
    id: 'blight',
    name: 'Blight',
    base: 60,
    coeff: 1.0,
    stat: 'mind',
    type: 'burst'
  },
  'venom|stone': {
    id: 'petrify',
    name: 'Petrify',
    base: 35,
    coeff: 0.6,
    stat: 'vitality',
    type: 'cc'
  },
  'venom|wind': {
    id: 'miasma',
    name: 'Miasma',
    base: 30,
    coeff: 0.5,
    stat: 'mind',
    type: 'dot'
  },
  'storm|stone': {
    id: 'seismic_pulse',
    name: 'Seismic Pulse',
    base: 55,
    coeff: 0.9,
    stat: 'power',
    type: 'aoe'
  },
  'storm|wind': {
    id: 'tempest',
    name: 'Tempest',
    base: 50,
    coeff: 0.8,
    stat: 'agility',
    type: 'chain'
  },
  'stone|wind': {
    id: 'erosion',
    name: 'Erosion',
    base: 20,
    coeff: 0.4,
    stat: 'vitality',
    type: 'debuff'
  },
  /* Dark pairs */
  'dark|flame': {
    id: 'hellfire',
    name: 'Hellfire',
    base: 65,
    coeff: 1.1,
    stat: 'power',
    type: 'burst'
  },
  'dark|frost': {
    id: 'dread',
    name: 'Dread',
    base: 40,
    coeff: 0.7,
    stat: 'vitality',
    type: 'cc'
  },
  'dark|water': {
    id: 'drown',
    name: 'Drown',
    base: 45,
    coeff: 0.8,
    stat: 'vitality',
    type: 'dot'
  },
  'dark|venom': {
    id: 'wither',
    name: 'Wither',
    base: 50,
    coeff: 0.9,
    stat: 'mind',
    type: 'dot'
  },
  'dark|storm': {
    id: 'hex',
    name: 'Hex',
    base: 60,
    coeff: 1.0,
    stat: 'mind',
    type: 'burst'
  },
  'dark|stone': {
    id: 'shackle',
    name: 'Shackle',
    base: 55,
    coeff: 0.9,
    stat: 'power',
    type: 'cc'
  },
  'dark|wind': {
    id: 'haunt',
    name: 'Haunt',
    base: 35,
    coeff: 0.6,
    stat: 'agility',
    type: 'debuff'
  },
  /* Light pairs */
  'light|flame': {
    id: 'radiant_fire',
    name: 'Radiant Fire',
    base: 50,
    coeff: 0.8,
    stat: 'mind',
    type: 'burst_heal'
  },
  'light|frost': {
    id: 'purify',
    name: 'Purify',
    base: 40,
    coeff: 0.7,
    stat: 'vitality',
    type: 'cleanse'
  },
  'light|water': {
    id: 'baptism',
    name: 'Baptism',
    base: 60,
    coeff: 1.0,
    stat: 'vitality',
    type: 'aoe_heal'
  },
  'light|venom': {
    id: 'cleansing_bloom',
    name: 'Cleansing Bloom',
    base: 45,
    coeff: 0.7,
    stat: 'vitality',
    type: 'cleanse'
  },
  'light|storm': {
    id: 'divine_strike',
    name: 'Divine Strike',
    base: 90,
    coeff: 1.4,
    stat: 'mind',
    type: 'burst'
  },
  'light|stone': {
    id: 'consecrate',
    name: 'Consecrate',
    base: 35,
    coeff: 0.6,
    stat: 'vitality',
    type: 'zone_heal'
  },
  'light|wind': {
    id: 'salvation',
    name: 'Salvation',
    base: 55,
    coeff: 0.9,
    stat: 'mind',
    type: 'aoe_heal'
  },
  /* Dark + Light capstone */
  'dark|light': {
    id: 'eclipse',
    name: 'Eclipse',
    base: 120,
    coeff: 1.8,
    stat: 'vitality',
    type: 'capstone'
  }
};

/* Make collision lookup bidirectional (setup+trigger order doesn't matter for lookup, but
   we always consume the SETUP status, which is the one already on the target) */
export function lookupCollision(setupElement, triggerElement) {
  return COLLISION_TABLE[setupElement + '|' + triggerElement] || COLLISION_TABLE[triggerElement + '|' + setupElement] || null;
}

/* §10.3 Resolve a collision. Returns collision damage dealt, or 0 if no collision. */
export function resolveCollision(target, triggerElement, source, rpg, now) {
  if (!target.statuses) return null;

  /* Find the oldest status with a different element than the trigger */
  var setupStatus = null,
    setupElement = null;
  var oldestTime = Infinity;
  for (var _i30 = 0, _Object$entries3 = Object.entries(target.statuses); _i30 < _Object$entries3.length; _i30++) {
    var _Object$entries3$_i = _slicedToArray(_Object$entries3[_i30], 2),
      id = _Object$entries3$_i[0],
      status = _Object$entries3$_i[1];
    if (status.element && status.element !== triggerElement && status.appliedAt < oldestTime) {
      oldestTime = status.appliedAt;
      setupStatus = status;
      setupElement = status.element;
    }
  }
  if (!setupElement) return null;
  var collision = lookupCollision(setupElement, triggerElement);
  if (!collision) return null;

  /* Calculate collision damage — §10.6 */
  var statValue = rpg[collision.stat] || 0;
  var dmg = collision.base + statValue * collision.coeff;

  /* §5.7 Resonance — bonus damage if the consumed status was inside its
     final RESONANCE_WINDOW_RATIO of duration. Linear from
     RESONANCE_BONUS_BASE at window entry to RESONANCE_BONUS_PEAK at expiry. */
  var resonanceDepth = 0;
  var resonanceMult = 1;
  if (setupStatus && setupStatus.maxDur > 0) {
    var windowSize = setupStatus.maxDur * RESONANCE_WINDOW_RATIO;
    if (setupStatus.remaining <= windowSize) {
      var elapsedInWindow = windowSize - setupStatus.remaining;
      resonanceDepth = Math.max(0, Math.min(1, elapsedInWindow / windowSize));
      var bonus = RESONANCE_BONUS_BASE + resonanceDepth * (RESONANCE_BONUS_PEAK - RESONANCE_BONUS_BASE);
      resonanceMult = 1 + bonus;
      dmg *= resonanceMult;
    }
  }
  var resonating = resonanceMult > 1;

  /* Elemental Mastery multiplier — §2.2 */
  dmg *= 1 + (rpg.elementalMastery || 0) * 0.0015;

  /* Volatile bonus — §4.7 */
  var activeWpn = getActiveWeapon(rpg);
  if (activeWpn.isVolatile) dmg *= 1.30;

  /* Effectiveness — §10.2 */
  if (target.element) dmg *= getEffectiveness(triggerElement, target.element);

  /* Capture the consumed status's remaining duration before deletion — the
     §5.9.4 combo spread mechanic propagates the consumed status with a
     fraction of its remaining duration. */
  var consumedRemaining = setupStatus.remaining || 0;

  /* Consume setup status */
  delete target.statuses[setupStatus.id];

  /* §5.7.7 Resonance streak — increment on resonance-timed collisions
     within RESONANCE_STREAK_WINDOW_MS, otherwise reset. Mana restore
     scales with the streak count up to RESONANCE_STREAK_CAP. */
  if (!source._resonanceStreak) source._resonanceStreak = { count: 0, lastTs: 0 };
  var rs = source._resonanceStreak;
  var streakMult = 1;
  if (resonating) {
    if (now - rs.lastTs <= RESONANCE_STREAK_WINDOW_MS) {
      rs.count = Math.min(rs.count + 1, 5);
    } else {
      rs.count = 1;
    }
    rs.lastTs = now;
    streakMult = 1 + Math.min(rs.count * RESONANCE_STREAK_MANA_BONUS, RESONANCE_STREAK_CAP);
  } else {
    rs.count = 0;
  }

  /* §3.5 Mana restore.  v2.3.1155: restoration mult deleted with the
     stat (×1.0 for every live player; server mirror deleted in lockstep). */
  var manaRestored = 0;
  if (rpg && now - (source._lastCollisionMana || 0) >= 3000) {
    source._lastCollisionMana = now;
    var baseRestore = 0.04 * rpg.maxMana;
    manaRestored = Math.round(baseRestore * streakMult);
    rpg.mana = Math.min(rpg.maxMana, (rpg.mana || 0) + manaRestored);
  }
  return {
    collision: collision,
    damage: Math.round(dmg),
    setupElement: setupElement,
    triggerElement: triggerElement,
    manaRestored: manaRestored,
    consumed: setupStatus.id,
    consumedRemaining: consumedRemaining,
    resonating: resonating,
    resonanceDepth: resonanceDepth,
    resonanceMult: resonanceMult,
    streakCount: rs.count,
    streakMult: streakMult
  };
}

/* Discovered collisions tracker */
export const discoveredCollisions = new Set();
try {
  var saved = JSON.parse(localStorage.getItem('bt_codex'));
  if (saved) saved.forEach(function (c) {
    return discoveredCollisions.add(c);
  });
} catch (_unused) {}
export function discoverCollision(collisionId) {
  if (discoveredCollisions.has(collisionId)) return false;
  discoveredCollisions.add(collisionId);
  try {
    localStorage.setItem('bt_codex', JSON.stringify(_toConsumableArray(discoveredCollisions)));
  } catch (_unused2) {}
  return true; /* first discovery */
}

/* ═══ ENCYCLOPEDIA — discovered monsters, materials, zones ═══ */
export const discoveredMonsters = new Set();
try {
  var _saved = JSON.parse(localStorage.getItem('bt_bestiary'));
  if (_saved) _saved.forEach(function (c) {
    return discoveredMonsters.add(c);
  });
} catch (_unused3) {}
export function discoverMonster(archetype, zoneId) {
  var key = archetype + ':' + zoneId;
  if (discoveredMonsters.has(key)) return false;
  discoveredMonsters.add(key);
  try {
    localStorage.setItem('bt_bestiary', JSON.stringify(_toConsumableArray(discoveredMonsters)));
  } catch (_unused4) {}
  return true;
}
export const discoveredMaterials = new Set();
try {
  var _saved2 = JSON.parse(localStorage.getItem('bt_materials'));
  if (_saved2) _saved2.forEach(function (c) {
    return discoveredMaterials.add(c);
  });
} catch (_unused5) {}
export function discoverMaterial(skill, name) {
  var key = skill + ':' + name;
  if (discoveredMaterials.has(key)) return false;
  discoveredMaterials.add(key);
  try {
    localStorage.setItem('bt_materials', JSON.stringify(_toConsumableArray(discoveredMaterials)));
  } catch (_unused6) {}
  return true;
}
export const visitedZones = new Set();
try {
  var _saved3 = JSON.parse(localStorage.getItem('bt_zones'));
  if (_saved3) _saved3.forEach(function (c) {
    return visitedZones.add(c);
  });
} catch (_unused7) {}
export function discoverZone(zoneId) {
  if (visitedZones.has(zoneId)) return;
  visitedZones.add(zoneId);
  try {
    localStorage.setItem('bt_zones', JSON.stringify(_toConsumableArray(visitedZones)));
  } catch (_unused8) {}
}

/* §6.1 Monster Scaling — tri-phase */
/* v2.3.1140: BF-1 fix — monster HP compounded 1.065^level while player
   damage grows linearly, so HP outran damage across L25-L80 (L35 and L65
   INV-03 kill-time gates failed at 5 hits vs 2-3/3-4 targets).  Ramp
   flattened 1.065 -> 1.052, sim-verified: all four §6.5 audit points pass
   (tools/balance-sim.mjs --strict).  The curve now lives in this ONE
   exported object -- consumed by createMonster below, MIRRORED in
   server/src/data.js MONSTER_HP_CURVE (keep in sync), and IMPORTED by
   tools/balance-sim.mjs (which previously hardcoded a copy that could
   drift).  Damage/XP/gold curves are untouched (BF-1 is HP-only). */
export const MONSTER_HP_CURVE = { base: 12.5, ramp: 1.052, plateau: 1.035, endgame: 1.025, flat: 100, flatLow: 50, flatLowMaxLvl: 2 }; /* v2.3.1346: owner — every monster +100 HP flat.  v2.3.1364: owner — Lv1-2 monsters carry 50 LESS of it (flatLow) so starter fights don't feel spongy */

/* v2.3.1364: level-aware flat HP term.  Use this instead of reading
   MONSTER_HP_CURVE.flat directly at spawn sites — Lv1-2 gets flatLow.
   MIRRORED in server/src/data.js monsterHpFlat (keep in sync). */
export function monsterHpFlat(level) {
  return level <= (MONSTER_HP_CURVE.flatLowMaxLvl || 0)
    ? (MONSTER_HP_CURVE.flatLow || 0)
    : (MONSTER_HP_CURVE.flat || 0);
}

export function monsterStat(base, level, rRamp, rPlateau, rEndgame) {
  if (level <= 30) return Math.ceil(base * Math.pow(rRamp, level - 1));
  var at30 = Math.ceil(base * Math.pow(rRamp, 29));
  if (level <= 65) return Math.ceil(at30 * Math.pow(rPlateau, level - 30));
  var at65 = Math.ceil(at30 * Math.pow(rPlateau, 35));
  return Math.ceil(at65 * Math.pow(rEndgame, level - 65));
}

/* §6.3 Enemy Archetypes */
export const ARCHETYPES = {
  fodder: {
    hpMult: 0.6,
    dmgMult: 0.8,
    spdMult: 1.0,
    emoji: '🟢',
    color: '#3dd497'
  },
  /* Fire goblin — Ember Fields variant.  HP/dmg mirror fodder so the
     server's authoritative scalars (which only know the base fodder
     archetype) stay in sync with the local view.  Toughness is
     delivered by a 1/4 incoming-damage scalar applied in the player
     hit paths instead of inflated HP -- this way solo and multiplayer
     both converge on 3-4 hits to kill.

     spdMult: 3.0 -- goblin chases ~3x faster than slime fodder
     (per user feedback v2.3.3).  Only affects single-player /
     client-spawned monsters; server-managed monsters move at the
     server's authoritative speed. */
  fireGoblin: {
    hpMult: 0.6,
    dmgMult: 0.8,
    spdMult: 3.0,
    emoji: '🔥',
    color: '#ea580c'
  },
  brute: {
    hpMult: 1.5,
    dmgMult: 1.3,
    spdMult: 0.7,
    emoji: '🪨',
    color: '#6b6b6b'
  },
  swarm: {
    hpMult: 0.4,
    dmgMult: 0.6,
    spdMult: 1.2,
    emoji: '🦇',
    color: '#9333ea'
  },
  sentinel: {
    hpMult: 1.0,
    dmgMult: 1.0,
    spdMult: 1.0,
    emoji: '🛡️',
    color: '#e8e8e8'
  },
  volatile: {
    hpMult: 0.8,
    dmgMult: 1.0,
    spdMult: 1.0,
    emoji: '💥',
    color: '#ea580c'
  },
  stalker: {
    hpMult: 0.7,
    dmgMult: 1.2,
    spdMult: 1.3,
    emoji: '👁️',
    color: '#2C3E50'
  },
  hexer: {
    hpMult: 0.9,
    dmgMult: 0.8,
    spdMult: 1.0,
    emoji: '💀',
    color: '#8E44AD'
  },
  snowman: {
    hpMult: 1.3,
    dmgMult: 1.1,
    spdMult: 0.8,
    emoji: '⛄',
    color: '#b0d8f0'
  }
};

/* Spawn a monster instance from archetype + zone level */
export function createMonster(id, archetype, level, x, y, element) {
  var a = ARCHETYPES[archetype];
  // baseline-10 rescale: 60 ÷ 4.8; curve constants centralized v2.3.1140 (BF-1)
  var baseHp = monsterStat(MONSTER_HP_CURVE.base, level, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame);
  var baseDmg = monsterStat(12, level, 1.045, 1.025, 1.018);
  var baseXp = monsterStat(10, level, 1.045, 1.025, 1.018);
  var baseGold = monsterStat(5, level, 1.035, 1.020, 1.015);
  return {
    id: id,
    archetype: archetype,
    level: level,
    element: element || null,
    hp: Math.ceil(baseHp * a.hpMult) + monsterHpFlat(level), /* v2.3.1364: Lv1-2 -> flatLow */
    maxHp: Math.ceil(baseHp * a.hpMult) + monsterHpFlat(level),
    dmg: Math.ceil(baseDmg * a.dmgMult),
    xp: Math.ceil(baseXp),
    gold: Math.ceil(baseGold),
    spd: 0.5 * a.spdMult,
    emoji: a.emoji,
    color: a.color,
    x: x,
    y: y,
    spawnX: x,
    spawnY: y,
    alive: true,
    moveTimer: Math.random() * 3000,
    targetX: x,
    targetY: y,
    statuses: {},
    /* {statusId: {remaining, stacks, source}} */
    _hitThisSwing: false,
    _atkCd: 0,
    _stunUntil: 0,
    respawnAt: 0
  };
}

/* §3 Resource Formulas */
/* v2.3.910: combat level now climbs ~5x faster (it's the sum of the build-skill
   levels), so the flat per-combat-level HP drops 12 -> 2.5 to keep total HP in
   today's ballpark (12 ÷ 5 = 2.4).  Vitality (the "HP" build skill) still adds
   10/pt, and since each Vitality point also adds +1 combat level the per-HP-skill
   total stays ~+12.5, matching the old +10 direct + ⅕-of-a-level. */
export const HP_PER_COMBAT_LEVEL = 2.5;
export function calcMaxHp(level, vitality) {
  return Math.floor(100 + (level - 1) * HP_PER_COMBAT_LEVEL + vitality * 10);
}
export function calcMaxStam(endurance) {
  return 100 + endurance * 3.0;
}
export function calcMaxMana(mind) {
  return 100 + mind * 3.5;
}

/* v2.3.227 (Phase 1 stat redesign): armor now contributes flat HP.
   Damage-reduction `def` retires.  Each tier's tierMult scales the
   20 HP base, and Vitality acts as a 1%/point multiplier on top. */
export const ARMOR_HP_BASE = 20;
export function getArmorHp(armor, vitality) {
  if (!armor) return 0;
  var tm = (typeof armor.tierMult === 'number') ? armor.tierMult : 1.0;
  return Math.floor(ARMOR_HP_BASE * tm * (1 + (vitality || 0) * 0.01));
}

/* §4.4 Weapon Damage.  Second arg accepts either:
   - a number (the legacy stat value -- treated as raw input), OR
   - an rpg object (preferred) -- function picks the correct stat
     for weaponType via EQUIP_STAT_MAP (POW melee, AGI bow, MIND staff).
   v2.3.110: object form added because every legacy caller was passing
   rpg.power regardless of weapon type, which left bow + staff scaling
   off POW even after v2.3.109 mapped them to AGI/MIND in
   EQUIP_STAT_MAP.  Special attacks reading the wrong stat is what
   caused staff specials to land below the WeaponSwapBar's displayed
   range. */
export function calcWeaponDmg(weaponType, statValOrRpg, tierMult, wpn) {
  var w = WEAPON_TYPES[weaponType];
  var statVal;
  var dmgChannel = 0;
  if (statValOrRpg && typeof statValOrRpg === 'object') {
    var statKey = EQUIP_STAT_MAP[weaponType] || 'power';
    statVal = statValOrRpg[statKey] || 0;
    /* T2: the matching CATEGORY's damage-channel points (resolved by
       the passed weaponType so per-weapon readouts stay accurate). */
    dmgChannel = weaponDamageBonusFor(statValOrRpg, weaponType);
  } else {
    statVal = statValOrRpg || 0;
  }
  /* v2.3.1153: damage channel repriced flat-in-tierMult -> multiplier.
     v2.3.1343 (kid-simple reprice): FLAT +1/pt again, but added AFTER
     tier AND variance, before crit — "+N damage on every swing", the
     same number the panel promises, on every roll.  Mirrors server
     _computeAttackDamage / DAMAGE_CHANNEL_FLAT. */
  var base = (weaponEffBase(w.base, wpn) + statVal * 0.1667) * tierMult; // baseline-10: 0.8 ÷ 4.8
  /* v2.3.1451: bench-locked banked flat when live (rpg object passed
     + worker capability); legacy accelerating flat otherwise. */
  var flat = (statValOrRpg && typeof statValOrRpg === 'object' && t2BenchLive(statValOrRpg))
    ? t2WpnBankedFlat(statValOrRpg, weaponType, 'damage')
    : t2Accel(dmgChannel, T2_UNITS.damage);
  /* Per-type variance: staff widest, melee mid, bow tightest. */
  if (weaponType === 'staff')  return base * (0.5  + Math.random() * 1.0) + flat;
  if (weaponType === 'bow')    return base * (0.6  + Math.random() * 0.2) + flat;
  return base * (0.75 + Math.random() * 0.5) + flat;
}

/* v2.3.1131: §4.6b quality grades + §4.6c hardness — the two loot
   layers on EFFECTIVE WEAPON BASE (BALANCE-PLAN §4.4 order: pre-stat,
   pre-tierMult).  Mirrors server QUALITY_GRADES (data.js) and
   HARDEN.BASE_BONUS (hardening.js).  Both fields are SERVER-rolled
   (forge quality, harden_weapon ladder) and ride the weapon blob;
   absent fields = legacy weapon = identity, so every call site that
   doesn't pass the weapon computes exactly what it did before.
   NOTE: `hardness` (numeric 0-5) is NOT the legacy `hardenBonus`
   reforge affix — distinct systems, distinct fields. */
export var QUALITY_MULTS = { normal: 1.00, rare: 1.20, elite: 1.50, godly: 3.00 };
export function weaponEffBase(rawBase, wpn) {
  if (!wpn) return rawBase;
  var h = typeof wpn.hardness === 'number' ? Math.max(0, Math.min(5, wpn.hardness)) : 0;
  var q = QUALITY_MULTS[wpn.quality] || 1;
  return (rawBase + h * 1.0417) * q;
}

/* §2.1 Crit
   v2.3.233 (Phase 3): Power owns the baseline crit identity; Ferocity
   stacks additively on top as a T2 amplifier.  Old signatures took
   (ferocity) only -- new signatures accept (power, ferocity) but tolerate
   a single-arg legacy call by treating it as Ferocity alone, which is the
   safer fallback (slightly lower crit than before, never higher). */
export function calcCritChance(power, ferocity) {
  /* Single-arg legacy support: caller passed Ferocity only. */
  if (arguments.length < 2) { ferocity = power || 0; power = 0; }
  var pow = power || 0;
  var fer = ferocity || 0;
  /* Power baseline: 40 * P / (P + 200).  0->0%, P100->13.3%, P500->28.6%. */
  var pCrit = 40 * pow / (pow + 200) / 100;
  /* v2.3.1345 (counter skills): the channel is a deterministic
     counter server-side ("LUCKY hit every N hits", accumulator in
     _computeAttackDamage); this expected-rate term keeps every
     client display/prediction at the same average.  t2CounterRate =
     0.005/pt (every 2nd hit at the 100-pt cap). */
  var fCrit = t2CounterRate(fer);
  return Math.max(0, Math.min(1, pCrit + fCrit));
}
export function calcCritMult(power, critDmgPts) {
  if (arguments.length < 2) { critDmgPts = 0; }
  void critDmgPts;
  /* Power: 1.5x at 0, +0.001 per pt (2.0x at 500).
     v2.3.1345 (accelerating flat): the crit-DMG channel is a FLAT
     accelerating bonus now (weaponCritFlatFor below, added ON TOP of
     this multiplier at the damage sites) — the 2nd arg is accepted
     for old call sites but ignored.  Mirrors the server. */
  return 1.5 + (power || 0) * 0.001;
}

/* v2.3.1345: the crit-DMG channel's FLAT accelerating bonus — added
   to a lucky hit AFTER the power multiplier.  +40,400 at the cap
   (v2.3.1415 critDmg unit buff). */
export function weaponCritFlatFor(rpg, weaponType) {
  /* v2.3.1451: banked bench-locked flat when live; legacy otherwise. */
  if (t2BenchLive(rpg)) return t2WpnBankedFlat(rpg, weaponType, 'critDmg');
  return t2Accel(weaponCritDmgStatFor(rpg, weaponType), T2_UNITS.critDmg);
}
export function getWeaponCritFlat(rpg) {
  return weaponCritFlatFor(rpg, (getActiveWeapon(rpg) || {}).type);
}

/* v2.3.1206: ONE display DMG/DPS formula for every readout.
   Three hand-rolled copies of this math existed (BottomDashboard
   loadout, ItemDetailPopup weaponDmgRange, InventoryPanel stash
   compare) and only the dashboard's folded in the stat driver, the
   damage channel AND the crit channels — so spending crit-channel
   points visibly moved one readout and not the others (the reported
   bug).  These two helpers are that dashboard math, extracted verbatim:

     base   = (weaponEffBase + stat×0.1667) × (1 + dmgPts×0.005) × tierMult
     range  = per-type variance band (bow 0.6-0.8, staff 0.5-1.5,
              melee 0.75-1.25 — mirrors calcWeaponDmg)
     period = SWING_COOLDOWN × Tempo mult (+300ms staff cast penalty,
              added AFTER the mult — matches monsterCombat's
              `effectiveSwingCd + _staffCdExtra`)
     DPS    = avg(range)/period × (1 + critChance×(critMult−1))

   Everything keys off wpn.type (stat via EQUIP_STAT_MAP, channels via
   the type's WEAPON_CATEGORY), so a stash bow previews with AGI + bow
   channels even while a sword is equipped.

   v2.3.1207: Tempo (atkspd channel) IS folded into the period now —
   swingCooldownMultFor, the exact mult (incl. the -20% cap) that both
   client swing gates apply (playerActions.js:18 tap, monsterCombat.js
   auto-attack).  It genuinely scales sustained cadence, so leaving it
   out made Tempo points invisible in every DPS readout.

   DELIBERATE exclusions — this is the SUSTAINED BASELINE, matching the
   loadout readout's long-standing semantics; transient/contextual
   layers are left out on purpose:
     - timed buffs (cooked-food/potion style) — too volatile to be a
       loadout number;
     - amulet elemDmg (FLAME-gem % on elemental weapons) and the hexer
       curse (-30% for 4s) — situational combat modifiers;
     - the amulet atkSpd mult (rpg._amuletBonus) — it only rides the
       auto-attack loop (monsterCombat.js:1159); the manual tap gate
       never applied it (playerActions.js v2.3.1134 note), so it is
       not a uniform cadence layer.  Fold it here only if/when both
       swing gates apply it.
   The authoritative per-hit roll is server/src/combat.js
   _computeAttackDamage; this is only its expected-value mirror for UI.

   Returns null / 0 for a missing or unknown weapon. */
export function calcDisplayDmgRange(rpg, wpn) {
  var w = wpn && WEAPON_TYPES[wpn.type];
  if (!w) return null;
  var statKey = EQUIP_STAT_MAP[wpn.type] || 'power';
  var statVal = (rpg && rpg[statKey]) || 0;
  /* Raw damage-channel POINTS for the weapon's category (edge /
     drawPower / spellPower) — v2.3.1343: flat +DAMAGE_CHANNEL_FLAT/pt
     added after tier and variance (mirrors calcWeaponDmg). */
  var dmgPts = weaponDamageBonusFor(rpg, wpn.type);
  /* v2.3.1451: banked bench-locked flat when live; legacy otherwise. */
  var flat = t2BenchLive(rpg)
    ? t2WpnBankedFlat(rpg, wpn.type, 'damage')
    : t2Accel(dmgPts, T2_UNITS.damage);
  var base = (weaponEffBase(w.base, wpn) + statVal * 0.1667) * (wpn.tierMult || 1);
  /* v2.3.1207: Tempo folds into the period (see header); the staff's
     +300ms cast penalty is added AFTER the mult, unscaled, matching
     the auto-attack gate. */
  var dmgMin, dmgMax, cdMs = SWING_COOLDOWN * swingCooldownMultFor(rpg, wpn.type);
  if (wpn.type === 'bow')        { dmgMin = base * 0.6 + flat;  dmgMax = base * 0.8 + flat;  }
  else if (wpn.type === 'staff') { dmgMin = base * 0.5 + flat;  dmgMax = base * 1.5 + flat;  cdMs += 300; }
  else                           { dmgMin = base * 0.75 + flat; dmgMax = base * 1.25 + flat; }
  dmgMin = Math.round(dmgMin); dmgMax = Math.round(dmgMax);
  return {
    min: dmgMin,
    max: dmgMax,
    text: (dmgMin === dmgMax) ? String(dmgMin) : (dmgMin + '-' + dmgMax),
    cdMs: cdMs,
  };
}
export function calcDisplayDps(rpg, wpn) {
  var r = calcDisplayDmgRange(rpg, wpn);
  if (!r) return 0;
  /* Crit fold: chance × extra multiplier, both resolved for THIS
     weapon's category channels (Precision/Executioner etc.) on top of
     the Power baseline — same call pair as the loadout readout. */
  var critChance = calcCritChance((rpg && rpg.power) || 0, weaponCritStatFor(rpg, wpn.type));
  var critMult = calcCritMult((rpg && rpg.power) || 0);
  /* v2.3.1345: crit-dmg channel is a FLAT bonus on lucky hits — fold
     its expected value on top of the power multiplier. */
  var critFlat = weaponCritFlatFor(rpg, wpn.type);
  return ((r.min + r.max) / 2 * (1 + critChance * (critMult - 1)) + critChance * critFlat) / (r.cdMs / 1000);
}

/* v2.3.1207: ONE display heal formula for every fish readout — the
   expected-value mirror of server/src/cooking.js _handleEatRequest:
     heal = ceil(fishHealAmount × HP-grid Recovery mult)
   Raw getFishHealAmount displays under-promised by up to 50% for
   Recovery builds (the server folds _recoveryMult, v2.3.1154; no
   display did).  Works for raw fish_* keys too (pre-cook preview —
   both key shapes resolve the same tier).  The player_state echo
   after eat_request is the truth; this is prediction/labeling only. */
export function calcDisplayHeal(rpg, invKey) {
  /* v2.3.1345: Recovery is a flat bonus on every heal. */
  return Math.ceil(getFishHealAmount(invKey)) + getRecoveryFlat(rpg);
}

/* v2.3.1207: display twin of the server maxHp pool line
   (grids.js _recalcMaxes): Vigor multiplies the WHOLE pool INCLUDING
   armor HP, so an armor card's "+X Max HP" must carry the vigor mult
   or it under-reports for Vigor builds by up to 25%.  (A ±1 drift vs
   the exact pool delta is possible from the server's single outer
   floor; this is a preview — the recalc/echo product is the truth.) */
export function calcDisplayArmorHp(rpg, armor) {
  /* v2.3.1343: Vigor is flat now, so armor HP no longer scales with
     it — the raw armor contribution IS the pool delta. */
  return Math.floor(getArmorHp(armor, (rpg && rpg.vitality) || 0));
}

/* §2.3 Block.  v2.3.1153: the Bulwark term is gone — Bulwark now buys
   block STAMINA efficiency (getBlockStaminaMult), not block %, because
   blocks have been full negation since v2.3.232 and a block-% channel
   had nothing to modify.  base 25% + the shield's own block bonus, cap
   75%.  First arg retained (ignored) so legacy call sites don't break;
   getDefenseBlockBonus now returns 0 for the same reason. */
export function calcBlockReduction(_legacyBulwark, shield) {
  var base = 0.25;
  /* Shield gear bonus */
  if (shield) {
    var ss = getShieldStats(shield);
    base += ss.blockBonus / 100;
  }
  return Math.min(0.75, base);
}

/* §2.5 Movement.
   v2.3.1154: optional swiftnessPts arg (Endurance grid, +0.2%/pt cap
   +10%) — a separate multiplicative layer, NOT inside agility's 60%
   cap, because move speed is client-owned and the combined ceiling
   still clears the worker's 500 px/s anti-teleport bound (~304 px/s
   max legit).  Legacy single-arg calls are unchanged. */
export function calcMoveSpeed(agility, swiftnessPts) {
  /* v2.3.1345: swiftness is FLAT +0.02/pt speed units (cap +2.0) —
     see getSwiftnessFlat's anti-teleport note. */
  return 5.0 * (1 + Math.min(agility * 0.0012, 0.60)) + Math.min(2.0, (swiftnessPts || 0) * 0.02);
}

/* v2.3.234 (Phase 4): all special attacks scale with Mind regardless of
   the equipped weapon type.  Keeps the weapon's base + tier as the
   anchor; Mind drives the linear scale.  Variance per weapon stays the
   same so staff specials still feel high-variance vs bow tight + sword
   medium. */
export function calcSpecialDmg(weaponType, rpg, tierMult, wpn) {
  var w = WEAPON_TYPES[weaponType];
  if (!w) return 0;
  var mind = (rpg && rpg.mind) || 0;
  var base = (weaponEffBase(w.base, wpn) + mind * 0.1667) * (tierMult || 1); // baseline-10: 0.8 ÷ 4.8
  if (weaponType === 'staff') return base * (0.5 + Math.random() * 1.0);
  if (weaponType === 'bow')   return base * (0.6 + Math.random() * 0.2);
  return base * (0.75 + Math.random() * 0.5);
}

/* v2.3.234 (Phase 4): passive dodge chance.  Returns true if the
   incoming hit should be evaded entirely (0 dmg).  Cap at 30% so even
   pure-Agility builds still take some hits. */
/* v2.3.1154: the dodge fraction is factored out (the balance sim gates
   on it) and gains the Endurance-grid Evasion term (+0.2%/pt) INSIDE
   the shared 30% cap — the BALANCE-PLAN §4 hard rule for stacking
   sources.  Mirrors the server's _applyDamage dodge line. */
export function passiveDodgeChance(agility, evasionPts) {
  /* v2.3.1345 (counter skills): Evasion is a deterministic COUNTER
     server-side ("a hit misses you every N", accumulator in
     _applyDamage) stacked on the agility dice (agility alone still
     caps at 50%).  This expected-value form drives every display and
     client prediction; ceiling 95% so nothing shows 'immune'. */
  return Math.min(0.95, Math.min((agility || 0) * 0.0008, 0.50) + t2CounterRate(evasionPts));
}
export function rollPassiveDodge(agility, evasionPts) {
  return Math.random() < passiveDodgeChance(agility, evasionPts);
}

/* §6.2 XP Required — tri-phase */
export function xpRequired(level) {
  if (level <= 30) return Math.ceil(500 * Math.pow(1.10, level - 1));
  var at30 = Math.ceil(500 * Math.pow(1.10, 29));
  if (level <= 65) return Math.ceil(at30 * Math.pow(1.07, level - 30));
  var at65 = Math.ceil(at30 * Math.pow(1.07, 35));
  if (level <= 100) return Math.ceil(at65 * Math.pow(1.04, level - 65));
  /* Post-100: aggressive 8% per level — prestige territory */
  var at100 = Math.ceil(at65 * Math.pow(1.04, 35));
  return Math.ceil(at100 * Math.pow(1.08, level - 100));
}

/* §15.2 Special attack multiplier (no element = raw damage boost).
   Bumped 1.8 → 2.0 so a special does exactly 2× a normal hit.
   v2.3.1397 (owner): per-weapon — melee (sword/greatsword) and bow
   specials hit 3×; each staff special orb hits 2× (was 2×·0.6 = 1.2×
   per orb).  specialAtkMultFor is the one source of truth; the flat
   constant remains only for legacy imports.  SERVER MIRROR:
   server/src/combat.js _computeAttackDamage + _maxDmgForAttacker —
   change BOTH or the anticheat cap rejects legit specials. */
export const SPECIAL_ATK_MULT = 2.0;
export function specialAtkMultFor(weaponType) {
  return weaponType === 'staff' ? 2.0 : 3.0;
}

/* Create a default player RPG state with the new stat system */
export function createDefaultRpg() {
  return {
    level: 1,
    /* v2.3.910: highest combat level a level-up banner has fired for.  Combat
       level is derived (sum of build-skill levels); the on-kill VFX loops
       advance this and celebrate each newly-reached level. */
    _lastShownLevel: 1,
    xp: 0,
    coins: 50,
    /* Tier 1 — use-trained stats (GDD §1.1).  Start at 0; lifetime
       budget is 5/level × 99 earned levels = 495 T1 points (GDD §1.4). */
    power: 0,
    vitality: 0,
    endurance: 0,
    agility: 0,
    mind: 0,
    /* Per-stat XP accumulator.  Resolved +1 stat per
       xpRequired(level)/5 threshold crossing inside addBuildProg(). */
    _buildProg: { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 },
    /* Per-stat use-frequency tally for the current encounter (since the
       last kill).  distributeKillXpToBuild() reads this on kill, splits
       killXp proportionally, then resets. */
    _buildUse:  { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 },
    /* GDD §1.5 stat locks.  Locked T1 stats freeze in place; their
       share of per-level T1 budget is burned, not redistributed. */
    _statLocks: { power: false, vitality: false, endurance: false, agility: false, mind: false },
    /* Build points earned since last combat level-up.  Combat level
       only rises when >= 5 (A1 gate).  Each +1 to any T1 stat in
       addBuildProg increments this; level-up loop subtracts 5 so any
       excess carries over to the next level. Existing saves with this
       undefined default to 0 via `|| 0` in the gate; their first new
       build point materialises the field. */
    _buildPointsThisLvl: 0,
    /* Tier 2 — RETIRED generic specs (v2.3.1155: every live read is now
       deleted client+server; the save/wire dropped the fields).  The
       pinned zeros + _t2Retired stay ONE more release as the boundary
       heal for pre-fix saves per docs/specs/migrations.md — client
       payloads are unmigrated writers. */
    ferocity: 0,
    elementalMastery: 0,
    fortification: 0,
    restoration: 0,
    influence: 0,
    unspentT2: 0,
    _t2Retired: true,
    /* Tier 2 — per-weapon-category skills / channels / point pools. */
    ...createDefaultWeaponT2(),
    /* Tier 2 — Defense category (trained by blocking / mitigating). */
    ...createDefaultDefenseT2(),
    /* v2.3.1154 — HP + Endurance grids (points from vitality/endurance levels). */
    ...createDefaultGrids(),
    /* Derived (recalculated) */
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    mana: 100,
    maxMana: 100,
    /* Equipment */
    /* Equipment — start with basic wood-tier weapons.
       v2.3.943: the starter melee weapon is a greatsword (was the Bamboo
       Stick / type 'sword') so the per-facing held greatsword art shows and
       the wild swing reads as a big sword. */
    weapon: {
      type: 'greatsword',
      tier: 'common',
      tierMult: 1.0,
      element1: null,
      element2: null,
      name: 'Great Sword',
      isVolatile: false,
      gearBase: 'wood'
    },
    rangedWeapon: {
      type: 'bow',
      tier: 'common',
      tierMult: 1.0,
      element1: null,
      element2: null,
      name: 'Wood Bow',
      isVolatile: false,
      gearBase: 'wood'
    },
    staffWeapon: {
      type: 'staff',
      tier: 'common',
      tierMult: 1.0,
      element1: null,
      element2: null,
      name: 'Wood Staff',
      isVolatile: false,
      gearBase: 'wood'
    },
    /* v2.3.249: Leather Armor removed from the game entirely per
       user request.  Armor + stash both empty by default.  Players
       acquire armor through other paths (forge / drops / etc.). */
    armor: null,
    /* v2.3.188: default wood shield matches the other starter gear
       (bamboo stick, wood bow, wood staff, leather armor) so the
       v2.3.187 shield-on-back render has something to draw without
       requiring a pickup. Existing saves with shield=null get the
       same default via the migration in BroTown.jsx ~4352. */
    shield: {
      tier: 'common',
      tierMult: 1.0,
      gearBase: 'wood',
      name: 'Wood Shield',
    },
    /* {tier, tierMult, gearBase, gem, name, reforgeBonus, hardenBonus} */
    /* v2.3.228: armor stash mirrors weaponStash/shieldStash so the
       chest slot supports equip/unequip via the item-detail popup. */
    armorStash: [],
    /* Active weapon slot: 'melee' or 'ranged' */
    activeSlot: 'melee'
  };
}

/* Recalculate derived stats from allocations */
export function recalcDerived(rpg) {
  /* v2.3.910: combat level was DERIVED as the sum of the use-trained
     build-skill levels (v2.3.1138 added Defense as the 6th), cap 500.
     v2.3.1342: level = total T2 points PLACED, cap LEVEL_CAP=1000
     (owner directive 2026-07-16: every point spent = +1 combat level,
     so every level-up is a bought power gain; max level 1000).
     combatBuildTotal already applies the per-channel [0,100] clamp —
     one summation, mirrored by the server's computeBuildTotal.
     Gated on caps.t2simple (isT2SimpleEnabled): an old worker echoes
     ITS stat-sum level verbatim in player_state, and the two formulas
     fighting would flicker the level every flush — keep the legacy
     formula until the worker owns the new one. */
  rpg.level = isT2SimpleEnabled()
    /* The +1: fresh characters are level 1 (RPG floor), and the FIRST
       point spent must be +1 level like every other — level = points
       alone made point #1 a dud (1 -> 1).  Cap lands on point #1000. */
    ? Math.min(LEVEL_CAP, 1 + combatBuildTotal(rpg))
    : Math.max(1, Math.min(500,
      (rpg.power || 0) + (rpg.vitality || 0) + (rpg.endurance || 0)
      + (rpg.agility || 0) + (rpg.mind || 0)
      + ((rpg.defenseSkill && rpg.defenseSkill.level) || 0)));
  rpg.maxHp = calcMaxHp(rpg.level, rpg.vitality);
  /* v2.3.227: armor contributes flat HP scaled by Vitality (1% per pt). */
  rpg.maxHp += getArmorHp(rpg.armor, rpg.vitality);
  rpg.maxStamina = calcMaxStam(rpg.endurance);
  /* v2.3.1154: HP-grid Vigor and Endurance-grid Stamina adjust the
     pools (matching the server's _recomputeMaxes order: after armor HP,
     before the amulet flat bonus below).  Gated on the worker's
     caps.hpEndGrids so an old worker's echo can't fight the local
     value — see setGridCapsEnabled.
     v2.3.1343: Vigor is FLAT +10 HP/pt now (kid-simple reprice). */
  if (isGridCapsEnabled()) {
    rpg.maxHp = Math.floor(rpg.maxHp + getVigorFlat(rpg));
    rpg.maxStamina = Math.floor(rpg.maxStamina + getStaminaFlat(rpg)); /* v2.3.1345: flat */
  }
  rpg.maxMana = calcMaxMana(rpg.mind);

  /* §4 Amulet stat bonuses — applied to derived stats */
  if (rpg.amulet && rpg.amulet.gem) {
    var bonus = getAmuletBonus(rpg.amulet);
    if (bonus) {
      if (bonus.stat === 'maxHp') rpg.maxHp += bonus.value;
      if (bonus.stat === 'maxMana') rpg.maxMana += bonus.value;
      /* Other amulet stats (elemDmg, atkSpd, moveSpd, hpRegen, staminaRegen, elemResist, critDmg) */
      /* are applied at point-of-use in combat code via rpg._amuletBonus cache */
    }
    rpg._amuletBonus = bonus; /* cache for combat lookups */
  } else {
    rpg._amuletBonus = null;
  }

  /* §4 Shield defensive gem bonus */
  if (rpg.shield && rpg.shield.gem) {
    rpg._shieldBonus = getShieldBonus(rpg.shield);
  } else {
    rpg._shieldBonus = null;
  }
  rpg.hp = Math.min(rpg.hp, rpg.maxHp);
  rpg.stamina = Math.min(rpg.stamina, rpg.maxStamina);
  rpg.mana = Math.min(rpg.mana, rpg.maxMana);
  return rpg;
}

/* Get the currently active weapon object */
export function getActiveWeapon(rpg) {
  if (rpg.activeSlot === 'ranged') return rpg.rangedWeapon || rpg.weapon;
  if (rpg.activeSlot === 'staff') return rpg.staffWeapon || rpg.weapon;
  return rpg.weapon;
}

/* v2.3.254: which swing SFX to play for the current melee weapon.
   Wood-tier sword (the bamboo stick) gets its own airier 'bamboo-swing'
   sample; everything else falls back to the canonical 'sword-swing'. */
export function meleeSwingSfx(rpg) {
  if (!rpg) return 'sword-swing';
  const wpn = getActiveWeapon(rpg);
  if (wpn && wpn.type === 'sword' && wpn.gearBase === 'wood') return 'bamboo-swing';
  return 'sword-swing';
}

/* ═══ LEGACY COMPAT — kept temporarily so existing render/UI code doesn't break ═══ */
/* Legacy constants removed — weapon system uses WEAPON_TYPES + RARITY_TIERS */
/* Monster system uses createMonster() with ARCHETYPES */
export const SWING_COOLDOWN = 600;
export const SWING_RANGE = 50;
export const SWING_ARC = Math.PI * 0.85;
/* v2.3.939: greatsword "wild swing" hit shape -- a small 360° core around the
   player (catches anything beside/behind every swing) UNION a wide forward
   half-circle at a larger reach in the aim direction.  Shared by the hit
   detection (monsterCombat) and the aim indicator (effectsRenderer) so the
   preview matches the damage.  Sword keeps the narrow SWING_ARC cone. */
export const GS_INNER_RADIUS = 38;       // 360° core radius (any angle)
export const GS_OUTER_RADIUS = 72;       // forward reach inside the half-circle
export const GS_FORWARD_ARC = Math.PI;   // 180° forward half-circle

/* §5.9 Combo Chain — auto-attacks build per-target combo (0–3); the next
   swipe (special attack) consumes the count for cumulative bonuses. */
export const COMBO_BURST_BONUS          = 0.15; /* dmg ×(1+x) at count 1+ */
export const COMBO_SPREAD_RADIUS        = 80;   /* px — 20u × ~4px/u */
export const COMBO_SPREAD_DURATION_MULT = 0.60; /* spread dur as fraction of consumed */
export const COMBO_NEXT_DURATION_BONUS  = 0.20; /* status ×(1+x) at count 3 */
export const COMBO_NEXT_WINDOW_MS       = 4000;
export const COMBO_GRACE_MULT           = 1.5;  /* grace = swing_cooldown × x */

/* §5.7 Resonance Window — final 25% of a status duration is a "resonance
   window"; consuming the status during that window grants bonus collision
   damage (linear 1.10× → 1.30× across the window) and pulses the status
   icon. §5.7.7 streak adds a mana-restore bonus to consecutive resonance-
   timed collisions within RESONANCE_STREAK_WINDOW. */
export const RESONANCE_WINDOW_RATIO       = 0.25;
export const RESONANCE_BONUS_BASE         = 0.10; /* +10% at window entry */
export const RESONANCE_BONUS_PEAK         = 0.30; /* +30% at expiry */
export const RESONANCE_PULSE_BASE_HZ      = 1.5;
export const RESONANCE_PULSE_ACCEL_HZ     = 3.5;
export const RESONANCE_STREAK_WINDOW_MS   = 10000;
export const RESONANCE_STREAK_MANA_BONUS  = 0.10; /* per step */
export const RESONANCE_STREAK_CAP         = 0.50; /* 5 steps × 0.10 */

/* §5.8 Contextual Dodge — same input (swipe / Spacebar), three actions
   based on lock-on + direction + active weapon type. */
export const LUNGE_DIRECTION_THRESHOLD    = 0.707; /* cos(45°) */
export const LUNGE_STAMINA_FRACTION       = 0.25;  /* fraction of maxStamina */
export const LUNGE_DAMAGE_MULT            = 0.6;   /* fraction of weapon dmg */
export const LUNGE_DASH_FRAMES            = 8;     /* frames of dash motion */
export const LUNGE_DASH_PX_PER_FRAME      = 6;     /* total ≈ 48 px ≈ dodge dist */
export const LUNGE_IFRAMES_MS             = 150;
export const RETREAT_SHOT_STAMINA_FRACTION = 0.20;
export const RETREAT_SHOT_DAMAGE_MULT     = 0.5;
export const RETREAT_STAFF_CONE_RAD       = (25 * Math.PI) / 180;
/* RESPAWN_INVULN defined in zone system above */

/* Old BUILDINGS removed — now uses TOWN_BUILDINGS + legacy BUILDINGS compat from zone system */

export const SHOP_PRICES = {
  slime: 1,
  bat: 2,
  skeleton: 4,
  crab: 2,
  golem: 8,
  logs: 1,
  oakLogs: 3,
  magicLogs: 10,
  rawFish: 2,
  cookedFish: 5,
  burntFish: 0,
  rareFish: 15,
  npc: 3
};
export const SHOP_ITEMS_FOR_SALE = [{
  key: 'trap_basic',
  name: 'Basic Trap 🪤',
  cost: 20,
  desc: 'Capture weakened monsters'
}, {
  key: 'whetstone',
  name: 'Whetstone 🪨',
  cost: 50,
  desc: '+15% dmg for 60s'
}, {
  key: 'antidote',
  name: 'Antidote 🍃',
  cost: 30,
  desc: 'Clear all status effects'
}];

/* ═══ CROSS-ROOM MARKETPLACE — order book system ═══ */
export const MKT_CATEGORIES = {
  weapon: {
    label: 'Weapons',
    icon: '⚔️',
    subtypes: ['greatsword', 'sword', 'bow', 'staff']
  },
  armor: {
    label: 'Armor',
    icon: '🛡️',
    subtypes: ['armor']
  },
  shield: {
    label: 'Shields',
    icon: '🛡️',
    subtypes: ['shield']
  },
  amulet: {
    label: 'Amulets',
    icon: '💍',
    subtypes: ['amulet']
  }
};
/* All craftable tiers serve as the "item grade" for marketplace listings */
export const MKT_TIERS = Object.entries(BLACKSMITH_TIERS).map(function (_ref4) {
  var _ref5 = _slicedToArray(_ref4, 2),
    k = _ref5[0],
    v = _ref5[1];
  return {
    id: k,
    label: v.label,
    color: v.color,
    tierMult: v.tierMult,
    minLvl: v.minLvl
  };
});
export const MKT_WOOD_TIERS = Object.entries(WOODWORKING_TIERS).map(function (_ref6) {
  var _ref7 = _slicedToArray(_ref6, 2),
    k = _ref7[0],
    v = _ref7[1];
  return {
    id: 'ww_' + k,
    label: v.label + ' (Wood)',
    color: v.color,
    tierMult: v.tierMult,
    minLvl: v.minLvl
  };
});

/* Order book — stored in rpg._mktOrders, broadcast via channel */
/* Order shape: {id, type:'buy'|'sell', category, subtype, tierKey, element1, element2, price, item (for sells), playerName, playerId, ts} */
export function createMktOrder(type, category, subtype, tierKey, element1, element2, price, item, playerName, playerId) {
  var _BLACKSMITH_TIERS$tie, _WOODWORKING_TIERS$ti;
  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    type: type,
    category: category,
    subtype: subtype,
    tierKey: tierKey,
    element1: element1 || null,
    element2: element2 || null,
    price: Math.max(1, Math.floor(price)),
    item: type === 'sell' ? item : null,
    /* actual item data for sells */
    tierLabel: ((_BLACKSMITH_TIERS$tie = BLACKSMITH_TIERS[tierKey]) === null || _BLACKSMITH_TIERS$tie === void 0 ? void 0 : _BLACKSMITH_TIERS$tie.label) || ((_WOODWORKING_TIERS$ti = WOODWORKING_TIERS[tierKey === null || tierKey === void 0 ? void 0 : tierKey.replace('ww_', '')]) === null || _WOODWORKING_TIERS$ti === void 0 ? void 0 : _WOODWORKING_TIERS$ti.label) || tierKey || '???',
    playerName: playerName,
    playerId: playerId,
    ts: Date.now(),
    expires: Date.now() + 3600000 /* 1 hour expiry */
  };
}
export function matchMktOrders(buyOrder, sellOrder) {
  /* Match if same category, subtype, tier, and buy price >= sell price */
  return buyOrder.category === sellOrder.category && buyOrder.subtype === sellOrder.subtype && buyOrder.tierKey === sellOrder.tierKey && (buyOrder.element1 || null) === (sellOrder.element1 || null) && (buyOrder.element2 || null) === (sellOrder.element2 || null) && buyOrder.price >= sellOrder.price;
}

/* Estimate fair price based on tier multiplier */
export function estimateMktPrice(tierKey, subtype) {
  var _WEAPON_TYPES$subtype;
  var bt = BLACKSMITH_TIERS[tierKey] || WOODWORKING_TIERS[tierKey === null || tierKey === void 0 ? void 0 : tierKey.replace('ww_', '')] || {};
  var base = ((_WEAPON_TYPES$subtype = WEAPON_TYPES[subtype]) === null || _WEAPON_TYPES$subtype === void 0 ? void 0 : _WEAPON_TYPES$subtype.base) || 30;
  return Math.ceil(base * (bt.tierMult || 1) * 2);
}



/* ═══ NPC QUEST SYSTEM — §19.1 Companion NPCs + Quest Chains ═══ */
export const QUEST_STATUS = {
  available: 'available',
  active: 'active',
  complete: 'complete',
  turnedIn: 'turnedIn'
};
export const QUEST_CHAINS = {
  /* ═══ MAYOR BRO — World Progression Gates ═══ */
  mayor_1: {
    id: 'mayor_1',
    npc: 'Mayor Bro',
    title: 'Welcome Home',
    desc: 'Visit 3 buildings in town.',
    check: function check(rpg, S) {
      var _S$stats;
      return (((_S$stats = S.stats) === null || _S$stats === void 0 || (_S$stats = _S$stats.visitedBuildings) === null || _S$stats === void 0 ? void 0 : _S$stats.size) || 0) >= 3;
    },
    reward: {
      gold: 50,
      xp: 30
    },
    next: 'mayor_2',
    unlocks: 'zone_exits',
    dialogue: {
      start: 'Welcome! Visit three buildings to learn the town.',
      progress: 'Keep exploring!',
      complete: 'Zone exits are now open! The world awaits.'
    }
  },
  mayor_2: {
    id: 'mayor_2',
    npc: 'Mayor Bro',
    title: 'Into the Wild',
    desc: 'Kill 5 monsters in any zone.',
    check: function check(rpg, S) {
      var _rpg$_questKills;
      return (((_rpg$_questKills = rpg._questKills) === null || _rpg$_questKills === void 0 ? void 0 : _rpg$_questKills.mayor_2) || 0) >= 5;
    },
    reward: {
      gold: 100,
      xp: 80
    },
    next: 'mayor_3',
    unlocks: 'skill_cap_10',
    dialogue: {
      start: 'Prove yourself — kill 5 monsters.',
      progress: 'Keep fighting!',
      complete: 'Life skills uncapped past Lv10!'
    }
  },
  mayor_3: {
    id: 'mayor_3',
    npc: 'Mayor Bro',
    title: 'Dungeon Delver',
    desc: 'Clear any dungeon.',
    check: function check(rpg) {
      var _rpg$lifeSkills4;
      return Object.keys(((_rpg$lifeSkills4 = rpg.lifeSkills) === null || _rpg$lifeSkills4 === void 0 ? void 0 : _rpg$lifeSkills4.dungeonClears) || {}).length > 0;
    },
    reward: {
      gold: 300,
      xp: 200
    },
    next: null,
    unlocks: 'skill_cap_50',
    dialogue: {
      start: 'Clear a dungeon to prove your worth.',
      progress: 'Find a dungeon portal in any zone.',
      complete: 'Life skills uncapped past Lv50! Deeper zones beckon.'
    }
  },
  /* ═══ TRADER TIX — Economy Gates ═══ */
  trader_1: {
    id: 'trader_1',
    npc: 'Trader Tix',
    title: 'First Purchase',
    desc: 'Buy any item from the Vendor.',
    check: function check(rpg) {
      var _rpg$_questFlags;
      return (_rpg$_questFlags = rpg._questFlags) === null || _rpg$_questFlags === void 0 ? void 0 : _rpg$_questFlags.boughtItem;
    },
    reward: {
      gold: 25,
      xp: 20
    },
    next: 'trader_2',
    unlocks: 'marketplace',
    dialogue: {
      start: 'Buy something from the Vendor!',
      progress: 'Visit the shop.',
      complete: 'Marketplace now open — trade with players!'
    }
  },
  trader_2: {
    id: 'trader_2',
    npc: 'Trader Tix',
    title: 'Gather and Prosper',
    desc: 'Harvest 3 gathering nodes.',
    check: function check(rpg) {
      var _rpg$_questKills2;
      return (((_rpg$_questKills2 = rpg._questKills) === null || _rpg$_questKills2 === void 0 ? void 0 : _rpg$_questKills2.trader_2) || 0) >= 3;
    },
    reward: {
      gold: 75,
      xp: 50
    },
    next: 'trader_3',
    unlocks: 'farming',
    dialogue: {
      start: 'Gather from 3 resource nodes.',
      progress: 'Hit nodes with your weapon.',
      complete: 'Farm building unlocked! Grow your own ingredients.'
    }
  },
  trader_3: {
    id: 'trader_3',
    npc: 'Trader Tix',
    title: 'Farm to Table',
    desc: 'Plant and harvest a crop.',
    check: function check(rpg) {
      var _rpg$_questFlags2;
      return (_rpg$_questFlags2 = rpg._questFlags) === null || _rpg$_questFlags2 === void 0 ? void 0 : _rpg$_questFlags2.harvestedCrop;
    },
    reward: {
      gold: 150,
      xp: 100
    },
    next: null,
    unlocks: 'cooking_buffs',
    dialogue: {
      start: 'Plant a seed and harvest it!',
      progress: 'Visit the Farm building.',
      complete: 'Herb buff recipes unlocked at the Kitchen!'
    }
  },
  /* ═══ ENCHANTRESS — Element/Enchanting Gates ═══ */
  enchant_1: {
    id: 'enchant_1',
    npc: 'Enchantress',
    title: 'First Spark',
    desc: 'Trigger an elemental collision.',
    check: function check(rpg, S) {
      return discoveredCollisions.size > 0;
    },
    reward: {
      gold: 50,
      xp: 40
    },
    next: 'enchant_2',
    unlocks: 'enchanting',
    dialogue: {
      start: 'Two elements on one enemy — make them collide!',
      progress: 'Auto-attack applies one element, swipe the other.',
      complete: 'Enchanter building now open!'
    }
  },
  enchant_2: {
    id: 'enchant_2',
    npc: 'Enchantress',
    title: 'Elemental Scholar',
    desc: 'Discover 5 different collisions.',
    check: function check() {
      return discoveredCollisions.size >= 5;
    },
    reward: {
      gold: 200,
      xp: 150
    },
    next: 'enchant_3',
    unlocks: 'gem_cutting',
    dialogue: {
      start: '36 collisions exist. Find 5.',
      progress: 'Try different element weapons.',
      complete: 'Gem Cutter building now open!'
    }
  },
  enchant_3: {
    id: 'enchant_3',
    npc: 'Enchantress',
    title: 'Master Enchanter',
    desc: 'Enchant a weapon at the Enchanter.',
    check: function check(rpg) {
      var _rpg$_questFlags3;
      return (_rpg$_questFlags3 = rpg._questFlags) === null || _rpg$_questFlags3 === void 0 ? void 0 : _rpg$_questFlags3.enchantedWeapon;
    },
    reward: {
      gold: 500,
      xp: 300
    },
    next: null,
    unlocks: 'amulet_shield_gems',
    dialogue: {
      start: 'Visit the Enchanter and add elements.',
      progress: 'Bring gold to the Enchanter.',
      complete: 'Amulet and shield gem slotting unlocked!'
    }
  },
  /* ═══ SCOUT — Zone Mechanic Gates ═══ */
  scout_1: {
    id: 'scout_1',
    npc: 'Scout',
    title: 'Zone Hopper',
    desc: 'Visit 3 different combat zones.',
    check: function check(rpg) {
      var _rpg$_questFlags4;
      return Object.keys(((_rpg$_questFlags4 = rpg._questFlags) === null || _rpg$_questFlags4 === void 0 ? void 0 : _rpg$_questFlags4.zonesVisited) || {}).length >= 3;
    },
    reward: {
      gold: 100,
      xp: 80
    },
    next: 'scout_2',
    unlocks: 'zone_mechanics',
    dialogue: {
      start: 'Each zone is unique. Explore at least 3!',
      progress: 'Use exits at the edge of town.',
      complete: 'Zone gadgets unlocked — sled, raft, torch!'
    }
  },
  scout_2: {
    id: 'scout_2',
    npc: 'Scout',
    title: 'Elemental Advantage',
    desc: 'Kill a monster using element effectiveness.',
    check: function check(rpg) {
      var _rpg$_questFlags5;
      return (_rpg$_questFlags5 = rpg._questFlags) === null || _rpg$_questFlags5 === void 0 ? void 0 : _rpg$_questFlags5.usedEffectiveness;
    },
    reward: {
      gold: 200,
      xp: 150
    },
    next: null,
    unlocks: 'deep_access',
    dialogue: {
      start: 'Use the effectiveness circle — 25% bonus damage.',
      progress: 'Flame > Frost > Storm > Stone...',
      complete: 'Deep and Abyss depths now accessible!'
    }
  },
  /* ═══ BLACKSMITH BRON — Crafting Gates ═══ */
  bron_1: {
    id: 'bron_1',
    npc: 'Blacksmith Bron',
    title: 'Raw Materials',
    desc: 'Mine 5 ore from any zone.',
    check: function check(rpg) {
      var inv = rpg.inventory || {};
      return Object.keys(inv).filter(function (k) {
        return k.startsWith('ore_');
      }).reduce(function (s, k) {
        return s + inv[k];
      }, 0) >= 5;
    },
    reward: {
      gold: 60,
      xp: 40
    },
    next: 'bron_2',
    unlocks: 'blacksmith',
    dialogue: {
      start: 'Mine 5 ore from combat zones.',
      progress: 'Look for rock veins.',
      complete: 'Blacksmith now open! Forge melee weapons.'
    }
  },
  bron_2: {
    id: 'bron_2',
    npc: 'Blacksmith Bron',
    title: 'First Forge',
    desc: 'Forge a weapon at the Blacksmith.',
    check: function check(rpg) {
      var _rpg$_questFlags6;
      return (_rpg$_questFlags6 = rpg._questFlags) === null || _rpg$_questFlags6 === void 0 ? void 0 : _rpg$_questFlags6.forgedWeapon;
    },
    reward: {
      gold: 120,
      xp: 80
    },
    next: 'bron_3',
    unlocks: 'woodworker_reforge',
    dialogue: {
      start: 'Bring ore to my workshop.',
      progress: 'Visit the Blacksmith.',
      complete: 'Woodworker + Reforging unlocked!'
    }
  },
  bron_3: {
    id: 'bron_3',
    npc: 'Blacksmith Bron',
    title: 'Woodcraft',
    desc: 'Craft a bow or staff at the Woodworker.',
    check: function check(rpg) {
      var _rpg$_questFlags7;
      return (_rpg$_questFlags7 = rpg._questFlags) === null || _rpg$_questFlags7 === void 0 ? void 0 : _rpg$_questFlags7.craftedWoodWeapon;
    },
    reward: {
      gold: 200,
      xp: 150
    },
    next: 'bron_4',
    unlocks: 'hardening',
    dialogue: {
      start: 'The Woodworker shapes bows and staves.',
      progress: 'Chop trees, then visit Woodworker.',
      complete: 'Hardening unlocked! Risk it for a second bonus.'
    }
  },
  bron_4: {
    id: 'bron_4',
    npc: 'Blacksmith Bron',
    title: 'Gem Setter',
    desc: 'Cut a gem and slot it into a weapon.',
    check: function check(rpg) {
      var _rpg$_questFlags8;
      return (_rpg$_questFlags8 = rpg._questFlags) === null || _rpg$_questFlags8 === void 0 ? void 0 : _rpg$_questFlags8.slottedGem;
    },
    reward: {
      gold: 400,
      xp: 250
    },
    next: null,
    unlocks: 'shield_craft_salvage',
    dialogue: {
      start: 'Cut a gem, slot it at the Enchanter.',
      progress: 'Gem Cutter then Enchanter.',
      complete: 'Shield crafting + Salvage Station unlocked!'
    }
  },
  /* ═══ HEALER LUNA — Survival Gates ═══ */
  luna_1: {
    id: 'luna_1',
    npc: 'Healer Luna',
    title: 'First Aid',
    desc: 'Cook a fish at the Kitchen.',
    check: function check(rpg) {
      var _rpg$_questFlags9;
      return (_rpg$_questFlags9 = rpg._questFlags) === null || _rpg$_questFlags9 === void 0 ? void 0 : _rpg$_questFlags9.cookedRecipe;
    },
    reward: {
      gold: 40,
      xp: 30
    },
    next: 'luna_2',
    unlocks: 'field_cooking',
    dialogue: {
      start: 'Cook a fish at the Kitchen!',
      progress: 'Catch fish, bring to Kitchen.',
      complete: 'Field cooking unlocked!'
    }
  },
  luna_2: {
    id: 'luna_2',
    npc: 'Healer Luna',
    title: 'Hold the Line',
    desc: 'Block 10 enemy attacks.',
    check: function check(rpg) {
      var _rpg$_questFlags0;
      return (((_rpg$_questFlags0 = rpg._questFlags) === null || _rpg$_questFlags0 === void 0 ? void 0 : _rpg$_questFlags0.blocksLanded) || 0) >= 10;
    },
    reward: {
      gold: 100,
      xp: 70
    },
    next: 'luna_3',
    unlocks: 'shield_equip',
    dialogue: {
      start: 'Block 10 attacks with your shield.',
      progress: 'Hold the shield button.',
      complete: 'Shield gear slot unlocked!'
    }
  },
  luna_3: {
    id: 'luna_3',
    npc: 'Healer Luna',
    title: 'Death and Taxes',
    desc: 'Die and recover scattered items.',
    check: function check(rpg) {
      var _rpg$_questFlags1;
      return (_rpg$_questFlags1 = rpg._questFlags) === null || _rpg$_questFlags1 === void 0 ? void 0 : _rpg$_questFlags1.recoveredDeathDrop;
    },
    reward: {
      gold: 250,
      xp: 180
    },
    next: null,
    unlocks: 'amulet_craft',
    dialogue: {
      start: 'Die and recover your items within 30s.',
      progress: 'Rush back to where you fell!',
      complete: 'Amulet crafting unlocked at the Blacksmith!'
    }
  },
  /* ═══ BEASTMASTER KAI — Pet Gates ═══ */
  kai_1: {
    id: 'kai_1',
    npc: 'Beastmaster Kai',
    title: 'The Weakened Prey',
    desc: 'Capture your first pet.',
    check: function check(rpg) {
      var _rpg$lifeSkills5;
      return (((_rpg$lifeSkills5 = rpg.lifeSkills) === null || _rpg$lifeSkills5 === void 0 || (_rpg$lifeSkills5 = _rpg$lifeSkills5.pets) === null || _rpg$lifeSkills5 === void 0 ? void 0 : _rpg$lifeSkills5.length) || 0) >= 1;
    },
    reward: {
      gold: 80,
      xp: 60
    },
    next: 'kai_2',
    unlocks: 'pet_combat',
    dialogue: {
      start: 'Weaken a monster below 20% HP, then trap it!',
      progress: 'Lock on and tap the trap.',
      complete: 'Pet combat unlocked! Your pet auto-attacks.'
    }
  },
  kai_2: {
    id: 'kai_2',
    npc: 'Beastmaster Kai',
    title: 'Growing Pack',
    desc: 'Capture 3 different pets.',
    check: function check(rpg) {
      var _rpg$lifeSkills6;
      return (((_rpg$lifeSkills6 = rpg.lifeSkills) === null || _rpg$lifeSkills6 === void 0 || (_rpg$lifeSkills6 = _rpg$lifeSkills6.pets) === null || _rpg$lifeSkills6 === void 0 ? void 0 : _rpg$lifeSkills6.length) || 0) >= 3;
    },
    reward: {
      gold: 200,
      xp: 120
    },
    next: 'kai_3',
    unlocks: 'pet_loot_upgrade',
    dialogue: {
      start: 'Catch 3 different pets!',
      progress: 'Try different zones.',
      complete: 'Pet loot radius doubled!'
    }
  },
  kai_3: {
    id: 'kai_3',
    npc: 'Beastmaster Kai',
    title: 'Pet Power',
    desc: 'Pet collects 20 loot drops.',
    check: function check(rpg) {
      var _rpg$_questFlags10;
      return (((_rpg$_questFlags10 = rpg._questFlags) === null || _rpg$_questFlags10 === void 0 ? void 0 : _rpg$_questFlags10.petLootCount) || 0) >= 20;
    },
    reward: {
      gold: 350,
      xp: 200
    },
    next: null,
    unlocks: 'trapping_cap_50',
    dialogue: {
      start: 'Let your pet collect 20 drops.',
      progress: 'Keep pet active while fighting.',
      complete: 'Trapping skill cap raised to Lv50!'
    }
  },
  /* ═══ VETERAN ASH — Combat Mastery Gates ═══ */
  ash_1: {
    id: 'ash_1',
    npc: 'Veteran Ash',
    title: 'Critical Moment',
    desc: 'Land 10 critical hits.',
    check: function check(rpg) {
      var _rpg$_questFlags11;
      return (((_rpg$_questFlags11 = rpg._questFlags) === null || _rpg$_questFlags11 === void 0 ? void 0 : _rpg$_questFlags11.critsLanded) || 0) >= 10;
    },
    reward: {
      gold: 100,
      xp: 80
    },
    next: 'ash_2',
    unlocks: 'reforge_expanded',
    dialogue: {
      start: 'Land 10 critical hits.',
      progress: 'Invest in Ferocity.',
      complete: 'Expanded reforge bonus pool!'
    }
  },
  ash_2: {
    id: 'ash_2',
    npc: 'Veteran Ash',
    title: 'Status Master',
    desc: 'Apply 5 different status effects.',
    check: function check(rpg) {
      var _rpg$_questFlags12;
      return Object.keys(((_rpg$_questFlags12 = rpg._questFlags) === null || _rpg$_questFlags12 === void 0 ? void 0 : _rpg$_questFlags12.statusesApplied) || {}).length >= 5;
    },
    reward: {
      gold: 250,
      xp: 180
    },
    next: 'ash_3',
    unlocks: 'skill_cap_100',
    dialogue: {
      start: 'Apply 5 different statuses.',
      progress: 'Use different element weapons.',
      complete: 'All life skill caps removed! Train to Lv100.'
    }
  },
  ash_3: {
    id: 'ash_3',
    npc: 'Veteran Ash',
    title: 'Collision Expert',
    desc: 'Discover 15 unique collisions.',
    check: function check() {
      return discoveredCollisions.size >= 15;
    },
    reward: {
      gold: 500,
      xp: 350
    },
    next: 'ash_4',
    unlocks: null,
    dialogue: {
      start: 'Find 15 of the 36 collisions.',
      progress: 'Experiment with every pair.',
      complete: '15 collisions mastered! True elemental warrior.'
    }
  },
  ash_4: {
    id: 'ash_4',
    npc: 'Veteran Ash',
    title: 'Volatile Heart',
    desc: 'Trigger a Volatile weapon collision.',
    check: function check(rpg) {
      var _rpg$_questFlags13;
      return (_rpg$_questFlags13 = rpg._questFlags) === null || _rpg$_questFlags13 === void 0 ? void 0 : _rpg$_questFlags13.volatileCollision;
    },
    reward: {
      gold: 800,
      xp: 500
    },
    next: null,
    unlocks: null,
    dialogue: {
      start: 'Volatile weapons are unstable power. Use one.',
      progress: 'Equip a Volatile weapon and trigger a collision.',
      complete: 'Chaos refined into power. You\'ve mastered combat.'
    }
  }
};

/* Get the current active/available quest for an NPC */
/* Check if player has earned a specific quest unlock */
export function hasUnlock(rpg, unlockId) {
  if (!rpg || !rpg._quests) return false;
  for (var _i31 = 0, _Object$keys = Object.keys(QUEST_CHAINS); _i31 < _Object$keys.length; _i31++) {
    var qid = _Object$keys[_i31];
    var q = QUEST_CHAINS[qid];
    if (q.unlocks === unlockId && rpg._quests[qid] === QUEST_STATUS.turnedIn) return true;
  }
  return false;
}
export function getNpcQuest(rpg, npcName) {
  var questState = rpg._quests || {};
  /* Find first incomplete quest for this NPC */
  for (var _i32 = 0, _Object$entries4 = Object.entries(QUEST_CHAINS); _i32 < _Object$entries4.length; _i32++) {
    var _Object$entries4$_i = _slicedToArray(_Object$entries4[_i32], 2),
      qid = _Object$entries4$_i[0],
      quest = _Object$entries4$_i[1];
    if (quest.npc !== npcName) continue;
    var state = questState[qid];
    if (!state || state === QUEST_STATUS.available) return {
      quest: quest,
      status: QUEST_STATUS.available
    };
    if (state === QUEST_STATUS.active) return {
      quest: quest,
      status: QUEST_STATUS.active
    };
    if (state === QUEST_STATUS.turnedIn) continue; /* done, check next */
  }
  return null; /* all quests done */
}

/* §19 PvP REPUTATION SYSTEM */
export const REPUTATION = {
  honored: {
    label: 'Honored',
    color: '#3dd497',
    pvpPenalty: 0
  },
  neutral: {
    label: 'Neutral',
    color: '#8B9695',
    pvpPenalty: 0
  },
  suspect: {
    label: 'Suspect',
    color: '#f5c542',
    pvpPenalty: 0.1
  },
  outlaw: {
    label: 'Outlaw',
    color: '#ff5e6c',
    pvpPenalty: 0.25
  }
};

/* PvP threat: when you attack another player, a threat counter starts */
/* §19 PvP THREAT SYSTEM — reworked */
export const PVP_DUEL_TIMEOUT = 30000; /* 30 seconds to accept duel */
export const PVP_THREAT_BASE_COUNTDOWN = 120000; /* 2 min base countdown for threatened player */
export const PVP_THREAT_LEVEL_BONUS = 120000; /* +2 min per level difference */
export const PVP_THREAT_COOLDOWN = 1800000; /* 30 min cooldown after issuing threat */
/* v2.3.1193: ignored/expired-threat fight window — mirrors the server's
   THREAT.CONSENT_MS (server/src/threat.js); keep in sync.  Drives the
   white-skull display window only (consent itself is server-side). */
export const PVP_THREAT_CONSENT_MS = 600000;
export const PVP_GUARD_CONFISCATE_TIME = 1800000; /* 30 min gear confiscation */
export const PVP_GUARD_GOLD_LEVY = 0.10; /* 10% gold levy when guards win */
export const PVP_THREAT_DURATION = PVP_THREAT_BASE_COUNTDOWN; /* compat */

/* Duplicate declarations + dead code removed — originals at line ~767 */

/* PLAYER_COLORS moved to constants.js */


/* v2.3.1111: SINGLE SOURCE for the monster body-centre Y offset.  Monster
   sprites are feet-anchored (entityRenderer anchor 0.5/1.0), so m.y is the
   FEET of a tall sprite and the visible body centre sits this many px
   above it.  Four hand-maintained copies of this table had drifted apart
   (tap-to-lock x2, projectile hit-test, melee hit) -- the tap handlers
   were missing the tall variants entirely (taps on a mummy's torso tested
   a circle at its feet and never locked), and projectile AIM used raw
   feet-level m.y while the HIT test used the body centre, making locked
   bow shots fly under the hitbox.  Every consumer now reads this. */
export function monsterBodyOffsetY(archOrType) {
  return archOrType === 'fodder' ? 40
    : (archOrType === 'mummy' || archOrType === 'skeleton') ? 48
    : archOrType === 'fireGoblin' ? 28
    : archOrType === 'snowman' ? 19
    : 0;
}
export function monsterBodyY(m) {
  return m.y - monsterBodyOffsetY(m.archetype || m.type);
}
