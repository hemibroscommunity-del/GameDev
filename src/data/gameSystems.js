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
import { AMULET_TIERS, SALVAGE_RETURN_RATE } from './items.js';

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

/* Stat required to EQUIP gear by weapon type */
export const EQUIP_STAT_MAP = {
  greatsword: 'power',
  /* Heavy hitter */
  sword: 'agility',
  /* Fast pressure */
  bow: 'agility',
  /* Ranged precision */
  staff: 'mind' /* Mana-dependent caster */
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
export const RESOURCE_TIER_COLORS = ['', '#8890b8', '#3b82f6', '#a855f7', '#f5c542', '#ff5e6c'];

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
      /* TEMP: starts at 6 so the Clownfish (lvl-6 fishSpot tier) is
         immediately catchable for testing.  Reset to 0 once tier
         progression is being playtested in earnest. */
      level: 6,
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
    level: 6,
    xp: 0
  };
  /* TEMP: bump existing saves' fishing level to at least 6 so the
     Clownfish (lvl-6 fishSpot tier) is immediately catchable for
     testing.  Remove this branch once playtesting moves past it. */
  if (sk.fishing && (sk.fishing.level || 0) < 6) sk.fishing.level = 6;
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
  color: '#8890b8'
}, {
  rank: 1,
  title: 'Apprentice',
  minLvl: 10,
  ap: 25,
  color: '#8890b8'
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
  color: '#8890b8',
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
  desc: 'PvP, duels, lawless land'
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

/* ═══ COSMETIC MASKS — §MASK ═══ */
/* Wearable face items. One active at a time. Stored in rpg._masks (owned) and rpg._activeMask */
export const MASKS = [{
  id: 'clown',
  name: 'Clown Mask',
  emoji: '🤡',
  cost: 200,
  minLvl: 1,
  desc: 'Honk honk.',
  colors: {
    face: '#fff',
    nose: '#ff0000',
    cheeks: '#ff69b4',
    eyes: '#2563eb'
  }
}, {
  id: 'troll',
  name: 'Troll Mask',
  emoji: '👹',
  cost: 350,
  minLvl: 10,
  desc: 'Chaos incarnate.',
  colors: {
    face: '#2d6b22',
    horns: '#5d4037',
    eyes: '#ff5e6c',
    mouth: '#1a1a1a'
  }
}, {
  id: 'anonymous',
  name: 'Anonymous Mask',
  emoji: '🎭',
  cost: 500,
  minLvl: 20,
  desc: 'We are legion.',
  colors: {
    face: '#f5f0e1',
    eyebrows: '#1a1a1a',
    smile: '#cc0000',
    cheeks: '#d4a9a9'
  }
}, {
  id: 'skull',
  name: 'Skull Mask',
  emoji: '💀',
  cost: 750,
  minLvl: 30,
  desc: 'Memento mori.',
  colors: {
    bone: '#e8e0d0',
    shadow: '#1a1a1a',
    cracks: '#8B8680',
    teeth: '#fff'
  }
}, {
  id: 'demon',
  name: 'Demon Mask',
  emoji: '👿',
  cost: 1000,
  minLvl: 40,
  desc: 'From the deep.',
  colors: {
    face: '#8B0000',
    horns: '#2a0000',
    eyes: '#f5c542',
    marks: '#ff5e6c'
  }
}, {
  id: 'cat',
  name: 'Cat Mask',
  emoji: '😺',
  cost: 150,
  minLvl: 5,
  desc: 'Purrfect disguise.',
  colors: {
    face: '#f5c542',
    ears: '#ea580c',
    nose: '#ff69b4',
    whiskers: '#3a3a3a'
  }
}, {
  id: 'robot',
  name: 'Robot Visor',
  emoji: '🤖',
  cost: 600,
  minLvl: 25,
  desc: 'BEEP BOOP.',
  colors: {
    face: '#607D8B',
    visor: '#00e5ff',
    antenna: '#b0b0b0',
    mouth: '#3dd497'
  }
}, {
  id: 'ghost',
  name: 'Ghost Sheet',
  emoji: '👻',
  cost: 300,
  minLvl: 15,
  desc: 'BOO!',
  colors: {
    face: '#f0f0f0',
    eyes: '#1a1a1a',
    blush: 'rgba(150,100,200,.3)'
  }
}, {
  id: 'ninja',
  name: 'Ninja Hood',
  emoji: '🥷',
  cost: 450,
  minLvl: 20,
  desc: 'Silent but deadly.',
  colors: {
    wrap: '#1a1a1a',
    eyes: '#dc2626',
    band: '#5b52ff'
  }
}, {
  id: 'crown',
  name: 'Royal Crown',
  emoji: '👑',
  cost: 2000,
  minLvl: 50,
  desc: 'Bow before me.',
  colors: {
    gold: '#f5c542',
    jewel: '#dc2626',
    trim: '#d4a030',
    velvet: '#5b0000'
  }
}, {
  id: 'alien',
  name: 'Alien Head',
  emoji: '👽',
  cost: 400,
  minLvl: 15,
  desc: 'Take me to your leader.',
  colors: {
    face: '#90EE90',
    eyes: '#1a1a1a',
    mouth: '#2d6b22'
  }
}, {
  id: 'pumpkin',
  name: 'Pumpkin Head',
  emoji: '🎃',
  cost: 300,
  minLvl: 10,
  desc: 'Spooky season never ends.',
  colors: {
    face: '#FF7518',
    eyes: '#f5c542',
    stem: '#2d6b22',
    mouth: '#1a1a1a'
  }
}, {
  id: 'rage',
  name: 'Rage Face',
  emoji: '🤬',
  cost: 500,
  minLvl: 25,
  desc: 'PURE ANGER.',
  colors: {
    face: '#dc2626',
    eyes: '#fff',
    brows: '#1a1a1a',
    veins: '#8B0000'
  }
}, {
  id: 'cool',
  name: 'Cool Shades',
  emoji: '😎',
  cost: 250,
  minLvl: 8,
  desc: 'Deal with it.',
  colors: {
    lens: '#1a1a1a',
    frame: '#333',
    shine: 'rgba(255,255,255,.3)'
  }
}, {
  id: 'monocle',
  name: 'Distinguished',
  emoji: '🧐',
  cost: 800,
  minLvl: 35,
  desc: 'Quite.',
  colors: {
    glass: 'rgba(200,220,255,.3)',
    frame: '#d4a030',
    chain: '#f5c542'
  }
}];

/* ═══ STAT-BASED VISUAL CHANGES — §STATVIS ═══ */
/* Character appearance subtly changes based on stat allocation */
export function getStatVisuals(rpg) {
  if (!rpg) return {};
  var power = rpg.power || 0,
    vit = rpg.vitality || 0,
    end = rpg.endurance || 0;
  var agi = rpg.agility || 0,
    mind = rpg.mind || 0;
  var fer = rpg.ferocity || 0,
    em = rpg.elementalMastery || 0;
  var fort = rpg.fortification || 0,
    rest = rpg.restoration || 0,
    inf = rpg.influence || 0;
  var total = power + vit + end + agi + mind + fer + em + fort + rest + inf;
  if (total < 10) return {}; /* no visible changes below 10 total */

  /* Find dominant stat archetype */
  var archetypes = [{
    key: 'berserker',
    score: power * 2 + fer * 3,
    color: '#dc2626',
    glow: 'rgba(220,38,38,.15)',
    scale: 1.08,
    desc: 'bulkier arms'
  }, {
    key: 'tank',
    score: vit * 2 + fort * 3 + end,
    color: '#607D8B',
    glow: 'rgba(96,125,139,.12)',
    scale: 1.12,
    desc: 'wider torso'
  }, {
    key: 'mage',
    score: mind * 2 + em * 3,
    color: '#9333ea',
    glow: 'rgba(147,51,234,.15)',
    scale: 0.95,
    desc: 'arcane aura'
  }, {
    key: 'rogue',
    score: agi * 3 + fer,
    color: '#22c55e',
    glow: 'rgba(34,197,94,.1)',
    scale: 0.92,
    desc: 'sleeker frame'
  }, {
    key: 'healer',
    score: rest * 3 + mind,
    color: '#38bdf8',
    glow: 'rgba(56,189,248,.12)',
    scale: 1.0,
    desc: 'gentle glow'
  }, {
    key: 'leader',
    score: inf * 3 + mind,
    color: '#f5c542',
    glow: 'rgba(245,197,66,.1)',
    scale: 1.0,
    desc: 'commanding presence'
  }];
  archetypes.sort(function (a, b) {
    return b.score - a.score;
  });
  var dominant = archetypes[0];
  if (dominant.score < 15) return {}; /* need meaningful investment */

  /* Intensity scales with how specialized (0-1) */
  var intensity = Math.min(1, dominant.score / 150);
  return {
    archetype: dominant.key,
    glowColor: dominant.glow,
    accentColor: dominant.color,
    bodyScale: 1 + (dominant.scale - 1) * intensity,
    intensity: intensity,
    /* Specific visual tweaks */
    bulkArms: dominant.key === 'berserker' ? intensity * 3 : 0,
    widerTorso: dominant.key === 'tank' ? intensity * 4 : 0,
    slimmer: dominant.key === 'rogue' ? intensity * 2 : 0,
    arcaneParticles: dominant.key === 'mage' ? Math.floor(intensity * 3) : 0,
    healGlow: dominant.key === 'healer' ? intensity * 0.15 : 0,
    crownGlow: dominant.key === 'leader' ? intensity * 0.12 : 0
  };
}

/* Draw a mask on a head circle at (cx, cy) with radius r */
export function drawMask(ctx, maskId, cx, cy, r, now) {
  var mask = MASKS.find(function (m) {
    return m.id === maskId;
  });
  if (!mask) return;
  var c = mask.colors;
  ctx.save();
  if (maskId === 'clown') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.cheeks;
    ctx.beginPath();
    ctx.arc(cx - r * 0.5, cy + r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.5, cy + r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - r * 0.5, cy - r * 0.55, r, r * 0.15); /* red hair */
  } else if (maskId === 'troll') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.horns;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.8);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx - r * 0.8, cy - r * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.6, cy - r * 0.8);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.fillRect(cx - r * 0.4, cy + r * 0.3, r * 0.8, r * 0.15);
  } else if (maskId === 'anonymous') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyebrows;
    ctx.fillRect(cx - r * 0.5, cy - r * 0.35, r * 0.35, 2);
    ctx.fillRect(cx + r * 0.15, cy - r * 0.35, r * 0.35, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.smile;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy + r * 0.2);
    ctx.quadraticCurveTo(cx, cy + r * 0.55, cx + r * 0.35, cy + r * 0.2);
    ctx.stroke();
    ctx.fillStyle = c.cheeks;
    ctx.beginPath();
    ctx.arc(cx - r * 0.5, cy + r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.5, cy + r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'skull') {
    ctx.fillStyle = c.bone;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill(); /* nose */
    ctx.fillStyle = c.teeth;
    ctx.fillRect(cx - r * 0.35, cy + r * 0.4, r * 0.7, r * 0.12);
    ctx.fillStyle = c.shadow;
    for (var i = 0; i < 4; i++) ctx.fillRect(cx - r * 0.3 + i * r * 0.18, cy + r * 0.4, 1, r * 0.12); /* tooth gaps */
  } else if (maskId === 'demon') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.horns;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.5);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.marks;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.2);
    ctx.moveTo(cx + r * 0.5, cy);
    ctx.lineTo(cx + r * 0.15, cy + r * 0.2);
    ctx.stroke();
  } else if (maskId === 'cat') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ears;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.9);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.6, cy - r * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.7, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.6, cy - r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.05, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.whiskers;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.moveTo(cx - r * 0.15, cy + r * 0.2);
    ctx.lineTo(cx - r * 0.8, cy + r * 0.2);
    ctx.moveTo(cx + r * 0.15, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.moveTo(cx + r * 0.15, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.15, r * 0.08, r * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.25, cy - r * 0.15, r * 0.08, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'robot') {
    ctx.fillStyle = c.face;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = c.visor;
    ctx.fillRect(cx - r * 0.7, cy - r * 0.3, r * 1.4, r * 0.35);
    var scanX = cx - r * 0.6 + now / 20 % r * 1.2;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(scanX, cy - r * 0.3, 2, r * 0.35);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.antenna;
    ctx.fillRect(cx - 1, cy - r - 4, 2, 6);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy - r - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.fillRect(cx - r * 0.3, cy + r * 0.4, r * 0.6, 2);
    ctx.fillRect(cx - r * 0.3, cy + r * 0.5, r * 0.6, 2);
  } else if (maskId === 'ghost') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    /* Wavy bottom */
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.1, cy + r * 0.3);
    for (var w = 0; w < 6; w++) ctx.quadraticCurveTo(cx - r + w * r * 0.4, cy + r * (0.8 + Math.sin(now / 300 + w) * 0.15), cx - r + (w + 0.5) * r * 0.4, cy + r * 0.5);
    ctx.lineTo(cx + r * 1.1, cy + r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.3, cy - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'ninja') {
    ctx.fillStyle = c.wrap;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.band;
    ctx.fillRect(cx - r, cy + r * 0.55, r * 2, r * 0.25);
    ctx.fillStyle = c.eyes;
    ctx.fillRect(cx - r * 0.6, cy - r * 0.15, r * 1.2, r * 0.22);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'crown') {
    /* Crown sits on top of head, doesn't replace it */
    ctx.fillStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.6, cy - r * 1.1);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.7);
    ctx.lineTo(cx, cy - r * 1.2);
    ctx.lineTo(cx + r * 0.25, cy - r * 0.7);
    ctx.lineTo(cx + r * 0.6, cy - r * 1.1);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.jewel;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.85, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.arc(cx - r * 0.4, cy - r * 0.55, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.4, cy - r * 0.55, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.15);
  } else if (maskId === 'alien') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.1, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.2, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.3, cy - r * 0.2, r * 0.2, r * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.3, r * 0.15, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'pumpkin') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    /* Ridges */
    ctx.strokeStyle = '#CC5500';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.9);
    ctx.lineTo(cx - r * 0.5, cy + r * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.9);
    ctx.stroke();
    /* Face */
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.05);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy + r * 0.2);
    for (var t = 0; t < 5; t++) ctx.lineTo(cx - r * 0.4 + t * r * 0.2, cy + r * (t % 2 === 0 ? 0.2 : 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.stem;
    ctx.fillRect(cx - 2, cy - r * 1.1, 4, r * 0.2);
  } else if (maskId === 'rage') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    /* Angry brows */
    ctx.fillStyle = c.brows;
    ctx.save();
    ctx.translate(cx - r * 0.3, cy - r * 0.35);
    ctx.rotate(-0.3);
    ctx.fillRect(-r * 0.25, 0, r * 0.4, r * 0.08);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + r * 0.3, cy - r * 0.35);
    ctx.rotate(0.3);
    ctx.fillRect(-r * 0.15, 0, r * 0.4, r * 0.08);
    ctx.restore();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.08, r * 0.06, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.08, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    /* Veins */
    ctx.strokeStyle = c.veins;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.35, cy - r * 0.2);
    ctx.moveTo(cx + r * 0.6, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.2);
    ctx.stroke();
    /* Gritting teeth */
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - r * 0.35, cy + r * 0.3, r * 0.7, r * 0.15);
    ctx.fillStyle = '#1a1a1a';
    for (var _i13 = 0; _i13 < 5; _i13++) ctx.fillRect(cx - r * 0.3 + _i13 * r * 0.15, cy + r * 0.3, 1, r * 0.15);
  } else if (maskId === 'cool') {
    /* Sunglasses on top of normal face */
    ctx.fillStyle = c.frame;
    ctx.fillRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.08);
    ctx.fillStyle = c.lens;
    ctx.fillRect(cx - r * 0.7, cy - r * 0.25, r * 0.55, r * 0.35);
    ctx.fillRect(cx + r * 0.15, cy - r * 0.25, r * 0.55, r * 0.35);
    ctx.fillStyle = c.shine;
    ctx.fillRect(cx - r * 0.65, cy - r * 0.22, r * 0.15, r * 0.08);
    ctx.fillRect(cx + r * 0.2, cy - r * 0.22, r * 0.15, r * 0.08);
  } else if (maskId === 'monocle') {
    /* Monocle over right eye */
    ctx.strokeStyle = c.frame;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c.glass;
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    /* Chain */
    ctx.strokeStyle = c.chain;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.25, cy + r * 0.15);
    ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.5, cx + r * 0.1, cy + r * 0.7);
    ctx.stroke();
  }
  ctx.restore();
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
    color: '#8890b8'
  },
  miss: {
    xpMult: 0.3,
    yieldMult: 0,
    label: 'Miss!',
    color: '#ff5e6c'
  }
};

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

