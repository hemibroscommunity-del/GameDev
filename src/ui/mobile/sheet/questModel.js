import { QUEST_CHAINS, QUEST_STATUS, getNpcQuest, NPC_DATA } from '../../../data/gameSystems.js';

/* ═══ v2.3.1681: ONLY QUESTS SOMEBODY CAN ACTUALLY GIVE YOU ═══
 * Owner: "There's a 'first purchase' 'first spark' and other quests that are
 * cropping up in the quest pane.  Disable those and just keep it to mayor
 * bro's quest in sequential order (must finish one to begin another)."
 *
 * QUEST_CHAINS carries thirty-one quests across nine givers, but NPC_DATA
 * contains exactly one NPC — Mayor Bro.  The other eight were removed from
 * the world years ago and their chains were left behind, so the log was
 * offering work from people who do not exist, at destinations that do not
 * open (Trader Tix's "First Purchase" wants the Vendor, and no town building
 * has had an entrance since v2.3.823).
 *
 * v2.3.1669 tried to contain this by SORTING Mayor Bro first and slicing to
 * one row.  That holds only while he has an offer outstanding: the moment you
 * accept his quest he stops being "available", the slot falls through to the
 * next giver in key order, and Trader Tix appears — which is precisely what
 * the owner hit.  Sorting was treating a symptom.  The real rule is that a
 * quest whose giver is not in the world can never be accepted OR turned in,
 * so it has no business being displayed at all.
 *
 * Derived from NPC_DATA rather than hardcoding 'Mayor Bro', so adding an NPC
 * back lights up their chain with no change here — and removing one hides it
 * again. */
const LIVE_QUEST_GIVERS = new Set((NPC_DATA || []).map((n) => n && n.name).filter(Boolean));
/** True if this quest's giver is standing in the world right now. */
function giverExists(quest) {
  return !!(quest && LIVE_QUEST_GIVERS.has(quest.npc));
}

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
    /* A legacy save can hold an active/turnedIn quest from a giver who has
       since left the world.  Hiding it is the honest call: it can never be
       turned in, so listing it would be a permanent unfinishable row. */
    if (!giverExists(quest)) continue;
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
  const npcs = [...new Set(Object.values(QUEST_CHAINS).map(q => q.npc))].filter(
    (npc) => LIVE_QUEST_GIVERS.has(npc));
  const upcoming = [];
  for (const npc of npcs) {
    const r = getNpcQuest(R, npc);
    if (r && r.status === QUEST_STATUS.available) upcoming.push(r.quest);
  }
  /* v2.3.1681 (owner: "must finish one to begin another").  One at a time is
     now stated rather than implied: while ANY quest is active there is no
     offer at all, so the log shows the job you have, not the next one queued
     behind it.  getNpcQuest already walks each giver's chain in order, so a
     turn-in is what reveals the next offer.
     v2.3.1669's Mayor-Bro-first sort is gone — with the giver filter above,
     every quest still standing is his, so there is nothing left to sort. */
  if (active.length) upcoming.length = 0;
  else upcoming.length = Math.min(upcoming.length, 1);

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
