/* ═══ v2.3.2766: ONE ONBOARDING VOICE AT A TIME ═══
 *
 * Owner: "The tutorial onboarding is too heavy on window pop ups right after
 * you join the game.  I don't know how to pace that better."
 *
 * Measured from the code, a brand-new iPhone player's first seconds were:
 * the intro lifts -> the "YOUR DASHBOARD, tap OPEN" coach card AND (if they
 * spent 8s at the door or the creator) the "PLAY FULL SCREEN" install card,
 * both bottom-centre at once -> 1.2s later the WELCOME plate at the top ->
 * the "MOVE" card as soon as the dashboard opened.  Four surfaces inside
 * about three seconds, each on its own timer, none aware of the others:
 * the quest-banner queue is the only serializer in the game and it only
 * covers its own plate.
 *
 * This is the missing referee, kept deliberately tiny.  Three surfaces
 * report in and ask before appearing:
 *   - the quest/welcome plate (BroTown, window.__btQuestMsgUntil),
 *   - the QuestCoach card (noteCoach / coachMayShow),
 *   - the iOS install card (installMayShow).
 * The rules, in the order a new player meets them:
 *   1. The WELCOME plate goes first, alone (it says what to do: find the
 *      Mayor, follow the gold).
 *   2. A coach card never appears while a plate is up, and waits a breath
 *      (PLATE_GAP_MS) after it goes.
 *   3. Coach cards never replace each other back-to-back: one finishes,
 *      the screen is quiet for COACH_GAP_MS (20s since v2.3.2878), then the
 *      next -- and the first card waits the same after the WELCOME plate.
 *   4. The install card is a "whenever you have a moment" message: only
 *      after INSTALL_AFTER_MS in the world, and only into a quiet screen.
 * A card already on screen is never pulled because something else arrived
 * -- that would be a flicker, which is worse than an overlap.
 */

import { readSharedValue, writeSharedValue } from '@/networking/rosterCookie.js';   /* v2.3.2880 */

/* ═══ v2.3.2880: SKIP TUTORIAL ═══
 * Owner: "add just a 'skip tutorial' button on the very first dialog box when
 * you join the game.  No pop ups should be scheduled after that."
 * The first dialog is the WELCOME plate (welcomeBanner.js); its button calls
 * skipTutorial().  From then on nothing SCHEDULED appears: no coach card
 * (coachMayShow, and QuestCoach retires one already up), no install card
 * (installMayShow), no "Next: ..." step toast (QuestStepNudge).  What the
 * player does still answers them -- QUEST ACCEPTED! on a tap, a reward on a
 * turn-in -- because those are replies, not pop-ups.
 * Kept like the welcome's own once-flag: this browser's localStorage plus the
 * shared-domain cookie, so a new preview-deploy origin remembers it too.
 * Read once and cached; every reader here runs on a timer or a frame. */
const SKIP_KEY = 'bt_tutorial_skipped';
const SKIP_SHARED = 'bt_tutskip';
let _skipped = null;
export function tutorialSkipped() {
  if (_skipped === null) {
    let v = false;
    try { v = localStorage.getItem(SKIP_KEY) === '1'; } catch (e) { /* private window */ }
    if (!v) { try { v = readSharedValue(SKIP_SHARED) === '1'; } catch (e) { /* no cookie */ } }
    _skipped = v;
  }
  return _skipped;
}
export function skipTutorial() {
  _skipped = true;
  try { localStorage.setItem(SKIP_KEY, '1'); } catch (e) { /* private window: this session only */ }
  try { writeSharedValue(SKIP_SHARED, '1'); } catch (e) { /* no cookie */ }
}

const PLATE_GAP_MS = 900;
/* v2.3.2878 (owner: "Put a minimum 20 second timer on the onboarding tutorial
   between pop ups"): 2.6s -> 20s.  Measured from the moment the previous
   onboarding pop-up LEFT the screen -- a coach card, or the WELCOME plate
   (noteOnboardingPlate) -- to the next coach card.  An ordinary quest plate
   (QUEST ACCEPTED!) is not a tutorial pop-up and keeps its short breath.
   QA can shorten it with window.__btCoachGapMs (the harness does, so the
   coach scenarios do not each wait minutes); mp-a2hs asserts the real 20s. */
