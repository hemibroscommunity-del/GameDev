/* ═══ v2.3.4136: NOTHING FOR THE WORLD WHILE A LOADING SCREEN IS UP ═══
 *
 * The owner, 2026-11-03: "Before the loading screen is finished I'm seeing pop
 * up messages meant for the main screen area (like the star on minimap etc).
 * Needs to wait until it's done."
 *
 * The loading screens are the ocean clip (IntroVideo.jsx, `.bt-intro`, z 100:
 * anything drawn above 100 showed through it, the minimap's big star at 9100
 * among them, and everything below it played its seconds out unseen) and a
 * zone's veil (zoneTransitions.js, `.bt-zone-loading`: a building, a dungeon,
 * a land).  ONE answer to "is the world on screen?", read from the screens
 * themselves, never a timer:
 *   - the world has come in at all (markGateWorldIn: onboardingPace.js
 *     markWorldIn, called when the clip has FULLY faded -- IntroVideo's
 *     onComplete runs after its fade -- or at once on the road with no clip);
 *   - no `.bt-intro` and no `.bt-zone-loading` in the page (nor the body's
 *     bt-intro-up, set the instant the clip is decided on);
 *   - and SETTLE_MS since the last one went, so what was waiting comes as if
 *     the world had just appeared, not on the very frame.
 * Every surface meant for the world asks it, so a later hint inherits the
 * wait with no code of its own:
 *   - the coach's cards (QuestCoach.jsx) and the big arrow (guideArrow.js) --
 *     and whatever rides the arrow (the weapon-swap hint, lane D);
 *   - the minimap's big star (starCue.js): its target is kept until it can
 *     be shown;
 *   - the quest and level-up banners (BroTown's window._setQuestMsg and
 *     window._setLevelUpMsg) and the toasts (storeToastBus.push): a message
 *     that comes while loading WAITS (whenWorldReady) and is shown afterwards
 *     with a fresh clock, in the order it came;
 *   - the achievements' banner (achievements.js achvWorldShown) and the NEW
 *     MONSTER card (its clock held while loading).
 * The loading screens themselves are not touched.  NO IMPORTS (node tests it).
 */

export const SETTLE_MS = 700;
const POLL_MS = 100;
const MAX_WAITING = 24;

let _worldIn = false;
let _up = true;           /* the last answer: a loading screen (or no world yet) */
let _readyAt = 0;         /* when the world counts as on screen again */
let _timer = null;
const _waiting = [];
const qa = { ready: false, ups: 0, held: 0, released: 0, lastReadyAt: 0 };

function hasDom() { return typeof document !== 'undefined' && !!document.body; }

/* a loading screen in the page now */
/* v2.3.4460: asked of two LIVE lists the browser keeps (getElementsByClassName), not by a search of the whole page
   each time.  The search ran ten times a second from the timer below and again for every caller (the coach, the
   arrow, the star, the achievements: several a frame), 2 to 6 ms each on the QA box with the band's windows in the
   page -- the whole-game sweep (docs/specs/held-sweep.md) found it in every station.  A live list answers from the
   browser's own count until the page's elements change, and is always the page as it is: the same answer, never
   a stale one. */
let _introList = null, _veilList = null;
function overlayUp() {
  if (!hasDom()) return false;
  try {
    if (document.body.classList.contains('bt-intro-up')) return true;
    if (!_introList || !_veilList) {
      if (typeof document.getElementsByClassName !== 'function') return !!document.querySelector('.bt-intro, .bt-zone-loading');
      _introList = document.getElementsByClassName('bt-intro');
      _veilList = document.getElementsByClassName('bt-zone-loading');
    }
    return _introList.length > 0 || _veilList.length > 0;
  } catch (e) { return false; }
}

function sample(now) {
  const up = !_worldIn || overlayUp();
  if (up && !_up) qa.ups++;
  if (!up && _up) { _readyAt = now + SETTLE_MS; qa.lastReadyAt = _readyAt; }
  _up = up;
  qa.ready = !up && now >= _readyAt;
  if (qa.ready && _waiting.length) flush();
  return qa.ready;
}

function flush() {
  const list = _waiting.splice(0, _waiting.length);
  for (const fn of list) {
    qa.released++;
    try { fn(); } catch (e) { /* one waiting message must not stop the rest */ }
  }
}

function ensureTimer() {
  if (_timer || !hasDom() || typeof setInterval !== 'function') return;
  _timer = setInterval(() => sample(Date.now()), POLL_MS);
}

/** The world has come in (the clip faded, or no clip): onboardingPace.js
 *  markWorldIn calls this. */
export function markGateWorldIn() {
  _worldIn = true;
  ensureTimer();
}

/** Is the world on screen -- no loading screen, and SETTLE_MS since the last?
 *  True where there is no page at all (node: nothing to wait for). */
export function worldReady(now = Date.now()) {
  if (!hasDom()) return true;
  ensureTimer();
  return sample(now);
}

/** Run `fn` now if the world is on screen, else once it is (in the order
 *  asked, at most MAX_WAITING held: the oldest go first).  True when it ran
 *  now. */
export function whenWorldReady(fn) {
  if (typeof fn !== 'function') return false;
  if (worldReady()) { fn(); return true; }
  _waiting.push(fn);
  qa.held++;
  if (_waiting.length > MAX_WAITING) _waiting.shift();
  return false;
}

/* QA (mp-loadinggate): the gate's answer and its counts, read-only */
try {
  if (typeof window !== 'undefined') {
    window.__btLoadingGate = { get: () => Object.assign({ waiting: _waiting.length, worldIn: _worldIn, up: _up }, qa) };
  }
} catch (e) { /* no page */ }
