import { QUEST_CHAINS, QUEST_STATUS, getNpcQuest } from '../../../data/gameSystems.js';

/* v2.3.1288: quest-log derivation extracted VERBATIM from QuestsPanel
   (v2.3.1265) so the new compact view (nav-system PR B) and the expanded
   panel read the same rows and can never drift.  Read-only over
   R._quests + QUEST_CHAINS — accepting/turning-in stays with the NPCs
   (server-authoritative quest_accept / quest_turn_in, v2.3.782). */
export function deriveQuestLog(S) {
  const R = (S && S.rpg) || {};
  const qs = R._quests || {};

  const active = [];
  const done = [];
  for (const [qid, quest] of Object.entries(QUEST_CHAINS)) {
    const st = qs[qid];
    if (st === QUEST_STATUS.active || st === QUEST_STATUS.complete) {
      let ready = st === QUEST_STATUS.complete;
      /* check() bodies read live S freely; a throw must never take the
         panel down (same defensive posture as the dashboard readouts). */
      if (!ready && typeof quest.check === 'function') {
        try { ready = !!quest.check(R, S); } catch (_e) { ready = false; }
      }
      active.push({ quest, ready });
    } else if (st === QUEST_STATUS.turnedIn) {
      done.push(quest);
    }
  }

  /* NEXT UP: for each quest-giving NPC, the first incomplete quest that
     is not yet accepted — the same selection the NPC dialogue uses.
     getNpcQuest returns a { quest, status } wrapper, NOT the quest. */
  const npcs = [...new Set(Object.values(QUEST_CHAINS).map(q => q.npc))];
  const upcoming = [];
  for (const npc of npcs) {
    const r = getNpcQuest(R, npc);
    if (r && r.status === QUEST_STATUS.available) upcoming.push(r.quest);
  }

  return { active, upcoming, done };
}
