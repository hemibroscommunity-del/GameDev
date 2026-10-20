/* ═══ v2.3.3513: THE GEMS A WEAPON TAKES (the worker's weapongem.js) ═══
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good".  A
 * weapon's gem is put in by the worker now: the Enchanter asks
 * (game/weaponGem.js) and the worker answers.  These are the rules the
 * Enchanter shows BEFORE it asks, so it never offers a button the worker
 * will refuse -- each one the worker's own, held equal to it by
 * server/test/mirror-audit.test.mjs:
 *
 *   WEAPON_GEMS      data.js WEAPON_GEMS: the eight lands' elements (Dark and
 *                    Light are the realms', not built)
 *   VOLATILE_PAIRS   weapongem.js WEAPON_GEM.VOLATILE_PAIRS
 *   SECOND_SLOT_LVL  weapongem.js WEAPON_GEM.SECOND_SLOT_LVL
 *   GEM_SET_XP       data.js GEM_SET_XP (decision 11: 400 a gem, once)
 *   weaponGemSlots   weapongem.js weaponGemSlots (a drop with no base: 1)
 *   ELEM_UP_MULT, SOAK_HIT_MULT, SHOCK_SPARK_R, SHOCK_SPARK_PCT
 *                    v2.3.3518: elemental.js ELEM_UP, SOAK_HIT, SHOCK_SPARK
 *                    (every gem pulls its weight, docs/GEM-PLAN.md Phase 4)
 *
 * No imports but the forge tables and the elements' wheel, so the audit can
 * read it in plain node. */
import { BLACKSMITH_TIERS, WOODWORKING_TIERS, EFFECTIVENESS } from './gameSystems.js';

export const WEAPON_GEMS = Object.freeze(['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind', 'flora']);

export const VOLATILE_PAIRS = Object.freeze([
  ['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'],
  ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame'],
].map((p) => Object.freeze(p)));

export const SECOND_SLOT_LVL = 20;
export const GEM_SET_XP = 400;
/* v2.3.3518: a hit whose gem beats the monster's element lands this much
   harder (caps.elemup); a soaked monster's blows land this much as hard
   (caps.soakhit); a hit on a shocked monster sparks this far, for this share
   of the hit (caps.shockspark) */
export const ELEM_UP_MULT = 1.25;
export const SOAK_HIT_MULT = 0.8;
export const SHOCK_SPARK_R = 150;
export const SHOCK_SPARK_PCT = 0.25;
export const FUSION_BASES = Object.freeze(['worldbreaker', 'ww_worldbreaker']);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export function isWeaponGem(e) {
  return typeof e === 'string' && WEAPON_GEMS.indexOf(e) >= 0;
}

export function isVolatilePair(a, b) {
  return VOLATILE_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/* The gem slots a weapon has, as the worker counts them: its forge tier's
   `slots`, by its gearBase ('ww_<wood>' the Woodworker's table); a weapon
   with no known base has one. */
export function weaponGemSlots(w) {
  if (!w || typeof w !== 'object') return 0;
  const base = typeof w.gearBase === 'string' ? w.gearBase : '';
  const ww = base.indexOf('ww_') === 0;
  const key = ww ? base.slice(3) : base;
  const table = ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
  const t = key && own(table, key) ? table[key] : null;
  const n = t && Number.isInteger(t.slots) ? t.slots : 1;
  return Math.max(1, Math.min(2, n));
}

/* What each gem does to what it hits -- the worker's rules in plain words
   (elemental.js, monsterstatus.js), for the Enchanter's one line.  `hold`:
   the hold rule is on (caps.monsterhold), so a freeze or a root stops a
   monster for 1.5 s, not for as long as it lasts.  v2.3.3518: `caps`, the
   worker's (S._serverCaps): water and storm say what they do on their own
   only against a worker that does it (soakhit, shockspark). */
export function weaponGemEffect(e, hold, caps) {
  const c = caps || {};
  switch (e) {
    case 'flame': return 'Burns what it hits';
    case 'frost': return hold ? 'Freezes what it hits for 1.5 s, then chills it' : 'Freezes what it hits';
    case 'water': return c.soakhit
      ? 'Soaks what it hits: its blows land ' + Math.round((1 - SOAK_HIT_MULT) * 100) + '% softer'
      : 'Soaks what it hits, to set up a combo';
    case 'venom': return hold ? 'Roots what it hits for 1.5 s and poisons it' : 'Roots and poisons what it hits';
    case 'storm': return c.shockspark
      ? 'Shocks what it hits: each hit after sparks to a monster beside it'
      : 'Shocks what it hits, to set up a combo';
    case 'stone': return 'Cracks what it hits: +6% damage a hit, up to +30%';
    case 'wind': return 'Slows what it hits';
    case 'flora': return 'Thorns hurt what it hits whenever it attacks';
    default: return '';
  }
}

/* ═══ v2.3.3518: THE MATCHUP ("UP"), IN WORDS ═══
   The element a gem's hit beats on the elements' wheel (gameSystems.js
   EFFECTIVENESS, the worker's own table), or null; and the line that says so
   -- "25% harder on Frost monsters" -- shown only against a worker that does
   it (caps.elemup). */
export function weaponGemBeats(e) {
  for (const pair of EFFECTIVENESS) if (pair[0] === e) return pair[1];
  return null;
}
export function weaponGemEdge(e, caps) {
  const weak = (caps && caps.elemup) ? weaponGemBeats(e) : null;
  if (!weak) return '';
  return Math.round((ELEM_UP_MULT - 1) * 100) + '% harder on ' + weak.charAt(0).toUpperCase() + weak.slice(1) + ' monsters';
}