const COACH_GAP_MS = 20000;
function coachGapMs() {
  try {
    const v = typeof window !== 'undefined' ? window.__btCoachGapMs : null;
    return typeof v === 'number' && v >= 0 ? v : COACH_GAP_MS;
  } catch (e) { return COACH_GAP_MS; }
}
const INSTALL_AFTER_MS = 75000;
const INSTALL_QUIET_MS = 6000;

let _worldInAt = 0;
let _coachUp = false;
let _coachEndAt = 0;
let _welcomeEndAt = 0;   /* v2.3.2878: when the WELCOME plate leaves */

/** The WELCOME plate counts as a tutorial pop-up (welcomeBanner.js reports
 *  when it will be gone). */
export function noteOnboardingPlate(untilTs) { _welcomeEndAt = Math.max(_welcomeEndAt, untilTs || 0); _welcomePending = false; }

/* ═══ v2.3.2880: THE WELCOME REALLY GOES FIRST ═══
   Rule 1 above said so, and it was not true: the welcome waits for the
   worker's copy of the character (welcomeBanner.js, up to 20s) and only then
   reported in, so the "YOUR DASHBOARD" coach card went up the moment the
   world did and the WELCOME plate landed on top of it ~1.2s later.  With a
   Skip tutorial button on the welcome, the welcome has to be the first
   thing -- so while one is still being decided, no coach card starts.
   welcomeBanner clears it either way (shown, or not this player). */
let _welcomePending = false;
export function noteWelcomePending(on) { _welcomePending = !!on; }

/** The world is on screen (intro lifted, or a resume with no intro). */
export function markWorldIn() { _worldInAt = Date.now(); }
export function worldInMs(now = Date.now()) { return _worldInAt ? now - _worldInAt : -1; }

function plateUntil() {
  try {
    const f = typeof window !== 'undefined' && window.__btQuestMsgUntil;
    return typeof f === 'function' ? (f() || 0) : 0;
  } catch (e) { return 0; }
}
export function plateUp(now = Date.now()) { return now < plateUntil(); }

/** QuestCoach reports whether its card is on screen, every tick. */
export function noteCoach(showing, now = Date.now()) {
  if (_coachUp && !showing) _coachEndAt = now;
  _coachUp = !!showing;
}

/** May the coach put a NEW card up now?  (A card already up stays.) */
export function coachMayShow(now = Date.now()) {
  if (!_worldInAt || tutorialSkipped() || _welcomePending) return false;   /* v2.3.2880 */
  const pu = plateUntil();
  if (now < pu + PLATE_GAP_MS) return false;
  const gap = coachGapMs();
  if (now < _coachEndAt + gap) return false;
  if (_welcomeEndAt && now < _welcomeEndAt + gap) return false;
  return true;
}

/* QA: mp-a2hs shortens the wait (window.__btInstallAfterMs) rather than
   sitting 75s in a headless browser; the quiet-screen rules still apply. */
function installAfterMs() {
  try {
    const v = typeof window !== 'undefined' ? window.__btInstallAfterMs : null;
    return typeof v === 'number' && v >= 0 ? v : INSTALL_AFTER_MS;
  } catch (e) { return INSTALL_AFTER_MS; }
}

/** May the install card appear now? */
export function installMayShow(now = Date.now()) {
  if (tutorialSkipped()) return false;   /* v2.3.2880 */
  if (!_worldInAt || now - _worldInAt < installAfterMs()) return false;
  if (_coachUp || now < plateUntil() + INSTALL_QUIET_MS) return false;
  if (now < _coachEndAt + INSTALL_QUIET_MS) return false;
  return true;
}

/* QA probe, house style. */
if (typeof window !== 'undefined') {
  window.__btPace = () => ({
    worldInMs: worldInMs(), plateUp: plateUp(), coachUp: _coachUp,
    coachEndAgoMs: _coachEndAt ? Date.now() - _coachEndAt : -1,
    coachGapMs: coachGapMs(),
    coachMayShow: coachMayShow(), installMayShow: installMayShow(),
    skipped: tutorialSkipped(), welcomePending: _welcomePending,   /* v2.3.2880 */
  });
}
