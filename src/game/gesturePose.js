/* ═══ v2.3.2245: GESTURE PHASE -> POSE PHASE, AT A LEISURELY CAP ═══
 *
 * Owner: "the animation frames will play at the speed the user is performing
 * the gesture (capped at a maximum speed not faster than a leisurely gesture
 * pace)."
 *
 * Returns the 0..1 phase a harvest animation should show, or null when the
 * clock loop should run instead (no extraction, or its window not open yet
 * -- control-redesign.md §5.11: a frozen figure for a ten-second wind-up
 * reads as a hang, so the wind-up keeps its slow loop and the gesture takes
 * over at `ready`).
 *
 * The DISPLAY phase chases the RAW gesture phase (ex.cueFrame01, written by
 * ExtractionSwipeLayer as the thumb moves on the right button) at most one
 * full cycle per `fullCycleMs` -- the v2.3.1435 chase the reel and pan
 * markers already used, moved onto the extraction record (ex._posF/_posT)
 * so it dies with the attempt.  `wraps` treats the phase as circular (the
 * reel, the cook flip), so a crank never unwinds backwards across the seam.
 * A still thumb holds the pose: no drift, no idle loop.
 *
 * Shared by entityRenderer (the mine/fish body poses) and effectsRenderer
 * (the chop/cook stand-ins) so the two cannot drift apart. */
/* ═══ v2.3.2384: AND A DEMO PHASE WHILE NOBODY IS SWIPING ═══
 *
 * Owner: "Add the old gesture cues on top of the right joystick when it's
 * time to extract the resource."
 *
 * The old cue was a procedural white finger drawn in the world, deleted whole
 * at v2.3.2245 when the harvest moved onto the right button (commit 2deb56a).
 * What replaced it teaches nothing at the moment it matters, and the reason is
 * one number: `ex.cueFrame01` is written ONLY inside ExtractionSwipeLayer's
 * onPointerMove.  So the instant the window opens with no thumb down, the
 * button shows the word CHOP, a ring at 0%, and a tool strip FROZEN on cell 0
 * -- and the character freezes with it, because gesturePose01 below chases the
 * same number.  Nothing moves until you already know what to do.
 *
 * This is the fix, and it is deliberately ONE function feeding ONE place: give
 * `cueFrame01` a demo value while no thumb is down, and four things start
 * teaching at once -- the tool strip on the button, the player's own body, the
 * chop/cook stand-ins, and anything else drawn off the phase.  Fixing only the
 * button would have left the frozen character behind it.
 *
 * IT YIELDS THE MOMENT A THUMB MOVES, which is what `ex._gestureMovedAt` was
 * always for.  ExtractionSwipeLayer has stamped it since v2.3.2245 with the
 * comment "the button face reads this" -- and nothing ever read it.  Now it
 * does: the demo returns null for HOLD_MS after the last movement, so the
 * player's own gesture owns the phase while they are performing it and the
 * demo returns after a pause of stillness.  A demo that kept looping under a
 * live gesture would fight the thing it is trying to teach.
 *
 * The cadences are the caps already in the tree, not new numbers, so the demo
 * and the result cannot disagree: 700ms a swing for mining and woodcutting,
 * 450ms a crank for fishing, 1600ms a flip for cooking.
 *
 * A SAWTOOTH, not an oscillation, for all four.  The painted strips march one
 * way: measured on the pickaxe and axe sheets, the opaque bbox walks
 * continuously from cell 0 (x 20..131, y 37..133) to cell 7 (x 82..199,
 * y 126..244) -- wind-up through strike, then back to ready.  0 -> 1 repeating
 * is that motion; a triangle would play the strike backwards on the way down.
 */
const DEMO_CYCLE_MS = { mining: 700, woodcutting: 700, fishing: 450, cooking: 1600 };
/* Long enough that the gaps between samples inside one continuous swipe do not
   flicker the demo back on, short enough that a player who stops to look gets
   the demonstration back while the window is still open. */
const DEMO_HOLD_MS = 600;

export function gestureDemo01(ex, now) {
  if (!ex || ex.status !== 'ready') return null;
  /* TWO CLOCKS, AND THEY ARE NOT THE SAME EPOCH.  `_gestureMovedAt` is stamped
     with performance.now() (ExtractionSwipeLayer), which counts from page load;
     every caller of this module passes Date.now(), which counts from 1970.
     Subtracting one from the other gives ~1.7e12 -- always past any hold, so
     the demo would have run straight through a live gesture and fought the
     thing it exists to teach.  So the HOLD is measured on performance.now()
     here, against the stamp's own clock, and the `now` argument is used only
     for the cycle phase, where any steady millisecond clock does. */
  /* THE THUMB IS DOWN: no demo, no timer involved.  ExtractionSwipeLayer
     stamps this on pointerdown and clears it on pointerup/pointercancel and
     on unmount (v2.3.2384), so while a finger is on the button the player's
     own motion owns the phase however long a frame takes.  The HOLD below is
     a timer and a timer alone was not enough: measured in the headless
     harness, the main thread stalls for over a second at a stretch, and every
     stall longer than HOLD_MS let the demo cut in on a gesture in progress. */
  if (ex._gestureDown) return null;
  const moved = ex._gestureMovedAt || 0;
  if (moved) {
    const pnow = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : now;
    if ((pnow - moved) < DEMO_HOLD_MS) return null;
  }
  const cycle = DEMO_CYCLE_MS[ex.skill] || 700;
  return ((now % cycle) / cycle);
}

