/* ═══ v2.3.4041: A COMBAT SKILL'S LEVEL, XP AND POINTS, IN ONE PLACE ═══
 * The band's three combat-skill pills (Melee / Bow / Magic) left it for the
 * Gear tab's weapon cells, each wearing its skill's level as a corner badge
 * ("Lv 7", or "+2" with points to spend), and for the computer's weapon bar.
 * Their reading rules moved here, unchanged, from DashColumns.jsx so the
 * cells, the bar and the STATS panel read one answer:
 *   - v2.3.1922 / v2.3.3769 the level reads the prog3 blob when its skills
 *     are in it (never the cap, which is absent for a moment on every load),
 *     else the legacy level;
 *   - v2.3.2620 the points are the ones THIS lane can spend: its own channel,
 *     plus the unchannelled remainder where the last level-up stamp
 *     (_p3PoolFrom) is this lane or absent (v2.3.1687's attribution);
 *   - v2.3.1853 the XP toward the next level (null at the cap).
 */
import { COMBAT_SKILLS, skillLevel, weaponSkillProgress } from '../sheet/heroModel.js';
import { prog3Live, prog3HasSkills, prog3PoolBy, prog3PoolAny, prog3SkillLevel, prog3CatFor } from '../../../data/prog3.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';

export function combatSkillLevel(rpg, s) {
  const cat = STAT_TO_WEAPON_CAT[s.key];
  const p3cat = cat ? prog3CatFor(cat) : null;
  return (prog3HasSkills(rpg) && p3cat) ? prog3SkillLevel(rpg, p3cat) : skillLevel(rpg, s.key);
}

/** The three weapon lanes' skills, in the grid's order (Sword, Bow, Staff). */
export const WEAPON_SKILLS = COMBAT_SKILLS.slice(0, 3);

export function combatSkillByKey(key) {
  for (const s of COMBAT_SKILLS) if (s.key === key) return s;
  return null;
}

/** { skill, lvl, cat, p3cat, p3, xp: {prog, thresh} | null, unspent } */
export function combatSkillState(rpg, s) {
  const R = rpg || {};
  const p3 = prog3Live(R);
  const cat = STAT_TO_WEAPON_CAT[s.key];
  const p3cat = cat ? prog3CatFor(cat) : null;
  const lvl = combatSkillLevel(R, s);
  let xp = null;
  try { xp = p3cat ? weaponSkillProgress(R, p3cat) : null; } catch (e) { xp = null; }
  const p3From = R._p3PoolFrom;
  let unspent = 0;
  try {
    unspent = p3
      ? prog3PoolBy(R, p3cat) + ((!p3From || p3From === p3cat) ? prog3PoolAny(R) : 0)
      : buildSkillUnspent(R, s.key);
  } catch (e) { unspent = 0; }
  return { skill: s, lvl, cat, p3cat, p3, xp, unspent: Number(unspent) || 0 };
}
