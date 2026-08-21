import {
  calcCritChance, calcBlockReduction, calcDisplayDmgRange, calcDisplayDps,
  calcMoveSpeed, passiveDodgeChance, getActiveWeapon, getWeaponCritStat,
  getEvasionPts, getDefenseBlockBonus, xpRequired, weaponXpRequired,
  buildSkillUnspent, getArmorDrPct,
} from '../../../data/gameSystems.js';
/* v2.3.1660: trained-skill rebuild mirrors — display branches only;
   the legacy formulas stay for old workers (rule 19). */
import {
  prog3Live, prog3Pool, prog3CritPct, prog3CritFlat, prog3DodgePct,
  prog3DefPct, prog3SkillLevel, prog3XpRequired, PROG3,
  PROG3_SKILL_META, /* v2.3.1848: bestWeaponProgress needs the icons */
} from '../../../data/prog3.js';

/* v2.3.1286: data model for the Hero destination (nav-system spec) —
   the combat/character dashboard that replaces the retired Build panel
   and the Self/Stats toolbar drills.  Every value comes from the same
   authoritative helpers combat actually rolls (mirrors
   StatScreenPanel/GameApp call patterns); nothing is re-derived here.

   ARMOUR (v2.3.1697 — this note used to say the opposite).  For years the
   pane deliberately showed NO armour number, because the retired loadout's
   `armorDef` (chest+legs x5) was invented arithmetic: armor mitigation was
   never wired (v2.3.1069), armor bought max HP instead, and the sheet spec
   forbids placeholders masquerading as real values.
   That reason expired.  v2.3.1679 wired REAL per-hit mitigation
   (`_armorDrMult`, consumed by the server's `_applyDamage`), and v2.3.1697
   removed the max-HP fold on the owner's instruction, leaving mitigation as
   armour's only effect — and nothing in the game displayed it.  `armorDr`
   below is that number, from `getArmorDrPct`, an exact mirror of the server
   function rather than a second formula.  Block% is NOT the defensive
   number any more (it was never even shown here — see the v2.3.1668 note
   further down for why it was pulled). */

/* The six combat skills (ported from the retired Build column's
   CHAR_STATS).  defense levels live on R.defenseSkill; the rest are
   Tier-1 capacity stats straight off R. */
/* v2.3.1311 (owner's canonical taxonomy): the SIX combat parents are
   Melee, Bow, Magic, Vitality, Defense, STAMINA — each owning a family
   of 5 tier-2 categories.  'Stamina' is the parent's NAME everywhere
   the player reads it; the storage key stays 'endurance' (renaming a
   persisted rpg field breaks saves — rule 1).  Icons are the owner's
   hero-stat sheet (magenta-keyed, tools/process_hero_stats_sheet.py). */
export const COMBAT_SKILLS = [
  { key: 'power',     label: 'Melee',    iconSrc: '/icons/ui/hero/melee.webp?v=2.3.1311' },
  { key: 'agility',   label: 'Bow',      iconSrc: '/icons/ui/hero/bow.webp?v=2.3.1311' },
  { key: 'mind',      label: 'Magic',    iconSrc: '/icons/ui/hero/magic.webp?v=2.3.1311' },
  /* v2.3.1292 (round-3 §4 canonical naming): the skill is Vitality (it
     raises max HP); "HP" is the resource bar's name, not the skill's. */
  { key: 'vitality',  label: 'Vitality', iconSrc: '/icons/ui/hero/vitality.webp?v=2.3.1311' },
  { key: 'defense',   label: 'Defense',  iconSrc: '/icons/ui/hero/defense.webp?v=2.3.1311', t2: true },
  { key: 'endurance', label: 'Stamina',  iconSrc: '/icons/ui/hero/endurance.webp?v=2.3.1311' },
];

/* v2.3.1635: the GLOBAL unspent-point total, in one place.  The Hero
   toolbar badge (v2.3.1311) computed this inline in BottomDashboard, and
   the persistent identity row now shows the same number a few pixels
   away — two inline copies of the same reduce is exactly how a badge and
   a chip end up disagreeing after someone adds a seventh skill.  One
   definition; both read it. */
export function unspentPointsTotal(R) {
  if (!R) return 0;
  /* v2.3.1660 (prog3): the rebuild has ONE pool — the badge and the
     identity chip both show it. */
  if (prog3Live(R)) return prog3Pool(R);
  return COMBAT_SKILLS.reduce((n, s) => n + buildSkillUnspent(R, s.key), 0);
}

export function skillLevel(R, key) {
  if (key === 'defense') return (R.defenseSkill && R.defenseSkill.level) || 0;
  return R[key] || 0;
}