/* Generate a zone map. Town has buildings+paths. Combat zones have themed terrain. */
export function generateZoneMap(zoneId) {
  var zone = ZONES[zoneId];
  var W = zone.w,
    H = zone.h;
  var map = Array.from({
    length: H
  }, function () {
    return Array(W).fill(0);
  });
  var MX = Math.floor(W / 2),
    MY = Math.floor(H / 2);
  if (zoneId === 'town') {
    /* ═══ TOWN — paths, buildings, exits ═══ */
    /* Main cross paths */
    for (var x = 0; x < W; x++) {
      map[MY][x] = 1;
      map[MY + 1][x] = 1;
    }
    for (var y = 0; y < H; y++) {
      map[y][MX] = 1;
      map[y][MX + 1] = 1;
    }
    /* Ring path around center */
    var ringR = 8;
    for (var a = 0; a < 360; a += 1) {
      var rx = Math.round(MX + Math.cos(a * Math.PI / 180) * ringR);
      var ry = Math.round(MY + Math.sin(a * Math.PI / 180) * ringR);
      if (rx >= 0 && rx < W && ry >= 0 && ry < H) map[ry][rx] = 1;
    }
    /* Buildings */
    TOWN_BUILDINGS.forEach(function (b) {
      for (var dy = 0; dy < b.bh; dy++) for (var dx = 0; dx < b.bw; dx++) {
        var ty = b.by + dy,
          tx = b.bx + dx;
        if (ty >= 0 && ty < H && tx >= 0 && tx < W) map[ty][tx] = 3;
      }
    });
    /* Flowers near buildings */
    TOWN_BUILDINGS.forEach(function (b) {
      for (var i = 0; i < 6; i++) {
        var fx = b.bx + Math.floor(Math.random() * (b.bw + 4)) - 2;
        var fy = b.by + b.bh + Math.floor(Math.random() * 2);
        if (fx >= 0 && fx < W && fy >= 0 && fy < H && map[fy][fx] === 0) map[fy][fx] = 5;
      }
    });
    /* Exit paths — wider paths leading to zone edges */
    TOWN_EXITS.forEach(function (ex) {
      if (ex.dir === 'north') for (var _y = 0; _y < MY; _y++) {
        map[_y][ex.tx] = 1;
        map[_y][ex.tx + 1] = 1;
      }
      if (ex.dir === 'south') for (var _y2 = MY; _y2 < H; _y2++) {
        map[_y2][ex.tx] = 1;
        map[_y2][ex.tx + 1] = 1;
      }
      if (ex.dir === 'east') for (var _x = MX; _x < W; _x++) {
        map[ex.ty][_x] = 1;
        map[ex.ty + 1][_x] = 1;
      }
      if (ex.dir === 'west') for (var _x2 = 0; _x2 < MX; _x2++) {
        map[ex.ty][_x2] = 1;
        map[ex.ty + 1][_x2] = 1;
      }
      /* Exit marker tile (type 8 = exit) */
      if (ex.dir === 'north') {
        map[0][ex.tx] = 8;
        map[0][ex.tx + 1] = 8;
      }
      if (ex.dir === 'south') {
        map[H - 1][ex.tx] = 8;
        map[H - 1][ex.tx + 1] = 8;
      }
      if (ex.dir === 'east') {
        map[ex.ty][W - 1] = 8;
        map[ex.ty + 1][W - 1] = 8;
      }
      if (ex.dir === 'west') {
        map[ex.ty][0] = 8;
        map[ex.ty + 1][0] = 8;
      }
    });
    /* Scattered trees */
    for (var i = 0; i < 30; i++) {
      var tx = Math.floor(Math.random() * W),
        ty = Math.floor(Math.random() * H);
      if (map[ty][tx] === 0) map[ty][tx] = 4;
    }
    /* Pond near center */
    for (var dy = -2; dy <= 2; dy++) for (var dx = -3; dx <= 3; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) < 2.8) {
        var py = MY - 5 + dy,
          px = MX + 8 + dx;
        if (py >= 0 && py < H && px >= 0 && px < W && map[py][px] === 0) map[py][px] = 2;
      }
    }
  } else if (zoneId === 'wasteland') {
    /* ═══ WASTELAND — lawless PvP zone ═══ */
    /* Safe spawn pad in bottom-center, surrounded by fence (tile 11) */
    var padX = MX - 4,
      padY = H - 10,
      padW = 9,
      padH = 6;

    /* Ground is barren wasteland */
    for (var _y3 = 0; _y3 < H; _y3++) for (var _x3 = 0; _x3 < W; _x3++) {
      if (Math.random() < 0.15) map[_y3][_x3] = 7; /* scattered rocks */else if (Math.random() < 0.03) map[_y3][_x3] = 6; /* sand patches */
    }

    /* Spawn pad — path tiles (safe area) */
    for (var _dy = 0; _dy < padH; _dy++) for (var _dx = 0; _dx < padW; _dx++) {
      map[padY + _dy][padX + _dx] = 1;
    }

    /* Fence around spawn pad — tile 11 (new: fence) */
    for (var _dx2 = -1; _dx2 <= padW; _dx2++) {
      if (padX + _dx2 >= 0 && padX + _dx2 < W) {
        map[padY - 1][padX + _dx2] = 11;
        map[padY + padH][padX + _dx2] = 11;
      }
    }
    for (var _dy2 = -1; _dy2 <= padH; _dy2++) {
      if (padY + _dy2 >= 0 && padY + _dy2 < H) {
        map[padY + _dy2][padX - 1] = 11;
        map[padY + _dy2][padX + padW] = 11;
      }
    }

    /* Gate opening — front of fence (north side, center) */
    map[padY - 1][MX] = 12; /* gate tile — climbable */
    map[padY - 1][MX + 1] = 12;

    /* Path from gate into the wasteland */
    for (var _y4 = 0; _y4 < padY - 1; _y4++) {
      map[_y4][MX] = 1;
      map[_y4][MX + 1] = 1;
    }

    /* Return exit at bottom edge */
    map[H - 1][MX] = 9;
    map[H - 1][MX + 1] = 9;

    /* Store fence bounds for lawless check */
    ZONES.wasteland._safePad = {
      x: padX * TILE,
      y: padY * TILE,
      w: padW * TILE,
      h: padH * TILE
    };
    ZONES.wasteland._gateY = (padY - 1) * TILE;
  } else if (zoneId === 'farm_home') {
    /* ═══ PERSONAL FARM — house, plots, garden, path to exit ═══ */
    /* Grass everywhere */
    for (var _y5 = 0; _y5 < H; _y5++) for (var _x4 = 0; _x4 < W; _x4++) map[_y5][_x4] = 0;

    /* Path from entrance (south) to house (north-center) */
    for (var _y6 = 3; _y6 < H; _y6++) {
      map[_y6][MX] = 1;
      map[_y6][MX + 1] = 1;
    }

    /* House — 5x4 building tiles in upper area */
    var hx = MX - 2,
      hy = 3;
    for (var _dy3 = 0; _dy3 < 4; _dy3++) for (var _dx3 = 0; _dx3 < 5; _dx3++) map[hy + _dy3][hx + _dx3] = 3;
    /* House door — walkable path tile at center bottom */
    map[hy + 3][MX] = 1;
    map[hy + 3][MX + 1] = 1;

    /* Farm plots — 3x2 grid of sand tiles (tilled soil) on the left */
    for (var _py = 0; _py < 3; _py++) for (var _px = 0; _px < 4; _px++) {
      var fx = 3 + _px,
        fy = 10 + _py * 3;
      for (var _dy4 = 0; _dy4 < 2; _dy4++) for (var _dx4 = 0; _dx4 < 3; _dx4++) {
        if (fy + _dy4 < H && fx + _dx4 < W) map[fy + _dy4][fx + _dx4] = 6;
      }
    }

    /* Garden — flower tiles on the right */
    for (var gy = 10; gy < 18; gy++) for (var gx = W - 8; gx < W - 3; gx++) {
      if (Math.random() < 0.6) map[gy][gx] = 5;
    }

    /* Fence border — trees around edges */
    for (var _x5 = 0; _x5 < W; _x5++) {
      map[0][_x5] = 4;
      map[1][_x5] = 4;
      map[H - 1][_x5] = 4;
    }
    for (var _y7 = 0; _y7 < H; _y7++) {
      map[_y7][0] = 4;
      map[_y7][1] = 4;
      map[_y7][W - 1] = 4;
      map[_y7][W - 2] = 4;
    }

    /* Return exit at bottom */
    map[H - 1][MX] = 9;
    map[H - 1][MX + 1] = 9;
    map[H - 2][MX] = 1;
    map[H - 2][MX + 1] = 1;

    /* Water feature — small pond */
    for (var _dy5 = -1; _dy5 <= 1; _dy5++) for (var _dx5 = -2; _dx5 <= 2; _dx5++) {
      var px2 = W - 6 + _dx5,
        py2 = 6 + _dy5;
      if (px2 > 1 && px2 < W - 2 && py2 > 1 && py2 < H - 2 && _dx5 * _dx5 + _dy5 * _dy5 * 2 < 6) map[py2][px2] = 2;
    }

    /* Store house location for sleep mechanic */
    ZONES.farm_home._house = {
      x: (hx + 2) * TILE,
      y: (hy + 2) * TILE,
      w: 5 * TILE,
      h: 4 * TILE
    };

    /* §DNG — Dungeon Workshop building (right side of farm) */
    var dwx = W - 8,
      dwy = 10;
    for (var _dy6 = 0; _dy6 < 3; _dy6++) for (var _dx6 = 0; _dx6 < 4; _dx6++) map[dwy + _dy6][dwx + _dx6] = 7;
    /* Door at center bottom */
    map[dwy + 2][dwx + 1] = 1;
    map[dwy + 2][dwx + 2] = 1;
    ZONES.farm_home._workshop = {
      x: (dwx + 2) * TILE,
      y: (dwy + 1) * TILE,
      w: 4 * TILE,
      h: 3 * TILE
    };

    /* §PET — Pet House (left side of farm, below plots) */
    var phx = 3,
      phy = 19;
    for (var _dy7 = 0; _dy7 < 3; _dy7++) for (var _dx7 = 0; _dx7 < 4; _dx7++) map[phy + _dy7][phx + _dx7] = 7;
    map[phy + 2][phx + 1] = 1;
    map[phy + 2][phx + 2] = 1; /* door */
    /* Pet pen — fenced grass area next to pet house */
    for (var _dy8 = 0; _dy8 < 3; _dy8++) for (var _dx8 = 0; _dx8 < 5; _dx8++) {
      if (phy + _dy8 < H - 1 && phx + 5 + _dx8 < W - 2) map[phy + _dy8][phx + 5 + _dx8] = 5; /* flower/grass pen */
    }
    ZONES.farm_home._petHouse = {
      x: (phx + 2) * TILE,
      y: (phy + 1) * TILE,
      w: 4 * TILE,
      h: 3 * TILE
    };

    /* §MINI — Minigame Arena (center-right of farm) */
    var max = W - 8,
      may = 5;
    for (var _dy9 = 0; _dy9 < 4; _dy9++) for (var _dx9 = 0; _dx9 < 5; _dx9++) {
      if (may + _dy9 < H - 1 && max + _dx9 < W - 2) map[may + _dy9][max + _dx9] = 1; /* path/arena floor */
    }
    /* Arena border */
    for (var _dx0 = -1; _dx0 <= 5; _dx0++) {
      if (may - 1 >= 0 && max + _dx0 >= 0 && max + _dx0 < W) map[may - 1][max + _dx0] = 7;
      if (may + 4 < H && max + _dx0 >= 0 && max + _dx0 < W) map[may + 4][max + _dx0] = 7;
    }
    for (var _dy0 = -1; _dy0 <= 4; _dy0++) {
      if (max - 1 >= 0 && may + _dy0 >= 0 && may + _dy0 < H) map[may + _dy0][max - 1] = 7;
      if (max + 5 < W && may + _dy0 >= 0 && may + _dy0 < H) map[may + _dy0][max + 5] = 7;
    }
    /* Entrance */
    map[may + 4][max + 2] = 1;
    ZONES.farm_home._minigameArena = {
      x: (max + 2) * TILE,
      y: (may + 2) * TILE,
      w: 5 * TILE,
      h: 4 * TILE
    };
  } else {
    /* ═══ COMBAT ZONE — single entrance (south), dungeon at far north ═══ */
    var elem = zone.element;

    /* All edges are walls (tile 7 = rock/wall) except south entrance */
    for (var _x6 = 0; _x6 < W; _x6++) {
      map[0][_x6] = 7;
      map[H - 1][_x6] = 7;
    }
    for (var _y8 = 0; _y8 < H; _y8++) {
      map[_y8][0] = 7;
      map[_y8][W - 1] = 7;
    }

    /* South entrance — 4-tile-wide gap in the south wall = return to town (tile 9) */
    for (var _dx1 = -2; _dx1 <= 1; _dx1++) {
      map[H - 1][MX + _dx1] = 9;
      map[H - 2][MX + _dx1] = 1; /* path leading in */
    }

    /* Main road from south entrance to dungeon at north */
    for (var _y9 = 2; _y9 < H - 2; _y9++) {
      map[_y9][MX] = 1;
      map[_y9][MX + 1] = 1;
    }

    /* Side paths branching off the main road */
    var branchYs = [Math.floor(H * 0.3), Math.floor(H * 0.5), Math.floor(H * 0.7)];
    branchYs.forEach(function (by) {
      /* Left branch */
      for (var _x7 = 3; _x7 < MX; _x7++) map[by][_x7] = 1;
      /* Right branch */
      for (var _x8 = MX + 2; _x8 < W - 3; _x8++) map[by][_x8] = 1;
    });

    /* Dungeon entrance (tile 10) at the far north end of the road */
    var dungX = MX,
      dungY = 2;
    map[dungY][dungX] = 10;
    map[dungY][dungX + 1] = 10;
    /* Short path to dungeon */
    map[dungY + 1][dungX] = 1;
    map[dungY + 1][dungX + 1] = 1;

    /* ═══ ZONE-SPECIFIC TERRAIN PATTERNS ═══ */
    /* Seeded random for consistent terrain per zone */
    var _seed = zoneId.split('').reduce(function (a, c) {
      return a + c.charCodeAt(0);
    }, 0);
    var _sr = function _sr(i) {
      var s = _seed * 9301 + i * 49297 + 49831;
      s = (s * s >>> 0) % 233280;
      return s / 233280;
    };
    var _si = 0;
    var sr = function sr() {
      return _sr(_si++);
    };
    if (elem === 'flame') {
      /* EMBER FIELDS: Lava rivers cutting through scorched earth, volcanic rock clusters */
      /* Lava rivers — sinuous water-tile streams (rendered as lava via zone tinting) */
      for (var rv = 0; rv < 3; rv++) {
        var _rx = Math.floor(sr() * W * 0.6) + Math.floor(W * 0.2);
        var _ry = 2;
        while (_ry < H - 2) {
          if (map[_ry][_rx] === 0) map[_ry][_rx] = 2; /* lava = water tile tinted by zone */
          if (_rx > 1 && map[_ry][_rx - 1] === 0) map[_ry][_rx - 1] = 2;
          _rx += Math.floor(sr() * 3) - 1;
          _rx = Math.max(2, Math.min(W - 3, _rx));
          _ry++;
        }
      }
      /* Volcanic rock clusters — irregular stone blobs */
      for (var vc = 0; vc < 8; vc++) {
        var vcx = Math.floor(sr() * (W - 8)) + 4,
          vcy = Math.floor(sr() * (H - 8)) + 4;
        var vcr = 2 + Math.floor(sr() * 2);
        for (var _dy1 = -vcr; _dy1 <= vcr; _dy1++) for (var _dx10 = -vcr; _dx10 <= vcr; _dx10++) {
          if (Math.sqrt(_dx10 * _dx10 + _dy1 * _dy1) <= vcr + sr() * 0.8) {
            var _ty = vcy + _dy1,
              _tx = vcx + _dx10;
            if (_ty > 0 && _ty < H - 1 && _tx > 0 && _tx < W - 1 && map[_ty][_tx] === 0) map[_ty][_tx] = 7;
          }
        }
      }
      /* Charred stumps (sparse trees) */
      for (var _i14 = 0; _i14 < 8; _i14++) {
        var _map$_ty;
        var _tx2 = Math.floor(sr() * W),
          _ty2 = Math.floor(sr() * H);
        if (((_map$_ty = map[_ty2]) === null || _map$_ty === void 0 ? void 0 : _map$_ty[_tx2]) === 0) map[_ty2][_tx2] = 4;
      }
    } else if (elem === 'frost') {
      /* FROZEN SHORE: Large ice sheets (water), snow drifts (sand), frozen trees */
      /* Ice lake — large frozen body of water in center-west */
      var iceX = Math.floor(W * 0.25),
        iceY = Math.floor(H * 0.3);
      for (var _dy10 = -6; _dy10 <= 6; _dy10++) for (var _dx11 = -8; _dx11 <= 8; _dx11++) {
        if (_dx11 * _dx11 / (8 * 8) + _dy10 * _dy10 / (6 * 6) < 1 + sr() * 0.2) {
          var _ty3 = iceY + _dy10,
            _tx3 = iceX + _dx11;
          if (_ty3 > 0 && _ty3 < H - 1 && _tx3 > 0 && _tx3 < W - 1 && map[_ty3][_tx3] === 0) map[_ty3][_tx3] = 2;
        }
      }
      /* Snow drifts (sand tiles rendered white via zone) — windswept banks */
      for (var sd = 0; sd < 12; sd++) {
        var sx2 = Math.floor(sr() * W),
          sy2 = Math.floor(sr() * H);
        for (var _dx12 = -3; _dx12 <= 3; _dx12++) for (var _dy11 = -1; _dy11 <= 1; _dy11++) {
          var _tx4 = sx2 + _dx12,
            _ty4 = sy2 + _dy11;
          if (_ty4 > 0 && _ty4 < H - 1 && _tx4 > 0 && _tx4 < W - 1 && map[_ty4][_tx4] === 0) map[_ty4][_tx4] = 6;
        }
      }
      /* Frozen trees — sparse, along edges */
      for (var _i15 = 0; _i15 < 15; _i15++) {
        var _map$_ty2;
        var _tx5 = Math.floor(sr() * W),
          _ty5 = Math.floor(sr() * H);
        if (((_map$_ty2 = map[_ty5]) === null || _map$_ty2 === void 0 ? void 0 : _map$_ty2[_tx5]) === 0) map[_ty5][_tx5] = 4;
      }
      /* Scattered ice patches */
      for (var _i16 = 0; _i16 < 20; _i16++) {
        var _map$_ty3;
        var _tx6 = Math.floor(sr() * W),
          _ty6 = Math.floor(sr() * H);
        if (((_map$_ty3 = map[_ty6]) === null || _map$_ty3 === void 0 ? void 0 : _map$_ty3[_tx6]) === 0) map[_ty6][_tx6] = 2;
      }
    } else if (elem === 'venom') {
      /* MISTWOOD: Dense canopy with winding paths through bogs */
      /* Dense tree clusters forming walls */
      for (var tc = 0; tc < 12; tc++) {
        var tcx = Math.floor(sr() * (W - 6)) + 3,
          tcy = Math.floor(sr() * (H - 6)) + 3;
        var tcr = 2 + Math.floor(sr() * 3);
        for (var _dy12 = -tcr; _dy12 <= tcr; _dy12++) for (var _dx13 = -tcr; _dx13 <= tcr; _dx13++) {
          if (Math.abs(_dx13) + Math.abs(_dy12) <= tcr + Math.floor(sr() * 2)) {
            var _ty7 = tcy + _dy12,
              _tx7 = tcx + _dx13;
            if (_ty7 > 0 && _ty7 < H - 1 && _tx7 > 0 && _tx7 < W - 1 && map[_ty7][_tx7] === 0) map[_ty7][_tx7] = 4;
          }
        }
      }
      /* Bog pools — small murky water patches */
      for (var bp = 0; bp < 8; bp++) {
        var bpx = Math.floor(sr() * (W - 4)) + 2,
          bpy = Math.floor(sr() * (H - 4)) + 2;
        for (var _dy13 = -1; _dy13 <= 1; _dy13++) for (var _dx14 = -2; _dx14 <= 2; _dx14++) {
          if (Math.abs(_dx14) + Math.abs(_dy13) <= 2) {
            var _ty8 = bpy + _dy13,
              _tx8 = bpx + _dx14;
            if (_ty8 > 0 && _ty8 < H - 1 && _tx8 > 0 && _tx8 < W - 1 && map[_ty8][_tx8] === 0) map[_ty8][_tx8] = 2;
          }
        }
      }
      /* Mushroom meadows (flowers) */
      for (var _i17 = 0; _i17 < 15; _i17++) {
        var _map$_ty4;
        var _tx9 = Math.floor(sr() * W),
          _ty9 = Math.floor(sr() * H);
        if (((_map$_ty4 = map[_ty9]) === null || _map$_ty4 === void 0 ? void 0 : _map$_ty4[_tx9]) === 0) map[_ty9][_tx9] = 5;
      }
    } else if (elem === 'storm') {
      /* THUNDER PEAKS: Rocky mountain ridges, open plateaus, lightning-scarred ground */
      /* Mountain ridges — long horizontal stone bands */
      for (var ridge = 0; ridge < 4; ridge++) {
        var ry2 = Math.floor(H * 0.15) + Math.floor(sr() * H * 0.7);
        var rxStart = Math.floor(sr() * Math.floor(W * 0.3));
        var rxEnd = rxStart + Math.floor(W * 0.3) + Math.floor(sr() * Math.floor(W * 0.4));
        for (var _rx2 = rxStart; _rx2 < Math.min(rxEnd, W - 1); _rx2++) {
          var thickness = 1 + Math.floor(sr() * 2);
          for (var t = 0; t < thickness; t++) {
            var _ty0 = ry2 + t;
            if (_ty0 > 0 && _ty0 < H - 1 && _rx2 > 0 && map[_ty0][_rx2] === 0) map[_ty0][_rx2] = 7;
          }
        }
      }
      /* Scattered boulders */
      for (var _i18 = 0; _i18 < 15; _i18++) {
        var _map$_ty5;
        var _tx0 = Math.floor(sr() * W),
          _ty1 = Math.floor(sr() * H);
        if (((_map$_ty5 = map[_ty1]) === null || _map$_ty5 === void 0 ? void 0 : _map$_ty5[_tx0]) === 0) map[_ty1][_tx0] = 7;
      }
      /* Lightning-blasted trees (sparse) */
      for (var _i19 = 0; _i19 < 6; _i19++) {
        var _map$_ty6;
        var _tx1 = Math.floor(sr() * W),
          _ty10 = Math.floor(sr() * H);
        if (((_map$_ty6 = map[_ty10]) === null || _map$_ty6 === void 0 ? void 0 : _map$_ty6[_tx1]) === 0) map[_ty10][_tx1] = 4;
      }
    } else if (elem === 'stone') {
      /* DEEP HOLLOWS: Cave walls funneling paths, crystal deposits, stalagmites */
      /* Cave wall borders — thick stone perimeter leaving inner cavern */
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
        if (map[y2][x2] !== 0) continue;
        var edgeDist = Math.min(x2, y2, W - 1 - x2, H - 1 - y2);
        if (edgeDist < 3 + Math.floor(sr() * 3)) {
          map[y2][x2] = 7; /* cave wall */
        }
      }
      /* Stalagmite clusters — scattered stone pillars inside */
      for (var sg = 0; sg < 12; sg++) {
        var _map$sgy, _map;
        var sgx = 5 + Math.floor(sr() * (W - 10)),
          sgy = 5 + Math.floor(sr() * (H - 10));
        if (((_map$sgy = map[sgy]) === null || _map$sgy === void 0 ? void 0 : _map$sgy[sgx]) === 0) map[sgy][sgx] = 7;
        if (((_map = map[sgy - 1]) === null || _map === void 0 ? void 0 : _map[sgx]) === 0) map[sgy - 1][sgx] = 7;
      }
      /* Crystal deposits (flowers rendered as crystals via zone) */
      for (var _i20 = 0; _i20 < 10; _i20++) {
        var _map$_ty7;
        var _tx10 = 5 + Math.floor(sr() * (W - 10)),
          _ty11 = 5 + Math.floor(sr() * (H - 10));
        if (((_map$_ty7 = map[_ty11]) === null || _map$_ty7 === void 0 ? void 0 : _map$_ty7[_tx10]) === 0) map[_ty11][_tx10] = 5;
      }
    } else if (elem === 'wind') {
      /* SKY REACHES: Wide open plateaus, cloud wisps (flowers), floating island gaps */
      /* Cloud patches (flowers) — large clusters */
      for (var cp = 0; cp < 10; cp++) {
        var cpx = Math.floor(sr() * W),
          cpy = Math.floor(sr() * H);
        var cpr = 2 + Math.floor(sr() * 3);
        for (var _dy14 = -cpr; _dy14 <= cpr; _dy14++) for (var _dx15 = -cpr * 2; _dx15 <= cpr * 2; _dx15++) {
          if (_dx15 * _dx15 / (cpr * cpr * 4) + _dy14 * _dy14 / (cpr * cpr) < 1) {
            var _ty12 = cpy + _dy14,
              _tx11 = cpx + _dx15;
            if (_ty12 > 0 && _ty12 < H - 1 && _tx11 > 0 && _tx11 < W - 1 && map[_ty12][_tx11] === 0) map[_ty12][_tx11] = 5;
          }
        }
      }
      /* Floating island gaps — water chasms */
      for (var g = 0; g < 3; g++) {
        var _gx = Math.floor(sr() * (W - 6)) + 3,
          _gy = Math.floor(sr() * (H - 6)) + 3;
        for (var _dy15 = -2; _dy15 <= 2; _dy15++) for (var _dx16 = -4; _dx16 <= 4; _dx16++) {
          if (Math.abs(_dx16 * _dy15) < 6) {
            var _ty13 = _gy + _dy15,
              _tx12 = _gx + _dx16;
            if (_ty13 > 0 && _ty13 < H - 1 && _tx12 > 0 && _tx12 < W - 1 && map[_ty13][_tx12] === 0) map[_ty13][_tx12] = 2;
          }
        }
      }
      /* Very sparse wind-bent trees */
      for (var _i21 = 0; _i21 < 5; _i21++) {
        var _map$_ty8;
        var _tx13 = Math.floor(sr() * W),
          _ty14 = Math.floor(sr() * H);
        if (((_map$_ty8 = map[_ty14]) === null || _map$_ty8 === void 0 ? void 0 : _map$_ty8[_tx13]) === 0) map[_ty14][_tx13] = 4;
      }
    } else if (elem === 'water') {
      /* TIDAL CAVES: Coastline with sand/water gradients, coral formations, tidal pools */
      /* Large tidal pool in upper area */
      var poolX = Math.floor(W * 0.5),
        poolY = Math.floor(H * 0.25);
      for (var _dy16 = -5; _dy16 <= 5; _dy16++) for (var _dx17 = -10; _dx17 <= 10; _dx17++) {
        if (_dx17 * _dx17 / (10 * 10) + _dy16 * _dy16 / (5 * 5) < 1 + sr() * 0.15) {
          var _ty15 = poolY + _dy16,
            _tx14 = poolX + _dx17;
          if (_ty15 > 0 && _ty15 < H - 1 && _tx14 > 0 && _tx14 < W - 1 && map[_ty15][_tx14] === 0) map[_ty15][_tx14] = 2;
        }
      }
      /* Sandy beach borders around water */
      for (var _y0 = 1; _y0 < H - 1; _y0++) for (var _x9 = 1; _x9 < W - 1; _x9++) {
        if (map[_y0][_x9] !== 0) continue;
        var nearWater = false;
        for (var _dy17 = -1; _dy17 <= 1; _dy17++) for (var _dx18 = -1; _dx18 <= 1; _dx18++) {
          var _map2;
          if (((_map2 = map[_y0 + _dy17]) === null || _map2 === void 0 ? void 0 : _map2[_x9 + _dx18]) === 2) nearWater = true;
        }
        if (nearWater && sr() < 0.6) map[_y0][_x9] = 6;
      }
      /* Coral formations (stone) */
      for (var _i22 = 0; _i22 < 8; _i22++) {
        var _map$_ty9;
        var _tx15 = Math.floor(sr() * W),
          _ty16 = Math.floor(sr() * H);
        if (((_map$_ty9 = map[_ty16]) === null || _map$_ty9 === void 0 ? void 0 : _map$_ty9[_tx15]) === 0) map[_ty16][_tx15] = 7;
      }
      /* Seaweed patches (trees) */
      for (var _i23 = 0; _i23 < 10; _i23++) {
        var _map$_ty0;
        var _tx16 = Math.floor(sr() * W),
          _ty17 = Math.floor(sr() * H);
        if (((_map$_ty0 = map[_ty17]) === null || _map$_ty0 === void 0 ? void 0 : _map$_ty0[_tx16]) === 0) map[_ty17][_tx16] = 4;
      }
      /* Extra scattered water */
      for (var _i24 = 0; _i24 < 25; _i24++) {
        var _map$_ty1;
        var _tx17 = Math.floor(sr() * W),
          _ty18 = Math.floor(sr() * H);
        if (((_map$_ty1 = map[_ty18]) === null || _map$_ty1 === void 0 ? void 0 : _map$_ty1[_tx17]) === 0 && sr() < 0.5) map[_ty18][_tx17] = 2;
      }
    } else if (elem === 'dark') {
      /* SHADOW SANCTUM: Void cracks, ritual circles, oppressive dark trees */
      /* Dense shadow trees — clustered walls */
      for (var _tc = 0; _tc < 15; _tc++) {
        var _tcx = Math.floor(sr() * (W - 4)) + 2,
          _tcy = Math.floor(sr() * (H - 4)) + 2;
        var _tcr = 1 + Math.floor(sr() * 2);
        for (var _dy18 = -_tcr; _dy18 <= _tcr; _dy18++) for (var _dx19 = -_tcr; _dx19 <= _tcr; _dx19++) {
          if (_dx19 * _dx19 + _dy18 * _dy18 <= _tcr * _tcr + 1) {
            var _ty19 = _tcy + _dy18,
              _tx18 = _tcx + _dx19;
            if (_ty19 > 0 && _ty19 < H - 1 && _tx18 > 0 && _tx18 < W - 1 && map[_ty19][_tx18] === 0) map[_ty19][_tx18] = 4;
          }
        }
      }
      /* Void cracks — thin water (rendered as void via zone) */
      for (var _vc = 0; _vc < 4; _vc++) {
        var vx = 2 + Math.floor(sr() * (W - 4)),
          vy = 2 + Math.floor(sr() * (H - 4));
        for (var step = 0; step < 12; step++) {
          if (vy > 0 && vy < H - 1 && vx > 0 && vx < W - 1 && map[vy][vx] === 0) map[vy][vx] = 2;
          vx += Math.floor(sr() * 3) - 1;
          vy += Math.floor(sr() * 3) - 1;
          vx = Math.max(1, Math.min(W - 2, vx));
          vy = Math.max(1, Math.min(H - 2, vy));
        }
      }
      /* Dark ritual altars (stone) */
      for (var _i25 = 0; _i25 < 6; _i25++) {
        var _map$_ty10;
        var _tx19 = Math.floor(sr() * W),
          _ty20 = Math.floor(sr() * H);
        if (((_map$_ty10 = map[_ty20]) === null || _map$_ty10 === void 0 ? void 0 : _map$_ty10[_tx19]) === 0) map[_ty20][_tx19] = 7;
      }
    } else if (elem === 'light') {
      /* RADIANT HEIGHTS: Crystal spires, golden meadows, symmetrical clearings */
      /* Golden meadow patches (flowers) — large circles */
      for (var gm = 0; gm < 8; gm++) {
        var gmx = Math.floor(sr() * (W - 6)) + 3,
          gmy = Math.floor(sr() * (H - 6)) + 3;
        var gmr = 2 + Math.floor(sr() * 2);
        for (var _dy19 = -gmr; _dy19 <= gmr; _dy19++) for (var _dx20 = -gmr; _dx20 <= gmr; _dx20++) {
          if (_dx20 * _dx20 + _dy19 * _dy19 <= gmr * gmr) {
            var _ty21 = gmy + _dy19,
              _tx20 = gmx + _dx20;
            if (_ty21 > 0 && _ty21 < H - 1 && _tx20 > 0 && _tx20 < W - 1 && map[_ty21][_tx20] === 0) map[_ty21][_tx20] = 5;
          }
        }
      }
      /* Crystal spires (stone — rendered as light pillars) */
      for (var cs = 0; cs < 10; cs++) {
        var _map$csy;
        var csx = Math.floor(sr() * (W - 4)) + 2,
          csy = Math.floor(sr() * (H - 4)) + 2;
        if (((_map$csy = map[csy]) === null || _map$csy === void 0 ? void 0 : _map$csy[csx]) === 0) {
          map[csy][csx] = 7;
          if (csy > 1 && map[csy - 1][csx] === 0) map[csy - 1][csx] = 7;
        }
      }
      /* Sparse white trees */
      for (var _i26 = 0; _i26 < 8; _i26++) {
        var _map$_ty11;
        var _tx21 = Math.floor(sr() * W),
          _ty22 = Math.floor(sr() * H);
        if (((_map$_ty11 = map[_ty22]) === null || _map$_ty11 === void 0 ? void 0 : _map$_ty11[_tx21]) === 0) map[_ty22][_tx21] = 4;
      }
    } else {
      /* MEADOW / fallback: gentle rolling terrain */
      for (var _y1 = 0; _y1 < H; _y1++) for (var _x0 = 0; _x0 < W; _x0++) {
        if (map[_y1][_x0] !== 0) continue;
        if (sr() < 0.04) map[_y1][_x0] = 4; /* trees */else if (sr() < 0.03) map[_y1][_x0] = 5; /* flowers */else if (sr() < 0.02) map[_y1][_x0] = 2; /* ponds */
      }
    }
  }
  return map;
}

