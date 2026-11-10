/* ═══ v2.3.4392: A REFUSED FRIEND REQUEST SAYS WHY ═══
   The state-machine sweep, 2026-11-03 (V12 M3-6; reviews R1, R2 and R3 2b):
   the worker answers a refused friend request, or a message to someone who
   is no longer a friend, with `friend_error` (server/src/friends.js), and
   the phone stored it where nothing ever read it (friendsSync.takeError had
   no caller).  So the tap did nothing, and the card even said "Friend
   request sent!": a player with 25 requests nobody answered could send no
   more and was never told why.

   These are the words, one a reason the worker sends; gameEvents.js shows
   them as a toast (storeToastBus, the one the sale notice uses).  Plain
   words, no numbers the worker owns (FRIENDS in friends.js is the truth).
   server/test/friend-errors.test.mjs fails when friends.js grows a reason
   that has no words here.

   No imports, so node can test it. */

export const FRIEND_ERROR_WORDS = {
  'already-friends': (who) => 'You and ' + who + ' are already friends.',
  'too-many-requests': () => 'Too many of your friend requests are still waiting for an answer. You can send more once some are answered.',
  'target-full': (who) => who + "'s friends list is full, so the request was not sent.",
  'not-friends': (who) => who + ' is not on your friends list any more, so your message was not sent.',
  'not-found': () => 'That player could not be found, so the friend request was not sent.',
};

const FALLBACK = 'Your friend request did not go through.';

/** The sentence for a `friend_error` payload.  `nameOf(id)` names the target
 *  (the room's peers); without one it reads "That player". */
export function friendErrorText(payload, nameOf) {
  const reason = payload && typeof payload.reason === 'string' ? payload.reason : '';
  const words = Object.prototype.hasOwnProperty.call(FRIEND_ERROR_WORDS, reason) ? FRIEND_ERROR_WORDS[reason] : null;
  if (!words) return FALLBACK;
  let who = null;
  try { who = payload.target && nameOf ? nameOf(payload.target) : null; } catch (e) { who = null; }
  if (typeof who !== 'string' || !who.trim()) who = 'That player';
  return words(who.trim().slice(0, 24));
}

/* The phone's one-time move of the old device list sends up to 25 requests
   at once (gameEvents.js friend_sync), and each refusal answers on its own:
   the same reason again within this window is one toast, not a stack. */
export const FRIEND_ERROR_QUIET_MS = 5000;
const lastAt = new Map();

/** Should this refusal show?  False for the same reason inside the window. */
export function friendErrorFresh(payload, now) {
  const reason = (payload && typeof payload.reason === 'string') ? payload.reason : '?';
  const t = typeof now === 'number' ? now : Date.now();
  const prev = lastAt.get(reason);
  if (prev !== undefined && t - prev < FRIEND_ERROR_QUIET_MS) return false;
  lastAt.set(reason, t);
  return true;
}
