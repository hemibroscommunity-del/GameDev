/* ═══ THE PAGE-HELD BUDGET (v2.3.4450) ═══
 *
 * mp-heldsweep.mjs plays a tour of the game with a profiler on the phone and
 * names every job that holds the page's one thread.  These are its lines, the
 * memory budget's way (memory-budget.mjs): a run fails when a family holds
 * the page longer than its line.
 *
 *   HOLD_MAX_MS      the longest any job may hold the page OUTSIDE the game's
 *                    frame while the world is in play, unless listed below;
 *   FRAME_JS_MAX_MS  the most of the game's own code one frame may run
 *                    (the browser's drawing calls are not counted: this box
 *                    draws in software);
 *   KNOWN            the families that are over those today, each with the
 *                    line it is held to.  This is the DEBT LIST: a line is
 *                    lowered when its family is fixed, and removed when it is
 *                    under the general line.  Never raise one silently: say
 *                    in the PR body how many ms and why.
 *
 * Numbers are this QA box's (its JavaScript is about a phone's: a bake that
 * took 91 ms here took 101 on the owner's iPhone 14 Pro Max).
 */
export const HOLD_MAX_MS = 12;
export const FRAME_JS_MAX_MS = 16;

export const KNOWN = {
  /* filled from the first full run: see docs/specs/held-sweep.md */
};
