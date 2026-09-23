/* ═══ v2.3.2245: GESTURE PHASE -> POSE PHASE ═══
 *
 * Owner: "the animation frames will play at the speed the user is performing
 * the gesture".  Returns the 0..1 phase a harvest animation should show, or
 * null when the clock loop should run instead (no extraction, or its window
 * not open yet -- the wind-up keeps its loop and the gesture takes over at
 * `ready`).  Shared by entityRenderer (the mine/fish body poses) and
 * effectsRenderer (the chop/cook stand-ins) so the two cannot drift apart.
 */
/* ═══ v2.3.2733: THE CUE GESTURE, THE WAY THE OWNER DESCRIBED IT ═══
 *
 * Owner: "the character harvests a resource ... for a certain amount of time
 * (determined by your skill level) ... I wanted the character to perform each
 * animation with a loading bar above their head indicating the progress of
 * the animation.  Then, once it reaches the limit, the character is supposed
 * to STOP animating until you perform the correct gesture on the right
 * joystick ... before the player performs the gesture the starting spot of the
 * cue should be static but flash.  An effect should show you which way the
 * cue should move ... As you perform the gesture the character's frames
 * should animate at the speed you perform the gesture, but require about 3
 * seconds of performing the gesture at a quick pace ... It also might look
 * good if the cue was a mini sprite of the tool being used."
 *
 * What that changed here, against what shipped before it:
 *
 * 1. NO DEMO ON THE BODY.  v2.3.2384 looped a generated phase (gestureDemo01)
 *    whenever no thumb was down, and fed it to the character too -- so the
 *    figure kept swinging on its own at `ready`, which is the opposite of
 *    "stop animating until you perform the gesture".  The body now HOLDS: its
 *    phase comes only from the thumb (ex.cueFrame01), which is 0 -- the
 *    raised, ready pose -- until the first stroke, and stays wherever the last
 *    stroke left it while the thumb rests.  The teaching moved to the button,
 *    where it belongs: a still tool at the start of its track, flashing, and a
 *    light running along the track in the direction to move (gestureCueFace).
 *
 * 2. THE PHASE IS A SAWTOOTH DRIVEN BY THE HAND, AND ONLY FORWARD.  It used to
 *    be scrubbed by signed thumb deltas, so every up-stroke of a pickaxe pump
 *    played the swing BACKWARDS.  Now each skill has a power stroke (down for
 *    the pick, up for the pan flip, rightward for the axe) that plays the loop
 *    up to the blow landing (GESTURE_STROKE.split), and a return stroke that
 *    plays the rest -- one there-and-back is one swing, and the swing always
 *    runs forward, at the pace of the hand.  Fishing was already a forward
 *    loop (one finger-circle = one sway).
 *
 * 3. NO LEISURELY CAP.  The chase below used to hold a swing to one per 700ms
 *    (v2.3.2245's "not faster than a leisurely pace"); the owner now asks for
 *    "the speed you perform the gesture".  The cap is kept only as a smoother
 *    for a jittery thumb and set well past a quick pace (GESTURE_MAX_CYCLE_MS),
 *    so it is not what sets the speed any more.
 *
 * 4. ABOUT THREE SECONDS AT A QUICK PACE.  The meter used to fill on a handful
 *    of reps (3 pumps, 1.5 turns, ONE flip).  It now wants GESTURE_TARGET_MS of
 *    work at a quick pace (GESTURE_QUICK_CYCLE_MS a cycle), so a quick hand
 *    finishes in ~3s and a slow one takes longer -- with a floor
 *    (GESTURE_FLOOR_MS of actual motion), so no amount of scribbling finishes
 *    in under ~2.4s.  (v2.3.2734: DOUBLED at the owner's word -- ~6s, floor
 *    ~4.8s.  The numbers below are the live ones.)
 */

/* ═══ THE STROKES ═══
 * `axis`: the thumb axis the stroke is read on.  `power`: the direction of the
 * stroke that lands the blow (+1 = down / right on screen).  `split`: where in
 * the 0..1 animation loop the power stroke ENDS -- the blow -- measured on the
 * art, not chosen:
 *   mining       mine-south, 14 frames: 0-3 hold the pick raised, 4-5 are the
 *                strike (floor(p*14) = 5 at p = 0.36) -- the down-stroke ends
 *                on the bite, the up-stroke plays the debris and the raise.
 *   woodcutting  the 12 played chop frames: the axe bites on k = 9
 *                (p 0.75..0.83), so the rightward stroke ends at 0.8.
 *   cooking      the 24-frame cook loop has no single apex; the flick up plays
 *                the first half, the settle back the second.
 * Fishing is not here: it is a circle, read as an angle (one turn = one loop). */
