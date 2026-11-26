/* ═══ v2.3.6700: A POLLED VIEW DRAWS AGAIN ONLY WHEN WHAT IT SHOWS HAS CHANGED (card PRT) ═══
 *
 * The game's state is not React's: it lives in one plain object the loop
 * writes (window._gameState), so a control that shows some of it has to LOOK
 * -- on a timer, or on every animation frame -- and tell React to draw it
 * again.  Looking is a few reads.  Drawing again is a render, a compare of
 * everything rendered and a commit: a task on the page's one thread each
 * time, and garbage for the collector.
 *
 * The Element Burst button looked on every animation frame and drew again
 * on every one, for the whole session, whether or not it was on screen: on a
 * character with no enchanted weapon it drew nothing, 60 times a second (120
 * on a fast screen).  Counted on the test box, 2026-11-26 (mp-phoneframe
 * BT_PF_REACT=1): one render of it a frame, standing still.
 *
 * THE RULE.  The view makes a KEY of everything it would draw (a short
 * string), and draws again only when the key is not the last one, or while
 * something on it moves by the clock (`moving`: a cooldown's arc), when every
 * look draws.  The first look always draws.
 *
 * No imports: node tests it (tools/guards/draw-on-change.test.mjs).
 */

/** a view's own store */
export function drawStore() {
  return { key: undefined, draws: 0, looks: 0 };
}

/** One look.  True: draw again.  `key` everything the view would draw apart
 *  from what moves by the clock; `moving` true while that moves. */
export function drawNow(st, key, moving) {
  st.looks++;
  if (moving || key !== st.key) {
    st.key = key;
    st.draws++;
    return true;
  }
  return false;
}