/* Tile rendering colors — indexed by tile type */
export const TILE_COLORS_BASE = {
  0: '#2d5a1e',
  /* grass */
  1: '#8b7355',
  /* path */
  2: '#2a6ca8',
  /* water */
  3: '#4a3a5c',
  /* building */
  4: '#1a4a12',
  /* tree */
  5: '#2d5a1e',
  /* flower (grass base) */
  6: '#d4b483',
  /* sand */
  7: '#6b6b6b',
  /* stone/mountain */
  8: '#5b52ff',
  /* zone exit (glowing) */
  9: '#3dd497',
  /* return exit (glowing) */
  10: '#ff5e6c',
  /* dungeon entrance (glowing red) */
  11: '#4a4a4a',
  /* fence (solid barrier) */
  12: '#6a5a3a',
  /* gate (climbable fence opening) */
  13: '#7a5a3a',
  /* house building (farm) */
  14: '#5a4a2a',
  /* farm plot (plantable) */
  15: '#6a4a5a' /* bed (sleep to recharge) */
};

/* Get zone-tinted tile color */
export function getTileColor(tile, zoneId) {
  var zone = ZONES[zoneId];
  if (!zone) return TILE_COLORS_BASE[tile] || '#2d5a1e';
  if (tile === 0) return zone.palette.ground;
  if (tile === 1) return zone.palette.path;
  return TILE_COLORS_BASE[tile] || zone.palette.ground;
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
      var lvl = Math.max(1, Math.round(baseLvl + depthPct * (maxLvl - baseLvl)));
      var m = createMonster('m-' + zone.id + '-' + idx, arch, lvl, x, y, zone.element);
      m.curHp = m.hp;
      m.type = arch;
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
export const TILE_COLORS = TILE_COLORS_BASE;
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
export const LEVEL_CAP = 100;

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

/* Get the stat name for display */
export const STAT_LABELS = {
  power: 'Power',
  vitality: 'Vitality',
  endurance: 'Endurance',
  agility: 'Agility',
  mind: 'Mind'
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
    base: 48,
    speed: 0.7,
    range: 50,
    type: 'melee',
    arc: Math.PI * 0.85,
    label: 'Greatsword',
    emoji: '⚔️'
  },
  sword: {
    base: 32,
    speed: 1.4,
    range: 40,
    type: 'melee',
    arc: Math.PI * 0.6,
    label: 'Sword',
    emoji: '🗡️'
  },
  bow: {
    base: 35,
    speed: 1.2,
    range: 200,
    type: 'ranged',
    label: 'Bow',
    emoji: '🏹'
  },
  staff: {
    base: 41,
    speed: 1.0,
    range: 120,
    type: 'ranged',
    aoeCap: 3,
    aoeCone: Math.PI / 4,
    label: 'Staff',
    emoji: '🪄'
  }
};