export const GESTURE_STROKE = {
  mining:      { axis: 'y', power: 1,  split: 0.36 },
  woodcutting: { axis: 'x', power: 1,  split: 0.80 },
  cooking:     { axis: 'y', power: -1, split: 0.50 },
};
/* Thumb travel for one full half-stroke.  The disc is 96px (108 landscape) and
   the recognizer's own hysteresis is 28px (ExtractionSwipeLayer STROKE_AMP), so
   a comfortable pump across the middle of the button plays a whole half of the
   loop. */
export const STROKE_SPAN_PX = 38;

/* A QUICK pace, per full cycle (a pump down and back up, a chop across and
   back, a flip up and down, one turn of the reel).  The meter wants
   GESTURE_TARGET_MS of work at this pace, i.e. TARGET / QUICK cycles. */
export const GESTURE_QUICK_CYCLE_MS = { mining: 420, woodcutting: 420, fishing: 480, cooking: 500 };
/* v2.3.2734 (owner, after playing it: "Double the amount of time it takes to
   complete the gesture"): 3000 -> 6000, and the floor with it, 2400 -> 4800. */
export const GESTURE_TARGET_MS = 6000;
/* The floor: the meter can never run ahead of GESTURE_FLOOR_MS of real motion,
   so a frantic (or synthetic) scribble still takes ~4.8s. */
export const GESTURE_FLOOR_MS = 4800;
/* The display chase's cap -- a smoother, not a speed limit (see 3. above). */
export const GESTURE_MAX_CYCLE_MS = { mining: 240, woodcutting: 240, fishing: 220, cooking: 260 };

export function gestureTargetCycles(skill) {
  return GESTURE_TARGET_MS / (GESTURE_QUICK_CYCLE_MS[skill] || 450);
}

/* How long after the thumb leaves the button (or stops) before the cue comes
   back to teach.  Long enough that the gaps inside one continuous swipe never
   flash it on, short enough that a player who stops to look gets it back. */
const IDLE_HOLD_MS = 600;

/* TRUE while the window is open and nobody is gesturing -- the cue's teaching
   state.  Two clocks, and they are NOT the same epoch: `_gestureMovedAt` is a
   performance.now() stamp (ExtractionSwipeLayer), so the hold is measured on
   performance.now() here, never against a Date.now() the caller passes. */
export function gestureIdle(ex) {
  if (!ex || ex.status !== 'ready') return false;
  if (ex._gestureDown) return false;
  const moved = ex._gestureMovedAt || 0;
  if (!moved) return true;
  const pnow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  return (pnow - moved) >= IDLE_HOLD_MS;
}

/* ═══ ONE READING OF HOW FAR ALONG A HARVEST IS (v2.3.2514) ═══
 * Both meters -- the ring on the button and the bar over the head -- read
 * this, so the two cannot drift.
 * v2.3.2733: the bar no longer stalls at 95%.  The owner's description is two
 * phases, each a full bar: the wind-up fills while the character works, and
 * "once it reaches the limit" the character stops and the gesture takes over
 * -- so `bar01` is the wind-up (0..1) and then, at `ready`, the gesture's own
 * progress (0..1).  `idle` says the bar should flash: full, waiting for you. */
export function extractionMeter01(ex, now) {
  if (!ex) return null;
  const t = (typeof now === 'number') ? now : Date.now();
  const span = Math.max(1, (ex.windowOpensAt || 0) - (ex.startedAt || 0));
  const windup = Math.max(0, Math.min(1, (t - (ex.startedAt || 0)) / span));
  const reps = Math.max(0, Math.min(1, ex.progress || 0));
  const ready = ex.status === 'ready';
  return {
    ready,
    windup,
    reps,
    idle: ready && gestureIdle(ex),
    bar01: ready ? reps : windup,
  };
}

/* ═══ THE POSE PHASE ═══
 * The DISPLAY phase chases the thumb's phase (ex.cueFrame01) FORWARD ONLY: a
 * small step back is thumb jitter and is held, never played as the swing
 * rewinding.  A still thumb holds the pose -- no drift, no idle loop -- and a
 * window nobody has touched yet shows phase 0, the ready pose.  _posF/_posT
 * live on the extraction record so they die with the attempt.  Only ONE
 * renderer calls this per skill per frame (the body for mine/fish, the stand-in
 * for chop/cook), which matters because it advances the chase. */
