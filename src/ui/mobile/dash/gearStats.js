/* ═══ v2.3.4081: THE GEAR TAB'S NUMBERS ═══
 *
 * The middle panel's STATS (GearTab.jsx): what one piece of gear is worth, a
 * comparison of a bag piece against what is in its slot now -- the owner's
 * "current versus prospective stats with green increases and red decreases
 * before equipping it" -- and your own numbers when nothing is picked.
 *
 * NOT A SECOND FORMULA.  Every number is read through the readers the item
 * card and the Character page already print with: calcDisplayDmgRange and
 * calcDisplayDps for a weapon (the item card's "vs equipped" DPS), the
 * weapon card's reach (equipModel getEquipContribs: WEAPON_TYPES.range
 * through the lane's multiplier, clamped at 250 px, in tiles), getArmorPieceDr
 * for armour (its damage cut) and calcBlockReduction for a shield (its block),
 * deriveHeroStats and combinedDamageCut for the character.  So the comparison and the card cannot
 * disagree about the same piece.
 *
 * Pure: relative imports of src/data and heroModel only, so a node test reads
 * it (server/test/gear-tab.test.mjs).  Never throws: a number it cannot read
 * is left out, never printed as NaN.
 */
import {
  calcDisplayDmgRange, calcDisplayDps, getArmorPieceDr, getArmorDrPct, calcBlockReduction,
  WEAPON_TYPES, SWING_RANGE, bowRangeMult, meleeRangeMult, staffRangeMult, toDisplayHp,
} from '../../../data/gameSystems.js';
import { getShieldStats } from '../../../data/items.js';
import { TILE } from '../../../data/constants.js';
import { prog3Live, prog3MoveMult, prog3CharLevel, prog3EresPct } from '../../../data/prog3.js';
import { gemElementName } from '../../../data/gems.js';   /* v2.3.4081: the active weapon's element */
import { combinedDamageCut } from '../sheet/heroStatPills.js';
import { deriveHeroStats } from '../sheet/heroModel.js';

