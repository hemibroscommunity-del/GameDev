/* ═══ v2.3.2739: ONE ONBOARDING VOICE AT A TIME ═══
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
 *      the screen is quiet for COACH_GAP_MS, then the next.
 *   4. The install card is a "whenever you have a moment" message: only
 *      after INSTALL_AFTER_MS in the world, and only into a quiet screen.
 * A card already on screen is never pulled because something else arrived
 * -- that would be a flicker, which is worse than an overlap.
 */

const PLATE_GAP_MS = 900;
const COACH_GAP_MS = 2600;
const INSTALL_AFTER_MS = 75000;
const INSTALL_QUIET_MS = 6000;

let _worldInAt = 0;
let _coachUp = false;
let _coachEndAt = 0;

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
  if (!_worldInAt) return false;
  const pu = plateUntil();
  if (now < pu + PLATE_GAP_MS) return false;
  if (now < _coachEndAt + COACH_GAP_MS) return false;
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
    coachMayShow: coachMayShow(), installMayShow: installMayShow(),
  });
}
