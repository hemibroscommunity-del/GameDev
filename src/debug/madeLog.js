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
 *
 * v2.3.5120: the ring keeps a hold's NAME from the one list (holdNames.js:
 * `body-bake`, `strip-made`, `object-bases`...), the names the sweep and the
 * debt list use, so the field report names what the sweep names; a string
 * that maps to no name is dropped.  The callers keep their strings (a pose
 * and a facing, a file): a test's window.__btMade still reads those.
 */
import { holdOf } from './holdNames.js';

export function noteMade(name, ms, detail) {
  try {
    if (typeof window === 'undefined') return;
    const hold = holdOf(name);
    if (!hold) return;   /* v2.3.5120: off the list (tools/guards/hold-names.test.mjs fails a caller that is) */
    /* (a test is told which one: `detail`, a sheet's own key) */
    if (window.__btMade) window.__btMade.push(detail || name, ms);
    if (ms > 4 && window.perfTracker && window.perfTracker.recordExternal) window.perfTracker.recordExternal(hold, ms);
  } catch (e) { /* a note must never break a job */ }
}
