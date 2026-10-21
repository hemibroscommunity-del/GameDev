/* ═══ v2.3.3551: YOUR FIRST POINTS, SHOWN ═══
 *
 * The owner, 2026-10-21, choosing between a quest that pays a level's XP into
 * a skill you pick and tips at the first level-up you earn yourself: "Leave
 * tips for first natural level up.  I don't want players choosing xp to train
 * in for weapons they haven't used yet.  Go with your guided level up."
 *
 * A first level-up used to say only "Melee · Level 2" and put a number on the
 * Character button.  Nothing said what points are, where they go, or that
 * trying one is safe.  So, once, at the first level-up a player earns:
 *   1. the coach (ui/mobile/QuestCoach.jsx, lesson `points`) rings the way in
 *      -- OPEN on a folded dashboard, then Character, then its Points tab --
 *      saying how many points are waiting;
 *   2. on the Points grid it says what the two rows are and to tap a stat
 *      (each stat's window already plays its before-and-after fight);
 *   3. after the first Spend, the stat's window says the free Reset gives
 *      them all back (`firstSpendHint`, InfoPopup's `spentHint`).
 * It never picks a stat, and XP stays where you fought.  It waits for a quiet
 * moment (`POINTS_TIP_CALM_MS` after your last blow either way), it is the
 * coach's -- one card at a time, off with "Skip tutorial", remembered per
 * browser -- and it runs past the Mayor's tutorial too, since the first level
 * usually comes around his third quest and can come later.
 *
 * NO IMPORTS beyond the reset's own (also import-free): server/test/
 * points-tips.test.mjs runs this in node.
 */
import { placedPoints } from './pointsReset.js';

/* how long after your last blow, dealt or taken, before a tip may show */
export const POINTS_TIP_CALM_MS = 5000;
/* a tip left unanswered on the same step this long steps aside for
   POINTS_TIP_SNOOZE_MS, so the coach's other cards (your Login Key...) still
   get their turn while a player decides to keep their points for later */
export const POINTS_TIP_SNOOZE_AFTER_MS = 45000;
export const POINTS_TIP_SNOOZE_MS = 5 * 60 * 1000;
/* ...and after this many times unanswered it is put away for good, as a tap
   on its card would: a player keeping their points is never nagged */
export const POINTS_TIP_MAX_SNOOZES = 3;

function whole(v) { return Math.max(0, Math.floor(Number(v) || 0)); }

/** The points waiting: weapon (lane) points and shared points. */
export function pointsWaiting(rpg) {
  const p3 = rpg && rpg.prog3;
  if (!p3 || typeof p3 !== 'object') return { lane: 0, shared: 0, total: 0 };
  const lane = whole(p3.pool), shared = whole(p3.shared);
  return { lane, shared, total: lane + shared };
}

/** Is the player out of a fight: no blow dealt or taken lately? */
export function pointsTipCalm(S, now) {
  if (!S) return false;
  const t = typeof now === 'number' ? now : Date.now();
  const last = Math.max(Number(S.lastDamageTaken) || 0, Number(S._dealtAt) || 0);
  return !(last > 0 && t - last < POINTS_TIP_CALM_MS);
}

/** Is a first-points tip wanted right now?  Points waiting, none ever
 *  placed, and a quiet moment.  (The coach marks it done the moment a
 *  point is placed: `pointsTipDone`.) */
export function pointsTipWanted(rpg, S, now) {
  if (!rpg || !rpg.prog3) return false;
  if (pointsTipDone(rpg)) return false;
  if (pointsWaiting(rpg).total <= 0) return false;
  return pointsTipCalm(S, now);
}

/** Done for good once any point is placed (the coach remembers it, per
 *  browser, like every lesson). */
export function pointsTipDone(rpg) {
  return !!(rpg && rpg.prog3 && placedPoints(rpg.prog3) > 0);
}

/** The words for each step of the way in.  `where`: 'fold' (OPEN on a folded
 *  dashboard), 'side' (the sideways dashboard's arrow), 'nav' (the
 *  Character button), 'tab' (its Points tab), 'grid' (the Points grid). */
export function pointsTipWords(where, rpg) {
  const w = pointsWaiting(rpg);
  const n = w.total;
  const pts = n + ' point' + (n === 1 ? '' : 's');
  if (where === 'grid') {
    const lane = w.lane + ' weapon point' + (w.lane === 1 ? '' : 's');
    const shared = w.shared + ' shared point' + (w.shared === 1 ? '' : 's');
    return 'Top row: ' + lane + ' for your weapon\'s stats. Bottom row: ' + shared + ' for any stat there. Tap a stat to see what it does.';
  }
  if (where === 'tab') return 'Your ' + pts + (n === 1 ? ' is' : ' are') + ' on the Points tab.';
  /* the card's own title says "Level up!" (the lesson's label) */
  if (where === 'nav') return 'You have ' + pts + ' to spend. Tap Character.';
  if (where === 'side') return 'You have ' + pts + ' to spend. Open your dashboard.';
  return 'You have ' + pts + ' to spend. Tap OPEN.';
}

/** After a Spend: say the free reset is there, on the first spend only --
 *  when everything placed is what this window just spent. */
export function firstSpendHint(p3, spentN, resetOn) {
  if (!resetOn) return null;
  const n = whole(spentN);
  if (n <= 0) return null;
  if (placedPoints(p3) !== n) return null;
  return 'Not sure? Reset points (free), under the grid, gives them all back.';
}
