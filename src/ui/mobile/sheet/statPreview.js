/* What one more point in a stat actually buys (v2.3.1766).
 *
 * Owner: "a tooltip on the stat allocation screen ... include the overall
 * change to crit from baseline and the '+#DPS' changes it effects in that same
 * tooltip by allocating a point there."
 *
 * Two numbers per stat, and they answer different questions:
 *   • the STAT's own total, now -> after.  "+0.4% crit chance per point" was
 *     already on the pill, but a rate is not an answer to "what will my crit
 *     BE" — that needs the running total, which is what "from baseline" means.
 *   • the DPS that total is worth, now -> after.  This is the half you cannot
 *     do in your head, because crit chance, crit damage and swing speed all
 *     multiply into one number.
 *
 * MEASURED, NOT DERIVED BY HAND.  The after-DPS comes from applying the point
 * to a throwaway copy of the character and re-running the same calcDisplayDps
 * the rest of the UI quotes.  Re-deriving it from the per-point rate would be
 * a second implementation of the damage pipeline, and the moment the two
 * disagreed the tooltip would be the one lying to the player.
 *
 * Of the seven stats, only the three offense ones move DPS (verified: crit
 * +0.22, critDmg +0.28, aspd +0.17 on a mid-game fixture; def/hp/dodge/stam
 * all exactly 0).  A body stat therefore reports no DPS change, which is a
 * real answer to "should I put it here" rather than a gap in the tooltip.
 */
import { calcDisplayDps, getActiveWeapon, weaponForCat } from '../../../data/gameSystems.js';
import { PROG3, PROG3_LEGACY_ATK, PROG3_LINEAR, prog3Pts, prog3AtkPts, prog3IsAtkStat, isProg3XEnabled,
  isProg3RelEnabled, prog3StatAmount, prog3Curve /* v2.3.2670: the curve */ } from '../../../data/prog3.js';

/* The weapon a DPS readout should speak for.
 *
 * getActiveWeapon returns null when the ACTIVE slot is empty, which is right
 * for combat (an empty slot swings nothing) and wrong for a readout: the
 * owner's "they'll have a primary active weapon equipped if nothing else" is
 * exactly the case where the number would otherwise read as a dash.  So for
 * DISPLAY, fall back to whatever is actually worn.  Deliberately NOT a change
 * to getActiveWeapon itself — that feeds swing sfx and combat, and making it
 * hand back a bow because the melee slot is empty would change what the game
 * does, not just what it says. */
export function displayWeapon(R) {
  if (!R) return null;
  return getActiveWeapon(R) || R.weapon || R.rangedWeapon || R.staffWeapon || null;
}

/* Points -> the stat's own displayed total.  Every stat in both tables is a
   flat rate per point (PROG3.ATK / PROG3.BODY `per`), so this needs no
   per-stat cases — only the unit differs, and that rides on the stat's own
   metadata next to its name. */
function statTotal(pts, cfg, stat) {
  /* v2.3.2199: critDmg's per is the PERCENT rate now; an old worker still
     rolls the flat +2/pt, and the tooltip must total what that worker
     pays (the prog3CritFlat fallback, rule 19). */
  if (stat === 'critDmg' && !isProg3XEnabled()) return pts * 2;
  /* v2.3.2592: + the stat's BASE where it has one (luck's 1% crit chance,
     and the retired crit's).  The cell prints the total WITH the base
     (prog3CritPct), and a window that said 6.0% under a cell that said 7.0%
     was the two screens disagreeing about one number — mp-statpeek caught
     it against the character's real chance. */
  /* v2.3.2670: every CURRENT stat totals through prog3StatAmount, which knows
     both the curve (a relative worker) and the linear worker — so the window's
     now → after pair shows what the next point is really worth, first points
     biggest.  Only the retired crit pair (PROG3_LEGACY_ATK) reads its own per. */
  if (PROG3.ATK[stat] || PROG3.BODY[stat]) return prog3StatAmount(stat, pts);
  return pts * (cfg ? cfg.per : 0) + ((cfg && cfg.base) || 0);
}
/* v2.3.2670: Luck's crit-DAMAGE half, the bonus on the ×1.5 multiplier. */
function luckDmgBonus(pts) {
  return isProg3RelEnabled()
    ? PROG3.ATK.luck.dmgMax * prog3Curve(pts, PROG3.ATK.luck.k)
    : Math.min(PROG3_LINEAR.luck.cap, pts) * PROG3_LINEAR.luck.dmgPer;
}

