/* ═══ v2.3.4804: THE DEVICE PROFILE -- ONE PLACE ANSWERS "WHAT IS THIS MACHINE?" ═══
 *
 * The owner, 2026-11-11, on the plan ("keep going on the architectural plan"):
 * the game asks what kind of device it is on in many places, and the answers
 * were each written where they were needed.  "Is there a mouse?" was asked in
 * sixteen places, each with its own guard (some `window.matchMedia &&`, some
 * `typeof matchMedia === 'function'`, some in a try, some not, two keeping
 * their own MediaQueryList); "is this a computer's window?" in three, with
 * the query written out in each; "is this an iPhone?" twice, copied by hand,
 * and a third time differently on the Speed test.  A device answer that two
 * places can give differently is a lane nobody chose.
 *
 * So the questions live here, each asked one way, and every place reads them:
 *
 *   fineInput()      a mouse or trackpad is the main pointer -- `(pointer:fine)`,
 *                    the house test for a computer: the "click" words
 *                    (deskWords.js), the keys, the hints.  Read LIVE: a laptop
 *                    with a touch screen can switch.
 *   computerFrame()  a computer's window with room -- `(pointer:fine) and
 *                    (min-width:1000px)`, game.css's computer rule: the layout
 *                    (deskWide.js, the canvas's shell).
 *   onIOS()          an iPhone or iPad, an iPad asking for the desktop site
 *                    included (it says "Macintosh" but has touch points).
 *   phoneScreen()    v2.3.5140: a phone, not a tablet or a computer -- no
 *                    mouse, and the SCREEN's short side under PHONE_SHORT_MAX
 *                    CSS px (the biggest phones are ~440, the smallest iPad
 *                    744): the pixel budget's class (renderRes.js).
 *   deviceProfile()  all of it, plus the look palette's choice
 *                    (lookPaletteChoice.js) and the screen's pixel ratio, in
 *                    one object: what the Speed test's card names, so one
 *                    screenshot from any device says which lanes it is in.
 *
 * STEP 1 (this version): NOTHING CHANGES.  Each place asks the same question
 * it asked before, the same way; only where the answer comes from moved.  The
 * two answers that can disagree -- a narrow computer window has a mouse
 * (fineInput) but not a computer's frame (computerFrame) -- still disagree as
 * they did; deciding what such a window should get is the owner's question
 * (a touchscreen laptop, an iPad with a trackpad, a small window), listed in
 * docs/specs/device-profile.md.
 *
 * No imports but the look palette's pure choice, so node can test it
 * (server/test/device-profile.test.mjs).
 */
import { lookPaletteChoice, onWindows, onMac } from './lookPaletteChoice.js';

/* the two media questions, written once (game.css carries the same two in
   its @media rules; device-profile.test holds them to it) */
export const FINE_QUERY = '(pointer:fine)';
export const COMPUTER_FRAME_QUERY = '(pointer:fine) and (min-width:1000px)';

const _mq = Object.create(null);
function mediaMatches(q) {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    /* one MediaQueryList a query, kept: its `matches` is live */
    const m = _mq[q] || (_mq[q] = window.matchMedia(q));
    return !!(m && m.matches);
  } catch (e) {
    return false;
  }
}

/** A mouse or trackpad is the main pointer (`(pointer:fine)`): a computer, for
 *  the words, keys and hints.  Live. */
export function fineInput() {
  return mediaMatches(FINE_QUERY);
}

/** A computer's window with room (`(pointer:fine) and (min-width:1000px)`):
 *  game.css's computer rule, for the layout.  Live. */
export function computerFrame() {
  return mediaMatches(COMPUTER_FRAME_QUERY);
}

/** An iPhone or iPad (an iPad asking for the desktop site says "MacIntel"
 *  but has touch points).  The arguments are for the tests; the page's own
 *  navigator by default. */
export function onIOS(ua, platform, touchPoints) {
  let u = ua, p = platform, t = touchPoints;
  if (u === undefined && typeof navigator !== 'undefined') {
    u = navigator.userAgent; p = navigator.platform; t = navigator.maxTouchPoints;
  }
  return /iPad|iPhone|iPod/.test(typeof u === 'string' ? u : '')
    || (p === 'MacIntel' && Number(t) > 1);
}

/* v2.3.5140: the short side of a phone's screen is under this (CSS px) */
export const PHONE_SHORT_MAX = 600;

/** v2.3.5140: a phone -- touch, and a screen whose short side is under
 *  PHONE_SHORT_MAX.  The SCREEN, never the window (a small computer window is
 *  not a phone).  The arguments are for the tests; the page's own by default. */
export function phoneScreen(screenW, screenH, fine) {
  let w = screenW, h = screenH, f = fine;
  if (w === undefined) {
    try {
      const sc = typeof window !== 'undefined' && window.screen;
      w = sc ? sc.width : 0; h = sc ? sc.height : 0;
    } catch (e) { w = 0; h = 0; }
  }
  if (f === undefined) f = fineInput();
  const short = Math.min(Number(w) || 0, Number(h) || 0);
  return !f && short > 0 && short < PHONE_SHORT_MAX;
}

/** Everything this file knows about the machine, in one object (the Speed
 *  test's card; QA). */
export function deviceProfile() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const ua = nav ? nav.userAgent : '';
  const plat = nav && nav.userAgentData ? nav.userAgentData.platform : undefined;
  const touch = nav ? nav.maxTouchPoints : 0;
  let search = '';
  try { search = typeof window !== 'undefined' ? window.location.search || '' : ''; } catch (e) { search = ''; }
  const palette = lookPaletteChoice(search, ua, plat, touch);
  return {
    input: fineInput() ? 'mouse' : 'touch',
    computerFrame: computerFrame(),
    ios: onIOS(),
    phone: phoneScreen(),   /* v2.3.5140 */
    windows: onWindows(ua, plat),
    mac: onMac(ua, plat, touch),
    palette: palette.on ? 'on' : 'off (' + palette.why + ')',
    dpr: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  };
}

/* QA: the profile, as the page sees it */
if (typeof window !== 'undefined') window.__btDevice = () => deviceProfile();