/* Per-stat XP progress toward the next point — the exact formula the
   level-up trigger uses (combatHelpers addBuildProg, v2.3.910). */
export function skillProgressPct(R, key) {
  const p = skillProgress(R, key);
  if (!p || !p.thresh) return 0;
  return Math.max(0, Math.min(100, (p.prog / p.thresh) * 100));
}

/* v2.3.1295 (ChatGPT round-4 Build cards): exact per-stat XP progress —
   same numbers skillProgressPct rounds into a bar, exposed so the card
   can print "14 / 463" (the bars alone read as unexplained decoration). */
export function skillProgress(R, key) {
  /* v2.3.1313 (owner: 'add the xp bar for defense like the rest'):
     Defense finally gets its strip — its track is defenseSkill.xp
     against weaponXpRequired(level), the exact awardDefenseXp curve
     (the v2.3.693 'never wired' note is retired). */
  if (key === 'defense') {
    const sk = R.defenseSkill || { level: 0, xp: 0 };
    return { prog: Math.floor(sk.xp || 0), thresh: Math.max(1, Math.floor(weaponXpRequired(sk.level || 0))) };
  }
  const val = R[key] || 0;
  const prog = Math.floor((R._buildProg && R._buildProg[key]) || 0);
  const thresh = Math.max(200, Math.floor(xpRequired(val)));
  return { prog, thresh };
}

/* v2.3.1311 (owner: "1097 / 500 XP" at Lv 1 is invalid): normalized
   progress toward the NEXT COMBAT LEVEL for the identity strip.
   rpg.xp is a LIFETIME cumulative counter and rpg.level is DERIVED
   from the sum of the six skill levels (recalcDerived v2.3.910) — the
   two are on unrelated scales, which is how the old strip's numerator
   blew past its denominator.  The next combat level arrives when the
   FIRST skill crosses its own _buildProg threshold (addBuildProg
   grants the point; +1 point = +1 derived level), so the honest
   "XP to next level" is the best-progressed skill's exact prog/thresh
   — the same numbers the Build cards print.  Clamped so the numerator
   can never exceed the denominator, per the spec.  Lifetime XP moved
   to Records. */
/* ═══ v2.3.1848: WHICH WEAPON IS CLOSEST TO ITS NEXT LEVEL ═══
 * Owner, on the band's new summary: "the XP bar will need to be shown based
 * on whatever weapon is closest to the next level with a little weapon icon
 * preceding it."
 *
 * combatLevelProgress below already picks the best-progressed track — but it
 * answers a different question ("when does my CHARACTER level") and so it
 * considers every skill, which under the legacy blob includes Vitality,
 * Defense and Stamina.  Those are not weapons, and a bar preceded by a shield
 * icon is not what was asked for.  This one is restricted to the three
 * weapon skills in both branches, and it returns WHICH one won, because the
 * icon is half the ask.
 *
 * A capped skill is skipped rather than shown at 100%: "closest to the next
 * level" has no meaning for a skill with no next level, and a permanently
 * full bar reads as a bug.  With all three capped there is nothing honest to
 * draw, so it returns null and the caller omits the row. */
export function bestWeaponProgress(R) {
  if (!R) return null;
  let best = null;
  if (prog3Live(R)) {
    for (const meta of PROG3_SKILL_META) {
      const lvl = prog3SkillLevel(R, meta.key);
      if (lvl >= PROG3.LEVEL_CAP) continue;
      const sk = (R.prog3.sk && R.prog3.sk[meta.key]) || {};
      const prog = Math.floor(sk.xp || 0);
      const thresh = Math.max(1, prog3XpRequired(lvl));
      if (!best || prog / thresh > best.prog / best.thresh) {
        best = { prog: Math.min(prog, thresh), thresh, level: lvl,
          key: meta.key, label: meta.label, iconSrc: meta.iconSrc };
      }
    }
    return best;
  }
  /* Legacy blob: the first three COMBAT_SKILLS are the weapon ones, in the
     same Melee/Bow/Magic order.  Sliced rather than filtered by key so this
     cannot silently pick up a fourth skill if the list grows. */
  for (const sk of COMBAT_SKILLS.slice(0, 3)) {
    const p = skillProgress(R, sk.key);
    if (!p || !p.thresh) continue;
    if (!best || p.prog / p.thresh > best.prog / best.thresh) {
      best = { prog: Math.min(p.prog, p.thresh), thresh: p.thresh,
        level: R[sk.key] || 0, key: sk.key, label: sk.label, iconSrc: sk.iconSrc };
    }
  }
  return best;
}

