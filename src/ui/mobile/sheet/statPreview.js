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
import { calcDisplayDps, getActiveWeapon, weaponForCat, recalcDerived /* v2.3.3050 */, toDisplayHp /* v2.3.3050 */ } from '../../../data/gameSystems.js';
import { PROG3, PROG3_LEGACY_ATK, PROG3_LINEAR, prog3Pts, prog3AtkPts, prog3IsAtkStat, isProg3XEnabled,
  isProg3RelEnabled, prog3StatAmount, prog3Curve /* v2.3.2680: the curve */, prog3Live /* v2.3.3050 */ } from '../../../data/prog3.js';

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
  /* v2.3.2680: every CURRENT stat totals through prog3StatAmount, which knows
     both the curve (a relative worker) and the linear worker — so the window's
     now → after pair shows what the next point is really worth, first points
     biggest.  Only the retired crit pair (PROG3_LEGACY_ATK) reads its own per. */
  if (PROG3.ATK[stat] || PROG3.BODY[stat]) return prog3StatAmount(stat, pts);
  return pts * (cfg ? cfg.per : 0) + ((cfg && cfg.base) || 0);
}
/* v2.3.2680: Luck's crit-DAMAGE half, the bonus on the ×1.5 multiplier. */
function luckDmgBonus(pts) {
  return isProg3RelEnabled()
    ? PROG3.ATK.luck.dmgMax * prog3Curve(pts, PROG3.ATK.luck.k)
    : Math.min(PROG3_LINEAR.luck.cap, pts) * PROG3_LINEAR.luck.dmgPer;
}

/* ═══ v2.3.2979: THE CHARACTER AFTER THE POINTS, IN ONE PLACE ═══
   previewStatPoint built this copy inline for its DPS half; the window's
   scene (statSim.js) now needs the very same "you, plus n points" to fight
   its slime with.  Two copies of the spend would be two answers to "what
   does the point do" on one screen, so the copy moved here and both read it.
   Returns null when there is no prog3 block to spend into, or the stat is not
   one this worker knows. */
export function withPoints(R, stat, cat, n) {
  const step = Math.max(1, Math.floor(Number(n) || 1));
  if (!R || !R.prog3 || !stat) return null;
  const isAtk = prog3IsAtkStat(stat);
  const cfg = isAtk ? (PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]) : PROG3.BODY[stat]; /* v2.3.2592: the retired pair still previews against an old worker */
  if (!cfg) return null;
  const pts = isAtk ? prog3AtkPts(R, cat, stat) : prog3Pts(R, stat);
  /* Deep copy: the allocation lives two or three levels down (prog3.atk[cat]
     [stat]), so a shallow clone would write the point straight into the real
     character — a preview that spends the point it is previewing. */
  try {
    const copy = JSON.parse(JSON.stringify(R));
    if (isAtk) {
      if (!copy.prog3.atk) copy.prog3.atk = {};
      if (!copy.prog3.atk[cat]) copy.prog3.atk[cat] = {};
      copy.prog3.atk[cat][stat] = pts + step;
    } else {
      if (!copy.prog3.alloc) copy.prog3.alloc = {};
      copy.prog3.alloc[stat] = pts + step;
    }
    return copy;
  } catch (e) { return null; }
}

/* ═══ v2.3.3050: A POOL'S POINT READS AS THE POOL'S NEW TOTAL ═══
   Owner: "Max hp in the stat confirmation preview window is showing 48hp for
   6 points but the preview animation shows the character with 37/37 points for
   HP if allocated those 6 points (I spent the points and it was actually
   37)."  The window's row printed statTotal -- the POINTS' bonus (6 x 8 = 48)
   -- and in the worker's raw HP, while the scene beside it (and every bar in
   the game) shows the TOTAL in display HP: floor(100 + 6 x level + 8 x pts),
   shown ceil(/5).  A level-6 character: 136 raw (28) now, 184 raw (37) after.
   So the three pool stats -- Max HP, Stamina, Max Mana -- read the pool
   itself, through recalcDerived on a COPY (the mirror of the worker's
   _prog3Recompute every echo is measured against), HP in display units, as
   the bar does.  `pooled`/`derivedInPlace` moved here from statSim.js so the
   window and the scene share one copy of the arithmetic. */