/* §4.6 Rarity Tiers */
export const RARITY_TIERS = {
  common: {
    mult: 1.00,
    color: '#8890b8',
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
  /* §2.6 Influence — increases CC duration applied by player */
  var influenceBonus = source !== null && source !== void 0 && source._rpgInfluence ? 1 + source._rpgInfluence * 0.003 : 1.0;
  target.statuses[statusId] = {
    id: statusId,
    remaining: def.dur * influenceBonus,
    maxDur: (def.maxDur || def.dur) * influenceBonus,
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

/* Tick all statuses on a target. Applies DoT damage. Returns array of expired status IDs. */
export function tickStatuses(target, dt, now, rpg) {
  if (!target.statuses) return [];
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
      if (dotDmg > 0) {
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

  /* §3.5 Mana restore */
  var manaRestored = 0;
  if (rpg && now - (source._lastCollisionMana || 0) >= 3000) {
    source._lastCollisionMana = now;
    var baseRestore = 0.04 * rpg.maxMana;
    var restMult = 1 + (rpg.restoration || 0) * 0.0012;
    manaRestored = Math.round(baseRestore * restMult * streakMult);
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
  }
};

/* Spawn a monster instance from archetype + zone level */
export function createMonster(id, archetype, level, x, y, element) {
  var a = ARCHETYPES[archetype];
  var baseHp = monsterStat(60, level, 1.065, 1.035, 1.025);
  var baseDmg = monsterStat(12, level, 1.045, 1.025, 1.018);
  var baseXp = monsterStat(10, level, 1.045, 1.025, 1.018);
  var baseGold = monsterStat(5, level, 1.035, 1.020, 1.015);
  return {
    id: id,
    archetype: archetype,
    level: level,
    element: element || null,
    hp: Math.ceil(baseHp * a.hpMult),
    maxHp: Math.ceil(baseHp * a.hpMult),
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
export function calcMaxHp(level, vitality) {
  return 100 + (level - 1) * 12 + vitality * 10;
}
export function calcMaxStam(endurance) {
  return 100 + endurance * 3.0;
}
export function calcMaxMana(mind) {
  return 100 + mind * 3.5;
}

/* §4.4 Weapon Damage */
export function calcWeaponDmg(weaponType, power, tierMult) {
  var w = WEAPON_TYPES[weaponType];
  var base = (w.base + power * 0.8) * tierMult;
  if (weaponType === 'staff') return base * (0.5 + Math.random() * 0.8); /* wide variance, lower avg DPS */
  return base;
}

/* §2.1 Crit */
export function calcCritChance(ferocity) {
  if (ferocity <= 300) return 60 * ferocity / (ferocity + 120) / 100;
  var baseAt300 = 60 * 300 / (300 + 120) / 100;
  var excess = ferocity - 300;
  return baseAt300 + 8 * excess / (excess + 200) / 100;
}
export function calcCritMult(ferocity) {
  return 1.75 + ferocity * 0.0008;
}

/* §2.3 Block */
export function calcBlockReduction(fortification, shield) {
  var base = 0.25 + fortification * 0.0012;
  /* Shield gear bonus */
  if (shield) {
    var ss = getShieldStats(shield);
    base += ss.blockBonus / 100;
  }
  return Math.min(0.75, base);
}

/* §2.5 Movement */
export function calcMoveSpeed(agility) {
  return 5.0 * (1 + Math.min(agility * 0.0012, 0.60));
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

/* §15.2 Special attack multiplier (no element = raw damage boost) */
export const SPECIAL_ATK_MULT = 1.8;

/* Create a default player RPG state with the new stat system */
export function createDefaultRpg() {
  return {
    level: 1,
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
    /* Tier 2 — still allocation-based until use-training is hooked
       up for them in a follow-up ship. */
    ferocity: 0,
    elementalMastery: 0,
    fortification: 0,
    restoration: 0,
    influence: 0,
    unspentT2: 5,
    /* Derived (recalculated) */
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    mana: 100,
    maxMana: 100,
    /* Equipment */
    /* Equipment — start with basic wood-tier weapons */
    weapon: {
      type: 'sword',
      tier: 'common',
      tierMult: 1.0,
      element1: null,
      element2: null,
      name: 'Wood Sword',
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
    armor: {
      tier: 'common',
      tierMult: 1.0,
      attunement: null,
      name: 'Leather Armor',
      gearBase: 'wood'
    },
    shield: null,
    /* {tier, tierMult, gearBase, gem, name, reforgeBonus, hardenBonus} */
    /* Active weapon slot: 'melee' or 'ranged' */
    activeSlot: 'melee'
  };
}

/* Recalculate derived stats from allocations */
export function recalcDerived(rpg) {
  rpg.maxHp = calcMaxHp(rpg.level, rpg.vitality);
  rpg.maxStamina = calcMaxStam(rpg.endurance);
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

/* ═══ LEGACY COMPAT — kept temporarily so existing render/UI code doesn't break ═══ */
/* Legacy constants removed — weapon system uses WEAPON_TYPES + RARITY_TIERS */
/* Monster system uses createMonster() with ARCHETYPES */
export const SWING_COOLDOWN = 600;
export const SWING_RANGE = 50;
export const SWING_ARC = Math.PI * 0.85;

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
export const EMOTES = ['👋', '😂', '🔥', '💎', '🎉', '👀', '💪', '🕺', '🫡', '🤝', '💀', '😤', '🧘', '🎭', '❤️', '👏', '🏆', '🎣', '😴', '🤙', '6️⃣', '7️⃣', '🤷', '🙏', '😎', '🥶', '💃', '🪩', '🎤', '🫶'];
/* Signature emotes with labels */
export const EMOTE_LABELS = {
  '6️⃣': 'Six',
  '7️⃣': 'Seven',
  '🕺': 'Gritty',
  '💪': 'Flex',
  '🫡': 'Salute',
  '🤝': 'GG',
  '💀': 'RIP',
  '🎣': 'Cast',
  '🏆': 'Champ',
  '😤': 'Rage',
  '🧘': 'Zen',
  '🎭': 'Drama',
  '💃': 'Dance',
  '🪩': 'Party',
  '🫶': 'Love'
};
/* Special text emotes rendered as floating text above player */
export const TEXT_EMOTES = ['67', 'GG', 'RIP', 'Bruh', 'EZ', 'F', 'Lets go', 'Wow', 'Gritty', 'gg ez', 'Champion', 'Salute'];

/* ═══ AUDIO ENGINE — §6 Candy Crush Principle: every interaction has precise audio ═══ */
export const BT_AUDIO = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({
  ctx: null,
  muted: false,
  _currentZoneAmbient: null,
  _ambientOsc: null,
  _ambientGain: null,
  _ambientLfo: null,
  init: function init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  },
  beep: function beep(freq, dur, vol, type) {
    if (!this.ctx || this.muted) return;
    try {
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.1, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.1));
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + (dur || 0.1) + 0.05);
    } catch (e) {}
  },
  /* Play a one-shot audio file (mp3/ogg).  Caches an HTMLAudioElement
     per URL as a template, then clones for each play so multiple
     instances can overlap.  Honors this.muted.  Use for short SFX
     where canvas-tone synthesis isn't expressive enough. */
  _fileCache: {},
  playFile: function playFile(url, vol) {
    if (this.muted) return;
    try {
      var template = this._fileCache[url];
      if (!template) {
        template = new Audio(url);
        template.preload = 'auto';
        this._fileCache[url] = template;
      }
      var clone = template.cloneNode();
      clone.volume = vol == null ? 0.7 : vol;
      var p = clone.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  },
  /* §6 Material-varied hit sounds per archetype */hitSound: function hitSound(material) {
    if (!this.ctx || this.muted) return;
    try {
      var sounds = {
        slime: {
          freq: 150,
          type: 'sine',
          vol: 0.08
        },
        metal: {
          freq: 800,
          type: 'square',
          vol: 0.06
        },
        bone: {
          freq: 400,
          type: 'triangle',
          vol: 0.07
        },
        wood: {
          freq: 250,
          type: 'triangle',
          vol: 0.06
        },
        crystal: {
          freq: 1200,
          type: 'sine',
          vol: 0.05
        },
        flesh: {
          freq: 200,
          type: 'sawtooth',
          vol: 0.06
        },
        stone: {
          freq: 300,
          type: 'square',
          vol: 0.07
        }
      };
      var s = sounds[material] || sounds.flesh;
      this.beep(s.freq + Math.random() * 100, 0.06, s.vol, s.type);
    } catch (e) {}
  },
  collect: function collect() {
    var _this = this;
    this.beep(800, 0.08, 0.06, 'sine');
    setTimeout(function () {
      return _this.beep(1200, 0.06, 0.04, 'sine');
    }, 60);
  },
  deathBoom: function deathBoom(arch) {
    /* Per-archetype death sound routing.  Slimes (fodder) play the
       messy-splat sample instead of the synth boom — replace the
       generic boom that was firing alongside our render-loop splat
       (caused double playback per slime kill).  Other archetypes
       still get the original synth boom. */
    if (arch === 'fodder') {
      this.playFile('/audio/slime-death-v2.mp3', 0.85);
      return;
    }
    var _this2 = this;
    this.beep(80, 0.3, 0.12, 'sawtooth');
    setTimeout(function () {
      return _this2.beep(60, 0.4, 0.08, 'triangle');
    }, 100);
  },
  npcChat: function npcChat() {
    this.beep(600, 0.04, 0.03, 'sine');
  },
  footstep: function footstep() {
    if (!this.ctx || this.muted) return;
    this.beep(180 + Math.random() * 40, 0.02, 0.02, 'triangle');
  },
  enterBuilding: function enterBuilding() {
    var _this3 = this;
    this.beep(400, 0.06, 0.05, 'sine');
    setTimeout(function () {
      return _this3.beep(500, 0.05, 0.04, 'sine');
    }, 80);
  },
  chatSend: function chatSend() {
    this.beep(500, 0.05, 0.04, 'sine');
  },
  chatReceive: function chatReceive() {
    this.beep(700, 0.04, 0.03, 'sine');
  },
  emote: function emote() {
    var _this4 = this;
    this.beep(600, 0.06, 0.04, 'sine');
    setTimeout(function () {
      return _this4.beep(800, 0.04, 0.03, 'sine');
    }, 60);
  },
  thwack: function thwack() {
    this.beep(250, 0.05, 0.08, 'sawtooth');
  },
  hitMaterial: function hitMaterial(archetype) {
    var mats = {
      fodder: 'slime',
      brute: 'stone',
      swarm: 'crystal',
      sentinel: 'metal',
      volatile: 'slime',
      stalker: 'flesh',
      hexer: 'crystal'
    };
    this.hitSound(mats[archetype] || 'flesh');
  },
  /* §6 Grand Slam — original sword-hit sample (shared across sword/magic/ranged
     grand slams) layered with the celebratory 6-note arpeggio. */grandSlam: function grandSlam() {
    var _this5 = this;
    if (!this.ctx || this.muted) return;
    this.play('sword-hit', { vol: 0.7 });
    var notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach(function (f, i) {
      return setTimeout(function () {
        return _this5.beep(f, 0.15, 0.1 - i * 0.012, 'square');
      }, i * 60);
    });
    setTimeout(function () {
      _this5.beep(1047, 0.5, 0.08, 'sine');
      _this5.beep(1568, 0.5, 0.06, 'sine');
    }, 400);
  },
  /* §10 Collision sound — 3-layer audio event */collisionSound: function collisionSound(setupElement, triggerElement, manaRestored) {
    var _this6 = this;
    if (!this.ctx || this.muted) return;
    var consumeSounds = {
      burn: function burn() {
        return _this6.beep(200, 0.08, 0.06, 'sawtooth');
      },
      freeze: function freeze() {
        return _this6.beep(1000, 0.06, 0.04, 'sine');
      },
      poison: function poison() {
        return _this6.beep(150, 0.08, 0.05, 'square');
      },
      shock: function shock() {
        return _this6.beep(800, 0.04, 0.06, 'square');
      },
      root: function root() {
        return _this6.beep(180, 0.1, 0.05, 'triangle');
      },
      corrode: function corrode() {
        return _this6.beep(120, 0.1, 0.06, 'sawtooth');
      },
      daze: function daze() {
        return _this6.beep(500, 0.06, 0.04, 'sine');
      },
      fracture: function fracture() {
        return _this6.beep(250, 0.08, 0.06, 'square');
      },
      blind: function blind() {
        return _this6.beep(900, 0.05, 0.04, 'sine');
      }
    };
    var setupStatus = {
      flame: 'burn',
      frost: 'freeze',
      venom: 'poison',
      storm: 'shock',
      stone: 'root',
      water: 'corrode',
      wind: 'daze',
      dark: 'blind',
      light: 'fracture'
    }[setupElement];
    if (consumeSounds[setupStatus]) consumeSounds[setupStatus]();
    /* Layer 2: Collision burst — unique per element pair (using trigger pitch) */
    var triggerPitch = {
      flame: 300,
      frost: 500,
      water: 400,
      venom: 250,
      storm: 700,
      stone: 200,
      wind: 600,
      dark: 120,
      light: 900
    };
    setTimeout(function () {
      var freq = triggerPitch[triggerElement] || 400;
      _this6.beep(freq, 0.1, 0.15, 'sawtooth');
      _this6.beep(freq * 1.5, 0.08, 0.1, 'square');
    }, 100);
    /* Layer 3: Mana restore chime (pitch scales with amount) */
    if (manaRestored > 0) {
      setTimeout(function () {
        var pitch = 600 + Math.min(manaRestored * 8, 400);
        _this6.beep(pitch, 0.12, 0.08, 'sine');
        setTimeout(function () {
          return _this6.beep(pitch * 1.25, 0.1, 0.06, 'sine');
        }, 60);
      }, 200);
    }
  },
  /* §7 Level-up fanfare */levelUp: function levelUp() {
    var _this7 = this;
    if (!this.ctx || this.muted) return;
    /* Rising triumphant arpeggio */
    var notes = [262, 330, 392, 523, 659, 784, 1047];
    notes.forEach(function (freq, i) {
      setTimeout(function () {
        return _this7.beep(freq, 0.15, 0.12 - i * 0.01, 'square');
      }, i * 80);
    });
    /* Final sustained chord */
    setTimeout(function () {
      _this7.beep(523, 0.4, 0.08, 'sine');
      _this7.beep(659, 0.4, 0.06, 'sine');
      _this7.beep(784, 0.5, 0.06, 'sine');
    }, 600);
  },
  /* Whimsical death jingle */playerDeath: function playerDeath() {
    var _this8 = this;
    this.beep(400, 0.1, 0.12, 'square');
    setTimeout(function () {
      return _this8.beep(350, 0.1, 0.1, 'square');
    }, 120);
    setTimeout(function () {
      return _this8.beep(300, 0.1, 0.08, 'square');
    }, 240);
    setTimeout(function () {
      return _this8.beep(200, 0.2, 0.1, 'triangle');
    }, 380);
    setTimeout(function () {
      return _this8.beep(100, 0.3, 0.08, 'sine');
    }, 500);
  },
  join: function join() {
    var _this9 = this;
    /* Welcome jingle */
    this.beep(262, 0.12, 0.1, 'square');
    setTimeout(function () {
      return _this9.beep(330, 0.12, 0.08, 'square');
    }, 100);
    setTimeout(function () {
      return _this9.beep(392, 0.12, 0.08, 'square');
    }, 200);
    setTimeout(function () {
      return _this9.beep(523, 0.2, 0.1, 'square');
    }, 300);
  },
  bgNote: function bgNote(freq) {
    var dur = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.8;
    if (!this.ctx || this.muted) return;
    try {
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.02, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }
}, "_ambientOsc", null), "_ambientGain", null), "_ambientLfo", null), "_currentZoneAmbient", null), "_ambientOsc2", null), "_ambientGain2", null), "_ambientLfo2", null), "startZoneAmbient", function startZoneAmbient(zoneId) {
  if (!this.ctx || this.muted) return;
  if (this._currentZoneAmbient === zoneId) return;
  this._currentZoneAmbient = zoneId;
  this.stopAmbient();
  var zone = ZONES[zoneId];
  if (!zone) return;
  try {
    /* Primary drone — base atmosphere */
    var ambientParams = {
      town: {
        freq: 220,
        type: 'sine',
        vol: 0.008,
        lfo: 0.5
      },
      meadow: {
        freq: 180,
        type: 'sine',
        vol: 0.006,
        lfo: 0.3
      },
      flame: {
        freq: 80,
        type: 'sawtooth',
        vol: 0.010,
        lfo: 2.0
      },
      frost: {
        freq: 300,
        type: 'sine',
        vol: 0.007,
        lfo: 0.8
      },
      water: {
        freq: 250,
        type: 'triangle',
        vol: 0.008,
        lfo: 1.2
      },
      venom: {
        freq: 100,
        type: 'sawtooth',
        vol: 0.009,
        lfo: 1.5
      },
      storm: {
        freq: 150,
        type: 'square',
        vol: 0.006,
        lfo: 3.0
      },
      stone: {
        freq: 60,
        type: 'triangle',
        vol: 0.008,
        lfo: 0.4
      },
      wind: {
        freq: 400,
        type: 'sine',
        vol: 0.005,
        lfo: 2.5
      },
      dark: {
        freq: 55,
        type: 'sawtooth',
        vol: 0.012,
        lfo: 0.6
      },
      light: {
        freq: 520,
        type: 'sine',
        vol: 0.006,
        lfo: 0.3
      }
    };
    /* Secondary texture — adds depth and character */
    var ambientParams2 = {
      flame: {
        freq: 160,
        type: 'triangle',
        vol: 0.004,
        lfo: 0.3
      },
      /* crackling undertone */
      frost: {
        freq: 600,
        type: 'sine',
        vol: 0.003,
        lfo: 0.15
      },
      /* high wind whistle */
      water: {
        freq: 120,
        type: 'sine',
        vol: 0.004,
        lfo: 0.8
      },
      /* deep current */
      venom: {
        freq: 200,
        type: 'square',
        vol: 0.003,
        lfo: 0.7
      },
      /* insect buzz */
      storm: {
        freq: 300,
        type: 'sawtooth',
        vol: 0.003,
        lfo: 5.0
      },
      /* crackling static */
      stone: {
        freq: 40,
        type: 'sine',
        vol: 0.005,
        lfo: 0.1
      },
      /* deep rumble */
      wind: {
        freq: 800,
        type: 'sine',
        vol: 0.002,
        lfo: 4.0
      },
      /* high whistling */
      dark: {
        freq: 110,
        type: 'square',
        vol: 0.004,
        lfo: 0.2
      },
      /* ominous pulse */
      light: {
        freq: 1040,
        type: 'sine',
        vol: 0.002,
        lfo: 0.5
      } /* crystalline overtone */
    };
    var elem = zone.element || (zoneId === 'town' ? 'town' : 'meadow');
    var params = ambientParams[elem] || ambientParams.town;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = params.type;
    o.frequency.value = params.freq;
    g.gain.value = params.vol;
    o.connect(g);
    var lfo = this.ctx.createOscillator();
    var lfoG = this.ctx.createGain();
    lfo.frequency.value = params.lfo;
    lfoG.gain.value = params.freq * 0.05;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);
    g.connect(this.ctx.destination);
    o.start();
    lfo.start();
    this._ambientOsc = o;
    this._ambientGain = g;
    this._ambientLfo = lfo;
    /* Secondary oscillator — adds texture */
    var p2 = ambientParams2[elem];
    if (p2) {
      var o2 = this.ctx.createOscillator();
      var g2 = this.ctx.createGain();
      o2.type = p2.type;
      o2.frequency.value = p2.freq;
      g2.gain.value = p2.vol;
      o2.connect(g2);
      var lfo2 = this.ctx.createOscillator();
      var lfoG2 = this.ctx.createGain();
      lfo2.frequency.value = p2.lfo;
      lfoG2.gain.value = p2.freq * 0.08;
      lfo2.connect(lfoG2);
      lfoG2.connect(o2.frequency);
      g2.connect(this.ctx.destination);
      o2.start();
      lfo2.start();
      this._ambientOsc2 = o2;
      this._ambientGain2 = g2;
      this._ambientLfo2 = lfo2;
    }
  } catch (e) {}
}), "stopAmbient", function stopAmbient() {
  try {
    if (this._ambientOsc) {
      this._ambientOsc.stop();
      this._ambientOsc = null;
    }
    if (this._ambientLfo) {
      this._ambientLfo.stop();
      this._ambientLfo = null;
    }
    this._ambientGain = null;
    if (this._ambientOsc2) {
      this._ambientOsc2.stop();
      this._ambientOsc2 = null;
    }
    if (this._ambientLfo2) {
      this._ambientLfo2.stop();
      this._ambientLfo2 = null;
    }
    this._ambientGain2 = null;
  } catch (e) {}
}), "setCombatIntensity", function setCombatIntensity(inCombat) {
  if (!this._ambientGain || !this.ctx) return;
  try {
    this._ambientGain.gain.setTargetAtTime(inCombat ? 0.018 : 0.008, this.ctx.currentTime, 0.5);
    if (this._ambientGain2) this._ambientGain2.gain.setTargetAtTime(inCombat ? 0.008 : 0.004, this.ctx.currentTime, 0.5);
  } catch (e) {}
});