export function combatLevelProgress(R) {
  /* v2.3.1660 (prog3): the next character level arrives when the
     best-progressed TRAINED skill crosses its threshold (level = Σ
     trained) — same "best track" idea, new tracks. */
  if (prog3Live(R)) {
    let bestP3 = null;
    for (const cat of PROG3.SKILLS) {
      const lvl = prog3SkillLevel(R, cat);
      if (lvl >= PROG3.LEVEL_CAP) continue;
      const sk = (R.prog3.sk && R.prog3.sk[cat]) || {};
      const p = { prog: Math.floor(sk.xp || 0), thresh: Math.max(1, prog3XpRequired(lvl)) };
      if (!bestP3 || p.prog / p.thresh > bestP3.prog / bestP3.thresh) bestP3 = p;
    }
    if (!bestP3) return { prog: 1, thresh: 1 }; // all three maxed
    return { prog: Math.min(bestP3.prog, bestP3.thresh), thresh: bestP3.thresh };
  }
  let best = null;
  for (const s of COMBAT_SKILLS) {
    const p = skillProgress(R, s.key);
    if (!p || !p.thresh) continue;
    if (!best || p.prog / p.thresh > best.prog / best.thresh) best = p;
  }
  if (!best) return { prog: 0, thresh: 500 };
  return { prog: Math.min(best.prog, best.thresh), thresh: best.thresh };
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
    /* v2.3.1311: this number is calcBlockReduction — shield BLOCK, not
       persistent mitigation (Iron Skin/armor aren't in it) — so say so. */
    case 'defense':   return `${Math.round(calcBlockReduction(getDefenseBlockBonus(R), R.shield) * 100)}% blocked with shield`;
    default:          return '';
  }
}

/* v2.3.1311c (owner): the Build cards describe the PARENT — each of
   the six combat parents houses a family of five tier-2 category
   skills (the T2Panel spend screen lists them).  The old effect line
   ("+0.2 dmg with melee") described the T1 stat, not the family. */
export function parentBlurb(key) {
  switch (key) {
    case 'power':     return '5 melee skills';
    case 'agility':   return '5 bow skills';
    case 'mind':      return '5 magic skills';
    case 'vitality':  return '5 HP skills';
    case 'defense':   return '5 defense skills';
    case 'endurance': return '5 energy skills';
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
    /* v2.3.1660 (prog3): crit/dodge come from the allocated stats —
       the same numbers the server rolls.  Damage/DPS already branch
       inside calcDisplayDmgRange/Dps.
       v2.3.1668: crit reads the ACTIVE weapon's block (offense is
       per-type now), and two genuinely-informative numbers join it —
       see the honesty note below. */
    crit: prog3Live(R) ? prog3CritPct(R) : calcCritChance(R.power || 0, getWeaponCritStat(R)),
    critDmg: prog3Live(R) ? prog3CritFlat(R) : 0,
    defPct: prog3Live(R) ? prog3DefPct(R) : 0,
    /* v2.3.1697: worn armour's real damage reduction — the exact multiplier
       the server applies per hit (getArmorDrPct mirrors _armorDrMult).  Not
       prog3-gated: armour mitigation is server-side for EVERY player, old
       blob or respecced, so gating it would hide a live effect from half
       the playerbase. */
    armorDr: getArmorDrPct(R),
    dodge: prog3Live(R) ? prog3DodgePct(R) : passiveDodgeChance(R.agility || 0, getEvasionPts(R)),
    /* v2.3.1668: `speed` and `block` are RETAINED for legacy readers but
       are no longer shown on the Hero pane, because under prog3 neither
       tells the truth:
         - speed was calcMoveSpeed(0,0) — the literal constant 5.0,
           forever, since agility died with T1.  A stat cell that can
           never change value is decoration.
         - block was calcBlockReduction(getDefenseBlockBonus(R), shield),
           and getDefenseBlockBonus is a `return 0` stub, so it read a
           fixed 25% (27% holding any shield).  Worse, blocking in this
           game is FULL invulnerability (v2.3.232), so "25%" was not
           merely stale, it described the wrong mechanic.
       The prog3 `def` stat — real, allocated, and previously shown
       NOWHERE — takes their place on the pane. */
    speed: prog3Live(R) ? calcMoveSpeed(0, 0) : calcMoveSpeed(R.agility || 0, (R.enduranceSpec || {}).swiftness || 0),
    block: calcBlockReduction(getDefenseBlockBonus(R), R.shield),
    gold: R.coins || 0,
  };
}
