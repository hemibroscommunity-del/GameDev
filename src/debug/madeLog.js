/* ═══ v2.3.4400: WHAT WAS MADE BETWEEN TWO FRAMES, BY NAME ═══
 *
 * The owner's iPhone on the skateboard, the step already steady: "late frames
 * 10 in 10s", "worst 170.0 = game 40.0 + outside 130.0".  The time OUTSIDE
 * the game's frame is a job that ran between two frames and held the page:
 * a picture prepared the first time it came on screen.  The frame meter
 * could name only a slow message from the worker (wsClient's recordExternal).
 * So each first-sight job that runs on the page says its name and how long
 * it held it: the strip (`?perf=1`) then reads "between frames: body
 * jog-east 41 ms", and a test reads window.__btMade.
 *
 * Nothing is kept unless the meter or a test is listening (perfTracker's
 * ring of sixty; `window.__btMade`, an array a test sets).
 */
export function noteMade(name, ms, detail) {
  try {
    if (typeof window === 'undefined') return;
    /* (a test is told which one: `detail`, a sheet's own key) */
    if (window.__btMade) window.__btMade.push(detail || name, ms);
    if (ms > 4 && window.perfTracker && window.perfTracker.recordExternal) window.perfTracker.recordExternal(name, ms);
  } catch (e) { /* a note must never break a job */ }
}