/* ─── Sample-based SFX (real WAV files) ────────────────────────────────────
   Loaded on demand from /sfx/<group>/<name>.wav. Playback is gated by the
   audio context unlocking (mobile/Safari require a user gesture before any
   audio plays). BT_AUDIO.unlock() should be called from the first touch /
   click and is idempotent. */
BT_AUDIO._samples = {};
BT_AUDIO._sampleLoading = {};
BT_AUDIO._unlocked = false;
BT_AUDIO._loadedManifest = false;
BT_AUDIO.SFX_MANIFEST = {
  'sword-swing':   '/sfx/sword/sword-swing.wav',
  'sword-hit':     '/sfx/sword/sword-hit.wav',   /* reserved for grand-slam hits only */
  'sword-hit2':    '/sfx/sword/sword-hit2.flac', /* regular hit alternation */
  'sword-hit3':    '/sfx/sword/sword-hit3.wav',  /* regular hit alternation */
  'bow-pullback':  '/sfx/bow/bow-pullback.wav',
  'arrow-fly':     '/sfx/bow/arrow-fly.wav',
  'arrow-hit':     '/sfx/bow/arrow-hit.wav',
  'magic-cast':    '/sfx/magic/magic-cast.wav',
  'magic-hit':     '/sfx/magic/magic-hit.wav',
  'magic-hit2':    '/sfx/magic/magic-hit2.wav',
  'monster-death': '/sfx/monster/Monster death-bony.wav',
};

