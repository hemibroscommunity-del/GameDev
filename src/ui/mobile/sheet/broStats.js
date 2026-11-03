/* ═══ v2.3.4162: THE BRO PAGE'S COMBAT STATS, ONE WEAPON AT A TIME ═══
 *
 * The owner drew the Bro page (D474F679-...png in the repo root): a Sword |
 * Bow | Staff selector (v2.3.4162: the Melee / Bow / Magic skill tiles) over
 * "Combat Stats", one row a stat -- an icon, the
 * stat's name in capitals, its value at the right: Damage, DPS, Attack Speed,
 * Range, Crit Chance, Crit Damage, Special Damage, Element Power, Defense,
 * Armor, Dodge, Resist, Move Speed.
 *
 * Every number is one the game already prints elsewhere, read through the
 * same reader, for THE WEAPON SELECTED rather than the one in your hand:
 *   - Damage and DPS: calcDisplayDmgRange / calcDisplayDps for that slot's
 *     weapon (the Equipment window's pair);
 *   - Attack Speed: swings a second, 1000 / statSim's autoSwingMs -- the
 *     auto-attack's own period (the lane's Speed points, the bow's slower
 *     draw, the staff's cast, an attack-speed amulet);
 *   - Range: statSim's reachOf, the reach the stat demo fights with, in tiles;
 *   - the rest: the Equipment window's own pills (heroStatPills) worked out as
 *     if that weapon were the one out (its lane's Crit, Special and Elemental
 *     points), so the two screens never show two numbers for one stat.  The
 *     shared stats (Defense, Armor, Dodge, Resist, Move Speed) are the same
 *     under every weapon, because they are.
 * A slot with no weapon in it says so: its Damage, DPS, Attack Speed and Range
 * are "—" and `has` is false (borrowing the sword you DO hold would put a
 * sword's numbers under "Bow": weaponForCat's rule).
 *
 * The mockup's numbers were placeholders ("Defense 148", "Crit Damage
 * 175%"): the game's units are kept, not the drawing's -- Defense is the
 * Defense points' cut in percent, Crit Damage the Equipment window's "+N%"
 * over a normal crit, Element Power a power number ("+12", not a percent:
 * heroStatPills' note) after the weapon's element, Move Speed "+N%".
 *
 * Pure (no React, no DOM): server/test/bro-stats.test.mjs reads it. */
import { calcDisplayDmgRange, calcDisplayDps, weaponForCat } from '../../../data/gameSystems.js';
import { TILE } from '../../../data/constants.js';
import { prog3ActiveCat } from '../../../data/prog3.js';
import { deriveHeroStats } from './heroModel.js';
import { heroStatPills, HERO_PILL_ICON } from './heroStatPills.js';
import { autoSwingMs, reachOf } from './statSim.js';

/* the three weapons, in the mockup's order: the prog3 category, the rpg's
   activeSlot that means it, the word ("No bow equipped"), and the combat
   skill whose tile picks it (heroModel COMBAT_SKILLS' key: STAT_TO_WEAPON_CAT).
   v2.3.4162: the owner on #1386, "Move the 3 primary combat skills out of the
   gear menu and put them into the bro menu" -- the Gear tab's Melee / Bow /
   Magic tiles (dash/SkillTiles.jsx) ARE the picker now, so the old Sword |
   Bow | Staff buttons and their pictures are gone; a tile names its weapon
   through `skill`. */
export const BRO_WEAPONS = Object.freeze([
  Object.freeze({ cat: 'sword', slot: 'melee', label: 'Sword', skill: 'power' }),
  Object.freeze({ cat: 'bow', slot: 'ranged', label: 'Bow', skill: 'agility' }),
  Object.freeze({ cat: 'staff', slot: 'staff', label: 'Staff', skill: 'mind' }),
]);
const SLOT_OF = Object.freeze({ sword: 'melee', bow: 'ranged', staff: 'staff' });

/* the stat rows, in the mockup's order: key, the caps label, the explainer
   (infoGlossary statInfo) a tap opens, the picture */