/** Preview one more point in `stat`.  `cat` is the weapon category an offense
 *  stat belongs to ('sword' | 'bow' | 'staff'); ignored for body stats.
 *  Returns null when the character has no prog3 block to spend into. */
export function previewStatPoint(R, stat, cat) {
  if (!R || !R.prog3 || !stat) return null;
  const isAtk = prog3IsAtkStat(stat);
  const cfg = isAtk ? (PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]) : PROG3.BODY[stat]; /* v2.3.2592: the retired pair still previews against an old worker */
  if (!cfg) return null;

  const pts = isAtk ? prog3AtkPts(R, cat, stat) : prog3Pts(R, stat);
  /* v2.3.2670: a linear worker still caps at the retired numbers. */
  const capOf = (!isProg3RelEnabled() && PROG3_LINEAR[stat]) ? PROG3_LINEAR[stat].cap : cfg.cap;
  const capped = pts >= capOf;

  /* Deep copy: the allocation lives two or three levels down (prog3.atk[cat]
     [stat]), so a shallow clone would write the point straight into the real
     character — a preview that spends the point it is previewing. */
  let after = null;
  try {
    const copy = JSON.parse(JSON.stringify(R));
    if (isAtk) {
      if (!copy.prog3.atk) copy.prog3.atk = {};
      if (!copy.prog3.atk[cat]) copy.prog3.atk[cat] = {};
      copy.prog3.atk[cat][stat] = pts + 1;
    } else {
      if (!copy.prog3.alloc) copy.prog3.alloc = {};
      copy.prog3.alloc[stat] = pts + 1;
    }
    after = copy;
  } catch (e) { return null; }

  /* ═══ v2.3.2620: AN OFFENSE STAT IS PREVIEWED ON ITS OWN LANE'S WEAPON ═══
     `cat` names the lane the player is standing in, and every offense stat is
     allocated PER COMBAT TYPE — but the DPS half of this preview was computed
     on displayWeapon(R), whatever is in hand.  calcDisplayDps resolves its
     crit/speed channels from the weapon PASSED IN (gameSystems v2.3.1668), so
     reading Bow's Power while holding a sword applied the point to
     atk.bow.dmg and then measured the SWORD: the delta came back 0 and the
     window told the player, of a stat whose entire job is damage, that it
     "does not change damage".
     The scene beside these numbers already took the lane's weapon (v2.3.2231,
     for the same contradiction one layer up); this is the arithmetic half of
     that fix.  An empty lane slot yields NO weapon rather than borrowing the
     one you hold — the caller already prints "equip a weapon to see" for a
     null DPS, which is the honest answer, and lending it the sword would
     reproduce exactly the lie above. */
  const wpn = (isAtk && cat) ? weaponForCat(R, cat) : displayWeapon(R);
  const dpsNow = wpn ? calcDisplayDps(R, wpn) : null;
  const dpsAfter = wpn ? calcDisplayDps(after, wpn) : null;

  return {
    capped,
    statNow: statTotal(pts, cfg, stat),
    statAfter: statTotal(pts + 1, cfg, stat),
    /* v2.3.2592: LUCK buys two things per point, and a rate cannot answer
       "what will my crit damage BE" any more than it could for the chance —
       so the second half rides along as its own now/after pair, and the ℹ️
       window prints two rows for it.  Absent for every single-rate stat. */
    statNow2: stat === 'luck' ? luckDmgBonus(pts) : null,       /* v2.3.2670: the curve */
    statAfter2: stat === 'luck' ? luckDmgBonus(pts + 1) : null,
    dpsNow, dpsAfter,
    dpsDelta: (typeof dpsNow === 'number' && typeof dpsAfter === 'number') ? (dpsAfter - dpsNow) : null,
    weaponName: wpn ? (wpn.name || wpn.type || 'weapon') : null,
  };
}

/** The character's overall DPS right now, for the resting state of a readout.
 *  Null when nothing is equipped — a readout with no weapon behind it should
 *  say so rather than print a zero that looks like a broken build. */
export function overallDps(R) {
  const wpn = displayWeapon(R);
  if (!wpn || !R) return null;
  try { return { dps: calcDisplayDps(R, wpn), weaponName: wpn.name || wpn.type || 'weapon' }; }
  catch (e) { return null; }
}
