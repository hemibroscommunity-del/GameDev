/* ═══ v2.3.6865: BRO · SKILLS' RULES (card MN step 6; src/game/menus3Skills.js) ═══
 *
 * The owner's Skills in the new panel, its rules played on the module
 * itself.  This suite imports nothing from server/src: it tests the page's
 * own rules (as menus3-quests.test does) and does not deploy.
 *
 *   1. THE TEN: all ten life skills (never the wireframe's six), in the
 *      display order, gather row over craft row; each its level (never 0)
 *      and its XP share at the worker's price; the sum; a fresh level-up
 *      dots only its own tile;
 *   2. A SKILL'S PAGE: its level and XP, the next and the latest unlock from
 *      the real ladder; a skill with no ladder says so; a forged key opens
 *      nothing;
 *   3. ITS GUILD, INLINE: the rank by the skill's level, the next rank and
 *      its AP, the bar to it as today's window draws it, the ladder, the
 *      guild's quest with its reward, done when the level is reached; every
 *      quest done: none; the guildmaster's line by level; the titles that
 *      name the skill;
 *   4. THE CLAIM: only a done quest has one; today's request only against a
 *      worker that pays it (caps.guilds) and with a channel; else "Not open
 *      yet" or offline -- never a mint; the step the answer moves;
 *   5. THE ROAD: Skills is built; Bro's three are the panel's; its pages
 *      stack with Back. */
import { MENUS3_SKILL_PAGES, isLifeSkill, skillsGrid, skillPage, skillLadder, skillGuild, guildClaim, guildStep, guildQuoteKey, guildTitles, skillsKey } from '../../src/game/menus3Skills.js';
import { LIFE_SKILLS, LIFE_SKILL_XP } from '../../src/data/lifeSkills.js';
/* the guild quests' first two, as the game's table holds them (the guilds' GUILD_QUESTS; this suite
   reads it through the module, not by its path: tests-by-system) */
const GUILD_QUESTS = [
  { title: 'First Steps', checkLvl: 5, reward: { gold: 30, ap: 10 } },
  { title: 'Finding Your Rhythm', checkLvl: 15, reward: { gold: 80, ap: 25 } },
];
const GUILD_QUESTS_N = 8;
import { MENUS3_BUILT, MENUS3, menus3Route, menus3KeyRoad } from '../../src/game/menus3Router.js';
import { navStart, navPush, navBack, navTop } from '../../src/game/menus3Nav.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

const R = {
  lifeSkills: {
    fishing: { level: 12, xp: 300 }, mining: { level: 5, xp: 10 }, cooking: { level: 30, xp: 0 },
    woodcutting: { level: 0, xp: 0 }, trapping: { level: 3, xp: 50 },
  },
  _guildProgress: { cooking: 1 },
  _titles: ['Master Fisher', 'Iron Chef', 'Fishing Legend'],
};

/* ── 1. the ten ── */
{
  const g = skillsGrid(R, ['mining']);
  check('1a all ten, never the sample\'s six', g.tiles.length === 10 && g.tiles.length === LIFE_SKILLS.length);
  check('1b the display order: the gather five, then the craft five',
    g.tiles.map((t) => t.key).slice(0, 5).join() === 'woodcutting,fishing,mining,farming,trapping', g.tiles.map((t) => t.key));
  check('1c a level is never 0', g.tiles.find((t) => t.key === 'woodcutting').level === 1);
  const f = g.tiles.find((t) => t.key === 'fishing');
  check('1d the XP share at the worker\'s price', Math.abs(f.frac - 300 / LIFE_SKILL_XP(12)) < 1e-9, f.frac);
  check('1e the sum of the ten', g.total === 12 + 5 + 30 + 1 + 3 + 5, g.total);
  check('1f a fresh level-up dots its own tile only', g.tiles.filter((t) => t.dot).map((t) => t.key).join() === 'mining');
  check('1g no record: ten at level 1', skillsGrid(null, null).tiles.every((t) => t.level === 1));
}

/* ── 2. a skill's page ── */
{
  const p = skillPage(R, 'mining');
  check('2a its level and XP', p.progress.level === 5 && p.progress.xpNow === 10 && p.progress.xpNeed === LIFE_SKILL_XP(5));
  check('2b the next unlock is past its level, the latest at or under it', p.facts.next.lvl > 5 && p.facts.latest.lvl <= 5);
  const l = skillLadder(R, 'mining');
  check('2c the whole ladder, each rung got / next / later', l.length === p.facts.n && l.some((r) => r.state === 'got') && l.filter((r) => r.state === 'next').length >= 1);
  check('2d a skill with no ladder says so', skillPage(R, 'enchanting').facts.ladder === false && skillLadder(R, 'enchanting') === null);
  check('2e a forged key opens nothing', skillPage(R, '__proto__') === null && skillPage(R, 'toString') === null && !isLifeSkill('constructor'));
  check('2f the pages', MENUS3_SKILL_PAGES.join() === 'root,skill,unlocks');
}

