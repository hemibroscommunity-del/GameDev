/* ═══ v2.3.6865: BRO · SKILLS -- THE TEN, A SKILL'S PAGE, ITS GUILD INLINE (card MN step 6) ═══
 *
 * The owner's Skills (docs/design/menus3/SPEC.md "You": "10 life skills
 * (level, XP, unlocks, how it works): Bro · Skills -> skill"; "Skill guilds
 * (rank, next reward, quests): Bro · Skills -> inline on that skill's page";
 * the Guilds page and the Guild Hall's own card are gone) from the game's
 * REAL lists: the ten life skills in their display order (lifeProfile.js
 * lifeTiles: the gather row over the craft row, never resorted; the
 * wireframe draws six, a sample), each with its level and the WORKER's XP
 * a level (lifeSkillProgress); a skill's page with its whole real ladder
 * (lifeRoadmap) and today's "How it works" lines (sheet/SkillHow.jsx, drawn
 * by the page); and its guild as today's guild window tells it
 * (ui/panels/GuildPanel.jsx: every player is in the ten guilds, ranked by
 * that skill's level; the rank, the next one, the ladder with its AP, the
 * guild's quest with its one Claim, the guildmaster's line, the titles
 * earned).
 *
 * THE GAME'S TRUTH, NOT THE SAMPLE'S:
 *   - the claim is today's one request (`guild_quest_turn_in`, actions.js),
 *     only while the quest is done and only against a worker that pays it
 *     (caps.guilds); without it today's "Not open yet", never a mint;
 *   - THE DOTS: the game lights a button for a skill when a level-up is not
 *     yet looked at (skillsModel.js hasUnseenLevelUps): the Skills tab and
 *     that skill's tile wear it.  NOTHING lights for a guild reward waiting
 *     today (no badge reads getGuildQuest): no dot is added (a flag);
 *   - a skill's unlocks are NAMES in the game's tables (no item id), "Found
 *     at" and the earn line are words: no deep link is made out of them (a
 *     flag, as World · Quests found for its words).
 *
 * The panel's pages (src/game/menus3Nav.js): 'root' the ten, 'skill' a
 * skill's page (arg its key), 'unlocks' its whole ladder (arg its key).
 * No import from the page: node's suite reads it (server/test/menus3-skills.test.mjs). */
import { LIFE_SKILLS } from '../data/lifeSkills.js';
import { SKILL_GUILDS, GUILD_RANKS, getGuildRank, getGuildQuest } from '../data/gameSystems.js';
import { lifeTiles, lifeTotal, lifeSkillProgress, lifeSkillFacts, lifeRoadmap, lifeSkillOf } from './lifeProfile.js';

export const MENUS3_SKILL_PAGES = Object.freeze(['root', 'skill', 'unlocks']);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** Is `key` one of the ten (a forged arg opens nothing). */
export function isLifeSkill(key) {
  return typeof key === 'string' && LIFE_SKILLS.indexOf(key) >= 0 && !!lifeSkillOf(key);
}

/** The Skills page: the ten in display order, each { key, name, art, level,
 *  frac, dot }, and the sum of their levels (today's landing's headline).
 *  `fresh` the skills whose level-up is not yet looked at, read BEFORE the
 *  page marks them seen. */
export function skillsGrid(R, fresh) {
  return Object.freeze({ tiles: lifeTiles(R || null, null, fresh), total: lifeTotal(R || null, null) });
}

/** A skill's page: its level and XP (the worker's need), the next and the
 *  latest unlock, the ladder's size; null for a key that is no skill. */
export function skillPage(R, key) {
  if (!isLifeSkill(key)) return null;
  const p = lifeSkillProgress(R || null, key, null);
  const f = lifeSkillFacts(key, p.level);
  return Object.freeze({ key, name: lifeSkillOf(key).name, art: lifeSkillOf(key).iconSrc, progress: p, facts: f });
}

/** The skill's whole ladder (null: it unlocks nothing by level). */
export function skillLadder(R, key) {
  if (!isLifeSkill(key)) return null;
  return lifeRoadmap(key, lifeSkillProgress(R || null, key, null).level);
}

