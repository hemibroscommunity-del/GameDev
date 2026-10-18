import React, { useEffect, useRef } from 'react';
import { GESTURE_STROKE, STROKE_SPAN_PX, GESTURE_FLOOR_MS, GESTURE_QUICK_CYCLE_MS, gestureTargetCycles, gradeGesture, KEY_WORK } from '@/game/gesturePose.js'; /* v2.3.2760; v2.3.3407: the grade lives there now, with the keyboard's work */

/* v2.3.229 / v2.4 — ExtractionSwipeLayer
 *
 * Captures the phase-2 ACTIVE gesture for resource extraction. Sits above the
 * game canvas as a transparent fixed-position layer, listening to native
 * pointer events (passive: false) so iOS Safari delivers preventDefault.
 *
 * Activation: only routes events while stateRef.current._extraction.status
 * === 'ready'. Otherwise pointer events fall through to the game / dashboard.
 *
 * Phase-2 is a SUSTAINED, per-skill gesture that fills a meter (reps):
 *   - mining:      up/down pump (vertical oscillation) -> 1 rep per full pump
 *   - woodcutting: horizontal chops                    -> 1 rep per stroke
 *   - fishing:     clockwise circular reel             -> 1 rep per full turn
 * When the meter reaches REPS_TARGET we grade the gesture (perfect/good/ok by
 * how fast it filled) and call onSuccess(accuracy), which routes to BroTown's
 * _succeedExtraction. Lifting early just pauses — the accumulator lives on
 * S._extraction._gesture so a re-press resumes, and the game tick still fails
 * the attempt when the window closes.
 *
 * The recognizer reads the full sampled path (not just start->end) so the
 * oscillation/rotation shapes are detectable. Anti-bot entropy/fingerprint
 * (swipeFp) is preserved on success.
 *
 * ═══ v2.3.2245: THE GESTURE IS PERFORMED ON THE RIGHT BUTTON ═══
 * Owner: "No resource extraction button in the middle of the screen or
 * needing to tap on the resource or perform the gestures in the middle of
 * the screen area. ... The gesture will be performed on that right button
 * (same gestures per resource). ... The gesture cues will be on the right
 * button."
 *
 * So the cue's screen position is no longer the node (or the player, for
 * fishing) -- it is the CENTRE OF THE RIGHT BUTTON (.bt-rjoy-base), and a
 * gesture starts only when the finger goes down ON the button (its rect plus
 * a thumb's worth of slack).  Everything after the start -- the pump, chop,
 * reel and flip recognizers, the rep meter, the anti-bot fingerprint, the
 * cueFrame01 the tool frame follows -- is untouched, because the owner asked
 * for the SAME gestures.  Two consequences of the new anchor:
 *   - chopping has no "tree-ward" on a disc, so either horizontal direction
 *     scores (treeward 0, which the recognizer already accepted for a tree
 *     directly above or below);
 *   - the reel is a circle around the button centre, which is what a thumb
 *     on a round button draws naturally.
 * Moves and ups stay at the window so a stroke may run off the disc.
 *
 * ═══ v2.3.2760: THE REP METER ABOVE IS NOW ~3s OF WORK ═══
 * The per-skill rep rules described at the top (1 rep per pump / stroke /
 * turn, one flip = cooked) are gone: the meter counts CYCLES of the motion
 * against gestureTargetCycles (3s at a quick pace, floored at 2.4s of real
 * motion; 1.5s and 1.2s since v2.3.3036, gesturePose.js GESTURE_TARGET_MS and
 * GESTURE_FLOOR_MS), and one stroke tracker drives both the meter and the pose -- see
 * stepStroke, docs/specs/gesture-cue.md and TRAPS §107.
 */

const MIN_SWIPE_LEN = 30; /* px — ignore micro-jitters before any motion counts */
/* px — travel past the last turning point to count a half-stroke.
   v2.3.2760: 40 -> 28.  The disc is 96px (108 landscape); a thumb pumping on
   it naturally travels ~50px peak to peak, and with the first stroke measured
   from the press point (below) a 40px threshold asked for most of the button
   in ONE direction before anything counted. */
const STROKE_AMP = 28;
const TWO_PI = Math.PI * 2;
/* v2.3.2245: a press counts as "on the button" inside its radius plus this
   much slack -- the disc is 96/108px, a thumb pad is ~40px wide, and a start
   a few px off the rim is still plainly aimed at the button. */
const BUTTON_SLACK_PX = 14;

function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

