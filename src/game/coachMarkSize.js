/* ═══ v2.3.4155: THE COACH'S SIZE RULE, AS ONE PURE ANSWER ═══
 *
 * QuestCoach.jsx's v2.3.2495 note says why the rule exists: the owner saw "a
 * screen-sized oval" after the weapon swap (a lesson's selector had resolved to
 * the right half of the screen), so a mark far bigger than any control is taken
 * for a mis-measure and refused, and counted (`oversize` in the __btCoach
 * probe).  The numbers and the answer live here, with no imports, so node can
 * test them (server/test/coach-mark-size.test.mjs); the coach passes in the
 * window's size.
 *
 * ONE LESSON IS NEVER REFUSED: `noSizeRule: true`, the minimap's ("Your map",
 * the first steps' fourth).  Its rect is no measurement that can go wrong: it
 * is the renderer's own published box (window.__btWheelMini), 132 px a side,
 * 264 on a computer's side column, `oneband=0` (ui/wheelMiniSize.js; the band,
 * the default, keeps 132 on a computer too).  And a box that size is more than
 * 0.35 of a short window: 264 at 754 px tall or less (a 1366 x 768 laptop's
 * window, less the browser's bars), 132 at 377 or less (a phone on its side in
 * Safari).  It was refused on every tick, and "Your quest" and the Login Key
 * card wait for it, so they never came (the 2026-11-03 state-machine sweep, V15
 * M1-1).  Only that lesson: the Mayor's brings a world rect too, worked out
 * from the camera, the canvas and the world's scale, so it can go wrong.  Never
 * loosen the fractions instead (they are the oval's guard) nor scale them to
 * the window (TRAPS §214).
 */
export const MARK_CIRCLE_MIN_CAP = 160;   /* .bt-rjoy-base is 108 at its largest */
export const MARK_CIRCLE_VP_FRAC = 0.42;  /* ...or this much of the short axis, whichever is kinder */
export const MARK_RECT_W_FRAC = 0.92;
export const MARK_RECT_H_FRAC = 0.35;

/** Is lesson L's mark, rect r ({ width, height }, CSS px), too big to be a
 *  control in a vw x vh window?  A circle: over the cap either way, or not
 *  roughly square.  A rect: wider than 0.92 of the window or taller than 0.35
 *  of it.  A lesson with `noSizeRule: true` (the minimap's): never. */
export function coachMarkTooBig(L, r, vw, vh) {
  if (L && L.noSizeRule === true) return false;   /* v2.3.4155: the renderer's own box */
  const w = r.width, h = r.height;
  if (L && L.shape === 'circle') {
    const cap = Math.max(MARK_CIRCLE_MIN_CAP, Math.min(vw, vh) * MARK_CIRCLE_VP_FRAC);
    const ar = (w > 0 && h > 0) ? (w / h) : 0;
    return (w > cap || h > cap || ar < 0.55 || ar > 1.8);
  }
  return (w > vw * MARK_RECT_W_FRAC || h > vh * MARK_RECT_H_FRAC);
}
