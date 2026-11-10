/* ═══ v2.3.4415: A SET OF PICTURES ASKED FOR AGAIN UNTIL EACH IS IN ═══
 *
 * The bars over every head (entityRenderer.js _ensureHudBarTextures: the HP,
 * mana and stamina pills, the owner's bar frame and its red and green fills)
 * were loaded once a page, behind a latch set before the first request: one
 * failed request and that bar was missing for the session, with nothing to
 * ask again (state-machine sweep V17a R1-3).  The frame failing hid every
 * health bar over every head until a reload.
 *
 * This is docs/specs/retry-looks.md's rule for such a set, with TRAPS §257's
 * time limit:
 *   - each file is its own load, with a TIME LIMIT (`timeoutMs`, 20 s like a
 *     head piece): a request that never answers counts as a failure;
 *   - a failure (an error, the time limit, or a load that gives nothing) is
 *     asked for again LATER through retryLooks.js's rounds -- 5 s, 10, 20,
 *     40, then every minute, ten rounds at most -- each round's URL carrying
 *     `g=<round>` past a cached failure, and only while something still asks
 *     (`ensure()` runs where the bars are drawn);
 *   - a late answer to a request already counted as failed is still taken if
 *     the slot is empty; a second copy that lands after one is in is let go
 *     (`unload`), so nothing is held twice;
 *   - once every file is in, `ensure()` is one test of a flag.
 *   `?barretry=0` (or the shared `?retrylooks=0`) is the game as it was: the
 *   first load and nothing more.
 *
 * v2.3.4452: the same rule for the pictures loaded behind the loading screen
 * and only LOOKED UP after (capes, weapons, shields, the plate icons): `start()`
 * is the loading screen's promise -- every file's FIRST load settled (in,
 * failed, or past its time limit), so a failure never holds the gate -- and
 * `took(key, value)` runs when a value is taken into its slot (a pixel-art
 * filter, a twin that shares the file), never for a copy let go.
 *
 * Imports only retryLooks.js (no imports), so node runs it in
 * server/test/renderer-life.test.mjs and server/test/loader-retries.test.mjs. */
import { laterRounds } from './retryLooks.js';

export const LOAD_SET_TIMEOUT_MS = 20000;

/** `url` with this round's cache-bust (round 0: the url as it is). */
export function roundUrl(url, round) {
  if (!round) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'g=' + round;
}

/** files: { key: url }; into: the object whose `key` slots receive the
 *  loaded values (read where they are drawn); load(url): a promise of the
 *  value.  Optional: unload(url), timeoutMs, later (a laterRounds), and the
 *  timers (setTimer, clearTimer) for a test. */
export function loadSetLater(o) {
  const files = o.files, into = o.into, load = o.load;
  const later = o.later || laterRounds(o.switchName || null);
  const ms = o.timeoutMs || LOAD_SET_TIMEOUT_MS;
  const setT = o.setTimer || ((fn, t) => setTimeout(fn, t));
  const clrT = o.clearTimer || ((h) => clearTimeout(h));
  const keys = Object.keys(files);
  let started = false, allIn = false;
  let firstLeft = keys.length, firstRes = null;
  const firstDone = new Promise((r) => { firstRes = r; });
  if (!firstLeft) firstRes();
  function one(k, round) {
    const url = roundUrl(files[k], round);
    let over = false, counted = round > 0;
    const settled = () => { if (counted) return; counted = true; if (--firstLeft <= 0) firstRes(); };
    const fail = () => {
      settled();
      if (over) return;
      over = true;
      later.gaveUp(k, (r) => one(k, r));
    };
    const h = setT(fail, ms);
    let p;
    try { p = Promise.resolve(load(url)); } catch (e) { p = Promise.reject(e); }
    p.then((v) => {
      clrT(h);
      if (!v) { fail(); return; }
      over = true;
      settled();
      if (!into[k]) { into[k] = v; if (o.took) { try { o.took(k, v); } catch (e) { /* its own */ } } }
      else if (v !== into[k] && o.unload) { try { Promise.resolve(o.unload(url)).catch(() => {}); } catch (e) { /* gone */ } }
    }, () => { clrT(h); fail(); });
  }
  function start() {
    if (!started) { started = true; for (const k of keys) one(k, 0); }
    return firstDone;
  }
  return {
    /** v2.3.4452: the loading screen's wait: every first load settled. */
    start,
    /** Where the set is drawn: the first call starts every load; later calls
     *  ask again for a missing one whose round has come. */
    ensure() {
      if (allIn) return;
      if (!started) { start(); return; }
      let missing = 0;
      for (const k of keys) if (!into[k]) { missing++; later.due(k); }
      if (!missing) allIn = true;
    },
  };
}
