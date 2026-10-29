/* ═══ v2.3.3882: A PICTURE GIVEN UP ON IS ASKED FOR AGAIN, LATER ═══
 *
 * The rule of docs/specs/retry-looks.md, for a loader that keys its pictures
 * by a string: after its own bounded retries give up, the picture is asked
 * for again while something still draws it -- a round 5 s after the one that
 * gave up, then 10, 20, 40 and every minute, ten rounds at most -- and each
 * round is numbered, so its URL can carry `&g=<round>` past any cached
 * failure.  `?retrylooks=0` (every loader that asks again) or the loader's own
 * switch is the game as it was.
 *
 *   const later = laterRounds('bodyretry');
 *   // its final failure:          later.gaveUp(key, (round) => load(key, round));
 *   // where it is asked for:      if (missing) later.due(key);
 *   // its first give-up only:     if (!later.round(key)) recordCrash(...);
 *
 * No imports (node runs the rules in tests). */

export const RETRY_LATER_MS = [5000, 10000, 20000, 40000, 60000];
export const RETRY_ROUNDS = 10;

/** The rounds of one loader.  `switchName`: its own off switch (`?<name>=0`),
 *  besides the shared `?retrylooks=0`. */
export function laterRounds(switchName) {
  let on = true;
  try {
    const re = new RegExp('[?&](' + (switchName ? switchName + '|' : '') + 'retrylooks)=0\\b');
    if (typeof location !== 'undefined' && re.test(location.search || '')) on = false;
  } catch (e) { /* on */ }
  const due = new Map();      /* key -> { at, again }: given up on, asked again at `at` */
  const rounds = new Map();   /* key -> the later round it is on */
  return {
    on: () => on,
    /** Which later round this key is on (0: its first loads). */
    round: (key) => rounds.get(key) || 0,
    /** Its loads gave up: `again(round)` is the next round, when its time comes. */
    gaveUp(key, again) {
      if (!on) return;
      const n = rounds.get(key) || 0;
      if (n >= RETRY_ROUNDS) return;
      due.set(key, { at: Date.now() + RETRY_LATER_MS[Math.min(n, RETRY_LATER_MS.length - 1)], again });
    },
    /** Asked for and missing: starts the next round if its time has come (true). */
    due(key) {
      const g = due.get(key);
      if (!g || Date.now() < g.at) return false;
      due.delete(key);
      const n = (rounds.get(key) || 0) + 1;
      rounds.set(key, n);
      g.again(n);
      return true;
    },
    /** The key let go of (a cache's cap): nothing owed to it. */
    forget(key) { due.delete(key); rounds.delete(key); },
  };
}
