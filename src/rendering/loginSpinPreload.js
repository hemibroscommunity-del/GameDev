/* ═══ v2.3.4295: THE LOGIN WHEEL'S ART, FETCHED BEHIND THE LOADING SCREEN ═══
 * The window (src/ui/mobile/LoginSpinWindow.jsx) opens seconds after the intro
 * lifts, so its three pictures are pulled into the HTTP cache here
 * (preloadAnimations.js group `loginSpin`) -- and only the cache: a wheel held
 * decoded all session is 1.6 MB the memory budget would feel (CLAUDE.md, MEMORY
 * IS BUDGETED).  The window decodes them when it opens and drops them when it
 * closes.  The sound is in SFX_MANIFEST ('daily-spin'), decoded with the rest. */
export const LOGIN_SPIN_URLS = Object.freeze([
  '/ui/daily-spin/wheel.png?v=4295', '/ui/daily-spin/pointer.png?v=4295', '/ui/daily-spin/title.png?v=4295',
  '/ui/daily-spin/double-wheel.png?v=4295', '/ui/daily-spin/double-pointer.png?v=4295', '/ui/daily-spin/double-plate.png?v=4295',
  '/ui/daily-spin/double-yes.png?v=4295', '/ui/daily-spin/double-no.png?v=4295',
  /* the plain-rim twins: the lights dim and brighten as the lit and plain wheels crossfade */
  '/ui/daily-spin/wheel-plain.png?v=4295', '/ui/daily-spin/double-wheel-plain.png?v=4295',
]);
export function preloadLoginSpin() {
  if (typeof fetch !== 'function') return Promise.resolve(false);
  return Promise.all(LOGIN_SPIN_URLS.map((u) => fetch(u).then((r) => r.blob()).catch(() => null))).then(() => true);
}
