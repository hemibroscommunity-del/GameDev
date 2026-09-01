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
import { calcDisplayDps, getActiveWeapon } from '../../../data/gameSystems.js';
import { PROG3, prog3Pts, prog3AtkPts, prog3IsAtkStat, isProg3XEnabled } from '../../../data/prog3.js';

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
  return pts * (cfg ? cfg.per : 0);
}

/** Preview one more point in `stat`.  `cat` is the weapon category an offense
 *  stat belongs to ('sword' | 'bow' | 'staff'); ignored for body stats.
 *  Returns null when the character has no prog3 block to spend into. */
export function previewStatPoint(R, stat, cat) {
  if (!R || !R.prog3 || !stat) return null;
  const isAtk = prog3IsAtkStat(stat);
  const cfg = isAtk ? PROG3.ATK[stat] : PROG3.BODY[stat];
  if (!cfg) return null;

  const pts = isAtk ? prog3AtkPts(R, cat, stat) : prog3Pts(R, stat);
  const capped = pts >= cfg.cap;

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

  const wpn = displayWeapon(R);
  const dpsNow = wpn ? calcDisplayDps(R, wpn) : null;
  const dpsAfter = wpn ? calcDisplayDps(after, wpn) : null;

  return {
    capped,
    statNow: statTotal(pts, cfg, stat),
    statAfter: statTotal(pts + 1, cfg, stat),
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
