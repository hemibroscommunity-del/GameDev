/* ═══ v2.3.6694: LIFE SKILLS, THE SUM, THE TEN DOORS, A SKILL'S PAGE AND ITS WHOLE ROADMAP (card UI2-life, the build's step 6) ═══
 *
 * The owner, 2026-11-25, the master specification 4.4: "Sum of life skill
 * levels as headline statistic, encouraging growth across skills. This is a
 * separate measure from combat level"; "Each skill destination includes a
 * compact XP progress bar so players can see proximity to the next level
 * without opening every skill."  Part 3.3: "Meaningful unlocks, not arbitrary
 * intervals, occupy milestone nodes"; "Reveal all skill unlocks in the
 * complete roadmap, including future rewards."
 *
 * The rules the pages draw (sheet/LifeSkillsPage.jsx, LifeSkillPage.jsx,
 * LifeUnlocks.jsx); nothing here is a table of its own: the roster, its
 * display order and each ladder are sheet/skillsModel.js's, the XP a level
 * the worker's (data/lifeSkills.js LIFE_SKILL_XP: ceil(1000 x 1.08^(level-1))
 * at EVERY level, server/src/gathering.js _lifeSkillXpThreshold), farming's
 * crops data/farmCrops.js's (the worker's copy, mirror-audit), the guilds'
 * data/gameSystems.js's.
 *
 *   lifeLevel      a skill's level as its tile and the worker read it (`level || 1`: never 0)
 *   lifeTotal      the sum of the TEN (LIFE_SKILLS only: rpg.lifeSkills also holds pets, gems, ...)
 *   lifeTiles      the ten in display order (gather row, then craft row; never resorted)
 *   lifeSkillProgress  level and XP through progression.js progressOf, the worker's need
 *   lifeRoadmap    the WHOLE ladder, each rung got / next / later; farming's crops; null: no ladder
 *   lifeSkillFacts the next unlock and the latest one
 *   lifeGuildLine  "<guild>: <rank>" (every player is in the ten skill guilds)
 *   LIFE_PAGE_OF / lifeKeyOfPage  the ten frame pages, one a skill
 *
 * `who`: null is yours; another player's (step 9: nothing opens it yet) shows
 * levels only, read from `who.lifeSkills`: no XP, no "new" dot. */
import { LIFE_SKILLS, LIFE_SKILL_XP } from '../data/lifeSkills.js';
import { FARM } from '../data/farmCrops.js';
import { SKILL_GUILDS, getGuildRank } from '../data/gameSystems.js';
import { SKILL_ROSTER, SKILL_DISPLAY_10 } from '../ui/mobile/sheet/skillsModel.js';
import { progressOf } from './progression.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const rosterOf = (k) => SKILL_ROSTER.find((s) => s.key === k) || null;

/** The ten frame pages, one a skill (src/game/dashDests.js FRAME_PAGES, broHub.js BRO_HUB_PAGES name each). */
export const LIFE_PAGE_OF = Object.freeze(LIFE_SKILLS.reduce((m, k) => { m[k] = 'life' + k.charAt(0).toUpperCase() + k.slice(1); return m; }, Object.create(null)));
/** All unlocks and How it works: one page each, the skill in the stack entry's `sel`. */
export const LIFE_UNLOCKS_PAGE = 'lifeUnlocks';
export const LIFE_HOW_PAGE = 'lifeHow';

/** The skill a frame page id is (a skill's page), or null. */
export function lifeKeyOfPage(id) {
  const s = String(id);
  for (const k of LIFE_SKILLS) if (LIFE_PAGE_OF[k] === s) return k;
  return null;
}

/** A skill's level as its tile reads it and the worker reads it (gathering.js `s.level || 1`): never 0. */
export function lifeLevel(ls, key) {
  const s = own(ls, key) ? ls[key] : null;
  const n = s && typeof s === 'object' ? Math.floor(Number(s.level)) : NaN;
  return n >= 1 ? n : 1;
}

/** The ten's levels: yours (rpg.lifeSkills) or another player's (who.lifeSkills). */
function levelsOf(rpg, who) {
  if (who != null) return (who && typeof who === 'object' && who.lifeSkills && typeof who.lifeSkills === 'object') ? who.lifeSkills : null;
  return (rpg && rpg.lifeSkills && typeof rpg.lifeSkills === 'object') ? rpg.lifeSkills : null;
}

/** The headline: the sum of the ten levels on screen (LIFE_SKILLS only, each read as its tile reads it). */
export function lifeTotal(rpg, who) {
  const ls = levelsOf(rpg, who);
  let n = 0;
  for (const k of LIFE_SKILLS) n += lifeLevel(ls, k);
  return n;
}

