import React, { useEffect, useRef } from 'react';
import { EXTRACT_REPS_TARGET, EXTRACT_REPS_DEFAULT, BT_AUDIO } from '@/data/gameSystems.js';

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
 */

const MIN_SWIPE_LEN = 30; /* px — ignore micro-jitters before any motion counts */
const STROKE_AMP = 40;    /* px — travel past the last turning point to count a half-stroke */
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

/* Reps required to complete each skill's phase-2 gesture. */
function repsTargetFor(skill) {
  return EXTRACT_REPS_TARGET[skill] || EXTRACT_REPS_DEFAULT;
}

/* Convert the live accumulator into a rep count for the skill. */
function repsFromGesture(skill, g) {
  if (skill === 'fishing') return Math.max(0, g.totalAngle) / TWO_PI;
  if (skill === 'woodcutting') return g.treewardStrokes;
  if (skill === 'cooking') return g.cookStrokes || 0;   /* one up-flip = cooked */
  /* mining: a full up+down pump is two half-strokes */
  return g.halfStrokes / 2;
}

/* Map fill speed (within the open window) to a reward grade. */
function gradeGesture(fillFrac, ent) {
  const human = ent >= 0.04;            /* near-zero entropy => suspiciously straight */
  if (fillFrac <= 0.45 && human) return 'perfect';
  if (fillFrac <= 0.8) return 'good';
  return 'ok';
}

/* v2.3.2245: the cue lives on the right button.  Its centre in CSS px.
   DESKTOP has no right button (game.css hides the touch controls under
   pointer:fine), so there the gesture anchors on the CHARACTER instead --
   the mouse pumps / circles over the figure, which is where fishing's cue
   always sat -- with a generous radius.  Null only before the HUD mounts. */