/* Regular sword-hit alternation. The two samples cycle so a flurry of hits
   doesn't hammer the same waveform. The original `sword-hit` sample is
   reserved for grand-slam hits per BT_AUDIO.grandSlam(). */
BT_AUDIO._swordHitToggle = 0;
BT_AUDIO.swordHit = function (opts) {
  var key = (this._swordHitToggle++ & 1) ? 'sword-hit3' : 'sword-hit2';
  this.play(key, opts);
};
/* Magic-hit alternation — same pattern as sword. Cycles magic-hit and
   magic-hit2 so staff-projectile hits don't repeat the same waveform. */
BT_AUDIO._magicHitToggle = 0;
BT_AUDIO.magicHit = function (opts) {
  var key = (this._magicHitToggle++ & 1) ? 'magic-hit2' : 'magic-hit';
  this.play(key, opts);
};
BT_AUDIO.monsterDeath = function (opts) {
  this.play('monster-death', opts || { vol: 0.5 });
};
BT_AUDIO.loadSample = function (key, url) {
  if (!this.ctx || this._samples[key] || this._sampleLoading[key]) return;
  this._sampleLoading[key] = true;
  fetch(url)
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (buf) {
      return new Promise(function (resolve, reject) {
        BT_AUDIO.ctx.decodeAudioData(buf, resolve, reject);
      });
    })
    .then(function (audioBuf) {
      BT_AUDIO._samples[key] = audioBuf;
      delete BT_AUDIO._sampleLoading[key];
    })
    .catch(function () {
      delete BT_AUDIO._sampleLoading[key];
    });
};
BT_AUDIO.loadSfxManifest = function () {
  if (this._loadedManifest || !this.ctx) return;
  this._loadedManifest = true;
  var m = this.SFX_MANIFEST;
  for (var k in m) this.loadSample(k, m[k]);
};
BT_AUDIO.unlock = function () {
  if (!this.ctx) this.init();
  if (!this.ctx) return;
  if (this.ctx.state === 'suspended' && this.ctx.resume) {
    try { this.ctx.resume(); } catch (e) {}
  }
  this._unlocked = true;
  this.loadSfxManifest();
};
BT_AUDIO.play = function (key, opts) {
  if (this.muted || !this.ctx) return;
  var buf = this._samples[key];
  if (!buf) {
    // Lazily load on first miss so a sound is at least cached for next time.
    var url = this.SFX_MANIFEST[key];
    if (url) this.loadSample(key, url);
    return;
  }
  try {
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var rate = (opts && opts.rate) ||
      (1 + (Math.random() - 0.5) * (opts && opts.pitchVar != null ? opts.pitchVar : 0.06));
    src.playbackRate.value = rate;
    var g = this.ctx.createGain();
    g.gain.value = (opts && opts.vol != null) ? opts.vol : 0.6;
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start(0);
  } catch (e) {}
};

