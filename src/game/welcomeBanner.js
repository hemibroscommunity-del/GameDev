/* ═══ v2.3.2121: WELCOME TO BRO TOWN, GO SEE THE MAYOR ═══
 *
 * Owner: "first time upon joining the game you get a message about welcome to
 * bro town and find the mayor because he wants to speak with you."
 *
 * WHAT THIS IS NOT.  v2.3.1219 shipped MayorGreeting — a talking-head video
 * that autoplayed over the dashboard — and v2.3.1593 removed its trigger on
 * the owner's instruction ("remove the tutorial and the mayor bro pop up and
 * greeting").  That component is still in the tree, unreachable behind a
 * boolean nothing sets, and restoring it is one line.  This deliberately does
 * NOT do that.  The ask this time is a MESSAGE and an objective — two lines
 * that tell you where you are and who wants you — not the clip that was taken
 * out.  Reading "welcome message" as "turn the removed video back on" would
 * be re-litigating a decision the owner already made.
 *
 * It rides the existing quest banner (window._setQuestMsg, v2.3.1745) rather
 * than inventing a surface: the banner already means "here is what just
 * changed about your quest", it already queues behind a banner the player
 * caused, and it already fades itself.  A second notification system with its
 * own timing would be a second thing to keep in sync.
 *
 * ONCE PER BROWSER, in the same shape MayorGreeting used for its own flag —
 * read and written defensively, because a private window throws on
 * localStorage access and a welcome message must never cost someone their
 * first join.
 *
 * The gold road (questRoute.js questRoutePoint, same version) points at him
 * while this is true, so the sentence and the world agree: a brand-new player
 * with no quest records gets the Mayor as their route target.  The two were
 * built together and one without the other is half the feature — this says
 * who, the road says where.
 */
import { readSharedValue, writeSharedValue } from '@/networking/rosterCookie.js';
import { noteOnboardingPlate, noteWelcomePending } from '@/ui/onboardingPace.js'; /* v2.3.2888; v2.3.2890 + pending */

const SEEN_KEY = 'bt_welcome_seen';

/* v2.3.2765: also on the shared-domain cookie, so a new preview-deploy
   origin knows too (rosterCookie readSharedValue). */
const SHARED_KEY = 'bt_welcomed';
export const welcomeSeen = () => {
  try { if (localStorage.getItem(SEEN_KEY) === '1') return true; } catch (e) { /* fall through */ }
  return readSharedValue(SHARED_KEY) === '1';
};
const markSeen = () => {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private window */ }
  writeSharedValue(SHARED_KEY, '1');
};

/* v2.3.2765: who the welcome is for.  The same test QuestCoach's preTutorial
   makes -- no tutorial quest on record and level 3 or under -- asked of the
   WORKER's copy of the character (see maybeShowWelcome). */
const TUT_IDS = ['tut_1', 'tut_2', 'tut_3', 'tut_4'];
function looksBrandNew(rpg) {
  if (!rpg) return false;
  if ((rpg.level || 1) > 3) return false;
  const q = rpg._quests || null;
  if (!q) return true;
  for (const id of TUT_IDS) if (q[id]) return false;
  return true;
}

/** Show the first-join welcome, once ever.  Safe to call on every intro lift.
 *
 *  Delayed a beat on purpose: the intro overlay's own fade is still running
 *  when this fires, and a banner that starts under a lifting curtain has
 *  spent part of its life unseen.  1.2s puts it on a settled screen.
 *
 *  ═══ v2.3.2765: AND ONLY FOR A PLAYER WHO IS ACTUALLY NEW ═══
 *  Owner: "Sometimes when you rejoin a game from a saved character it brings
 *  up the tutorial again as if starting a new character."  The only gate used
 *  to be this browser's once-flag, and the flag is per ORIGIN: every Pages
 *  preview deploy is a new hostname, so a veteran opening a fresh build link
 *  was welcomed and sent to find the Mayor again.  Now the greeting waits for
 *  the worker's player_state (S._rpgFromServer) and asks the character: a
 *  returning one is never greeted, and the flag is set so it is not asked
 *  again.  `getS` returns the live game state; no worker answer within 20s
 *  means no greeting and no flag (it can try again next join).
 *
 *  Never throws — the caller is the intro's onComplete, and the world
 *  becoming visible must not depend on a greeting. */
export function maybeShowWelcome(getS) {
  try {
    if (welcomeSeen()) return false;
    /* v2.3.2890: hold the coach until this is decided -- the welcome, and its
       Skip tutorial button, come first (onboardingPace.js) */
    noteWelcomePending(true);
    const t0 = Date.now();
    const show = function () {
      noteWelcomePending(false);   /* v2.3.2890: decided; noteOnboardingPlate below takes over the hold */
      try {
        /* v2.3.2888: the WELCOME plate is the first tutorial pop-up; the coach
           waits its 20s gap after this one too (onboardingPace.js) */
        try {
          const ms = (typeof window !== 'undefined' && window.__questMsgMs) ? window.__questMsgMs('welcome') : 5200;
          noteOnboardingPlate(Date.now() + ms);
        } catch (e) { /* pacing is a nicety */ }
        if (typeof window !== 'undefined' && window._setQuestMsg) {
          window._setQuestMsg({
            kind: 'welcome',
            /* The plate's headline renders "WELCOME" for this kind, and the
               title line sits directly under it — so the town's name goes
               HERE and the two lines read as one sentence.  Repeating
               "Welcome to Bro Town" in the title would print the word twice,
               and the title line is nowrap-with-ellipsis, so it is also the
               line that cannot afford the extra words. */
            title: 'Bro Town',
            sub: 'Find Mayor Bro — he wants a word. Follow the gold.',
            ts: Date.now(),
            /* queue: the player has caused nothing yet, so there is nothing
               to preempt, and if something did land first this should wait
               its turn rather than stomp it. */
            queue: true,
          });
        }
      } catch (e) { /* a missing bridge must not break the join */ }
    };
    const check = function () {
      try {
        if (welcomeSeen()) { noteWelcomePending(false); return; }
        const S = typeof getS === 'function' ? getS() : null;
        /* no getter (an old caller): the pre-v2.3.2765 behaviour */
        const synced = !getS || (S && S._rpgFromServer);
        if (!synced) {
          if (Date.now() - t0 < 20000) setTimeout(check, 250);
          else noteWelcomePending(false);   /* v2.3.2890: no answer, no welcome -- release the coach */
          return;
        }
        markSeen();   /* before the timer: a reload inside the delay must not re-arm it */
        if (getS && !looksBrandNew(S && S.rpg)) { noteWelcomePending(false); return; }
        setTimeout(show, Math.max(0, 1200 - (Date.now() - t0)));
      } catch (e) { noteWelcomePending(false); /* never break the join -- nor hold the coach forever */ }
    };
    check();
    return true;
  } catch (e) { return false; }
}
