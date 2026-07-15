import {
  calcCritChance, calcBlockReduction, calcDisplayDmgRange, calcDisplayDps,
  calcMoveSpeed, passiveDodgeChance, getActiveWeapon, getWeaponCritStat,
  getEvasionPts, getDefenseBlockBonus, xpRequired,
} from '../../../data/gameSystems.js';

/* v2.3.1286: data model for the Hero destination (nav-system spec) —
   the combat/character dashboard that replaces the retired Build panel
   and the Self/Stats toolbar drills.  Every value comes from the same
   authoritative helpers combat actually rolls (mirrors
   StatScreenPanel/GameApp call patterns); nothing is re-derived here.

   NOTE the retired loadout's `armorDef` (chest+legs x5) is NOT revived:
   armor mitigation was never wired (v2.3.1069 note) and the spec says
   placeholders must not masquerade as real values.  Block% is the real
   defensive number. */

/* The six combat skills (ported from the retired Build column's
   CHAR_STATS).  defense levels live on R.defenseSkill; the rest are
   Tier-1 capacity stats straight off R. */
export const COMBAT_SKILLS = [
  { key: 'power',     label: 'Melee',     iconSrc: '/icons/ui/combat-melee.webp?v=2.3.1224' },
  { key: 'agility',   label: 'Bow',       iconSrc: '/icons/ui/combat-bow.webp?v=2.3.1225' },
  { key: 'mind',      label: 'Magic',     iconSrc: '/icons/ui/combat-magic.webp?v=2.3.1224' },
  /* v2.3.1292 (round-3 §4 canonical naming): the skill is Vitality (it
     raises max HP); "HP" is the resource bar's name, not the skill's. */
  { key: 'vitality',  label: 'Vitality',  iconSrc: '/icons/ui/stat-vitality.webp?v=2.3.1224' },
  /* v2.3.1282: single round shield (owner: the stat-defense art is
     "an awkward double shield"). */
  { key: 'defense',   label: 'Defense',   iconSrc: '/icons/ui/combat-defense.webp?v=2.3.1224', t2: true },
  { key: 'endurance', label: 'Endurance', iconSrc: '/icons/ui/stat-endurance.webp?v=2.3.1225' },
];

export function skillLevel(R, key) {
  if (key === 'defense') return (R.defenseSkill && R.defenseSkill.level) || 0;
  return R[key] || 0;
}

/* Per-stat XP progress toward the next point — the exact formula the
   level-up trigger uses (combatHelpers addBuildProg, v2.3.910). */
export function skillProgressPct(R, key) {
  if (key === 'defense') return 0; /* DEF strip wired with the skill in v2.3.693 */
  const val = R[key] || 0;
  const prog = (R._buildProg && R._buildProg[key]) || 0;
  const thresh = Math.max(200, Math.floor(xpRequired(val)));
  return Math.max(0, Math.min(100, (prog / thresh) * 100));
}

/* v2.3.1295 (ChatGPT round-4 Build cards): exact per-stat XP progress —
   same numbers skillProgressPct rounds into a bar, exposed so the card
   can print "14 / 463" (the bars alone read as unexplained decoration).
   Defense returns null: its strip was never wired (v2.3.693 note). */
export function skillProgress(R, key) {
  if (key === 'defense') return null;
  const val = R[key] || 0;
  const prog = Math.floor((R._buildProg && R._buildProg[key]) || 0);
  const thresh = Math.max(200, Math.floor(xpRequired(val)));
  return { prog, thresh };
}

/* v2.3.1295: one-line CURRENT effect per attribute, from the real
   formulas only — no invented percentages:
   - damage stats add statVal * 0.1667 flat to the weapon's base
     (calcDisplayDmgRange) — shown as "+N dmg" for that category;
   - vitality/endurance/mind capacity: +10 HP / +3 stam / +3.5 mana
     per point (calcMaxHp/Stam/Mana);
   - defense: the live DR% (with shield). */
export function attributeEffect(R, key) {
  const dmg = (v) => `+${((v || 0) * 0.1667).toFixed(1)} dmg`;
  switch (key) {
    case 'power':     return `${dmg(R.power)} with melee`;
    case 'agility':   return `${dmg(R.agility)} with bows`;
    case 'mind':      return `${dmg(R.mind)} with staves`;
    case 'vitality':  return `+${(R.vitality || 0) * 10} max HP`;
    case 'endurance': return `+${Math.round((R.endurance || 0) * 3)} max stamina`;
    case 'defense':   return `${Math.round(calcBlockReduction(getDefenseBlockBonus(R), R.shield) * 100)}% damage reduced`;
    default:          return '';
  }
}

export function deriveHeroStats(R) {
  const wpn = getActiveWeapon(R);
  const range = wpn ? calcDisplayDmgRange(R, wpn) : null;
  return {
    wpn,
    dmgText: range ? range.text : '0',
    dps: wpn ? calcDisplayDps(R, wpn) : 0,
    crit: calcCritChance(R.power || 0, getWeaponCritStat(R)),
    dodge: passiveDodgeChance(R.agility || 0, getEvasionPts(R)),
    speed: calcMoveSpeed(R.agility || 0, (R.enduranceSpec || {}).swiftness || 0),
    block: calcBlockReduction(getDefenseBlockBonus(R), R.shield),
    gold: R.coins || 0,
  };
}