/* Wrap an angle delta into [-PI, PI] so cumulative rotation is continuous. */
function wrapPi(a) {
  while (a > Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

function vectorEntropy(samples) {
  /* "Is this a hand-drawn swipe vs a synthetic one" signal. Hand swipes show
     varying inter-sample angles; replayed bot swipes tend to be near-collinear. */
  if (samples.length < 4) return 0;
  let totalAngleDelta = 0;
  let prevAng = null;
  for (let i = 1; i < samples.length; i++) {
    const ax = samples[i].x - samples[i - 1].x;
    const ay = samples[i].y - samples[i - 1].y;
    if (ax === 0 && ay === 0) continue;
    const ang = Math.atan2(ay, ax);
    if (prevAng != null) {
      let d = Math.abs(ang - prevAng);
      if (d > Math.PI) d = 2 * Math.PI - d;
      totalAngleDelta += d;
    }
    prevAng = ang;
  }
  return totalAngleDelta / Math.max(1, samples.length - 2);
}

/* ── Anti-bot gesture fingerprint v2 (v2.3.694) ──────────────────────────
   Cheap scalar signals computed once at meter-full and shipped with
   node_strike (<200 bytes total).  A human hand produces irregular sample
   TIMING and a curved VELOCITY profile; a synthetic/replayed swipe converges
   to near-constant timing and collinear motion.  The server accumulates the
   DISTRIBUTION of these across a session — sophisticated agents can fake any
   single value, but matching a human's natural variance over hundreds of
   harvests is the hard part (see docs/ANTICHEAT-SPEC.md). */

/* Variance of inter-sample dt (ms²).  Bots emitting samples on a fixed clock
   → ~0; human input jitter → meaningfully positive. */
function timingVariance(samples) {
  if (samples.length < 4) return 0;
  const dts = [];
  for (let i = 1; i < samples.length; i++) dts.push(samples[i].t - samples[i - 1].t);
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  let v = 0;
  for (const d of dts) v += (d - mean) * (d - mean);
  return v / dts.length;
}

/* Curvature of the speed profile: variance of consecutive speed deltas,
   normalised by mean speed.  Constant-velocity synthetic drags → ~0. */
function velocityCurvature(samples) {
  if (samples.length < 5) return 0;
  const sp = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(1, samples[i].t - samples[i - 1].t);
    sp.push(Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) / dt);
  }
  const mean = sp.reduce((a, b) => a + b, 0) / sp.length || 1;
  let acc = 0;
  for (let i = 1; i < sp.length; i++) acc += Math.abs(sp[i] - sp[i - 1]);
  return Number(((acc / Math.max(1, sp.length - 1)) / mean).toFixed(3));
}

/* FNV-1a hash of the quantised path (8px grid) — a compact signature the
   server dedupes against to catch EXACT replays of a recorded swipe. */
function pathHash(samples) {
  let h = 0x811c9dc5;
  for (let i = 0; i < samples.length; i++) {
    const qx = (samples[i].x >> 3) & 0xff, qy = (samples[i].y >> 3) & 0xff;
    h ^= qx; h = Math.imul(h, 0x01000193);
    h ^= qy; h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/* ═══ v2.3.2760: THE METER IS ABOUT THREE SECONDS AT A QUICK PACE ═══
   Owner: "require about 3 seconds of performing the gesture at a quick pace
   before the gesture is successfully extracted."  The meter used to fill on a
   handful of reps (3 pumps, 1.5 turns, a single flip), which a quick thumb
   finished in about a second.  It now counts CYCLES of the motion -- a pump
   down and back, a chop across and back, a flip up and down, a turn of the
   reel -- against gestureTargetCycles (3s at a quick pace, gesturePose.js;
   1.5s since v2.3.3036, the owner's "reduce resource extraction time during
   gesture by 75%"), continuously, so the bar moves with the hand rather than
   in steps. */
function repsTargetFor(skill) {
  return gestureTargetCycles(skill);
}

/* Cycles of the motion made so far.  A stroke skill counts the half-strokes
   it has COMPLETED (each one that travelled STROKE_AMP) plus how far into the
   current one the thumb is; fishing counts turns.  The caller keeps the max, so
   a short wobble that never becomes a stroke can hold the meter but never
   push it back. */
function cyclesFromGesture(skill, g) {
  /* v2.3.3407: + the keyboard's work (HOLD E, keyStep below), counted in the
     same cycles, so a gesture begun with the mouse and finished with E is one
     meter, not two */
  const kb = g.kbCycles || 0;
  if (skill === 'fishing') return Math.max(0, g.totalAngle) / TWO_PI + kb;
  const cur = g.dir ? Math.min(1, (g.segTravel || 0) / STROKE_SPAN_PX) : 0;
  return ((g.halfStrokes || 0) + cur) / 2 + kb;
}

/* (v2.3.3407: gradeGesture moved to gesturePose.js, unchanged -- the keyboard
   is graded by it too.) */

/* ═══ v2.3.3407: A MOUSE CIRCLES ANYWHERE ═══
   The reel counts turns round the button's centre, which is where a thumb on
   a round button draws them.  A mouse on a computer is pressed anywhere on the
   world, so its turns are counted from the way it is HEADING instead: a circle
   of any size, anywhere, turns its heading once round.  A step is measured
   only once the pointer has gone FREE_STEP_PX (a pixel's jitter has no
   heading), and a turn of more than FREE_TURN_MAX in one step is a reversal,
   not a circle -- so wiggling back and forth reels nothing, as it reels
   nothing on the button. */
const FREE_STEP_PX = 6;
const FREE_TURN_MAX = 2.2;   /* radians, ~126 degrees */

/* v2.3.2245: the cue lives on the right button.  Its centre in CSS px.
   DESKTOP has no right button (game.css hides the touch controls under
   pointer:fine), so there the gesture anchors on the CHARACTER instead --
   the mouse pumps / circles over the figure, which is where fishing's cue
   always sat -- with a generous radius.  Null only before the HUD mounts.
   v2.3.3407: ...measured from the CANVAS's corner, which is where the
   projection lands.  It was not: a computer plays in a centred phone-shaped
   column (game.css, v2.3.1715), so the point lay in the black margin left of
   the game, ~420 px from the figure at 1280 wide, and no press could reach it.
   (A computer shows the button for the harvest since this version, so this is
   the fallback for a page where it is not on screen.) */
export function buttonCueScreenPos(S) {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector('.bt-rjoy-base');
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, on: 'button' };
  }
  if (S && S.camera && S.player) {
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    const cv = document.querySelector('canvas.brotown-canvas');
    const cr = cv ? cv.getBoundingClientRect() : null;
    const ox = cr ? cr.left : 0, oy = cr ? cr.top : 0;
    return { x: ox + (S.player.x - S.camera.x) * sx, y: oy + (S.player.y - 24 - S.camera.y) * sy, r: 80, on: 'player' };
  }
  return null;
}