export const BT_ACHIEVEMENTS = [{
  id: 'first_steps',
  name: 'First Steps',
  icon: '👟',
  desc: 'Walk 500 tiles',
  check: function check(s) {
    return s.steps >= 500;
  }
}, {
  id: 'explorer',
  name: 'Explorer',
  icon: '🧭',
  desc: 'Visit every building',
  check: function check(s) {
    return s.buildingsVisited >= 8;
  }
}, {
  id: 'chatterbox',
  name: 'Chatterbox',
  icon: '💬',
  desc: 'Send 20 messages',
  check: function check(s) {
    return s.msgsSent >= 20;
  }
}, {
  id: 'treasure1',
  name: 'Treasure Hunter',
  icon: '💎',
  desc: 'Find 5 collectibles',
  check: function check(s) {
    return s.totalCollected >= 5;
  }
}, {
  id: 'treasure2',
  name: 'Master Collector',
  icon: '👑',
  desc: 'Find all 10 in one day',
  check: function check(s) {
    return s.dailyCollected >= 10;
  }
}, {
  id: 'social',
  name: 'Social Butterfly',
  icon: '🦋',
  desc: 'Use 10 emotes',
  check: function check(s) {
    return s.emotesUsed >= 10;
  }
}, {
  id: 'regular',
  name: 'Regular',
  icon: '🏠',
  desc: 'Visit Bro Town 5 days',
  check: function check(s) {
    return s.daysVisited >= 5;
  }
}, {
  id: 'speed',
  name: 'Speed Walker',
  icon: '⚡',
  desc: 'Walk 2000 tiles',
  check: function check(s) {
    return s.steps >= 2000;
  }
}, {
  id: 'marathon',
  name: 'Marathon Bro',
  icon: '🏃',
  desc: 'Walk 10000 tiles',
  check: function check(s) {
    return s.steps >= 10000;
  }
}, {
  id: 'celebrity',
  name: 'Celebrity',
  icon: '⭐',
  desc: 'Get inspected 5 times',
  check: function check(s) {
    return s.timesInspected >= 5;
  }
}, /* §GUILD + §ARENA + §DIVE achievements (inlined from NEW_ACHIEVEMENTS) */
{
  id: 'guild_first',
  name: 'Guild Member',
  icon: '🏛️',
  desc: 'Join your first life skill guild',
  check: function check(s) {
    return s._guildRanksEarned >= 1;
  }
}, {
  id: 'guild_master',
  name: 'Guild Master',
  icon: '👑',
  desc: 'Reach Master rank in any guild',
  check: function check(s) {
    return s._guildMasterCount >= 1;
  }
}, {
  id: 'guild_all',
  name: 'Renaissance',
  icon: '🎭',
  desc: 'Reach Journeyman in all 10 guilds',
  check: function check(s) {
    return s._guildJourneymanAll;
  }
}, {
  id: 'arena_enter',
  name: 'Gladiator Hopeful',
  icon: '🏟️',
  desc: 'Enter the arena',
  check: function check(s) {
    return s._arenaEntered >= 1;
  }
}, {
  id: 'arena_win3',
  name: 'Arena Victor',
  icon: '⚔️',
  desc: 'Win 3 arena matches',
  check: function check(s) {
    return s._arenaWins >= 3;
  }
}, {
  id: 'arena_champion',
  name: 'Champion',
  icon: '🏆',
  desc: 'Win a gladiator tournament',
  check: function check(s) {
    return s._arenaChampion >= 1;
  }
}, {
  id: 'bet_first',
  name: 'High Roller',
  icon: '🎲',
  desc: 'Place your first arena bet',
  check: function check(s) {
    return s._betsMade >= 1;
  }
}, {
  id: 'bet_win5',
  name: 'Lucky Streak',
  icon: '🍀',
  desc: 'Win 5 arena bets',
  check: function check(s) {
    return s._betsWon >= 5;
  }
}, {
  id: 'dive_first',
  name: 'Deep Breath',
  icon: '🫧',
  desc: 'Dive underwater for the first time',
  check: function check(s) {
    return s._diveCount >= 1;
  }
}, {
  id: 'dive_treasure',
  name: 'Sunken Treasure',
  icon: '🏴‍☠️',
  desc: 'Find underwater treasure',
  check: function check(s) {
    return s._diveTreasures >= 1;
  }
}, {
  id: 'pet_evolve',
  name: 'Metamorphosis',
  icon: '🧬',
  desc: 'Evolve a pet',
  check: function check(s) {
    return s._petsEvolved >= 1;
  }
}, {
  id: 'pet_mythic',
  name: 'Mythic Tamer',
  icon: '🌟',
  desc: 'Create a Mythic pet',
  check: function check(s) {
    return s._mythicPets >= 1;
  }
}, {
  id: 'furniture_first',
  name: 'Interior Designer',
  icon: '🪑',
  desc: 'Craft your first furniture',
  check: function check(s) {
    return s._furnitureCrafted >= 1;
  }
}, {
  id: 'furniture_all',
  name: 'Dream Home',
  icon: '🏠',
  desc: 'Craft all 12 furniture pieces',
  check: function check(s) {
    return s._furnitureCrafted >= 12;
  }
}, {
  id: 'mkt_first',
  name: 'Trader',
  icon: '🏪',
  desc: 'Complete a marketplace trade',
  check: function check(s) {
    return s._mktTrades >= 1;
  }
}, {
  id: 'dungeon_create',
  name: 'Architect',
  icon: '🏗️',
  desc: 'Create a custom dungeon',
  check: function check(s) {
    return s._dungeonsCreated >= 1;
  }
}, {
  id: 'dungeon_play',
  name: 'Dungeon Master',
  icon: '🐉',
  desc: 'Clear 5 custom dungeons',
  check: function check(s) {
    return s._customDungeonsCleared >= 5;
  }
}, {
  id: 'war_first',
  name: 'Warmonger',
  icon: '⚔️',
  desc: 'Participate in a clan war',
  check: function check(s) {
    return s._warsParticipated >= 1;
  }
}, {
  id: 'war_mvp',
  name: 'War Hero',
  icon: '🌟',
  desc: 'Earn MVP in a clan war',
  check: function check(s) {
    return s._warMvps >= 1;
  }
}, {
  id: 'lv50',
  name: 'Half Century',
  icon: '⭐',
  desc: 'Reach combat level 50',
  check: function check(s) {
    return s._combatLevel >= 50;
  }
}, {
  id: 'lv100',
  name: 'Centurion',
  icon: '💯',
  desc: 'Reach combat level 100',
  check: function check(s) {
    return s._combatLevel >= 100;
  }
}, {
  id: 'lv200',
  name: 'Prestige',
  icon: '✦',
  desc: 'Reach combat level 200',
  check: function check(s) {
    return s._combatLevel >= 200;
  }
}];

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
    color: '#8890b8',
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
export const PVP_GUARD_CONFISCATE_TIME = 1800000; /* 30 min gear confiscation */
export const PVP_GUARD_GOLD_LEVY = 0.10; /* 10% gold levy when guards win */
export const PVP_THREAT_DURATION = PVP_THREAT_BASE_COUNTDOWN; /* compat */