export function gesturePose01(ex, now, fullCycleMs) {
  if (!ex || ex.status !== 'ready') return null;
  const raw = (((ex.cueFrame01 || 0) % 1) + 1) % 1;
  const lastT = (ex._posT != null) ? ex._posT : now;
  const dt = Math.max(0, Math.min(100, now - lastT));
  ex._posT = now;
  let cur = (ex._posF != null) ? ex._posF : raw;
  let d = ((raw - cur) % 1 + 1) % 1;   /* forward distance, 0..1 */
  if (d > 0.85) d = 0;                  /* a small step BACK: jitter, hold */
  const cap = fullCycleMs || GESTURE_MAX_CYCLE_MS[ex.skill] || 240;
  cur = (cur + Math.min(d, dt / Math.max(1, cap))) % 1;
  ex._posF = cur;
  return cur;
}

/* v2.3.2245: the owner's painted gesture strips.  A MIRROR of GESTURE_TOOLS in
   effectsRenderer.js (which slices the same files into Pixi textures); the URLs
   are the only thing shared, and mirror-audit pins the two lists equal.
   v2.3.2733: the button no longer plays these whole (the mini tool below is
   the cue now); the cooking cue takes its pan from cell 0 of the pan strip,
   because there is no pan item icon. */
export const GESTURE_TOOL_URLS = {
  mining:      '/sprites/tools/pickaxe-gesture-v1.webp?v=2.3.1417',
  woodcutting: '/sprites/tools/axe-gesture-v1.webp?v=2.3.1417',
  fishing:     '/sprites/tools/reel-gesture-v1.webp?v=2.3.1417',
  cooking:     '/sprites/tools/pan-gesture-v2.webp?v=2.3.1433',
};

/* ═══ v2.3.2733: THE MINI TOOL -- "a mini sprite of the tool being used" ═══
 * The item icons the bag already shows (a pickaxe, an axe, a rod), so the cue
 * is the same object the player owns -- at the bag's own ?v= (ITEMS_V in
 * InventoryPanel.jsx), because a query string is part of the cache key and a
 * different one would be a second download.  There is no pan icon, so the pan
 * is cell 0 of the pan strip.  `w`/`h` are the image's size; `vb` is the
 * window of it the button shows (the whole icon, or the pan's opaque box in
 * cell 0, measured: x 26..254, y 104..215).
 * Preloaded on the loading screen (gestureCuePreload.js) -- the LAW. */
const ITEMS_V = '?v=2.3.1774';
export const GESTURE_CUE_SPRITES = {
  mining:      { url: '/icons/items/mining-pickaxe.webp' + ITEMS_V, w: 192, h: 192, vb: '0 0 192 192' },
  woodcutting: { url: '/icons/items/woodcutting-axe.webp' + ITEMS_V, w: 192, h: 192, vb: '0 0 192 192' },
  fishing:     { url: '/icons/items/fishing-pole.webp' + ITEMS_V, w: 256, h: 256, vb: '0 0 256 256' },
  cooking:     { url: GESTURE_TOOL_URLS.cooking, w: 2048, h: 256, vb: '25 44 232 232' },
};

/* ═══ THE CUE'S GEOMETRY, IN THE BUTTON'S 0..100 VIEWBOX ═══
 * The viewBox IS the disc (96px portrait, 108 landscape), so the cue scales
 * with it.  Centre (50, 45), a touch high, to keep clear of the label along
 * the bottom of the well (v2.3.2384 measured this on a real capture). */
const CX = 50, CY = 45;
const V_TOP = 27, V_BOT = 63, H_L = 30, H_R = 70, REEL_R = 18;
/* How big the mini tool is drawn, in viewBox units (~a third of the disc).
   26 read as a thin sliver on the phone capture (the pickaxe and rod icons are
   line-thin), so it is 30 and sits on a dark badge (TouchControls). */
export const CUE_TOOL_SIZE = 30;
const TRACKS = {
  mining:      `M ${CX} ${V_TOP} L ${CX} ${V_BOT}`,
  cooking:     `M ${CX} ${V_TOP} L ${CX} ${V_BOT}`,
  woodcutting: `M ${H_L} ${CY} L ${H_R} ${CY}`,
  fishing:     `M ${CX} ${CY - REEL_R} A ${REEL_R} ${REEL_R} 0 1 1 ${CX} ${CY + REEL_R} A ${REEL_R} ${REEL_R} 0 1 1 ${CX} ${CY - REEL_R}`,
};
/* Chevrons on the track pointing the way to move: both ends of a back-and-
   forth stroke, and three clockwise chevrons round the reel. */