export const POOL_STAT = { hp: 'maxHp', stam: 'maxStamina', mana: 'maxMana' };

/** recalcDerived on a copy the caller already owns, in place. */
export function derivedInPlace(c) {
  if (c && prog3Live(c)) { try { recalcDerived(c); } catch (e) { /* keep the copy as it was */ } }
  return c;
}
/** The derived pools of a COPY of R -- the live character is never touched. */
export function pooled(R) {
  if (!R) return R;
  let c;
  try { c = JSON.parse(JSON.stringify(R)); } catch (e) { return R; }
  return derivedInPlace(c);
}
/** A pool's total as the game SHOWS it: HP in display units (the bars'
 *  toDisplayHp), stamina and mana as the bars print them. */
export function poolShown(stat, R) {
  const key = POOL_STAT[stat];
  const v = R && key ? Number(R[key]) : NaN;
  if (!isFinite(v)) return null;
  return stat === 'hp' ? toDisplayHp(v) : Math.round(v);
}

/* v2.3.2979: is `stat` already at the most this worker will let it hold?
   (The [+]'s own refusal is prog3StatCap -- the per-level bound -- and the
   window says so; this is the stat's hard ceiling, which is what decides
   whether there is any "after" to show at all.) */
export function statCapped(R, stat, cat) {
  if (!R || !R.prog3 || !stat) return false;
  const isAtk = prog3IsAtkStat(stat);
  const cfg = isAtk ? (PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]) : PROG3.BODY[stat];
  if (!cfg) return false;
  const pts = isAtk ? prog3AtkPts(R, cat, stat) : prog3Pts(R, stat);
  /* v2.3.2680: a linear worker still caps at the retired numbers. */
  const capOf = (!isProg3RelEnabled() && PROG3_LINEAR[stat]) ? PROG3_LINEAR[stat].cap : cfg.cap;
  return pts >= capOf;
}

/** Preview one more point in `stat`.  `cat` is the weapon category an offense
 *  stat belongs to ('sword' | 'bow' | 'staff'); ignored for body stats.
 *  Returns null when the character has no prog3 block to spend into.
 *  v2.3.2695: `n` previews that many points at once -- the confirm window's
 *  +/- stepper shows what the WHOLE batch buys, not the first point of it.
 *  Omitted, it is the single point every older caller asked for. */
export function previewStatPoint(R, stat, cat, n) {
  const step = Math.max(1, Math.floor(Number(n) || 1));
  if (!R || !R.prog3 || !stat) return null;
  const isAtk = prog3IsAtkStat(stat);
  const cfg = isAtk ? (PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]) : PROG3.BODY[stat]; /* v2.3.2592: the retired pair still previews against an old worker */
  if (!cfg) return null;

  const pts = isAtk ? prog3AtkPts(R, cat, stat) : prog3Pts(R, stat);
  const capped = statCapped(R, stat, cat);   /* v2.3.2979: one definition, shared with the scene */

  /* v2.3.2979: the copy is withPoints' now (above), so the scene beside these
     numbers fights with exactly the character they describe. */
  const after = withPoints(R, stat, cat, step);
  if (!after) return null;

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

  /* v2.3.3050: a pool stat's pair is the POOL, now -> after (above) */
  const isPool = !isAtk && Object.prototype.hasOwnProperty.call(POOL_STAT, stat);
  const poolNow = isPool ? poolShown(stat, pooled(R)) : null;
  const poolAfter = isPool ? poolShown(stat, derivedInPlace(after)) : null;
  const usePool = isPool && poolNow != null && poolAfter != null;
  return {
    capped,
    statNow: usePool ? poolNow : statTotal(pts, cfg, stat),
    statAfter: usePool ? poolAfter : statTotal(pts + step, cfg, stat),
    /* v2.3.3050: true when the pair is a pool's whole total (print it whole) */
    pool: usePool,
    /* v2.3.2592: LUCK buys two things per point, and a rate cannot answer
       "what will my crit damage BE" any more than it could for the chance —
       so the second half rides along as its own now/after pair, and the ℹ️
       window prints two rows for it.  Absent for every single-rate stat. */
    statNow2: stat === 'luck' ? luckDmgBonus(pts) : null,       /* v2.3.2680: the curve */
    statAfter2: stat === 'luck' ? luckDmgBonus(pts + step) : null,
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