/** A skill's level and XP as the page draws them: the worker's need at every level (no cap). */
export function lifeSkillProgress(rpg, key, who) {
  const ls = levelsOf(rpg, who);
  const lv = lifeLevel(ls, key);
  if (who != null) return Object.freeze({ level: lv, cap: null, max: false, xpNow: null, xpNeed: null, frac: null });
  const s = own(ls, key) ? ls[key] : null;
  return progressOf(lv, s && typeof s === 'object' ? s.xp : 0, LIFE_SKILL_XP(lv), null);
}

/**
 * The landing's ten, in display order (sheet/skillsModel.js SKILL_DISPLAY_10:
 * the gather row, then the craft row; never resorted).  `fresh` the skills
 * whose level-up is not yet looked at, read BEFORE the page marks them seen
 * (skillsModel.js unseenSkillKeys).  Each: key, name, art, level, frac (null
 * for another player's), dot.
 */
export function lifeTiles(rpg, who, fresh) {
  const ls = levelsOf(rpg, who);
  const nu = who == null && Array.isArray(fresh) ? fresh : [];
  return Object.freeze(SKILL_DISPLAY_10.map((sd) => {
    const p = lifeSkillProgress(rpg, sd.key, who);
    return Object.freeze({
      key: sd.key, name: sd.name, art: sd.iconSrc, page: LIFE_PAGE_OF[sd.key],
      level: lifeLevel(ls, sd.key), frac: p.frac, dot: nu.indexOf(sd.key) >= 0,
    });
  }));
}

/* farming's ladder: each crop asks a Farming level to buy and plant (farmCrops.js, the worker's farm.js) */
function farmLadder() {
  const crops = (FARM && FARM.CROPS) || {};
  return Object.keys(crops).map((id) => ({ lvl: Math.max(1, Math.floor(Number(crops[id].lvl)) || 1), name: crops[id].name, id }))
    .sort((a, b) => a.name.localeCompare(b.name));   /* the same level: by name (lifeRoadmap orders by level) */
}

/**
 * The WHOLE roadmap: every rung of the skill's real ladder, one a row, in
 * level order: { lvl, name, state } with state 'got' (its level reached),
 * 'next' (the first not reached: every rung at that level) or 'later'.  A
 * rung is both requirement and benefit ("Lv 5: Clownfish").  null: the skill
 * has no unlock by level (trapping, enchanting): the page's honest empty.
 */
export function lifeRoadmap(key, level) {
  const sd = rosterOf(key);
  let rungs = null;
  if (key === 'farming') rungs = farmLadder();
  else if (sd && Array.isArray(sd.tiers)) {
    const noun = sd.tierNoun || ((t) => t.name);
    rungs = sd.tiers.map((t) => ({ lvl: t.lvl, name: noun(t) }));
  }
  if (!rungs || !rungs.length) return null;
  rungs = rungs.slice().sort((a, b) => a.lvl - b.lvl);   /* in level order (a stable sort: a level's own order kept) */
  const lv = Math.max(1, Math.floor(Number(level)) || 1);
  const first = rungs.find((r) => r.lvl > lv);
  const nextLvl = first ? first.lvl : null;
  return Object.freeze(rungs.map((r) => Object.freeze({
    lvl: r.lvl, name: r.name, state: r.lvl <= lv ? 'got' : r.lvl === nextLvl ? 'next' : 'later',
  })));
}

/** The skill page's facts: the next unlock and the latest one (null each when none); `n` the rungs. */
export function lifeSkillFacts(key, level) {
  const road = lifeRoadmap(key, level);
  if (!road) return Object.freeze({ ladder: false, n: 0, next: null, nextAlso: 0, latest: null, latestAlso: 0 });
  const next = road.find((r) => r.state === 'next') || null;
  const got = road.filter((r) => r.state === 'got');
  const latest = got.length ? got[got.length - 1] : null;
  /* the other rungs at the same level ("Lv 10: Cabbage +4": farming opens five crops at 10) */
  const also = (r) => (r ? road.filter((x) => x.lvl === r.lvl).length - 1 : 0);
  return Object.freeze({ ladder: true, n: road.length, next, nextAlso: also(next), latest, latestAlso: also(latest) });
}

/** "<guild>: <rank>": the skill's guild and your rank in it (gameSystems.js getGuildRank). */
export function lifeGuildLine(key, level) {
  if (!own(SKILL_GUILDS, key)) return null;
  const r = getGuildRank(Math.max(1, Math.floor(Number(level)) || 1));
  return Object.freeze({ guild: SKILL_GUILDS[key].name, rank: r ? r.title : '' });
}

/** The doors of Bro's frame pages these draw (broHub.js BRO_HUB_PAGES): a skill's page, All unlocks, How it works. */
export const LIFE_DOORS = Object.freeze(['life', 'lifeUnlocks', 'lifeHow']);
export function isLifeDoor(door) { return LIFE_DOORS.indexOf(String(door)) >= 0; }

/** The roster's row for a skill (its name, art, earn hint), or null. */
export function lifeSkillOf(key) {
  return rosterOf(key);
}
