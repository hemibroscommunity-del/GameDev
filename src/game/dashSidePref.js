/* ═══ v2.3.2177: WHICH SIDE THE LANDSCAPE DASHBOARD TAKES ═══
 *
 * Owner, after playing v2.3.2176 on a real iPhone: "One thing still not
 * working correctly is displaying the dashboard landscape mode on the side
 * away from the Dynamic Island area on iPhone.  It always displays on the
 * left."
 *
 * ═══ WHY IT ALWAYS DISPLAYED ON THE LEFT ═══
 * v2.3.2174 decided the side from ONE signal: `insetLeft > insetRight`, read
 * off the #bt-sab-probe element (JS cannot read env() directly).  The
 * plumbing around it is fine -- mp-landscape-dash simulates an Island by
 * overriding that probe's own padding and the whole dashboard, the world
 * offset and every anchor flee to the far edge, which is why this shipped
 * looking correct.  What was wrong was the assumption underneath: that iOS
 * reports a BIGGER horizontal inset on the side the sensor housing is on.
 *
 * It does not.  In landscape iOS insets BOTH long edges by the same amount --
 * the display has rounded corners on both sides, and the safe area has to
 * clear them whichever way round the phone is.  So `insL > insR` is false in
 * both rotations, the rule fell through to its tie-break, and the tie-break
 * is 'left'.  The owner's report is exactly what that code does.
 *
 * ═══ WHAT DECIDES IT NOW ═══
 * The insets stay the FIRST signal, because where a browser does report them
 * asymmetrically it is telling us the truth directly and no inference beats
 * that.  When they tie at a NON-ZERO value -- "there is a housing to clear,
 * but not which side" -- the rotation decides instead: the Island sits at the
 * top of the phone in portrait, so it lands left or right purely by which way
 * you turned it.  A tie at ZERO is a different fact entirely: no safe area,
 * nothing to dodge, so the rotation is not consulted and the answer is left.
 *
 * ═══ THE MAPPING (CONFIRMED ON HARDWARE) ═══
 * `screen.orientation.angle` is the rotation of the CONTENT away from the
 * device's natural orientation.  Content rotated +90 means the device itself
 * was turned 90 counter-clockwise, which sweeps its top edge -- and the
 * Island with it -- to the LEFT.  So angle 90 => Island left => dashboard
 * right, and angle 270 => the mirror.
 *
 * That was derived rather than measured when it shipped -- this repo has no
 * iPhone to rotate -- so it went out behind a Settings pin in case it read
 * backwards.  The owner then checked both rotations on the real device:
 * "The mapping is correct."  Do not flip these two lines on a later reading
 * of the spec; they are known-good against an actual iPhone.
 *
 * The pin stays, now as a plain preference rather than an escape hatch: some
 * people want their menus under one particular thumb, and a player whose
 * device reports something neither branch expects still has an answer.
 *
 * Module-shaped for the same reason as questTrailStyle.js (v2.3.2141) and
 * chatChannel.js (v2.3.2139): resize() reads this on every layout pass, and
 * localStorage.getItem is a synchronous main-thread call.  Read once, cached,
 * and the setter is the only writer.
 */

const KEY = 'brotown_dash_side';

/* Ordered as they appear in Settings.  The hint under the row describes the
   SELECTED value -- "Auto" means nothing on its own to someone who has never
   seen the panel move. */
export const DASH_SIDES = [
  { id: 'auto', label: 'Auto', hint: 'Keeps the menus clear of the camera notch as you rotate' },
  { id: 'left', label: 'Left', hint: 'Menus always on the left, whichever way you hold it' },
  { id: 'right', label: 'Right', hint: 'Menus always on the right, whichever way you hold it' },
];

export const DEFAULT_DASH_SIDE = 'auto';

const _valid = (id) => DASH_SIDES.some((s) => s.id === id);

let _pref = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return _valid(v) ? v : DEFAULT_DASH_SIDE;
  } catch (e) { return DEFAULT_DASH_SIDE; }
})();

/** What the player chose: 'auto' | 'left' | 'right'. */
export function getDashSidePref() { return _pref; }

/** Set the preference.  An unknown id is ignored rather than stored -- a bad
 *  value that reached storage would come back on every future load.
 *  Dispatches a resize so the layout follows the tap immediately: resize() is
 *  the single writer of --world-x and data-dash-side, so going through it
 *  keeps the panel, the world offset and the CSS agreeing (the v2.3.2157
 *  one-geometry-path rule) instead of nudging three of them by hand. */
export function setDashSidePref(id) {
  if (!_valid(id)) return _pref;
  _pref = id;
  try { localStorage.setItem(KEY, id); } catch (e) {}
  try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  return _pref;
}

/** The rotation of the content away from the device's natural orientation,
 *  normalised to 0..359.  `screen.orientation` is the modern spelling (iOS
 *  16.4+); `window.orientation` is the deprecated one that older iOS still
 *  answers, and it reports -90 where the spec says 270. */
export function screenAngle() {
  try {
    const so = typeof window !== 'undefined' && window.screen && window.screen.orientation;
    if (so && typeof so.angle === 'number') return ((so.angle % 360) + 360) % 360;
    if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
      return ((window.orientation % 360) + 360) % 360;
    }
  } catch (e) { /* fall through to 0 */ }
  return 0;
}

/** WHICH EDGE THE DASHBOARD TAKES.  Pure, so the QA harness can drive every
 *  branch without a phone.  Only landscape asks -- the portrait band spans
 *  the full width and never reads this.
 *
 *  `insL`/`insR` are the measured safe-area insets; the 4px deadband is there
 *  because "the same inset on both edges" is the normal iOS answer and a
 *  sub-pixel difference between two equal values is not a signal.
 */
export function resolveDashSide(insL, insR, angle, pref) {
  const p = pref || _pref;
  if (p === 'left' || p === 'right') return p;
  /* An honest asymmetry wins: the panel takes the CLEAR edge. */
  if (Math.abs(insL - insR) > 4) return insL > insR ? 'right' : 'left';
  /* Both long edges inset by the SAME non-zero amount is the signature of a
     phone with a sensor housing: iOS clears the rounded corners on both
     sides, so the insets say "there is something to dodge" without saying
     WHICH side -- and only then is the rotation worth consulting.
     Both edges at zero is the opposite fact: no safe area, nothing to dodge,
     so the rotation means nothing here.  That distinction is not decoration
     -- a desktop browser and Playwright's mobile emulation both report a
     landscape angle of 90 with no insets at all, and without this they would
     "dodge" an Island that does not exist. */
  if (insL > 4 && insR > 4) {
    /* Owner-confirmed on a real iPhone (v2.3.2177) -- see the header. */
    if (angle === 90) return 'right';   /* device turned CCW -> Island left  */
    if (angle === 270) return 'left';   /* device turned CW  -> Island right */
  }
  /* Portrait, an unknown angle, a desktop browser, every headless run: LEFT,
     which is the side the owner asked for when there is no Island to dodge. */
  return 'left';
}

/* QA handle, house style (__btTrailStyle, __btCoach).  A scenario needs to
   CHANGE the preference -- driving the Settings row is a different test --
   and read it back to tell "the layout honoured it" from "the tap missed". */
if (typeof window !== 'undefined') {
  window.__btDashSide = (id) => (id == null ? getDashSidePref() : setDashSidePref(id));
}