export function gesturePose01(ex, now, fullCycleMs, wraps) {
  if (!ex || ex.status !== 'ready') return null;
  /* v2.3.2384: the demo is fed in HERE rather than at each of the four call
     sites, because this function mutates ex._posF/_posT and a second call in
     one frame would double-advance the chase.  Every existing caller unfreezes
     for free, and the mirror-audit pin that both renderers go through this
     function keeps holding.

     AND IT BYPASSES THE CHASE, which is not a shortcut -- the chase would
     fight it.  The rate limiter below moves at most one full cycle per
     `fullCycleMs`, which is the SAME rate the demo advances at, so the chase
     could only ever just barely keep up and would lag a little further behind
     every frame it was starved.  Worse at the seam: `wraps` is false for
     mining and chopping, so when the demo rolls 0.999 -> 0 the non-wrapping
     chase cannot jump the gap and instead walks the pose all the way back
     down, turning a repeating swing into a saw that winds up and then
     un-winds.  The chase exists to smooth a jittery THUMB; a generated phase
     is already smooth and is authored at the pace it should play, so it wants
     no smoothing at all.  _posF and _posT are still written, so the frame the
     player's thumb takes over starts from exactly where the demo left off. */
  const demo = gestureDemo01(ex, now);
  if (demo != null) { ex._posT = now; ex._posF = demo; return demo; }
  const raw = Math.max(0, Math.min(0.9999, ex.cueFrame01 || 0));
  const lastT = ex._posT || now;
  const dt = Math.max(0, Math.min(100, now - lastT));
  ex._posT = now;
  let cur = (ex._posF != null) ? ex._posF : raw;
  const rate = dt / Math.max(1, fullCycleMs);
  let d = raw - cur;
  if (wraps) { if (d > 0.5) d -= 1; else if (d < -0.5) d += 1; }
  cur = cur + Math.max(-rate, Math.min(rate, d));
  if (wraps) cur = ((cur % 1) + 1) % 1;
  else cur = Math.max(0, Math.min(0.9999, cur));
  ex._posF = cur;
  return cur;
}

/* v2.3.2245: the owner's painted gesture strips, for the button face.  A
   MIRROR of GESTURE_TOOLS in effectsRenderer.js (which slices the same files
   into Pixi textures for the chop-strike burst anchors); the URLs are the
   only thing shared, and mirror-audit pins the two lists equal. */
export const GESTURE_TOOL_URLS = {
  mining:      '/sprites/tools/pickaxe-gesture-v1.webp?v=2.3.1417',
  woodcutting: '/sprites/tools/axe-gesture-v1.webp?v=2.3.1417',
  fishing:     '/sprites/tools/reel-gesture-v1.webp?v=2.3.1417',
  cooking:     '/sprites/tools/pan-gesture-v2.webp?v=2.3.1433',
};

/* ═══ v2.3.2384: THE OLD FINGER CUE'S GEOMETRY, ON THE BUTTON ═══
 *
 * Owner: "Add the old gesture cues on top of the right joystick when it's
 * time to extract the resource."
 *
 * The cue that was deleted at v2.3.2245 (commit 2deb56a) was a white finger
 * drawn in the WORLD over the node, with per-skill motion curves the owner
 * tuned across five versions: v2.3.843 the chop (wind back, snap forward,
 * recover), v2.3.853 the cook flip (dip, flick up, recover), v2.3.1442 the
 * mine pump and the reel orbit, v2.3.1667 "point where it is going".  Those
 * curves are RESTORED here rather than reinvented -- the shapes are the
 * owner's, only the frame changed, from the node to the right button.
 *
 * TWO THINGS CHANGED IN THE MOVE, both forced by the new frame:
 *
 * 1. THE CLOCK.  The old cue ran on its own `now % 1100` loop, independent of
 *    everything.  This one is driven by the SAME phase as the tool strip and
 *    the character (gesturePose01 above), so the finger, the painted tool and
 *    the body are one motion.  A cue on its own timer next to a tool on the
 *    gesture's timer would teach a rhythm the game does not keep.
 *
 * 2. THE COORDINATES.  Everything below is in the button's own 0..100 viewBox,
 *    so it scales with the disc (96px portrait, 108 landscape) and cannot go
 *    stale if the button is resized again.  The tracks sit OFF-CENTRE, which
 *    the world cue never had to worry about: the painted tool strip owns the
 *    middle of the disc and the label owns the bottom, so the vertical motions
 *    run down the left, the horizontal one across the top, and the reel orbits
 *    between the tool and the wind-up ring (drawn at r=40).
 *
 * Returns null when there is nothing to draw.
 */
