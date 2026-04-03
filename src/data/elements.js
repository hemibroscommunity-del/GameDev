/* ═══ ELEMENTS ═══ */
export const ELEMENTS = {
  flame:  { status: 'burn',     shape: 'diamond',   color: '#C0392B', type: 'palette' },
  frost:  { status: 'freeze',   shape: 'hexagon',   color: '#2980B9', type: 'palette' },
  water:  { status: 'soak',     shape: 'circle',    color: '#3498DB', type: 'palette' },
  venom:  { status: 'root',     shape: 'teardrop',  color: '#27AE60', type: 'palette' },
  storm:  { status: 'shock',    shape: 'star',      color: '#8E44AD', type: 'palette' },
  stone:  { status: 'fracture', shape: 'square',    color: '#795548', type: 'palette' },
  wind:   { status: 'slow',     shape: 'triangle',  color: '#7F8C8D', type: 'palette' },
  dark:   { status: 'curse',    shape: 'trefoil',   color: '#2C3E50', type: 'endgame' },
  light:  { status: 'reveal',   shape: 'starburst', color: '#F1C40F', type: 'endgame' },
};

/* ═══ ZONE-FLAVORED NAMES — same tier, different name per element ═══ */
export const ELEMENT_FLAVOR = {
  flame: { adj: 'Ember', fish: 'Magma', wood: 'Charred', ore: 'Molten', spotAdj: 'Lava', treeAdj: 'Ash', veinAdj: 'Volcanic' },
  frost: { adj: 'Glacial', fish: 'Arctic', wood: 'Frost', ore: 'Frozen', spotAdj: 'Glacial', treeAdj: 'Frost', veinAdj: 'Permafrost' },
  water: { adj: 'Tidal', fish: 'Reef', wood: 'Drift', ore: 'Coral', spotAdj: 'Tidal', treeAdj: 'Kelp', veinAdj: 'Abyssal' },
  venom: { adj: 'Toxic', fish: 'Swamp', wood: 'Blight', ore: 'Venomous', spotAdj: 'Bog', treeAdj: 'Fungal', veinAdj: 'Corroded' },
  storm: { adj: 'Thunder', fish: 'Spark', wood: 'Lightning', ore: 'Storm', spotAdj: 'Charged', treeAdj: 'Storm', veinAdj: 'Galvanic' },
  stone: { adj: 'Earth', fish: 'Cave', wood: 'Petrified', ore: 'Dense', spotAdj: 'Cavern', treeAdj: 'Stone', veinAdj: 'Tectonic' },
  wind:  { adj: 'Zephyr', fish: 'Cloud', wood: 'Sky', ore: 'Aero', spotAdj: 'Misty', treeAdj: 'Wind', veinAdj: 'Floating' },
  dark:  { adj: 'Shadow', fish: 'Void', wood: 'Shadow', ore: 'Dark', spotAdj: 'Shadow', treeAdj: 'Shade', veinAdj: 'Void' },
  light: { adj: 'Radiant', fish: 'Sun', wood: 'Gleam', ore: 'Celestial', spotAdj: 'Sacred', treeAdj: 'Gleam', veinAdj: 'Luminous' },
};

export function flavorName(baseName, element, type) {
  if (!element || !ELEMENT_FLAVOR[element]) return baseName;
  const f = ELEMENT_FLAVOR[element];
  if (type === 'fish') return f.fish + ' ' + baseName;
  if (type === 'wood') return f.wood + ' ' + baseName;
  if (type === 'ore') return f.ore + ' ' + baseName;
  return f.adj + ' ' + baseName;
}

export function flavorSpotName(baseSpotName, element, type) {
  if (!element || !ELEMENT_FLAVOR[element]) return baseSpotName;
  const f = ELEMENT_FLAVOR[element];
  if (type === 'fishSpot') {
    const fishReplace = {
      'Tiny Pond': f.spotAdj + ' Puddle',
      'Stream': f.spotAdj + ' Stream',
      'Pond': f.spotAdj + ' Pond',
      'River': f.spotAdj + ' River',
      'Lake': f.spotAdj + ' Lake',
    };
    return fishReplace[baseSpotName] || f.spotAdj + ' ' + baseSpotName;
  }
  if (type === 'tree') return f.treeAdj + ' ' + baseSpotName;
  if (type === 'oreVein') return f.veinAdj + ' ' + baseSpotName;
  return baseSpotName;
}
