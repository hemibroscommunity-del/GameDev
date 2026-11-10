/* ═══ v2.3.4412: THE AUCTION HOUSE'S ANSWER, OR "NOT SURE" ═══
 *
 * The state-machine sweep (2026-11-03, V8a M2-3): the Auction House's `post()`
 * (ui/storeApi.js) had no time limit, so a request the network swallowed kept
 * the item card on "Listing…" until the browser gave up, and a lost answer
 * read as a REFUSAL.  A refusal unlocks "Put it up", and the worker may well
 * have taken the goods: the player taps again and lists twice (the v2.3.2507
 * double listing), or a gear piece stays on the phone while the buyer gets the
 * real one (gear-stash.md, "M3's first problem").
 *
 * So there are THREE answers, never two:
 *   - the worker's own answer, `ok` or a refusal: believed as before;
 *   - NO answer (the time limit ran out, or the fetch failed after it may have
 *     gone): `{ ok: false, unsure: true }`.  Nothing proves the store did not
 *     take it, so a listing card stays LOCKED and says "not sure: check My
 *     Listings" (review R1/R2, W1.4).  Callers that only show `error` (buy,
 *     bid, accept, cancel) read it as before: a sentence, no lock to keep.
 *
 * And a late answer belongs to the card it was sent from (`cardAnswer`): the
 * item card is one component that stays mounted, so closing it or opening
 * another while the request is out used to let the late answer close, scold
 * or UNLOCK whichever card was open by then.
 *
 * No imports, so node tests it (server/test/store-answer.test.mjs).
 */

export const STORE_POST_LIMIT_MS = 15000;

/* the card's words for "no answer"; shown through deskWords (a computer reads
   "click") */
export const STORE_UNSURE_WORDS = 'Not sure it went up. Look in the Auction House under Yours, My Listings, before you tap again';

/** POST `body` as JSON and read the JSON answer, giving up after `ms`.
 *  `fetchImpl` is the page's fetch (the tests pass their own).  Never throws. */
export async function postWithin(fetchImpl, url, init, ms) {
  const limit = ms > 0 ? ms : STORE_POST_LIMIT_MS;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  const gaveUp = new Promise((resolve) => {
    timer = setTimeout(() => {
      try { if (ctl) ctl.abort(); } catch (e) { /* nothing to stop */ }
      resolve({ ok: false, unsure: true, error: 'No answer from the store' });
    }, limit);
  });
  const asked = (async () => {
    try {
      const res = await fetchImpl(url, ctl ? { ...init, signal: ctl.signal } : init);
      return await res.json();
    } catch (e) {
      /* a fetch that failed (or an answer cut off) cannot prove the store
         never got it: not sure, never "refused" */
      return { ok: false, unsure: true, error: 'No answer from the store' };
    }
  })();
  try {
    /* the race, not only the abort: a fetch that ignores its signal still
       ends the wait on time */
    return await Promise.race([asked, gaveUp]);
  } finally {
    clearTimeout(timer);
  }
}

/** What a listing's answer does to the card that sent it.
 *  `sentCard` / `nowCard`: the card's generation when the request went and now.
 *  - 'listed'   the worker took it (the card closes, if it is still this card)
 *  - 'refused'  the worker said no: the card unlocks and shows why
 *  - 'unsure'   no answer: the card STAYS LOCKED and says "not sure"
 *  `mine` false: another card is open by now, so the answer touches no card
 *  (only the bag, which is the sent item's own). */
export function cardAnswer(r, sentCard, nowCard) {
  const kind = (r && r.ok) ? 'listed' : (r && r.unsure) ? 'unsure' : 'refused';
  return { kind, mine: sentCard === nowCard };
}