function chevron(x, y, ang, s) {
  /* ang: the direction of travel, radians, screen (y down). */
  const bx = Math.cos(ang), by = Math.sin(ang), nx = -by, ny = bx;
  const p = (u, v) => `${(x + bx * u + nx * v).toFixed(1)} ${(y + by * u + ny * v).toFixed(1)}`;
  return `M ${p(-s, -s)} L ${p(0, 0)} L ${p(-s, s)}`;
}
const ARROWS = {
  mining:      chevron(CX, V_TOP - 4, -Math.PI / 2, 4.5) + ' ' + chevron(CX, V_BOT + 4, Math.PI / 2, 4.5),
  cooking:     chevron(CX, V_TOP - 4, -Math.PI / 2, 4.5) + ' ' + chevron(CX, V_BOT + 4, Math.PI / 2, 4.5),
  woodcutting: chevron(H_L - 4, CY, Math.PI, 4.5) + ' ' + chevron(H_R + 4, CY, 0, 4.5),
  fishing: [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + Math.PI / 3 + i * (2 * Math.PI / 3);   /* 1, 5 and 9 o'clock */
    return chevron(CX + Math.cos(a) * REEL_R, CY + Math.sin(a) * REEL_R, a + Math.PI / 2, 4);
  }).join(' '),
};

/* Where the tool is at loop phase p, and how it is turned.  The motion is the
   THUMB's, not the art's: the power stroke carries the tool from the start of
   the track to its far end, the return stroke carries it back -- so the mini
   tool under the thumb goes where the thumb goes. */
function toolAt(skill, p) {
  const ph = ((p % 1) + 1) % 1;
  if (skill === 'fishing') {
    const a = -Math.PI / 2 + ph * Math.PI * 2;   /* clockwise from 12 o'clock */
    return { x: CX + Math.cos(a) * REEL_R, y: CY + Math.sin(a) * REEL_R, deg: 0 };
  }
  const st = GESTURE_STROKE[skill];
  if (!st) return null;
  /* 0 at the start of the track, 1 at the far end. */
  const u = ph < st.split ? ph / st.split : 1 - (ph - st.split) / (1 - st.split);
  if (skill === 'woodcutting') {
    /* the axe icon sits blade-up; it tips forward across the chop */
    return { x: H_L + (H_R - H_L) * u, y: CY, deg: -30 + 75 * u };
  }
  if (skill === 'cooking') {
    /* starts low (the pan on the fire) and flicks up, tilting as it goes */
    return { x: CX, y: V_BOT - (V_BOT - V_TOP) * u, deg: -22 * u };
  }
  /* mining: raised at the top, struck at the bottom */
  return { x: CX, y: V_TOP + (V_BOT - V_TOP) * u, deg: -35 + 80 * u };
}

/* The demonstration's pace on the button: a little slower than a quick hand,
   so the eye can follow which way it goes. */
const DEMO_CYCLE_MS = { mining: 1100, woodcutting: 1100, fishing: 1000, cooking: 1200 };

/* Everything the button face draws for the cue, for one frame.
 *   idle:  the tool sits STILL at the start of its track and flashes (`op`
 *          pulses, `glow` pulses behind it), and a comet of light runs the
 *          motion along the track -- the "which way" effect.
 *   live:  the tool rides the gesture's own phase (the same phase as the
 *          body), solid, and the comet is gone.
 * Returns null for a skill with no cue. */
export function gestureCueFace(skill, phase01, idle, now) {
  const track = TRACKS[skill];
  if (!track) return null;
  const t = (typeof now === 'number') ? now : 0;
  if (idle) {
    const start = toolAt(skill, 0);
    const pulse = 0.5 + 0.5 * Math.sin(t / 140);   /* ~1.1Hz flash */
    const cyc = DEMO_CYCLE_MS[skill] || 1100;
    const dp = (t % cyc) / cyc;
    const comet = [0, 0.035, 0.07].map((lag, i) => {
      const c = toolAt(skill, dp - lag);
      return { x: c.x, y: c.y, r: 3.2 - i * 0.8, op: 0.95 - i * 0.3 };
    });
    return { track, arrows: ARROWS[skill], idle: true,
      tool: { x: start.x, y: start.y, deg: start.deg, op: 0.45 + 0.55 * pulse },
      glow: 0.25 + 0.55 * pulse, comet };
  }
  const at = toolAt(skill, phase01 || 0);
  return { track, arrows: ARROWS[skill], idle: false,
    tool: { x: at.x, y: at.y, deg: at.deg, op: 1 }, glow: 0, comet: null };
}
