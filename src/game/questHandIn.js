/* ═══ v2.3.4940: A HAND-IN THE WORKER REFUSED IS TAKEN BACK, ALL OF IT ═══
 *
 * The Claim tap (game/quests.js turnInQuest) draws the hand-in before the
 * worker answers: the quest marked handed in, the gold, the XP, the +5
 * points, the giver's next quest unlocked, and the page's own counters
 * (_compStats: quests completed, gold earned).  A refusal (dying, no XP
 * skill named, not active, the goal not met, nothing to trade) is answered
 * by the worker's echo (quests.js _questRefusedEcho, v2.3.4401): the quest
 * map, coins, XP and points as the worker holds them, which the phone adopts
 * whole.  Two things were left standing:
 *   - the counters, which only the page keeps (the echo has none);
 *   - the confirmation window, which QUEST_CLAIMED_MS later opened the next
 *     quest the PREDICTION had unlocked: an offer the worker never made, its
 *     Accept refused in turn.
 * So a hand-in that went out is noted here, settled by the first quest map
 * the worker sends after it (handed in: paid; anything else: refused, the
 * counters taken back), and the window asks the live map before it opens
 * the next quest (claimNext).
 *
 * A hand-in the channel KEPT (questKept.js: the connection was down) is not
 * noted: the rejoin's snapshot comes before the kept message is answered,
 * and would read as a refusal.
 *
 * No imports: node tests it (server/test/quest-handin.test.mjs). */

const _pending = new Map();   /* questId -> { gold } (one a quest: the last tap wins) */

/** A hand-in that went to the worker, and the gold the page counted for it. */
export function noteHandIn(questId, gold) {
  if (typeof questId !== 'string' || !questId) return;
  _pending.set(questId, { gold: Math.max(0, Number(gold) || 0) });
}

/** The worker's quest map has arrived (a player_state carrying `_quests`):
    each noted hand-in is settled.  A refused one takes back the page's own
    counters (the echo has put back the rest).  Returns the refused ids. */
export function settleHandIns(R, workerQuests) {
  const refused = [];
  if (!_pending.size || !workerQuests || typeof workerQuests !== 'object') return refused;
  for (const [id, p] of [..._pending]) {
    _pending.delete(id);
    if (Object.prototype.hasOwnProperty.call(workerQuests, id) && workerQuests[id] === 'turnedIn') continue;
    refused.push(id);
    const cs = R && R._compStats;
    if (cs) {
      cs.questsCompleted = Math.max(0, (Number(cs.questsCompleted) || 0) - 1);
      cs.totalGoldEarned = Math.max(0, (Number(cs.totalGoldEarned) || 0) - p.gold);
    }
  }
  return refused;
}

/** The confirmation's end: the panel to open.  The predicted next quest when
    the live map says this one is handed in; when the worker took it back,
    this quest again, as the live map has it (its Claim button back). */
export function claimNext(R, questPanel, predictedNext) {
  const id = questPanel && questPanel.quest && questPanel.quest.id;
  const q = (R && R._quests) || {};
  const live = id && Object.prototype.hasOwnProperty.call(q, id) ? q[id] : undefined;
  if (!id || live === 'turnedIn') return predictedNext || null;
  if (live !== 'active') return null;
  return Object.assign({}, questPanel, { status: live });
}

/** For tests: how many are waiting, and a clean slate. */
export function pendingHandInCount() { return _pending.size; }
export function clearHandIns() { _pending.clear(); }