/* today's guild window's line from the guildmaster, by the skill's level (GuildPanel.jsx) */
export function guildQuoteKey(level) {
  const l = Number(level) || 1;
  if (l < 10) return 'q10';
  if (l < 25) return 'q25';
  if (l < 50) return 'q50';
  if (l < 75) return 'q75';
  if (l < 100) return 'q100';
  return 'qMax';
}

/* the titles today's window lists under a guild: those that name the skill's
   first word ('gemCutting' -> "gem"), as it filters them */
export function guildTitles(R, key) {
  const all = R && Array.isArray(R._titles) ? R._titles : [];
  const word = String(key || '').replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase();
  if (!word) return Object.freeze([]);
  return Object.freeze(all.filter((t) => typeof t === 'string' && t.toLowerCase().includes(word)));
}

/**
 * A skill's guild, as today's guild window draws it: { name, master, color,
 * level, rank {title, color}, next ({title, minLvl, ap} or null: the top
 * rank), frac (the way to the next rank), ranks (each {title, minLvl, ap,
 * got}), quest ({title, desc, now, need, gold, ap, complete} or null: every
 * guild quest done), quote (a key of the page's words), titles }.  null for
 * a skill with no guild.
 */
export function skillGuild(R, key) {
  if (!isLifeSkill(key) || !own(SKILL_GUILDS, key)) return null;
  const g = SKILL_GUILDS[key];
  const level = lifeSkillProgress(R || null, key, null).level || 1;
  const rank = getGuildRank(level);
  const next = GUILD_RANKS.find((r) => r.minLvl > level) || null;
  /* the bar today's window draws to the next rank: from this rank's level to the next's */
  const frac = next ? Math.max(0, Math.min(1, (level - rank.minLvl) / Math.max(1, next.minLvl - rank.minLvl))) : 1;
  const q = R ? getGuildQuest(key, R) : null;
  const reward = (q && q.reward) || {};
  return Object.freeze({
    key, name: g.name, master: g.master, color: g.color, level,
    rank: Object.freeze({ title: rank.title, color: rank.color }),
    next: next ? Object.freeze({ title: next.title, minLvl: next.minLvl, ap: next.ap || 0 }) : null,
    frac,
    ranks: Object.freeze(GUILD_RANKS.map((r) => Object.freeze({ title: r.title, minLvl: r.minLvl, ap: r.ap || 0, got: level >= r.minLvl }))),
    quest: q ? Object.freeze({ title: q.title, desc: q.desc, now: q.currentLvl, need: q.checkLvl, gold: Number(reward.gold) || 0, ap: Number(reward.ap) || 0, complete: !!q.complete }) : null,
    quote: guildQuoteKey(level),
    titles: guildTitles(R, key),
  });
}

/** What the guild quest's Claim does now: 'send' (today's request), 'closed'
 *  (the worker pays no guild quest: today's "Not open yet"), 'offline' (no
 *  channel), 'notReady' (the quest is not done: no button). */
export function guildClaim(S, key) {
  const R = S && S.rpg;
  const g = skillGuild(R, key);
  if (!g || !g.quest || !g.quest.complete) return 'notReady';
  if (!(S && S._serverCaps && S._serverCaps.guilds)) return 'closed';
  if (!S.channel) return 'offline';
  return 'send';
}

/** Which guild quest a skill is on (its ladder's index, the worker's own):
 *  a claim is answered when this moves (gameEvents.js guild_quest_result). */
export function guildStep(R, key) {
  const gp = R && R._guildProgress;
  return gp && own(gp, key) ? (Number(gp[key]) || 0) : 0;
}

/** What moves the Skills pages: the ten levels and XP, the guild steps, the titles. */
export function skillsKey(R) {
  const ls = (R && R.lifeSkills) || {};
  const parts = LIFE_SKILLS.map((k) => (own(ls, k) && ls[k] ? (ls[k].level || 0) + ':' + Math.floor(ls[k].xp || 0) + ':' + guildStep(R, k) : '-'));
  parts.push(R && Array.isArray(R._titles) ? R._titles.length : 0);
  return parts.join(',');
}