export const BRO_STAT_ROWS = Object.freeze([
  ['damage', 'DAMAGE', 'Damage', HERO_PILL_ICON.damage],
  ['dps', 'DPS', 'DPS', HERO_PILL_ICON.dps],
  ['aspd', 'ATTACK SPEED', 'Atk Speed', HERO_PILL_ICON.aspd],
  ['range', 'RANGE', 'Range', HERO_PILL_ICON.range],
  ['crit', 'CRIT CHANCE', 'Crit', HERO_PILL_ICON.crit],
  ['critDmg', 'CRIT DAMAGE', 'Crit Dmg', HERO_PILL_ICON.critDmg],
  ['special', 'SPECIAL DAMAGE', 'Special', HERO_PILL_ICON.special],
  ['elem', 'ELEMENT POWER', 'Elemental', HERO_PILL_ICON.elem],
  ['def', 'DEFENSE', 'Defense', HERO_PILL_ICON.def],
  ['armor', 'ARMOR', 'Armor', HERO_PILL_ICON.armor],
  ['dodge', 'DODGE', 'Dodge', HERO_PILL_ICON.dodge],
  ['eres', 'RESIST', 'Elem Resist', HERO_PILL_ICON.eres],
  ['move', 'MOVE SPEED', 'Move Speed', HERO_PILL_ICON.move],
]);

const DASH = '—';
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

/** The weapon the selector starts on: the one out (rpg.activeSlot). */
export function broStartWeapon(R) {
  try { return prog3ActiveCat(R || {}); } catch (e) { return 'sword'; }
}

/** The rows for weapon `cat`: { cat, has, weapon, rows: [{key, label, info,
 *  icon, value}] } -- thirteen rows, in BRO_STAT_ROWS' order.  Never throws:
 *  a value that cannot be read is "—". */
export function broWeaponStats(R, cat) {
  R = R || {};
  const c = Object.prototype.hasOwnProperty.call(SLOT_OF, cat) ? cat : 'sword';
  /* the rpg as if this weapon were out: every reader below that asks "which
     lane" (getActiveWeapon, prog3ActiveCat) answers this one */
  const as = Object.assign({}, R, { activeSlot: SLOT_OF[c] });
  let wpn = null;
  try { wpn = weaponForCat(R, c); } catch (e) { wpn = null; }
  let d = {};
  try { d = deriveHeroStats(as) || {}; } catch (e) { d = {}; }
  let pills = null;
  try { pills = heroStatPills(as, d); } catch (e) { pills = null; }
  const pill = {};
  if (pills) for (const p of [pills.dps].concat(pills.offense, pills.player)) pill[p.key] = p.value;
  const safe = (fn) => { try { const v = fn(); return v == null || v === '' ? DASH : String(v); } catch (e) { return DASH; } };

  const v = {};
  if (wpn) {
    v.damage = safe(() => { const r = calcDisplayDmgRange(as, wpn); return r ? r.text.replace('-', ' – ') : null; });
    v.dps = safe(() => (Number(calcDisplayDps(as, wpn)) || 0).toFixed(1));
    v.aspd = safe(() => { const ms = autoSwingMs(as, wpn); return ms > 0 ? (1000 / ms).toFixed(2) + ' /s' : null; });
    v.range = safe(() => { const px = reachOf(as, { type: wpn.type }); return px > 0 ? (px / TILE).toFixed(1) : null; });
  } else {
    v.damage = v.dps = v.aspd = v.range = DASH;
  }
  v.crit = pill.crit || DASH;
  v.critDmg = pill.critDmg || DASH;
  v.special = pill.special || DASH;
  /* the weapon's element, then the lane's power ("Flame +12"; "+12" bare) */
  const el = wpn && wpn.element1 ? cap(wpn.element1) : '';
  v.elem = (el ? el + ' ' : '') + (pill.elem || DASH);
  v.def = pill.def || DASH;
  v.armor = pill.armor || DASH;
  v.dodge = pill.dodge || DASH;
  v.eres = pill.eres || DASH;
  v.move = pill.move || DASH;

  return {
    cat: c,
    has: !!wpn,
    weapon: wpn || null,
    rows: BRO_STAT_ROWS.map(([key, label, info, icon]) => ({ key, label, info, icon, value: v[key] || DASH })),
  };
}
