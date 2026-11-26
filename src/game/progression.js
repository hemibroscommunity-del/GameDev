/* ═══ v2.3.6685: A SKILL'S PROGRESS, AND ITS ROADMAP (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The master specification's 3.3: "A dedicated skill screen presents current
 * level, XP progress (current/required and next-level proximity), and a
 * compact milestone roadmap ... Meaningful unlocks, not arbitrary intervals,
 * occupy milestone nodes."  One piece for any skill with a level and an XP
 * bar: a weapon here (Sword, Bow, Staff); a life skill at step 6.
 *
 * progressOf   a level and its XP as the screen draws them: the level, the
 *              cap, the XP now and the XP the next level needs, and the
 *              fraction for a continuous bar; at the cap, `max` and no XP
 *              numbers (nothing to earn toward).
 * weaponProgress  the game's own reading of a weapon (src/data/prog3.js:
 *              prog3SkillLevel, the cap PROG3.LEVEL_CAP, the XP held at
 *              rpg.prog3.sk[cat].xp, the XP a level needs prog3XpRequired:
 *              the same three heroModel.js weaponSkillProgress reads).
 * weaponRoadmap   the ONE true line of what a weapon's level gives, read from
 *              the rule: its own points (PROG3.POINTS_PER_LEVEL, the number
 *              the worker mints a level, server/src/prog3.js:716), stamped to
 *              that weapon.  A weapon's level unlocks nothing with a name
 *              (the audit, 14 §3), so no milestone is invented; and nothing
 *              is said of SHARED points here: they come with the character
 *              level (the best weapon's, v2.3.3538), not with each weapon's
 *              (card UI2-combat, "the points rule is the game's"). */
import { PROG3, prog3SkillLevel, prog3XpRequired } from '../data/prog3.js';

const WEAPONS = Object.freeze(['sword', 'bow', 'staff']);

const whole = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

/**
 * level  the level now (1 or more)
 * xp     the XP earned toward the next level
 * need   the XP the next level needs
 * cap    the last level (null: none)
 */
export function progressOf(level, xp, need, cap) {
  const lv = Math.max(1, whole(level) || 1);
  const top = cap == null ? null : Math.max(1, whole(cap));
  if (top != null && lv >= top) return Object.freeze({ level: top, cap: top, max: true, xpNow: null, xpNeed: null, frac: 1 });
  const n = Math.max(1, whole(need) || 1);
  const x = Math.min(whole(xp), n);
  return Object.freeze({ level: lv, cap: top, max: false, xpNow: x, xpNeed: n, frac: x / n });
}

/** A weapon's level and XP, as the game holds them (rpg = S.rpg). */
export function weaponProgress(rpg, cat) {
  const c = WEAPONS.indexOf(cat) >= 0 ? cat : 'sword';
  const lv = prog3SkillLevel(rpg, c);
  const sk = rpg && rpg.prog3 && rpg.prog3.sk && rpg.prog3.sk[c];
  return progressOf(lv, sk ? sk.xp : 0, prog3XpRequired(lv), PROG3.LEVEL_CAP);
}

/** What a weapon's level gives, in rows the screen words ({ key, n }); one row, from the rule. */
export function weaponRoadmap(cat) {
  const c = WEAPONS.indexOf(cat) >= 0 ? cat : 'sword';
  return Object.freeze([Object.freeze({ key: 'combatHub.levelGives', n: PROG3.POINTS_PER_LEVEL, cat: c })]);
}