/* v2.3.3407: a press that is a MOUSE (or a pen) rather than a finger, and one
   that lands on the world itself rather than on a menu, a card or the strip of
   keys over it -- a computer's gesture may start anywhere the world shows. */
function freeHand(e) {
  return !!e && (e.pointerType === 'mouse' || e.pointerType === 'pen');
}
function onWorld(e) {
  const t = e && e.target;
  return !!(t && typeof t.closest === 'function' && t.closest('canvas.brotown-canvas'));
}

export const ExtractionSwipeLayer = ({ stateRef, onSuccess }) => {
  const swipeRef = useRef(null); /* { startX, startY, samples: [] } while pointer down */

  useEffect(() => {
    const target = window;

    const readyExtraction = () => {
      const S = stateRef && stateRef.current;
      if (!(S && S._extraction && S._extraction.status === 'ready')) return null;
      return S._extraction;
    };

    const nodeOf = (S, ex) =>
      (ex.nodeRef && ex.nodeRef.alive) ? ex.nodeRef
        : (S.gatherNodes && ex.nodeId ? S.gatherNodes.find(n => n.id === ex.nodeId) : null);

    /* v2.3.2245: the cue is the button -- one anchor for every skill.
       (Fishing used to centre on the character and the others on the node;
       the world->CSS conversion those needed is gone with them.) */
    const cueScreenPos = () => buttonCueScreenPos(stateRef && stateRef.current);

    /* ═══ v2.3.2514: THE FINGER THAT WAS ALREADY DOWN ═══
     *
     * Owner: the character stops following your thumb partway through a
     * harvest and goes back to playing the demonstration.
     *
     * A harvest STARTS on the right button's touchstart (BroTown), and for a
     * touch the browser fires `pointerdown` BEFORE `touchstart` -- so for the
     * very finger that started the harvest, this layer's pointerdown ran while
     * S._extraction was still null, bailed at `if (!ex) return`, and never
     * opened a gesture.  A player who presses CHOP and simply keeps their
     * thumb on the button through the wind-up therefore pumps into nothing:
     * swipeRef stays null, every pointermove returns at its own guard, and the
     * demo keeps playing because `_gestureDown` was never set.  Lifting and
     * re-pressing was the only way through, which is exactly what it felt
     * like.
     *
     * So every pointer that goes down is remembered here whether or not a
     * harvest is ready, and the first MOVE of a remembered finger over the
     * button, once the window has opened, adopts it (see onPointerMove).  A
     * gesture needs movement to count anyway, so adopting on the first move
     * loses nothing and costs no polling.
     *
     * Map, not object: pointerIds are browser-supplied, and an id-keyed plain
     * object is the '__proto__' foot-gun this repo has stepped on three times
     * (CLAUDE.md). */
    const downPointers = new Map();   /* pointerId -> { x, y } */

    /* v2.3.3407: the mouse presses that began a gesture -- their click, when
       they let go, is the end of a drag and not a tap on the world (onPointerUp
       stamps the canvas's own "already handled" mark). */
    const gestured = new Set();

    /* The gesture's record, made at the first press of a window (v2.3.3407:
       its own function, so the keyboard's work -- which has no press -- makes
       the very same one). */
    const newGesture = (ex, x, y, cue) => {
      const S = stateRef.current;
      /* v2.3.2245: no tree-ward on a disc -- either horizontal stroke scores
         (the recognizer's existing rule for a tree directly above/below). */
      const treeward = 0;
      const node = nodeOf(S, ex);
      const axisV = (GESTURE_STROKE[ex.skill] && GESTURE_STROKE[ex.skill].axis === 'x') ? x : y;
      ex._gesture = {
        dir: 0,
        halfStrokes: 0,
        treeward,
        cueX: cue.x, cueY: cue.y,
        nodeX: node ? node.x : null, nodeY: node ? node.y : null,
        lastAngle: Math.atan2(y - cue.y, x - cue.x),
        totalAngle: 0,
        startT: performance.now(),
        /* v2.3.2760: ONE stroke tracker drives both the pose phase and
           the three-second meter (stepStroke):
           from/ext   where the stroke under way turned, and how far it has
                      got; segTravel is the distance between them;
           dir        its direction (0 before the first one);
           segPower   whether it is the skill's power stroke;
           didPower   whether a power stroke has been made -- a return
                      stroke before any blow holds the ready pose;
           cycles     the meter's reading, kept monotonic;
           activeMs   time the thumb has actually been MOVING (the floor);
           firstMoveT / lastMoveT  for the grade and the active clock.
           v2.3.3407:
           hx/hy, lastHeading  a mouse's reel: where its last step ended and
                      which way it was heading (FREE_STEP_PX above);
           kb, kbCycles, kbPhase  the keyboard's work: whether E worked on
                      this gesture at all, the cycles it made, and the phase
                      it plays (keyStep below). */
        from: axisV, ext: axisV, segTravel: 0, segPower: false, didPower: false,
        cycles: 0, activeMs: 0, firstMoveT: 0, lastMoveT: 0,
        hx: null, hy: null, lastHeading: null,
        kb: false, kbCycles: 0, kbPhase: 0,
      };
      ex.progress = 0;
      ex.reps = 0;
      ex.repsTarget = repsTargetFor(ex.skill);
      ex.treewardSign = treeward;
      return ex._gesture;
    };

    const beginGesture = (ex, x, y, cue, pointerId, free) => {
      /* Resume the accumulator if this is a re-press within the same window,
         otherwise start fresh. Lives on the extraction record so progress and
         the cue meter persist across lifts. */
      const axisV = (GESTURE_STROKE[ex.skill] && GESTURE_STROKE[ex.skill].axis === 'x') ? x : y;
      if (!ex._gesture) {
        newGesture(ex, x, y, cue);
      } else {
        /* re-seed the per-press anchors so a resumed stroke measures cleanly */
        ex._gesture.cueX = cue.x; ex._gesture.cueY = cue.y;
        ex._gesture.lastAngle = Math.atan2(y - cue.y, x - cue.x);
        /* the stroke the lift interrupted still counts if it got far enough */
        if (ex._gesture.dir) endStroke(ex._gesture);
        ex._gesture.dir = 0;
        ex._gesture.from = axisV; ex._gesture.ext = axisV; ex._gesture.segTravel = 0;
        ex._gesture.lastMoveT = 0;
      }
      /* v2.3.3407: a mouse's reel heads from the press */
      ex._gesture.hx = x; ex._gesture.hy = y; ex._gesture.lastHeading = null;
      ex._gestureDownAt = performance.now();   /* v2.3.2245: the button face reads this */
      /* v2.3.2384: A THUMB THAT IS DOWN OWNS THE PHASE, FULL STOP.
         (v2.3.2760: the demo is gone from the body -- the flag now keeps the
         button's teaching cue (gestureIdle) off while a thumb is down.)
         The idle demo (gestureDemo01) stood down for HOLD_MS after the last
         movement, and on its own that is a TIMER -- so one frame longer than
         HOLD_MS between two pointermoves (a GC pause, a zone load, a slow
         first frame after a texture upload) and the demo blinks in on top of
         a gesture the player is in the middle of making.  Measured in the
         headless harness, where the main thread stalls for over a second at a
         time: the display phase jumped off the thumb's value and back twice in
         four seconds.  This flag makes the common case a FACT rather than an
         inference -- while the finger is on the glass there is no demo, no
         matter how long the frame took. */
      ex._gestureDown = true;
      /* v2.3.2514: WHOSE finger this is.  onPointerUp used to clear the
         gesture for ANY pointer that lifted -- the left thumb coming off the
         movement stick killed the harvest stroke the right thumb was in the
         middle of, and the demo came back 600ms later.  Recorded on the press
         so the lift can be matched to it.
         v2.3.3407: `free` -- a mouse's press, which reels by its heading. */
      swipeRef.current = { startX: x, startY: y, pointerId, free: !!free, samples: [{ x, y, t: performance.now() }] };
      if (free && pointerId != null) gestured.add(pointerId);
    };

    const onPointerDown = (e) => {
      const x = e.clientX, y = e.clientY;
      /* Remembered BEFORE any of the guards below: at this instant the
         extraction may not exist yet (see the note above beginGesture).
         The map is emptied by pointerup/pointercancel; the size guard is for
         the pointer that goes down and never reports either (a lost capture,
         a backgrounded tab), so a long session cannot accumulate ids.  A
         hand has ten fingers, so 12 is already generous.
         v2.3.3407: + whether it is a mouse pressed on the world, which may be
         adopted anywhere (onPointerMove). */
      if (downPointers.size > 12) downPointers.clear();
      downPointers.set(e.pointerId, { x, y, free: freeHand(e) && onWorld(e) });
      const ex = readyExtraction();
      if (!ex) return;
      const cue = cueScreenPos();
      /* v2.3.2245: ON the button, not merely near where a cue happened to be. */
      const onCue = !!cue && Math.hypot(x - cue.x, y - cue.y) <= cue.r + BUTTON_SLACK_PX;
      /* ═══ v2.3.3407: ...OR, FOR A MOUSE, ANYWHERE ON THE WORLD ═══
         A computer has no thumb resting on the button, and a mouse that has
         just clicked the tree is already over the world: a press there is the
         gesture as much as one on the button.  Only a mouse (or a pen) -- a
         finger still starts on the button, so a left thumb steering on a
         phone can never be read as a chop. */
      const free = freeHand(e) && (onCue || onWorld(e));
      if (!onCue && !free) return;
      /* ...and the press is the gesture's, not a swing's: on a computer the
         world's mousedown is an attack (BroTown's canvas onMouseDown), and a
         cancelled pointerdown sends no mousedown after it. */
      if (free && e.cancelable) e.preventDefault();
      beginGesture(ex, x, y, cue || { x, y }, e.pointerId, free);
    };

    /* ═══ v2.3.2760: THE STROKE TRACKER ═══
       Replaces the v2.3.229 oscillation counter, which did two jobs with one
       40px hysteresis: counting reps AND (since v2.3.1417) driving the pose.
       For the pose that threshold is far too coarse -- nothing moved until the
       thumb was 40px into a stroke, then the swing jumped -- and a thumb that
       landed mid-button and pumped +-26px never got 40px from where it landed,
       so it counted nothing at all (both caught by mp-gcue).  Now:
         - a stroke TURNS after PHASE_HYST_PX of travel back from its extreme
           (small enough to follow the hand, big enough to ignore a wobble),
           and the pose phase follows the travel continuously from there;
         - a stroke COUNTS toward the meter when it ends having travelled
           STROKE_AMP -- the anti-jitter rule the meter has always had. */
    const PHASE_HYST_PX = 12;
    const startStroke = (g, d, from, v, skill) => {
      const st = GESTURE_STROKE[skill];
      g.dir = d; g.from = from; g.ext = v;
      g.segTravel = Math.abs(v - from);
      g.segPower = !!(st && d === st.power);
      if (g.segPower) g.didPower = true;
    };
    const endStroke = (g) => {
      if ((g.segTravel || 0) >= STROKE_AMP) g.halfStrokes += 1;
    };
    const stepStroke = (g, v, skill) => {
      if (!g.dir) {
        if (Math.abs(v - g.from) >= PHASE_HYST_PX) startStroke(g, v > g.from ? 1 : -1, g.from, v, skill);
        return;
      }
      if ((v - g.ext) * g.dir >= 0) { g.ext = v; g.segTravel = Math.abs(v - g.from); return; }
      if (Math.abs(v - g.ext) >= PHASE_HYST_PX) {
        endStroke(g);
        startStroke(g, -g.dir, g.ext, v, skill);
      }
    };

    /* THE POSE PHASE FOR A STROKE SKILL.  The power stroke plays the loop from
       0 up to the blow (split); the return stroke plays split..1.  A return
       stroke before any power stroke holds the ready pose.  A stroke that
       resumes the region the phase is already in (a re-press mid-swing) never
       winds it back -- it continues from where it is. */
    const strokePhase = (g, skill, cur) => {
      const st = GESTURE_STROKE[skill];
      if (!st || !g.dir) return cur;
      const f = Math.min(1, (g.segTravel || 0) / STROKE_SPAN_PX);
      if (g.segPower) {
        const t = st.split * f;
        return cur < st.split ? Math.max(cur, t) : t;
      }
      if (!g.didPower) return cur;
      const t = st.split + (1 - st.split) * f;
      return cur >= st.split ? Math.max(cur, t) : t;
    };

    /* ═══ v2.3.3407: THE METER, AND THE END, SHARED BY EVERY HAND ═══
       The cycles made so far against the target, held to the floor, and the
       grade and success once it is full -- one copy for the pointer (below)
       and the keyboard (keyStep), so the two cannot fill or grade apart.
       `sw` is the press whose samples make the fingerprint; none for a
       gesture the keyboard worked on (gradeGesture's note, gesturePose.js). */
    const finish = (ex, g, tNow, sw) => {
      let ent = 0;
      if (sw && !g.kb) {
        /* Meter full — grade, fingerprint, and fire success once. */
        let pathLen = 0;
        for (let i = 1; i < sw.samples.length; i++) {
          pathLen += Math.hypot(sw.samples[i].x - sw.samples[i - 1].x,
                                sw.samples[i].y - sw.samples[i - 1].y);
        }
        ent = Number(vectorEntropy(sw.samples).toFixed(3));
        const dur = sw.samples.length
          ? sw.samples[sw.samples.length - 1].t - sw.samples[0].t : 0;
        /* v2.3.694: richer fingerprint for the server's anomaly accumulator.
           n = sample count, tv = timing variance, vc = velocity curvature,
           h = replay-detection hash. */
        ex.swipeFp = {
          len: Math.round(pathLen), ent, dur: Math.round(dur),
          n: sw.samples.length,
          tv: Math.round(timingVariance(sw.samples)),
          vc: velocityCurvature(sw.samples),
          h: pathHash(sw.samples),
        };
      }
      const accuracy = gradeGesture(g.activeMs, tNow - (g.firstMoveT || tNow), ent);
      swipeRef.current = null;
      keyStop();
      if (typeof onSuccess === 'function') onSuccess(accuracy);
    };
    const settle = (ex, g, tNow, sw) => {
      g.cycles = Math.max(g.cycles || 0, cyclesFromGesture(ex.skill, g));
      const target = ex.repsTarget || repsTargetFor(ex.skill);
      ex.reps = g.cycles;
      /* The work, held to the floor: however fast the hand, the meter cannot
         run ahead of GESTURE_FLOOR_MS of real motion. */
      ex.progress = Math.max(0, Math.min(1, g.cycles / target, g.activeMs / GESTURE_FLOOR_MS));
      if (ex.progress >= 1) { finish(ex, g, tNow, sw); return true; }
      return false;
    };

    const onPointerMove = (e) => {
      const x = e.clientX, y = e.clientY;
      /* v2.3.2760: where the finger WAS, read before this move overwrites it
         -- the adoption below promises to start the stroke from there, and
         since v2.3.2514 it had been handed this move's own position instead
         (the map was updated first), so the travel already made was lost. */
      const wasAt = downPointers.get(e.pointerId);
      if (wasAt) downPointers.set(e.pointerId, { x, y, free: !!wasAt.free });   /* v2.3.3407: keeps `free` */
      let sw = swipeRef.current;
      /* v2.3.2514: ADOPT A FINGER THAT WAS DOWN BEFORE THE WINDOW OPENED.
         See the note above beginGesture: the thumb that pressed CHOP is
         already on the glass when `ready` arrives, and its pointerdown came
         and went while there was nothing to start.  This is where it gets
         picked up -- the first move, on the button, of a pointer we know is
         down.  Deliberately NOT "any move at all": a left thumb steering the
         character must not be mistaken for a chop.
         v2.3.3407: ...but a MOUSE pressed on the world is adopted wherever it
         moves (onPointerDown's note): the click that started the harvest on
         the tree, held through the wind-up, is already making the gesture. */
      if (!sw && wasAt) {
        const exNow = readyExtraction();
        const cueNow = exNow ? cueScreenPos() : null;
        if (exNow && (wasAt.free || (cueNow && Math.hypot(x - cueNow.x, y - cueNow.y) <= cueNow.r + BUTTON_SLACK_PX))) {
          /* Start the stroke from where the finger WAS, not from where this
             move landed, so the travel already made counts toward the first
             half-stroke instead of being swallowed by the anchor. */
          beginGesture(exNow, wasAt.x, wasAt.y, cueNow || wasAt, e.pointerId, !!wasAt.free);
          sw = swipeRef.current;
        }
      }
      if (!sw) return;
      /* v2.3.2514: one gesture, one finger.  A second pointer wandering over
         the button must not feed the stroke the first one is making. */
      if (sw.pointerId != null && e.pointerId !== sw.pointerId) return;
      const ex = readyExtraction();
      if (!ex || !ex._gesture) return;
      sw.samples.push({ x, y, t: performance.now() });
      if (e.cancelable) e.preventDefault();

      const g = ex._gesture;
      const tNow = performance.now();
      const axisV = (GESTURE_STROKE[ex.skill] && GESTURE_STROKE[ex.skill].axis === 'x') ? x : y;
      if (ex.skill === 'fishing' && sw.free) {
        /* v2.3.3407: a mouse reels by the turn of its own heading (FREE_STEP_PX
           above), so a circle drawn anywhere counts */
        const hdx = x - g.hx, hdy = y - g.hy;
        if (g.hx == null) { g.hx = x; g.hy = y; }
        else if (hdx * hdx + hdy * hdy >= FREE_STEP_PX * FREE_STEP_PX) {
          const hd = Math.atan2(hdy, hdx);
          if (g.lastHeading != null) {
            const _dTurn = wrapPi(hd - g.lastHeading);
            if (Math.abs(_dTurn) <= FREE_TURN_MAX) {
              g.totalAngle = Math.max(0, g.totalAngle + _dTurn);   /* clockwise (screen y-down) = + */
              if (Math.abs(_dTurn) > 0.02) ex._reelSpinAt = tNow;
            }
          }
          g.lastHeading = hd; g.hx = x; g.hy = y;
        }
      } else if (ex.skill === 'fishing') {
        const ang = Math.atan2(y - g.cueY, x - g.cueX);
        const _dAng = wrapPi(ang - g.lastAngle);
        /* v2.3.2760: floored at 0 -- a player who winds the wrong way first
           does not build a debt of turns to unwind before the right way
           counts.  Wiggling back and forth still nets nothing. */
        g.totalAngle = Math.max(0, g.totalAngle + _dAng);   /* clockwise (screen y-down) = + */
        g.lastAngle = ang;
        /* v2.3.1422: stamp active cranking so the reel-loop SFX
           (effectsRenderer) plays only while the handle is turning. */
        if (Math.abs(_dAng) > 0.02) ex._reelSpinAt = tNow;
      } else {
        stepStroke(g, axisV, ex.skill);
      }

      /* ═══ v2.3.2760: THE PHASE THE BODY AND THE MINI TOOL PLAY ═══
         Fishing: one finger-circle is one turn of the loop (v2.3.1417's crank
         mapping, unchanged).  The stroke skills: strokePhase -- the power
         stroke plays up to the blow, the return stroke plays the rest, always
         FORWARD.  (It used to scrub with signed deltas, so every return stroke
         played the swing backwards; see gesturePose.js.)  gesturePose01 chases
         this at up to ~4 swings a second, which is the speed of the hand. */
      const prevPhase = ex.cueFrame01 || 0;
      if (ex.skill === 'fishing') {
        ex.cueFrame01 = ((g.totalAngle / TWO_PI) % 1 + 1) % 1;
      } else {
        /* a finished return stroke is 1.0, which IS the ready pose (0) */
        const _sp = strokePhase(g, ex.skill, prevPhase);
        ex.cueFrame01 = _sp >= 1 ? 0 : _sp;
      }
      /* The effects (chips, debris, splash, smoke) play while the motion is
         actually going -- stamped only when the phase moved on. */
      if (ex.cueFrame01 !== prevPhase) ex._gestureActiveAt = tNow;
      ex._gestureMovedAt = tNow;   /* v2.3.2245 */

      /* The active clock: time between consecutive moves counts only while the
         moves keep coming -- a thumb that rests on the glass is not working. */
      if (!g.firstMoveT) g.firstMoveT = tNow;
      if (g.lastMoveT && (tNow - g.lastMoveT) < 200) g.activeMs += tNow - g.lastMoveT;
      g.lastMoveT = tNow;

      settle(ex, g, tNow, sw);
    };

    const onPointerUp = (e) => {
      const id = e && e.pointerId;
      downPointers.delete(id);
      /* v2.3.3407: a mouse that made a gesture lets go with a CLICK, and on a
         computer the world takes a click as a tap -- a monster's lock, a
         character's quest, the next resource.  It was a drag, so the canvas
         is told it is already handled (its own _touchHandledAt mark, which it
         honours for 600 ms). */
      if (id != null && gestured.has(id)) {
        gestured.delete(id);
        const S0 = stateRef.current;
        if (S0) S0._touchHandledAt = Date.now();
      }
      /* ═══ v2.3.2514: ONLY THE FINGER THAT IS MAKING THE GESTURE ENDS IT ═══
         This handler took no argument and cleared the press for ANY pointer.
         Both thumbs are on the glass during a harvest -- the left one steers,
         and on a phone it lifts and lands constantly -- so every one of those
         lifts dropped swipeRef and cleared `_gestureDown` while the right
         thumb was still chopping.  From there the right thumb's moves fell out
         at `if (!sw) return`, the reps stopped counting and the demo came back
         600ms later, which is the "animation stops following me" report.
         Matching the id also means pointercancel for an unrelated touch (iOS
         cancels liberally) no longer ends a stroke. */
      const sw = swipeRef.current;
      if (sw && sw.pointerId != null && id != null && id !== sw.pointerId) return;
      /* Pause: drop the active press but keep ex._gesture so a re-press resumes
         and the cue meter holds its progress. */
      swipeRef.current = null;
      /* v2.3.2384: the finger is off the glass, so the demo may come back --
         but not instantly.  Stamping the movement clock HERE starts the same
         HOLD_MS the demo already waits after the last move, so a player who
         lifts between strokes gets their own pose held for a beat rather than
         the demo cutting in on the pause.
         v2.3.3407: ...unless E is working it (keyStep owns the flag then). */
      const ex = readyExtraction();
      if (ex && !keyWorking()) { ex._gestureDown = false; ex._gestureMovedAt = performance.now(); }
    };

    /* ═══ v2.3.3407: HOLD E -- THE GESTURE FROM A KEYBOARD ═══
       The owner: "Make sure all actions/buttons can be completed ... on the
       computer.  For instance I don't think you can harvest lifeskills right
       now on the computer."  (gesturePose.js DESK_GESTURE_HINT has the story.)
       desktopControls owns the E key and hands it here: `down` on every
       keydown of E while a harvest is under way (and on the press that
       started one), `up` on its keyup or a lost focus -- S._harvestKeys, set
       below, because the key's chain (a door, a bed, a character) lives
       there and the gesture lives here.
       While E is held the gesture is worked at a QUICK hand's pace
       (GESTURE_QUICK_CYCLE_MS): its cycles and its active clock both run, so
       the meter fills in GESTURE_TARGET_MS (1.5 s) of holding, as a quick
       thumb's does, and the floor is met on the way.  The body and the cue
       play the loop at that pace, the effects and the reel's sound with it.
       Held from the press that started the harvest, it waits through the
       wind-up and works the moment the window opens -- "hold E to harvest".
       A fresh press works at least KEY_WORK.tapMs, so tapping in a rhythm
       works too.  Graded with no path (never 'perfect'), and no fingerprint
       is sent: a key draws nothing to read. */
    let kb = null;   /* { down, until, lastT, raf } while E is held or its tap's work runs */
    const keyWorking = () => !!kb && (kb.down || performance.now() < kb.until);
    function keyStop() {
      if (kb && kb.raf) { try { cancelAnimationFrame(kb.raf); } catch (e2) { /* gone */ } }
      kb = null;
    }
    const keyStep = () => {
      if (!kb) return;
      kb.raf = 0;
      const S = stateRef.current;
      const ex = S && S._extraction;
      const tNow = performance.now();
      const dt = Math.max(0, Math.min(KEY_WORK.dtMax, tNow - kb.lastT));
      kb.lastT = tNow;
      const held = kb.down || tNow < kb.until;
      if (!ex) { keyStop(); return; }
      if (ex.status !== 'ready') {
        /* the wind-up: a held E waits for the window; a let-go one is done */
        if (!held) { keyStop(); return; }
        kb.raf = requestAnimationFrame(keyStep);
        return;
      }
      if (!held) {
        if (!swipeRef.current) { ex._gestureDown = false; ex._gestureMovedAt = tNow; }
        keyStop();
        return;
      }
      let g = ex._gesture;
      if (!g) {
        const c = cueScreenPos() || { x: 0, y: 0 };
        g = newGesture(ex, c.x, c.y, c);
      }
      g.kb = true;
      const cyc = GESTURE_QUICK_CYCLE_MS[ex.skill] || 450;
      if (!g.firstMoveT) g.firstMoveT = tNow;
      g.activeMs += dt;
      g.kbCycles = (g.kbCycles || 0) + dt / cyc;
      g.kbPhase = ((g.kbPhase || 0) + dt / cyc) % 1;
      const prevPhase = ex.cueFrame01 || 0;
      ex.cueFrame01 = g.kbPhase;
      if (ex.cueFrame01 !== prevPhase) ex._gestureActiveAt = tNow;
      ex._gestureMovedAt = tNow;
      ex._gestureDown = true;
      if (ex.skill === 'fishing' && dt > 0) ex._reelSpinAt = tNow;
      if (settle(ex, g, tNow, null)) return;
      kb.raf = requestAnimationFrame(keyStep);
    };
    const harvestKeys = {
      down() {
        const S = stateRef.current;
        if (!(S && S._extraction)) return false;
        const tNow = performance.now();
        if (!kb) kb = { down: false, until: 0, lastT: tNow, raf: 0 };
        if (!kb.down) { kb.down = true; kb.until = tNow + KEY_WORK.tapMs; }
        if (!kb.raf) kb.raf = requestAnimationFrame(keyStep);
        return true;
      },
      up() { if (kb) kb.down = false; },
      /* QA (mp-deskharvest) */
      probe() { return kb ? { down: !!kb.down, working: keyWorking() } : null; },
    };
    if (stateRef && stateRef.current) stateRef.current._harvestKeys = harvestKeys;

    /* v2.3.2245 QA probe (house style): is a gesture live, and where does the
       layer think the button is -- neither is visible from a screenshot. */
    try {
      window.__btHarvest = () => {
        const S = stateRef && stateRef.current;
        const ex = S && S._extraction;
        return {
          status: ex ? ex.status : null, skill: ex ? ex.skill : null,
          pressed: !!swipeRef.current, reps: ex ? +(ex.reps || 0).toFixed(2) : null,
          /* v2.3.2514: the two facts the pointer fixes are about, neither of
             which a screenshot can see -- whether the layer believes a finger
             is on the button (the demo stands down on this) and WHICH finger
             owns the stroke (so a second one lifting cannot end it). */
          gestureDown: !!(ex && ex._gestureDown),
          pointerId: swipeRef.current ? (swipeRef.current.pointerId ?? null) : null,
          progress: ex ? +(ex.progress || 0).toFixed(2) : null,
          frame01: ex ? +(ex.cueFrame01 || 0).toFixed(3) : null,
          cue: buttonCueScreenPos(S),
          /* v2.3.2760: the three-second meter's parts -- cycles of motion
             against the target, and the active clock the floor reads. */
          cycles: ex && ex._gesture ? +(ex._gesture.cycles || 0).toFixed(2) : null,
          target: ex ? +(ex.repsTarget || 0).toFixed(2) : null,
          activeMs: ex && ex._gesture ? Math.round(ex._gesture.activeMs || 0) : null,
          /* v2.3.3407: a mouse's press (anywhere on the world, reeling by its
             heading), and E's work: held, working, and the cycles it made */
          free: !!(swipeRef.current && swipeRef.current.free),
          keys: harvestKeys.probe(),
          kbCycles: ex && ex._gesture ? +(ex._gesture.kbCycles || 0).toFixed(2) : null,
        };
      };
    } catch (e) { /* non-browser */ }

    target.addEventListener('pointerdown', onPointerDown, { passive: false });
    target.addEventListener('pointermove', onPointerMove, { passive: false });
    target.addEventListener('pointerup', onPointerUp, { passive: false });
    target.addEventListener('pointercancel', onPointerUp, { passive: false });
    return () => {
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
      /* v2.3.2384: with the listeners gone nothing can ever clear the flag,
         so a record that outlived this layer with a thumb "down" would sit
         with its demo suppressed forever.  Clear it on the way out. */
      const ex = readyExtraction();
      if (ex) ex._gestureDown = false;
      /* v2.3.3407: and E's work stops with the layer that does it */
      keyStop();
      const S1 = stateRef && stateRef.current;
      if (S1 && S1._harvestKeys === harvestKeys) S1._harvestKeys = null;
    };
  }, [stateRef, onSuccess]);

  /* No DOM output — pointer events are captured at window level, gated on
     extraction status. Exists purely for the useEffect lifecycle. */
  return null;
};
