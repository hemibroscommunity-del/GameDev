import { TILE } from './constants.js';
import { ZONES } from './zones.js';
import { ELEMENT_FLAVOR, flavorName, flavorSpotName } from './elements.js';

/* ═══ LIFE SKILLS — §18 ═══ */
export const LIFE_SKILL_XP = (level) => Math.ceil(500 * Math.pow(1.08, level - 1));
export const LIFE_SKILLS = ['woodcutting', 'fishing', 'mining', 'farming', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping'];

/* §18.2 Resource tiers by zone depth */
export const RESOURCE_TIERS = {
  1:  { gatherLvl: 1,  label: 'Rough',         color: '#8890b8' },
  2:  { gatherLvl: 6,  label: 'Common',        color: '#8890b8' },
  3:  { gatherLvl: 11, label: 'Refined',       color: '#3b82f6' },
  4:  { gatherLvl: 16, label: 'Quality',       color: '#3b82f6' },
  5:  { gatherLvl: 21, label: 'Fine',          color: '#22c55e' },
  6:  { gatherLvl: 26, label: 'Superior',      color: '#22c55e' },
  7:  { gatherLvl: 31, label: 'Rare',          color: '#a855f7' },
  8:  { gatherLvl: 36, label: 'Exotic',        color: '#a855f7' },
  9:  { gatherLvl: 41, label: 'Epic',          color: '#f5c542' },
  10: { gatherLvl: 46, label: 'Mythic',        color: '#f5c542' },
  11: { gatherLvl: 51, label: 'Legendary',     color: '#ff5e6c' },
  12: { gatherLvl: 56, label: 'Ancient',       color: '#ff5e6c' },
  13: { gatherLvl: 61, label: 'Primeval',      color: '#ff5e6c' },
  14: { gatherLvl: 66, label: 'Divine',        color: '#ff5e6c' },
  15: { gatherLvl: 71, label: 'Celestial',     color: '#ff5e6c' },
  16: { gatherLvl: 76, label: 'Astral',        color: '#ff5e6c' },
  17: { gatherLvl: 81, label: 'Shadow',        color: '#8E44AD' },
  18: { gatherLvl: 86, label: 'Radiant',       color: '#F1C40F' },
  19: { gatherLvl: 91, label: 'Eternal',       color: '#F1C40F' },
  20: { gatherLvl: 96, label: 'Transcendent',  color: '#F1C40F' },
};

/* ═══ NODE TIER DEFINITIONS ═══ */
/* lvl drives which depth bucket each tier spawns in via getNodeTierForDepth.
   Shallow range is [1, 10] so Minnow (1) and Clownfish (6) are both
   eligible there; Trout was previously at 8 (also shallow), which let it
   spawn in zone-1 areas — bumped to 11 so it now belongs to mid depth
   and zone 1 only ever fishes up Minnow or Clownfish. */
export const FISHING_TIERS = [
  { lvl:  1, name: 'Minnow',    spot: 'Shallow Pool', size: 6,  waterColor: 'rgba(52,152,219,.35)',  hp: 2 },
  { lvl:  6, name: 'Clownfish', spot: 'Coral Patch',  size: 8,  waterColor: 'rgba(255,140, 60,.35)', hp: 3 },
  { lvl: 11, name: 'Trout',     spot: 'River Bend',   size: 10, waterColor: 'rgba(52,152,219,.4)',   hp: 3 },
];

export const WOODCUTTING_TIERS = [
  { lvl: 1, name: 'Kindling', tree: 'Sapling', trunkW: 3, canopyR: 5, trunkH: 6, canopyColor: '#3a8a2a', trunkColor: '#5a3a1e', hp: 2 },
  { lvl: 6, name: 'Softwood', tree: 'Young Tree', trunkW: 4, canopyR: 7, trunkH: 8, canopyColor: '#2a7a1a', trunkColor: '#4a3018', hp: 3 },
  { lvl: 11, name: 'Hardwood', tree: 'Oak', trunkW: 5, canopyR: 10, trunkH: 10, canopyColor: '#1a6a10', trunkColor: '#3a2810', hp: 5 },
  { lvl: 16, name: 'Pine Lumber', tree: 'Pine', trunkW: 4, canopyR: 8, trunkH: 14, canopyColor: '#1a5a10', trunkColor: '#4a3018', hp: 6 },
  { lvl: 21, name: 'Maple Wood', tree: 'Maple', trunkW: 5, canopyR: 12, trunkH: 10, canopyColor: '#c06020', trunkColor: '#3a2810', hp: 8 },
  { lvl: 26, name: 'Dense Wood', tree: 'Ancient Oak', trunkW: 7, canopyR: 14, trunkH: 12, canopyColor: '#0d4a08', trunkColor: '#2a1a08', hp: 10 },
  { lvl: 31, name: 'Crystal Wood', tree: 'Crystal Tree', trunkW: 5, canopyR: 11, trunkH: 12, canopyColor: '#6080c0', trunkColor: '#4a5a6a', hp: 12 },
  { lvl: 36, name: 'Ironbark', tree: 'Iron Tree', trunkW: 6, canopyR: 10, trunkH: 14, canopyColor: '#4a6040', trunkColor: '#6a6a6a', hp: 14 },
  { lvl: 41, name: 'Elder Wood', tree: 'Elder Tree', trunkW: 8, canopyR: 16, trunkH: 14, canopyColor: '#1a5020', trunkColor: '#2a2018', hp: 16 },
  { lvl: 46, name: 'Spirit Wood', tree: 'Spirit Tree', trunkW: 6, canopyR: 13, trunkH: 14, canopyColor: '#80a0ff', trunkColor: '#6070a0', hp: 18 },
  { lvl: 51, name: 'Ancient Timber', tree: 'World Tree', trunkW: 8, canopyR: 16, trunkH: 16, canopyColor: '#10400a', trunkColor: '#1a1008', hp: 22 },
  { lvl: 56, name: 'Storm Wood', tree: 'Lightning Oak', trunkW: 6, canopyR: 12, trunkH: 14, canopyColor: '#6040a0', trunkColor: '#3a3050', hp: 24 },
  { lvl: 61, name: 'Petrified Wood', tree: 'Stone Tree', trunkW: 7, canopyR: 11, trunkH: 12, canopyColor: '#6a6a5a', trunkColor: '#5a5a4a', hp: 26 },
  { lvl: 66, name: 'Moon Wood', tree: 'Moon Tree', trunkW: 5, canopyR: 12, trunkH: 14, canopyColor: '#a0a8c0', trunkColor: '#6a7080', hp: 28 },
  { lvl: 71, name: 'Void Timber', tree: 'Void Tree', trunkW: 6, canopyR: 13, trunkH: 14, canopyColor: '#2a1040', trunkColor: '#0a0520', hp: 30 },
  { lvl: 76, name: 'Phoenix Wood', tree: 'Ember Tree', trunkW: 6, canopyR: 12, trunkH: 14, canopyColor: '#c04020', trunkColor: '#4a1a0a', hp: 32 },
  { lvl: 81, name: 'Shadowthorn', tree: 'Shadow Tree', trunkW: 5, canopyR: 11, trunkH: 14, canopyColor: '#1a0a30', trunkColor: '#0a0515', hp: 34 },
  { lvl: 86, name: 'Gleamwood', tree: 'Radiant Tree', trunkW: 6, canopyR: 13, trunkH: 14, canopyColor: '#d0b040', trunkColor: '#a08030', hp: 36 },
  { lvl: 91, name: 'Eternal Bark', tree: 'Eternal Tree', trunkW: 8, canopyR: 16, trunkH: 16, canopyColor: '#80c0a0', trunkColor: '#406050', hp: 38 },
  { lvl: 96, name: 'Origin Wood', tree: 'Origin Tree', trunkW: 9, canopyR: 18, trunkH: 18, canopyColor: '#ffd060', trunkColor: '#b09040', hp: 42 },
];

export const MINING_TIERS = [
  { lvl: 1, name: 'Copper Ore', vein: 'Dirt Mound', size: 8, rockColor: '#8a6a3a', streakColor: '#b08050', hp: 3 },
  { lvl: 6, name: 'Iron Ore', vein: 'Rock Vein', size: 10, rockColor: '#6a6a6a', streakColor: '#8a8a8a', hp: 4 },
  { lvl: 11, name: 'Steel Ore', vein: 'Iron Deposit', size: 12, rockColor: '#5a5a6a', streakColor: '#a0a0b0', hp: 6 },
  { lvl: 16, name: 'Crystal Ore', vein: 'Crystal Vein', size: 12, rockColor: '#4a5a6a', streakColor: '#60a0d0', hp: 7 },
  { lvl: 21, name: 'Gold Ore', vein: 'Gold Vein', size: 14, rockColor: '#5a5a4a', streakColor: '#d4a030', hp: 9 },
  { lvl: 26, name: 'Mithril Ore', vein: 'Deep Vein', size: 14, rockColor: '#4a4a5a', streakColor: '#8060c0', hp: 11 },
  { lvl: 31, name: 'Gem Cluster', vein: 'Gem Deposit', size: 12, rockColor: '#5a4a5a', streakColor: '#c060a0', hp: 13 },
  { lvl: 36, name: 'Obsidian', vein: 'Obsidian Shard', size: 14, rockColor: '#1a1a2a', streakColor: '#3a3a4a', hp: 15 },
  { lvl: 41, name: 'Ancient Ore', vein: 'Ancient Deposit', size: 16, rockColor: '#4a4a3a', streakColor: '#a0903a', hp: 18 },
  { lvl: 46, name: 'Prismatic Ore', vein: 'Prismatic Vein', size: 16, rockColor: '#5a5a5a', streakColor: '#ff80ff', hp: 20 },
  { lvl: 51, name: 'Abyssal Ore', vein: 'Abyssal Crack', size: 14, rockColor: '#2a2a3a', streakColor: '#4040a0', hp: 22 },
  { lvl: 56, name: 'Stormite', vein: 'Storm Deposit', size: 14, rockColor: '#4a3a5a', streakColor: '#9060d0', hp: 24 },
  { lvl: 61, name: 'Adamantine', vein: 'Deep Earth Vein', size: 16, rockColor: '#3a3a3a', streakColor: '#40c060', hp: 26 },
  { lvl: 66, name: 'Moonstone', vein: 'Lunar Deposit', size: 14, rockColor: '#5a5a6a', streakColor: '#c0c0e0', hp: 28 },
  { lvl: 71, name: 'Voidstone', vein: 'Void Crack', size: 16, rockColor: '#0a0a1a', streakColor: '#6020a0', hp: 30 },
  { lvl: 76, name: 'Embite', vein: 'Magma Vent', size: 16, rockColor: '#3a2a1a', streakColor: '#e06020', hp: 32 },
  { lvl: 81, name: 'Shadow Ore', vein: 'Shadow Deposit', size: 14, rockColor: '#0a0a15', streakColor: '#3a1a50', hp: 34 },
  { lvl: 86, name: 'Radiant Ore', vein: 'Radiant Deposit', size: 16, rockColor: '#6a6a4a', streakColor: '#f0d040', hp: 36 },
  { lvl: 91, name: 'Eternity Ore', vein: 'Eternity Vein', size: 18, rockColor: '#4a4a4a', streakColor: '#a0ffa0', hp: 38 },
  { lvl: 96, name: 'Origin Ore', vein: 'Origin Deposit', size: 20, rockColor: '#5a5a5a', streakColor: '#ffe080', hp: 42 },
];

/* Depth tiers per spoke */
export const DEPTH_CONFIG = {
  /* nodeCount lowered v2.3.54 -- the previous 8/7/6/5/4 felt
     cluttered in-game.  4/3/3/2/2 + the MAX_NODES_PER_ZONE cap
     in spawnGatherNodes keep zones airy. */
  shallow: { depthIdx: 0, levelMod: 0,  resTier: 1,  dungeonGate: null,      nodeCount: 4, lvlRange: [1, 10] },
  mid:     { depthIdx: 1, levelMod: 10, resTier: 3,  dungeonGate: 'shallow', nodeCount: 3, lvlRange: [11, 20] },
  deep:    { depthIdx: 2, levelMod: 20, resTier: 5,  dungeonGate: 'mid',     nodeCount: 3, lvlRange: [21, 40] },
  abyss:   { depthIdx: 3, levelMod: 40, resTier: 9,  dungeonGate: 'deep',    nodeCount: 2, lvlRange: [41, 60] },
  core:    { depthIdx: 4, levelMod: 60, resTier: 13, dungeonGate: 'abyss',   nodeCount: 2, lvlRange: [61, 80] },
};

export function getNodeTierForDepth(tiersArray, depth) {
  const depthLvlRanges = {
    shallow: [1, 10], mid: [11, 20], deep: [21, 40], abyss: [41, 60], core: [61, 80]
  };
  const range = depthLvlRanges[depth] || [1, 10];
  const eligible = tiersArray.filter(t => t.lvl >= range[0] && t.lvl <= range[1]);
  if (eligible.length === 0) return tiersArray[0];
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function canAccessDepth(rpg, zoneId, depth) {
  const dc = DEPTH_CONFIG[depth];
  if (!dc.dungeonGate) return true;
  const gateKey = zoneId + '_' + dc.dungeonGate;
  return rpg.lifeSkills?.dungeonClears?.[gateKey] === true || rpg.dungeonClears?.[gateKey] === true;
}

export function createGatherNode(zoneId, depth, x, y, nodeType) {
  const zone = ZONES[zoneId];
  const dc = DEPTH_CONFIG[depth];
  const elem = zone?.element;
  const res = elem ? (ZONE_RESOURCES[elem] || null) : null;

  const tiersTable = nodeType === 'tree' ? WOODCUTTING_TIERS : nodeType === 'fishSpot' ? FISHING_TIERS : MINING_TIERS;
  const tier = getNodeTierForDepth(tiersTable, depth);
  const skillName = nodeType === 'tree' ? 'woodcutting' : nodeType === 'fishSpot' ? 'fishing' : 'mining';
  const resType = nodeType === 'tree' ? 'wood' : nodeType === 'fishSpot' ? 'fish' : 'ore';

  const flavoredName = flavorName(tier.name, elem, resType);
  const baseSpot = tier.spot || tier.tree || tier.vein || 'Node';
  const flavoredSpot = flavorSpotName(baseSpot, elem, nodeType);

  const xp = Math.ceil(tier.lvl * 1.5 + 5);
  const respawnTime = 120000; /* 2 minutes after harvest the node revives in place */
  return {
    x, y, zoneId, depth,
    resTier: dc.resTier,
    nodeType: nodeType || 'oreVein',
    skill: skillName,
    resourceType: resType,
    name: flavoredName,
    spotName: flavoredSpot,
    baseName: tier.name,
    gatherLvl: tier.lvl,
    color: nodeType === 'tree' ? tier.canopyColor : nodeType === 'fishSpot' ? '#3498DB' : tier.streakColor,
    emoji: nodeType === 'tree' ? '🪓' : nodeType === 'fishSpot' ? '🎣' : '⛏️',
    hp: tier.hp, maxHp: tier.hp,
    respawnTime, alive: true, respawnAt: 0,
    xp, element: elem,
    gemName: res?.gem || null,
    gemColor: res?.gemColor || null,
    _tier: tier,
    _tierIdx: tiersTable.indexOf(tier),
  };
}

/* Hard cap on resource nodes per zone, applied AFTER the per-depth
   nodeCount.  Keeps zones from feeling like a forest farm even if a
   depth config inadvertently bumps the count.  v2.3.54. */
const MAX_NODES_PER_ZONE = 6;

export function spawnGatherNodes(zoneId, depth) {
  const zone = ZONES[zoneId];
  /* Defensive: never spawn nodes in town (already filtered via
     zone.safe) or any zone explicitly flagged no-resources.  The
     zone.safe check has been here since the original spawn logic;
     keep both for belt + suspenders. */
  if (!zone || zone.safe || zoneId === 'town') return [];
  const dc = DEPTH_CONFIG[depth || 'shallow'];
  const nodes = [];
  const W = zone.w * TILE, H = zone.h * TILE;
  /* 8-tile inset from every edge so harvestable resources stay
     comfortably inside the playable map and never appear in the
     out-of-bounds black border. */
  const margin = 8 * TILE;
  const totalNodes = Math.min(MAX_NODES_PER_ZONE, dc.nodeCount);
  const treeCt = Math.ceil(totalNodes * 0.4);
  const fishCt = Math.ceil(totalNodes * 0.25);
  const oreCt = Math.max(1, totalNodes - treeCt - fishCt);

  const placeNode = (type, tierBias) => {
    const yCenter = H - margin - tierBias * (H - margin * 2);
    const y = Math.max(margin, Math.min(H - margin, yCenter + (Math.random() - 0.5) * TILE * 6));
    const x = margin + Math.random() * (W - margin * 2);
    nodes.push(createGatherNode(zoneId, depth || 'shallow', x, y, type));
  };

  for (let i = 0; i < treeCt; i++) placeNode('tree', i / Math.max(1, treeCt - 1));
  for (let i = 0; i < fishCt; i++) placeNode('fishSpot', i / Math.max(1, fishCt - 1));
  for (let i = 0; i < oreCt; i++) placeNode('oreVein', i / Math.max(1, oreCt - 1));
  return nodes;
}

/* ZONE_RESOURCES is in items.js */
