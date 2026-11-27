/* ═══ v2.3.6692: RANKS' WORDS UNDER THE NEW DASHBOARD (card UI2-ranks) ═══
 * The words the new Ranks pages read (dash/RanksLanding.jsx, RankStandings.jsx)
 * and the frame's header reads for them (BottomDashboard's titleOf: a group's
 * name, a board's name, and their Back's), each key written out (say.test
 * rule 7).  Small and free of the pages, so the header can read it without
 * pulling the Ranks pages' script out of its own lazy piece.  The keys come
 * from src/game/ranksPage.js (ranksBoardHeads); a stat board is named by its
 * stat, the Bro tab's own label (src/data/prog3.js), as today's list names it. */
import { SAY } from '@/data/say/leaderboard.js';
import { SAY as SAY_C } from '@/data/say/charPage.js';
import { say } from '@/game/say.js';
import { PROG3_BODY_META } from '@/data/prog3.js';
import { ranksBoardHeads, rankSel, ranksEntry, groupOf } from '@/game/ranksPage.js';

/** A key of ranksPage.js's tables (or a passport's fact) as words. */
export function rankWord(key) {
  switch (key) {
    case 'leaderboard.combatGroup': return say(SAY, 'leaderboard.combatGroup');
    case 'leaderboard.lifeGroup': return say(SAY, 'leaderboard.lifeGroup');
    case 'leaderboard.featsGroup': return say(SAY, 'leaderboard.featsGroup');
    case 'leaderboard.pointsDoor': return say(SAY, 'leaderboard.pointsDoor');
    case 'leaderboard.overallBoard': return say(SAY, 'leaderboard.overallBoard');
    case 'leaderboard.swordBoard': return say(SAY, 'leaderboard.swordBoard');
    case 'leaderboard.bowBoard': return say(SAY, 'leaderboard.bowBoard');
    case 'leaderboard.staffBoard': return say(SAY, 'leaderboard.staffBoard');
    case 'leaderboard.combatLevelBoard': return say(SAY, 'leaderboard.combatLevelBoard');
    case 'leaderboard.killsBoard': return say(SAY, 'leaderboard.killsBoard');
    case 'leaderboard.apBoard': return say(SAY, 'leaderboard.apBoard');
    case 'leaderboard.spinBoard': return say(SAY, 'leaderboard.spinBoard');
    case 'leaderboard.flipBoard': return say(SAY, 'leaderboard.flipBoard');
    case 'leaderboard.fishBoard': return say(SAY, 'leaderboard.fishBoard');
    case 'leaderboard.woodcuttingBoard': return say(SAY, 'leaderboard.woodcuttingBoard');
    case 'leaderboard.fishingBoard': return say(SAY, 'leaderboard.fishingBoard');
    case 'leaderboard.miningBoard': return say(SAY, 'leaderboard.miningBoard');
    case 'leaderboard.farmingBoard': return say(SAY, 'leaderboard.farmingBoard');
    case 'leaderboard.cookingBoard': return say(SAY, 'leaderboard.cookingBoard');
    case 'leaderboard.smithingBoard': return say(SAY, 'leaderboard.smithingBoard');
    case 'leaderboard.woodworkingBoard': return say(SAY, 'leaderboard.woodworkingBoard');
    case 'leaderboard.gemCuttingBoard': return say(SAY, 'leaderboard.gemCuttingBoard');
    case 'leaderboard.enchantingBoard': return say(SAY, 'leaderboard.enchantingBoard');
    case 'leaderboard.trappingBoard': return say(SAY, 'leaderboard.trappingBoard');
    case 'leaderboard.damageBoard': return say(SAY, 'leaderboard.damageBoard');
    case 'leaderboard.levelHead': return say(SAY, 'leaderboard.levelHead');
    case 'leaderboard.powerHead': return say(SAY, 'leaderboard.powerHead');
    case 'leaderboard.pointsHead': return say(SAY, 'leaderboard.pointsHead');
    case 'leaderboard.killsHead': return say(SAY, 'leaderboard.killsHead');
    case 'leaderboard.apHead': return say(SAY, 'leaderboard.apHead');
    case 'leaderboard.goldHead': return say(SAY, 'leaderboard.goldHead');
    case 'leaderboard.weightHead': return say(SAY, 'leaderboard.weightHead');
    case 'leaderboard.scoreHead': return say(SAY, 'leaderboard.scoreHead');
    case 'charPage.sword': return say(SAY_C, 'charPage.sword');
    case 'charPage.bow': return say(SAY_C, 'charPage.bow');
    case 'charPage.staff': return say(SAY_C, 'charPage.staff');
    case 'charPage.ap': return say(SAY_C, 'charPage.ap');
    case 'charPage.clan': return say(SAY_C, 'charPage.clan');
    case 'charPage.title': return say(SAY_C, 'charPage.title');
    case 'charPage.quests': return say(SAY_C, 'charPage.quests');
    case 'charPage.notShared': return say(SAY_C, 'charPage.notShared');
    default: return '';
  }
}

const GROUP_WORD = { combat: 'leaderboard.combatGroup', life: 'leaderboard.lifeGroup', feats: 'leaderboard.featsGroup' };
/** A group's name ('combat', 'life', 'feats'). */
export const rankGroupWord = (g) => rankWord(GROUP_WORD[g] || '');

/** A board's name under the new pages: Sword, Bow, Staff, Combat level...; a
 *  stat board its stat's label ("Damage" for the weapons' damage points). */
export function rankBoardWord(id) {
  const h = ranksBoardHeads(id);
  if (h.word) return rankWord(h.word);
  if (groupOf(id) === 'points') {
    const k = String(id).slice(4);
    if (k === 'dmg') return rankWord('leaderboard.damageBoard');
    const m = PROG3_BODY_META.find((r) => r.key === k);
    return (m && m.label) || k;
  }
  return String(id || '');
}

/** The header's word for a Ranks page (`nav` the frame's state), or null for
 *  a page that is not one of them. */
export function ranksTitle(id, nav) {
  if (id === 'ranksPoints') return rankWord('leaderboard.pointsDoor');
  if (id !== 'ranksGroup' && id !== 'ranksBoard') return null;
  const e = ranksEntry(nav, id);
  if (!e) return null;
  return id === 'ranksGroup' ? rankGroupWord(e.sel) : rankBoardWord(rankSel(e.sel).board);
}
