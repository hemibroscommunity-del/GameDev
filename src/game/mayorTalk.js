/* ═══ v2.3.3899: MAYOR BRO ALWAYS TALKS ═══
 *
 * The owner, 2026-11-02: "After finishing mayor bro quest that awards sword
 * and shield it wasn't apparent what to do next. I tried tapping on mayor bro
 * and kept opening the town hall door which was confusing. I also wasn't clear
 * on what to do next since apparently I couldn't talk to him."
 *
 * Until v2.3.3899 a Mayor with no quest to offer or pay for opened the Town
 * Hall's board (he was its keeper, v2.3.3258).  The board is on the square's
 * noticeboard now (game/wheelNoticeboard.js), and the Mayor, with nothing of
 * his own, SAYS the next step in plain words, in his speech bubble: the tour's
 * next giver (questRoute.js tourOffer -- the gold road and the star already
 * lead there while no quest is in hand), else the quest you have, else a
 * friendly word and the board.  A quest of his still comes first (BroTown's
 * tap, desktopControls' E): this is only the "nothing for you" answer.
 *
 * No imports from the UI; the phone test mp-mayordoor reads what he said
 * (`window.__btMayorSaid`).
 */
import { tourOffer } from './questRoute.js';
import { TOUR_MEET } from './tour.js';
import { QUEST_CHAINS, QUEST_STATUS } from '@/data/gameSystems.js';
import { trackedQuestId } from './trackedQuest.js';
import { folkDisplayName } from '@/data/folkNames.js';   /* v2.3.4048: the giver he sends you to, by his nickname */

export const MAYOR = 'Mayor Bro';

/** What Mayor Bro says when he has no quest to offer or pay for. */
export function mayorIdleLine(rpg, S) {
  let t = null;
  try { t = tourOffer(rpg, S); } catch (e) { t = null; }
  if (t && t.npc && t.npc !== MAYOR) {
    const where = TOUR_MEET[t.npc] ? ' ' + TOUR_MEET[t.npc] : '';
    return 'Good work! Next, see ' + folkDisplayName(t.npc) + where + '. Follow the gold road.';
  }
  /* a quest in hand (the tour waits while one is): the one you track, else the first */
  const quests = (rpg && rpg._quests) || null;
  if (quests) {
    let qid = null;
    try { qid = trackedQuestId(); } catch (e) { qid = null; }
    if (!(qid && quests[qid] === QUEST_STATUS.active)) {
      qid = Object.keys(quests).find((k) => quests[k] === QUEST_STATUS.active) || null;
    }
    const q = qid ? QUEST_CHAINS[qid] : null;
    if (q && q.title) return 'Keep at it: ' + q.title + '. Follow the gold road.';
  }
  return 'BroTown is lucky to have you! The town board by the lamps has more to do.';
}

/** Mayor Bro says it, in his speech bubble (effectsRenderer, `npc.chatBubble`,
 *  as the townsfolk's answers do).  The line, or null for anyone else. */
export function mayorSaysNext(S, npc) {
  if (!npc || npc.name !== MAYOR) return null;
  const line = mayorIdleLine(S && S.rpg, S);
  const now = Date.now();
  npc.chatBubble = { text: line, ts: now };
  /* his own chatter (BroTown's npc loop, townsfolkReact) waits until the
     bubble's 5 s are up, so it never talks over the answer */
  npc.chatTimer = Math.max(npc.chatTimer || 0, 6000);
  npc._reactLineAt = now;
  if (typeof window !== 'undefined') window.__btMayorSaid = { text: line, ts: now };
  return line;
}
