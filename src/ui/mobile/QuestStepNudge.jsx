import { useEffect } from 'react';
import { QUEST_CHAINS, QUEST_STATUS, questSteps } from '@/data/gameSystems.js';
import { storeToastBus } from './storeToastBus.js';
import { tutorialSkipped } from '@/ui/onboardingPace.js';   /* v2.3.2890 */

/* ═══ v2.3.2820: SAY THE NEXT STEP OUT LOUD ═══
 * Owner: "a lot of people get stuck on the quest for cooking 2 fish."  The
 * Quests panel now ticks the steps off (QuestDetailPanel), but a stuck player
 * is by definition not reading a panel -- they are standing in a zone with a
 * log in their bag, wondering what next.  So whenever the NEXT step of an
 * active stepped quest changes, it is said once as the ordinary small toast
 * ("Next: Open your Bag and tap the log to light a campfire").
 *
 * Polls game state once a second (QuestCoach's POLL-THE-STATE rule: no hooks
 * pushed into the gathering / firemaking / cooking paths), renders nothing,
 * and waits for the intro to lift so the first hint is not spent behind the
 * loading screen.  Says each step at most once per session per quest, so a
 * fire burning out and being relit does not repeat the same line twice in a
 * row forever -- only a genuinely new next step speaks. */
export const QuestStepNudge = () => {
  useEffect(() => {
    const said = Object.create(null);   /* questId -> label last announced */
    const id = setInterval(() => {
      try {
        const S = window._gameState && window._gameState.current;
        const R = S && S.rpg;
        if (!R || !S.__introLiftedAt || S._zoneLoading || S._netHold) return;
        if (tutorialSkipped()) return;   /* v2.3.2890: skipped -- no hint toasts either */
        const qs = R._quests || {};
        for (const qid of Object.keys(QUEST_CHAINS)) {
          const q = QUEST_CHAINS[qid];
          if (!q || !Array.isArray(q.steps)) continue;
          if (qs[qid] !== QUEST_STATUS.active && qs[qid] !== QUEST_STATUS.complete) continue;
          const steps = questSteps(q, R, S);
          const cur = steps && steps.find((x) => x.current);
          if (!cur || said[qid] === cur.label) continue;
          said[qid] = cur.label;
          storeToastBus.push('Next: ' + cur.label);
        }
      } catch (e) { /* a hint must never take the game down */ }
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return null;
};
