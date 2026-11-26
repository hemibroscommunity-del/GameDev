/* ═══ v2.3.6720: THE LAST FEW CELLS' ANSWERS (card PRT, the performance red team) ═══
 *
 * "What is under my feet?" (game/wheelTrial.js wheelHere) is the ground
 * worker's to answer, and the page kept ONE answer: the last cell asked.  A
 * question about any other cell was a message to the worker and a message
 * back.
 *
 * THE LOOP IT MADE.  Since v2.3.3469 the renderer draws your figure a
 * fraction of a pixel off your real place (YOU STAY WHERE YOU WERE ON SCREEN,
 * pixiRenderer.js: the camera sits on whole device pixels, so your place is
 * moved with it for the world's passes and put back before the minimap).  So
 * in ONE frame the dust and the light ask about (87167.5, 87455.8) and the
 * minimap asks about (87168, 87456).  A cell is 24 game px, and 87168 and
 * 87456 are both exact multiples of 24: the two places are in two different
 * cells.  Each question threw the other's answer away, so the page asked the
 * worker again on EVERY FRAME, for as long as you stood there -- and that
 * place is the town's arrival point, where every player stands on login and
 * after every death.  Counted on the test box, 2026-11-26 (mp-idlecensus):
 * 11.4 questions and 11.5 answers a second at 11.6 frames a second, standing
 * still; a walk asks 3.7 a second.  On a phone that is 60 or 120 messages
 * each way a second, each answer a task on the page's one thread, and a
 * second processor woken for each while nothing on screen changes.
 *
 * THE MEND.  The last HERE_KEEP answers are kept, by cell.  The world's
 * ground never changes under a cell while the worker lives (wheelStop clears
 * these with it), so a kept answer is as true as a new one.  A place whose
 * cell is kept is answered from here, `fresh` as before; only a cell not
 * among them is asked for.  Four is two cells either side of a corner (the
 * arrival point is one), and walking on still asks at every new cell, so the
 * worker's own "where is he" (its far prefetch, hereAt) is as fresh as before
 * to within a cell.
 *
 * `?herecells=0` keeps one answer, as before.  No imports: node tests it
 * (tools/guards/here-cells.test.mjs).
 */

export const HERE_KEEP = 4;

/** The answer to give for cell (cx, cy), or null when the worker must be
 *  asked: `last` the newest answer, `kept` the store (null: one answer only,
 *  the way before).  wheelHere's one rule, here so node can play it. */
export function hereFor(last, kept, cx, cy) {
  if (last && last.x === cx && last.y === cy) return last;
  return kept ? kept.get(cx, cy) : null;
}

/** The kept answers, the newest last.  An answer is whatever the caller
 *  stores, with its cell in `x` and `y` (whole numbers). */
export function hereCells(keep) {
  const max = keep > 0 ? Math.floor(keep) : HERE_KEEP;
  const list = [];
  return {
    /** the kept answer for cell (cx, cy), or null */
    get(cx, cy) {
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        if (h.x === cx && h.y === cy) return h;
      }
      return null;
    },
    /** keep `h` (its cell's older answer goes; past `keep`, the oldest goes) */
    put(h) {
      if (!h) return;
      for (let i = 0; i < list.length; i++) {
        if (list[i].x === h.x && list[i].y === h.y) { list.splice(i, 1); break; }
      }
      list.push(h);
      if (list.length > max) list.shift();
    },
    clear() { list.length = 0; },
    size() { return list.length; },
  };
}