export function buttonCueScreenPos(S) {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector('.bt-rjoy-base');
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, on: 'button' };
  }
  if (S && S.camera && S.player) {
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    return { x: (S.player.x - S.camera.x) * sx, y: (S.player.y - 24 - S.camera.y) * sy, r: 80, on: 'player' };
  }
  return null;
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

    const onPointerDown = (e) => {
      const ex = readyExtraction();
      if (!ex) return;
      const S = stateRef.current;
      const cue = cueScreenPos();
      if (!cue) return;
      const x = e.clientX, y = e.clientY;
      /* v2.3.2245: ON the button, not merely near where a cue happened to be. */
      if (Math.hypot(x - cue.x, y - cue.y) > cue.r + BUTTON_SLACK_PX) return;

      /* v2.3.2245: no tree-ward on a disc -- either horizontal stroke scores
         (the recognizer's existing rule for a tree directly above/below). */
      const treeward = 0;
      const node = nodeOf(S, ex);

      /* Resume the accumulator if this is a re-press within the same window,
         otherwise start fresh. Lives on the extraction record so progress and
         the cue meter persist across lifts. */
      if (!ex._gesture) {
        ex._gesture = {
          axisRef: (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x, /* value at last turning point */
          dir: 0,
          halfStrokes: 0,
          treewardStrokes: 0,
          treeward,
          cueX: cue.x, cueY: cue.y,
          nodeX: node ? node.x : null, nodeY: node ? node.y : null,
          lastAngle: Math.atan2(y - cue.y, x - cue.x),
          totalAngle: 0,
          startT: performance.now(),
        };
        ex.progress = 0;
        ex.reps = 0;
        ex.repsTarget = repsTargetFor(ex.skill);
        ex.treewardSign = treeward;
      } else {
        /* re-seed the per-press anchors so a resumed stroke measures cleanly */
        ex._gesture.cueX = cue.x; ex._gesture.cueY = cue.y;
        ex._gesture.lastAngle = Math.atan2(y - cue.y, x - cue.x);
        ex._gesture.axisRef = (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x;
        ex._gesture.dir = 0;
      }
      ex._gestureDownAt = performance.now();   /* v2.3.2245: the button face reads this */
      swipeRef.current = { startX: x, startY: y, samples: [{ x, y, t: performance.now() }] };
    };

    /* Oscillation counter with hysteresis: counts a half-stroke each time the
       finger reverses past STROKE_AMP from the running extreme on the axis. */
    const stepOscillation = (g, v, skill) => {
      if (g.dir === 0) {
        /* establish the first direction once moved STROKE_AMP from the anchor */
        if (v - g.axisRef >= STROKE_AMP) { g.dir = 1; g.axisRef = v; countHalf(g, 1, skill); }
        else if (g.axisRef - v >= STROKE_AMP) { g.dir = -1; g.axisRef = v; countHalf(g, -1, skill); }
      } else if (g.dir === 1) {
        if (v > g.axisRef) g.axisRef = v;                          /* still moving +, extend */
        else if (g.axisRef - v >= STROKE_AMP) { g.dir = -1; g.axisRef = v; countHalf(g, -1, skill); }
      } else { /* dir === -1 */
        if (v < g.axisRef) g.axisRef = v;
        else if (v - g.axisRef >= STROKE_AMP) { g.dir = 1; g.axisRef = v; countHalf(g, 1, skill); }
      }
    };
    const countHalf = (g, d, skill) => {
      g.halfStrokes += 1;
      /* woodcutting: only the tree-ward swing scores a rep (return swing is free).
         treeward 0 (tree directly above/below, or -- v2.3.2245 -- the button)
         -> accept either horizontal stroke. */
      if (skill === 'woodcutting' && (g.treeward === 0 || d === g.treeward)) g.treewardStrokes += 1;
      /* mining: the DOWN half-stroke (d===1, screen y increasing) is the slam --
         spark + clink at the ore so the hit reads. */
      if (skill === 'mining' && d === 1) onSlam(g);
      /* v2.3.853: cooking — an UP stroke (d===-1, screen y decreasing) flips
         the fish; one flip = cooked. */
      if (skill === 'cooking' && d === -1) g.cookStrokes = (g.cookStrokes || 0) + 1;
    };

    /* Spark burst + clink at the ore on a pickaxe slam. */
    const onSlam = (g) => {
      const S = stateRef && stateRef.current;
      if (!S || g.nodeX == null) return;
      /* v2.3.1445: the painted rock burst moved to the character's swing
         loop (effectsRenderer, constant — owner request); slams keep the
         procedural sparks + clink only. */
      if (S.hitParticles) {
        for (let i = 0; i < 7; i++) {
          S.hitParticles.push({
            x: g.nodeX, y: g.nodeY,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 3 - 1,        /* mostly upward chips */
            life: 0.45,
            color: i % 2 ? '#ffd27a' : '#fff2c0',
            size: 1.6,
          });
        }
      }
      /* v2.3.1423 (owner: the sample must play when the MARKER hits the
         rock): the slam fires on every down-pump reversal — the moment the
         marker visually bottoms out — so the pickaxe-on-stone sample lives
         HERE (alternating its two strikes).  The 0.9-phase burst in
         effectsRenderer is particles-only now (sounding both doubled the
         hit on full drags). */
      try {
        if (BT_AUDIO && BT_AUDIO.play) {
          g._slamSndAlt = !g._slamSndAlt;
          BT_AUDIO.play('mine-strike', { offset: g._slamSndAlt ? 0.08 : 0.6, duration: 0.45, vol: 0.6 });
        }
      } catch (e) {}
    };

    const onPointerMove = (e) => {
      const sw = swipeRef.current;
      if (!sw) return;
      const ex = readyExtraction();
      if (!ex || !ex._gesture) return;
      const x = e.clientX, y = e.clientY;
      sw.samples.push({ x, y, t: performance.now() });
      if (e.cancelable) e.preventDefault();

      const g = ex._gesture;
      if (ex.skill === 'fishing') {
        const ang = Math.atan2(y - g.cueY, x - g.cueX);
        const _dAng = wrapPi(ang - g.lastAngle);
        g.totalAngle += _dAng;   /* clockwise (screen y-down) = + */
        g.lastAngle = ang;
        /* v2.3.1422: stamp active cranking so the reel-loop SFX
           (effectsRenderer) plays only while the handle is turning. */
        if (Math.abs(_dAng) > 0.02) ex._reelSpinAt = performance.now();
      } else {
        stepOscillation(g, (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x, ex.skill);
      }

      /* v2.3.1417: GESTURE-TOOL FRAME DRIVER — the painted tool sprite (on
         the right button since v2.3.2245, see BroTown's harvest face) plays
         its 8-frame sheet from this phase, so the tool physically follows the
         finger.  Fishing maps the accumulated circle angle straight to the
         crank rotation (one finger-circle = one crank turn); the stroke
         skills scrub the swing with signed finger deltas — mining swings on
         the DOWN stroke, cooking flips on the UP flick, the axe chops on
         either stroke now — and rewind on the return stroke.
         v2.3.2245: the CHARACTER's own harvest frames follow this same phase
         (entityRenderer / effectsRenderer), which is the owner's "animation
         frames will play at the speed the user is performing the gesture". */
      if (ex.skill === 'fishing') {
        ex.cueFrame01 = ((g.totalAngle / (Math.PI * 2)) % 1 + 1) % 1;
      } else {
        const _n = sw.samples.length;
        const _prev = _n > 1 ? sw.samples[_n - 2] : null;
        if (_prev) {
          const SPAN = ex.skill === 'cooking' ? 130 : 110; /* px of travel for a full swing */
          let _d;
          if (ex.skill === 'mining') _d = (y - _prev.y) / SPAN;
          else if (ex.skill === 'cooking') _d = (_prev.y - y) / SPAN;
          else _d = Math.abs(x - _prev.x) / SPAN * (g.dir < 0 ? -1 : 1);
          /* v2.3.2245: with no tree-ward, the axe advances on whichever
             stroke is under way and rewinds on the reversal, so the swing
             still reads as a chop and a return rather than a shimmy. */
          if (ex.skill === 'woodcutting') _d = Math.abs(x - _prev.x) / SPAN * (g.dir === 0 ? 1 : (g.dir > 0 ? 1 : -1));
          ex.cueFrame01 = Math.max(0, Math.min(1, (ex.cueFrame01 || 0) + _d));
        }
      }
      ex._gestureMovedAt = performance.now();   /* v2.3.2245 */

      const reps = repsFromGesture(ex.skill, g);
      const target = ex.repsTarget || repsTargetFor(ex.skill);
      ex.reps = reps;
      ex.progress = Math.max(0, Math.min(1, reps / target));

      if (ex.progress >= 1) {
        /* Meter full — grade, fingerprint, and fire success once. */
        const windowDur = Math.max(1, ex.windowClosesAt - ex.windowOpensAt);
        const fillFrac = (performance.now() - g.startT) / windowDur;
        let pathLen = 0;
        for (let i = 1; i < sw.samples.length; i++) {
          pathLen += Math.hypot(sw.samples[i].x - sw.samples[i - 1].x,
                                sw.samples[i].y - sw.samples[i - 1].y);
        }
        const ent = Number(vectorEntropy(sw.samples).toFixed(3));
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
        const accuracy = gradeGesture(fillFrac, ent);
        swipeRef.current = null;
        if (typeof onSuccess === 'function') onSuccess(accuracy);
      }
    };

    const onPointerUp = () => {
      /* Pause: drop the active press but keep ex._gesture so a re-press resumes
         and the cue meter holds its progress. */
      swipeRef.current = null;
    };

    /* v2.3.2245 QA probe (house style): is a gesture live, and where does the
       layer think the button is -- neither is visible from a screenshot. */
    try {
      window.__btHarvest = () => {
        const S = stateRef && stateRef.current;
        const ex = S && S._extraction;
        return {
          status: ex ? ex.status : null, skill: ex ? ex.skill : null,
          pressed: !!swipeRef.current, reps: ex ? +(ex.reps || 0).toFixed(2) : null,
          progress: ex ? +(ex.progress || 0).toFixed(2) : null,
          frame01: ex ? +(ex.cueFrame01 || 0).toFixed(3) : null,
          cue: buttonCueScreenPos(S),
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
    };
  }, [stateRef, onSuccess]);

  /* No DOM output — pointer events are captured at window level, gated on
     extraction status. Exists purely for the useEffect lifecycle. */
  return null;
};