/* ═══ THE CUE IS CENTRED, AND ITS BODY IS PART OF IT ═══
 *
 * Two measurements, from a real capture of the button mid-cook, decide every
 * number below.
 *
 * ONE: the finger is not a point.  The first cut of this put the tracks in the
 * annulus outside the tool strip and sized the travel by where the FINGERTIP
 * went -- and the screenshot showed a white blob hanging off the rim at ten
 * o'clock, because the glyph's body runs BACK from the tip and its knuckle
 * sits further back still.  CUE_REACH is that overhang; the tracks are sized
 * so the whole glyph stays inside, not just its tip, and the pin measures the
 * same way.
 *
 * TWO: the middle of the disc is the only room there is.  The joystick knob
 * (v2.3.2258) sits over the centre and the painted tool strip behind it, so
 * the annulus plan had the cue fighting the rim while the middle went unused.
 * Drawing over the knob is right rather than merely expedient: the cue is only
 * on screen while NO thumb is down (gestureDemo01), and the knob only matters
 * once one is -- the two can never be wanted at the same moment.
 *
 * The centre is (50, 45), a touch high, to keep the glyph clear of the label
 * that sits along the bottom of the well. */
export const CUE_REACH = 13.7;   /* how far the glyph reaches from its origin:
                                    knuckle centre 10.5 + its radius 3.2 */
const CX = 50, CY = 45;
const CUE_TRACKS = {
  mining:      'M 50 30 L 50 60',
  cooking:     'M 50 30 L 50 60',
  woodcutting: 'M 33 45 L 67 45',
  fishing:     'M 50 28 A 17 17 0 1 0 50 62 A 17 17 0 1 0 50 28',
};
const smooth = (t) => t * t * (3 - 2 * t);

export function gestureCue01(skill, p) {
  if (p == null) return null;
  const track = CUE_TRACKS[skill];
  if (!track) return null;
  const ph = ((p % 1) + 1) % 1;
  let x, y, deg, streak = 0;
  if (skill === 'fishing') {
    /* v2.3.1442/1449: the finger orbits the reel, pointing along the
       clockwise tangent (screen y-down, so +angle is clockwise -- the
       direction ExtractionSwipeLayer counts as a positive crank). */
    const a = ph * Math.PI * 2 - Math.PI / 2;
    x = CX + Math.cos(a) * 17;
    y = CY + Math.sin(a) * 17;
    deg = (a + Math.PI / 2) * 180 / Math.PI;
    streak = 0.5;   /* a crank never stops, so the streak never drops out */
  } else if (skill === 'woodcutting') {
    /* v2.3.843: wind back, snap forward, ease home.  `dir` was "toward the
       tree" in the world; on a button there is no tree, so it is simply
       rightward -- which is also the direction the axe strip swings. */
    const WIND = 15, REACH = 14;
    let off;
    if (ph < 0.5) off = -WIND * smooth(ph / 0.5);
    else if (ph < 0.68) off = -WIND + (WIND + REACH) * ((ph - 0.5) / 0.18);
    else off = REACH * (1 - smooth((ph - 0.68) / 0.32));
    x = CX + off + 1; y = CY;
    const fwd = ph >= 0.5 && ph < 0.68;
    deg = fwd ? 0 : 180;
    streak = fwd ? 0.5 : 0;
  } else if (skill === 'cooking') {
    /* v2.3.853: settle down, flick UP, recover -- the flip. */
    const DOWN = 13, UP = 15;
    let off;
    if (ph < 0.5) off = DOWN * smooth(ph / 0.5);
    else if (ph < 0.68) off = DOWN - (DOWN + UP) * ((ph - 0.5) / 0.18);
    else off = -UP * (1 - smooth((ph - 0.68) / 0.32));
    x = CX; y = CY + off + 1;
    const flick = ph >= 0.5 && ph < 0.68;
    deg = flick ? -90 : 90;
    streak = flick ? 0.5 : 0;
  } else {
    /* v2.3.1442: mining pumps on its axis and points along its own velocity
       -- down on the down-stroke, up on the up-stroke.  ExtractionSwipeLayer
       advances the mine swing on the DOWN stroke, so the phase is offset a
       quarter turn to put the fingertip at the TOP at phase 0, which is where
       the pickaxe strip's cell 0 has the tool raised. */
    const AMP = 15;
    const a = ph * Math.PI * 2;
    x = CX; y = CY - Math.cos(a) * AMP;
    const vel = Math.sin(a);
    deg = vel > 0 ? 90 : -90;
    streak = Math.abs(vel) > 0.35 ? 0.5 : 0;
  }
  return { x, y, deg, streak, track };
}
