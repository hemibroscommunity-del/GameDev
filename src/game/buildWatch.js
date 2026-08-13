/* ═══ BUILD WATCH — notice when the tab is running a stale bundle ═══ */
/* v2.3.1718.  Owner, after judging: a judge "didn't share the same world",
   and the cause was almost certainly a tab left open across a deploy.
   Four client deploys went out inside an hour that day.
 *
 * WHY A POLL AND NOT A SERVER PUSH.  The obvious design is to have the
 * worker announce its version over the existing socket, and it is wrong
 * here: the client and the worker deploy SEPARATELY (Cloudflare Pages on
 * any push to main, the worker only when server/** changes).  Every deploy
 * that day was client-only, so the worker's version never moved and a
 * socket-borne check would have stayed silent through all four — exactly
 * the case this exists to catch.  The authority on "what is the current
 * client" is the static host, so we ask the static host.
 *
 * WHAT IT COMPARES.  __BUILD_SHA__ is stamped into the bundle at build time
 * (vite.config define) and dist/version.json is emitted from the SAME
 * constant in the same build, so a mismatch means precisely "the files on
 * the server are not the files this tab is running".
 *
 * DELIBERATELY QUIET: it checks on a slow timer and when the tab regains
 * focus (the moment a returning player is most likely to be stale), stops
 * polling the instant it finds a mismatch, and never retries a failure —
 * a captive-portal 404 or an offline blip must not nag anyone mid-fight.
 */

const VERSION_URL = '/version.json';
const POLL_MS = 5 * 60 * 1000;      /* 5 min — deploys are minutes apart at worst */
const FOCUS_THROTTLE_MS = 60 * 1000; /* tab flicking must not spam the host */

/* The sha this bundle was built from.  Vite replaces the token; the guard
   keeps the module importable in any context where it was not replaced. */
const MY_SHA = (typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : '') || '';

export function startBuildWatch(onStale) {
  /* No sha to compare against (a dev server, or a build without git) means
     every check would be a coin flip — do nothing rather than nag. */
  if (!MY_SHA || MY_SHA === 'nogit' || typeof fetch !== 'function') {
    return function noop() {};
  }

  let stopped = false;
  let timer = null;
  let lastCheck = 0;

  const check = async () => {
    if (stopped) return;
    lastCheck = Date.now();
    let live;
    try {
      /* no-store, and a cache-buster: the whole point is to defeat whatever
         is holding this tab on an old build. */
      const res = await fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      live = await res.json();
    } catch (e) {
      return;                      /* offline / 404 — silent, try again later */
    }
    if (stopped || !live || !live.sha) return;
    /* Ignore a DIRTY local build ('+' suffix) disagreeing with itself — that
       is a developer's own uncommitted tree, not a deploy. */
    if (live.sha === MY_SHA) return;
    stopped = true;
    if (timer) clearInterval(timer);
    try { onStale({ mine: MY_SHA, live: live.sha, version: live.version, time: live.time }); }
    catch (e) { /* a broken callback must not take the game with it */ }
  };

  timer = setInterval(check, POLL_MS);

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastCheck < FOCUS_THROTTLE_MS) return;
    check();
  };
  document.addEventListener('visibilitychange', onVisible);

  return function stopBuildWatch() {
    stopped = true;
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