const fmt1 = (n) => {
  const r = Math.round((Number(n) || 0) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
const pct1 = (v) => {
  const n = (Number(v) || 0) * 100;
  return n > 0 && n < 10 ? n.toFixed(1) : String(Math.round(n));
};
const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch (e) { return dflt; } };

/* v2.3.4081: the damage cut is heroStatPills' combinedDamageCut (PR #1350,
   v2.3.3896: what of a hit gets through your Defense -- never below
   PROG3.FLOOR of the base, the floor widened by Dodge -- and then your
   armour), imported, so the Gear tab and the Character page say one number. */

/* A weapon's reach in tiles, the weapon card's own rule (equipModel). */
function reachTiles(R, wpn) {
  const t = wpn && WEAPON_TYPES[wpn.type];
  if (!t) return 0;
  const mult = t.type === 'ranged' ? bowRangeMult(R) : wpn.type === 'staff' ? staffRangeMult(R) : meleeRangeMult(R);
  return Math.min(250, Math.round((t.range || SWING_RANGE) * mult)) / TILE;
}

/** A weapon's rows: Damage, DPS, Speed (swings a second), Range (tiles).
 *  Each row { k, v (what is printed), n (the number compared) }. */
export function weaponRows(R, wpn) {
  if (!wpn) return [];
  const range = safe(() => calcDisplayDmgRange(R || {}, wpn), null);
  if (!range) return [];
  const rows = [
    { k: 'Damage', v: String(range.text).replace('-', '–'), n: (range.min + range.max) / 2 },
    { k: 'DPS', v: fmt1(safe(() => calcDisplayDps(R || {}, wpn), 0)), n: Number(safe(() => calcDisplayDps(R || {}, wpn), 0)) || 0, d: 1 },
  ];
  if (range.cdMs) rows.push({ k: 'Speed', v: fmt1(1000 / range.cdMs) + '/s', n: 1000 / range.cdMs, d: 1 });
  const reach = safe(() => reachTiles(R || {}, wpn), 0);
  if (reach) rows.push({ k: 'Range', v: fmt1(reach), n: reach, d: 1 });
  return rows;
}

/** A shield's rows: Block (the share of a hit it stops), Stamina, Defence. */
export function shieldRows(sh) {
  if (!sh) return [];
  const ss = safe(() => getShieldStats(sh), null);
  const block = safe(() => calcBlockReduction(0, sh), 0);
  const rows = [{ k: 'Block', v: Math.round(block * 100) + '%', n: Math.round(block * 100) }];
  if (ss && ss.staminaBonus) rows.push({ k: 'Stamina', v: '+' + ss.staminaBonus, n: ss.staminaBonus });
  if (ss && ss.flatDef) rows.push({ k: 'Defence', v: '+' + fmt1(ss.flatDef), n: ss.flatDef, d: 1 });
  return rows;
}

/** A chest or legs piece's row: its damage cut (`slot` 'chest' or 'legs'). */
export function armourRows(piece, slot) {
  if (!piece) return [];
  const dr = safe(() => getArmorPieceDr(piece, slot), 0);
  return [{ k: 'Damage cut', v: fmt1(dr * 100) + '%', n: dr * 100, d: 1 }];
}

/** The rows of whatever a Gear-tab target is.  `t` is one of
 *  { kind:'weapon', wpn } { kind:'shield', shield } { kind:'chest'|'legs', armor }. */
export function rowsFor(R, t) {
  if (!t) return [];
  if (t.kind === 'weapon') return weaponRows(R, t.wpn);
  if (t.kind === 'shield') return shieldRows(t.shield);
  if (t.kind === 'chest' || t.kind === 'legs') return armourRows(t.armor, t.kind);
  return [];
}

/** "old → new" for each stat, with the difference: { k, old, now, diff,
 *  tone } where tone is 1 (better: the new one is higher), -1 (worse) or 0.
 *  Every stat here is better higher.  A stat only one side has compares
 *  against nothing ('—'). */
export function compareRows(oldRows, newRows) {
  const by = Object.create(null);
  for (const r of oldRows || []) by[r.k] = r;
  const out = [];
  const seen = Object.create(null);
  for (const r of newRows || []) {
    seen[r.k] = 1;
    const o = by[r.k];
    const dec = r.d || (o && o.d) || 0;
    const step = dec ? 10 : 1;
    const diffN = o ? Math.round((r.n - o.n) * step) / step : null;
    const tone = diffN == null ? 0 : diffN > 0 ? 1 : diffN < 0 ? -1 : 0;
    const mag = diffN == null ? '' : (dec ? Math.abs(diffN).toFixed(dec) : String(Math.abs(diffN)));
    out.push({
      k: r.k, old: o ? o.v : '—', now: r.v,
      diff: diffN == null ? '' : diffN === 0 ? '=' : (diffN > 0 ? '+' : '−') + mag,
      tone,
    });
  }
  for (const o of oldRows || []) {
    if (seen[o.k]) continue;
    out.push({ k: o.k, old: o.v, now: '—', diff: '', tone: -1 });
  }
  return out;
}

/** Your own numbers, STATS with nothing picked: the damage cut, the three
 *  pools, the weapon in hand's damage, speed, range and crit, dodge and move
 *  speed.  [{ k, v, key }] */
export function myStatRows(R) {
  R = R || {};
  const d = safe(() => deriveHeroStats(R), {});
  const wr = d.wpn ? weaponRows(R, d.wpn) : [];
  const w = Object.create(null);
  for (const r of wr) w[r.k] = r.v;
  const cut = combinedDamageCut(d.defPct, d.armorDr != null ? d.armorDr : safe(() => getArmorDrPct(R), 0), d.dodge);
  const move = safe(() => (prog3Live(R) ? prog3MoveMult(R) : 1), 1);
  return [
    { key: 'cut', k: 'Damage cut', v: '−' + pct1(cut) + '%' },
    { key: 'hp', k: 'HP', v: String(toDisplayHp(Number(R.maxHp) || 100)) },
    { key: 'energy', k: 'Energy', v: String(Math.round(Number(R.maxStamina) || 100)) },
    { key: 'mana', k: 'Mana', v: String(Math.round(Number(R.maxMana) || 100)) },
    { key: 'damage', k: 'Damage', v: w.Damage || '—' },
    { key: 'speed', k: 'Speed', v: w.Speed || '—' },
    { key: 'range', k: 'Range', v: w.Range || '—' },
    { key: 'crit', k: 'Crit', v: pct1(d.crit) + '%' },
    { key: 'dodge', k: 'Dodge', v: pct1(d.dodge) + '%' },
    { key: 'move', k: 'Move', v: '+' + Math.round(((Number(move) || 1) - 1) * 100) + '%' },
  ];
}

/* ═══ v2.3.4081: STATS AS THE OWNER'S MOCKUP DRAWS IT (2026-11-03) ═══
 * "Level N", then "Character Stats" (HP, MP, STAM, DEF, DODGE, RESIST), then a
 * gold box for the weapon in your hand ("Sword (Active)": DMG, SPD, CRIT,
 * RANGE, ELEM).  Every number is the game's own, read as above: NO "Combat
 * Power" -- the mockup drew one, the game has no such number, and a made-up
 * total would be the one number on the page nothing else agrees with.
 * DEF is the damage cut (Defense and armour together, combinedDamageCut:
 * the Character page's own number), not the Defense points alone, which the
 * owner found misleading (PR #1350). */

/** The character level: the worker's own rpg.level (prog3.js sets it to
 *  _prog3CharLevel), the number the status frame's badge shows, so the two
 *  never disagree; prog3CharLevel (its mirror) only for a blob without one. */
export function charLevel(R) {
  R = R || {};
  const own = Math.floor(Number(R.level) || 0);
  if (own >= 1) return own;
  return safe(() => (prog3Live(R) ? prog3CharLevel(R) : 1), 1);
}

/** "Character Stats": [{ key, k (the mockup's short word), v, title }]. */
export function charStatRows(R) {
  R = R || {};
  const d = safe(() => deriveHeroStats(R), {});
  const cut = safe(() => combinedDamageCut(d.defPct, d.armorDr != null ? d.armorDr : getArmorDrPct(R), d.dodge), 0);
  return [
    { key: 'hp', k: 'HP', v: String(safe(() => toDisplayHp(Number(R.maxHp) || 100), 100)), title: 'Max health' },
    { key: 'mana', k: 'MP', v: String(Math.round(Number(R.maxMana) || 100)), title: 'Max mana' },
    { key: 'stam', k: 'STAM', v: String(Math.round(Number(R.maxStamina) || 100)), title: 'Max stamina (energy)' },
    { key: 'def', k: 'DEF', v: pct1(cut) + '%', title: 'Damage cut: your Defense and armour together' },
    { key: 'dodge', k: 'DODGE', v: pct1(d.dodge) + '%', title: 'Chance to take no damage' },
    { key: 'eres', k: 'RESIST', v: pct1(safe(() => (prog3Live(R) ? prog3EresPct(R) : 0), 0)) + '%', title: 'Elemental resist' },
  ];
}

const HAND_WORD = { melee: 'Sword', ranged: 'Bow', staff: 'Staff' };
const HAND_OF = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };

/** The weapon in your hand, for its gold box: { hand, word ("Sword"), wpn,
 *  rows: [{ key, k, v }] } -- DMG, SPD (swings a second), CRIT, RANGE
 *  (tiles), ELEM (its gem's element, "None" without one).  Null with
 *  nothing in the hand. */
export function activeWeaponCard(R) {
  R = R || {};
  const hand = HAND_OF[R.activeSlot] ? R.activeSlot : 'melee';
  const wpn = R[HAND_OF[hand]] || null;
  if (!wpn) return null;
  const d = safe(() => deriveHeroStats(R), {});
  const w = Object.create(null);
  for (const r of weaponRows(R, wpn)) w[r.k] = r.v;
  const els = [wpn.element1, wpn.element2].filter((e) => typeof e === 'string' && e);
  return {
    hand, word: HAND_WORD[hand], wpn, els,
    rows: [
      { key: 'dmg', k: 'DMG', v: w.Damage || '\u2014' },
      { key: 'spd', k: 'SPD', v: w.Speed || '\u2014' },
      { key: 'crit', k: 'CRIT', v: pct1(d.crit) + '%' },
      { key: 'range', k: 'RANGE', v: w.Range || '\u2014' },
      { key: 'elem', k: 'ELEM', v: els.length ? els.map(gemElementName).join(' + ') : 'None' },
    ],
  };
}
