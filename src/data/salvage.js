/* ═══ v2.3.3126: SALVAGE AND ESSENCES, ON THE GAME'S SIDE ═══
 *
 * Owner, 2026-10-06: "all items like iron armor, bronze armor, etc should be
 * salvageable at the blacksmith for 50% of the bars it took to make them ...
 * chest, legs, and sword each take 4 bars to make ... If you salvage them you
 * get 2 bars back", and "if you salvage the rare, elite, and godly armor you
 * can get back that tier's 'essence' and use it on whatever same tier armor
 * or weapon you want."
 *
 * MIRROR of server/src/salvage.js (mirror-audit pins every constant and every
 * helper below against it).  The worker decides every salvage and every
 * essence; this module only lets the Blacksmith's Salvage tab draw the rows it
 * will accept, name an essence in the bag, and send a weapon's signature. */

export const SALVAGE = Object.freeze({
  METALS: Object.freeze({
    copper: Object.freeze({ bar: 'bar_copper', gearBase: 'copper', name: 'Copper' }),
    iron: Object.freeze({ bar: 'bar_iron', gearBase: 'iron', name: 'Iron' }),
    blacksteel: Object.freeze({ bar: 'bar_black_steel', gearBase: 'steel', name: 'Black Steel' }),
  }),
  COST_BARS: 4,
  BARS: 2,
  GRADES: Object.freeze(['normal', 'rare', 'elite', 'godly']),
  ESSENCE_GRADES: Object.freeze(['rare', 'elite', 'godly']),
  WEAPON_TYPES: Object.freeze(['sword', 'greatsword']),
});

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function essenceKey(grade, metal) { return 'essence_' + grade + '_' + metal; }

export function parseEssenceKey(key) {
  if (typeof key !== 'string' || key.length > 40) return null;
  const m = /^essence_([a-z]+)_([a-z]+)$/.exec(key);
  if (!m || SALVAGE.ESSENCE_GRADES.indexOf(m[1]) < 0 || !hasOwn(SALVAGE.METALS, m[2])) return null;
  return { grade: m[1], metal: m[2] };
}

export function gradeRank(q) {
  const i = SALVAGE.GRADES.indexOf(q);
  return i < 0 ? 0 : i;
}

export function armourMetal(piece) {
  if (!piece || typeof piece !== 'object') return null;
  const m = typeof piece.mat === 'string' ? piece.mat : (typeof piece.material === 'string' ? piece.material : null);
  return m && hasOwn(SALVAGE.METALS, m) ? m : null;
}

export function weaponMetal(w) {
  if (!w || typeof w !== 'object' || SALVAGE.WEAPON_TYPES.indexOf(w.type) < 0) return null;
  const gb = typeof w.gearBase === 'string' ? w.gearBase : '';
  for (const metal of Object.keys(SALVAGE.METALS)) {
    if (SALVAGE.METALS[metal].gearBase === gb) return metal;
  }
  return null;
}

export function weaponSig(w) {
  if (!w || typeof w !== 'object') return '';
  return [w.gearBase || '', w.type || '', w.quality || 'normal', Math.floor(Number(w.hardness) || 0), Number(w.tierMult) || 0].join('|');
}

/* ── the game's own words and pictures (not mirrored: the worker has none) ── */

export const GRADE_LABEL = Object.freeze({ normal: 'Normal', rare: 'Rare', elite: 'Elite', godly: 'Godly' });

/** "Rare Iron Essence" -- the bag's name for an essence key, or null. */
export function essenceName(key) {
  const e = parseEssenceKey(key);
  return e ? GRADE_LABEL[e.grade] + ' ' + SALVAGE.METALS[e.metal].name + ' Essence' : null;
}

/** The essence's picture: a glowing orb in its grade's colour with its metal's
    bar (tools/make_essence_icons.py). */
export function essenceIcon(key) {
  const e = parseEssenceKey(key);
  return e ? '/icons/items/essence-' + e.grade + '-' + e.metal + '.webp' : null;
}

/** What an essence does, in one line, for the bag's popup. */
export function essenceInfo(key) {
  const e = parseEssenceKey(key);
  if (!e) return null;
  const metal = SALVAGE.METALS[e.metal].name.toLowerCase();
  return 'Makes a ' + metal + ' torso, greaves or sword ' + GRADE_LABEL[e.grade] + ' (Blacksmith, Salvage tab)';
}