/* Duplicate declarations + dead code removed — originals at line ~767 */

export const NPC_DATA = [{
  name: 'Mayor Bro',
  color: '#f5c542',
  avatar: null,
  bt: '#7f1d1d',
  bl: '#1a1a1a',
  phrases: ['Welcome to the world!', 'Have you explored the spokes?', 'Beautiful day in town!', 'The enchanter can upgrade your gear.'],
  canFollow: true,
  followZones: ['town', 'meadow'],
  spawnX: 20 * TILE,
  spawnY: 13 * TILE,
  pathRadius: 60
}, {
  name: 'Trader Tix',
  color: '#3dd497',
  avatar: null,
  bt: '#16a34a',
  bl: '#365314',
  phrases: ['Looking to trade? Check the Market!', 'Good loot in the Ember Fields.', 'Rare drops are worth the grind!', 'Cook your fish before heading out!'],
  canFollow: true,
  followZones: ['town', 'meadow', 'ember', 'frost'],
  spawnX: 8 * TILE,
  spawnY: 9 * TILE,
  pathRadius: 50
}, {
  name: 'Enchantress',
  color: '#a78bfa',
  avatar: null,
  bt: '#9333ea',
  bl: '#3b0764',
  phrases: ['I can add elements to your weapon.', 'Volatile fusions hit harder!', 'Bring me crystals from the zones.', 'Elements are the key to power.'],
  canFollow: true,
  followZones: ['town'],
  spawnX: 34 * TILE,
  spawnY: 20 * TILE,
  pathRadius: 30
}, {
  name: 'Scout',
  color: '#ea580c',
  avatar: null,
  bt: '#dc2626',
  bl: '#1e3a5f',
  phrases: ['Ember Fields are dangerous but rewarding.', 'Frost zones slow you down — bring fire!', 'Watch out for Volatile enemies — they explode!', 'Each zone has different monsters.'],
  canFollow: true,
  followZones: ['town', 'meadow', 'ember', 'mist', 'frost', 'thunder', 'hollows', 'sky', 'tidal'],
  spawnX: 20 * TILE,
  spawnY: 4 * TILE,
  pathRadius: 35
}, {
  name: 'Blacksmith Bron',
  color: '#b0b0b0',
  avatar: null,
  bt: '#57534e',
  bl: '#292524',
  phrases: ['Ore in, weapons out. Simple.', 'The Woodworker handles bows and staves.', 'Gem slots make all the difference.', 'A crafted weapon has character.'],
  canFollow: true,
  followZones: ['town'],
  spawnX: 16 * TILE,
  spawnY: 24 * TILE,
  pathRadius: 30
}, {
  name: 'Healer Luna',
  color: '#38bdf8',
  avatar: null,
  bt: '#0ea5e9',
  bl: '#164e63',
  phrases: ['Eat well, fight well.', 'The shield absorbs more than you think.', 'Death drops your items — but you can get them back!', 'Cook fish for healing, herbs for buffs.'],
  canFollow: true,
  followZones: ['town', 'meadow'],
  spawnX: 16 * TILE,
  spawnY: 6 * TILE,
  pathRadius: 40
}, {
  name: 'Beastmaster Kai',
  color: '#f97316',
  avatar: null,
  bt: '#ea580c',
  bl: '#431407',
  phrases: ['Every monster is a potential friend.', 'Pets collect loot so you can focus on fighting.', 'Higher trapping skill, higher catch rate!', 'Some pets have unique idle behaviors.'],
  canFollow: true,
  followZones: ['town', 'meadow', 'ember', 'mist', 'frost'],
  spawnX: 28 * TILE,
  spawnY: 13 * TILE,
  pathRadius: 45
}, {
  name: 'Veteran Ash',
  color: '#dc2626',
  avatar: null,
  bt: '#991b1b',
  bl: '#1c1917',
  phrases: ['Crits change fights.', 'Volatile weapons hit 30% harder on collision.', '36 collisions exist. How many have you found?', 'Ferocity for crits. Elemental Mastery for collision damage.'],
  canFollow: true,
  followZones: ['town', 'meadow', 'ember', 'mist', 'frost', 'thunder', 'hollows', 'sky', 'tidal', 'shadow', 'radiant'],
  spawnX: 24 * TILE,
  spawnY: 9 * TILE,
  pathRadius: 50
}, {
  name: 'The Ferryman',
  color: '#1a1a1a',
  avatar: '💀',
  bt: '#0a0a0a',
  bl: '#1a0a0a',
  phrases: ['Looking for trouble?', 'The Lawless Land takes everything... and gives everything.', 'No rules. No mercy. No refunds.', 'Win it all. Lose it all. Your call.'],
  canFollow: false,
  followZones: ['town'],
  spawnX: 34 * TILE,
  spawnY: 13 * TILE,
  pathRadius: 10,
  isFerryman: true
}];
/* PLAYER_COLORS moved to constants.js */

