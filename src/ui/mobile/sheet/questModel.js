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

/* v2.3.1298 (round-5 Quests): client-side quest TRACKING — a pinned
   quest id in localStorage.  Safe by design: tracking is a display
   preference; accepting/turning-in stays with the NPCs and the
   server-authoritative flow untouched. */
const TRACK_KEY = 'bt_trackedQuest';
export function trackedQuestId() {
  try { return localStorage.getItem(TRACK_KEY) || null; } catch { return null; }
}
export function setTrackedQuest(id) {
  try {
    if (id) localStorage.setItem(TRACK_KEY, id);
    else localStorage.removeItem(TRACK_KEY);
  } catch (_e) {}
}

/* Toolbar badge feed: READY turn-ins only (round-5: available quests
   alone never badge). */
export function readyQuestCount(S) {
  try { return deriveQuestLog(S).active.filter(a => a.ready).length; } catch { return 0; }
}

/* One reward string, shared by every quest row. */
export function rewardText(q) {
  /* v2.3.1665: quests can now pay an ITEM as well (the tutorial arc hands
     out armor and a weapon).  `reward.item` is the display name only — the
     SERVER's QUEST_REWARDS entry holds the real grant, so this string can
     never over-promise what the turn-in will actually deliver. */
  return [
    q.reward?.gold ? `${q.reward.gold}g` : null,
    q.reward?.xp ? `${q.reward.xp} XP` : null,
    q.reward?.item ? String(q.reward.item) : null,
  ].filter(Boolean).join(' · ');
}