/* ── 3. its guild ── */
{
  const g = skillGuild(R, 'fishing');
  check('3a the guild and its master', !!g.name && !!g.master);
  check('3b the rank by the skill\'s level (12: Apprentice)', g.rank.title === 'Apprentice');
  check('3c the next rank and its AP', g.next && g.next.title === 'Journeyman' && g.next.minLvl === 25 && g.next.ap > 0);
  check('3d the bar as today\'s window: from this rank to the next', Math.abs(g.frac - (12 - 10) / (25 - 10)) < 1e-9, g.frac);
  check('3e the ladder, got by level', g.ranks.length >= 7 && g.ranks[0].got && g.ranks[1].got && !g.ranks[2].got);
  check('3f the guild quest: the first, done at its level', g.quest && g.quest.title === GUILD_QUESTS[0].title && g.quest.complete === (12 >= GUILD_QUESTS[0].checkLvl));
  check('3g its reward in gold and AP', g.quest.gold === GUILD_QUESTS[0].reward.gold && g.quest.ap === GUILD_QUESTS[0].reward.ap);
  const c = skillGuild(R, 'cooking');
  check('3h the next quest after one is handed in', c.quest && c.quest.title === GUILD_QUESTS[1].title);
  const all = skillGuild({ lifeSkills: { cooking: { level: 99 } }, _guildProgress: { cooking: GUILD_QUESTS_N } }, 'cooking');
  check('3i every quest done: none', all.quest === null);
  const top = skillGuild({ lifeSkills: { cooking: { level: 200 } } }, 'cooking');
  check('3j the top rank: no next, the bar full', top.next === null && top.frac === 1);
  check('3k the guildmaster\'s line by level', guildQuoteKey(1) === 'q10' && guildQuoteKey(10) === 'q25' && guildQuoteKey(60) === 'q75' && guildQuoteKey(100) === 'qMax');
  check('3l the titles that name the skill', guildTitles(R, 'fishing').join() === 'Fishing Legend' && guildTitles(R, 'gemCutting').length === 0);
  check('3m a skill with no record still has its guild, at Novice', skillGuild({}, 'farming').rank.title === 'Novice');
}

/* ── 4. the claim ── */
{
  const S = (caps, ch, rpg) => ({ rpg: rpg || R, _serverCaps: caps, channel: ch });
  check('4a a done quest against a worker that pays it: today\'s request', guildClaim(S({ guilds: true }, {}), 'fishing') === 'send');
  check('4b no caps.guilds: "Not open yet", never a mint', guildClaim(S({}, {}), 'fishing') === 'closed');
  check('4c no channel: offline', guildClaim(S({ guilds: true }, null), 'fishing') === 'offline');
  check('4d a quest not done: no claim', guildClaim(S({ guilds: true }, {}), 'trapping') === 'notReady');
  check('4e every quest done: no claim', guildClaim(S({ guilds: true }, {}, { lifeSkills: { cooking: { level: 99 } }, _guildProgress: { cooking: 99 } }), 'cooking') === 'notReady');
  check('4f the step the answer moves', guildStep(R, 'cooking') === 1 && guildStep(R, 'fishing') === 0 && guildStep(null, 'x') === 0);
  const k1 = skillsKey(R);
  const k2 = skillsKey(Object.assign({}, R, { _guildProgress: { cooking: 2 } }));
  check('4g the page redraws when a claim is answered', k1 !== k2);
}

/* ── 5. the road ── */
{
  check('5a Skills is built', MENUS3_BUILT.includes('skills'));
  check('5b Bro\'s three are the panel\'s', MENUS3.bro.every((s) => MENUS3_BUILT.includes(s)));
  const r = menus3Route('dock.bro', { built: MENUS3_BUILT });
  check('5c Bro still opens on the Bag (the owner\'s rule 1)', r.road === 'panel' && r.section === 'bag');
  const h = navPush(navStart('skills'), 'skill', 'fishing', { scroll: 30 });
  const u = navPush(h, 'unlocks', 'fishing');
  check('5d a skill over the ten, its ladder over the skill; Back one at a time',
    navTop(u).page === 'unlocks' && navTop(navBack(u)).page === 'skill' && navTop(navBack(navBack(u))).scroll === 30);
}

/* ── 6. the keys (deskKeys.js navKey under ?menus3) ── */
{
  const r = (id) => menus3KeyRoad(id, MENUS3_BUILT);
  check('6a I, P, L open Bro\'s three in the panel', r('dashboard').section === 'bag' && r('hero').section === 'power' && r('skills').section === 'skills' && r('skills').road === 'panel');
  check('6b J is the World button\'s', r('quests').road === 'world');
  check('6c every other page key opens today\'s page with the panel shut first', ['encyclopedia', 'leaderboard', 'more', '__proto__'].every((k) => r(k).road === 'today' && r(k).shut === true));
  check('6d a section not built goes today\'s road, the panel shut', menus3KeyRoad('skills', ['bag']).road === 'today' && menus3KeyRoad('skills', ['bag']).shut);
}

console.log(`menus3-skills: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
