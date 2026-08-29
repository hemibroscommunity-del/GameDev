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
const SEEN_KEY = 'bt_welcome_seen';

export const welcomeSeen = () => {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
};
const markSeen = () => {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private window */ }
};

/** Show the first-join welcome, once ever.  Safe to call on every intro lift.
 *
 *  Delayed a beat on purpose: the intro overlay's own fade is still running
 *  when this fires, and a banner that starts under a lifting curtain has
 *  spent part of its life unseen.  1.2s puts it on a settled screen.
 *
 *  Never throws — the caller is the intro's onComplete, and the world
 *  becoming visible must not depend on a greeting. */
export function maybeShowWelcome() {
  try {
    if (welcomeSeen()) return false;
    markSeen();   /* before the timer: a reload inside the delay must not re-arm it */
    setTimeout(function () {
      try {
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
    }, 1200);
    return true;
  } catch (e) { return false; }
}
